const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (htmlData, printerName, settings) => 
    ipcRenderer.invoke('print-receipt', { htmlData, printerName, settings }),
  
  saveData: (key, value) => ipcRenderer.invoke('save-data', { key, value }),
  loadData: (key) => ipcRenderer.invoke('load-data', key),

  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  isElectron: true
});
