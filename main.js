const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const buildInfo = require('./build-info');

const REMOTE_VERSION_URL =
  'https://raw.githubusercontent.com/HeapsEntertainment/Script2Shot/main/version.json';
const GITHUB_RAW_ROOT =
  'https://raw.githubusercontent.com/HeapsEntertainment/Script2Shot/main/';
const USER_DOCS_DIR = path.join(app.getPath('userData'), 'docs-cache');
const DEFAULT_DOC_PATHS = [
  'README.md',
  'docs/01-tutorials.md',
  'docs/02-tools.md',
  'docs/03-file management.md',
  'docs/04-app integrations.md'
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Script2Shot-Updater' } }, (res) => {
        if ([301, 302].includes(res.statusCode) && res.headers.location) {
          return fetchText(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => resolve(raw));
      })
      .on('error', reject);
  });
}

async function fetchJson(url) {
  const raw = await fetchText(url);
  return JSON.parse(raw);
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Script2Shot-Updater' } }, (res) => {
        // Follow GitHub release redirects (301 / 302)
        if ([301, 302].includes(res.statusCode) && res.headers.location) {
          return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(destPath)));
      })
      .on('error', reject);
  });
}

async function syncDocsFromGitHub() {
  try {
    const manifestRaw = await fetchText(
      `${GITHUB_RAW_ROOT}docs-manifest.json?t=${Date.now()}`
    );
    const manifest = JSON.parse(manifestRaw);
    const files = Array.isArray(manifest.files) && manifest.files.length > 0
      ? manifest.files
      : DEFAULT_DOC_PATHS;

    for (const relPath of files) {
      const encodedPath = relPath
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');

      const content = await fetchText(`${GITHUB_RAW_ROOT}${encodedPath}?t=${Date.now()}`);
      const localTarget = path.join(USER_DOCS_DIR, ...relPath.split('/'));

      fs.mkdirSync(path.dirname(localTarget), { recursive: true });
      fs.writeFileSync(localTarget, content, 'utf8');
    }

    fs.mkdirSync(USER_DOCS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(USER_DOCS_DIR, 'docs-manifest.json'),
      JSON.stringify({ files }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.warn('Docs sync skipped:', err.message);
  }
}

async function checkForUpdate(parentWindow) {
  if (!app.isPackaged) return;

  try {
    const remote = await fetchJson(REMOTE_VERSION_URL);
    if (!remote.lastUpdated || remote.lastUpdated === buildInfo.lastUpdated) {
      return;
    }

    const result = await dialog.showMessageBox(parentWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A newer Script2Shot build (${remote.lastUpdated}) is available.`,
      detail: remote.notes || 'Download and run the installer now?',
      buttons: ['Update Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response !== 0 || !remote.installerUrl) return;

    const installerPath = path.join(app.getPath('temp'), 'Script2Shot-Update.exe');
    await downloadFile(remote.installerUrl, installerPath);
    await shell.openPath(installerPath);
    app.quit();
  } catch (err) {
    console.warn('Update check skipped:', err.message);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: '#111113',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 's2sicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  return mainWindow;
}

ipcMain.handle('load-docs', async () => {
  await syncDocsFromGitHub();

  let files = DEFAULT_DOC_PATHS;
  const cachedManifest = path.join(USER_DOCS_DIR, 'docs-manifest.json');
  if (fs.existsSync(cachedManifest)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cachedManifest, 'utf8'));
      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        files = parsed.files;
      }
    } catch (_) {}
  }

  return files.map((relPath) => {
    const cachedFile = path.join(USER_DOCS_DIR, ...relPath.split('/'));
    const bundledFile = path.join(__dirname, ...relPath.split('/'));
    const chosenPath = fs.existsSync(cachedFile)
      ? cachedFile
      : (fs.existsSync(bundledFile) ? bundledFile : null);

    return {
      relPath,
      content: chosenPath ? fs.readFileSync(chosenPath, 'utf8') : ''
    };
  });
});

// Native Save As Dialog
ipcMain.handle('dialog:save-project', async (event, defaultName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePath } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: [
      { name: 'Script2Shot Project (*.s2s)', extensions: ['s2s'] },
      { name: 'JSON Backup (*.json)', extensions: ['json'] }
    ]
  });
  return filePath;
});

// Native Open File Dialog
ipcMain.handle('dialog:open-project', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Project or Screenplay',
    properties: ['openFile'],
    filters: [
      { name: 'Script2Shot Project (*.s2s)', extensions: ['s2s', 'json'] }
    ]
  });
  return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
});

// Native PDF Export via a Hidden Offscreen Window
ipcMain.handle('dialog:export-pdf', async (event, exportData) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export Shotlist PDF',
    defaultPath: exportData.defaultFileName || 'shotlist.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return { canceled: true };

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const branding = exportData.branding || {};

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; }
        .header-box { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
        .brand-banner { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; color: #111; }
        .meta { display: flex; justify-content: space-between; font-size: 9pt; color: #333; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; vertical-align: top; color: #111; }
        th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; }
        .scene-header { background: #e2e8f0; font-weight: bold; color: #0f172a; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div class="brand-banner">
          <h1>PRODUCTION SHOTLIST</h1>
          <span style="font-size: 10pt; font-weight: bold; color: #b45309;">${branding.logoText || ''}</span>
        </div>
        <div style="font-size: 9pt; color: #475569; font-weight: 500; margin-bottom: 4px;">
          ${branding.company ? '<strong>Studio:</strong> ' + branding.company + ' &nbsp;|&nbsp; ' : ''}
          ${branding.tagline ? '<em>' + branding.tagline + '</em>' : ''}
        </div>
        <div class="meta">
          <span><strong>Project:</strong> ${exportData.projectTitle} (${exportData.formatLabel})</span>
          <span><strong>Director:</strong> ${exportData.director} &nbsp;|&nbsp; <strong>Producer:</strong> ${exportData.producer} &nbsp;|&nbsp; <strong>Scenes:</strong> ${exportData.sceneCount} &nbsp;|&nbsp; <strong>Shots:</strong> ${exportData.shotCount}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="center" style="width: 6%;">Scene</th>
            <th style="width: 7%;">Shot #</th>
            <th style="width: 9%;">Size</th>
            <th style="width: 9%;">Angle</th>
            <th style="width: 9%;">Movement</th>
            <th style="width: 8%;">Lens / Field</th>
            <th style="width: 10%;">Subject / Cast</th>
            <th style="width: 22%;">Description / Action</th>
            <th style="width: 12%;">Audio / V.O. Notes</th>
            <th class="center" style="width: 4%;">Screen</th>
            <th class="center" style="width: 4%;">Shoot</th>
          </tr>
        </thead>
        <tbody>
          ${exportData.tableRowsHTML}
        </tbody>
      </table>
    </body>
    </html>
  `;

  try {
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    const pdfBuffer = await printWin.webContents.printToPDF({
      landscape: true,
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    fs.writeFileSync(filePath, pdfBuffer);
    printWin.destroy();
    return { canceled: false, filePath };
  } catch (err) {
    printWin.destroy();
    return { canceled: false, error: err.message };
  }
});

// Native Stripboard Export Dialog
ipcMain.handle('dialog:export-stripboard', async (event, exportData) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const ext = exportData.defaultFileName.endsWith('.xls') ? 'xls' : 'csv';
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export Stripboard',
    defaultPath: exportData.defaultFileName || 'stripboard.csv',
    filters: [
      ext === 'xls'
        ? { name: 'Excel Workbook (*.xls)', extensions: ['xls'] }
        : { name: 'CSV File (*.csv)', extensions: ['csv'] }
    ]
  });

  if (canceled || !filePath) return { canceled: true };

  try {
    fs.writeFileSync(filePath, exportData.fileContent, 'utf8');
    return { canceled: false, filePath };
  } catch (err) {
    return { canceled: false, error: err.message };
  }
});

// Native Stripboard CSV Export Dialog
ipcMain.handle('dialog:export-stripboard-csv', async (event, exportData) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export Stripboard CSV',
    defaultPath: exportData.defaultFileName || 'stripboard.csv',
    filters: [{ name: 'CSV File', extensions: ['csv'] }]
  });

  if (canceled || !filePath) return { canceled: true };

  try {
    fs.writeFileSync(filePath, exportData.csvContent, 'utf8');
    return { canceled: false, filePath };
  } catch (err) {
    return { canceled: false, error: err.message };
  }
});

app.whenReady().then(() => {
  const mainWindow = createWindow();
  checkForUpdate(mainWindow);
  syncDocsFromGitHub();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow();
      checkForUpdate(win);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});