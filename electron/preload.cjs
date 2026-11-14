const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('organizer', {
  chooseFolder: (start) => ipcRenderer.invoke('folder:choose', start),
  home: () => ipcRenderer.invoke('folder:home'),
  listFolder: (folder) => ipcRenderer.invoke('folder:list', folder),
  createFolder: (folder) => ipcRenderer.invoke('folder:create', folder),
  previewFile: (file) => ipcRenderer.invoke('file:preview', file),
  moveFile: (source, target) => ipcRenderer.invoke('file:move', source, target),
  pathsForDroppedFiles: (files) => ipcRenderer.invoke('file:drop-paths', files),
  openPath: (file) => ipcRenderer.invoke('file:open', file),
});
