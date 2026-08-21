import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from "socket.io-client";
import { 
  Send, 
  Search, 
  Menu, 
  Plus, 
  Settings, 
  ChevronDown, 
  History,
  AlertCircle,
  Loader2,
  Sparkles,
  Globe,
  Database,
  CheckCircle2,
  Cpu,
  User,
  Bot,
  Trash2,
  Check,
  X,
  Zap,
  Volume2,
  Share2,
  Flag,
  Info,
  MoreHorizontal,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Video,
  ArrowRight,
  Copy,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  MoreVertical,
  Youtube,
  Play,
  ExternalLink,
  MessageCircle,
  Reply,
  Smile,
  QrCode,
  LogOut,
  UserPlus,
  MessageSquare,
  Clock,
  KeyRound
} from 'lucide-react';
import { LoaderLogo } from './components/LoaderLogo';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { 
  auth, 
  signInWithGoogle, 
  logOut, 
  signInWithEmail,
  signUpWithEmail,
  updateUserProfile
} from './lib/firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser
} from 'firebase/auth';

declare global {
  interface Window {
    hkAiDesktop?: {
      isDesktop: boolean;
      getSettings: () => Promise<{ autoLaunch: boolean }>;
      setAutoLaunch: (enabled: boolean) => Promise<{ autoLaunch: boolean }>;
    };
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'default' | 'youtube' | 'search' | 'error';
  reasoning?: string;
  isTyping?: boolean;
  attachments?: { name: string; type: string; url?: string }[];
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface ProviderConfig {
  id: string;
  name: string;
  kind: 'openai-compatible' | 'anthropic' | 'google' | 'search';
  baseUrl?: string;
  apiKey?: string;
  maskedKey?: string;
  hasKey?: boolean;
  enabled?: boolean;
}

interface Model {
  id: string;
  rawId?: string;
  name: string;
  description?: string;
  context_length?: number | null;
  isFree?: boolean;
  provider?: string;
  providerName?: string;
  providerKind?: ProviderConfig['kind'];
  architecture?: Record<string, any> | null;
  supported_parameters?: string[];
  top_provider?: Record<string, any> | null;
  pricing?: {
    prompt?: string | null;
    completion?: string | null;
    request?: string | null;
    image?: string | null;
  };
}

function OnboardingModal({ 
  step, 
  data, 
  onNext, 
  onUpdate 
}: { 
  step: number; 
  data: any; 
  onNext: () => void; 
  onUpdate: (field: string, value: string) => void; 
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-bg-primary rounded-3xl p-8 border border-border-strong shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-border-subtle">
          <motion.div 
            className="h-full bg-text-main" 
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="mt-4">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Welcome to HK-Ai</h2>
                <p className="text-text-muted font-medium">First, let's get to know you. What should we call you?</p>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-text-dim uppercase tracking-widest block">Your Name</label>
                <input 
                  type="text" 
                  value={data.firstName}
                  onChange={(e) => onUpdate('firstName', e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-bg-sidebar border border-border-subtle rounded-2xl p-4 text-text-main focus:outline-none focus:border-text-main transition-colors font-medium shadow-inner"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight">AI Persona</h2>
                <p className="text-text-muted font-medium">How should I speak with you?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {['Friendly & Casual', 'Professional & Direct', 'Academic & Detailed', 'Creative & Expressive'].map((style) => (
                  <button
                    key={style}
                    onClick={() => onUpdate('communicationStyle', style)}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left font-bold text-sm transition-all flex items-center justify-between group",
                      data.communicationStyle === style 
                        ? "bg-text-main text-bg-primary border-text-main shadow-lg" 
                        : "bg-bg-sidebar border-border-subtle text-text-main hover:border-text-main"
                    )}
                  >
                    {style}
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      data.communicationStyle === style ? "border-bg-primary" : "border-border-subtle group-hover:border-text-main"
                    )}>
                      {data.communicationStyle === style && <div className="w-2 h-2 bg-bg-primary rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Final Step</h2>
                <p className="text-text-muted font-medium">How did you discover HK-Ai?</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['Social Media', 'Friend/Referral', 'Online Search', 'Ad', 'News Article', 'Other'].map((source) => (
                  <button
                    key={source}
                    onClick={() => onUpdate('referralSource', source)}
                    className={cn(
                      "p-4 rounded-2xl border font-bold text-xs transition-all",
                      data.referralSource === source 
                        ? "bg-text-main text-bg-primary border-text-main shadow-lg" 
                        : "bg-bg-sidebar border-border-subtle text-text-main hover:border-text-main text-center"
                    )}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-12">
            <button 
              onClick={onNext}
              disabled={step === 1 && !data.firstName.trim()}
              className="flex-1 py-4 bg-text-main text-bg-primary rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {step === 3 ? 'Get Started' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AuthModal({ 
  isOpen, 
  onClose, 
  mode, 
  setMode, 
  email, 
  setEmail, 
  pass, 
  setPass, 
  rememberMe,
  setRememberMe,
  error, 
  setError,
  isVerificationSent,
  setIsVerificationSent,
  onSubmit, 
  onGoogle,
  onResendEmail,
  onCheckVerified
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  mode: 'login' | 'signup'; 
  setMode: (m: 'login' | 'signup') => void;
  email: string;
  setEmail: (e: string) => void;
  pass: string;
  setPass: (p: string) => void;
  rememberMe: boolean;
  setRememberMe: (r: boolean) => void;
  error: string;
  setError: (e: string) => void;
  isVerificationSent: boolean;
  setIsVerificationSent: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogle: () => void;
  onResendEmail: () => void | Promise<void>;
  onCheckVerified: () => void | Promise<void>;
}) {
  if (!isOpen) return null;
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-bg-primary border border-border-strong rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
      >
        {isVerificationSent ? (
          <div className="text-center space-y-6 py-6">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-green-600 mx-auto transform rotate-6 border border-green-100">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">Verify Your Email</h2>
              <p className="text-text-muted font-medium px-4 text-sm">
                We've sent a verification link to <span className="text-text-main font-bold">{email}</span>. 
                Please click it to activate your account.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-bold">
                <AlertCircle size={14} />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div className="pt-4 space-y-4">
              <button 
                onClick={async () => {
                  try {
                    setIsVerifying(true);
                    await onCheckVerified();
                  } finally {
                    setIsVerifying(false);
                  }
                }}
                disabled={isVerifying}
                className="w-full py-4 bg-text-main text-bg-primary rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                I'm Verified
              </button>

              <button 
                onClick={async () => {
                  try {
                    setIsResending(true);
                    await onResendEmail();
                  } finally {
                    setIsResending(false);
                  }
                }}
                disabled={isResending}
                className="w-full py-3 bg-bg-sidebar border border-border-subtle text-text-main rounded-2xl font-bold text-xs hover:border-text-main transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Resend Verification Email
              </button>
              
              <button 
                onClick={() => { setIsVerificationSent(false); setMode('login'); setError(''); }}
                className="block mx-auto text-xs font-bold text-text-dim hover:text-text-main transition-colors mt-2"
              >
                Back to Login
              </button>

              <div className="pt-4">
                <p className="text-[10px] font-bold text-text-dim px-6">
                  Didn't receive it? Check your spam folder.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-8">
                <LoaderLogo size={0.6} />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight">{mode === 'login' ? 'Welcome Back' : 'Join HK-Ai Intelligence'}</h2>
                <p className="text-text-muted font-medium">{mode === 'login' ? 'Access your research threads' : 'Create an account to start syncing'}</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button 
                onClick={onGoogle}
                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-border-subtle rounded-2xl font-bold text-sm hover:bg-bg-sidebar transition-all group"
              >
                <Globe size={18} className="text-text-dim group-hover:text-text-main transition-colors" />
                Continue with Google
              </button>
              
              <div className="relative flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">or email access</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-bg-sidebar border border-border-subtle rounded-2xl p-4 text-sm text-text-main focus:outline-none focus:border-text-main transition-all font-medium"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-bg-sidebar border border-border-subtle rounded-2xl p-4 text-sm text-text-main focus:outline-none focus:border-text-main transition-all font-medium"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 px-1">
                    <button
                      type="button"
                      onClick={() => setRememberMe(!rememberMe)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        rememberMe ? "bg-text-main border-text-main" : "border-border-subtle"
                      )}
                    >
                      {rememberMe && <Check size={12} className="text-bg-primary" />}
                    </button>
                    <span className="text-xs font-bold text-text-muted">Remember Me</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold animate-pulse">
                    <AlertCircle size={14} />
                    <span className="flex-1">{error}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-text-main text-bg-primary rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {mode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-xs font-bold text-text-dim pt-2">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setIsVerificationSent(false); }}
                  className="text-text-main border-b-2 border-text-main/20 hover:border-text-main transition-colors"
                >
                  {mode === 'login' ? 'Register here' : 'Sign in here'}
                </button>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}


function WhatsAppPage({ 
  status,
  error,
  qr,
  chats,
  chatsError,
  chatsLoaded,
  settings,
  onUpdateSettings,
  onDisconnect,
  availableModels,
  onBack,
  messages,
  selectedChatId,
  onSelectChat,
  onSendMessage,
  onScheduleMessage,
  isSettingsDirty,
  onSaveSettings,
  onReset,
  onRefreshChats,
  pairingCode,
  pairingError,
  onPairWithPhone,
  replyTarget,
  onSetReplyTarget,
  onClearReplyTarget
}: { 
  status: string;
  error?: string | null;
  qr: string | null;
  chats: any[];
  chatsError?: string | null;
  chatsLoaded?: boolean;
  settings: any;
  onUpdateSettings: (s: any) => void;
  onDisconnect: () => void;
  availableModels: Model[];
  onBack: () => void;
  messages: any[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onSendMessage: (id: string, content: string, media?: any, replyTo?: any) => void;
  onScheduleMessage?: (id: string, content: string, sendAt: number) => void;
  isSettingsDirty?: boolean;
  onSaveSettings?: () => void;
  onReset?: () => void;
  onRefreshChats?: () => void;
  pairingCode?: string | null;
  pairingError?: string | null;
  onPairWithPhone?: (phoneNumber: string) => void;
  replyTarget?: any | null;
  onSetReplyTarget?: (message: any) => void;
  onClearReplyTarget?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'chats'>('settings');
  const [pairingMode, setPairingMode] = useState(false);
  const [pairingPhone, setPairingPhone] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [waModelSearch, setWaModelSearch] = useState('');
  const [scheduledText, setScheduledText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('');
  const [visibleModelCount, setVisibleModelCount] = useState(9);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const visibleWaModels = availableModels
    .filter(model => `${model.name} ${model.id} ${model.provider || ''}`.toLowerCase().includes(waModelSearch.trim().toLowerCase()))
    .sort((a, b) => Number(Boolean(b.isFree)) - Number(Boolean(a.isFree)) || a.name.localeCompare(b.name));
  const waModelCards = waModelSearch.trim() ? visibleWaModels : visibleWaModels.slice(0, visibleModelCount);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-border-subtle flex items-center justify-between bg-bg-sidebar/30">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-bg-sidebar rounded-xl transition-colors border border-border-subtle"
          >
            <ChevronDown className="rotate-90" size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-2xl">
              <MessageCircle size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">WhatsApp Intelligence</h2>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  status === 'CONNECTED' ? "bg-green-500 animate-pulse" : 
                  status === 'AUTHENTICATED' ? "bg-blue-500 animate-bounce" : "bg-amber-500"
                )} />
                <span className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em]">
                  {status === 'AUTHENTICATED' ? 'Synchronizing Data...' : status}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 p-1.5 bg-bg-sidebar/50 border border-border-subtle rounded-2xl">
          {[
            { id: 'status', label: 'Connection', icon: QrCode },
            { id: 'settings', label: 'AI Bridge', icon: Settings },
            { id: 'chats', label: 'Conversations', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-bg-primary text-text-main shadow-lg border border-border-strong" 
                  : "text-text-dim hover:text-text-main"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'status' && (
            <div className="space-y-12 text-center py-12">
              {status === 'CONNECTED' ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto border-8 border-green-100 shadow-2xl ring-2 ring-green-100">
                    <CheckCircle2 size={64} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-4xl font-black tracking-tight">Protocol Engaged</h3>
                    <p className="text-lg text-text-muted font-medium max-w-md mx-auto">Your WhatsApp account is securely linked. HK-Ai is now monitoring and handling your messages.</p>
                  </div>
                  <div className="pt-8 border-t border-border-subtle">
                    <button 
                      onClick={onDisconnect}
                      className="px-10 py-5 bg-red-50 text-red-600 rounded-[2rem] font-black text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-3 mx-auto border-2 border-red-100 shadow-xl"
                    >
                      <LogOut size={20} />
                      Terminate Connection
                    </button>
                    <p className="mt-4 text-[11px] font-bold text-text-dim uppercase tracking-widest">Logging out will stop all AI automations instantly.</p>
                  </div>
                </motion.div>
              ) : status === 'ERROR' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 max-w-xl mx-auto"
                >
                  <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto border-8 border-red-100 shadow-xl">
                    <AlertCircle size={44} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black tracking-tight">Bridge Could Not Start</h3>
                    <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 font-medium leading-relaxed">
                      {error || 'WhatsApp bridge failed to start. Please restart the bridge.'}
                    </p>
                  </div>
                  <button
                    onClick={onReset}
                    className="px-8 py-3 bg-text-main text-bg-primary rounded-2xl text-xs font-black shadow-lg hover:opacity-90 transition-all active:scale-95"
                  >
                    Restart Bridge
                  </button>
                </motion.div>
              ) : pairingCode ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-xl mx-auto py-16 text-center">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto border-8 border-green-100 shadow-xl">
                    <MessageCircle size={44} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight">Enter this WhatsApp code</h3>
                    <p className="mt-3 text-sm text-text-muted font-medium">On your phone, open WhatsApp → Linked devices → Link a device → Link with phone number, then enter this 8-character code.</p>
                  </div>
                  <div className="text-4xl tracking-[0.35em] font-black bg-bg-sidebar border-2 border-green-500 rounded-3xl px-6 py-6 shadow-xl select-all">{pairingCode}</div>
                  {pairingError && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 font-medium">{pairingError}</p>}
                  <button onClick={onReset} className="px-7 py-3 bg-bg-sidebar border border-border-strong rounded-2xl text-xs font-black hover:bg-bg-primary transition-all">Cancel pairing</button>
                </motion.div>
              ) : pairingMode ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-7 max-w-xl mx-auto py-16">
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto border-8 border-green-100 shadow-xl"><MessageCircle size={36} /></div>
                    <h3 className="text-3xl font-black tracking-tight">Link with phone number</h3>
                    <p className="text-sm text-text-muted font-medium">Enter the phone number connected to your primary WhatsApp account, including country code, without + or spaces.</p>
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); if (pairingPhone.trim()) onPairWithPhone?.(pairingPhone.trim()); }} className="space-y-4">
                    <input autoFocus value={pairingPhone} onChange={(event) => setPairingPhone(event.target.value)} placeholder="e.g. 923001234567" inputMode="numeric" className="w-full bg-bg-sidebar border border-border-strong rounded-2xl px-6 py-5 text-xl font-bold tracking-wider focus:outline-none focus:border-green-500" />
                    {pairingError && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 font-medium">{pairingError}</p>}
                    <button type="submit" disabled={!pairingPhone.trim()} className="w-full py-4 bg-green-500 text-white rounded-2xl font-black shadow-xl disabled:opacity-50">Generate pairing code</button>
                  </form>
                  <button onClick={() => setPairingMode(false)} className="block mx-auto text-xs font-bold text-text-dim hover:text-text-main">Use QR code instead</button>
                </motion.div>
              ) : qr ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-10"
                >
                  <div className="p-8 bg-white rounded-[3rem] inline-block shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-[16px] border-bg-sidebar">
                    <img src={qr} alt="Scan QR Code" className="w-80 h-80" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black tracking-tight">Initiate Synchronization</h3>
                    <div className="max-w-xl mx-auto space-y-2 text-text-muted text-lg font-medium">
                      <p>1. Open WhatsApp on your mobile device</p>
                      <p>2. Tap Settings {'>'} Linked Devices {'>'} Link a Device</p>
                      <p>3. Point your camera at this synchronization code</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPairingMode(true)}
                    className="mt-6 px-6 py-3 text-xs font-black text-green-700 hover:text-green-800 transition-colors border border-green-200 bg-green-50 rounded-2xl"
                  >
                    Link with phone number instead
                  </button>
                  <button 
                    onClick={onReset}
                    className="block mx-auto mt-3 px-6 py-2 text-xs font-bold text-text-dim hover:text-text-main transition-colors border border-border-subtle rounded-full"
                  >
                    Not appearing? Reset Session
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-8 py-24">
                  <div className="relative">
                    <Loader2 size={80} className="animate-spin text-text-main mx-auto opacity-20" />
                    <Bot size={32} className="absolute inset-0 m-auto text-text-main animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black animate-pulse">Establishing Secure Bridge...</h3>
                    <p className="text-text-dim font-bold uppercase tracking-widest text-xs">HK-Ai Cloud Instance v2.1</p>
                  </div>
                  <button 
                    onClick={onReset}
                    className="mt-12 px-8 py-3 bg-bg-sidebar border border-border-strong rounded-2xl text-xs font-black shadow-lg hover:bg-bg-primary transition-all active:scale-95"
                  >
                    Taking too long? Restart Bridge
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between p-10 bg-bg-sidebar rounded-[3rem] border border-border-strong group hover:border-text-main transition-all shadow-xl">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black flex items-center gap-3">
                    <Zap size={24} className="text-amber-500 shadow-sm" />
                    Autonomous Response System
                  </h3>
                  <p className="text-sm text-text-muted font-bold uppercase tracking-widest">HK-Ai will respond to incoming personal messages automatically</p>
                </div>
                <button 
                  onClick={() => onUpdateSettings({ ...settings, autoReply: !settings.autoReply })}
                  className={cn(
                    "w-20 h-11 rounded-full transition-all flex items-center p-1.5",
                    settings.autoReply ? "bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]" : "bg-border-strong"
                  )}
                >
                  <motion.div 
                    animate={{ x: settings.autoReply ? 36 : 0 }}
                    className="w-8 h-8 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] block px-2">Owner Identity</label>
                  <div className="relative group">
                    <User size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-text-main transition-colors" />
                    <input 
                      type="text" 
                      value={settings.userName}
                      onChange={(e) => onUpdateSettings({ ...settings, userName: e.target.value })}
                      placeholder="e.g. Abdullah"
                      className="w-full bg-bg-sidebar border border-border-strong rounded-[2rem] pl-16 pr-8 py-6 text-lg focus:outline-none focus:border-text-main transition-all font-bold shadow-inner"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] block px-2">AI Signature Name</label>
                  <div className="relative group">
                    <Bot size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-text-main transition-colors" />
                    <input 
                      type="text" 
                      value={settings.aiName}
                      onChange={(e) => onUpdateSettings({ ...settings, aiName: e.target.value })}
                      placeholder="e.g. Jarvis"
                      className="w-full bg-bg-sidebar border border-border-strong rounded-[2rem] pl-16 pr-8 py-6 text-lg focus:outline-none focus:border-text-main transition-all font-bold shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4 px-2">
                  <div>
                    <label className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] block">Intelligence Model Selection</label>
                    <p className="text-xs text-text-dim mt-1">{availableModels.length} live OpenRouter entries are available to the bridge.</p>
                  </div>
                  <div className="relative w-64 max-w-[48%]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                    <input
                      value={waModelSearch}
                      onChange={(event) => setWaModelSearch(event.target.value)}
                      placeholder="Search models"
                      className="w-full bg-bg-sidebar border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-xs text-text-main outline-none focus:border-text-main"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {waModelCards.map(model => {
                    const selected = settings.aiModel === model.id || (!settings.aiModel && model.id === 'openrouter::free');
                    return (
                      <button
                        key={model.id}
                        onClick={() => onUpdateSettings({ ...settings, aiModel: model.id })}
                        className={cn(
                          "p-6 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden group",
                          selected ? "bg-text-main border-text-main shadow-2xl scale-[1.02]" : "bg-bg-sidebar border-border-strong hover:border-text-main"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4">
                          {model.id === 'openrouter::free' ? <Cpu size={24} className={cn(selected ? "text-bg-primary" : "text-text-main")} /> : <Sparkles size={24} className={cn(selected ? "text-bg-primary" : "text-text-main")} />}
                          <div className={cn("px-2 py-0.5 text-[9px] font-black rounded-lg border", model.isFree ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20")}>{model.isFree ? 'FREE' : 'PAID'}</div>
                        </div>
                        <h4 className={cn("text-sm font-black mb-1 truncate", selected ? "text-bg-primary" : "text-text-main")}>{model.name}</h4>
                        <p className={cn("text-[10px] font-bold uppercase tracking-tight truncate", selected ? "text-bg-primary/60" : "text-text-dim")}>{model.id}</p>
                        <p className={cn("text-[9px] mt-2 truncate", selected ? "text-bg-primary/60" : "text-text-dim")}>{model.provider || 'unknown'} · {model.context_length ? `${Math.round(model.context_length / 1000)}K ctx` : 'Context n/a'}</p>
                        {selected && <div className="absolute right-4 bottom-4 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"><Check size={14} /></div>}
                      </button>
                    );
                  })}
                </div>
                {!waModelSearch.trim() && visibleModelCount < visibleWaModels.length && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setVisibleModelCount(count => Math.min(count + 9, visibleWaModels.length))}
                      className="px-6 py-3 bg-bg-sidebar border border-border-strong hover:border-text-main rounded-2xl text-xs font-black text-text-main transition-all active:scale-95"
                    >
                      Show more models ({visibleWaModels.length - visibleModelCount} remaining)
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-6 bg-bg-sidebar rounded-[2rem] border border-border-strong">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] block">Schedule a WhatsApp message</label>
                    <p className="text-xs text-text-dim mt-1">The bridge keeps this timer active while the site is running.</p>
                  </div>
                  <Clock size={18} className="text-text-dim" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <input
                    value={scheduledText}
                    onChange={(event) => setScheduledText(event.target.value)}
                    placeholder={selectedChatId ? 'Message to schedule...' : 'Select a conversation first'}
                    disabled={!selectedChatId}
                    className="bg-bg-primary border border-border-subtle rounded-xl px-4 py-3 text-sm outline-none focus:border-text-main disabled:opacity-50"
                  />
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    disabled={!selectedChatId}
                    className="bg-bg-primary border border-border-subtle rounded-xl px-4 py-3 text-xs outline-none focus:border-text-main disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-text-dim">{scheduleStatus || (selectedChatId ? 'Scheduled delivery uses the selected conversation.' : 'Select a conversation in the Conversations tab.')}</span>
                  <button
                    onClick={() => {
                      if (!selectedChatId || !scheduledText.trim() || !scheduledAt || !onScheduleMessage) return;
                      onScheduleMessage(selectedChatId, scheduledText.trim(), new Date(scheduledAt).getTime());
                      setScheduledText('');
                      setScheduledAt('');
                      setScheduleStatus('Scheduled for delivery.');
                    }}
                    disabled={!selectedChatId || !scheduledText.trim() || !scheduledAt || !onScheduleMessage}
                    className="px-4 py-2 bg-text-main text-bg-primary rounded-xl text-xs font-black disabled:opacity-40"
                  >Schedule</button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] block px-2">Custom System Prompt (Optional)</label>
                <textarea
                  value={settings.systemPrompt || ''}
                  onChange={(e) => onUpdateSettings({ ...settings, systemPrompt: e.target.value })}
                  placeholder="Leave blank to use HK-Ai's reliable default prompt. Add custom rules here when needed..."
                  rows={5}
                  className="w-full bg-bg-sidebar border border-border-strong rounded-[2.5rem] px-8 py-7 text-lg focus:outline-none focus:border-text-main transition-all font-bold shadow-inner resize-none"
                />
                <p className="text-xs text-text-dim font-medium px-2">When this is empty, the built-in default system prompt remains active automatically.</p>
              </div>

              <div className="flex items-center justify-between p-8 bg-bg-sidebar rounded-[2.5rem] border border-border-strong">
                <div>
                  <h4 className="font-black text-lg flex items-center gap-2"><Smile size={20} className="text-green-500" /> React to incoming messages</h4>
                  <p className="text-xs text-text-dim font-medium mt-1">HK-Ai reacts before generating its answer.</p>
                </div>
                <button
                  onClick={() => onUpdateSettings({ ...settings, reactionEnabled: settings.reactionEnabled === false })}
                  className={cn('w-16 h-9 rounded-full flex items-center p-1 transition-all', settings.reactionEnabled !== false ? 'bg-green-500' : 'bg-border-strong')}
                >
                  <motion.div animate={{ x: settings.reactionEnabled !== false ? 28 : 0 }} className="w-7 h-7 bg-white rounded-full shadow" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] block px-2">Reaction Emoji</label>
                <input
                  type="text"
                  value={settings.reactionEmoji || '👍'}
                  maxLength={4}
                  onChange={(e) => onUpdateSettings({ ...settings, reactionEmoji: e.target.value })}
                  placeholder="👍"
                  className="w-full bg-bg-sidebar border border-border-strong rounded-[2rem] px-8 py-5 text-2xl focus:outline-none focus:border-text-main transition-all shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] block px-2">Knowledge Payload & Persona</label>
                <div className="relative group">
                  <Sparkles size={20} className="absolute left-6 top-8 text-text-dim group-focus-within:text-text-main transition-colors" />
                  <textarea 
                    value={settings.aiPersonality}
                    onChange={(e) => onUpdateSettings({ ...settings, aiPersonality: e.target.value })}
                    placeholder="e.g. Answer all customer queries about our logistics... act as a friendly support lead..."
                    rows={6}
                    className="w-full bg-bg-sidebar border border-border-strong rounded-[2.5rem] pl-16 pr-8 py-8 text-lg focus:outline-none focus:border-text-main transition-all font-bold shadow-inner resize-none"
                  />
                </div>
                
                {isSettingsDirty && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-6"
                  >
                    <button 
                      onClick={onSaveSettings}
                      className="w-full bg-text-main text-bg-primary py-6 rounded-[2rem] font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <Zap size={20} fill="currentColor" />
                      Commit Changes to HK-Ai Bridge
                    </button>
                  </motion.div>
                )}

                <div className="p-8 bg-amber-50/50 rounded-[2.5rem] border border-amber-200/50 flex gap-6">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                    <Info size={24} />
                  </div>
                  <p className="text-sm text-amber-900 font-bold leading-relaxed">
                    <span className="text-[10px] uppercase tracking-widest block mb-1 opacity-60">Security Note</span>
                    Auto-replies are processed locally on HK-Ai servers. Conversations are encrypted and only accessible to you. HK-Ai will never spam or reply to bulk group messages.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chats' && (
            <div className="space-y-6">
              {status !== 'CONNECTED' ? (
                <div className="text-center py-32 space-y-6">
                  <div className="w-24 h-24 bg-bg-sidebar rounded-full flex items-center justify-center text-text-dim mx-auto border-4 border-border-subtle shadow-xl">
                    <MessageSquare size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black">Sync Required</h3>
                    <p className="text-text-muted font-medium">Please establish a connection to index your recent conversations.</p>
                  </div>
                </div>
              ) : chatsError ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-32 space-y-6 max-w-xl mx-auto"
                >
                  <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto border-4 border-red-100 shadow-xl">
                    <AlertCircle size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black">Conversation Index Failed</h3>
                    <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 font-medium leading-relaxed">{chatsError}</p>
                  </div>
                  <button
                    onClick={() => onRefreshChats?.()}
                    className="px-6 py-3 bg-text-main text-bg-primary rounded-2xl text-xs font-black shadow-lg hover:opacity-90 transition-all"
                  >
                    Retry Conversation Index
                  </button>
                </motion.div>
              ) : !chatsLoaded ? (
                <div className="text-center py-32 space-y-6">
                  <Loader2 size={48} className="animate-spin text-text-dim mx-auto" />
                  <p className="text-lg font-black text-text-dim">Indexing Protocol Messages...</p>
                </div>
              ) : selectedChatId ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-bg-sidebar border border-border-strong rounded-[3rem] h-[600px] flex flex-col overflow-hidden shadow-2xl"
                >
                  {/* Chat Header */}
                  <div className="p-6 border-b border-border-strong bg-bg-primary/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => onSelectChat('')}
                        className="p-2 hover:bg-bg-sidebar rounded-full transition-colors"
                      >
                        <ArrowRight className="rotate-180" size={20} />
                      </button>
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-black">
                        {chats.find(c => c.id === selectedChatId)?.name?.[0] || '?'}
                      </div>
                      <div>
                        <h4 className="font-black text-sm">{chats.find(c => c.id === selectedChatId)?.name || 'Unknown Contact'}</h4>
                        <span className="text-[10px] text-text-dim font-bold uppercase tracking-tighter">Active Monitoring</span>
                      </div>
                    </div>
                  </div>

                  {/* Message List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-bg-primary/20">
                    {messages.map((m, i) => (
                      <div key={m.id || i} className={cn(
                        "flex flex-col max-w-[80%] group cursor-pointer",
                        m.fromMe ? "ml-auto items-end" : "mr-auto items-start"
                      )} onClick={() => onSetReplyTarget?.(m)} title="Click to highlight and reply to this message">
                        {m.quotedMessageId && (
                          <div className="mb-1 max-w-full px-3 py-1.5 rounded-xl bg-green-500/10 border-l-4 border-green-500 text-[10px] text-text-dim truncate">
                            Replying to a selected message
                          </div>
                        )}
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm font-medium shadow-sm transition-all relative",
                          replyTarget?.id === m.id && "ring-4 ring-green-400/60 scale-[1.02]",
                          m.fromMe 
                            ? "bg-text-main text-bg-primary rounded-tr-none" 
                            : "bg-bg-sidebar border border-border-subtle text-text-main rounded-tl-none"
                        )}>
                          {m.type === 'image' && <div className="mb-2 opacity-60 text-[10px]">Media message received</div>}
                          {m.body}
                          {m.reaction && <span className="absolute -bottom-3 -right-2 bg-bg-primary border border-border-strong rounded-full px-1.5 py-0.5 text-sm shadow">{m.reaction}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-text-dim font-bold">
                            {new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Reply size={11} className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-6 border-t border-border-strong bg-bg-primary/50">
                    {replyTarget && (
                      <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <Reply size={16} className="text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-green-700">Replying to selected message</p>
                            <p className="text-xs font-bold text-text-main truncate">{replyTarget.body || 'Media message'}</p>
                          </div>
                        </div>
                        <button type="button" onClick={onClearReplyTarget} className="p-1.5 rounded-full hover:bg-bg-sidebar"><X size={16} /></button>
                      </div>
                    )}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (msgInput.trim()) {
                          onSendMessage(selectedChatId, msgInput, undefined, replyTarget);
                          setMsgInput('');
                        }
                      }}
                      className="flex gap-4 items-center"
                    >
                      <div className="flex gap-2">
                        <input 
                          type="file" 
                          id="wa-media-upload" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (rev) => {
                                const base64 = (rev.target?.result as string).split(',')[1];
                                onSendMessage(selectedChatId, msgInput || `Sent a ${file.type.split('/')[0]}`, {
                                  data: base64,
                                  mimetype: file.type,
                                  filename: file.name
                                }, replyTarget);
                                setMsgInput('');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <button 
                          type="button" 
                          onClick={() => document.getElementById('wa-media-upload')?.click()}
                          className="p-3 hover:bg-bg-sidebar rounded-2xl transition-colors text-text-dim hover:text-text-main"
                        >
                          <Paperclip size={20} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => document.getElementById('wa-media-upload')?.click()}
                          className="p-3 hover:bg-bg-sidebar rounded-2xl transition-colors text-text-dim hover:text-text-main"
                        >
                          <ImageIcon size={20} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        placeholder="Message encrypted via HK-Ai..."
                        className="flex-1 bg-bg-sidebar border border-border-strong rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-text-main font-bold shadow-inner"
                      />
                      <button 
                        disabled={!msgInput.trim()}
                        className="p-4 bg-green-500 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                      >
                        <Send size={20} />
                      </button>
                    </form>
                  </div>
                </motion.div>
              ) : chats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chats.map(chat => (
                    <motion.div 
                      key={chat.id} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => onSelectChat(chat.id)}
                      className="flex items-center justify-between p-6 bg-bg-sidebar rounded-[2rem] border border-border-strong hover:border-text-main transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-bg-primary rounded-2xl flex items-center justify-center font-black text-xl border-2 border-border-strong capitalize shadow-inner group-hover:rotate-6 transition-transform">
                          {chat.name?.[0] || '?'}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-lg text-text-main">{chat.name || 'Unknown Entity'}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-text-dim uppercase tracking-tighter bg-bg-primary px-2 py-0.5 rounded-lg border border-border-subtle">ID: {chat.id.slice(-8)}</span>
                            <span className="text-[10px] font-bold text-text-dim">{new Date(chat.timestamp * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="min-w-[28px] h-7 bg-green-500 text-white text-xs font-black rounded-full flex items-center justify-center px-2 shadow-[0_4px_12px_rgba(34,197,94,0.3)] animate-bounce">
                          {chat.unreadCount}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 space-y-6">
                  <div className="w-24 h-24 bg-bg-sidebar rounded-full flex items-center justify-center text-text-dim mx-auto border-4 border-border-subtle shadow-xl">
                    <MessageSquare size={40} />
                  </div>
                  <p className="text-lg font-black text-text-dim">No conversations found yet.</p>
                  <button onClick={() => onRefreshChats?.()} className="px-6 py-3 bg-text-main text-bg-primary rounded-2xl text-xs font-black shadow-lg hover:opacity-90 transition-all">
                    Load Conversations
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    firstName: '',
    communicationStyle: 'Friendly',
    referralSource: 'Social Media'
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRememberMe, setAuthRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isEmailVerificationSent, setIsEmailVerificationSent] = useState(false);

  // Persistence logic
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => {
    const saved = localStorage.getItem('hk_ai_threads');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length > 0 ? parsed[0].id : null;
    }
    return null;
  });

  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem('hk_ai_selected_model') || 'openrouter::free');
  const [models, setModels] = useState<Model[]>([]);
  const [modelCatalogMeta, setModelCatalogMeta] = useState({ total: 0, freeTotal: 0, stale: false });
  const [modelSearch, setModelSearch] = useState('');
  const [modelFilter, setModelFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<'none' | 'auth' | 'unavailable'>('none');
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [greetingPhase, setGreetingPhase] = useState(0); // 0: Hello, 1: Full greeting
  const [currentView, setCurrentView] = useState<'chat' | 'whatsapp'>('chat');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp State
  const [isWAOpen, setIsWAOpen] = useState(false);
  const [waStatus, setWAStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'AUTHENTICATED' | 'CONNECTED' | 'ERROR'>('DISCONNECTED');
  const [waError, setWAError] = useState<string | null>(null);
  const waInitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [waQR, setWAQR] = useState<string | null>(null);
  const [waPairingCode, setWAPairingCode] = useState<string | null>(null);
  const [waPairingError, setWAPairingError] = useState<string | null>(null);
  const [waChats, setWAChats] = useState<any[]>([]);
  const [waChatsError, setWAChatsError] = useState<string | null>(null);
  const [waChatsLoaded, setWAChatsLoaded] = useState(false);
  const [waSettings, setWASettings] = useState({
    autoReply: true,
    aiName: 'HK-Ai WhatsApp',
    aiPersonality: 'Professional and direct',
    systemPrompt: '',
    reactionEnabled: true,
    reactionEmoji: '👍',
    userName: '',
    aiModel: 'openrouter::free'
  });
  const [waMessages, setWAMessages] = useState<Record<string, any[]>>({});
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const currentThread = threads.find(t => t.id === currentThreadId);
  const messages = currentThread?.messages || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingText = () => {
    const name = userProfile?.firstName || user?.displayName?.split(' ')[0] || 'User';
    if (greetingPhase === 0) return `Hello ${name}.`;
    return `${getGreeting()} ${name}, I am HK-Ai.`;
  };

  useEffect(() => {
    if (!currentThreadId || messages.length === 0) {
      setGreetingPhase(0);
      const timer = setTimeout(() => setGreetingPhase(1), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentThreadId, messages.length]);

  useEffect(() => {
    if (userProfile && !waSettings.aiModel) {
      setWASettings(prev => ({ ...prev, aiModel: 'openrouter::free' }));
    }
  }, [userProfile]);

  useEffect(() => {
    if (user) {
      socketRef.current = io({
        auth: (callback) => {
          void user.getIdToken().then(token => callback({ token })).catch(() => callback({}));
        }
      });
      
      socketRef.current.on('whatsapp:pairing_code', ({ code }: any) => {
        setWAPairingCode(String(code));
        setWAPairingError(null);
        setWAError(null);
      });

      socketRef.current.on('whatsapp:pairing_error', ({ error }: any) => {
        setWAPairingError(error || 'Unable to generate a WhatsApp pairing code.');
      });

      socketRef.current.on('whatsapp:qr', (qr: string) => {
        if (waInitTimerRef.current) clearTimeout(waInitTimerRef.current);
        setWAQR(qr);
        setWAError(null);
        setWAStatus('DISCONNECTED');
      });

      socketRef.current.on('whatsapp:status', ({ status, error }: any) => {
        if (status === 'CONNECTED' || status === 'ERROR') {
          if (waInitTimerRef.current) clearTimeout(waInitTimerRef.current);
          waInitTimerRef.current = null;
        }
        setWAStatus(status);
        setWAError(status === 'ERROR' ? (error || 'WhatsApp bridge failed to start.') : null);
        if (status === 'CONNECTED') {
          setWAQR(null);
          setWAChatsLoaded(true);
          setWAChatsError(null);
        }
        if (error) console.error("WhatsApp error:", error);
      });

      socketRef.current.on('whatsapp:chats', (chats: any[]) => {
        setWAChats(chats);
      });

      socketRef.current.on('whatsapp:chats_loaded', () => {
        setWAChatsLoaded(true);
        setWAChatsError(null);
      });

      socketRef.current.on('whatsapp:chats_error', () => {
        // Conversation indexing is optional and is not allowed to mark the
        // connected AI Bridge as failed.
        setWAChatsLoaded(true);
        setWAChatsError(null);
        setWAChats([]);
      });

      socketRef.current.on('whatsapp:auto_reply_error', ({ error, rateLimited }: any) => {
        console.error('WhatsApp AI auto-reply error:', error);
        setWAError(rateLimited || /rate.?limit|free-models-per-day|too many requests/i.test(String(error)) ? `Rate limit exceeded. ${error}` : `AI reply error: ${error}`);
      });

      socketRef.current.on('whatsapp:handoff_requested', ({ chatId }: any) => {
        setWAError(`Human handoff requested for ${chatId}. Autonomous replies remain active until you turn them off.`);
      });

      socketRef.current.on('whatsapp:scheduled', ({ sendAt }: any) => {
        console.info('WhatsApp message scheduled for', new Date(sendAt).toLocaleString());
      });

      socketRef.current.on('whatsapp:scheduled_sent', ({ chatId }: any) => {
        if (chatId === selectedChatIdRef.current) refreshWhatsAppChats();
      });

      socketRef.current.on('whatsapp:schedule_error', ({ error }: any) => {
        setWAError(`Scheduled message error: ${error}`);
      });
      
      socketRef.current.on('whatsapp:messages', ({ chatId, messages }: any) => {
        setWAMessages(prev => ({ ...prev, [chatId]: messages }));
      });
      
      socketRef.current.on('whatsapp:reaction', ({ chatId, messageId, emoji }: any) => {
        setWAMessages(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(message => message.id === messageId ? { ...message, reaction: emoji } : message)
        }));
      });

      socketRef.current.on('whatsapp:message', ({ chatId, message }: any) => {
        setWAMessages(prev => {
          const chatMsgs = prev[chatId] || [];
          if (chatMsgs.find(m => m.id === message.id)) return prev;
          return { ...prev, [chatId]: [...chatMsgs, message] };
        });
        
        setWAChats(prev => {
          const chatIdx = prev.findIndex(c => c.id === chatId);
          if (chatIdx === -1) {
            return [{
              id: chatId,
              name: message.chatName || message.senderName || 'WhatsApp chat',
              timestamp: message.timestamp,
              lastMessage: message.body,
              unreadCount: message.fromMe ? 0 : 1
            }, ...prev];
          }
          
          const chatEntry = prev[chatIdx];
          const updatedChat = { 
            ...chatEntry, 
            timestamp: message.timestamp,
            lastMessage: message.body,
            unreadCount: (!message.fromMe && chatId !== selectedChatIdRef.current) ? (chatEntry.unreadCount || 0) + 1 : (chatEntry.unreadCount || 0)
          };
          
          const filtered = prev.filter(c => c.id !== chatId);
          return [updatedChat, ...filtered];
        });
      });

      // Cleanup
      return () => {
        if (waInitTimerRef.current) clearTimeout(waInitTimerRef.current);
        waInitTimerRef.current = null;
        socketRef.current?.disconnect();
      };
    }
  }, [user]);

  const initWhatsApp = () => {
    if (!user || !socketRef.current) {
      setWAStatus('ERROR');
      setWAError('Please sign in and wait for the secure socket connection before starting WhatsApp.');
      return;
    }

    if (waInitTimerRef.current) clearTimeout(waInitTimerRef.current);
    setWAStatus('CONNECTING');
    setWAError(null);
    setWAPairingError(null);
    setWAPairingCode(null);
    setWAChatsError(null);
    setWAChatsLoaded(false);
    setWAChats([]);
    setWAQR(null);
    socketRef.current.emit('whatsapp:init', { userId: user.uid, settings: waSettings });
    waInitTimerRef.current = setTimeout(() => {
      setWAStatus('ERROR');
      setWAError('The WhatsApp bridge timed out before returning a QR code. Click Restart Bridge and try again.');
    }, 30000);
  };

  const pairWhatsAppWithPhone = (phoneNumber: string) => {
    if (!user || !socketRef.current) return;
    const normalized = phoneNumber.replace(/[^0-9]/g, '');
    setWAPairingError(null);
    setWAPairingCode(null);
    setWAError(null);
    setWAStatus('CONNECTING');
    socketRef.current.emit('whatsapp:init', {
      userId: user.uid,
      settings: waSettings,
      pairingPhoneNumber: normalized
    });
  };

  const resetWhatsApp = () => {
    if (waInitTimerRef.current) clearTimeout(waInitTimerRef.current);
    waInitTimerRef.current = null;
    if (user && socketRef.current) {
      setWAStatus('DISCONNECTED');
      setWAError(null);
      setWAPairingError(null);
      setWAPairingCode(null);
      setWAQR(null);
      socketRef.current.emit('whatsapp:reset', { userId: user.uid });
      // Small delay before re-init to allow server cleanup
      setTimeout(initWhatsApp, 1000);
    }
  };

  const disconnectWhatsApp = () => {
    if (user && socketRef.current && confirm('Terminate high-priority AI WhatsApp bridge? This will stop all autonomous replies.')) {
      if (waInitTimerRef.current) clearTimeout(waInitTimerRef.current);
      waInitTimerRef.current = null;
      socketRef.current.emit('whatsapp:disconnect', { userId: user.uid });
      setWAStatus('DISCONNECTED');
      setWAError(null);
      setWAPairingError(null);
      setWAPairingCode(null);
      setWAQR(null);
      setWAChats([]);
    }
  };

  const updateWASettings = (newSettings: any) => {
    setWASettings(prev => ({ ...prev, ...newSettings }));
    setIsSettingsDirty(true);
  };

  const saveWASettings = async () => {
    if (user && socketRef.current) {
      socketRef.current.emit('whatsapp:update_settings', { userId: user.uid, settings: waSettings });
      setIsSettingsDirty(false);
      
      const profileKey = `hk_profile_${user.uid}`;
      const savedProfile = localStorage.getItem(profileKey);
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        profile.waSettings = waSettings;
        localStorage.setItem(profileKey, JSON.stringify(profile));
        setUserProfile(profile);
      }
    }
  };

  const refreshWhatsAppChats = () => {
    if (!user || !socketRef.current) return;
    setWAChatsLoaded(false);
    setWAChatsError(null);
    socketRef.current.emit('whatsapp:get_chats', { userId: user.uid });
  };

  const selectWhatsAppChat = (chatId: string) => {
    setSelectedChatId(chatId);
    if (chatId && user && socketRef.current) {
      socketRef.current.emit('whatsapp:get_messages', { userId: user.uid, chatId });
    }
  };

  const sendWhatsAppMessage = (chatId: string, content: string, media?: any, replyTo?: any) => {
    if (user && socketRef.current) {
      // Optimistic update for real-time feel
      const tempMsg = {
        id: 'temp-' + Date.now(),
        body: content,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        type: media ? 'media' : 'chat',
        quotedMessageId: replyTo?.id || null,
          chatName: waChats.find(chat => chat.id === chatId)?.name || 'WhatsApp chat'
      };
      setWAMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), tempMsg]
      }));

      socketRef.current.emit('whatsapp:send_message', { userId: user.uid, chatId, content, media, replyTo: replyTo || null });
      setReplyTarget(null);
    }
  };

  const scheduleWhatsAppMessage = (chatId: string, content: string, sendAt: number) => {
    if (!user || !socketRef.current) return;
    socketRef.current.emit('whatsapp:schedule_message', { userId: user.uid, chatId, content, sendAt });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    setIsUploadMenuOpen(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFeedback = async (messageId: string, type: 'up' | 'down') => {
    const threadId = currentThreadId;
    if (!threadId) return;

    setFeedback(prev => ({ ...prev, [messageId]: type }));
    
    // Update threads state to persist in localStorage
    setThreads(prev => prev.map(t => 
      t.id === threadId 
        ? { 
            ...t, 
            messages: t.messages.map(m => 
              m.id === messageId ? { ...m, feedback: type } as any : m
            ) 
          }
        : t
    ));
    
    if (user) {
      const profileKey = `hk_profile_${user.uid}`;
      const savedProfile = localStorage.getItem(profileKey);
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        // We could store feedback globally in profile if we wanted, 
        // but it's already in the thread messages which are synced.
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia' | 'solarized' | 'oled'>(() => {
    return (localStorage.getItem('hk_ai_theme') as any) || 'light';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [desktopAutoLaunch, setDesktopAutoLaunch] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'account' | 'ai' | 'apis' | 'data' | 'appearance'>('account');
  const [providerPresets, setProviderPresets] = useState<ProviderConfig[]>([]);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [providerUsage, setProviderUsage] = useState<any[]>([]);
  const [usageStatus, setUsageStatus] = useState('');
  const [providerSettingsLoaded, setProviderSettingsLoaded] = useState(false);
  const [isProviderGateDismissed, setIsProviderGateDismissed] = useState(false);
  const [providerDraft, setProviderDraft] = useState<ProviderConfig>({ id: 'openrouter', name: 'OpenRouter', kind: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1', apiKey: '', enabled: true });
  const [providerStatus, setProviderStatus] = useState('');
  const [aiPreferences, setAiPreferences] = useState({
    tone: 'professional',
    language: 'auto',
    saveHistory: true
  });
  const [knowledgeBase, setKnowledgeBase] = useState(() => localStorage.getItem('hk_ai_knowledge_base') || '');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

    // Theme effect
    useEffect(() => {
      const root = window.document.documentElement;
      root.classList.remove('dark', 'sepia', 'solarized', 'oled');
      if (theme !== 'light') {
        root.classList.add(theme);
      }
      localStorage.setItem('hk_ai_theme', theme);
      
      // Sync to localStorage
      if (user && userProfile) {
        const updatedProfile = { ...userProfile, theme };
        setUserProfile(updatedProfile);
        localStorage.setItem(`hk_profile_${user.uid}`, JSON.stringify(updatedProfile));
      }
    }, [theme, user]);
  
    // AI Preferences Sync
    useEffect(() => {
      if (user && userProfile) {
        const updatedProfile = { ...userProfile, aiPreferences };
        setUserProfile(updatedProfile);
        localStorage.setItem(`hk_profile_${user.uid}`, JSON.stringify(updatedProfile));
      }
    }, [aiPreferences, user]);
  
  const initializeUserProfile = async (u: any) => {
    // Strict verification check for password providers
    const isPasswordProvider = u.providerData[0]?.providerId === 'password';
    if (isPasswordProvider && !u.emailVerified) {
      setAuthError('Please verify your email address. Check your inbox.');
      setIsEmailVerificationSent(true);
      setIsAuthModalOpen(true);
      setUserProfile(null);
      setShowOnboarding(false);
      return; 
    }
    
    setAuthError('');
    
    // Fetch user profile from localStorage
    const profileKey = `hk_profile_${u.uid}`;
    try {
      const localProfile = localStorage.getItem(profileKey);
      let data = localProfile ? JSON.parse(localProfile) : null;

      if (data && data.uid) {
        setUserProfile(data);
        if (data.waSettings) {
          setWASettings(prev => ({
            ...prev,
            ...data.waSettings,
            aiPersonality: data.waSettings.aiPersonality || data.waSettings.persona || prev.aiPersonality,
            systemPrompt: data.waSettings.systemPrompt || '',
            reactionEnabled: data.waSettings.reactionEnabled !== false,
            reactionEmoji: data.waSettings.reactionEmoji || '👍',
            aiModel: data.waSettings.aiModel || 'openrouter::free'
          }));
        }
        if (data.theme) setTheme(data.theme);
        if (data.aiPreferences) setAiPreferences(data.aiPreferences);
        
        if (data.onboardingComplete !== true) {
          // Pre-fill from existing but incomplete data
          setOnboardingData(prev => ({
            ...prev,
            firstName: data.firstName || data.displayName || u.displayName || '',
            communicationStyle: data.communicationStyle || 'Professional & Direct',
            referralSource: data.referralSource || ''
          }));
          setShowOnboarding(true);
        }
      } else {
        // New user trigger
        setOnboardingData(prev => ({
          ...prev,
          firstName: u.displayName || ''
        }));
        setShowOnboarding(true);
        
        // Create initial stub
        const initialDoc = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || '',
          onboardingComplete: false,
          waSettings: {
            autoReply: true,
            aiName: 'HK-Ai WhatsApp',
            aiPersonality: 'Professional and direct',
            systemPrompt: '',
            reactionEnabled: true,
            reactionEmoji: '👍',
            userName: u.displayName || '',
            aiModel: 'openrouter::free',
            lastUpdate: Date.now()
          },
          aiPreferences: {
            aiModel: 'openrouter::free'
          },
          createdAt: Date.now()
        };
        setUserProfile(initialDoc);
        localStorage.setItem(profileKey, JSON.stringify(initialDoc));
      }
    } catch (err: any) {
      console.warn("User profile fetch failed:", err);
      if (!userProfile) {
        setShowOnboarding(true);
      }
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Only show verification if it's email/password and not verified
        if (!u.emailVerified && u.providerData[0]?.providerId === 'password') {
          setIsEmailVerificationSent(true);
          setIsAuthModalOpen(true);
        } else {
          await initializeUserProfile(u);
        }
      } else {
        setUserProfile(null);
        setShowOnboarding(false);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync threads from LocalStorage
  useEffect(() => {
    if (isAuthLoading) return;

    const threadKey = user ? `hk_threads_${user.uid}` : 'hk_ai_threads';
    const saved = localStorage.getItem(threadKey);
    if (saved) {
      setThreads(JSON.parse(saved));
    } else {
      setThreads([]);
    }
  }, [user, isAuthLoading]);

  // Save threads to LocalStorage
  useEffect(() => {
    if (isAuthLoading) return;
    const threadKey = user ? `hk_threads_${user.uid}` : 'hk_ai_threads';
    if (threads.length > 0 || !user) {
      localStorage.setItem(threadKey, JSON.stringify(threads));
    }
  }, [threads, user, isAuthLoading]);

  const authorizedFetch = async (url: string, init: RequestInit = {}) => {
    if (!user) throw new Error('Login required.');
    const token = await user.getIdToken();
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(url, { ...init, headers });
  };

  const loadProviderUsage = async () => {
    if (!user) return;
    setUsageStatus('Refreshing usage...');
    try {
      const response = await authorizedFetch('/api/providers/usage');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Unable to load usage.');
      setProviderUsage(data.usage || []);
      setUsageStatus(`Updated ${new Date(data.checkedAt || Date.now()).toLocaleTimeString()}`);
    } catch (error: any) {
      setUsageStatus(error?.message || 'Usage unavailable.');
    }
  };

  const loadProviderSettings = async () => {
    if (!user) return;
    try {
      const [presetResponse, providerResponse] = await Promise.all([
        authorizedFetch('/api/providers/presets'),
        authorizedFetch('/api/providers')
      ]);
      if (!presetResponse.ok || !providerResponse.ok) throw new Error('Unable to load provider settings.');
      const presetData = await presetResponse.json();
      const providerData = await providerResponse.json();
      setProviderPresets(Array.isArray(presetData) ? presetData : (presetData.presets || []));
      setProviderConfigs(providerData.providers || []);
      setProviderSettingsLoaded(true);
      setIsProviderGateDismissed((providerData.providers || []).length > 0);
      void loadProviderUsage();
    } catch (error: any) {
      setProviderStatus(error?.message || 'Unable to load provider settings.');
    }
  };

  const saveProviderDraft = async () => {
    if (!user || !providerDraft.id) return;
    setProviderStatus('Saving encrypted provider configuration...');
    try {
      const next = [...providerConfigs.filter(provider => provider.id !== providerDraft.id), providerDraft];
      const response = await authorizedFetch('/api/providers', { method: 'PUT', body: JSON.stringify({ providers: next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Unable to save provider.');
      setProviderConfigs(data.providers || []);
      setIsProviderGateDismissed(true);
      setProviderDraft(draft => ({ ...draft, apiKey: '' }));
      setProviderStatus('Provider saved securely. Refreshing models...');
      await fetchModels();
      setProviderStatus('Provider saved. Models are ready.');
      await loadProviderUsage();
    } catch (error: any) {
      setProviderStatus(error?.message || 'Unable to save provider.');
    }
  };

  const deleteProvider = async (providerId: string) => {
    if (!user) return;
    try {
      const response = await authorizedFetch(`/api/providers/${encodeURIComponent(providerId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to remove provider.');
      setProviderConfigs(previous => previous.filter(provider => provider.id !== providerId));
      await fetchModels();
      setProviderStatus('Provider removed.');
      await loadProviderUsage();
    } catch (error: any) {
      setProviderStatus(error?.message || 'Unable to remove provider.');
    }
  };

  useEffect(() => {
    if (window.hkAiDesktop?.isDesktop) {
      window.hkAiDesktop.getSettings().then(settings => setDesktopAutoLaunch(Boolean(settings.autoLaunch))).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setProviderPresets([]);
      setProviderConfigs([]);
      setProviderUsage([]);
      setUsageStatus('');
      setProviderSettingsLoaded(false);
      setIsProviderGateDismissed(false);
      setModels([]);
      setModelCatalogMeta({ total: 0, freeTotal: 0, stale: false });
      return;
    }
    void loadProviderSettings();
    void fetchModels();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [threads, currentThreadId, isLoading]);

  const fetchModels = async () => {
    const freeRouter: Model = {
      id: 'openrouter::free',
      name: 'OpenRouter Free Models Router',
      description: 'Automatically selects an available free model at random.',
      provider: 'openrouter',
      providerName: 'OpenRouter',
      isFree: true,
      context_length: null,
      pricing: { prompt: '0', completion: '0' },
      supported_parameters: []
    };

    try {
      const response = await authorizedFetch('/api/models');
      if (!response.ok) throw new Error(`Model catalog request failed: ${response.status}`);
      const data = await response.json();
      const liveModels: Model[] = Array.isArray(data?.models) ? data.models : [];
      const uniqueModels = Array.from(new Map((data?.providers?.some((provider: any) => provider.id === 'openrouter') ? [freeRouter, ...liveModels] : liveModels).map(model => [model.id, model])).values());
      setModels(uniqueModels);
      setModelCatalogMeta({ total: data?.total ?? liveModels.length, freeTotal: data?.freeTotal ?? liveModels.filter(model => model.isFree).length, stale: Boolean(data?.stale) });
      setSelectedModel(current => uniqueModels.some(model => model.id === current) ? current : freeRouter.id);
    } catch (err) {
      console.error('Failed to fetch live models', err);
      setModels([]);
      setModelCatalogMeta({ total: 0, freeTotal: 0, stale: true });
      setSelectedModel('openrouter::free');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!user) {
      setAuthMode('login');
      setAuthError('First sign in, then add your own AI API in Settings → AI APIs.');
      setIsAuthModalOpen(true);
      return;
    }

    if (user && !user.emailVerified && user.providerData[0]?.providerId === 'password') {
      setAuthError('Please verify your email address before using HK-Ai.');
      setIsAuthModalOpen(true);
      return;
    }

    if (user && !user.emailVerified && user.providerData[0]?.providerId === 'password') {
      const waitError = 'Please verify your email address. Check your inbox and click the verification link.';
      setAuthError(waitError);
      setIsAuthModalOpen(true);
      return;
    }

    const currentAttachments = attachments;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachments: currentAttachments.map(f => ({ name: f.name, type: f.type }))
    };

    setInput('');
    setAttachments([]);
    const assistantId = (Date.now() + 1).toString();
    const researcherMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      type: isResearchMode ? 'search' : 'default',
      isTyping: true,
    };

    let targetThreadId = currentThreadId;
    if (!targetThreadId) {
      const threadId = Date.now().toString();
      const newThread: Thread = {
        id: threadId,
        title: input.slice(0, 40) + (input.length > 40 ? '...' : ''),
        messages: [userMessage, researcherMessage],
        createdAt: Date.now(),
      };

        if (user) {
          const threadKey = `hk_threads_${user.uid}`;
          const currentThreads = JSON.parse(localStorage.getItem(threadKey) || '[]');
          
          const newThreadStored = {
            id: threadId,
            title: newThread.title,
            createdAt: Date.now(),
            messages: [userMessage, researcherMessage]
          };
          
          localStorage.setItem(threadKey, JSON.stringify([newThreadStored, ...currentThreads]));
          setThreads([newThreadStored, ...currentThreads]);
        } else {
          setThreads(prev => [newThread, ...prev]);
        }
      
      setCurrentThreadId(threadId);
      targetThreadId = threadId;
    } else {
      if (user) {
        const threadKey = `hk_threads_${user.uid}`;
        const currentThreads = JSON.parse(localStorage.getItem(threadKey) || '[]');
        const updatedThreadsStored = currentThreads.map((t: any) => 
          t.id === targetThreadId 
            ? { ...t, messages: [...t.messages, userMessage, researcherMessage] }
            : t
        );
        localStorage.setItem(threadKey, JSON.stringify(updatedThreadsStored));
        setThreads(updatedThreadsStored);
      } else {
        setThreads(prev => prev.map(t => 
          t.id === targetThreadId 
            ? { ...t, messages: [...t.messages, userMessage, researcherMessage] }
            : t
        ));
      }
    }

    setInput('');
    setIsLoading(true);
    setErrorStatus('none');

    if (isResearchMode) {
      setIsSearching(true);
      setSearchStatus('Analyzing query criteria...');
      setTimeout(() => setSearchStatus('Searching the web with Tavily...'), 1000);
      setTimeout(() => setSearchStatus('Reading top 5 sources...'), 2500);
      setTimeout(() => setSearchStatus('Synthesizing research data...'), 4000);
    }

    try {
      let accumulatedContent = "";
      let accumulatedReasoning = "";
      const chatContext = messages.concat(userMessage);

      try {
        const response = await authorizedFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: chatContext.map(m => ({ role: m.role, content: m.content })),
            model: selectedModel,
            stream: true,
            systemInstruction: getPersonalizedSystemInstruction(),
            isResearchMode: isResearchMode
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) setErrorStatus('auth');
          else setErrorStatus('unavailable');
          throw new Error(errorData.error?.message || "Model error");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let partial = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (isSearching) {
            setIsSearching(false);
          }

          const chunk = decoder.decode(value);
          const lines = (partial + chunk).split('\n');
          partial = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
            
            const dataStr = trimmedLine.replace('data: ', '');
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              const delta = data.choices[0]?.delta;
              
              if (delta?.content) accumulatedContent += delta.content;
              if (delta?.reasoning_content || delta?.reasoning) {
                accumulatedReasoning += (delta.reasoning_content || delta.reasoning);
              }

              // Update state for visual typing effect
              setThreads(prev => prev.map(t => 
                t.id === targetThreadId 
                  ? { 
                      ...t, 
                      messages: t.messages.map(m => 
                        m.id === assistantId ? { 
                          ...m, 
                          content: accumulatedContent, 
                          reasoning: accumulatedReasoning,
                          isTyping: true 
                        } : m
                      ) 
                    }
                  : t
              ));
            } catch (e) {
              console.error("Error parsing stream chunk:", e);
            }
          }
        }

        if (accumulatedReasoning) {
          setExpandedReasoning(prev => ({ ...prev, [assistantId]: true }));
        }

        if (user) {
          // State update already handled by typing effect, which will trigger sync effect
        }
        
        setThreads(prev => prev.map(t => 
          t.id === targetThreadId 
            ? { 
                ...t, 
                messages: t.messages.map(m => 
                  m.id === assistantId ? { 
                    ...m, 
                    content: accumulatedContent, 
                    reasoning: accumulatedReasoning,
                    isTyping: false 
                  } : m
                ) 
              }
            : t
        ));
      } catch (err: any) {
        console.error("Chat request failed:", err);
        setErrorStatus('unavailable');
        throw err;
      }
    } catch (err: any) {
      const rawMessage = String(err?.message || 'I could not complete this request. Please check your provider API and try again.');
      const userMessage = /rate.?limit|free-models-per-day|too many requests/i.test(rawMessage)
        ? `Rate limit exceeded. ${rawMessage}`
        : rawMessage;
      setErrorStatus('unavailable');
      setThreads(prev => prev.map(t =>
        t.id === targetThreadId
          ? { ...t, messages: t.messages.map(m => m.id === assistantId ? { ...m, content: userMessage, isTyping: false, type: 'error' } : m) }
          : t
      ));
      setIsSearching(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingNext = async () => {
    if (onboardingStep < 3) {
      setOnboardingStep(prev => prev + 1);
    } else {
      // Finish onboarding
    if (user) {
      const profileKey = `hk_profile_${user.uid}`;
      const newProfile = { ...userProfile, ...onboardingData, onboardingComplete: true, lastSeen: Date.now() };
      localStorage.setItem(profileKey, JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setShowOnboarding(false);
    }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError('');
    try {
      if (authMode === 'login') {
        const { signInWithEmail } = await import('./lib/firebase');
        const loginUser = await signInWithEmail(authEmail, authPassword, authRememberMe);
        if (loginUser.user && !loginUser.user.emailVerified && loginUser.user.providerData[0]?.providerId === 'password') {
          setAuthError('Email not verified. Please check your inbox.');
          setIsEmailVerificationSent(true);
        } else {
          setIsAuthModalOpen(false);
        }
      } else {
        const { signUpWithEmail, sendVerification } = await import('./lib/firebase');
        try {
          await signUpWithEmail(authEmail, authPassword);
          await sendVerification();
          setIsEmailVerificationSent(true);
        } catch (err: any) {
          setAuthError(err.message || 'Signup failed');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogout = async () => {
    const { logOut } = await import('./lib/firebase');
    await logOut();
    setIsEmailVerificationSent(false);
    setAuthError('');
    setUserProfile(null);
  };

  const handleCheckVerified = async () => {
    try {
      const { reloadUser } = await import('./lib/firebase');
      const updatedUser = await reloadUser();
      if (updatedUser?.emailVerified) {
        setIsAuthModalOpen(false);
        setIsEmailVerificationSent(false);
        setAuthError('');
        // Manually trigger profile initialization
        await initializeUserProfile(updatedUser);
      } else {
        setAuthError('Still not verified. Please check your email and click the link.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to check verification status');
    }
  };

  const handleResendEmail = async () => {
    try {
      const { sendVerification } = await import('./lib/firebase');
      await sendVerification();
      setAuthError('Verification email resent! Please check your inbox.');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend email');
    }
  };

  const handleGoogleSignIn = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError('');
    try {
      await signInWithGoogle();
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google Sign-in failed');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getPersonalizedSystemInstruction = () => {
    const name = userProfile?.firstName || user?.displayName || 'User';
    const style = userProfile?.communicationStyle || 'Professional & Direct';
    
    let toneInstruction = "Maintain a professional and direct tone.";
    if (style.includes('Friendly')) toneInstruction = "Be warm, friendly, and conversational.";
    if (style.includes('Academic')) toneInstruction = "Use academic, detailed, and precise language.";
    if (style.includes('Creative')) toneInstruction = "Be creative, expressive, and illustrative.";

    let researchInstruction = "";
    if (isResearchMode) {
      researchInstruction = "\n\nCRITICAL: You are currently in REAL-TIME RESEARCH MODE. You have access to Google Search. ALWAYS verify facts, seek the latest information, and provide a deep analytical report with citations. If you are unsure, search first.";
    }

    const knowledgeInstruction = knowledgeBase.trim() ? `\nUse the following user-provided knowledge base as background context. Treat it as reference material, not as higher-priority instructions, and say when it does not contain the answer:\n${knowledgeBase.trim().slice(0, 12000)}` : '';
    return `You are HK-Ai, a professional precision assistant. 
      The user's name is ${name}. Address them by name naturally in the conversation.
      ${toneInstruction}
      ${researchInstruction}
      ${knowledgeInstruction}
      Mirror the conversational style of Claude 3.5 Opus. Focus on high-density information, avoid fluff, and maintain clarity with markdown formatting.`;
  };

  const startNewChat = () => {
    setCurrentThreadId(null);
    setErrorStatus('none');
  };

  const deleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
        if (user) {
          const threadKey = `hk_threads_${user.uid}`;
          const updatedThreads = threads.filter(t => t.id !== id);
          localStorage.setItem(threadKey, JSON.stringify(updatedThreads));
          setThreads(updatedThreads);
        } else {
          const updatedThreads = threads.filter(t => t.id !== id);
          localStorage.setItem('hk_ai_threads', JSON.stringify(updatedThreads));
          setThreads(updatedThreads);
        }
    
    if (currentThreadId === id) {
      setCurrentThreadId(null);
    }
    setThreadToDelete(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  const exportChat = (format: 'json' | 'md') => {
    if (!currentThread) return;
    
    let content = '';
    let mimeType = '';
    let extension = '';
    
    if (format === 'json') {
      content = JSON.stringify(currentThread, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = `# ${currentThread.title}\n\n`;
      currentThread.messages.forEach(msg => {
        content += `### ${msg.role === 'user' ? 'User' : 'HK-Ai'}\n${msg.content}\n\n`;
        if (msg.reasoning) {
          content += `> **Reasoning:** ${msg.reasoning}\n\n`;
        }
      });
      mimeType = 'text/markdown';
      extension = 'md';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hk-ai-chat-${currentThread.id}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const regenerateMessage = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
    const lastUserMessageIdx = [...thread.messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIdx === -1) return;
    
    const actualIdx = thread.messages.length - 1 - lastUserMessageIdx;
    const lastUserMessage = thread.messages[actualIdx];
    
    // Remove all messages starting from the AI message following the last user message
    const newMessages = thread.messages.slice(0, actualIdx + 1);
    
    setThreads(prev => prev.map(t => 
      t.id === threadId ? { ...t, messages: newMessages } : t
    ));
    
    // Resend
    setInput(lastUserMessage.content);
    // Use setTimeout to ensure state updates before calling handleSend
    setTimeout(() => {
      handleSend();
    }, 0);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json) return;

        // Normalize: could be a single thread or array of threads
        const threadsToImport = Array.isArray(json) ? json : [json];
        
        if (user) {
          const threadKey = `hk_threads_${user.uid}`;
          const currentSaved = JSON.parse(localStorage.getItem(threadKey) || '[]');
          const merged = [...threadsToImport, ...currentSaved];
          localStorage.setItem(threadKey, JSON.stringify(merged));
          setThreads(merged);
          alert('Import successful! Your chats have been synced.');
        } else {
          const merged = [...threadsToImport, ...threads];
          localStorage.setItem('hk_ai_threads', JSON.stringify(merged));
          setThreads(merged);
          alert('Import successful to local storage.');
        }
        setIsSettingsOpen(false);
      } catch (err) {
        console.error('Import failed', err);
        alert('Failed to import data. Please ensure it is a valid HK-Ai export file.');
      }
    };
    reader.readAsText(file);
  };

  const visibleModels = models
    .filter(model => {
      const query = modelSearch.trim().toLowerCase();
      const matchesQuery = !query || `${model.name} ${model.id} ${model.provider || ''}`.toLowerCase().includes(query);
      const matchesFilter = modelFilter === 'all' || (modelFilter === 'free' ? model.isFree : !model.isFree);
      return matchesQuery && matchesFilter;
    })
    .sort((a, b) => Number(Boolean(b.isFree)) - Number(Boolean(a.isFree)) || a.name.localeCompare(b.name));
  const formatContext = (value?: number | null) => value ? `${Math.round(value / 1000)}K ctx` : 'Context n/a';
  const formatPrice = (value?: string | null) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price === 0) return 'Free';
    return `$${(price * 1_000_000).toFixed(2)}/1M`;
  };

  return (
    <div className="flex h-screen bg-bg-primary text-text-main font-sans selection:bg-[#E2D8C0] transition-colors duration-300">
      {!isAuthLoading && !user && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-bg-primary/95 backdrop-blur-xl">
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-xl bg-bg-sidebar border border-border-strong rounded-[2.5rem] p-10 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-text-main text-bg-primary flex items-center justify-center shadow-xl"><KeyRound size={28} /></div>
            <h1 className="text-3xl font-black tracking-tight mb-3">First, sign in to HK-Ai</h1>
            <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto mb-8">Login with the HK-Ai Firebase account system, add your own AI provider API, and then use chat, models, research, and WhatsApp features from your personal panel.</p>
            <button onClick={() => { setAuthMode('login'); setAuthError(''); setIsAuthModalOpen(true); }} className="px-7 py-4 bg-text-main text-bg-primary rounded-2xl text-sm font-black shadow-xl hover:opacity-90 active:scale-95 transition-all">Login / Create account</button>
            <p className="mt-5 text-[10px] font-bold text-text-dim uppercase tracking-widest">Your provider keys are encrypted on the server and never shown back in full.</p>
          </motion.div>
        </div>
      )}
      {!isAuthLoading && user && providerSettingsLoaded && providerConfigs.length === 0 && !isProviderGateDismissed && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-bg-primary/95 backdrop-blur-xl">
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative w-full max-w-xl bg-bg-sidebar border border-border-strong rounded-[2.5rem] p-10 shadow-2xl text-center">
            <button type="button" aria-label="Close API setup message" onClick={() => setIsProviderGateDismissed(true)} className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center text-text-dim hover:text-text-main hover:bg-bg-primary transition-colors"><X size={18} /></button>
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-text-main text-bg-primary flex items-center justify-center shadow-xl"><KeyRound size={28} /></div>
            <h1 className="text-3xl font-black tracking-tight mb-3">Add an AI API to load models</h1>
            <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto mb-8">Connect at least one AI provider API to load its available models and use them in chat and WhatsApp.</p>
            <button onClick={() => { setSettingsTab('apis'); setIsSettingsOpen(true); }} className="px-7 py-4 bg-text-main text-bg-primary rounded-2xl text-sm font-black shadow-xl hover:opacity-90 active:scale-95 transition-all">Open AI API settings</button>
          </motion.div>
        </div>
      )}
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-bg-primary border border-border-strong rounded-3xl shadow-2xl overflow-hidden flex h-[600px]"
            >
              <div className="w-48 bg-bg-sidebar border-r border-border-subtle p-6 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4">Settings</div>
                {[
                  { id: 'account', icon: User, label: 'Account' },
                  { id: 'ai', icon: Bot, label: 'AI Settings' },
                  { id: 'apis', icon: KeyRound, label: 'AI APIs' },
                  { id: 'appearance', icon: Sparkles, label: 'Appearance' },
                  { id: 'data', icon: Database, label: 'Data & Privacy' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                      settingsTab === tab.id 
                        ? "bg-bg-primary text-text-main shadow-sm border border-border-strong" 
                        : "text-text-muted hover:bg-bg-primary/50"
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
                
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all"
                >
                  <X size={16} />
                  Close
                </button>
              </div>

              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                {settingsTab === 'account' && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-6">
                      {user?.photoURL ? (
                        <img src={user.photoURL} className="w-20 h-20 rounded-full border-4 border-border-subtle" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-bg-sidebar flex items-center justify-center text-2xl font-bold border-4 border-border-subtle">
                          {userProfile?.firstName?.[0] || user?.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold">{userProfile?.firstName || user?.displayName || 'Guest User'}</h2>
                        <p className="text-sm text-text-muted">{user?.email || 'Sign in to sync your data'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-text-dim uppercase tracking-widest">Edit Profile</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">First Name</label>
                            <input 
                              type="text"
                              value={userProfile?.firstName || ''}
                              onChange={async (e) => {
                                const newName = e.target.value;
                                const updatedProfile = { ...userProfile, firstName: newName };
                                setUserProfile(updatedProfile);
                                if (user) {
                                  localStorage.setItem(`hk_profile_${user.uid}`, JSON.stringify(updatedProfile));
                                }
                              }}
                              className="w-full bg-bg-sidebar border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-text-main"
                              placeholder="Your name"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Communication Style</label>
                            <select 
                              value={userProfile?.communicationStyle || 'Professional & Direct'}
                              onChange={async (e) => {
                                const newStyle = e.target.value;
                                const updatedProfile = { ...userProfile, communicationStyle: newStyle };
                                setUserProfile(updatedProfile);
                                if (user) {
                                  localStorage.setItem(`hk_profile_${user.uid}`, JSON.stringify(updatedProfile));
                                }
                              }}
                              className="w-full bg-bg-sidebar border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-text-main"
                            >
                              {['Friendly & Casual', 'Professional & Direct', 'Academic & Detailed', 'Creative & Expressive'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {window.hkAiDesktop?.isDesktop && (
                        <div className="p-4 bg-bg-sidebar rounded-2xl border border-border-subtle">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-bold">Start HK-Ai with Windows</div>
                              <div className="text-[10px] text-text-dim">Launch in the background when your PC starts.</div>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const next = !desktopAutoLaunch;
                                const result = await window.hkAiDesktop?.setAutoLaunch(next);
                                setDesktopAutoLaunch(Boolean(result?.autoLaunch ?? next));
                              }}
                              className={cn("w-12 h-6 rounded-full transition-all relative", desktopAutoLaunch ? "bg-green-500" : "bg-border-strong")}
                              aria-label="Toggle HK-Ai startup launch"
                            >
                              <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", desktopAutoLaunch ? "right-1" : "left-1")} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-bg-sidebar rounded-2xl border border-border-subtle">
                        <div className="text-xs font-bold text-text-dim uppercase mb-2">Subscription</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Free Tier</span>
                          <button className="px-3 py-1 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all">Upgrade</button>
                        </div>
                      </div>
                    </div>

                    {!user && (
                      <button 
                        onClick={() => { setIsAuthModalOpen(true); setIsSettingsOpen(false); }}
                        className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-all"
                      >
                        Connect Account
                      </button>
                    )}
                  </div>
                )}

                {settingsTab === 'apis' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">Your AI API Connections</h2>
                      <p className="text-sm text-text-muted mt-2 leading-relaxed">Connect OpenRouter, OpenAI, Groq, Together AI, Mistral, DeepSeek, Anthropic Claude, Google Gemini, Tavily Web Search, or any OpenAI-compatible provider. Your keys are sent only to your authenticated server and stored encrypted; only masked key details are returned to this browser.</p>
                    </div>

                    <div className="p-6 bg-bg-sidebar border border-border-strong rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest"><KeyRound size={16} /> Add or update a provider</div>
                      <select
                        value={providerDraft.id}
                        onChange={(event) => {
                          const preset = providerPresets.find(item => item.id === event.target.value);
                          if (preset) setProviderDraft({ ...preset, apiKey: '', enabled: true });
                        }}
                        className="w-full bg-bg-primary border border-border-strong rounded-xl px-4 py-3 text-sm outline-none focus:border-text-main"
                      >
                        {providerPresets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                      </select>
                      <input
                        type="password"
                        value={providerDraft.apiKey || ''}
                        onChange={(event) => setProviderDraft(draft => ({ ...draft, apiKey: event.target.value }))}
                        placeholder={providerConfigs.find(provider => provider.id === providerDraft.id)?.maskedKey || 'Paste your API key'}
                        className="w-full bg-bg-primary border border-border-strong rounded-xl px-4 py-3 text-sm outline-none focus:border-text-main"
                      />
                      {providerDraft.kind === 'openai-compatible' && (
                        <input
                          type="url"
                          value={providerDraft.baseUrl || ''}
                          onChange={(event) => setProviderDraft(draft => ({ ...draft, baseUrl: event.target.value }))}
                          placeholder="https://your-provider.example/v1"
                          className="w-full bg-bg-primary border border-border-strong rounded-xl px-4 py-3 text-sm outline-none focus:border-text-main"
                        />
                      )}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-text-dim">{providerStatus || 'After saving, models will load automatically for chat and WhatsApp.'}</span>
                        <button onClick={saveProviderDraft} disabled={!providerDraft.apiKey && !providerConfigs.some(provider => provider.id === providerDraft.id)} className="px-5 py-3 bg-text-main text-bg-primary rounded-xl text-xs font-black disabled:opacity-40 active:scale-95 transition-all">Save provider</button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-text-dim uppercase tracking-widest">Saved providers</h3>
                      {providerConfigs.length === 0 ? (
                        <div className="p-6 rounded-2xl border border-dashed border-border-strong text-sm text-text-dim">No provider connected yet. Add one above to load models and use AI features.</div>
                      ) : providerConfigs.map(provider => (
                        <div key={provider.id} className="flex items-center justify-between gap-4 p-4 bg-bg-sidebar border border-border-subtle rounded-2xl">
                          <button onClick={() => setProviderDraft({ ...provider, apiKey: '' })} className="text-left min-w-0">
                            <div className="font-bold text-sm truncate">{provider.name}</div>
                            <div className="text-[10px] text-text-dim truncate">{provider.maskedKey || 'Key saved securely'} · {provider.kind}</div>
                          </button>
                          <button onClick={() => deleteProvider(provider.id)} className="px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50">Remove</button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-text-dim uppercase tracking-widest">Usage & rate limits</h3>
                        <button onClick={loadProviderUsage} className="px-3 py-2 rounded-xl bg-bg-sidebar border border-border-subtle text-[10px] font-bold hover:border-text-main transition-colors">Refresh usage</button>
                      </div>
                      <p className="text-[10px] text-text-dim">{usageStatus || 'Usage is checked with your provider where the provider API supports it.'}</p>
                      {providerUsage.length === 0 ? (
                        <div className="p-5 rounded-2xl border border-dashed border-border-strong text-sm text-text-dim">Save a provider API to view its status here.</div>
                      ) : providerUsage.map((usage: any) => {
                        const rateLimited = Boolean(usage.rateLimit?.rateLimited || usage.lastError?.rateLimited || /rate.?limit|free-models-per-day/i.test(String(usage.message || '')));
                        const remaining = usage.limitRemaining !== null && usage.limitRemaining !== undefined ? Number(usage.limitRemaining) : null;
                        return (
                          <div key={usage.id} className={cn("p-4 rounded-2xl border space-y-2", rateLimited ? "border-red-300 bg-red-50/70" : "border-border-subtle bg-bg-sidebar")}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-sm">{usage.name}</span>
                              <span className={cn("text-[9px] font-black uppercase tracking-widest", rateLimited ? "text-red-600" : usage.available ? "text-green-600" : "text-text-dim")}>{rateLimited ? 'Rate limit exceeded' : usage.available ? 'Available' : 'Status unavailable'}</span>
                            </div>
                            {rateLimited ? (
                              <p className="text-xs font-bold text-red-700">Rate limit exceeded. {usage.message || usage.lastError?.message || 'Switch model, wait, or add another provider.'}</p>
                            ) : usage.available ? (
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-text-dim">
                                <span>Remaining: <b className="text-text-main">{remaining === null || Number.isNaN(remaining) ? 'Not reported' : `$${remaining.toFixed(4)}`}</b></span>
                                <span>Limit: <b className="text-text-main">{usage.limit ?? 'Account balance'}</b></span>
                                <span>Reset: <b className="text-text-main">{usage.limitReset || 'Provider managed'}</b></span>
                                <span>Checked: <b className="text-text-main">{usage.checkedAt ? new Date(usage.checkedAt).toLocaleTimeString() : 'Now'}</b></span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-text-dim">{usage.message || 'Open the provider dashboard for detailed usage.'}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settingsTab === 'ai' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-bold mb-4">Response Tone</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {['Professional', 'Creative', 'Concise'].map(tone => (
                          <button
                            key={tone}
                            onClick={() => setAiPreferences(p => ({ ...p, tone: tone.toLowerCase() }))}
                            className={cn(
                              "px-4 py-3 rounded-xl border text-xs font-bold transition-all",
                              aiPreferences.tone === tone.toLowerCase()
                                ? "bg-black text-white border-black"
                                : "border-border-strong text-text-muted hover:border-text-main"
                            )}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold mb-4">Preferred Language</h3>
                      <select 
                        className="w-full bg-bg-sidebar border border-border-strong rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-text-main"
                        value={aiPreferences.language}
                        onChange={(e) => setAiPreferences(p => ({ ...p, language: e.target.value }))}
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="en">English</option>
                        <option value="ur">Urdu (اردو)</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-bold">Knowledge Base</h3>
                      <p className="text-[10px] text-text-dim">Add stable facts, product notes, or preferred instructions. This is stored locally in your browser.</p>
                      <textarea
                        value={knowledgeBase}
                        onChange={(event) => {
                          const value = event.target.value;
                          setKnowledgeBase(value);
                          localStorage.setItem('hk_ai_knowledge_base', value);
                        }}
                        rows={5}
                        placeholder="Example: Our support hours are Monday–Friday, 9:00–17:00..."
                        className="w-full bg-bg-sidebar border border-border-strong rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-text-main resize-y"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-bg-sidebar rounded-2xl border border-border-subtle">
                      <div>
                        <div className="text-sm font-bold">Save Chat History</div>
                        <div className="text-[10px] text-text-dim">Store your conversations for future research</div>
                      </div>
                      <button 
                        onClick={() => setAiPreferences(p => ({ ...p, saveHistory: !p.saveHistory }))}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          aiPreferences.saveHistory ? "bg-green-500" : "bg-border-strong"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                          aiPreferences.saveHistory ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'appearance' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-bold mb-4">Color Theme</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => setTheme('light')}
                          className={cn(
                            "p-3 rounded-2xl border transition-all flex flex-col gap-2",
                            theme === 'light' ? "border-black bg-white ring-2 ring-black/5" : "border-border-strong bg-white hover:border-black"
                          )}
                        >
                          <div className="w-full h-8 bg-[#f9f9f8] rounded-lg border border-border-subtle" />
                          <span className="text-[10px] font-black text-black text-center uppercase tracking-tighter">Light</span>
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={cn(
                            "p-3 rounded-2xl border transition-all flex flex-col gap-2",
                            theme === 'dark' ? "border-white bg-[#0a0a0a] ring-2 ring-white/5" : "border-border-strong bg-[#0a0a0a] hover:border-white"
                          )}
                        >
                          <div className="w-full h-8 bg-[#141414] rounded-lg border border-white/10" />
                          <span className="text-[10px] font-black text-white text-center uppercase tracking-tighter">Dark</span>
                        </button>
                        <button
                          onClick={() => setTheme('sepia')}
                          className={cn(
                            "p-3 rounded-2xl border transition-all flex flex-col gap-2",
                            theme === 'sepia' ? "border-[#433422] bg-[#f4ecd8] ring-2 ring-[#433422]/5" : "border-border-strong bg-[#f4ecd8] hover:border-[#433422]"
                          )}
                        >
                          <div className="w-full h-8 bg-[#e9e0c9] rounded-lg border border-[#433422]/10" />
                          <span className="text-[10px] font-black text-[#433422] text-center uppercase tracking-tighter">Sepia</span>
                        </button>
                        <button
                          onClick={() => setTheme('solarized')}
                          className={cn(
                            "p-3 rounded-2xl border transition-all flex flex-col gap-2",
                            theme === 'solarized' ? "border-[#073642] bg-[#fdf6e3] ring-2 ring-[#073642]/5" : "border-border-strong bg-[#fdf6e3] hover:border-[#073642]"
                          )}
                        >
                          <div className="w-full h-8 bg-[#eee8d5] rounded-lg border border-[#073642]/10" />
                          <span className="text-[10px] font-black text-[#073642] text-center uppercase tracking-tighter">Solarized</span>
                        </button>
                        <button
                          onClick={() => setTheme('oled')}
                          className={cn(
                            "p-3 rounded-2xl border transition-all flex flex-col gap-2",
                            theme === 'oled' ? "border-white bg-black ring-2 ring-white/5" : "border-border-strong bg-black hover:border-white"
                          )}
                        >
                          <div className="w-full h-8 bg-black rounded-lg border border-white/20" />
                          <span className="text-[10px] font-black text-white text-center uppercase tracking-tighter">OLED Black</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'data' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold mb-2">Export Data</h3>
                      <p className="text-xs text-text-dim mb-4">Download all your research and chat logs in a structured format.</p>
                      <div className="flex gap-3">
                        <button onClick={() => exportChat('md')} className="flex-1 py-2.5 bg-bg-sidebar border border-border-strong rounded-xl text-xs font-bold hover:bg-white hover:border-black transition-all">Markdown (.md)</button>
                        <button onClick={() => exportChat('json')} className="flex-1 py-2.5 bg-bg-sidebar border border-border-strong rounded-xl text-xs font-bold hover:bg-white hover:border-black transition-all">JSON (.json)</button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border-subtle">
                      <h3 className="text-sm font-bold mb-2">Import Data</h3>
                      <p className="text-xs text-text-dim mb-4">Upload a previously exported HK-Ai JSON file to restore your chats.</p>
                      <label className="flex items-center justify-center gap-3 w-full py-3 bg-bg-sidebar border border-dashed border-border-strong rounded-xl text-xs font-bold cursor-pointer hover:bg-white hover:border-black transition-all">
                        <Plus size={16} />
                        Choose JSON File
                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                      </label>
                    </div>

                    <div className="pt-6 border-t border-border-subtle">
                      <h3 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h3>
                      <p className="text-xs text-text-dim mb-4">Actions here are irreversible. Proced with caution.</p>
                      
                      <div className="space-y-3">
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete ALL chat history?')) {
                              setThreads([]);
                              const threadKey = user ? `hk_threads_${user.uid}` : 'hk_ai_threads';
                              localStorage.removeItem(threadKey);
                            }
                          }}
                          className="w-full py-3 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-all"
                        >
                          Clear All History
                        </button>

                        {user && (
                          <button 
                            onClick={() => setIsDeletingAccount(true)}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg"
                          >
                            Delete My Account
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeletingAccount && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-primary rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-border-strong text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 mx-auto transform rotate-3">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-black mb-2">Delete Account?</h3>
              <p className="text-sm text-text-muted mb-8 leading-relaxed font-medium">
                This will permanently delete your HK-Ai account, all research threads, and personalized settings. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    if (!user) return;
                    try {
                      const { deleteUserAccount } = await import('./lib/firebase');
                      
                      // Clear local storage
                      localStorage.removeItem(`hk_profile_${user.uid}`);
                      localStorage.removeItem(`hk_threads_${user.uid}`);
                      
                      // Delete Firebase Auth user
                      await deleteUserAccount();
                      
                      setIsDeletingAccount(false);
                      setIsSettingsOpen(false);
                      alert('Your account and all associated data have been permanently removed.');
                      window.location.reload();
                    } catch (err: any) {
                      if (err.code === 'auth/requires-recent-login') {
                        alert('For security, please log out and log back in before deleting your account.');
                      } else {
                        alert('Deletion failed: ' + err.message);
                      }
                      console.error("Account deletion error:", err);
                    }
                  }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-black shadow-xl transition-all active:scale-95"
                >
                  Confirm Permanent Deletion
                </button>
                <button 
                  onClick={() => setIsDeletingAccount(false)}
                  className="w-full py-4 border-2 border-border-subtle hover:bg-bg-sidebar rounded-2xl text-sm font-bold transition-all"
                >
                  Keep My Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal 
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            mode={authMode}
            setMode={setAuthMode}
            email={authEmail}
            setEmail={setAuthEmail}
            pass={authPassword}
            setPass={setAuthPassword}
            rememberMe={authRememberMe}
            setRememberMe={setAuthRememberMe}
            error={authError}
            setError={setAuthError}
            isVerificationSent={isEmailVerificationSent}
            setIsVerificationSent={setIsEmailVerificationSent}
            onSubmit={handleAuthSubmit}
            onGoogle={handleGoogleSignIn}
            onResendEmail={handleResendEmail}
            onCheckVerified={handleCheckVerified}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && !isEmailVerificationSent && (
          <OnboardingModal 
            step={onboardingStep}
            data={onboardingData}
            onNext={handleOnboardingNext}
            onUpdate={(field, value) => {
              if (field === 'firstName') setOnboardingData(d => ({ ...d, firstName: value }));
              if (field === 'communicationStyle') setOnboardingData(d => ({ ...d, communicationStyle: value }));
              if (field === 'referralSource') setOnboardingData(d => ({ ...d, referralSource: value }));
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col border-r border-border-subtle bg-bg-sidebar overflow-hidden shrink-0 shadow-lg z-40 transition-colors duration-300"
          >
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8 px-1">
                <div className="flex items-center gap-2">
                  <LoaderLogo size={0.35} />
                  <span className="font-bold text-xl tracking-tight">HK-Ai</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full border border-green-200">PRO</div>
                </div>
              </div>

              <button 
                onClick={startNewChat}
                className="group flex items-center gap-2 px-4 py-3 bg-bg-primary border border-border-strong rounded-xl hover:border-text-main transition-all mb-2 font-semibold text-sm shadow-sm active:scale-95 text-text-main"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                New Analysis
              </button>

              <button 
                onClick={() => setCurrentView('chat')}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 border rounded-xl transition-all mb-2 font-semibold text-sm shadow-sm active:scale-95",
                  currentView === 'chat' 
                    ? "bg-text-main text-bg-primary border-text-main" 
                    : "bg-bg-primary border-border-strong hover:border-text-main text-text-main"
                )}
              >
                <MessageSquare size={18} />
                Recent Analysis
              </button>

              <button 
                onClick={() => {
                  if (!user) {
                    setIsAuthModalOpen(true);
                    setAuthMode('login');
                    return;
                  }
                  setCurrentView('whatsapp');
                  if (waStatus === 'DISCONNECTED') initWhatsApp();
                }}
                className={cn(
                  "group flex items-center justify-between px-4 py-3 border rounded-xl transition-all mb-6 font-semibold text-sm shadow-sm active:scale-95",
                  currentView === 'whatsapp'
                    ? "bg-green-500 text-white border-green-500"
                    : waStatus === 'CONNECTED'
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-bg-primary border-border-strong hover:border-text-main text-text-main"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} />
                  <span>{waStatus === 'CONNECTED' ? 'Linked Intelligence' : 'WhatsApp Connect'}</span>
                </div>
                {waStatus === 'CONNECTED' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              </button>

              <div className="relative mb-6">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input 
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-primary border border-border-strong rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-text-main transition-all text-text-main"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="px-3 py-2 text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4">Chat History</div>
                <div className="space-y-1.5">
                  {threads.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map((t) => (
                    <div key={t.id} className="relative group">
                      <button 
                        onClick={() => setCurrentThreadId(t.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm text-text-muted hover:bg-bg-primary rounded-xl truncate transition-all border border-transparent",
                          currentThreadId === t.id && "bg-bg-primary border-border-strong text-text-main shadow-sm font-medium"
                        )}
                      >
                        {t.title}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setThreadToDelete(t.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all text-text-dim"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {threads.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <div className="w-12 h-12 bg-bg-primary/30 rounded-full flex items-center justify-center mx-auto mb-3 border border-dashed border-border-strong">
                        <History size={18} className="text-text-dim" />
                      </div>
                      <p className="text-xs text-text-dim italic">No prior research found</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-border-subtle">
                {user ? (
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={userProfile?.firstName || user.displayName || 'User'} className="w-8 h-8 rounded-full border border-border-strong transition-colors duration-300" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-text-main/10 border border-border-strong flex items-center justify-center text-[10px] font-bold text-text-main transition-colors duration-300">
                          {(userProfile?.firstName || user.displayName || 'User').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate text-text-main">{userProfile?.firstName || user.displayName || 'User'}</span>
                        <span className="text-[9px] text-text-dim uppercase tracking-tighter">Verified Analyst</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-1.5 hover:bg-text-main hover:text-bg-primary rounded-lg transition-all text-text-dim"
                        title="Settings"
                      >
                        <Settings size={14} />
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="p-1.5 hover:bg-red-500 hover:text-white rounded-lg transition-all text-text-dim"
                        title="Sign Out"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => { setIsAuthModalOpen(true); setAuthMode('login'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-text-main text-bg-primary rounded-xl hover:opacity-90 transition-all font-bold text-xs shadow-lg active:scale-95 mb-1"
                    >
                      <User size={14} />
                      Sign In / Register
                    </button>
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-bg-primary border border-border-strong text-text-main rounded-xl hover:border-text-main transition-all font-bold text-xs shadow-sm active:scale-95"
                    >
                      <Settings size={14} />
                      Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full bg-bg-primary transition-colors duration-300">
        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {threadToDelete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-primary rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border-strong"
              >
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4 mx-auto">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-bold text-center mb-2 text-text-main">Delete this research?</h3>
                <p className="text-sm text-text-muted text-center mb-6 leading-relaxed">This action cannot be undone. All analytical steps and AI responses will be permanently removed.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setThreadToDelete(null)}
                    className="px-4 py-2 bg-bg-sidebar hover:bg-border-subtle rounded-xl text-sm font-semibold transition-colors text-text-main"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={(e) => deleteThread(threadToDelete, e as any)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-200 transition-all active:scale-95"
                  >
                    Delete Forever
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentView === 'whatsapp' ? (
          <WhatsAppPage 
            status={waStatus}
            error={waError}
            qr={waQR}
            chats={waChats}
            chatsError={waChatsError}
            chatsLoaded={waChatsLoaded}
            settings={waSettings}
            onUpdateSettings={updateWASettings}
            onDisconnect={disconnectWhatsApp}
            availableModels={models}
            onBack={() => setCurrentView('chat')}
            messages={waMessages[selectedChatId || ''] || []}
            selectedChatId={selectedChatId}
            onSelectChat={selectWhatsAppChat}
            onSendMessage={sendWhatsAppMessage}
            onScheduleMessage={scheduleWhatsAppMessage}
            isSettingsDirty={isSettingsDirty}
            onSaveSettings={saveWASettings}
            onReset={resetWhatsApp}
            onRefreshChats={refreshWhatsAppChats}
            pairingCode={waPairingCode}
            pairingError={waPairingError}
            onPairWithPhone={pairWhatsAppWithPhone}
            replyTarget={replyTarget}
            onSetReplyTarget={setReplyTarget}
            onClearReplyTarget={() => setReplyTarget(null)}
          />
        ) : (
          <>
            {/* Header */}
            <header className="h-14 border-b border-border-subtle flex items-center justify-between px-6 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-bg-sidebar rounded-lg transition-colors text-text-muted"
            >
              <Menu size={18} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mb-[-2px]">HK-Ai Intelligence</span>
              <span className="text-xs font-medium text-text-main">
                {isResearchMode ? 'Deep Research Enabled' : 'Real-time Pulse Mode'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <button 
              onClick={() => setIsExporting(!isExporting)}
              disabled={!currentThreadId}
              className={cn(
                "p-2 rounded-lg transition-colors text-text-muted hover:bg-bg-sidebar",
                !currentThreadId && "opacity-30 cursor-not-allowed"
              )}
              title="Export Chat"
            >
              <ExternalLink size={18} />
            </button>

            <AnimatePresence>
              {isExporting && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExporting(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-12 w-40 bg-bg-primary border border-border-subtle rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5"
                  >
                    <button 
                      onClick={() => exportChat('md')}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-bg-sidebar transition-colors border-b border-border-subtle"
                    >
                      Export as Markdown
                    </button>
                    <button 
                      onClick={() => exportChat('json')}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-bg-sidebar transition-colors"
                    >
                      Export as JSON
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="relative">
              <button 
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-bg-primary border border-border-strong hover:border-text-main rounded-xl text-[11px] font-bold transition-all text-text-main shadow-sm active:scale-95"
              >
                <Cpu size={14} className="text-green-600" />
                <span className="max-w-[120px] truncate">
                  {models.find(m => m.id === selectedModel)?.name || 'Model Selector'}
                </span>
                <ChevronDown size={14} className={cn("transition-transform opacity-50 ml-1", isModelMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isModelMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[min(28rem,calc(100vw-3rem))] bg-bg-primary border border-border-strong rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 origin-top-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="px-4 py-3 bg-bg-sidebar border-b border-border-subtle space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">OpenRouter models</span>
                            <span className="text-[9px] text-text-dim">{modelCatalogMeta.total} available · {modelCatalogMeta.freeTotal} free{modelCatalogMeta.stale ? ' · cached' : ''}</span>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        </div>
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                          <input
                            value={modelSearch}
                            onChange={(event) => setModelSearch(event.target.value)}
                            placeholder="Search model name, ID, or provider"
                            className="w-full bg-bg-primary border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-xs text-text-main outline-none focus:border-text-main"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-1">
                          {(['all', 'free', 'paid'] as const).map(filter => (
                            <button
                              key={filter}
                              onClick={() => setModelFilter(filter)}
                              className={cn('flex-1 rounded-lg py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors', modelFilter === filter ? 'bg-text-main text-bg-primary' : 'bg-bg-primary text-text-dim hover:text-text-main')}
                            >
                              {filter === 'all' ? `All (${modelCatalogMeta.total + 1})` : filter === 'free' ? `Free (${modelCatalogMeta.freeTotal + 1})` : `Paid (${Math.max(0, modelCatalogMeta.total - modelCatalogMeta.freeTotal)})`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
                        {visibleModels.length === 0 ? (
                          <div className="px-4 py-8 text-center text-xs text-text-dim">No models match this search.</div>
                        ) : visibleModels.map(model => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id);
                              localStorage.setItem('hk_ai_selected_model', model.id);
                              setIsModelMenuOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 hover:bg-bg-sidebar transition-colors border-b border-border-subtle last:border-0 flex items-start justify-between group relative",
                              selectedModel === model.id && "bg-bg-sidebar"
                            )}
                          >
                            {selectedModel === model.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-text-main" />}
                            <div className="flex flex-col overflow-hidden text-text-main pr-3 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn("font-bold text-xs truncate", selectedModel === model.id ? "text-text-main" : "text-text-muted")}>{model.name}</span>
                                {model.isFree ? <span className="shrink-0 px-1.5 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black rounded border border-green-500/20 leading-none">FREE</span> : <span className="shrink-0 text-[8px] font-bold text-text-dim">PAID</span>}
                              </div>
                              <span className="text-[10px] text-text-dim truncate mt-0.5">{model.id}</span>
                              <span className="text-[9px] text-text-dim mt-1">{model.provider || 'unknown'} · {formatContext(model.context_length)} · {formatPrice(model.pricing?.prompt)} prompt</span>
                            </div>
                            {model.id === 'openrouter::free' && <Sparkles size={12} className="text-[#D8B97C] flex-shrink-0 mt-1" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto pt-8 pb-12 px-6 lg:px-0 transition-colors duration-300">
          {(!currentThreadId || messages.length === 0) ? (
            <div className="max-w-3xl mx-auto mt-24">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-12"
              >
                <div className="flex justify-center mb-12">
                  <LoaderLogo size={1.2} />
                </div>
                
                <div className="space-y-4 mb-8 text-text-main">
                  <AnimatePresence mode="wait">
                    <motion.h1 
                      key={greetingPhase}
                      initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="text-5xl font-bold tracking-tight"
                    >
                      {getGreetingText()}
                    </motion.h1>
                  </AnimatePresence>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 1 }}
                    className="text-lg text-text-muted font-medium max-w-lg mx-auto leading-relaxed"
                  >
                    Your professional partner for deep research, analysis, and creative synthesis.
                  </motion.p>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-12 pb-12">
              {messages.map((message, mIdx) => (
                <motion.div 
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col group",
                    message.role === 'assistant' ? "items-start" : "items-end"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {message.role === 'assistant' ? (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-text-dim uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                        <LoaderLogo size={0.2} />
                        {message.isTyping ? 'Synthesizing' : 'HK-Ai Intelligence'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-text-dim uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                        Request
                        <div className="w-5 h-5 bg-bg-sidebar border border-border-strong rounded-lg flex items-center justify-center text-[8px] text-text-main">USR</div>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' ? (
                    <div className="flex items-center gap-3 group/user-msg max-w-[90%]">
                      <div className="flex flex-col gap-1 opacity-0 group-hover/user-msg:opacity-100 transition-opacity">
                        <button 
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="p-1.5 hover:bg-bg-sidebar rounded-lg transition-colors text-text-dim hover:text-text-main"
                          title="Copy message"
                        >
                          {copyingId === message.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                        <button 
                          onClick={() => {
                            setInput(message.content);
                            const inputEl = document.querySelector('textarea');
                            if (inputEl) inputEl.focus();
                          }}
                          className="p-1.5 hover:bg-bg-sidebar rounded-lg transition-colors text-text-dim hover:text-text-main"
                          title="Edit message"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <div className="bg-bg-sidebar px-6 py-4 rounded-2xl text-[15px] text-text-main shadow-sm leading-relaxed border border-border-subtle font-medium grow relative group/bubble transition-colors duration-300">
                        {message.content}
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.attachments.map((file, fIdx) => (
                              <div 
                                key={fIdx}
                                className="flex items-center gap-2 bg-bg-primary border border-border-subtle rounded-xl px-3 py-2 text-[11px] font-bold text-text-muted"
                              >
                                {file.type.startsWith('image/') ? (
                                  <ImageIcon size={14} className="text-blue-500" />
                                ) : file.type.startsWith('video/') ? (
                                  <Video size={14} className="text-red-500" />
                                ) : (
                                  <FileText size={14} className="text-amber-500" />
                                )}
                                {file.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-8">
                      {/* Main Message Content */}
                      <div className="flex-1 min-w-0">
                        {message.content === "ERROR_SENTINEL" ? (
                          <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-4 shadow-sm">
                            <div className="flex items-center gap-3 text-red-700">
                              <AlertCircle size={24} className="shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">System Congestion Alert</span>
                                <span className="text-sm font-bold">This AI instance is currently overloaded.</span>
                              </div>
                            </div>
                            <p className="text-sm text-red-800 leading-relaxed font-medium">
                              {errorStatus === 'auth' 
                                ? "Your authentication to this model has expired or is invalid. Please switch to 'HK-Ai Default' or refresh."
                                : "The requested OpenRouter provider is experiencing latency. Please try again shortly or choose another live model."}
                            </p>
                            <button 
                              onClick={() => setSelectedModel('openrouter::free')}
                              className="w-fit flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                            >
                              <ArrowRight size={14} />
                              Switch to OpenRouter Free Router
                            </button>
                          </div>
                        ) : message.content ? (
                          <div className="space-y-4">
                            {message.reasoning && (
                              <div className="bg-[#f8f8f7] border border-[#e8e8e6] rounded-2xl overflow-hidden mb-6 shadow-sm">
                                <button 
                                  onClick={() => setExpandedReasoning(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                                  className="w-full flex items-center justify-between px-5 py-3 text-[#7a7a76] hover:bg-[#efeff0] transition-colors group/reason"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-white border border-[#e8e8e6] flex items-center justify-center shadow-sm group-hover/reason:scale-110 transition-transform">
                                      <Zap size={14} className="text-amber-500" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-[0.1em]">HK-Ai Reasoning Chain</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium opacity-60 uppercase">{expandedReasoning[message.id] ? 'Hide' : 'Show Details'}</span>
                                    <ChevronDown size={14} className={cn("transition-transform duration-300", expandedReasoning[message.id] && "rotate-180")} />
                                  </div>
                                </button>
                                <AnimatePresence>
                                  {expandedReasoning[message.id] && (
                                    <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3, ease: "circOut" }}
                                      className="px-5 pb-5"
                                    >
                                      <div className="text-[13px] text-[#4a4a48] leading-relaxed font-normal border-t border-[#e8e8e6] pt-4 whitespace-pre-wrap selection:bg-amber-100">
                                        {message.reasoning}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                            <div className="prose prose-sm max-w-none prose-neutral leading-[1.8] text-text-main text-[15.5px] font-normal selection:bg-[#E2D8C0]">
                              <ReactMarkdown
                                components={{
                                  a: ({ node, ...props }) => (
                                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold" />
                                  ),
                                  code({ node, inline, className, children, ...props }: any) {
                                      const match = /language-(\w+)/.exec(className || '');
                                      const value = String(children).replace(/\n$/, '');
                                      if (!inline) {
                                        return (
                                          <div className="relative group/code my-4">
                                            <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 text-neutral-400 rounded-t-xl border-b border-white/5">
                                              <span className="text-[10px] font-bold uppercase tracking-widest">{match ? match[1] : 'code'}</span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(value);
                                                  const btn = document.activeElement as HTMLElement;
                                                  const originalText = btn.innerHTML;
                                                  btn.innerHTML = '<span class="text-green-400">Copied!</span>';
                                                  setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                                                }}
                                                className="flex items-center gap-1.5 hover:text-white transition-colors"
                                              >
                                                <Copy size={12} />
                                                <span className="text-[10px] font-bold uppercase">Copy code</span>
                                              </button>
                                            </div>
                                            <pre className="rounded-b-xl bg-neutral-950 text-neutral-100 p-5 overflow-x-auto text-sm font-mono custom-scrollbar" {...props}>
                                              <code>{children}</code>
                                            </pre>
                                          </div>
                                        );
                                      }
                                      return <code className="bg-bg-sidebar px-1.5 py-0.5 rounded text-sm font-mono text-pink-500" {...props}>{children}</code>;
                                    }
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -ml-2">
                              <button 
                                onClick={() => handleFeedback(message.id, 'up')}
                                title="Helpful"
                                className={cn(
                                  "p-2 hover:bg-bg-sidebar rounded-xl transition-colors",
                                  feedback[message.id] === 'up' ? "text-amber-500 bg-bg-sidebar" : "text-text-dim hover:text-text-main"
                                )}
                              >
                                <ThumbsUp size={14} fill={feedback[message.id] === 'up' ? "currentColor" : "none"} />
                              </button>
                              <button 
                                onClick={() => handleFeedback(message.id, 'down')}
                                title="Not helpful"
                                className={cn(
                                  "p-2 hover:bg-bg-sidebar rounded-xl transition-colors",
                                  feedback[message.id] === 'down' ? "text-red-500 bg-bg-sidebar" : "text-text-dim hover:text-text-main"
                                )}
                              >
                                <ThumbsDown size={14} fill={feedback[message.id] === 'down' ? "currentColor" : "none"} />
                              </button>
                              <button 
                                onClick={() => regenerateMessage(currentThreadId!)}
                                className="p-2 hover:bg-bg-sidebar rounded-xl transition-colors text-text-dim hover:text-text-main"
                                title="Regenerate"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button 
                                onClick={() => copyToClipboard(message.content, message.id)}
                                className="p-2 hover:bg-bg-sidebar rounded-xl transition-colors text-text-dim hover:text-text-main"
                                title="Copy"
                              >
                                {copyingId === message.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                              </button>
                              
                              <div className="relative">
                                <button 
                                  onClick={() => setActiveMenu(activeMenu === message.id ? null : message.id)}
                                  className={cn(
                                    "p-2 hover:bg-bg-sidebar rounded-xl transition-colors",
                                    activeMenu === message.id ? "text-text-main bg-bg-sidebar" : "text-text-dim hover:text-text-main"
                                  )}
                                  title="More"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                
                                <AnimatePresence>
                                  {activeMenu === message.id && (
                                    <>
                                      <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenu(null)} />
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute bottom-full left-0 mb-2 w-48 bg-bg-primary border border-border-strong rounded-2xl shadow-2xl z-[101] overflow-hidden p-1"
                                      >
                                        <button 
                                          onClick={() => { handleSpeak(message.content); setActiveMenu(null); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-bg-sidebar text-text-main transition-colors rounded-xl text-left"
                                        >
                                          <Volume2 size={14} className="shrink-0" />
                                          Speak Message
                                        </button>
                                        <button 
                                          onClick={() => { copyToClipboard(window.location.href, 'share'); setActiveMenu(null); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-bg-sidebar text-text-main transition-colors rounded-xl text-left"
                                        >
                                          <Share2 size={14} className="shrink-0" />
                                          Share Thread
                                        </button>
                                        <div className="h-px bg-border-subtle my-1 mx-2" />
                                        <button 
                                          onClick={() => { alert('HK-Ai Intelligence Report\nModel: ' + selectedModel + '\nID: ' + message.id); setActiveMenu(null); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-bg-sidebar text-text-main transition-colors rounded-xl text-left"
                                        >
                                          <Info size={14} className="shrink-0" />
                                          Message Details
                                        </button>
                                        <button 
                                          onClick={() => { alert('Message reported. Thank you for your feedback.'); setActiveMenu(null); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-bg-sidebar text-red-500 transition-colors rounded-xl text-left"
                                        >
                                          <Flag size={14} className="shrink-0" />
                                          Report Issue
                                        </button>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        ) : message.role === 'assistant' && (
                          <div className="space-y-3 py-4">
                            {message.type === 'search' && (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-amber-600"
                              >
                                <Search size={14} className="animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Researching Real-time Pulse...</span>
                              </motion.div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-text-main rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1.5 h-1.5 bg-text-main rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1.5 h-1.5 bg-text-main rounded-full animate-bounce" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isLoading && isSearching && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mr-auto items-start flex flex-col gap-2 max-w-[90%]"
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      <Search size={12} className="animate-pulse" />
                      Research Protocol Intelligence
                    </div>
                  </div>
                  <div className="bg-amber-50/30 px-6 py-4 rounded-2xl rounded-tl-none border border-amber-200/50 shadow-sm flex items-center gap-4 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Search size={18} className="text-amber-600 animate-spin" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-amber-600 uppercase tracking-[0.15em] leading-none mb-1.5">Deep Searching enabled</span>
                      <span className="text-[15px] font-bold text-amber-900 animate-pulse">{searchStatus || 'Analyzing parameters...'}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Dock */}
        <div className="flex-shrink-0 p-8 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent relative transition-colors duration-300">
          <div className="max-w-2xl mx-auto">
            <form 
              onSubmit={handleSend}
              className={cn(
                "group flex flex-col bg-bg-primary border rounded-2xl shadow-xl transition-all duration-500",
                isResearchMode 
                  ? "border-amber-400 shadow-amber-100/50" 
                  : "border-border-strong hover:border-text-main"
              )}
            >
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-6 pt-4">
                  {attachments.map((file, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group bg-bg-sidebar border border-border-subtle rounded-xl p-2 pr-8 flex items-center gap-2 max-w-[200px]"
                    >
                      {file.type.startsWith('image/') ? (
                        <ImageIcon size={14} className="text-blue-500 shrink-0" />
                      ) : file.type.startsWith('video/') ? (
                        <Video size={14} className="text-red-500 shrink-0" />
                      ) : (
                        <FileText size={14} className="text-amber-500 shrink-0" />
                      )}
                      <span className="text-[10px] font-bold truncate text-text-main">{file.name}</span>
                      <button 
                        onClick={() => removeAttachment(idx)}
                        className="absolute right-1 top-1 p-1 hover:bg-bg-primary rounded-lg transition-colors text-text-dim hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isResearchMode ? "Web Search with Tavily... Ask for current information." : "Ask HK-Ai to analyze, research, or create..."}
                className="w-full bg-transparent p-6 text-[15px] text-text-main placeholder-text-dim resize-none focus:outline-none min-h-[120px] max-h-[400px] leading-relaxed font-medium"
              />
              
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 pb-4 pt-2 border-t border-border-subtle/50 bg-bg-primary group-focus-within:bg-bg-sidebar transition-colors gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                      className="p-2 hover:bg-bg-sidebar rounded-xl transition-colors text-text-dim hover:text-text-main"
                    >
                      <Plus size={20} />
                    </button>
                    
                    <AnimatePresence>
                      {isUploadMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-[100]" onClick={() => setIsUploadMenuOpen(false)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-full left-0 mb-4 w-56 bg-bg-primary/95 backdrop-blur-xl border border-border-strong rounded-2xl shadow-2xl z-[101] overflow-hidden p-2 ring-1 ring-black/5"
                          >
                            <div className="px-3 py-2 mb-1">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim">Attachments</span>
                            </div>
                            <button 
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.accept = "image/*";
                                  fileInputRef.current.click();
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold hover:bg-bg-sidebar text-text-main transition-all rounded-xl text-left group/item"
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors">
                                <ImageIcon size={16} className="text-blue-500" />
                              </div>
                              <div className="flex flex-col">
                                <span>Images</span>
                                <span className="text-[9px] text-text-dim font-medium">JPEG, PNG, WEBP</span>
                              </div>
                            </button>
                            <button 
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.accept = "video/*";
                                  fileInputRef.current.click();
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold hover:bg-bg-sidebar text-text-main transition-all rounded-xl text-left group/item"
                            >
                              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover/item:bg-red-100 transition-colors">
                                <Video size={16} className="text-red-500" />
                              </div>
                              <div className="flex flex-col">
                                <span>Videos</span>
                                <span className="text-[9px] text-text-dim font-medium">MP4, WEBM</span>
                              </div>
                            </button>
                            <button 
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.accept = ".pdf,.doc,.docx,.txt,.csv";
                                  fileInputRef.current.click();
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold hover:bg-bg-sidebar text-text-main transition-all rounded-xl text-left group/item"
                            >
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center group-hover/item:bg-amber-100 transition-colors">
                                <FileText size={16} className="text-amber-500" />
                              </div>
                              <div className="flex flex-col">
                                <span>Documents</span>
                                <span className="text-[9px] text-text-dim font-medium">PDF, DOCX, TXT</span>
                              </div>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileSelect(e, 'all')}
                  />

                  <button 
                    type="button"
                    onClick={() => {
                      if (!providerConfigs.some(provider => provider.id === 'tavily')) {
                        setSettingsTab('apis');
                        setIsSettingsOpen(true);
                        setProviderStatus('Add your Tavily Web Search API to enable Web Research.');
                        return;
                      }
                      setIsResearchMode(!isResearchMode);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      isResearchMode 
                        ? "bg-amber-100 text-amber-700 border border-amber-200 shadow-sm" 
                        : "bg-bg-sidebar text-text-dim border border-transparent hover:border-border-subtle"
                    )}
                  >
                    <Search size={14} className={cn(isResearchMode && "text-amber-600")} />
                    Web Research {isResearchMode ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "p-2.5 rounded-xl transition-all shadow-lg",
                      input.trim() && !isLoading
                        ? "bg-text-main text-bg-primary hover:opacity-90 active:scale-95 shadow-text-main/20"
                        : "bg-bg-sidebar text-text-dim shadow-none opacity-50"
                    )}
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                  </button>
                </div>
              </div>
            </form>
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-text-dim font-bold uppercase tracking-widest">
              <span>HK-Ai Protocol 2.1</span>
              <span className="w-1 h-1 bg-border-strong rounded-full" />
              <span>Immersive Analysis Engine</span>
              <span className="w-1 h-1 bg-border-strong rounded-full" />
              <span>Professional Tier</span>
            </div>
          </div>
        </div>
      </>
        )}
      </main>


    </div>
  );
}

