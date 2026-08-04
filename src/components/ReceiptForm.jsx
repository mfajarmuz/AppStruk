import React from 'react';
import { Fuel, Clock, RefreshCw, LayoutTemplate, Image } from 'lucide-react';

export default function ReceiptForm({
  formData,
  setFormData,
  fuels,
  templates,
  selectedTemplateId,
  setSelectedTemplateId
}) {
  const handleFuelSelect = (fuelId) => {
    const selectedFuel = fuels.find(f => f.id === fuelId);
    if (!selectedFuel) return;

    const price = selectedFuel.price;
    const currentAmount = formData.totalAmount || 300000;
    const calculatedLiter = price > 0 ? parseFloat((currentAmount / price).toFixed(2)) : 0;

    setFormData(prev => ({
      ...prev,
      fuelId: selectedFuel.id,
      fuelName: selectedFuel.name,
      pricePerLiter: price,
      liter: calculatedLiter,
      totalAmount: currentAmount,
      paidAmount: currentAmount
    }));
  };

  const handleAmountChange = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    const price = formData.pricePerLiter || 21150;
    const calculatedLiter = price > 0 ? parseFloat((numAmount / price).toFixed(2)) : 0;

    setFormData(prev => ({
      ...prev,
      totalAmount: numAmount,
      paidAmount: numAmount,
      liter: calculatedLiter
    }));
  };

  const handleLiterChange = (literVal) => {
    const numLiter = parseFloat(literVal) || 0;
    const price = formData.pricePerLiter || 21150;
    const calculatedAmount = Math.round(numLiter * price);

    setFormData(prev => ({
      ...prev,
      liter: numLiter,
      totalAmount: calculatedAmount,
      paidAmount: calculatedAmount
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData(prev => ({
          ...prev,
          customLogoUrl: uploadEvent.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateTransactionNo = () => {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    setFormData(prev => ({
      ...prev,
      transactionNo: `${randomNum}`
    }));
  };

  const setCurrentDateTime = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setFormData(prev => ({
      ...prev,
      dateTime: formatted.replace(/\./g, ':')
    }));
  };

  return (
    <div className="scrollable-panel">
      {/* 1. Pemilih Template Struk */}
      <div className="card">
        <div className="card-title">
          <LayoutTemplate size={18} className="text-blue" />
          <span>Pilih Template Struk</span>
        </div>
        <div className="template-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className={`template-card ${selectedTemplateId === tpl.id ? 'active' : ''}`}
              onClick={() => setSelectedTemplateId(tpl.id)}
            >
              <span className="template-badge">{tpl.badge || 'Template'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{tpl.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tpl.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Form Input Data Transaksi yang Akan Dicetak */}
      <div className="card">
        <div className="card-title">
          <Fuel size={18} className="text-emerald" />
          <span>Masukkan Data Transaksi yang Akan Dicetak</span>
        </div>

        <div className="form-grid">
          {/* Total Amount */}
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
              Total Harga / Pembayaran (Rp)
            </label>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '1.1rem', fontWeight: 700, borderColor: 'var(--accent-emerald)' }}
              value={formData.totalAmount}
              onChange={e => handleAmountChange(e.target.value)}
            />
            <div className="quick-pills">
              {[50000, 100000, 150000, 200000, 300000, 500000].map(val => (
                <button key={val} type="button" className="pill-btn" onClick={() => handleAmountChange(val)}>
                  Rp {(val/1000)}rb
                </button>
              ))}
            </div>
          </div>

          {/* Product Select */}
          <div className="form-group">
            <label className="form-label">Nama Produk (BBM)</label>
            <select
              className="form-select"
              value={formData.fuelId}
              onChange={e => handleFuelSelect(e.target.value)}
            >
              {fuels.map(fuel => (
                <option key={fuel.id} value={fuel.id}>
                  {fuel.name} - Rp {fuel.price.toLocaleString('id-ID')}/L
                </option>
              ))}
            </select>
          </div>

          {/* Volume */}
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
              Volume (L)
            </label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              style={{ fontSize: '1.1rem', fontWeight: 700, borderColor: 'var(--accent-cyan)' }}
              value={formData.liter}
              onChange={e => handleLiterChange(e.target.value)}
            />
          </div>

          {/* Transaction No */}
          <div className="form-group">
            <label className="form-label">
              <span>No. Transaksi (No. Trans)</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}
                onClick={generateTransactionNo}
              >
                <RefreshCw size={12} /> Auto
              </button>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.transactionNo}
              onChange={e => setFormData({ ...formData, transactionNo: e.target.value })}
            />
          </div>

          {/* Date Time */}
          <div className="form-group">
            <label className="form-label">
              <span>Waktu / Tanggal Transaksi</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}
                onClick={setCurrentDateTime}
              >
                <Clock size={12} /> Sekarang
              </button>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.dateTime}
              onChange={e => setFormData({ ...formData, dateTime: e.target.value })}
            />
          </div>

          {/* Shift */}
          <div className="form-group">
            <label className="form-label">Shift Kerja</label>
            <input
              type="text"
              className="form-input"
              value={formData.shift || '2'}
              onChange={e => setFormData({ ...formData, shift: e.target.value })}
            />
          </div>

          {/* Pump No */}
          <div className="form-group">
            <label className="form-label">Pulau / Pompa</label>
            <input
              type="text"
              className="form-input"
              value={formData.pumpNo}
              onChange={e => setFormData({ ...formData, pumpNo: e.target.value })}
              placeholder="2"
            />
          </div>

          {/* Operator */}
          <div className="form-group">
            <label className="form-label">Nama Operator</label>
            <input
              type="text"
              className="form-input"
              value={formData.operatorName}
              onChange={e => setFormData({ ...formData, operatorName: e.target.value })}
              placeholder="AGUS"
            />
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">Metode Pembayaran</label>
            <select
              className="form-select"
              value={formData.paymentMethod}
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="CASH">CASH</option>
              <option value="TUNAI">TUNAI</option>
              <option value="QRIS / MYPERTAMINA">QRIS / MYPERTAMINA</option>
              <option value="DEBIT MANDIRI">DEBIT MANDIRI</option>
              <option value="DEBIT BCA">DEBIT BCA</option>
            </select>
          </div>

          {/* SPBU No */}
          <div className="form-group">
            <label className="form-label">No. SPBU</label>
            <input
              type="text"
              className="form-input"
              value={formData.spbuNo}
              onChange={e => setFormData({ ...formData, spbuNo: e.target.value })}
            />
          </div>

          {/* SPBU Name */}
          <div className="form-group">
            <label className="form-label">Nama SPBU</label>
            <input
              type="text"
              className="form-input"
              value={formData.spbuName}
              onChange={e => setFormData({ ...formData, spbuName: e.target.value })}
            />
          </div>

          {/* SPBU Address */}
          <div className="form-group full-width">
            <label className="form-label">Alamat SPBU</label>
            <input
              type="text"
              className="form-input"
              value={formData.spbuAddress}
              onChange={e => setFormData({ ...formData, spbuAddress: e.target.value })}
            />
          </div>

          {/* Custom Logo Upload */}
          <div className="form-group full-width">
            <label className="form-label">
              <span>Logo Header Struk (Opsional: Upload Foto Logo Custom)</span>
              {formData.customLogoUrl && (
                <button
                  type="button"
                  style={{ color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                  onClick={() => setFormData({ ...formData, customLogoUrl: '' })}
                >
                  Reset Ke Logo Pertamina Vektor
                </button>
              )}
            </label>
            <input type="file" accept="image/*" className="form-input" onChange={handleLogoUpload} />
          </div>
        </div>
      </div>
    </div>
  );
}
