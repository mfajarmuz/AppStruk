import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutTemplate, Plus, Edit2, Trash2, Check, FileText, Tag,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough,
  ZoomIn, ZoomOut, Upload, ArrowLeft, MoveVertical, MoveHorizontal, Table, Minus,
  Undo2, Redo2, Info, ChevronDown, Type, Image, Scissors, Save, X
} from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { PertaminaLogoExact, parseReceiptTemplate } from './ReceiptPreview';

// ─── CONSTANTS ────────────────────────────────────────────
const PAPER_WIDTH_PX = 384; // 58mm at 203 DPI thermal printer
const PAPER_WIDTH_MM = 57;
const MAX_CHARS_PER_LINE = 32;
const HISTORY_MAX = 100;
const HISTORY_DEBOUNCE_MS = 400;

const FONT_OPTIONS = [
  { value: "'Courier New', Courier, monospace", label: "Courier New" },
  { value: "'Consolas', 'Courier New', monospace", label: "Consolas" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
  { value: "'Roboto Mono', monospace", label: "Roboto Mono" },
  { value: "'Arial', sans-serif", label: "Arial" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "'Impact', sans-serif", label: "Impact" },
];

const SIZE_OPTIONS = [
  { value: "8", label: "8" }, { value: "9", label: "9" }, { value: "10", label: "10" },
  { value: "11", label: "11" }, { value: "12", label: "12" }, { value: "12.5", label: "12.5" },
  { value: "14", label: "14" }, { value: "16", label: "16" }, { value: "18", label: "18" },
  { value: "20", label: "20" }, { value: "24", label: "24" },
];

const AVAILABLE_TAGS = [
  { tag: '{NO_SPBU}', label: 'No SPBU' }, { tag: '{NAMA_SPBU}', label: 'Nama SPBU' },
  { tag: '{ALAMAT}', label: 'Alamat' }, { tag: '{SHIFT}', label: 'Shift' },
  { tag: '{NO_TRANS}', label: 'No. Transaksi' }, { tag: '{WAKTU}', label: 'Waktu' },
  { tag: '{POMPA}', label: 'Pompa' }, { tag: '{NAMA_PRODUK}', label: 'Produk' },
  { tag: '{HARGA_LITER}', label: 'Harga/Liter' }, { tag: '{VOLUME}', label: 'Volume' },
  { tag: '{TOTAL_HARGA}', label: 'Total Harga' }, { tag: '{TOTAL_RP}', label: 'Total Rp' },
  { tag: '{OPERATOR}', label: 'Operator' }, { tag: '{METODE_BAYAR}', label: 'Metode Bayar' },
  { tag: '{PLAT_NO}', label: 'Plat No' },
];

const SPECIAL_SYMBOLS = ['⛽', '🚗', '✓', '★', '☎', '№', 'Rp.', '--------------------------------', '================================'];

// ─── RULER COMPONENT ──────────────────────────────────────
function Ruler({ widthPx, widthMm, zoom }) {
  const ticks = [];
  const pxPerMm = widthPx / widthMm;
  for (let mm = 0; mm <= widthMm; mm++) {
    const x = mm * pxPerMm * zoom;
    const isMajor = mm % 5 === 0;
    ticks.push(
      <div key={`t${mm}`} className={`umo-ruler-tick ${isMajor ? 'major' : 'minor'}`} style={{ left: `${x}px` }} />
    );
    if (isMajor) {
      ticks.push(
        <span key={`l${mm}`} className="umo-ruler-label" style={{ left: `${x}px` }}>{mm}</span>
      );
    }
  }
  return <div className="umo-ruler" style={{ width: `${widthPx * zoom}px` }}>{ticks}</div>;
}

// ─── STATUS BAR COMPONENT ─────────────────────────────────
function StatusBar({ zoom, setZoom, isSaved }) {
  return (
    <div className="umo-statusbar">
      <div className="umo-statusbar-section">
        <span className="umo-statusbar-item">📄 Kertas: 58mm ({PAPER_WIDTH_PX}px)</span>
        <span className="umo-statusbar-item">│ Max: {MAX_CHARS_PER_LINE} Karakter/Baris</span>
        <span className={`umo-statusbar-item ${isSaved ? 'umo-statusbar-saved' : 'umo-statusbar-unsaved'}`}>
          {isSaved ? '✓ Tersimpan' : '⚠ Belum disimpan'}
        </span>
      </div>
      <div className="umo-zoom-controls">
        <button className="umo-zoom-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} title="Zoom Out">
          <ZoomOut size={14} />
        </button>
        <input
          type="range" className="umo-zoom-slider" min="0.5" max="2.5" step="0.1"
          value={zoom} onChange={e => setZoom(parseFloat(e.target.value))}
        />
        <button className="umo-zoom-btn" onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} title="Zoom In">
          <ZoomIn size={14} />
        </button>
        <span className="umo-zoom-label" onClick={() => setZoom(1)} title="Reset ke 100%">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────
export default function TemplateManager({ templates, setTemplates, onSelectTemplate, formData }) {
  const [editorActive, setEditorActive] = useState(false);
  const editorCanvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const savedSelectionRangeRef = useRef(null);
  const historyDebounceRef = useRef(null);

  // Zoom
  const [zoom, setZoom] = useState(1.2);

  // Live Detected Formatting State
  const [activeFontFamily, setActiveFontFamily] = useState('');
  const [activeFontSize, setActiveFontSize] = useState('12.5');
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeUnderline, setActiveUnderline] = useState(false);
  const [activeAlignment, setActiveAlignment] = useState('left');
  const [textWidthPt, setTextWidthPt] = useState('12.5');
  const [textHeightPt, setTextHeightPt] = useState('12.5');

  // Non-blocking notice & insert menu
  const [editorNotice, setEditorNotice] = useState('');
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const insertMenuRef = useRef(null);
  const insertBtnRef = useRef(null);
  const [insertMenuPos, setInsertMenuPos] = useState({ top: 0, left: 0 });

  // Click-outside to close Insert Menu
  useEffect(() => {
    if (!showInsertMenu) return;
    const handleClickOutside = (e) => {
      if (insertMenuRef.current && !insertMenuRef.current.contains(e.target) &&
          insertBtnRef.current && !insertBtnRef.current.contains(e.target)) {
        setShowInsertMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInsertMenu]);

  // Template being edited
  const [editingTemplate, setEditingTemplate] = useState({
    id: '', name: '', description: '', badge: 'Custom',
    htmlContent: '', pattern: '',
    logoWidth: 160, logoMarginBottom: -4, customLogoUrl: ''
  });

  // Undo / Redo with debouncing
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 0 });

  // ─── HISTORY with Debounce ────────────────
  const pushHistorySnapshot = useCallback((html) => {
    if (!html) return;
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      setHistoryStack(prev => {
        const newStack = prev.slice(0, historyIndex + 1);
        if (newStack.length > 0 && newStack[newStack.length - 1] === html) return prev;
        const trimmed = [...newStack, html].slice(-HISTORY_MAX);
        return trimmed;
      });
      setHistoryIndex(prev => Math.min(prev + 1, HISTORY_MAX - 1));
    }, HISTORY_DEBOUNCE_MS);
  }, [historyIndex]);

  // ─── SELECTION SAVE / RESTORE ─────────────
  const saveCurrentSelectionRange = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (editorCanvasRef.current && editorCanvasRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreSavedSelectionRange = () => {
    if (!savedSelectionRangeRef.current) return false;
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRangeRef.current);
      return true;
    } catch { return false; }
  };

  // ─── UNDO / REDO ──────────────────────────
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetHtml = historyStack[newIndex];
      if (editorCanvasRef.current && targetHtml !== undefined) {
        editorCanvasRef.current.innerHTML = targetHtml;
        setEditingTemplate(prev => ({ ...prev, htmlContent: targetHtml, pattern: editorCanvasRef.current.innerText }));
        setHistoryIndex(newIndex);
      }
    } else { document.execCommand('undo', false, null); handleCanvasInput(); }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      const targetHtml = historyStack[newIndex];
      if (editorCanvasRef.current && targetHtml !== undefined) {
        editorCanvasRef.current.innerHTML = targetHtml;
        setEditingTemplate(prev => ({ ...prev, htmlContent: targetHtml, pattern: editorCanvasRef.current.innerText }));
        setHistoryIndex(newIndex);
      }
    } else { document.execCommand('redo', false, null); handleCanvasInput(); }
  };

  // ─── INIT CANVAS ──────────────────────────
  useEffect(() => {
    if (editorActive && editorCanvasRef.current) {
      const initialHtml = editingTemplate.htmlContent || `<div>${(editingTemplate.pattern || '').replace(/\n/g, '</div><div>')}</div>`;
      editorCanvasRef.current.innerHTML = initialHtml;
      setHistoryStack([initialHtml]);
      setHistoryIndex(0);
      setIsSaved(true);
    }
  }, [editorActive]);

  // ─── Zoom with Ctrl+Wheel ─────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.max(0.5, Math.min(2.5, z + (e.deltaY < 0 ? 0.1 : -0.1))));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [editorActive]);

  // ─── CANVAS INPUT HANDLER ─────────────────
  const handleCanvasInput = () => {
    if (editorCanvasRef.current) {
      const html = editorCanvasRef.current.innerHTML;
      const text = editorCanvasRef.current.innerText;
      setEditingTemplate(prev => ({ ...prev, htmlContent: html, pattern: text }));
      pushHistorySnapshot(html);
      setIsSaved(false);
    }
  };

  // ─── PASTE SANITIZATION ───────────────────
  const handlePaste = (e) => {
    e.preventDefault();
    let text = e.clipboardData.getData('text/plain') || '';
    // Strip any non-printable chars except newlines
    text = text.replace(/[^\S\n]+/g, ' ').replace(/\r\n/g, '\n');
    document.execCommand('insertText', false, text);
    handleCanvasInput();
  };

  // ─── KEYBOARD SHORTCUTS ───────────────────
  const handleEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); handleUndo(); return;
    }
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault(); handleRedo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault(); handleSaveTemplate(); return;
    }
    if (e.key === 'Backspace') {
      if (editorCanvasRef.current && editorCanvasRef.current.innerText.trim() === '') {
        setTimeout(() => {
          if (editorCanvasRef.current && editorCanvasRef.current.innerHTML === '')
            editorCanvasRef.current.innerHTML = '<div><br></div>';
        }, 10);
      }
    }
  };

  // ─── LIVE STYLE DETECTION ─────────────────
  const updateActiveToolbarState = () => {
    saveCurrentSelectionRange();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let node = selection.anchorNode;
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!node || !editorCanvasRef.current || !editorCanvasRef.current.contains(node)) return;

    const cs = window.getComputedStyle(node);
    // Font family
    const rawFont = (cs.fontFamily || '').toLowerCase();
    const matched = FONT_OPTIONS.find(f => rawFont.includes(f.label.toLowerCase().split(' ')[0].toLowerCase()));
    if (matched) setActiveFontFamily(matched.value);
    // Font size
    const pxSize = parseFloat(cs.fontSize) || 12.5;
    setActiveFontSize((pxSize * 0.75).toFixed(1).replace(/\.0$/, ''));
    // Bold / Italic / Underline
    const weight = cs.fontWeight;
    setActiveBold(weight === 'bold' || weight === '700' || parseInt(weight) >= 600);
    setActiveItalic(cs.fontStyle === 'italic');
    setActiveUnderline((cs.textDecorationLine || cs.textDecoration || '').includes('underline'));
    // Alignment
    setActiveAlignment(cs.textAlign || 'left');
    // ScaleX/Y → Width/Height pt
    let scX = 1, scY = 1;
    const t = cs.transform;
    if (t && t !== 'none') {
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m) { const p = m[1].split(',').map(v => parseFloat(v.trim())); if (p.length >= 4) { scX = p[0] > 0 ? p[0] : 1; scY = p[3] > 0 ? p[3] : 1; } }
    }
    setTextWidthPt((pxSize * 0.75 * scX).toFixed(1).replace(/\.0$/, ''));
    setTextHeightPt((pxSize * 0.75 * scY).toFixed(1).replace(/\.0$/, ''));
  };

  // ─── BUBBLE MENU on Selection ─────────────
  const handleCanvasSelection = () => {
    updateActiveToolbarState();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (rect.width > 0 && containerRect) {
        setBubblePos({
          top: rect.top - containerRect.top - 42,
          left: rect.left - containerRect.left + rect.width / 2 - 100
        });
        setShowBubbleMenu(true);
        return;
      }
    }
    setShowBubbleMenu(false);
  };

  // ─── APPLY INLINE STYLE ───────────────────
  const applyInlineSelectionStyle = (styleObj) => {
    if (!editorCanvasRef.current) return;
    let selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      if (restoreSavedSelectionRange()) selection = window.getSelection();
    }
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      setEditorNotice('💡 Blok/sorot teks terlebih dulu untuk mengubah format!');
      setTimeout(() => setEditorNotice(''), 3000);
      editorCanvasRef.current.focus();
      return;
    }
    setEditorNotice('');
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text) return;
    const span = document.createElement('span');
    Object.assign(span.style, styleObj);
    span.textContent = text;
    range.deleteContents();
    range.insertNode(span);
    handleCanvasInput();
    updateActiveToolbarState();
    editorCanvasRef.current.focus();
  };

  const applyCustomWidthPt = (val) => {
    const n = parseFloat(val); if (isNaN(n) || n <= 0) return;
    const base = parseFloat(activeFontSize) || 12.5;
    applyInlineSelectionStyle({ display: 'inline-block', transform: `scaleX(${(n / base).toFixed(3)})`, letterSpacing: '0.5px' });
  };

  const applyCustomHeightPt = (val) => {
    const n = parseFloat(val); if (isNaN(n) || n <= 0) return;
    const base = parseFloat(activeFontSize) || 12.5;
    applyInlineSelectionStyle({ display: 'inline-block', transform: `scaleY(${(n / base).toFixed(3)})` });
  };

  const applyBlockLineStyle = (styleObj) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    let node = selection.anchorNode;
    while (node && node !== editorCanvasRef.current && node.nodeName !== 'DIV' && node.nodeName !== 'P') node = node.parentNode;
    if (node && node !== editorCanvasRef.current) Object.assign(node.style, styleObj);
    handleCanvasInput();
    updateActiveToolbarState();
    if (editorCanvasRef.current) editorCanvasRef.current.focus();
  };

  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    handleCanvasInput();
    updateActiveToolbarState();
    if (editorCanvasRef.current) editorCanvasRef.current.focus();
  };

  const insertHtmlAtCursor = (htmlStr) => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      document.execCommand('insertHTML', false, htmlStr);
      handleCanvasInput();
    }
  };

  const insertTable = (rows = 3, cols = 2) => {
    let h = `<table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:inherit;">`;
    for (let r = 0; r < rows; r++) {
      h += `<tr>`;
      for (let c = 0; c < cols; c++) h += `<td style="border:1px dashed #bbb;padding:2px 4px;">${c === 0 ? `Item ${r + 1}` : `Nilai`}</td>`;
      h += `</tr>`;
    }
    h += `</table><p><br></p>`;
    insertHtmlAtCursor(h);
    setShowInsertMenu(false);
  };

  // ─── TEMPLATE CRUD ────────────────────────
  const handleCreateNewTemplate = () => {
    const html = `<div style="margin:0;padding:0;">{NO_SPBU}</div><div style="margin:0;padding:0;">{NAMA_SPBU}</div><div style="margin:0;padding:0;">{ALAMAT}</div><div style="margin:0;padding:0;">Shift: {SHIFT}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;No. Trans: {NO_TRANS}</div><div style="margin:0;padding:0;">Waktu: {WAKTU}</div><div><br></div><div style="margin:0;padding:0;">Pulau/Pompa: {POMPA}</div><div style="margin:0;padding:0;">Nama Produk: {NAMA_PRODUK}</div><div style="margin:0;padding:0;">Harga/Liter: Rp. {HARGA_LITER}</div><div style="margin:0;padding:0;">Volume     : (L) {VOLUME}</div><div style="margin:0;padding:0;">Total Harga: Rp. {TOTAL_HARGA}</div><div style="margin:0;padding:0;">Operator   : {OPERATOR}</div><div><br></div><div style="margin:0;padding:0;">{METODE_BAYAR}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{TOTAL_HARGA}</div>`;
    setEditingTemplate({
      id: `custom_tpl_${Date.now()}`, name: 'Template Kustom Baru', description: 'Template buatan sendiri.',
      badge: 'Custom', htmlContent: html, pattern: '', logoWidth: 160, logoMarginBottom: -4, customLogoUrl: ''
    });
    setEditorActive(true);
  };

  const handleEditTemplate = (tpl) => {
    const html = tpl.htmlContent || `<div>${(tpl.pattern || '').replace(/\n/g, '</div><div>')}</div>`;
    setEditingTemplate({ ...tpl, htmlContent: html, pattern: tpl.pattern || '', logoWidth: tpl.logoWidth || 160, logoMarginBottom: tpl.logoMarginBottom !== undefined ? tpl.logoMarginBottom : -4, customLogoUrl: tpl.customLogoUrl || '' });
    setEditorActive(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate.name) { alert('Nama template tidak boleh kosong!'); return; }
    const currentHtml = editorCanvasRef.current ? editorCanvasRef.current.innerHTML : editingTemplate.htmlContent;
    const currentPattern = editorCanvasRef.current ? editorCanvasRef.current.innerText : editingTemplate.pattern;
    const saved = { ...editingTemplate, htmlContent: currentHtml, pattern: currentPattern };
    setTemplates(prev => {
      const exists = prev.some(t => t.id === saved.id);
      return exists ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved];
    });
    setIsSaved(true);
  };

  const handleDeleteTemplate = (id) => {
    if (templates.length <= 1) { alert('Minimal harus ada 1 template!'); return; }
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleDropImage = (e) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { const r = new FileReader(); r.onload = (ev) => setEditingTemplate(prev => ({ ...prev, customLogoUrl: ev.target.result })); r.readAsDataURL(file); }
  };

  const handleSelectFileImage = (e) => {
    const file = e.target.files[0];
    if (file) { const r = new FileReader(); r.onload = (ev) => setEditingTemplate(prev => ({ ...prev, customLogoUrl: ev.target.result })); r.readAsDataURL(file); }
  };

  // Compiled preview
  const compiledPreview = parseReceiptTemplate(editingTemplate.htmlContent || editingTemplate.pattern, formData || {});

  // ─── RENDER ───────────────────────────────
  return (
    <div className="scrollable-panel" style={{ width: '100%' }}>
      {!editorActive ? (
        /* ═══════ VIEW 1: TEMPLATE GALLERY ═══════ */
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div className="card-title" style={{ margin: 0 }}>
                <LayoutTemplate size={22} className="text-blue" />
                <span>Galeri Template Struk Saya</span>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleCreateNewTemplate}
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}>
                <Plus size={20} /> + Template Baru
              </button>
            </div>
          </div>

          <div className="template-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {templates.map(tpl => {
              const sample = parseReceiptTemplate(tpl.htmlContent || tpl.pattern, formData || {});
              const mb = tpl.logoMarginBottom !== undefined ? tpl.logoMarginBottom : -4;
              return (
                <div key={tpl.id} className="template-card" style={{ padding: '20px', background: 'rgba(15,23,42,0.7)' }}>
                  <span className="template-badge">{tpl.badge || 'Template'}</span>
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{tpl.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tpl.description}</p>
                  </div>
                  <div style={{ background: '#fff', color: '#000', padding: '12px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontFamily: "'Courier New', monospace", fontSize: '10px', lineHeight: '1.3', maxHeight: '160px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ textAlign: 'center', marginBottom: `${mb}px`, padding: 0, lineHeight: 1 }}>
                      {tpl.customLogoUrl ? <img src={tpl.customLogoUrl} alt="Logo" style={{ maxHeight: '24px', maxWidth: '100px', display: 'inline-block' }} />
                        : <div style={{ display: 'flex', justifyContent: 'center' }}><PertaminaLogoExact width={90} height={26} /></div>}
                    </div>
                    {tpl.htmlContent ? <div dangerouslySetInnerHTML={{ __html: sample }} /> : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{sample || tpl.pattern || 'Sample...'}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => { onSelectTemplate(tpl.id, tpl); alert(`Template '${tpl.name}' dipilih!`); }}>
                      <Check size={16} /> Gunakan
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Edit" onClick={() => handleEditTemplate(tpl)}><Edit2 size={16} /></button>
                    <button className="btn btn-danger" style={{ padding: '8px 12px' }} title="Hapus" onClick={() => handleDeleteTemplate(tpl.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ═══════ VIEW 2: GOOGLE DOCS STYLE EDITOR ═══════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Back + Save Bar (app dark theme) */}
          <div className="card" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
            <button className="btn btn-secondary" onClick={() => setEditorActive(false)}><ArrowLeft size={16} /> Kembali</button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-success" onClick={handleSaveTemplate}><Save size={16} /> Simpan Template</button>
            </div>
          </div>

          {/* SPLIT LAYOUT: Editor + Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>

            {/* ── LEFT: EDITOR ── */}
            <div className="umo-editor-container">
              {/* HEADER BAR */}
              <div className="umo-header">
                <div className="umo-header-title">
                  <FileText size={18} />
                  <span>Umo Editor</span>
                </div>
                <input
                  type="text" className="umo-header-input" value={editingTemplate.name}
                  onChange={e => { setEditingTemplate(prev => ({ ...prev, name: e.target.value })); setIsSaved(false); }}
                  placeholder="Nama Template..."
                />
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button className="umo-btn" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
                  <button className="umo-btn" onClick={handleRedo} disabled={historyIndex >= historyStack.length - 1} title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
                </div>
              </div>

              {/* STATIC ACTION BAR (Google Docs Style) - Row 1: Formatting */}
              <div className="umo-toolbar">
                {/* Group 1: Font Family */}
                <div className="umo-toolbar-group">
                  <select className="umo-select" style={{ width: '120px' }} value={activeFontFamily}
                    onChange={e => applyInlineSelectionStyle({ fontFamily: e.target.value })}>
                    <option value="" disabled>Font</option>
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 2: Font Size */}
                <div className="umo-toolbar-group">
                  <select className="umo-select" style={{ width: '64px' }} value={activeFontSize}
                    onChange={e => applyInlineSelectionStyle({ fontSize: `${e.target.value}pt` })}>
                    <option value="" disabled>pt</option>
                    {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 3: B I U S */}
                <div className="umo-toolbar-group">
                  <button className={`umo-btn ${activeBold ? 'active' : ''}`} onClick={() => execCmd('bold')} title="Bold (Ctrl+B)"><Bold size={15} /></button>
                  <button className={`umo-btn ${activeItalic ? 'active' : ''}`} onClick={() => execCmd('italic')} title="Italic (Ctrl+I)"><Italic size={15} /></button>
                  <button className={`umo-btn ${activeUnderline ? 'active' : ''}`} onClick={() => execCmd('underline')} title="Underline (Ctrl+U)"><Underline size={15} /></button>
                  <button className={`umo-btn` } onClick={() => execCmd('strikeThrough')} title="Strikethrough"><Strikethrough size={15} /></button>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 4: Alignment */}
                <div className="umo-toolbar-group">
                  <button className={`umo-btn ${activeAlignment === 'left' || activeAlignment === 'start' ? 'active' : ''}`} onClick={() => execCmd('justifyLeft')} title="Rata Kiri"><AlignLeft size={15} /></button>
                  <button className={`umo-btn ${activeAlignment === 'center' ? 'active' : ''}`} onClick={() => execCmd('justifyCenter')} title="Rata Tengah"><AlignCenter size={15} /></button>
                  <button className={`umo-btn ${activeAlignment === 'right' ? 'active' : ''}`} onClick={() => execCmd('justifyRight')} title="Rata Kanan"><AlignRight size={15} /></button>
                  <button className={`umo-btn ${activeAlignment === 'justify' ? 'active' : ''}`} onClick={() => execCmd('justifyFull')} title="Rata Penuh"><AlignJustify size={15} /></button>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 5: Width & Height pt — inline horizontal */}
                <div className="umo-toolbar-group" style={{ gap: '4px' }}>
                  <span className="umo-toolbar-label" style={{ marginRight: '2px' }}>W</span>
                  <input type="number" className="umo-input-pt" step="0.5" min="4" max="60"
                    value={textWidthPt} onChange={e => setTextWidthPt(e.target.value)}
                    onFocus={saveCurrentSelectionRange}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustomWidthPt(textWidthPt); } }}
                    title="Lebar Teks (pt) — Enter untuk apply" />
                  <span className="umo-toolbar-label" style={{ marginLeft: '4px', marginRight: '2px' }}>H</span>
                  <input type="number" className="umo-input-pt" step="0.5" min="4" max="60"
                    value={textHeightPt} onChange={e => setTextHeightPt(e.target.value)}
                    onFocus={saveCurrentSelectionRange}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustomHeightPt(textHeightPt); } }}
                    title="Tinggi Teks (pt) — Enter untuk apply" />
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 6: Line Spacing */}
                <div className="umo-toolbar-group">
                  <select className="umo-select" style={{ width: '56px' }} defaultValue=""
                    onChange={e => applyBlockLineStyle({ lineHeight: e.target.value })} title="Line Spacing">
                    <option value="" disabled>⇕</option>
                    <option value="1.1">1.1</option>
                    <option value="1.35">1.35</option>
                    <option value="1.6">1.6</option>
                    <option value="2.0">2.0</option>
                  </select>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 7: Insert Dropdown */}
                <div className="umo-toolbar-group">
                  <button ref={insertBtnRef}
                    className={`umo-btn ${showInsertMenu ? 'active' : ''}`}
                    style={{ width: 'auto', padding: '0 8px', gap: '4px', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}
                    onClick={() => {
                      if (!showInsertMenu && insertBtnRef.current) {
                        const rect = insertBtnRef.current.getBoundingClientRect();
                        setInsertMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 320) });
                      }
                      setShowInsertMenu(v => !v);
                    }} title="Sisipkan elemen ke struk">
                    <Plus size={14} /> <span style={{ fontSize: '0.72rem' }}>Sisipkan</span> <ChevronDown size={12} />
                  </button>
                </div>
              </div>

              {/* INSERT MENU (fixed position, outside overflow container) */}
              {showInsertMenu && (
                <div className="umo-insert-menu-fixed" ref={insertMenuRef}
                  style={{ top: `${insertMenuPos.top}px`, left: `${insertMenuPos.left}px` }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px 8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#202124' }}>📋 Sisipkan Elemen</span>
                    <button className="umo-btn" style={{ width: '22px', height: '22px' }} onClick={() => setShowInsertMenu(false)}><X size={14} /></button>
                  </div>

                  {/* Section: Garis & Tabel */}
                  <div className="umo-insert-menu-section-label">📐 Garis & Tabel</div>
                  <button className="umo-insert-menu-item" onClick={() => { insertTable(3, 2); setShowInsertMenu(false); }}><Table size={16} /> Tabel 2 Kolom</button>
                  <button className="umo-insert-menu-item" onClick={() => { insertHtmlAtCursor('<hr style="border:none;border-top:1px dashed #000;margin:4px 0;" />'); setShowInsertMenu(false); }}><Minus size={16} /> Garis Putus-Putus (---)</button>
                  <button className="umo-insert-menu-item" onClick={() => { insertHtmlAtCursor('<hr style="border:none;border-top:2px solid #000;margin:4px 0;" />'); setShowInsertMenu(false); }}><Minus size={16} /> Garis Tebal Solid (___)</button>

                  <div className="umo-insert-menu-divider" />

                  {/* Section: Simbol */}
                  <div className="umo-insert-menu-section-label">✨ Simbol Khusus</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 12px 8px' }}>
                    {SPECIAL_SYMBOLS.map(sym => (
                      <button key={sym} className="umo-symbol-chip" title={`Sisipkan ${sym}`}
                        onClick={() => { insertHtmlAtCursor(`<span>${sym}</span>`); setShowInsertMenu(false); }}>
                        {sym}
                      </button>
                    ))}
                  </div>

                  <div className="umo-insert-menu-divider" />

                  {/* Section: Variabel Tag */}
                  <div className="umo-insert-menu-section-label">🏷️ Variabel Tag Template</div>
                  <div className="umo-insert-tags-grid">
                    {AVAILABLE_TAGS.map(t => (
                      <button key={t.tag} className="umo-tag-chip" title={t.label}
                        onClick={() => { insertHtmlAtCursor(`<span>${t.tag}</span>`); setShowInsertMenu(false); }}>
                        {t.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* NON-BLOCKING NOTICE */}
              {editorNotice && (
                <div className="umo-notice"><Info size={14} /> {editorNotice}</div>
              )}

              {/* WORKSPACE: RULER + PAPER CANVAS */}
              <div className="umo-workspace" ref={canvasContainerRef} onClick={(e) => { if (e.target === e.currentTarget && editorCanvasRef.current) editorCanvasRef.current.focus(); }}>

                {/* Floating Bubble Menu (absolute to workspace) */}
                {showBubbleMenu && (
                  <div className="umo-bubble-menu" style={{ top: `${bubblePos.top}px`, left: `${bubblePos.left}px` }}>
                    <button className={`umo-btn ${activeBold ? 'active' : ''}`} onClick={() => execCmd('bold')}><Bold size={13} /></button>
                    <button className={`umo-btn ${activeItalic ? 'active' : ''}`} onClick={() => execCmd('italic')}><Italic size={13} /></button>
                    <button className={`umo-btn ${activeUnderline ? 'active' : ''}`} onClick={() => execCmd('underline')}><Underline size={13} /></button>
                    <div className="umo-toolbar-divider" style={{ height: '18px' }} />
                    <button className={`umo-btn ${activeAlignment === 'left' || activeAlignment === 'start' ? 'active' : ''}`} onClick={() => execCmd('justifyLeft')}><AlignLeft size={13} /></button>
                    <button className={`umo-btn ${activeAlignment === 'center' ? 'active' : ''}`} onClick={() => execCmd('justifyCenter')}><AlignCenter size={13} /></button>
                    <button className={`umo-btn ${activeAlignment === 'right' ? 'active' : ''}`} onClick={() => execCmd('justifyRight')}><AlignRight size={13} /></button>
                  </div>
                )}

                {/* Ruler */}
                <Ruler widthPx={PAPER_WIDTH_PX} widthMm={PAPER_WIDTH_MM} zoom={zoom} />

                {/* Paper Canvas */}
                <div className="umo-paper" style={{ width: `${PAPER_WIDTH_PX * zoom}px`, transform: `scale(1)`, transformOrigin: 'top center' }}>
                  <div
                    ref={editorCanvasRef}
                    className="umo-paper-editable"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onKeyDown={handleEditorKeyDown}
                    onInput={handleCanvasInput}
                    onPaste={handlePaste}
                    onMouseUp={handleCanvasSelection}
                    onKeyUp={handleCanvasSelection}
                    onClick={updateActiveToolbarState}
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: `${12.5 * zoom}px`,
                      lineHeight: '1.35',
                    }}
                  />
                </div>
              </div>

              {/* STATUS BAR */}
              <StatusBar zoom={zoom} setZoom={setZoom} isSaved={isSaved} />
            </div>

            {/* ── RIGHT: LIVE PREVIEW + SETTINGS ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Live Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <EyeIcon /> Live Preview Struk 58mm
                </div>
                <div className="receipt-wrapper" style={{ width: '300px', margin: 0, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                  <div style={{ color: '#000' }}>
                    <div style={{ textAlign: 'center', marginBottom: `${editingTemplate.logoMarginBottom !== undefined ? editingTemplate.logoMarginBottom : -4}px`, padding: 0, lineHeight: 1 }}>
                      {editingTemplate.customLogoUrl
                        ? <img src={editingTemplate.customLogoUrl} alt="Logo" style={{ width: `${editingTemplate.logoWidth || 160}px`, height: 'auto', maxHeight: '70px', objectFit: 'contain', display: 'inline-block' }} />
                        : <div style={{ display: 'flex', justifyContent: 'center' }}><PertaminaLogoExact width={editingTemplate.logoWidth || 160} /></div>
                      }
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: compiledPreview }} />
                  </div>
                </div>
              </div>

              {/* Settings Panel */}
              <div className="card" style={{ padding: '14px' }}>
                <div className="card-title" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>⚙️ Pengaturan Template</div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Deskripsi</label>
                  <input type="text" className="form-input" value={editingTemplate.description}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, description: e.target.value }))} placeholder="Deskripsi template..." />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Badge</label>
                  <input type="text" className="form-input" value={editingTemplate.badge}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, badge: e.target.value }))} placeholder="Custom / Official" />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Ukuran Logo ({editingTemplate.logoWidth || 160}px)</label>
                  <input type="range" min="80" max="240" value={editingTemplate.logoWidth || 160}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, logoWidth: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--accent-blue)' }} />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Jarak Logo ({editingTemplate.logoMarginBottom !== undefined ? editingTemplate.logoMarginBottom : -4}px)</label>
                  <input type="range" min="-20" max="40" step="2" value={editingTemplate.logoMarginBottom !== undefined ? editingTemplate.logoMarginBottom : -4}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, logoMarginBottom: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--accent-emerald)' }} />
                </div>

                {/* Logo Upload */}
                <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDropImage}
                  style={{ border: `2px dashed ${isDragOver ? 'var(--accent-cyan)' : 'var(--border-color)'}`, background: isDragOver ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.6)', borderRadius: '8px', padding: '12px', textAlign: 'center', cursor: 'pointer' }}>
                  <Upload size={18} style={{ color: 'var(--accent-cyan)', marginBottom: '4px' }} />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Drop logo di sini</div>
                  <input type="file" accept="image/*" onChange={handleSelectFileImage} style={{ marginTop: '6px', fontSize: '0.72rem' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}
