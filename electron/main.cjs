const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

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
      '.ico': 'image/x-icon'
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
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      localServerUrl = `http://127.0.0.1:${port}`;
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
    title: 'ThermalStruk BBM v2.0',
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

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

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

// IPC: Scan connected Windows printers
ipcMain.handle('get-printers', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map(p => ({
        name: p.name,
        isDefault: p.isDefault,
        status: p.status
      }));
    }
  } catch (err) {
    console.error('Error fetching printers:', err);
  }
  return [];
});

// IPC: Print thermal receipt directly with native vector text
ipcMain.handle('print-receipt', async (event, { html, paperWidthMm = 58, settings = {} }) => {
  return new Promise((resolve) => {
    let printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const printerName = settings?.printerName || '';
    const isSilent = settings?.silentPrint !== undefined ? settings.silentPrint : true;
    const fontSizeVal = settings?.fontSize ? `${settings.fontSize}pt` : '13pt';

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
              font-family: 'FontA', 'ESC-POS-FontA', 'GB18030', 'Lucida Console', 'Consolas', 'Courier New', monospace !important;
              font-size: ${fontSizeVal} !important;
              font-weight: 500 !important;
              line-height: 1.25 !important;
              letter-spacing: -0.3px !important;
              color: #000000 !important;
              background: #ffffff !important;
              -webkit-font-smoothing: none !important;
              font-smooth: never !important;
              text-rendering: geometricPrecision !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              box-sizing: border-box;
              -webkit-font-smoothing: none !important;
              font-smooth: never !important;
              text-rendering: geometricPrecision !important;
            }
            .receipt-wrapper {
              width: 48mm !important;
              max-width: 48mm !important;
              margin-left: 5mm !important;
              margin-right: auto !important;
              padding: 0 1mm !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'FontA', 'ESC-POS-FontA', 'GB18030', 'Lucida Console', 'Consolas', 'Courier New', monospace !important;
              font-size: ${fontSizeVal} !important;
              font-weight: 500 !important;
              line-height: 1.25 !important;
              letter-spacing: -0.3px !important;
              box-sizing: border-box !important;
            }
            img, svg {
              max-width: 70% !important;
              height: auto !important;
              display: block !important;
              margin: 0 auto 4px auto !important;
              image-rendering: pixelated !important;
              image-rendering: crisp-edges !important;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

    printWindow.webContents.on('did-finish-load', () => {
      const printOptions = {
        silent: isSilent,
        printBackground: true,
        deviceName: printerName || '',
        margins: { marginType: 'none' },
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
