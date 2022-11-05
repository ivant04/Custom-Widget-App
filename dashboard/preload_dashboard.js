const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendInputData: (obj) => ipcRenderer.send('inputData', obj),
    minimizeWindow: (val) => ipcRenderer.send('minimizeWin', val),
    closeWindow: (val) => ipcRenderer.send('closeWin', val),
    openGit: (val) => ipcRenderer.send('openGitHub', val),
    getData: (obj) => ipcRenderer.on('loadData', obj),
    getResX: (resX) => ipcRenderer.on('screenResX', resX),
    getResY: (resY) => ipcRenderer.on('screenResY', resY),
    getNewSize: (obj) => ipcRenderer.on('resizeEvent', obj),
    getNewPos: (obj) => ipcRenderer.on('moveEvent', obj)
});