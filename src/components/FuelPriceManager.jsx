import React, { useState } from 'react';
import { DollarSign, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import { INITIAL_FUELS } from '../data/defaultFuels';

export default function FuelPriceManager({ fuels, setFuels }) {
  const [newFuel, setNewFuel] = useState({ name: '', price: 10000, category: 'Non-Subsidi' });

  const handlePriceChange = (id, newPrice) => {
    setFuels(prev => prev.map(f => f.id === id ? { ...f, price: parseFloat(newPrice) || 0 } : f));
  };

  const handleAddFuel = () => {
    if (!newFuel.name) return;
    const item = {
      ...newFuel,
      id: `fuel_${Date.now()}`
    };
    setFuels(prev => [...prev, item]);
    setNewFuel({ name: '', price: 10000, category: 'Non-Subsidi' });
  };

  const handleDeleteFuel = (id) => {
    if (fuels.length <= 1) {
      alert('Minimal harus ada 1 jenis BBM!');
      return;
    }
    setFuels(prev => prev.filter(f => f.id !== id));
  };

  const handleResetFuels = () => {
    if (confirm('Kembalikan harga BBM ke standar awal?')) {
      setFuels(INITIAL_FUELS);
    }
  };

  return (
    <div className="scrollable-panel">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ margin: 0 }}>
            <DollarSign size={20} className="text-emerald" />
            <span>Manajemen Jenis & Harga BBM per Liter</span>
          </div>

          <button className="btn btn-secondary" onClick={handleResetFuels}>
            <RefreshCw size={16} /> Reset Default
          </button>
        </div>
      </div>

      {/* Add New Fuel Card */}
      <div className="card">
        <div className="card-title">
          <Plus size={18} /> Tambah Jenis BBM Baru
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nama BBM</label>
            <input
              type="text"
              className="form-input"
              value={newFuel.name}
              onChange={e => setNewFuel({ ...newFuel, name: e.target.value })}
              placeholder="Contoh: Pertamax Green 95"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Harga per Liter (Rp)</label>
            <input
              type="number"
              className="form-input"
              value={newFuel.price}
              onChange={e => setNewFuel({ ...newFuel, price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select
              className="form-select"
              value={newFuel.category}
              onChange={e => setNewFuel({ ...newFuel, category: e.target.value })}
            >
              <option value="Subsidi">Subsidi</option>
              <option value="Non-Subsidi">Non-Subsidi</option>
              <option value="Swasta">Swasta</option>
            </select>
          </div>

          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label className="form-label">&nbsp;</label>
            <button className="btn btn-primary" onClick={handleAddFuel}>
              <Plus size={16} /> Tambah
            </button>
          </div>
        </div>
      </div>

      {/* Fuel Price Table */}
      <div className="card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Jenis BBM</th>
              <th>Kategori</th>
              <th>Harga / Liter (Rp)</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {fuels.map(fuel => (
              <tr key={fuel.id}>
                <td style={{ fontWeight: 600 }}>{fuel.name}</td>
                <td>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      background: fuel.category === 'Subsidi' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: fuel.category === 'Subsidi' ? '#f87171' : '#60a5fa'
                    }}
                  >
                    {fuel.category}
                  </span>
                </td>
                <td>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '160px' }}
                    value={fuel.price}
                    onChange={e => handlePriceChange(fuel.id, e.target.value)}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px' }}
                    onClick={() => handleDeleteFuel(fuel.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
