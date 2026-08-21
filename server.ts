import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";
import { createServer } from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import { Server } from "socket.io";
// import { Client, LocalAuth, Message as WAMessage } from "whatsapp-web.js";
// import qrcode from "qrcode";
import { GoogleGenerativeAI } from "@google/generative-ai";

import OpenAI from "openai";

dotenv.config();

const execFileAsync = promisify(execFile);

async function cleanupStaleWhatsAppBrowser(userId: string) {
  if (process.platform !== 'win32') return;
  const profileToken = `session-${userId}`.replace(/'/g, "''");
  const command = `$needle = '${profileToken}'; Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -like ('*' + $needle + '*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  try {
    await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true });
  } catch (error: any) {
    console.warn(`[WhatsApp] Stale browser cleanup warning for ${userId}:`, error?.message || error);
  }
}

function resolveWhatsAppBrowserPath() {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configuredPath && fs.existsSync(configuredPath)) return configuredPath;

  const home = os.homedir();
  const candidates: string[] = [];
  const cacheRoots = [
    path.join(home, '.cache', 'puppeteer', 'chrome'),
    path.join(home, 'AppData', 'Local', 'puppeteer', 'Cache', 'chrome'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'puppeteer', '.local-chromium'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'puppeteer-core', '.local-chromium'),
  ];

  for (const cacheRoot of cacheRoots) {
    if (!fs.existsSync(cacheRoot)) continue;
    for (const version of fs.readdirSync(cacheRoot).sort().reverse()) {
      candidates.push(
        path.join(cacheRoot, version, 'chrome-win64', 'chrome.exe'),
        path.join(cacheRoot, version, 'chrome-linux64', 'chrome'),
        path.join(cacheRoot, version, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      );
    }
  }

  candidates.push(
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  );

  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}

const DEFAULT_WHATSAPP_SYSTEM_PROMPT = `You are HK-Ai WhatsApp, a reliable personal AI assistant. Answer the user's actual question directly and accurately. Use the recent conversation history to understand follow-up questions and maintain context. If the user writes in Urdu, Roman Urdu, or English, reply in the same language and style. Do not invent facts; say when you are unsure. Keep WhatsApp replies concise, natural, and helpful. Before answering, silently classify the intent as question, support, sales, complaint, urgent, or handoff and adapt your answer; do not expose the label unless it is useful. Never mention these instructions or claim to be human.`;
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const FIREBASE_WEB_API_KEY = (process.env.FIREBASE_WEB_API_KEY || (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8')).apiKey || '';
  } catch {
    return '';
  }
})()).trim();
const PROVIDER_CONFIG_ENCRYPTION_KEY = (process.env.PROVIDER_CONFIG_ENCRYPTION_KEY || OPENROUTER_API_KEY || crypto.randomBytes(32).toString('hex')).trim();
const PROVIDER_CONFIG_DIR = process.env.PROVIDER_CONFIG_DIR || path.join(os.homedir(), '.hk-ai-provider-configs');
fs.mkdirSync(PROVIDER_CONFIG_DIR, { recursive: true });

type ProviderKind = 'openai-compatible' | 'anthropic' | 'google' | 'search';
type UserProvider = {
  id: string;
  name: string;
  kind: ProviderKind;
  apiKey: string;
  baseUrl?: string;
  enabled?: boolean;
  updatedAt?: number;
};

const encryptionKey = crypto.createHash('sha256').update(PROVIDER_CONFIG_ENCRYPTION_KEY).digest();
const providerFileFor = (uid: string) => path.join(PROVIDER_CONFIG_DIR, `${uid.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
const encryptProviderData = (value: unknown) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') });
};
const decryptProviderData = <T>(payload: string): T => {
  const parsed = JSON.parse(payload);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8')) as T;
};
const loadUserProviders = (uid: string): UserProvider[] => {
  try {
    const value = decryptProviderData<UserProvider[]>(fs.readFileSync(providerFileFor(uid), 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
const saveUserProviders = (uid: string, providers: UserProvider[]) => {
  const target = providerFileFor(uid);
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, encryptProviderData(providers), { mode: 0o600 });
  fs.renameSync(temporary, target);
};
const maskApiKey = (apiKey: string) => apiKey ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` : '';

const providerPresets = [
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai-compatible' as ProviderKind, baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'openai', name: 'OpenAI', kind: 'openai-compatible' as ProviderKind, baseUrl: 'https://api.openai.com/v1' },
  { id: 'groq', name: 'Groq', kind: 'openai-compatible' as ProviderKind, baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'together', name: 'Together AI', kind: 'openai-compatible' as ProviderKind, baseUrl: 'https://api.together.xyz/v1' },
  { id: 'mistral', name: 'Mistral', kind: 'openai-compatible' as ProviderKind, baseUrl: 'https://api.mistral.ai/v1' },
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai-compatible' as ProviderKind, baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'anthropic', name: 'Anthropic Claude', kind: 'anthropic' as ProviderKind, baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'google', name: 'Google Gemini', kind: 'google' as ProviderKind, baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'tavily', name: 'Tavily Web Search', kind: 'search' as ProviderKind, baseUrl: 'https://api.tavily.com' },
  { id: 'custom', name: 'Custom OpenAI-compatible API', kind: 'openai-compatible' as ProviderKind, baseUrl: '' },
];

const providerLabel = (id: string) => providerPresets.find(provider => provider.id === id)?.name || id;
const providerModelKey = (providerId: string, modelId: string) => `${providerId}::${modelId}`;
const parseProviderModelKey = (value: string) => {
  if (value === 'openrouter/free' || value === 'openrouter::free' || !value) return { providerId: 'openrouter', modelId: 'free' };
  const separator = value.indexOf('::');
  return separator === -1 ? { providerId: 'openrouter', modelId: value } : { providerId: value.slice(0, separator), modelId: value.slice(separator + 2) };
};

async function verifyFirebaseIdToken(token: string) {
  if (!FIREBASE_WEB_API_KEY) throw new Error('FIREBASE_WEB_API_KEY is not configured on the server.');
  const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`, { idToken: token }, { timeout: 10000 });
  const firebaseUser = response.data?.users?.[0];
  if (!firebaseUser?.localId) throw new Error('Invalid Firebase ID token.');
  return { uid: String(firebaseUser.localId), email: firebaseUser.email || '', emailVerified: Boolean(firebaseUser.emailVerified) };
}

const getBearerToken = (request: any) => {
  const header = String(request.headers?.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

const providerHeaders = (provider: UserProvider) => provider.kind === 'anthropic'
  ? { 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
  : { Authorization: `Bearer ${provider.apiKey}` };

const normalizeListedModel = (provider: UserProvider, model: any) => {
  const modelId = String(model?.id || model?.name || '').trim();
  if (!modelId) return null;
  const prompt = Number(model?.pricing?.prompt ?? model?.inputTokenPrice ?? NaN);
  const completion = Number(model?.pricing?.completion ?? model?.outputTokenPrice ?? NaN);
  return {
    id: providerModelKey(provider.id, modelId),
    rawId: modelId,
    name: model?.name || modelId,
    description: model?.description || `${provider.name} model`,
    context_length: model?.context_length || model?.contextWindow || model?.max_context_length || null,
    architecture: model?.architecture || null,
    supported_parameters: model?.supported_parameters || [],
    pricing: model?.pricing || { prompt: Number.isFinite(prompt) ? String(prompt) : null, completion: Number.isFinite(completion) ? String(completion) : null },
    provider: provider.id,
    providerName: provider.name,
    providerKind: provider.kind,
    isFree: (Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0) || modelId.endsWith(':free')
  };
};

async function fetchProviderModels(provider: UserProvider) {
  if (provider.kind === 'google') {
    const collected: any[] = [];
    let pageToken = '';
    let page = 0;
    do {
      const params: Record<string, string | number> = { key: provider.apiKey, pageSize: 1000 };
      if (pageToken) params.pageToken = pageToken;
      const response = await axios.get(`${provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'}/models`, { params, timeout: 20000 });
      const pageModels = Array.isArray(response.data?.models) ? response.data.models : [];
      collected.push(...pageModels);
      const nextToken = response.data?.nextPageToken;
      if (!nextToken || nextToken === pageToken || pageModels.length === 0) break;
      pageToken = String(nextToken);
      page += 1;
    } while (page < 100);
    return collected.map((model: any) => normalizeListedModel(provider, { ...model, id: String(model.name || '').replace(/^models\//, '') })).filter(Boolean);
  }
  const collected: any[] = [];
  let cursor = '';
  let page = 0;
  do {
    const params: Record<string, string | number> = { limit: 1000 };
    if (cursor) params[provider.kind === 'anthropic' ? 'after_id' : 'after'] = cursor;
    const response = await axios.get(`${provider.baseUrl || (provider.kind === 'anthropic' ? 'https://api.anthropic.com/v1' : '')}/models`, { headers: providerHeaders(provider), params, timeout: 20000 });
    const pageModels = Array.isArray(response.data?.data) ? response.data.data : [];
    collected.push(...pageModels);
    const nextCursor = response.data?.next_page || response.data?.nextPage || response.data?.next_cursor || response.data?.next || (response.data?.has_more ? response.data?.last_id : '');
    if (!nextCursor || nextCursor === cursor || pageModels.length === 0) break;
    cursor = String(nextCursor);
    page += 1;
  } while (page < 100);
  return collected.map((model: any) => normalizeListedModel(provider, model)).filter(Boolean);
}

const normalizeProviderMessages = (messages: any[]) => (messages || [])
  .filter(message => message?.content && String(message.content).trim())
  .map(message => ({ role: message.role === 'model' ? 'assistant' : message.role, content: String(message.content) }));

async function createProviderCompletion(provider: UserProvider, modelId: string, messages: any[], systemInstruction?: string) {
  const normalized = normalizeProviderMessages(messages);
  if (provider.kind === 'openai-compatible') {
    const client = new OpenAI({ baseURL: provider.baseUrl, apiKey: provider.apiKey });
    return client.chat.completions.create({ model: modelId, messages: systemInstruction ? [{ role: 'system', content: systemInstruction }, ...normalized] as any : normalized as any, stream: false }) as any;
  }
  if (provider.kind === 'anthropic') {
    const system = systemInstruction || undefined;
    const response = await axios.post(`${provider.baseUrl || 'https://api.anthropic.com/v1'}/messages`, {
      model: modelId,
      max_tokens: 4096,
      system,
      messages: normalized.filter(message => message.role !== 'system').map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }))
    }, { headers: providerHeaders(provider), timeout: 120000 });
    return { choices: [{ message: { role: 'assistant', content: (response.data?.content || []).map((part: any) => part.text || '').join(''), reasoning: '' } }], usage: response.data?.usage };
  }
  const contents = normalized.filter(message => message.role !== 'system').map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  const response = await axios.post(`${provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'}/models/${encodeURIComponent(modelId)}:generateContent`, { systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined, contents }, { params: { key: provider.apiKey }, timeout: 120000 });
  return { choices: [{ message: { role: 'assistant', content: response.data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || '', reasoning: '' } }], usage: response.data?.usageMetadata };
}

const openai = OPENROUTER_API_KEY ? new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://ai.studio/build",
    "X-Title": "HK-Ai Intelligence",
  }
}) : null;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || '');
      if (!token) return next(new Error('Login required.'));
      socket.data.firebaseUser = await verifyFirebaseIdToken(token);
      return next();
    } catch {
      return next(new Error('Invalid Firebase login session.'));
    }
  });
  const PORT = 3000;

  app.use(express.json());
  const modelCatalogCache = new Map<string, { expiresAt: number; models: any[] }>();
  const providerUsageCache = new Map<string, Map<string, any>>();
  const recordProviderFailure = (uid: string, providerId: string, error: any) => {
    if (!providerUsageCache.has(uid)) providerUsageCache.set(uid, new Map());
    const status = Number(error?.response?.status || error?.status || 0) || null;
    const headers = error?.response?.headers || {};
    const message = String(error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Provider request failed.');
    providerUsageCache.get(uid)!.set(providerId, {
      status,
      message,
      rateLimited: status === 429 || /rate.?limit|free-models-per-day|too many requests/i.test(message),
      retryAfter: headers['retry-after'] || null,
      limit: headers['x-ratelimit-limit'] || null,
      remaining: headers['x-ratelimit-remaining'] || null,
      reset: headers['x-ratelimit-reset'] || null,
      checkedAt: Date.now()
    });
  };
  const friendlyProviderError = (providerName: string, error: any) => {
    const status = Number(error?.response?.status || error?.status || 0) || null;
    const raw = String(error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Provider request failed.');
    if (status === 429 || /rate.?limit|free-models-per-day|too many requests/i.test(raw)) {
      const retryAfter = error?.response?.headers?.['retry-after'];
      return `Rate limit exceeded for ${providerName}.${retryAfter ? ` Retry after ${retryAfter} seconds.` : ' Please wait, switch model, or add another provider.'}`;
    }
    return raw;
  };

  const requireFirebaseUser = async (req: any, res: any, next: any) => {
    try {
      const token = getBearerToken(req);
      if (!token) return res.status(401).json({ error: { message: 'Login required.' } });
      (req as any).firebaseUser = await verifyFirebaseIdToken(token);
      return next();
    } catch (error: any) {
      console.warn('[Auth] Firebase token rejected:', error?.message || error);
      return res.status(401).json({ error: { message: 'Your login session is invalid or expired. Please sign in again.' } });
    }
  };

  const normalizeProviderInput = (value: any): UserProvider | null => {
    const preset = providerPresets.find(item => item.id === String(value?.id || ''));
    const id = String(value?.id || '').trim();
    const name = String(value?.name || preset?.name || id).trim();
    const kind = (value?.kind || preset?.kind || 'openai-compatible') as ProviderKind;
    const baseUrl = String(value?.baseUrl ?? preset?.baseUrl ?? '').trim().replace(/\/$/, '');
    const apiKey = String(value?.apiKey || '').trim();
    if (!id || !name || !['openai-compatible', 'anthropic', 'google', 'search'].includes(kind)) return null;
    if (kind === 'openai-compatible' && !/^https:\/\//i.test(baseUrl)) return null;
    return { id, name, kind, apiKey, baseUrl, enabled: value?.enabled !== false, updatedAt: Date.now() };
  };

  app.get('/api/providers/presets', requireFirebaseUser, (_req, res) => {
    res.json(providerPresets.map(({ id, name, kind, baseUrl }) => ({ id, name, kind, baseUrl })));
  });

  app.get('/api/providers', requireFirebaseUser, (req, res) => {
    const providers = loadUserProviders((req as any).firebaseUser.uid).map(provider => ({
      id: provider.id,
      name: provider.name,
      kind: provider.kind,
      baseUrl: provider.baseUrl,
      enabled: provider.enabled !== false,
      hasKey: Boolean(provider.apiKey),
      maskedKey: maskApiKey(provider.apiKey),
      updatedAt: provider.updatedAt || null
    }));
    res.json({ providers });
  });

  app.put('/api/providers', requireFirebaseUser, (req, res) => {
    const incoming = Array.isArray(req.body?.providers) ? req.body.providers : [];
    if (incoming.length > 20) return res.status(400).json({ error: { message: 'A maximum of 20 provider connections is supported.' } });
    const previous = loadUserProviders((req as any).firebaseUser.uid);
    const previousById = new Map(previous.map(provider => [provider.id, provider]));
    const providers: UserProvider[] = [];
    for (const raw of incoming) {
      const normalized = normalizeProviderInput(raw);
      if (!normalized) return res.status(400).json({ error: { message: `Invalid provider configuration for ${raw?.id || 'unknown provider'}.` } });
      const old = previousById.get(normalized.id);
      if (!normalized.apiKey && old?.apiKey) normalized.apiKey = old.apiKey;
      if (!normalized.apiKey) continue;
      providers.push(normalized);
    }
    saveUserProviders((req as any).firebaseUser.uid, providers);
    modelCatalogCache.delete((req as any).firebaseUser.uid);
    res.json({ providers: providers.map(provider => ({ id: provider.id, name: provider.name, kind: provider.kind, baseUrl: provider.baseUrl, enabled: provider.enabled !== false, hasKey: true, maskedKey: maskApiKey(provider.apiKey), updatedAt: provider.updatedAt })) });
  });

  app.delete('/api/providers/:providerId', requireFirebaseUser, (req, res) => {
    const uid = (req as any).firebaseUser.uid;
    const providers = loadUserProviders(uid).filter(provider => provider.id !== req.params.providerId);
    saveUserProviders(uid, providers);
    modelCatalogCache.delete(uid);
    providerUsageCache.get(uid)?.delete(req.params.providerId);
    res.json({ ok: true });
  });

  app.get('/api/providers/usage', requireFirebaseUser, async (req, res) => {
    const uid = (req as any).firebaseUser.uid;
    const providers = loadUserProviders(uid).filter(provider => provider.enabled !== false && provider.apiKey);
    const lastStates = providerUsageCache.get(uid) || new Map();
    const usage = await Promise.all(providers.map(async provider => {
      const previous = lastStates.get(provider.id) || null;
      if (provider.id !== 'openrouter') {
        return { id: provider.id, name: provider.name, available: false, message: 'Usage is managed by this provider dashboard.', lastError: previous };
      }
      try {
        const response = await axios.get('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${provider.apiKey}` }, timeout: 15000 });
        const data = response.data?.data || response.data || {};
        const result = { id: provider.id, name: provider.name, available: true, limit: data.limit ?? null, limitRemaining: data.limit_remaining ?? null, limitReset: data.limit_reset ?? null, usage: data.usage ?? null, rateLimit: previous?.rateLimited ? previous : null, checkedAt: Date.now() };
        if (providerUsageCache.has(uid)) providerUsageCache.get(uid)!.set(provider.id, { ...(providerUsageCache.get(uid)!.get(provider.id) || {}), checkedAt: Date.now(), rateLimited: false });
        return result;
      } catch (error: any) {
        recordProviderFailure(uid, provider.id, error);
        return { id: provider.id, name: provider.name, available: false, message: friendlyProviderError(provider.name, error), lastError: providerUsageCache.get(uid)?.get(provider.id) || null };
      }
    }));
    res.json({ usage, checkedAt: Date.now() });
  });

  // WhatsApp Management
  const whatsappClients = new Map<string, any>();
  const whatsappData = new Map<string, {
    autoReply: boolean;
    aiName: string;
    aiPersonality: string;
    userName: string;
    aiModel: string;
    systemPrompt?: string;
    reactionEnabled?: boolean;
    reactionEmoji?: string;
  }>();
  const whatsappChatCache = new Map<string, Map<string, any>>();
  const whatsappMessageCache = new Map<string, Map<string, any[]>>();
  const whatsappPairingCodes = new Map<string, { code: string; phoneNumber: string; createdAt: number }>();
  const whatsappPairingInFlight = new Set<string>();
  const whatsappMemoryDir = path.join(os.homedir(), '.hk-ai-whatsapp-memory');
  fs.mkdirSync(whatsappMemoryDir, { recursive: true });
  const HANDOFF_PATTERNS = /\b(human|agent|real person|call me|complaint|complain|manager|owner|urgent|emergency)\b/i;

  const loadPersistedMemory = (userId: string) => {
    if (whatsappMessageCache.has(userId)) return;
    const memoryFile = path.join(whatsappMemoryDir, `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    try {
      const parsed = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
      whatsappMessageCache.set(userId, new Map(Object.entries(parsed || {})) as Map<string, any[]>);
    } catch {
      whatsappMessageCache.set(userId, new Map());
    }
  };

  const persistMemory = (userId: string) => {
    try {
      loadPersistedMemory(userId);
      const memoryFile = path.join(whatsappMemoryDir, `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
      const serializable = Object.fromEntries(whatsappMessageCache.get(userId) || new Map());
      fs.writeFileSync(memoryFile, JSON.stringify(serializable));
    } catch (error: any) {
      console.warn(`[WhatsApp] Memory persistence warning for ${userId}:`, error?.message || error);
    }
  };

  const listCachedChats = (userId: string) => {
    return Array.from(whatsappChatCache.get(userId)?.values() || [])
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  };

  const getCachedHistory = (userId: string, chatId: string, limit = 20) => {
    loadPersistedMemory(userId);
    return (whatsappMessageCache.get(userId)?.get(chatId) || [])
      .filter(message => String(message.body || '').trim())
      .slice(-limit)
      .map(message => ({
        role: message.fromMe ? 'assistant' : 'user',
        content: String(message.body)
      }));
  };

  const normalizePairingPhone = (value: unknown) => String(value || '').replace(/[^0-9]/g, '');

  const requestPairingCode = async (client: any, userId: string, phoneNumber: string, socket: any, attempt = 1): Promise<void> => {
    const phone = normalizePairingPhone(phoneNumber);
    socket.join(userId);
    const cachedCode = whatsappPairingCodes.get(userId);
    if (cachedCode && cachedCode.phoneNumber === phone && Date.now() - cachedCode.createdAt < 180000) {
      io.to(userId).emit('whatsapp:pairing_code', { code: cachedCode.code, phoneNumber: phone });
      return;
    }
    if (!/^\d{7,15}$/.test(phone)) {
      io.to(userId).emit('whatsapp:pairing_error', { error: 'Enter a valid international phone number with country code, without + or spaces.' });
      return;
    }
    if (!client || typeof client.requestPairingCode !== 'function') {
      io.to(userId).emit('whatsapp:pairing_error', { error: 'This installed WhatsApp Web library does not support phone-number pairing codes.' });
      return;
    }
    if (whatsappPairingInFlight.has(userId)) return;
    whatsappPairingInFlight.add(userId);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const code = String(await client.requestPairingCode(phone, true, 180000));
      whatsappPairingCodes.set(userId, { code, phoneNumber: phone, createdAt: Date.now() });
      io.to(userId).emit('whatsapp:pairing_code', { code, phoneNumber: phone });
      console.log(`[WhatsApp] Pairing code generated for ${userId}.`);
    } catch (error: any) {
      const message = String(error?.message || error || 'Unable to generate a WhatsApp pairing code.');
      const contextLost = /execution context was destroyed|Target closed|Session closed|Protocol error/i.test(message);
      if (contextLost && attempt < 3) {
        console.warn(`[WhatsApp] Pairing page is still navigating for ${userId}; retrying code request ${attempt + 1}/3.`);
        setTimeout(() => { void requestPairingCode(client, userId, phone, socket, attempt + 1); }, 5000);
        return;
      }
      console.error(`[WhatsApp] Pairing code error for ${userId}:`, error);
      io.to(userId).emit('whatsapp:pairing_error', { error: contextLost ? 'WhatsApp is still loading. Please wait a few seconds and request the pairing code again.' : message });
    } finally {
      whatsappPairingInFlight.delete(userId);
    }
  };

  let Client: any, LocalAuth: any, qrcode: any;

  async function tavilySearch(query: string, apiKey: string) {
    try {
      if (!apiKey.trim()) return null;
      const response = await axios.post("https://api.tavily.com/search", {
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 5,
        include_answer: true
      });
      return response.data;
    } catch (error) {
      console.error("Tavily search error:", error);
      return null;
    }
  }

  io.on("connection", (socket) => {
    console.log("Client connected to socket:", socket.id);

    socket.on("whatsapp:init", async ({ settings, pairingPhoneNumber }) => {
      const userId = socket.data.firebaseUser.uid;
      socket.join(userId);
      console.log(`[WhatsApp] Init requested for user: ${userId}`);
      if (settings) {
        whatsappData.set(userId, settings);
      }
      
      // Lazy load WhatsApp modules ONLY when requested
      if (!Client || !LocalAuth || !qrcode) {
        try {
          const wweb = await import("whatsapp-web.js");
          const pkg = (wweb as any).default || wweb;
          Client = pkg.Client;
          LocalAuth = pkg.LocalAuth;
          
          const qrPkg = await import("qrcode");
          qrcode = (qrPkg as any).default || qrPkg;
        } catch (err) {
          console.error("[WhatsApp] Failed to load modules:", err);
          socket.emit("whatsapp:status", { status: 'ERROR', error: 'WhatsApp modules not found' });
          return;
        }
      }

      const existing = whatsappClients.get(userId);
      if (existing) {
        try {
          if (existing._initializing) {
            console.log(`[WhatsApp] Client ${userId} is currently initializing, waiting...`);
            if (pairingPhoneNumber) {
              setTimeout(() => { void requestPairingCode(existing, userId, pairingPhoneNumber, socket); }, 8000);
            }
            return;
          }
          const state = await existing.getState().catch(() => null);
          if (state === 'CONNECTED') {
            console.log(`[WhatsApp] Client ${userId} already connected.`);
            socket.emit("whatsapp:status", { status: 'CONNECTED' });
            if (pairingPhoneNumber) {
              socket.emit('whatsapp:pairing_error', { error: 'This WhatsApp account is already connected. Disconnect it before requesting a new pairing code.' });
            }
            // Do not call getChats during initialization. WhatsApp Web can report
            // CONNECTED while its internal chat store is unavailable.
            socket.emit('whatsapp:chats_loaded', { count: 0 });
            return;
          } else {
            console.log(`[WhatsApp] Client ${userId} in state ${state}, destroying for fresh init.`);
            await existing.destroy().catch(() => {});
            whatsappClients.delete(userId);
          }
        } catch (e) {
          console.error(`[WhatsApp] Error checking client status for ${userId}:`, e);
          whatsappClients.delete(userId);
        }
      }

      console.log(`[WhatsApp] Creating new client for ${userId}`);
      await cleanupStaleWhatsAppBrowser(userId);
      const browserPath = resolveWhatsAppBrowserPath();
      if (!browserPath) {
        const error = 'No Chromium/Chrome executable found. Install Chrome or run `npx puppeteer browsers install chrome`.';
        console.error(`[WhatsApp] ${error}`);
        socket.emit('whatsapp:status', { status: 'ERROR', error });
        return;
      }
      console.log(`[WhatsApp] Using browser executable: ${browserPath}`);

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: userId,
          dataPath: process.env.WHATSAPP_DATA_PATH || path.join(os.homedir(), '.hk-ai-whatsapp'),
        }),
        puppeteer: {
          executablePath: browserPath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
          ],
          handleSIGINT: false,
        }
      });
      
      client._initializing = true;
      whatsappClients.set(userId, client);

      const emittedMessages = new Set<string>();
      const emitMessage = async (msg: any) => {
        const messageId = msg?.id?._serialized || `${msg?.from || msg?.to || 'unknown'}:${msg?.timestamp || Date.now()}`;
        if (emittedMessages.has(messageId)) return;
        emittedMessages.add(messageId);
        if (emittedMessages.size > 1000) emittedMessages.delete(emittedMessages.values().next().value);

        let chat: any = null;
        let contact: any = null;
        try { chat = await msg.getChat(); } catch (error) {
          console.warn(`[WhatsApp] Chat metadata unavailable for ${messageId}; using message identifiers.`);
        }
        try { contact = await msg.getContact(); } catch {}

        const chatId = chat?.id?._serialized || msg.from || msg.to || 'unknown-chat';
        const chatName = chat?.name || chat?.formattedTitle || contact?.pushname || contact?.name || msg.from || 'WhatsApp chat';
        const message = {
          id: messageId,
          body: msg.body || '',
          from: msg.from,
          to: msg.to,
          timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
          fromMe: Boolean(msg.fromMe),
          hasMedia: Boolean(msg.hasMedia),
          type: msg.type,
          senderName: contact?.pushname || contact?.name || msg.from || 'Unknown',
          chatName
        };

        if (!whatsappChatCache.has(userId)) whatsappChatCache.set(userId, new Map());
        const chatCache = whatsappChatCache.get(userId)!;
        const previousChat = chatCache.get(chatId);
        chatCache.set(chatId, {
          id: chatId,
          name: chatName,
          unreadCount: (previousChat?.unreadCount || 0) + (msg.fromMe ? 0 : 1),
          timestamp: message.timestamp
        });

        if (!whatsappMessageCache.has(userId)) whatsappMessageCache.set(userId, new Map());
        const messageCache = whatsappMessageCache.get(userId)!;
        const cachedMessages = messageCache.get(chatId) || [];
        messageCache.set(chatId, [...cachedMessages, message].slice(-100));
        persistMemory(userId);

        socket.emit('whatsapp:chats', listCachedChats(userId));
        socket.emit('whatsapp:chats_loaded', { count: listCachedChats(userId).length, source: 'live' });
        socket.emit('whatsapp:message', { chatId, message });
      };

      client.on('qr', (qr: string) => {
        console.log(`[WhatsApp] QR generated for ${userId}`);
        qrcode.toDataURL(qr, (err: any, url: string) => {
          socket.emit('whatsapp:qr', url);
        });
        socket.emit('whatsapp:status', { status: 'DISCONNECTED' });
      });

      const sendChats = async (attempt = 1): Promise<void> => {
        try {
          // WhatsApp Web can report ready before its chat store is queryable.
          if (attempt > 1) await new Promise(resolve => setTimeout(resolve, 2500));
          const chats = await client.getChats();
          const simplifiedChats = chats.slice(0, 50).map((c: any) => ({
            id: c.id._serialized,
            name: c.name || c.formattedTitle || 'Unknown chat',
            unreadCount: c.unreadCount || 0,
            timestamp: c.timestamp || 0
          }));
          socket.emit('whatsapp:chats', simplifiedChats);
          socket.emit('whatsapp:chats_loaded', { count: simplifiedChats.length });
          console.log(`[WhatsApp] Loaded ${simplifiedChats.length} chats for ${userId}`);
        } catch (error: any) {
          if (attempt < 3) {
            console.warn(`[WhatsApp] Chat indexing attempt ${attempt} failed for ${userId}; retrying...`);
            return sendChats(attempt + 1);
          }
          const message = error?.message || 'Unable to load WhatsApp conversations.';
          console.error(`[WhatsApp] Chat indexing error for ${userId}:`, error);
          socket.emit('whatsapp:chats', []);
          socket.emit('whatsapp:chats_error', { error: `${message} Try Restart WhatsApp Bridge.` });
        }
      };

      client.on('ready', async () => {
        console.log(`[WhatsApp] Client ${userId} is ready!`);
        client._initializing = false;
        socket.emit('whatsapp:status', { status: 'CONNECTED' });
        // Chat indexing is deliberately manual. Calling getChats immediately
        // after ready can crash on newer WhatsApp Web builds.
        socket.emit('whatsapp:chats_loaded', { count: 0 });
      });

      client.on('authenticated', () => {
        console.log(`[WhatsApp] ${userId} Authenticated`);
        socket.emit('whatsapp:status', { status: 'AUTHENTICATED' });
      });

      // UI updates for everything
      client.on('message', emitMessage);
      client.on('message_create', emitMessage);

      client.on('auth_failure', (msg: string) => {
        console.error(`[WhatsApp] ${userId} auth failure:`, msg);
        client._initializing = false;
        socket.emit('whatsapp:status', { status: 'ERROR', error: msg });
        whatsappClients.delete(userId);
      });

      client.on('disconnected', (reason: string) => {
        console.log(`[WhatsApp] ${userId} disconnected:`, reason);
        client._initializing = false;
        socket.emit('whatsapp:status', { status: 'DISCONNECTED' });
        whatsappClients.delete(userId);
      });

      // Auto-reply for incoming messages. Both events are supported because
      // whatsapp-web.js versions differ in which event they emit first.
      const handledAutoReplies = new Set<string>();
      const replyQueues = new Map<string, Promise<void>>();
      const processAutoReply = async (msg: any) => {
        const messageId = msg?.id?._serialized || `${msg?.from || 'unknown'}:${msg?.timestamp || Date.now()}`;
        let activeProviderId = 'unknown';
        const settings = whatsappData.get(userId) || {
          autoReply: true,
          aiName: 'HK-Ai WhatsApp',
          aiPersonality: 'Professional and direct',
          userName: 'the user',
          aiModel: 'openrouter/free'
        };
        if (!(settings.autoReply ?? true) || msg.fromMe || !String(msg.body || '').trim()) return;

        try {
          let chat: any = null;
          try {
            chat = await msg.getChat();
            if (chat?.isGroup) return;
          } catch {
            // New WhatsApp Web builds may reject getChat(); direct-send still works.
            if (String(msg.from || '').endsWith('@g.us')) return;
          }

          const chatId = String(msg.from || msg.to || 'unknown-chat');
          const currentText = String(msg.body || '').trim();
          const handoffRequested = HANDOFF_PATTERNS.test(currentText);
          const intent = /\b(price|buy|purchase|cost|rate|order)\b/i.test(currentText) ? 'sales' : handoffRequested ? 'handoff' : /\b(help|problem|issue|error|not working|complaint)\b/i.test(currentText) ? 'support' : /\?|\b(what|why|how|when|where|who)\b/i.test(currentText) ? 'question' : 'general';
          if (handoffRequested) {
            socket.emit('whatsapp:handoff_requested', { chatId, messageId, text: currentText, intent });
            console.warn(`[WhatsApp] Human handoff requested by ${msg.from}.`);
          }
          const previousHistory = getCachedHistory(userId, chatId, 20)
            .filter((entry: any) => entry.content !== currentText || entry.role !== 'user');
          const conversationHistory = [
            ...previousHistory,
            { role: 'user', content: currentText }
          ].slice(-21);

          const requestedModel = settings.aiModel || 'openrouter/free';
          const selectedModel = requestedModel === 'openrouter/auto' ? 'openrouter/free' : requestedModel;
          const parsedModel = parseProviderModelKey(selectedModel);
          const userProvider = loadUserProviders(userId).find(provider => provider.id === parsedModel.providerId && provider.enabled !== false && provider.apiKey);
          if (!userProvider) throw new Error('Add the selected AI provider API in Settings → AI APIs before enabling WhatsApp auto-replies.');
          activeProviderId = userProvider.id;

          if ((settings.reactionEnabled ?? true) && typeof msg.react === 'function') {
            const emoji = String(settings.reactionEmoji || '👍').trim() || '👍';
            try {
              await msg.react(emoji);
              socket.emit('whatsapp:reaction', { chatId, messageId, emoji });
            } catch (reactionError: any) {
              console.warn(`[WhatsApp] Reaction failed for ${msg.from}:`, reactionError?.message || reactionError);
            }
          }

          const customPrompt = String(settings.systemPrompt || '').trim();
          const systemPrompt = customPrompt || DEFAULT_WHATSAPP_SYSTEM_PROMPT;
          const personaContext = `\nAssistant name: ${settings.aiName || 'HK-Ai WhatsApp'}.\nPersonality: ${settings.aiPersonality || 'Professional and direct'}.\nOwner: ${settings.userName || 'the user'}.`;
          const upstreamModel = userProvider.id === 'openrouter' && parsedModel.modelId === 'free' ? 'openrouter/free' : parsedModel.modelId;
          console.log(`[WhatsApp] Generating contextual auto-reply for ${msg.from} using ${userProvider.name}/${upstreamModel} with ${conversationHistory.length} messages.`);
          const completion = await createProviderCompletion(userProvider, upstreamModel, conversationHistory, `${systemPrompt}${personaContext}\nCurrent intent classification: ${intent}. If intent is handoff, acknowledge the request and say that a human will take over; do not pretend to be human.`);
          const responseText = String(completion?.choices?.[0]?.message?.content || '').trim();

          if (responseText) {
            console.log(`[WhatsApp] Auto-replying to ${msg.from}: ${responseText.substring(0, 60)}...`);
            if (chat?.sendSeen) await chat.sendSeen();
            await client.sendMessage(msg.from, responseText);
            if (!whatsappMessageCache.has(userId)) whatsappMessageCache.set(userId, new Map());
            const replyHistory = whatsappMessageCache.get(userId)!;
            const cached = replyHistory.get(chatId) || [];
            replyHistory.set(chatId, [...cached, {
              id: `ai-${Date.now()}`,
              body: responseText,
              from: client.info?.wid?._serialized || 'me',
              to: msg.from,
              timestamp: Math.floor(Date.now() / 1000),
              fromMe: true,
              type: 'chat',
              senderName: settings.aiName || 'HK-Ai WhatsApp',
              chatName: chat?.name || msg.from
            }].slice(-100));
            persistMemory(userId);
          } else {
            console.warn(`[WhatsApp] AI returned an empty auto-reply for ${msg.from}`);
          }
        } catch (error: any) {
          recordProviderFailure(userId, activeProviderId, error);
          const message = activeProviderId !== 'unknown' ? friendlyProviderError(activeProviderId, error) : (error?.message || 'AI auto-reply failed.');
          console.error(`[WhatsApp] Auto-reply error for ${msg.from}:`, message);
          socket.emit('whatsapp:auto_reply_error', { error: message, rateLimited: /rate.?limit|free-models-per-day|too many requests/i.test(message) });
        }
      };

      const handleAutoReply = (msg: any) => {
        const messageId = msg?.id?._serialized || `${msg?.from || 'unknown'}:${msg?.timestamp || Date.now()}`;
        if (handledAutoReplies.has(messageId)) return;
        handledAutoReplies.add(messageId);
        if (handledAutoReplies.size > 500) handledAutoReplies.delete(handledAutoReplies.values().next().value as string);
        const chatId = String(msg?.from || msg?.to || 'unknown-chat');
        const previous = replyQueues.get(chatId) || Promise.resolve();
        let next: Promise<void>;
        next = previous.catch(() => undefined).then(() => processAutoReply(msg)).then(() => undefined).finally(() => {
          if (replyQueues.get(chatId) === next) replyQueues.delete(chatId);
        });
        replyQueues.set(chatId, next);
      };

      client.on('message', handleAutoReply);
      client.on('message_create', handleAutoReply);

      let initializeAttempts = 0;
      const initializeClient = async (): Promise<void> => {
        try {
          initializeAttempts += 1;
          console.log(`[WhatsApp] Initializing client ${userId} (attempt ${initializeAttempts}/3)`);
          await client.initialize();
        } catch (err: any) {
          const message = String(err?.message || err || 'WhatsApp initialization failed.');
          const contextLost = /execution context was destroyed|Target closed|Session closed|Protocol error/i.test(message);
          if (contextLost && initializeAttempts < 3) {
            console.warn(`[WhatsApp] Browser context changed during initialization for ${userId}; retrying in 5 seconds.`);
            setTimeout(() => { void initializeClient(); }, 5000);
            return;
          }
          console.error(`[WhatsApp] Fatal error initializing ${userId}:`, err);
          client._initializing = false;
          try { await client.destroy(); } catch (e) {}
          if (whatsappClients.get(userId) === client) whatsappClients.delete(userId);
          socket.emit('whatsapp:status', { status: 'ERROR', error: message });
        }
      };
      void initializeClient();

      if (pairingPhoneNumber) {
        setTimeout(() => { void requestPairingCode(client, userId, pairingPhoneNumber, socket); }, 8000);
      }
    });

    socket.on("whatsapp:pair", async ({ userId, phoneNumber, settings }) => {
      socket.join(userId);
      const phone = normalizePairingPhone(phoneNumber);
      const client = whatsappClients.get(userId);
      if (settings) whatsappData.set(userId, settings);
      if (!client) {
        socket.emit('whatsapp:pairing_error', { error: 'Start the WhatsApp bridge with the phone number first so a pairing session can be created.' });
        return;
      }
      const waitMs = client._initializing ? 3500 : 0;
      setTimeout(() => { void requestPairingCode(client, userId, phone, socket); }, Math.max(waitMs, 2500));
    });

    socket.on("whatsapp:reset", async ({ userId }) => {
      console.log(`[WhatsApp] Manual reset requested for ${userId}`);
      const client = whatsappClients.get(userId);
      if (client) {
        try {
          await client.destroy();
        } catch (e) {}
        whatsappClients.delete(userId);
      }
      socket.emit('whatsapp:status', { status: 'DISCONNECTED' });
    });

    socket.on("whatsapp:get_chats", async () => {
      const userId = socket.data.firebaseUser.uid;
      const chats = listCachedChats(userId);
      console.log(`[WhatsApp] Returning ${chats.length} live-cached chats for ${userId}.`);
      socket.emit('whatsapp:chats', chats);
      socket.emit('whatsapp:chats_loaded', { count: chats.length, source: 'live-cache' });
    });

    socket.on("whatsapp:get_messages", async ({ chatId }) => {
      const userId = socket.data.firebaseUser.uid;
      const messages = whatsappMessageCache.get(userId)?.get(chatId) || [];
      socket.emit("whatsapp:messages", { chatId, messages });
    });

    socket.on("whatsapp:send_message", async ({ chatId, content, media, replyTo }) => {
      const userId = socket.data.firebaseUser.uid;
      const client = whatsappClients.get(userId);
      if (!client || typeof client.sendMessage !== 'function') {
        socket.emit('whatsapp:send_error', { error: 'WhatsApp bridge is not connected.' });
        return;
      }
      try {
        const sendOptions: any = {};
        if (replyTo?.id && !String(replyTo.id).startsWith('temp-')) {
          sendOptions.quotedMessageId = replyTo.id;
        }
        let sentMessage: any;
        if (media && media.data) {
          const { MessageMedia } = require('whatsapp-web.js');
          const mediaObj = new MessageMedia(media.mimetype, media.data, media.filename);
          sentMessage = await client.sendMessage(chatId, mediaObj, { ...sendOptions, caption: content });
        } else {
          sentMessage = await client.sendMessage(chatId, content, sendOptions);
        }
        if (!whatsappMessageCache.has(userId)) whatsappMessageCache.set(userId, new Map());
        const history = whatsappMessageCache.get(userId)!;
        const cached = history.get(chatId) || [];
        history.set(chatId, [...cached, {
          id: sentMessage?.id?._serialized || `sent-${Date.now()}`,
          body: content,
          fromMe: true,
          timestamp: Math.floor(Date.now() / 1000),
          type: media ? 'media' : 'chat',
          quotedMessageId: replyTo?.id || null,
          chatName: whatsappChatCache.get(userId)?.get(chatId)?.name || chatId
        }].slice(-100));
      } catch (error: any) {
        console.error(`[WhatsApp] Error sending message to ${chatId}:`, error);
        socket.emit('whatsapp:send_error', { error: error?.message || 'Unable to send WhatsApp message.' });
      }
    });

    const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();
    socket.on("whatsapp:schedule_message", ({ chatId, content, sendAt }) => {
      const userId = socket.data.firebaseUser.uid;
      const target = Number(sendAt);
      const text = String(content || '').trim();
      if (!userId || !chatId || !text || !Number.isFinite(target) || target <= Date.now()) {
        socket.emit('whatsapp:schedule_error', { error: 'Choose a valid future time and message.' });
        return;
      }
      const delay = target - Date.now();
      if (delay > 30 * 24 * 60 * 60 * 1000) {
        socket.emit('whatsapp:schedule_error', { error: 'Messages can be scheduled up to 30 days ahead.' });
        return;
      }
      const scheduleId = `${userId}-${chatId}-${target}-${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(async () => {
        scheduledTimers.delete(scheduleId);
        const client = whatsappClients.get(userId);
        try {
          if (!client || typeof client.sendMessage !== 'function') throw new Error('WhatsApp bridge is not connected at the scheduled time.');
          const sentMessage = await client.sendMessage(chatId, text);
          if (!whatsappMessageCache.has(userId)) whatsappMessageCache.set(userId, new Map());
          const history = whatsappMessageCache.get(userId)!;
          const cached = history.get(chatId) || [];
          history.set(chatId, [...cached, {
            id: sentMessage?.id?._serialized || `scheduled-${Date.now()}`,
            body: text,
            fromMe: true,
            timestamp: Math.floor(Date.now() / 1000),
            type: 'chat',
            chatName: whatsappChatCache.get(userId)?.get(chatId)?.name || chatId
          }].slice(-100));
          persistMemory(userId);
          io.to(userId).emit('whatsapp:scheduled_sent', { scheduleId, chatId, content: text });
        } catch (error: any) {
          io.to(userId).emit('whatsapp:schedule_error', { scheduleId, error: error?.message || 'Scheduled send failed.' });
        }
      }, delay);
      scheduledTimers.set(scheduleId, timer);
      socket.emit('whatsapp:scheduled', { scheduleId, chatId, content: text, sendAt: target });
    });

    socket.on("whatsapp:update_settings", ({ settings }) => {
      const userId = socket.data.firebaseUser.uid;
      whatsappData.set(userId, settings);
    });

    socket.on("whatsapp:disconnect", () => {
      const userId = socket.data.firebaseUser.uid;
      const client = whatsappClients.get(userId);
      if (client) {
        client.logout();
        whatsappClients.delete(userId);
        socket.emit('whatsapp:status', { status: 'DISCONNECTED' });
      }
    });
  });

  app.get("/health", (req, res) => {
    res.send("Server is alive");
  });

  // Authenticated, per-user model catalog. Provider keys are never returned to the client.
  app.get('/api/models', requireFirebaseUser, async (req, res) => {
    const freeOnly = ['1', 'true'].includes(String(req.query.free || '').toLowerCase());
    const uid = (req as any).firebaseUser.uid;
    try {
      const cached = modelCatalogCache.get(uid);
      const providers = loadUserProviders(uid).filter(provider => provider.enabled !== false && provider.apiKey);
      const modelProviders = providers.filter(provider => provider.kind !== 'search');
      if (!cached || cached.expiresAt < Date.now()) {
        const results = await Promise.allSettled(modelProviders.map(provider => fetchProviderModels(provider)));
        const models = results.flatMap(result => result.status === 'fulfilled' ? result.value : []).filter(Boolean).sort((a: any, b: any) => a.name.localeCompare(b.name));
        const updated = { expiresAt: Date.now() + 60_000, models };
        modelCatalogCache.set(uid, updated);
      }
      const allModels = modelCatalogCache.get(uid)?.models || [];
      const models = freeOnly ? allModels.filter(model => model.isFree) : allModels;
      res.json({ models, total: models.length, freeTotal: allModels.filter(model => model.isFree).length, providers: providers.map(provider => ({ id: provider.id, name: provider.name, kind: provider.kind })), fetchedAt: Date.now() });
    } catch (error: any) {
      console.error('[Models] Provider catalog error:', error?.message || error);
      res.status(502).json({ error: 'Unable to load models from the configured providers.' });
    }
  });

  app.post('/api/chat', requireFirebaseUser, async (req, res) => {
    const { messages, model, stream, systemInstruction, isResearchMode } = req.body;
    const selected = parseProviderModelKey(String(model || ''));
    const uid = (req as any).firebaseUser.uid;
    const providers = loadUserProviders(uid).filter(provider => provider.enabled !== false && provider.apiKey);
    const provider = providers.find(item => item.id === selected.providerId);
    if (!provider) return res.status(400).json({ error: { message: 'Please add and enable the API provider for this model in Settings → AI APIs.' } });

    try {
      let finalSystemInstruction = String(systemInstruction || '');
      const normalizedMessages = normalizeProviderMessages(messages || []);
      if (isResearchMode) {
        const lastUserMsg = [...normalizedMessages].reverse().find((message: any) => message.role === 'user')?.content;
        const searchProvider = providers.find(item => item.id === 'tavily' && item.kind === 'search');
        if (!searchProvider) return res.status(400).json({ error: { message: 'Add your Tavily Web Search API in Settings → AI APIs before using Web Research.' } });
        if (lastUserMsg) {
          const tavilyData = await tavilySearch(lastUserMsg, searchProvider.apiKey);
          if (tavilyData?.results) {
            const context = tavilyData.results.map((result: any, index: number) => `SOURCE ${index + 1}: ${result.title}\nURL: ${result.url}\nCONTENT: ${result.content}`).join('\n\n---\n\n');
            const searchSummary = tavilyData.answer ? `\n\nSEARCH SUMMARY: ${tavilyData.answer}\n` : '';
            finalSystemInstruction += `\n[DEEP SEARCH KNOWLEDGE BASE]\n${searchSummary}\n${context}\nUse these sources, cite their URLs, and do not mention the internal search provider.`;
          } else {
            finalSystemInstruction += '\nDeep search was unavailable. Answer from general knowledge and state uncertainty where appropriate.';
          }
        }
      }

      const upstreamModel = provider.id === 'openrouter' && selected.modelId === 'free' ? 'openrouter/free' : selected.modelId;
      console.log(`[Chat] Calling ${provider.name} for ${upstreamModel} on behalf of ${(req as any).firebaseUser.uid}.`);
      const response = await createProviderCompletion(provider, upstreamModel, normalizedMessages, finalSystemInstruction);
      const assistantMessage = response?.choices?.[0]?.message;
      if (assistantMessage) {
        const reasoning = assistantMessage.reasoning_content || assistantMessage.reasoning;
        if (reasoning) assistantMessage.reasoning = reasoning;
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const content = String(assistantMessage?.content || '');
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: 'stop' }], provider: provider.id, model: upstreamModel })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      return res.json(response);
    } catch (error: any) {
      const status = error?.response?.status || error?.status || 500;
      recordProviderFailure(uid, provider.id, error);
      const message = friendlyProviderError(provider.name, error);
      console.error(`[Chat] ${provider.name} error:`, message);
      res.status(status).json({ error: { message, provider: provider.id, rateLimited: status === 429 || /rate.?limit|free-models-per-day|too many requests/i.test(message) } });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL SERVER START ERROR:", err);
  process.exit(1);
});

