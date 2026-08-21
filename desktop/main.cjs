const { app, BrowserWindow, dialog, Menu, nativeImage, ipcMain, Tray } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const APP_NAME = 'HK-Ai';
const APP_ID = 'com.hkai.desktop';
const PORT = Number(process.env.HK_AI_PORT || 3000);
app.setAppUserModelId(APP_ID);
const isPackaged = app.isPackaged;
const projectRoot = isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked') : path.resolve(__dirname, '..');
const iconPath = path.join(projectRoot, 'desktop-assets', 'HK-Ai.ico');
const iconPngPath = path.join(projectRoot, 'desktop-assets', 'HK-Ai-icon.png');
let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;
let closePromptInFlight = false;

function getIcon() {
  const candidate = process.platform === 'win32' ? iconPath : iconPngPath;
  return fs.existsSync(candidate) ? nativeImage.createFromPath(candidate) : undefined;
}

function getServerCommand() {
  const serverEntry = isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server.cjs')
    : path.join(projectRoot, 'server.cjs');
  if (!isPackaged && !fs.existsSync(serverEntry)) {
    const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    return { command: process.execPath, args: [tsxCli, path.join(projectRoot, 'server.ts')] };
  }
  return { command: process.execPath, args: [serverEntry] };
}

function getStableEncryptionKey() {
  const keyPath = path.join(app.getPath('userData'), 'provider-config-encryption.key');
  try {
    if (fs.existsSync(keyPath)) return fs.readFileSync(keyPath, 'utf8').trim();
    const key = require('crypto').randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });
    fs.writeFileSync(keyPath, key, { encoding: 'utf8', flag: 'wx' });
    return key;
  } catch (error) {
    console.error('[HK-Ai Desktop] Could not create persistent encryption key:', error);
    return undefined;
  }
}

function startServer() {
  const { command, args } = getServerCommand();
  const dataDir = path.join(app.getPath('userData'), 'provider-configs');
  const logDir = app.getPath('logs');
  fs.mkdirSync(logDir, { recursive: true });
  const serverLog = fs.createWriteStream(path.join(logDir, 'server.log'), { flags: 'a' });
  serverProcess = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'production', ELECTRON_RUN_AS_NODE: '1', HK_AI_PORT: String(PORT), PROVIDER_CONFIG_DIR: dataDir, PROVIDER_CONFIG_ENCRYPTION_KEY: getStableEncryptionKey() },
    windowsHide: true,
    stdio: isPackaged ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
  if (isPackaged) {
    serverProcess.stdout?.pipe(serverLog);
    serverProcess.stderr?.pipe(serverLog);
  }
  serverProcess.on('error', (error) => console.error('[HK-Ai Desktop] Server error:', error));
  serverProcess.on('exit', (code) => {
    if (!isQuitting && code && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('HK-Ai server stopped', `The local HK-Ai server stopped unexpectedly (code ${code}). Please restart the application.`);
    }
  });
}

function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const request = http.get(`http://127.0.0.1:${PORT}/health`, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) return resolve();
        retry();
      });
      request.on('error', retry);
      request.setTimeout(1500, () => { request.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) return reject(new Error('HK-Ai server did not start within the expected time.'));
      setTimeout(probe, 300);
    };
    probe();
  });
}

function setAutoLaunch(enabled) {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: true });
  return Boolean(app.getLoginItemSettings().openAtLogin);
}

function exposeIpc() {
  ipcMain.handle('desktop:get-settings', () => ({ autoLaunch: Boolean(app.getLoginItemSettings().openAtLogin) }));
  ipcMain.handle('desktop:set-auto-launch', (_event, enabled) => ({ autoLaunch: setAutoLaunch(enabled) }));
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
}

function minimizeToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
  if (process.platform === 'win32') tray?.displayBalloon({ title: APP_NAME, content: 'HK-Ai is still running in the background.' });
}

function createTray() {
  const icon = getIcon();
  if (!icon || icon.isEmpty()) return;
  tray = new Tray(icon);
  tray.setToolTip(`${APP_NAME} — AI workspace`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open HK-Ai', click: showWindow },
    { label: 'Run in background', click: minimizeToTray },
    { type: 'separator' },
    { label: 'Exit HK-Ai', click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on('double-click', showWindow);
}

async function confirmClose() {
  if (closePromptInFlight || !mainWindow || mainWindow.isDestroyed()) return;
  closePromptInFlight = true;
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Keep in background', 'Exit completely', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Close HK-Ai',
    message: 'Do you want to exit HK-Ai or keep it running in the background?',
    detail: 'Keeping HK-Ai in the background allows WhatsApp automation and scheduled tasks to continue while the window is hidden.'
  });
  closePromptInFlight = false;
  if (result.response === 0) minimizeToTray();
  else if (result.response === 1) { isQuitting = true; app.quit(); }
}

function createWindow(startHidden = false) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#f8f8f6',
    icon: getIcon(),
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.removeMenu();
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      void confirmClose();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  if (!startHidden) mainWindow.show();
  return mainWindow;
}

async function boot() {
  const startHidden = Boolean(app.getLoginItemSettings().wasOpenedAtLogin);
  startServer();
  await waitForServer();
  const window = createWindow(startHidden);
  await window.loadURL(`http://127.0.0.1:${PORT}`);
  createTray();
  if (startHidden) minimizeToTray();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    exposeIpc();
    void boot().catch((error) => {
      console.error('[HK-Ai Desktop] Boot failed:', error);
      dialog.showErrorBox('HK-Ai could not start', error.message);
      app.quit();
    });
  });
  app.on('window-all-closed', () => {});
  app.on('before-quit', () => {
    isQuitting = true;
    if (serverProcess && !serverProcess.killed) serverProcess.kill();
    if (tray) tray.destroy();
  });
}
