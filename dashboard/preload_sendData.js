const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendInputData: (obj) => ipcRenderer.send('inputData', obj),
    getData: (obj) => ipcRenderer.on('loadData', obj),
    getResX: (resX) => ipcRenderer.on('screenResX', resX),
    getResY: (resY) => ipcRenderer.on('screenResY', resY)
});