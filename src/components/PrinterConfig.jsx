import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw, CheckCircle, Play } from 'lucide-react';

export default function PrinterConfig({ printerSettings, setPrinterSettings, onTestPrint }) {
  const [printers, setPrinters] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const fetchPrinters = async () => {
    setIsScanning(true);
    try {
      if (window.electronAPI && window.electronAPI.getPrinters) {
        const list = await window.electronAPI.getPrinters();
        setPrinters(list || []);
      }
    } catch (err) {
      console.error('Failed to scan printers:', err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const handleTestPrint = async () => {
    if (onTestPrint) {
      const res = await onTestPrint();
      if (res?.success) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 4000);
      }
    }
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)' }}>
          <Printer size={20} /> Pengaturan Printer Thermal Windows
        </h2>
        <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={fetchPrinters} disabled={isScanning}>
          <RefreshCw size={14} className={isScanning ? 'spin' : ''} /> Pindai Printer
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Pilih Device Printer Windows</label>
          <select
            className="form-select"
            value={printerSettings.printerName || ''}
            onChange={e => setPrinterSettings({ ...printerSettings, printerName: e.target.value })}
          >
            <option value="">-- Gunakan Default Printer Windows --</option>
            {printers.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} {p.isDefault ? '(Default Windows)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Lebar Kertas Thermal</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className={`pill-btn ${printerSettings.paperWidth === 58 ? 'active' : ''}`} style={{ flex: 1, padding: '8px' }}
              onClick={() => setPrinterSettings({ ...printerSettings, paperWidth: 58 })}>
              58 mm (Standard POS)
            </button>
            <button type="button" className={`pill-btn ${printerSettings.paperWidth === 80 ? 'active' : ''}`} style={{ flex: 1, padding: '8px' }}
              onClick={() => setPrinterSettings({ ...printerSettings, paperWidth: 80 })}>
              80 mm (Large POS)
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ukuran Font Thermal (pt)</label>
          <select
            className="form-select"
            value={printerSettings.fontSize || 7.5}
            onChange={e => setPrinterSettings({ ...printerSettings, fontSize: parseFloat(e.target.value) })}
          >
            <option value={7.0}>7.0 pt (Kecil Presisi)</option>
            <option value={7.5}>7.5 pt (Standar Ideal 58mm)</option>
            <option value={8.0}>8.0 pt (Sedang)</option>
            <option value={8.5}>8.5 pt (Besar)</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" className="btn btn-primary" onClick={handleTestPrint}>
          <Play size={16} /> Test Cetak Struk Percobaan
        </button>

        {testSuccess && (
          <div style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <CheckCircle size={18} /> Struk percobaan berhasil dikirim ke printer!
          </div>
        )}
      </div>
    </div>
  );
}
