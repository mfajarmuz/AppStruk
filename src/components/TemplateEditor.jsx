import React from 'react';
import { FileCode, RotateCcw, Tag } from 'lucide-react';
import { DEFAULT_PERTAMINA_TEMPLATE, AVAILABLE_TAGS } from '../data/defaultTemplate';

export default function TemplateEditor({ template, setTemplate }) {
  const handleContentChange = (val) => {
    setTemplate(prev => ({ ...prev, content: val }));
  };

  const handleInsertTag = (tag) => {
    setTemplate(prev => ({ ...prev, content: (prev.content || '') + tag }));
  };

  const handleResetTemplate = () => {
    setTemplate({ ...DEFAULT_PERTAMINA_TEMPLATE });
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)' }}>
          <FileCode size={20} /> Editor Template Struk Thermal
        </h2>
        <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={handleResetTemplate}>
          <RotateCcw size={14} /> Reset Standar Resmi Pertamina
        </button>
      </div>

      {/* Tags Quick Inserter */}
      <div style={{ marginBottom: '14px', background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', marginBottom: '8px' }}>
          <Tag size={14} /> Variabel Tag Dinamis (Klik untuk Sisipkan):
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {AVAILABLE_TAGS.map(t => (
            <button key={t.tag} type="button" className="pill-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleInsertTag(t.tag)}>
              {t.tag} ({t.label})
            </button>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="form-group">
        <label className="form-label">Kode HTML & Pola Struk</label>
        <textarea
          className="form-input"
          style={{ width: '100%', height: '320px', fontFamily: 'Consolas, monospace', fontSize: '0.85rem', lineHeight: '1.4', resize: 'vertical' }}
          value={template?.content || ''}
          onChange={e => handleContentChange(e.target.value)}
          placeholder="Isi kode HTML template struk..."
        />
      </div>
    </div>
  );
}
