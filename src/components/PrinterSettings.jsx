import React, { useState } from 'react';
import { Printer, RefreshCw, CheckCircle, Sliders, Play, AlertCircle } from 'lucide-react';

export default function PrinterSettings({
  printers,
  selectedPrinter,
  setSelectedPrinter,
  printerSettings,
  setPrinterSettings,
  onRefreshPrinters,
  onTestPrint
}) {
  const [testSuccess, setTestSuccess] = useState(false);

  const handleRunTestPrint = async () => {
    setTestSuccess(false);
    const res = await onTestPrint();
    if (res?.success) {
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    }
  };

  return (
    <div className="scrollable-panel">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ margin: 0 }}>
            <Printer size={20} className="text-blue" />
            <span>Pengaturan Printer VSC-MP58X & Thermal POS</span>
          </div>

          <button className="btn btn-secondary" onClick={onRefreshPrinters}>
            <RefreshCw size={16} /> Pindai Printer Windows
          </button>
        </div>
      </div>

      {/* Printer Selector */}
      <div className="card">
        <div className="card-title">
          <Sliders size={18} /> Pilih Target Printer VSC-MP58X
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Printer Terdeteksi di Sistem Windows</label>
          <select
            className="form-select"
            style={{ fontSize: '1rem', padding: '12px' }}
            value={selectedPrinter}
            onChange={e => setSelectedPrinter(e.target.value)}
          >
            <option value="">-- Pilih Printer (VSC-MP58X / POS-58) --</option>
            {printers.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} {p.isDefault ? '(Default Windows)' : ''}
              </option>
            ))}
          </select>
        </div>

        {printers.length === 0 && (
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center', color: '#fbbf24', fontSize: '0.85rem' }}>
            <AlertCircle size={18} />
            <span>
              Belum ada printer yang terdeteksi. Hubungkan printer VSC-MP58X Anda via USB / Bluetooth POS Driver lalu klik tombol <b>Pindai Printer Windows</b>.
            </span>
          </div>
        )}
      </div>

      {/* Printing Parameters */}
      <div className="card">
        <div className="card-title">
          Paramater Cetak Thermal 58mm
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Lebar Kertas Thermal (mm)</label>
            <select
              className="form-select"
              value={printerSettings.paperWidth || 58}
              onChange={e => setPrinterSettings({ ...printerSettings, paperWidth: parseInt(e.target.value) })}
            >
              <option value={58}>58 mm (VSC-MP58X Standard)</option>
              <option value={80}>80 mm (Printer POS Besar)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ukuran Font Struk (pt)</label>
            <select
              className="form-select"
              value={printerSettings.fontSize || 7.5}
              onChange={e => setPrinterSettings({ ...printerSettings, fontSize: parseFloat(e.target.value) })}
            >
              <option value={7.0}>7.0 pt (★ Ekstra Presisi 58mm - Muat 42 Karakter/Baris)</option>
              <option value={7.5}>7.5 pt (★ Standar Ideal VSC-MP58X - 100% Identik Live Preview)</option>
              <option value={8.0}>8.0 pt (Sedang - Ringkas & Clear)</option>
              <option value={8.5}>8.5 pt (Agak Besar)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mode Cetak (Silent Print)</label>
            <select
              className="form-select"
              value={printerSettings.silentPrint !== false ? 'true' : 'false'}
              onChange={e => setPrinterSettings({ ...printerSettings, silentPrint: e.target.value === 'true' })}
            >
              <option value="true">Silent Print Direct (Langsung Cetak)</option>
              <option value="false">Tampilkan Dialog Print Windows</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-primary btn-lg" onClick={handleRunTestPrint}>
            <Play size={18} /> Test Print ke VSC-MP58X
          </button>

          {testSuccess && (
            <div style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <CheckCircle size={18} /> Struk Percobaan Berhasil Dikirim ke Printer!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
