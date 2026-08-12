import React from 'react';
import { Fuel, RefreshCw, Clock, MapPin, Hash, DollarSign, User } from 'lucide-react';

const BBM_PRODUCTS = [
  { name: 'PERTALITE', price: 10000 },
  { name: 'PERTAMAX', price: 12900 },
  { name: 'PERTAMAX TURBO', price: 14400 },
  { name: 'PERTAMINA DEX', price: 15100 },
  { name: 'DEXLITE', price: 14550 },
  { name: 'SOLAR', price: 6800 },
];

export default function ReceiptForm({ formData, setFormData, onResetToDefault }) {
  const handleChange = (field, val) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      
      if (field === 'hargaLiter' || field === 'volume') {
        const h = parseFloat(field === 'hargaLiter' ? val : prev.hargaLiter) || 0;
        const v = parseFloat(field === 'volume' ? val : prev.volume) || 0;
        if (h > 0 && v > 0) {
          next.totalHarga = Math.round(h * v).toLocaleString('id-ID');
        }
      }
      return next;
    });
  };

  const handleProductSelect = (prod) => {
    setFormData(prev => {
      const h = prod.price;
      const v = parseFloat(prev.volume) || 0;
      return {
        ...prev,
        namaProduk: prod.name,
        hargaLiter: prod.price.toString(),
        totalHarga: (v > 0 && h > 0) ? Math.round(h * v).toLocaleString('id-ID') : prev.totalHarga
      };
    });
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    handleChange('waktu', `${dateStr} ${timeStr}`);
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)' }}>
          <Fuel size={20} /> Form Transaksi BBM
        </h2>
        <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={onResetToDefault}>
          <RefreshCw size={14} /> Reset Form
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Hash size={14} /> No. SPBU
          </label>
          <input type="text" className="form-input" value={formData.noSpbu || ''} onChange={e => handleChange('noSpbu', e.target.value)} placeholder="Contoh: 34.46125" />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} /> Nama SPBU
          </label>
          <input type="text" className="form-input" value={formData.namaSpbu || ''} onChange={e => handleChange('namaSpbu', e.target.value)} placeholder="Contoh: SPBU Sukaraja" />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Alamat SPBU</label>
          <input type="text" className="form-input" value={formData.alamat || ''} onChange={e => handleChange('alamat', e.target.value)} placeholder="Jl. Raya Sukaraja No. 88" />
        </div>

        <div className="form-group">
          <label className="form-label">Shift</label>
          <input type="text" className="form-input" value={formData.shift || ''} onChange={e => handleChange('shift', e.target.value)} placeholder="1" />
        </div>

        <div className="form-group">
          <label className="form-label">No. Transaksi</label>
          <input type="text" className="form-input" value={formData.noTrans || ''} onChange={e => handleChange('noTrans', e.target.value)} placeholder="TRX-99823" />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Waktu & Tanggal</span>
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.75rem' }} onClick={handleSetCurrentTime}>
              [Ganti Waktu Sekarang]
            </button>
          </label>
          <input type="text" className="form-input" value={formData.waktu || ''} onChange={e => handleChange('waktu', e.target.value)} placeholder="12/08/2026 09:15:00" />
        </div>

        <div className="form-group">
          <label className="form-label">Pulau / Pompa</label>
          <input type="text" className="form-input" value={formData.pompa || ''} onChange={e => handleChange('pompa', e.target.value)} placeholder="02" />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Pilih Produk BBM</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {BBM_PRODUCTS.map(p => (
              <button
                key={p.name} type="button"
                className={`pill-btn ${formData.namaProduk === p.name ? 'active' : ''}`}
                onClick={() => handleProductSelect(p)}
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              >
                {p.name} (Rp {p.price.toLocaleString('id-ID')})
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Harga / Liter (Rp)</label>
          <input type="text" className="form-input" value={formData.hargaLiter || ''} onChange={e => handleChange('hargaLiter', e.target.value)} placeholder="12.900" />
        </div>

        <div className="form-group">
          <label className="form-label">Volume (Liter)</label>
          <input type="text" className="form-input" value={formData.volume || ''} onChange={e => handleChange('volume', e.target.value)} placeholder="15.50" />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label" style={{ color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <DollarSign size={14} /> Total Harga (Rp)
          </label>
          <input type="text" className="form-input" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-emerald)' }}
            value={formData.totalHarga || ''} onChange={e => handleChange('totalHarga', e.target.value)} placeholder="199.950" />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={14} /> Operator
          </label>
          <input type="text" className="form-input" value={formData.operator || ''} onChange={e => handleChange('operator', e.target.value)} placeholder="Budi" />
        </div>

        <div className="form-group">
          <label className="form-label">Metode Bayar</label>
          <select className="form-select" value={formData.metodeBayar || 'CASH'} onChange={e => handleChange('metodeBayar', e.target.value)}>
            <option value="CASH">CASH / TUNAI</option>
            <option value="QRIS">QRIS / MYPERTAMINA</option>
            <option value="DEBIT">DEBIT / MANDIRI / BCA</option>
          </select>
        </div>
      </div>
    </div>
  );
}
