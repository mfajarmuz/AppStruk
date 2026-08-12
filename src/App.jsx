import React, { useState, useEffect } from 'react';
import { Fuel, FileCode, Printer, CheckCircle2 } from 'lucide-react';
import ReceiptForm from './components/ReceiptForm';
import ReceiptPreview from './components/ReceiptPreview';
import TemplateEditor from './components/TemplateEditor';
import PrinterConfig from './components/PrinterConfig';
import { DEFAULT_PERTAMINA_TEMPLATE } from './data/defaultTemplate';

const INITIAL_FORM_DATA = {
  noSpbu: '34.46125',
  namaSpbu: 'SPBU Sukaraja',
  alamat: 'Jl. Raya Sukaraja No. 88',
  shift: '1',
  noTrans: 'TRX-99823',
  waktu: '12/08/2026 09:15:00',
  pompa: '02',
  namaProduk: 'PERTAMAX',
  hargaLiter: '12.900',
  volume: '15.50',
  totalHarga: '199.950',
  operator: 'Budi',
  metodeBayar: 'CASH',
  platNo: 'B 1234 ABC'
};

export default function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('thermal_form_data');
    return saved ? JSON.parse(saved) : INITIAL_FORM_DATA;
  });
  const [template, setTemplate] = useState(() => {
    const saved = localStorage.getItem('thermal_template_data');
    return saved ? JSON.parse(saved) : DEFAULT_PERTAMINA_TEMPLATE;
  });
  const [printerSettings, setPrinterSettings] = useState(() => {
    const saved = localStorage.getItem('thermal_printer_settings');
    return saved ? JSON.parse(saved) : { printerName: '', paperWidth: 58, paperMargin: 2, fontSize: 7.5, silentPrint: true };
  });

  const [notice, setNotice] = useState('');

  useEffect(() => {
    localStorage.setItem('thermal_form_data', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem('thermal_template_data', JSON.stringify(template));
  }, [template]);

  useEffect(() => {
    localStorage.setItem('thermal_printer_settings', JSON.stringify(printerSettings));
  }, [printerSettings]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const handlePrint = async (htmlContent, widthMm) => {
    try {
      if (window.electronAPI && window.electronAPI.printReceipt) {
        const res = await window.electronAPI.printReceipt({
          html: htmlContent,
          paperWidthMm: widthMm || printerSettings.paperWidth || 58,
          settings: printerSettings
        });
        if (res?.success) {
          showNotice('✓ Struk berhasil dicetak ke printer!');
          return res;
        } else {
          alert(`Gagal mencetak: ${res?.error || 'Unknown error'}`);
        }
      } else {
        // Web Fallback Print
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.write(`<html><head><title>Struk Thermal</title></head><body>${htmlContent}</body></html>`);
          printWin.document.close();
          printWin.print();
        }
      }
    } catch (err) {
      console.error('Print Error:', err);
      alert(`Gagal mencetak: ${err.message}`);
    }
  };

  const handleTestPrint = async () => {
    const testHtml = `<div style="text-align:center; font-weight:bold;">TEST PRINTER THERMAL ${printerSettings.paperWidth}mm</div><div style="border-top:1px dashed #000; margin:6px 0;"></div><div>Tanggal: ${new Date().toLocaleString('id-ID')}</div><div>Status : PRINTER NORMAL & READY</div><div style="border-top:1px dashed #000; margin:6px 0;"></div>`;
    return await handlePrint(testHtml, printerSettings.paperWidth);
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="app-logo">
          <Fuel size={24} style={{ color: 'var(--accent-blue)' }} />
          <span>ThermalStruk BBM <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>v2.0 Clean</span></span>
        </div>

        <nav className="app-nav">
          <button className={`nav-tab ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>
            <Fuel size={16} /> Cetak Struk Transaksi
          </button>
          <button className={`nav-tab ${activeTab === 'template' ? 'active' : ''}`} onClick={() => setActiveTab('template')}>
            <FileCode size={16} /> Editor Template
          </button>
          <button className={`nav-tab ${activeTab === 'printer' ? 'active' : ''}`} onClick={() => setActiveTab('printer')}>
            <Printer size={16} /> Pengaturan Printer
          </button>
        </nav>
      </header>

      {/* Notification Badge */}
      {notice && (
        <div style={{ background: 'var(--accent-emerald)', color: '#ffffff', padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {notice}
        </div>
      )}

      {/* Main Content Area */}
      <main className="app-main">
        {activeTab === 'form' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
            <ReceiptForm formData={formData} setFormData={setFormData} onResetToDefault={() => setFormData(INITIAL_FORM_DATA)} />
            <ReceiptPreview template={template} formData={formData} printerSettings={printerSettings} onPrint={handlePrint} />
          </div>
        )}

        {activeTab === 'template' && (
          <TemplateEditor template={template} setTemplate={setTemplate} />
        )}

        {activeTab === 'printer' && (
          <PrinterConfig printerSettings={printerSettings} setPrinterSettings={setPrinterSettings} onTestPrint={handleTestPrint} />
        )}
      </main>
    </div>
  );
}
