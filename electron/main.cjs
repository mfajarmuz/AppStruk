const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const http = require('http');

// Disable GPU cache access issues on some Windows environments
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;
let localServerUrl = '';

function startLocalServer() {
  return new Promise((resolve) => {
    const distFolder = path.join(__dirname, '../dist');
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };

    const server = http.createServer((req, res) => {
      let reqUrl = req.url.split('?')[0];
      let safePath = path.normalize(reqUrl);
      if (safePath === '/' || safePath === '\\') safePath = '/index.html';
      
      let filePath = path.join(distFolder, safePath);
      
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distFolder, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Server Error');
        } else {
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(content);
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      localServerUrl = `http://127.0.0.1:${port}`;
      console.log(`Local HTTP server running at ${localServerUrl}`);
      resolve(localServerUrl);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    title: 'Cetak Struk BBM VSC-MP58X',
    icon: path.join(__dirname, '../public/favicon.svg'),
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  
  if (localServerUrl) {
    mainWindow.loadURL(localServerUrl);
  } else if (fs.existsSync(distPath)) {
    startLocalServer().then(url => mainWindow.loadURL(url));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Enable F12 key to toggle DevTools if needed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.on('crashed', (e) => {
    console.error('Electron webContents crashed:', e);
  });

  mainWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
    console.error('Electron did-fail-load:', errorCode, errorDescription);
  });

  // Force window focus on launch
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Remove default menu bar for clean desktop look
  mainWindow.setMenuBarVisibility(false);
}

// Data Storage Path
const getDataFilePath = () => path.join(app.getPath('userData'), 'app_data.json');

function readStoreData() {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading store data:', err);
  }
  return {};
}

function writeStoreData(data) {
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store data:', err);
  }
}

// IPC Handlers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers;
  } catch (err) {
    console.error('Failed to get printers:', err);
    return [];
  }
});

ipcMain.handle('save-data', async (event, { key, value }) => {
  const store = readStoreData();
  store[key] = value;
  writeStoreData(store);
  return { success: true };
});

ipcMain.handle('load-data', async (event, key) => {
  const store = readStoreData();
  return store[key] !== undefined ? store[key] : null;
});

ipcMain.handle('print-receipt', async (event, { htmlData, printerName, settings }) => {
  return new Promise((resolve) => {
    let printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const paperWidthMm = settings?.paperWidth || 58;
    const printableWidthMm = paperWidthMm === 58 ? 48 : 72;
    const isSilent = settings?.silentPrint !== undefined ? settings.silentPrint : false;

    // Standard 58mm POS thermal printer page styling HTML string wrapper
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            @page {
              margin: 0;
              size: ${paperWidthMm}mm auto;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: ${printableWidthMm}mm;
              font-family: 'Courier New', Courier, 'Consolas', monospace;
              font-size: 8.5pt;
              line-height: 1.2;
              letter-spacing: -0.2px;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            .receipt-wrapper {
              width: ${printableWidthMm}mm !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, 'Consolas', monospace !important;
              font-size: 8.5pt !important;
              line-height: 1.2 !important;
              letter-spacing: -0.2px !important;
              transform: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            span {
              display: inline-block;
              transform-origin: left center;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            hr {
              border: none;
              border-top: 1px dashed #000;
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          ${htmlData}
        </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

    printWindow.webContents.on('did-finish-load', () => {
      const printOptions = {
        silent: isSilent,
        printBackground: true,
        deviceName: printerName || '',
        margins: {
          marginType: 'none'
        },
        pageSize: {
          width: paperWidthMm * 1000,
          height: 200000
        },
        scaleFactor: 100
      };

      if (!printerName) {
        delete printOptions.deviceName;
      }

      printWindow.webContents.print(printOptions, (success, failureReason) => {
        printWindow.close();
        printWindow = null;
        if (success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: failureReason });
        }
      });
    });
  });
});

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    name: 'Cetak Struk BBM VSC-MP58X'
  };
});

app.whenReady().then(async () => {
  const distPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(distPath)) {
    await startLocalServer();
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
