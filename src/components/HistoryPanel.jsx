import React, { useState } from 'react';
import { History, Search, Printer, Trash2, ArrowUpRight } from 'lucide-react';

export default function HistoryPanel({ history, setHistory, onLoadReceipt, onPrintReceipt }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = (history || []).filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.transactionNo || '').toLowerCase().includes(term) ||
      (item.platNo || '').toLowerCase().includes(term) ||
      (item.fuelName || '').toLowerCase().includes(term) ||
      (item.spbuName || '').toLowerCase().includes(term)
    );
  });

  const handleDelete = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Hapus seluruh riwayat cetak transaksi BBM?')) {
      setHistory([]);
    }
  };

  return (
    <div className="scrollable-panel">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title" style={{ margin: 0 }}>
            <History size={20} className="text-cyan" />
            <span>Riwayat Transaksi Struk BBM</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px' }}
                placeholder="Cari Plat / Struk / BBM..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {history.length > 0 && (
              <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={16} /> Hapus Semua
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            Belum ada riwayat transaksi yang tersimpan.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Tanggal / Waktu</th>
                <th>BBM</th>
                <th>Liter</th>
                <th>Total (Rp)</th>
                <th>Plat No</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{item.transactionNo}</td>
                  <td style={{ fontSize: '0.8rem' }}>{item.dateTime}</td>
                  <td>{item.fuelName}</td>
                  <td style={{ fontWeight: 600 }}>{parseFloat(item.liter || 0).toFixed(2)} L</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    Rp {Number(item.totalAmount || 0).toLocaleString('id-ID')}
                  </td>
                  <td>{item.platNo || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        title="Muat ke Form Struk"
                        onClick={() => onLoadReceipt(item)}
                      >
                        <ArrowUpRight size={14} /> Buka
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 10px' }}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
