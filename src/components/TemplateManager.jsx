import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutTemplate, Plus, Edit2, Trash2, Check, FileText, Tag, Search,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough,
  ZoomIn, ZoomOut, Upload, ArrowLeft, MoveVertical, MoveHorizontal, Table, Minus,
  Undo2, Redo2, Info, ChevronDown, Type, Image, Scissors, Save, X, AlertCircle, CheckCircle2, RotateCcw, Replace
} from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { PertaminaLogoExact, parseReceiptTemplate } from './ReceiptPreview';

// ─── CONSTANTS ────────────────────────────────────────────
const PAPER_WIDTH_PX = 384; // 58mm at 203 DPI thermal printer
const PAPER_WIDTH_MM = 57;
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
  { tag: '{NO_SPBU}', label: 'No SPBU', sample: '31.12345' },
  { tag: '{NAMA_SPBU}', label: 'Nama SPBU', sample: 'SPBU Sukaraja' },
  { tag: '{ALAMAT}', label: 'Alamat', sample: 'Jl. Raya No. 88' },
  { tag: '{TANGGAL}', label: 'Tanggal', sample: '04/08/2026' },
  { tag: '{JAM}', label: 'Jam / Waktu', sample: '07:52:30' },
  { tag: '{WAKTU}', label: 'Tanggal & Jam (Gabung)', sample: '04/08/2026 07:52:30' },
  { tag: '{SHIFT}', label: 'Shift', sample: '1' },
  { tag: '{NO_TRANS}', label: 'No. Transaksi', sample: 'TRX-99823' },
  { tag: '{POMPA}', label: 'Pompa', sample: '02' },
  { tag: '{NAMA_PRODUK}', label: 'Produk', sample: 'PERTAMAX' },
  { tag: '{HARGA_LITER}', label: 'Harga/Liter', sample: '12.900' },
  { tag: '{VOLUME}', label: 'Volume', sample: '15.50' },
  { tag: '{TOTAL_HARGA}', label: 'Total Harga', sample: '199.950' },
  { tag: '{TOTAL_RP}', label: 'Total Rp', sample: '200.000' },
  { tag: '{OPERATOR}', label: 'Operator', sample: 'Budi' },
  { tag: '{METODE_BAYAR}', label: 'Metode Bayar', sample: 'TUNAI' },
  { tag: '{PLAT_NO}', label: 'Plat No', sample: 'B 1234 ABC' },
];

const SPECIAL_SYMBOLS = ['⛽', '🚗', '✓', '★', '☎', '№', 'Rp.', '--------------------------------', '================================'];

// ─── RULER COMPONENT WITH MARGIN SHADING ──────────────────
function Ruler({ widthPx, widthMm, zoom, marginMm, setPaperMarginMm }) {
  const ticks = [];
  const pxPerMm = widthPx / widthMm;
  const marginPx = marginMm * pxPerMm * zoom;

  const handleRulerClick = () => {
    if (setPaperMarginMm) {
      const nextMargin = marginMm === 0 ? 2 : marginMm === 2 ? 4 : 0;
      setPaperMarginMm(nextMargin);
    }
  };

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
  return (
    <div className="umo-ruler" style={{ width: `${widthPx * zoom}px`, cursor: 'pointer' }} onClick={handleRulerClick} title="Klik penggaris untuk ganti margin (0mm / 2mm / 4mm)">
      {marginPx > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${marginPx}px`, background: 'rgba(234, 67, 53, 0.15)', borderRight: '1px dashed #ea4335', zIndex: 2 }} />
      )}
      {marginPx > 0 && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${marginPx}px`, background: 'rgba(234, 67, 53, 0.15)', borderLeft: '1px dashed #ea4335', zIndex: 2 }} />
      )}
      {ticks}
    </div>
  );
}

// ─── STATUS BAR COMPONENT WITH DYNAMIC MAX CHAR COUNT ─────
function StatusBar({ zoom, setZoom, isSaved, currentLineChars, totalLines, paperMarginMm, setPaperMarginMm }) {
  const maxChars = paperMarginMm === 0 ? 32 : paperMarginMm === 2 ? 30 : 27;
  const isOverLimit = currentLineChars > maxChars;

  return (
    <div className="umo-statusbar">
      <div className="umo-statusbar-section">
        <span className="umo-statusbar-item">📄 Kertas: 58mm ({PAPER_WIDTH_PX}px)</span>
        <span className="umo-statusbar-item">│ Total: {totalLines} Baris</span>
        <span className={`umo-statusbar-item ${isOverLimit ? 'umo-statusbar-unsaved' : ''}`} style={{ fontWeight: isOverLimit ? 700 : 500 }}>
          │ Baris ini: {currentLineChars}/{maxChars} char {isOverLimit ? '⚠️ Limit!' : ''}
        </span>
        <span className={`umo-statusbar-item ${isSaved ? 'umo-statusbar-saved' : 'umo-statusbar-unsaved'}`}>
          │ {isSaved ? '✓ Tersimpan' : '⚠ Belum disimpan'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
          <span>Margin:</span>
          <select className="umo-select" style={{ height: '22px', fontSize: '0.7rem', padding: '0 16px 0 4px' }}
            value={paperMarginMm} onChange={e => setPaperMarginMm(parseInt(e.target.value))}>
            <option value={0}>0mm (32 char)</option>
            <option value={2}>2mm (30 char)</option>
            <option value={4}>4mm (27 char)</option>
          </select>
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
  const noticeTimeoutRef = useRef(null);

  // Gallery Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Find & Replace Drawer State
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Zoom (persisted in localStorage) & Margin
  const [zoom, setZoomState] = useState(() => parseFloat(localStorage.getItem('umo_editor_zoom')) || 1.2);
  const [paperMarginMm, setPaperMarginMm] = useState(0);

  const setZoom = (valueOrFn) => {
    setZoomState(prev => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      localStorage.setItem('umo_editor_zoom', next.toString());
      return next;
    });
  };

  // Live Detected Formatting State
  const [activeFontFamily, setActiveFontFamily] = useState('');
  const [activeFontSize, setActiveFontSize] = useState('12.5');
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeUnderline, setActiveUnderline] = useState(false);
  const [activeStrikethrough, setActiveStrikethrough] = useState(false);
  const [activeAlignment, setActiveAlignment] = useState('left');
  const [activeLineHeight, setActiveLineHeight] = useState('1.35');
  const [textWidthPt, setTextWidthPt] = useState('12.5');
  const [textHeightPt, setTextHeightPt] = useState('12.5');
  const [currentLineChars, setCurrentLineChars] = useState(0);
  const [totalLines, setTotalLines] = useState(1);

  // Non-blocking notices & insert menu
  const [editorNotice, setEditorNotice] = useState('');
  const [galleryNotice, setGalleryNotice] = useState('');
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const insertMenuRef = useRef(null);
  const insertBtnRef = useRef(null);
  const [insertMenuPos, setInsertMenuPos] = useState({ top: 0, left: 0 });

  // Safe Non-blocking Notice Dispatcher
  const showNotice = (msg, duration = 3500) => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setEditorNotice(msg);
    noticeTimeoutRef.current = setTimeout(() => setEditorNotice(''), duration);
  };

  // Recalculate Insert Menu Position
  const updateInsertMenuPos = useCallback(() => {
    if (insertBtnRef.current) {
      const rect = insertBtnRef.current.getBoundingClientRect();
      setInsertMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 320) });
    }
  }, []);

  // Click-outside, Escape key, & Scroll/Resize listener to close menus
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key === 'Escape') {
        setShowInsertMenu(false);
        setShowBubbleMenu(false);
        setShowFindReplace(false);
      }
    };
    const handleClickOutside = (e) => {
      if (showInsertMenu && insertMenuRef.current && !insertMenuRef.current.contains(e.target) &&
          insertBtnRef.current && !insertBtnRef.current.contains(e.target)) {
        setShowInsertMenu(false);
      }
    };
    const handleScrollOrResize = () => {
      setShowInsertMenu(false);
    };
    document.addEventListener('keydown', handleKeyDownGlobal);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDownGlobal);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
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
    if (selection && selection.rangeCount > 0) {
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

  // Restore Caret to End of Canvas on Undo/Redo
  const restoreCanvasCaret = () => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(editorCanvasRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (err) { /* ignore fallback */ }
    }
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
        restoreCanvasCaret();
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
        restoreCanvasCaret();
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
      updateActiveToolbarState();
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

      const lineCount = editorCanvasRef.current.querySelectorAll('div, p').length || 1;
      setTotalLines(lineCount);
    }
  };

  // ─── PASTE SANITIZATION (Supports internal Umo Editor HTML) ──
  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain') || '';

    if (html && (html.includes('style="') || html.includes('<img') || html.includes('{'))) {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      temp.querySelectorAll('script, iframe, style, link').forEach(el => el.remove());
      temp.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      });
      document.execCommand('insertHTML', false, temp.innerHTML);
    } else {
      const cleanText = text.replace(/[^\S\n]+/g, ' ').replace(/\r\n/g, '\n');
      document.execCommand('insertText', false, cleanText);
    }
    handleCanvasInput();
  };

  // ─── KEYBOARD SHORTCUTS, ESCAPE SCALED SPANS & TABLE TAB NAV ───
  const handleEditorKeyDown = (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    // Ctrl+F Find & Replace Drawer
    if (isCtrl && key === 'f') {
      e.preventDefault();
      setShowFindReplace(v => !v);
      return;
    }

    // Ctrl+A Select All Canvas Only
    if (isCtrl && key === 'a') {
      e.preventDefault();
      if (editorCanvasRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorCanvasRef.current);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return;
    }

    // Prevent Enter cloning scaled spans to new lines
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let spanNode = selection.anchorNode;
        while (spanNode && spanNode !== editorCanvasRef.current && spanNode.nodeName !== 'SPAN') {
          spanNode = spanNode.parentNode;
        }
        if (spanNode && spanNode.style && spanNode.style.transform && spanNode.style.transform !== 'none') {
          e.preventDefault();
          let pNode = spanNode;
          while (pNode && pNode !== editorCanvasRef.current && pNode.nodeName !== 'DIV' && pNode.nodeName !== 'P') {
            pNode = pNode.parentNode;
          }
          const newDiv = document.createElement('div');
          newDiv.innerHTML = '<br>';
          if (pNode && pNode.parentNode) {
            pNode.parentNode.insertBefore(newDiv, pNode.nextSibling);
            const range = document.createRange();
            range.setStart(newDiv, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            handleCanvasInput();
            return;
          }
        }
      }
    }

    // Table Tab Navigation
    if (e.key === 'Tab') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let cell = selection.anchorNode;
        while (cell && cell !== editorCanvasRef.current && cell.nodeName !== 'TD' && cell.nodeName !== 'TH') {
          cell = cell.parentNode;
        }
        if (cell && (cell.nodeName === 'TD' || cell.nodeName === 'TH')) {
          e.preventDefault();
          const table = cell.closest('table');
          if (table) {
            const cells = Array.from(table.querySelectorAll('td, th'));
            const idx = cells.indexOf(cell);
            let targetIdx = e.shiftKey ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < cells.length) {
              const targetCell = cells[targetIdx];
              const range = document.createRange();
              range.selectNodeContents(targetCell);
              selection.removeAllRanges();
              selection.addRange(range);
            } else if (!e.shiftKey && targetIdx >= cells.length) {
              const tr = document.createElement('tr');
              const colCount = cell.parentElement.children.length;
              for (let c = 0; c < colCount; c++) {
                const td = document.createElement('td');
                td.style.cssText = 'border:1px dashed #bbb;padding:3px 6px;';
                td.innerText = c === 0 ? `Item Baru` : `Rp 0`;
                tr.appendChild(td);
              }
              table.appendChild(tr);
              const firstTd = tr.firstElementChild;
              const range = document.createRange();
              range.selectNodeContents(firstTd);
              selection.removeAllRanges();
              selection.addRange(range);
              handleCanvasInput();
            }
          }
          return;
        }
      }
    }

    // Undo / Redo
    if (isCtrl && key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
    if ((isCtrl && key === 'y') || (isCtrl && e.shiftKey && key === 'z')) { e.preventDefault(); handleRedo(); return; }

    // Save
    if (isCtrl && key === 's') { e.preventDefault(); handleSaveTemplate(); return; }

    // Formatting Shortcuts: Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Shift+X
    if (isCtrl && key === 'b') { e.preventDefault(); execCmd('bold'); return; }
    if (isCtrl && key === 'i') { e.preventDefault(); execCmd('italic'); return; }
    if (isCtrl && key === 'u') { e.preventDefault(); execCmd('underline'); return; }
    if (isCtrl && e.shiftKey && key === 'x') { e.preventDefault(); execCmd('strikeThrough'); return; }

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

    // Check if entire text or large range is selected (e.g. Ctrl+A)
    if (!selection.isCollapsed) {
      const rangeStr = selection.toString();
      if (rangeStr.length > 50 && rangeStr.includes('\n')) {
        setCurrentLineChars(`Semua (${rangeStr.length})`);
      }
    } else {
      let lineNode = node;
      while (lineNode && lineNode !== editorCanvasRef.current && lineNode.nodeName !== 'DIV' && lineNode.nodeName !== 'P') {
        lineNode = lineNode.parentNode;
      }
      if (lineNode && lineNode !== editorCanvasRef.current) {
        const lineLen = lineNode.innerText ? lineNode.innerText.replace(/\n/g, '').length : 0;
        setCurrentLineChars(lineLen);
      }
    }

    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!node || !editorCanvasRef.current || !editorCanvasRef.current.contains(node)) return;

    const cs = window.getComputedStyle(node);

    // Font family
    const rawFont = (cs.fontFamily || '').toLowerCase();
    const matched = FONT_OPTIONS.find(f => rawFont.includes(f.label.toLowerCase().split(' ')[0].toLowerCase()));
    if (matched) setActiveFontFamily(matched.value);

    // Font size
    const pxSize = parseFloat(cs.fontSize) || 12.5;
    const computedPt = (pxSize * 0.75).toFixed(1).replace(/\.0$/, '');
    setActiveFontSize(computedPt);

    // Line Height (Numeric closest match)
    const rawLh = cs.lineHeight;
    if (rawLh && rawLh !== 'normal') {
      const parsedLh = parseFloat(rawLh) / pxSize;
      if (!isNaN(parsedLh)) {
        const lhOptions = [1.1, 1.35, 1.6, 2.0];
        const closestLh = lhOptions.reduce((prev, curr) =>
          Math.abs(curr - parsedLh) < Math.abs(prev - parsedLh) ? curr : prev
        );
        setActiveLineHeight(closestLh.toString());
      }
    } else {
      setActiveLineHeight('1.35');
    }

    // Bold / Italic / Underline / Strikethrough
    const weight = cs.fontWeight;
    setActiveBold(weight === 'bold' || weight === '700' || parseInt(weight) >= 600);
    setActiveItalic(cs.fontStyle === 'italic');
    const dec = (cs.textDecorationLine || cs.textDecoration || '').toLowerCase();
    setActiveUnderline(dec.includes('underline'));
    setActiveStrikethrough(dec.includes('line-through'));

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
        const topPx = (rect.top - containerRect.top + canvasContainerRef.current.scrollTop - 42);
        const leftPx = Math.max(10, Math.min(
          (rect.left - containerRect.left + canvasContainerRef.current.scrollLeft + (rect.width / 2) - 90),
          containerRect.width - 200
        ));
        setBubblePos({ top: topPx, left: leftPx });
        setShowBubbleMenu(true);
        return;
      }
    }
    setShowBubbleMenu(false);
  };

  // ─── APPLY INLINE STYLE (Prevents Nested Span Bloat) ──────
  const applyInlineSelectionStyle = (styleObj) => {
    if (!editorCanvasRef.current) return;
    let selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      if (restoreSavedSelectionRange()) selection = window.getSelection();
    }
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      showNotice('💡 Blok/sorot teks terlebih dulu untuk mengubah format!');
      editorCanvasRef.current.focus();
      return;
    }
    setEditorNotice('');
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text) return;

    let targetSpan = null;
    let parentSpan = selection.anchorNode;
    if (parentSpan && parentSpan.nodeType === Node.TEXT_NODE) parentSpan = parentSpan.parentNode;
    if (parentSpan && parentSpan.nodeName === 'SPAN' && parentSpan !== editorCanvasRef.current && parentSpan.textContent === text) {
      Object.assign(parentSpan.style, styleObj);
      targetSpan = parentSpan;
    } else {
      const span = document.createElement('span');
      Object.assign(span.style, styleObj);
      span.textContent = text;
      range.deleteContents();
      range.insertNode(span);
      targetSpan = span;
    }

    // Re-save range of targetSpan so spinner arrow clicks & live typing keep selection range intact
    if (targetSpan) {
      try {
        const newRange = document.createRange();
        newRange.selectNodeContents(targetSpan);
        savedSelectionRangeRef.current = newRange.cloneRange();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch (err) { /* ignore fallback */ }
    }

    handleCanvasInput();
    updateActiveToolbarState();
  };

  const applyCustomScalePt = (targetW, targetH) => {
    restoreSavedSelectionRange();
    const w = parseFloat(targetW);
    const h = parseFloat(targetH);
    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) return;
    const base = parseFloat(activeFontSize) || 12.5;
    const scX = (w / base).toFixed(3);
    const scY = (h / base).toFixed(3);
    applyInlineSelectionStyle({
      display: 'inline-block',
      transform: `scale(${scX}, ${scY})`,
      letterSpacing: parseFloat(scX) > 1 ? '0.5px' : 'normal'
    });
  };

  const applyCustomWidthPt = (val) => {
    applyCustomScalePt(val, textHeightPt);
  };

  const applyCustomHeightPt = (val) => {
    applyCustomScalePt(textWidthPt, val);
  };

  // Reset Scale (1.0x / 100% normal)
  const handleResetTextScale = () => {
    restoreSavedSelectionRange();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    let node = selection.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== editorCanvasRef.current && node.nodeName !== 'SPAN') {
      node = node.parentNode;
    }
    if (node && node.nodeName === 'SPAN') {
      node.style.transform = 'none';
      node.style.display = 'inline';
      handleCanvasInput();
      updateActiveToolbarState();
      showNotice('✓ Skala teks berhasil di-reset ke 1.0x (normal)!');
    }
  };

  // Clear Formatting (Strip all inline styles)
  const handleClearFormatting = () => {
    restoreSavedSelectionRange();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      showNotice('💡 Blok/sorot teks terlebih dulu untuk menghapus format!');
      return;
    }
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text) return;
    const textNode = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(textNode);

    try {
      const newRange = document.createRange();
      newRange.setStartAfter(textNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      savedSelectionRangeRef.current = newRange.cloneRange();
    } catch (err) { /* ignore fallback */ }

    handleCanvasInput();
    updateActiveToolbarState();
    showNotice('✓ Format teks berhasil dibersihkan!');
  };

  const applyBlockLineStyle = (styleObj) => {
    restoreSavedSelectionRange();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    let node = selection.anchorNode;
    while (node && node !== editorCanvasRef.current && node.nodeName !== 'DIV' && node.nodeName !== 'P') node = node.parentNode;
    if (node && node !== editorCanvasRef.current) Object.assign(node.style, styleObj);
    handleCanvasInput();
    updateActiveToolbarState();
    if (editorCanvasRef.current) editorCanvasRef.current.focus();
  };

  // Smart execCmd handling un-bolding spans & table cell alignment
  const execCmd = (cmd, val = null) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node = selection.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;

      // Handle un-bolding / un-italicizing spans explicitly
      if (node && node.nodeName === 'SPAN') {
        if (cmd === 'bold' && activeBold) node.style.fontWeight = 'normal';
        if (cmd === 'italic' && activeItalic) node.style.fontStyle = 'normal';
        if (cmd === 'underline' && activeUnderline) node.style.textDecoration = (node.style.textDecoration || '').replace('underline', '').trim();
        if (cmd === 'strikeThrough' && activeStrikethrough) node.style.textDecoration = (node.style.textDecoration || '').replace('line-through', '').trim();
      }

      // Handle table cell alignment
      if (cmd.startsWith('justify')) {
        let cellNode = selection.anchorNode;
        while (cellNode && cellNode !== editorCanvasRef.current && cellNode.nodeName !== 'TD' && cellNode.nodeName !== 'TH') {
          cellNode = cellNode.parentNode;
        }
        if (cellNode && (cellNode.nodeName === 'TD' || cellNode.nodeName === 'TH')) {
          const alignMap = { justifyLeft: 'left', justifyCenter: 'center', justifyRight: 'right', justifyFull: 'justify' };
          cellNode.style.textAlign = alignMap[cmd] || 'left';
          handleCanvasInput();
          updateActiveToolbarState();
          return;
        }
      }
    }

    document.execCommand(cmd, false, val);
    handleCanvasInput();
    updateActiveToolbarState();
    if (editorCanvasRef.current) editorCanvasRef.current.focus();
  };

  // Restores saved selection before HTML insertion to guarantee insertion at exact user cursor position
  const insertHtmlAtCursor = (htmlStr) => {
    if (!editorCanvasRef.current) return;
    editorCanvasRef.current.focus();
    restoreSavedSelectionRange();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlStr;
      const frag = document.createDocumentFragment();
      let node;
      let lastInsertedNode = null;
      while ((node = tempDiv.firstChild)) {
        lastInsertedNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      if (lastInsertedNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastInsertedNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedSelectionRangeRef.current = newRange.cloneRange();
      }
    } else {
      document.execCommand('insertHTML', false, htmlStr);
    }
    handleCanvasInput();
  };

  const insertTable = (rows = 3, cols = 2) => {
    let h = `<table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:inherit;">`;
    for (let r = 0; r < rows; r++) {
      h += `<tr>`;
      for (let c = 0; c < cols; c++) h += `<td style="border:1px dashed #bbb;padding:3px 6px;">${c === 0 ? `Item ${r + 1}` : `Rp 0`}</td>`;
      h += `</tr>`;
    }
    h += `</table><p><br></p>`;
    insertHtmlAtCursor(h);
    setShowInsertMenu(false);
  };

  // Find & Replace Handler
  const handleReplaceAll = () => {
    if (!findText.trim()) return;
    if (editorCanvasRef.current) {
      const html = editorCanvasRef.current.innerHTML;
      const count = (html.match(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count === 0) {
        showNotice(`⚠️ Teks '${findText}' tidak ditemukan!`);
        return;
      }
      const updatedHtml = html.replaceAll(findText, replaceText);
      editorCanvasRef.current.innerHTML = updatedHtml;
      handleCanvasInput();
      showNotice(`✓ Berhasil mengganti ${count} kata '${findText}' menjadi '${replaceText}'!`);
    }
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
    if (!editingTemplate.name.trim()) {
      showNotice('⚠️ Nama template tidak boleh kosong!');
      return;
    }
    const currentHtml = editorCanvasRef.current ? editorCanvasRef.current.innerHTML : editingTemplate.htmlContent;
    const currentPattern = editorCanvasRef.current ? editorCanvasRef.current.innerText : editingTemplate.pattern;
    const saved = { ...editingTemplate, htmlContent: currentHtml, pattern: currentPattern };
    setTemplates(prev => {
      const exists = prev.some(t => t.id === saved.id);
      return exists ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved];
    });
    setIsSaved(true);
    showNotice('✓ Template berhasil disimpan!');
  };

  const handleDeleteTemplate = (id) => {
    if (templates.length <= 1) {
      setGalleryNotice('⚠️ Minimal harus ada 1 template!');
      setTimeout(() => setGalleryNotice(''), 3500);
      return;
    }
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

  // Dynamic font size options to ensure custom sizes are supported in dropdown
  const dynamicSizeOptions = [...SIZE_OPTIONS];
  if (activeFontSize && !SIZE_OPTIONS.some(s => s.value === activeFontSize)) {
    dynamicSizeOptions.unshift({ value: activeFontSize, label: `${activeFontSize} (Custom)` });
  }

  // Filter templates in Gallery View
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.badge || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if active text has custom width/height scaling applied
  const isTextScaled = textWidthPt !== activeFontSize || textHeightPt !== activeFontSize;

  // Compiled preview
  const compiledPreview = parseReceiptTemplate(editingTemplate.htmlContent || editingTemplate.pattern, formData || {});

  // Margin in Px for Canvas Padding
  const marginPx = Math.round(paperMarginMm * (PAPER_WIDTH_PX / PAPER_WIDTH_MM));

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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '32px', width: '200px', height: '38px', fontSize: '0.82rem' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari template..."
                  />
                </div>
                <button className="btn btn-primary btn-lg" onClick={handleCreateNewTemplate}
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}>
                  <Plus size={20} /> + Template Baru
                </button>
              </div>
            </div>
          </div>

          {galleryNotice && (
            <div className="umo-notice" style={{ marginBottom: '16px', borderRadius: '8px' }}>
              <Info size={16} /> {galleryNotice}
            </div>
          )}

          <div className="template-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredTemplates.map(tpl => {
              const sample = parseReceiptTemplate(tpl.htmlContent || tpl.pattern, formData || {});
              const mb = tpl.logoMarginBottom !== undefined ? tpl.logoMarginBottom : -4;
              const isOfficial = tpl.badge === 'Official' || (!tpl.id.startsWith('custom_') && !tpl.id.startsWith('default_custom'));
              return (
                <div key={tpl.id} className="template-card" style={{ padding: '20px', background: 'rgba(15,23,42,0.7)' }}>
                  <span className="template-badge" style={{
                    background: isOfficial ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                    color: isOfficial ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                    border: `1px solid ${isOfficial ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`
                  }}>
                    {tpl.badge || 'Template'}
                  </span>
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
                      onClick={() => {
                        onSelectTemplate(tpl.id, tpl);
                        setGalleryNotice(`✓ Template '${tpl.name}' berhasil dipilih sebagai template aktif!`);
                        setTimeout(() => setGalleryNotice(''), 3500);
                      }}>
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
            <button className="btn btn-secondary" onClick={() => setEditorActive(false)}><ArrowLeft size={16} /> Kembali ke Galeri</button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className={`btn ${showFindReplace ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFindReplace(v => !v)} title="Cari & Ganti Teks (Ctrl+F)">
                <Replace size={16} /> Cari & Ganti
              </button>
              <button className="btn btn-success" onClick={handleSaveTemplate}><Save size={16} /> Simpan Template</button>
            </div>
          </div>

          {/* FIND & REPLACE DRAWER */}
          {showFindReplace && (
            <div className="umo-notice" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '8px', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#202124', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Replace size={14} /> Cari & Ganti Teks:
              </span>
              <input type="text" className="umo-input-pt" style={{ width: '150px', textAlign: 'left', padding: '0 8px' }}
                value={findText} onChange={e => setFindText(e.target.value)} placeholder="Cari kata/tag..." />
              <span style={{ fontSize: '0.8rem', color: '#70757a' }}>➜</span>
              <input type="text" className="umo-input-pt" style={{ width: '150px', textAlign: 'left', padding: '0 8px' }}
                value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Ganti dengan..." />
              <button className="umo-btn" style={{ width: 'auto', padding: '0 10px', background: '#1a73e8', color: '#fff', fontSize: '0.75rem' }}
                onClick={handleReplaceAll}>
                Ganti Semua
              </button>
              <button className="umo-btn" style={{ width: '22px', height: '22px', marginLeft: 'auto' }} onClick={() => setShowFindReplace(false)}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* SPLIT LAYOUT: Editor + Sticky Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>

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
                  onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); handleSaveTemplate(); } }}
                  placeholder="Nama Template..."
                  title="Tekan Enter untuk simpan"
                />
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button className="umo-btn" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
                  <button className="umo-btn" onClick={handleRedo} disabled={historyIndex >= historyStack.length - 1} title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
                </div>
              </div>

              {/* STATIC ACTION BAR (Google Docs Style) */}
              <div className="umo-toolbar">
                {/* Group 1: Font Family */}
                <div className="umo-toolbar-group">
                  <select className="umo-select" style={{ width: '120px' }} value={activeFontFamily}
                    onMouseDown={() => saveCurrentSelectionRange()}
                    onFocus={saveCurrentSelectionRange}
                    onChange={e => applyInlineSelectionStyle({ fontFamily: e.target.value })}>
                    <option value="" disabled>Font</option>
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 2: Font Size */}
                <div className="umo-toolbar-group">
                  <select className="umo-select" style={{ width: '64px' }} value={activeFontSize}
                    onMouseDown={() => saveCurrentSelectionRange()}
                    onFocus={saveCurrentSelectionRange}
                    onChange={e => applyInlineSelectionStyle({ fontSize: `${e.target.value}pt` })}>
                    <option value="" disabled>pt</option>
                    {dynamicSizeOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 3: B I U S & Clear Formatting */}
                <div className="umo-toolbar-group">
                  <button className={`umo-btn ${activeBold ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('bold')} title="Bold (Ctrl+B)"><Bold size={15} /></button>
                  <button className={`umo-btn ${activeItalic ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('italic')} title="Italic (Ctrl+I)"><Italic size={15} /></button>
                  <button className={`umo-btn ${activeUnderline ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('underline')} title="Underline (Ctrl+U)"><Underline size={15} /></button>
                  <button className={`umo-btn ${activeStrikethrough ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('strikeThrough')} title="Strikethrough (Ctrl+Shift+X)"><Strikethrough size={15} /></button>
                  <button className="umo-btn"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={handleClearFormatting} title="Hapus Format (Clear Formatting)"><Scissors size={14} /></button>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 4: Alignment */}
                <div className="umo-toolbar-group">
                  <button className={`umo-btn ${activeAlignment === 'left' || activeAlignment === 'start' ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('justifyLeft')} title="Rata Kiri"><AlignLeft size={15} /></button>
                  <button className={`umo-btn ${activeAlignment === 'center' ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('justifyCenter')} title="Rata Tengah"><AlignCenter size={15} /></button>
                  <button className={`umo-btn ${activeAlignment === 'right' ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('justifyRight')} title="Rata Kanan"><AlignRight size={15} /></button>
                  <button className={`umo-btn ${activeAlignment === 'justify' ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => execCmd('justifyFull')} title="Rata Penuh"><AlignJustify size={15} /></button>
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 5: Width & Height pt + Scale Reset */}
                <div className="umo-toolbar-group" style={{ gap: '4px' }}>
                  <span className="umo-toolbar-label" style={{ marginRight: '2px' }}>W</span>
                  <input type="number" className={`umo-input-pt ${isTextScaled ? 'umo-input-pt-scaled' : ''}`} step="0.5" min="4" max="60"
                    value={textWidthPt}
                    onMouseDown={() => saveCurrentSelectionRange()}
                    onFocus={saveCurrentSelectionRange}
                    onChange={e => {
                      const val = e.target.value;
                      setTextWidthPt(val);
                      applyCustomWidthPt(val);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustomWidthPt(textWidthPt); } }}
                    title="Lebar Teks (pt) — Gunakan panah / ketik" />
                  <span className="umo-toolbar-label" style={{ marginLeft: '4px', marginRight: '2px' }}>H</span>
                  <input type="number" className={`umo-input-pt ${isTextScaled ? 'umo-input-pt-scaled' : ''}`} step="0.5" min="4" max="60"
                    value={textHeightPt}
                    onMouseDown={() => saveCurrentSelectionRange()}
                    onFocus={saveCurrentSelectionRange}
                    onChange={e => {
                      const val = e.target.value;
                      setTextHeightPt(val);
                      applyCustomHeightPt(val);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustomHeightPt(textHeightPt); } }}
                    title="Tinggi Teks (pt) — Gunakan panah / ketik" />
                  {isTextScaled && (
                    <button className="umo-btn" style={{ width: '22px', height: '22px' }}
                      onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                      onClick={handleResetTextScale} title="Reset Skala Teks ke 1.0x (Normal)">
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>

                <div className="umo-toolbar-divider" />

                {/* Group 6: Line Spacing */}
                <div className="umo-toolbar-group">
                  <select className="umo-select" style={{ width: '56px' }} value={activeLineHeight}
                    onMouseDown={() => saveCurrentSelectionRange()}
                    onFocus={saveCurrentSelectionRange}
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveCurrentSelectionRange();
                    }}
                    onClick={() => {
                      saveCurrentSelectionRange();
                      if (!showInsertMenu) updateInsertMenuPos();
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
                    <button className="umo-btn" style={{ width: '22px', height: '22px' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowInsertMenu(false)}><X size={14} /></button>
                  </div>

                  {/* Section: Garis & Tabel */}
                  <div className="umo-insert-menu-section-label">📐 Garis & Tabel</div>
                  <button className="umo-insert-menu-item"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => { insertTable(3, 2); setShowInsertMenu(false); }}><Table size={16} /> Tabel 2 Kolom</button>
                  <button className="umo-insert-menu-item"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => { insertHtmlAtCursor('<hr style="border:none;border-top:1px dashed #000;margin:4px 0;" />'); setShowInsertMenu(false); }}><Minus size={16} /> Garis Putus-Putus (---)</button>
                  <button className="umo-insert-menu-item"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
                    onClick={() => { insertHtmlAtCursor('<hr style="border:none;border-top:2px solid #000;margin:4px 0;" />'); setShowInsertMenu(false); }}><Minus size={16} /> Garis Tebal Solid (___)</button>

                  <div className="umo-insert-menu-divider" />

                  {/* Section: Simbol */}
                  <div className="umo-insert-menu-section-label">✨ Simbol Khusus</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 12px 8px' }}>
                    {SPECIAL_SYMBOLS.map(sym => (
                      <button key={sym} className="umo-symbol-chip" title={`Sisipkan ${sym}`}
                        onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
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
                      <button key={t.tag} className="umo-tag-chip" title={`${t.label}: ${t.sample}`}
                        onMouseDown={(e) => { e.preventDefault(); saveCurrentSelectionRange(); }}
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
                    <button className={`umo-btn ${activeBold ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('bold')}><Bold size={13} /></button>
                    <button className={`umo-btn ${activeItalic ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('italic')}><Italic size={13} /></button>
                    <button className={`umo-btn ${activeUnderline ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('underline')}><Underline size={13} /></button>
                    <button className={`umo-btn ${activeStrikethrough ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('strikeThrough')}><Strikethrough size={13} /></button>
                    <div className="umo-toolbar-divider" style={{ height: '18px' }} />
                    <button className={`umo-btn ${activeAlignment === 'left' || activeAlignment === 'start' ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('justifyLeft')}><AlignLeft size={13} /></button>
                    <button className={`umo-btn ${activeAlignment === 'center' ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('justifyCenter')}><AlignCenter size={13} /></button>
                    <button className={`umo-btn ${activeAlignment === 'right' ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('justifyRight')}><AlignRight size={13} /></button>
                  </div>
                )}

                {/* Ruler */}
                <Ruler widthPx={PAPER_WIDTH_PX} widthMm={PAPER_WIDTH_MM} zoom={zoom} marginMm={paperMarginMm} setPaperMarginMm={setPaperMarginMm} />

                {/* Paper Canvas */}
                <div className="umo-paper" style={{ width: `${PAPER_WIDTH_PX * zoom}px`, paddingLeft: `${marginPx}px`, paddingRight: `${marginPx}px`, transform: `scale(1)`, transformOrigin: 'top center' }}>
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
                    onSelect={saveCurrentSelectionRange}
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: `${12.5 * zoom}px`,
                      lineHeight: '1.35',
                    }}
                  />
                </div>
              </div>

              {/* STATUS BAR */}
              <StatusBar
                zoom={zoom} setZoom={setZoom} isSaved={isSaved}
                currentLineChars={currentLineChars} totalLines={totalLines}
                paperMarginMm={paperMarginMm} setPaperMarginMm={setPaperMarginMm}
              />
            </div>

            {/* ── RIGHT: STICKY LIVE PREVIEW + SETTINGS ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '16px', alignSelf: 'flex-start' }}>
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

                {/* Logo Upload & Reset */}
                <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDropImage}
                  style={{ border: `2px dashed ${isDragOver ? 'var(--accent-cyan)' : 'var(--border-color)'}`, background: isDragOver ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.6)', borderRadius: '8px', padding: '12px', textAlign: 'center', cursor: 'pointer' }}>
                  <Upload size={18} style={{ color: 'var(--accent-cyan)', marginBottom: '4px' }} />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Drop logo di sini atau pilih file</div>
                  <input type="file" accept="image/*" onChange={handleSelectFileImage} style={{ marginTop: '6px', fontSize: '0.72rem' }} />
                </div>

                {editingTemplate.customLogoUrl && (
                  <button className="btn btn-danger btn-block" style={{ marginTop: '10px', fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => setEditingTemplate(prev => ({ ...prev, customLogoUrl: '' }))}>
                    <RotateCcw size={14} /> Reset ke Logo Pertamina SVG
                  </button>
                )}
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
