const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hkAiDesktop', {
  isDesktop: true,
  getSettings: () => ipcRenderer.invoke('desktop:get-settings'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('desktop:set-auto-launch', Boolean(enabled))
});
