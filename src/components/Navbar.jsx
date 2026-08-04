import React from 'react';
import { Fuel, Printer, LayoutTemplate, History, DollarSign, Settings } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, selectedPrinter, printers }) {
  const isPrinterReady = selectedPrinter && printers.some(p => p.name === selectedPrinter);

  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Fuel size={24} />
        </div>
        <div>
          <div className="brand-title">ThermalStruk BBM</div>
          <div className="brand-subtitle">VSC-MP58X Printer Ready</div>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          <Printer size={16} />
          <span>Buat Struk</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <LayoutTemplate size={16} />
          <span>Template Struk</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'fuels' ? 'active' : ''}`}
          onClick={() => setActiveTab('fuels')}
        >
          <DollarSign size={16} />
          <span>Harga BBM</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>Riwayat</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} />
          <span>Printer</span>
        </button>
      </nav>

      <div className="printer-status-badge">
        <div className={`status-dot ${isPrinterReady ? '' : 'offline'}`} style={{ backgroundColor: isPrinterReady ? '#10b981' : '#f59e0b' }} />
        <span>{selectedPrinter ? (selectedPrinter.length > 18 ? selectedPrinter.substring(0, 18) + '...' : selectedPrinter) : 'Belum Ada Printer'}</span>
      </div>
    </header>
  );
}
