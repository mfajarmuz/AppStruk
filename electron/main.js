const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    title: 'Cetak Struk BBM VSC-MP58X',
    icon: path.join(__dirname, '../public/favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Remove default menu bar for clean app look
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
    const isSilent = settings?.silentPrint !== undefined ? settings.silentPrint : true;

    // Standard 58mm printer page styling HTML string wrapper
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
              width: ${paperWidthMm}mm;
              font-family: 'Courier New', Courier, 'Consolas', monospace;
              font-size: 12.5pt;
              line-height: 1.35;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            .receipt-wrapper {
              width: ${paperWidthMm}mm !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, 'Consolas', monospace !important;
              font-size: 12.5pt !important;
              line-height: 1.35 !important;
              transform: none !important;
              margin: 0 !important;
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
        }
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
