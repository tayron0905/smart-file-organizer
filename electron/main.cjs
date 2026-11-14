const { app, BrowserWindow, dialog, ipcMain, shell, webUtils } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const isDev = !app.isPackaged;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1040,
    minHeight: 720,
    backgroundColor: '#0c0e14',
    title: 'Smart File Organizer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (isDev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function readDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const records = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    try {
      const stat = await fs.stat(fullPath);
      const ext = entry.isDirectory() ? '' : path.extname(entry.name).slice(1).toLowerCase();
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        extension: ext,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
      };
    } catch { return null; }
  }));
  return records.filter(Boolean).sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

ipcMain.handle('folder:choose', async (_event, start) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Ordner zum Organisieren auswählen',
    defaultPath: typeof start === 'string' ? start : os.homedir(),
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('folder:home', () => os.homedir());
ipcMain.handle('folder:list', async (_event, directory) => {
  if (typeof directory !== 'string') throw new Error('Ungültiger Ordner.');
  const stat = await fs.stat(directory);
  if (!stat.isDirectory()) throw new Error('Der ausgewählte Pfad ist kein Ordner.');
  return { path: directory, parent: path.dirname(directory), items: await readDirectory(directory) };
});
ipcMain.handle('folder:create', async (_event, directory) => {
  if (typeof directory !== 'string') throw new Error('Ungültiger Ordner.');
  await fs.mkdir(directory, { recursive: true });
  return directory;
});
ipcMain.handle('file:preview', async (_event, filePath) => {
  if (typeof filePath !== 'string') throw new Error('Ungültige Datei.');
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) return { kind: 'folder', url: null, text: null };
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const size = stat.size;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return { kind: 'image', url: pathToFileURL(filePath).href, text: null };
  if (['mp4', 'webm', 'mov', 'ogg'].includes(ext)) return { kind: 'video', url: pathToFileURL(filePath).href, text: null };
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return { kind: 'audio', url: pathToFileURL(filePath).href, text: null };
  if (['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'yml', 'yaml', 'log', 'csv', 'sh', 'py', 'java', 'c', 'cpp'].includes(ext) && size < 512 * 1024) {
    return { kind: 'text', url: null, text: await fs.readFile(filePath, 'utf8') };
  }
  return { kind: 'file', url: null, text: null };
});
ipcMain.handle('file:move', async (_event, source, targetDirectory) => {
  if (typeof source !== 'string' || typeof targetDirectory !== 'string') throw new Error('Ungültiger Dateipfad.');
  const target = path.join(targetDirectory, path.basename(source));
  if (source === target) return { moved: false, reason: 'same' };
  try { await fs.access(target); return { moved: false, reason: 'exists', target }; }
  catch { /* target is free */ }
  await fs.rename(source, target).catch(async (error) => {
    if (error.code !== 'EXDEV') throw error;
    await fs.cp(source, target, { recursive: true, errorOnExist: true });
    await fs.rm(source, { recursive: true, force: true });
  });
  return { moved: true, target };
});
ipcMain.handle('file:drop-paths', (_event, files) => files.map((file) => webUtils.getPathForFile(file)));
ipcMain.handle('file:open', async (_event, filePath) => {
  if (typeof filePath !== 'string') return;
  await shell.openPath(filePath);
});
