import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutTemplate, Plus, Edit2, Trash2, Check, RefreshCw, FileText, Tag, Type, Image,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough,
  ZoomIn, ZoomOut, Upload, ArrowLeft, MoveVertical, MoveHorizontal, Table, Minus, List,
  ListOrdered, Palette, Sparkles, Scissors, CornerUpLeft, CornerUpRight, Printer, Save,
  Maximize2, Minimize2, FileCode, CheckSquare, Layers, Undo2, Redo2, Info
} from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { PertaminaLogoExact, parseReceiptTemplate } from './ReceiptPreview';

export default function TemplateManager({
  templates,
  setTemplates,
  onSelectTemplate,
  formData
}) {
  const [editorActive, setEditorActive] = useState(false);
  const editorCanvasRef = useRef(null);

  // Persistent Selection Range Memory Ref to Prevent Selection Loss When Clicking Input Boxes
  const savedSelectionRangeRef = useRef(null);

  // Umo Editor Ribbon Menu Tab State: 'home', 'insert', 'layout'
  const [umoRibbonTab, setUmoRibbonTab] = useState('home');
  
  // Custom Editable Text Width (pt) & Text Height (pt)
  const [textWidthPt, setTextWidthPt] = useState('12.5');
  const [textHeightPt, setTextHeightPt] = useState('12.5');

  // Live Detected Formatting State Under Cursor / Selection
  const [activeFontFamily, setActiveFontFamily] = useState('');
  const [activeFontSize, setActiveFontSize] = useState('12.5');
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeUnderline, setActiveUnderline] = useState(false);
  const [activeAlignment, setActiveAlignment] = useState('left');

  // Non-blocking notice state
  const [editorNotice, setEditorNotice] = useState('');

  // Current Template Being Edited
  const [editingTemplate, setEditingTemplate] = useState({
    id: '',
    name: '',
    description: '',
    badge: 'Custom',
    htmlContent: '',
    pattern: '',
    logoWidth: 160,
    logoMarginBottom: -4,
    customLogoUrl: ''
  });

  // Undo / Redo History Stack Management
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 0 });

  // Record Snapshot into Undo History Stack
  const pushHistorySnapshot = (html) => {
    if (!html) return;
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1);
      if (newStack.length > 0 && newStack[newStack.length - 1] === html) {
        return prev;
      }
      return [...newStack, html];
    });
    setHistoryIndex(prev => prev + 1);
  };

  // Save current active selection range in memory before focus changes
  const saveCurrentSelectionRange = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (editorCanvasRef.current && editorCanvasRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRangeRef.current = range.cloneRange();
      }
    }
  };

  // Restore saved selection range if input box steals focus
  const restoreSavedSelectionRange = () => {
    if (!savedSelectionRangeRef.current) return false;
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRangeRef.current);
      return true;
    } catch (err) {
      return false;
    }
  };

  // Perform Undo (Ctrl+Z)
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetHtml = historyStack[newIndex];
      if (editorCanvasRef.current && targetHtml !== undefined) {
        editorCanvasRef.current.innerHTML = targetHtml;
        setEditingTemplate(prev => ({
          ...prev,
          htmlContent: targetHtml,
          pattern: editorCanvasRef.current.innerText
        }));
        setHistoryIndex(newIndex);
      }
    } else {
      document.execCommand('undo', false, null);
      handleCanvasInput();
    }
  };

  // Perform Redo (Ctrl+Y)
  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      const targetHtml = historyStack[newIndex];
      if (editorCanvasRef.current && targetHtml !== undefined) {
        editorCanvasRef.current.innerHTML = targetHtml;
        setEditingTemplate(prev => ({
          ...prev,
          htmlContent: targetHtml,
          pattern: editorCanvasRef.current.innerText
        }));
        setHistoryIndex(newIndex);
      }
    } else {
      document.execCommand('redo', false, null);
      handleCanvasInput();
    }
  };

  // Initialize Canvas InnerHTML & Initial History Snapshot ONCE when editor is opened
  useEffect(() => {
    if (editorActive && editorCanvasRef.current) {
      const initialHtml = editingTemplate.htmlContent || `<div>${(editingTemplate.pattern || '').replace(/\n/g, '</div><div>')}</div>`;
      editorCanvasRef.current.innerHTML = initialHtml;
      setHistoryStack([initialHtml]);
      setHistoryIndex(0);
    }
  }, [editorActive]);

  const AVAILABLE_TAGS = [
    { tag: '{NO_SPBU}', label: 'No SPBU (3446125)' },
    { tag: '{NAMA_SPBU}', label: 'Nama SPBU' },
    { tag: '{ALAMAT}', label: 'Alamat SPBU' },
    { tag: '{SHIFT}', label: 'Shift Kerja' },
    { tag: '{NO_TRANS}', label: 'No. Transaksi' },
    { tag: '{WAKTU}', label: 'Waktu / Tanggal' },
    { tag: '{POMPA}', label: 'No. Pulau/Pompa' },
    { tag: '{NAMA_PRODUK}', label: 'Nama Produk BBM' },
    { tag: '{HARGA_LITER}', label: 'Harga / Liter' },
    { tag: '{VOLUME}', label: 'Volume (L)' },
    { tag: '{TOTAL_HARGA}', label: 'Total Harga (300,000)' },
    { tag: '{TOTAL_RP}', label: 'Total Rp' },
    { tag: '{OPERATOR}', label: 'Nama Operator' },
    { tag: '{METODE_BAYAR}', label: 'Metode Bayar' },
    { tag: '{PLAT_NO}', label: 'Plat Nomor' }
  ];

  const SPECIAL_SYMBOLS = ['⛽', '🚗', '🏍️', '✓', '★', '☎', '№', 'Rp.', '--------------------------------', '================================'];

  // Normal Input Handler that Syncs State Silently & Pushes History
  const handleCanvasInput = () => {
    if (editorCanvasRef.current) {
      const html = editorCanvasRef.current.innerHTML;
      const text = editorCanvasRef.current.innerText;
      setEditingTemplate(prev => ({
        ...prev,
        htmlContent: html,
        pattern: text
      }));
      pushHistorySnapshot(html);
    }
  };

  // Keyboard Shortcuts Handler
  const handleEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (e.key === 'Backspace') {
      if (editorCanvasRef.current && (editorCanvasRef.current.innerText.trim() === '' || editorCanvasRef.current.innerHTML === '')) {
        setTimeout(() => {
          if (editorCanvasRef.current && editorCanvasRef.current.innerHTML === '') {
            editorCanvasRef.current.innerHTML = '<div><br></div>';
            handleCanvasInput();
          }
        }, 10);
      }
    }
  };

  // Live Auto-Detect Styles Under Cursor or Highlighted Selection (In Pt Units)
  const updateActiveToolbarStateFromSelection = () => {
    saveCurrentSelectionRange();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    if (!node || !editorCanvasRef.current || !editorCanvasRef.current.contains(node)) return;

    const computedStyle = window.getComputedStyle(node);

    // 1. Detect Font Family
    const rawFont = (computedStyle.fontFamily || '').toLowerCase();
    if (rawFont.includes('letter gothic')) {
      setActiveFontFamily("'Letter Gothic', 'Letter Gothic Std', 'Courier Prime', monospace");
    } else if (rawFont.includes('courier new') || rawFont.includes('courier')) {
      setActiveFontFamily("'Courier New', Courier, monospace");
    } else if (rawFont.includes('consolas')) {
      setActiveFontFamily("'Consolas', 'Courier New', monospace");
    } else if (rawFont.includes('jetbrains mono')) {
      setActiveFontFamily("'JetBrains Mono', monospace");
    } else if (rawFont.includes('roboto mono')) {
      setActiveFontFamily("'Roboto Mono', monospace");
    } else if (rawFont.includes('arial')) {
      setActiveFontFamily("'Arial', sans-serif");
    } else if (rawFont.includes('times')) {
      setActiveFontFamily("'Times New Roman', serif");
    } else if (rawFont.includes('trebuchet')) {
      setActiveFontFamily("'Trebuchet MS', sans-serif");
    } else if (rawFont.includes('impact')) {
      setActiveFontFamily("'Impact', sans-serif");
    }

    // 2. Detect Font Size in pt
    const pxSize = parseFloat(computedStyle.fontSize) || 12.5;
    const basePt = (pxSize * 0.75).toFixed(1).replace(/\.0$/, '') || '12.5';
    setActiveFontSize(`${basePt}`);

    // 3. Detect Bold / Italic / Underline
    const weight = computedStyle.fontWeight;
    setActiveBold(weight === 'bold' || weight === '700' || parseInt(weight) >= 600);
    setActiveItalic(computedStyle.fontStyle === 'italic');
    setActiveUnderline((computedStyle.textDecorationLine || computedStyle.textDecoration || '').includes('underline'));

    // 4. Detect Alignment
    const align = computedStyle.textAlign || 'left';
    setActiveAlignment(align);

    // 5. Detect Transform ScaleX / ScaleY -> calculate exact Width (pt) and Height (pt)
    let scaleX = 1;
    let scaleY = 1;
    const transform = computedStyle.transform;
    if (transform && transform !== 'none') {
      const match = transform.match(/matrix\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(',').map(p => parseFloat(p.trim()));
        if (parts.length >= 4) {
          scaleX = parts[0] > 0 ? parts[0] : 1;
          scaleY = parts[3] > 0 ? parts[3] : 1;
        }
      }
    }

    const calculatedWidthPt = (pxSize * 0.75 * scaleX).toFixed(1).replace(/\.0$/, '');
    const calculatedHeightPt = (pxSize * 0.75 * scaleY).toFixed(1).replace(/\.0$/, '');

    setTextWidthPt(calculatedWidthPt);
    setTextHeightPt(calculatedHeightPt);
  };

  // Handle Selection Bubble Formatting Menu & Live Style Detection
  const handleCanvasSelection = () => {
    updateActiveToolbarStateFromSelection();

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0) {
        setBubblePos({
          top: rect.top - 45,
          left: rect.left + rect.width / 2 - 120
        });
        setShowBubbleMenu(true);
        return;
      }
    }
    setShowBubbleMenu(false);
  };

  // Apply Inline Selection Format in Pt Units with Auto Selection Restoration
  const applyInlineSelectionStyle = (styleObj) => {
    if (!editorCanvasRef.current) return;

    let selection = window.getSelection();
    
    // Auto-restore saved selection range if input box took focus!
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      const restored = restoreSavedSelectionRange();
      if (restored) {
        selection = window.getSelection();
      }
    }

    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      setEditorNotice('💡 Petunjuk: Blok/sorot teks terlebih dulu untuk mengubah font/ukuran/lebar!');
      setTimeout(() => setEditorNotice(''), 4000);
      editorCanvasRef.current.focus();
      return;
    }

    setEditorNotice('');
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) {
      editorCanvasRef.current.focus();
      return;
    }

    const span = document.createElement('span');
    Object.assign(span.style, styleObj);
    span.textContent = selectedText;

    range.deleteContents();
    range.insertNode(span);

    handleCanvasInput();
    updateActiveToolbarStateFromSelection();
    editorCanvasRef.current.focus();
  };

  // Apply Text Width in Pt Units
  const applyCustomWidthPt = (targetWidthPtVal) => {
    const numTargetWidthPt = parseFloat(targetWidthPtVal);
    if (isNaN(numTargetWidthPt) || numTargetWidthPt <= 0) return;

    let currentBasePt = parseFloat(activeFontSize) || 12.5;

    // Calculate scale factor: targetWidthPt / currentBasePt
    const scaleFactorX = (numTargetWidthPt / currentBasePt).toFixed(3);
    applyInlineSelectionStyle({
      display: 'inline-block',
      transform: `scaleX(${scaleFactorX})`,
      letterSpacing: '0.5px'
    });
  };

  // Apply Text Height in Pt Units
  const applyCustomHeightPt = (targetHeightPtVal) => {
    const numTargetHeightPt = parseFloat(targetHeightPtVal);
    if (isNaN(numTargetHeightPt) || numTargetHeightPt <= 0) return;

    let currentBasePt = parseFloat(activeFontSize) || 12.5;

    // Calculate scale factor: targetHeightPt / currentBasePt
    const scaleFactorY = (numTargetHeightPt / currentBasePt).toFixed(3);
    applyInlineSelectionStyle({
      display: 'inline-block',
      transform: `scaleY(${scaleFactorY})`
    });
  };

  // Umo Editor Apply Selective Line Spacing or Alignment
  const applyBlockLineStyle = (styleObj) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    let node = selection.anchorNode;
    while (node && node !== editorCanvasRef.current && node.nodeName !== 'DIV' && node.nodeName !== 'P') {
      node = node.parentNode;
    }

    if (node && node !== editorCanvasRef.current) {
      Object.assign(node.style, styleObj);
    } else {
      document.execCommand('formatBlock', false, 'div');
      const newSel = window.getSelection();
      let pNode = newSel.anchorNode;
      while (pNode && pNode.nodeName !== 'DIV') pNode = pNode.parentNode;
      if (pNode) Object.assign(pNode.style, styleObj);
    }

    handleCanvasInput();
    updateActiveToolbarStateFromSelection();
    if (editorCanvasRef.current) editorCanvasRef.current.focus();
  };

  const executeCommand = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    handleCanvasInput();
    updateActiveToolbarStateFromSelection();
    if (editorCanvasRef.current) editorCanvasRef.current.focus();
  };

  // Insert HTML at cursor
  const insertHtmlAtCursor = (htmlStr) => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      document.execCommand('insertHTML', false, htmlStr);
      handleCanvasInput();
      updateActiveToolbarStateFromSelection();
    }
  };

  // Umo Editor Insert Table Function
  const insertUmoTable = (rows = 3, cols = 2) => {
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:inherit;">`;
    for (let r = 0; r < rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < cols; c++) {
        const sampleContent = (c === 0) ? `Kolom ${r+1}` : `Nilai ${r+1}`;
        tableHtml += `<td style="border:1px dashed #cbd5e1; padding:4px 6px;">${sampleContent}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</table><p><br></p>`;
    insertHtmlAtCursor(tableHtml);
  };

  // Open Editor for New Template
  const handleCreateNewTemplate = () => {
    const defaultHtml = `<div style="margin:0; padding:0;">{NO_SPBU}</div><div style="margin:0; padding:0;">{NAMA_SPBU}</div><div style="margin:0; padding:0;">{ALAMAT}</div><div style="margin:0; padding:0;">Shift: {SHIFT}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;No. Trans: {NO_TRANS}</div><div style="margin:0; padding:0;">Waktu: {WAKTU}</div><div><br></div><div style="margin:0; padding:0;">Pulau/Pompa: {POMPA}</div><div style="margin:0; padding:0;">Nama Produk: {NAMA_PRODUK}</div><div style="margin:0; padding:0;">Harga/Liter: Rp. {HARGA_LITER}</div><div style="margin:0; padding:0;">Volume     : (L) {VOLUME}</div><div style="margin:0; padding:0;">Total Harga: Rp. {TOTAL_HARGA}</div><div style="margin:0; padding:0;">Operator   : {OPERATOR}</div><div><br></div><div style="margin:0; padding:0;">{METODE_BAYAR}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{TOTAL_HARGA}</div>`;
    
    const newTpl = {
      id: `custom_tpl_${Date.now()}`,
      name: 'Template Kustom Baru',
      description: 'Template buatan sendiri dengan Umo Editor.',
      badge: 'Custom',
      htmlContent: defaultHtml,
      pattern: `{NO_SPBU}\n{NAMA_SPBU}\n{ALAMAT}\nShift: {SHIFT}          No. Trans: {NO_TRANS}\nWaktu: {WAKTU}\n\nPulau/Pompa: {POMPA}\nNama Produk: {NAMA_PRODUK}\nHarga/Liter: Rp. {HARGA_LITER}\nVolume     : (L) {VOLUME}\nTotal Harga: Rp. {TOTAL_HARGA}\nOperator   : {OPERATOR}\n\n{METODE_BAYAR}                                {TOTAL_HARGA}`,
      logoWidth: 160,
      logoMarginBottom: -4,
      customLogoUrl: ''
    };
    setEditingTemplate(newTpl);
    setEditorActive(true);
  };

  // Open Editor to Edit Existing Template
  const handleEditTemplate = (tpl) => {
    const initialHtml = tpl.htmlContent || `<div style="margin:0; padding:0;">${(tpl.pattern || '').replace(/\n/g, '</div><div style="margin:0; padding:0;">')}</div>`;
    setEditingTemplate({
      ...tpl,
      htmlContent: initialHtml,
      pattern: tpl.pattern || '',
      logoWidth: tpl.logoWidth || 160,
      logoMarginBottom: tpl.logoMarginBottom !== undefined ? tpl.logoMarginBottom : -4,
      customLogoUrl: tpl.customLogoUrl || ''
    });
    setEditorActive(true);
  };

  // Save Template
  const handleSaveTemplate = () => {
    if (!editingTemplate.name) {
      alert('Nama template tidak boleh kosong!');
      return;
    }

    const currentHtml = editorCanvasRef.current ? editorCanvasRef.current.innerHTML : editingTemplate.htmlContent;
    const currentPattern = editorCanvasRef.current ? editorCanvasRef.current.innerText : editingTemplate.pattern;

    const savedObj = {
      ...editingTemplate,
      htmlContent: currentHtml,
      pattern: currentPattern
    };

    setTemplates(prev => {
      const exists = prev.some(t => t.id === savedObj.id);
      if (exists) {
        return prev.map(t => t.id === savedObj.id ? savedObj : t);
      } else {
        return [...prev, savedObj];
      }
    });
    setEditorActive(false);
  };

  // Delete Template
  const handleDeleteTemplate = (id) => {
    if (templates.length <= 1) {
      alert('Minimal harus ada 1 template!');
      return;
    }
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Drag & Drop Image Handler
  const handleDropImage = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditingTemplate(prev => ({ ...prev, customLogoUrl: ev.target.result }));
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const handleSelectFileImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditingTemplate(prev => ({ ...prev, customLogoUrl: ev.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Compiled live text for right preview panel in editor
  const rawHtmlOrPattern = editingTemplate.htmlContent || editingTemplate.pattern;
  const compiledEditorPreviewText = parseReceiptTemplate(rawHtmlOrPattern, formData || {});

  return (
    <div className="scrollable-panel" style={{ width: '100%' }}>
      {/* VIEW 1: GALERI CARD TEMPLATE SAYA */}
      {!editorActive ? (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div className="card-title" style={{ margin: 0 }}>
                <LayoutTemplate size={22} className="text-blue" />
                <span>Galeri Template Struk Saya (Umo Editor Adapted)</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleCreateNewTemplate}
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}
                >
                  <Plus size={20} /> + Tambahkan Template Baru (Umo Editor)
                </button>
              </div>
            </div>
          </div>

          <div className="template-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {templates.map(tpl => {
              const compiledSample = parseReceiptTemplate(tpl.htmlContent || tpl.pattern, formData || {});
              const mb = tpl.logoMarginBottom !== undefined ? tpl.logoMarginBottom : -4;
              return (
                <div key={tpl.id} className="template-card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.7)' }}>
                  <span className="template-badge">{tpl.badge || 'Template'}</span>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{tpl.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tpl.description}</p>
                  </div>

                  <div
                    style={{
                      background: '#fff',
                      color: '#000',
                      padding: '12px',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      fontFamily: "'Courier New', monospace",
                      fontSize: '10px',
                      lineHeight: '1.3',
                      maxHeight: '160px',
                      overflow: 'hidden',
                      position: 'relative',
                      marginBottom: '16px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: `${mb}px`, padding: 0, lineHeight: 1 }}>
                      {tpl.customLogoUrl ? (
                        <img src={tpl.customLogoUrl} alt="Logo" style={{ maxHeight: '24px', maxWidth: '100px', display: 'inline-block', margin: 0 }} />
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <PertaminaLogoExact width={90} height={26} />
                        </div>
                      )}
                    </div>
                    {tpl.htmlContent ? (
                      <div dangerouslySetInnerHTML={{ __html: compiledSample }} />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {compiledSample || tpl.pattern || 'Sample Template Struk...'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => {
                        onSelectTemplate(tpl.id, tpl);
                        alert(`Template '${tpl.name}' dipilih!`);
                      }}
                    >
                      <Check size={16} /> Gunakan Template Ini
                    </button>
                    
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px' }}
                      title="Edit Template di Umo Editor"
                      onClick={() => handleEditTemplate(tpl)}
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      className="btn btn-danger"
                      style={{ padding: '8px 12px' }}
                      title="Hapus Template"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* VIEW 2: UMO EDITOR ADAPTED INTERFACE WITH PERSISTENT SELECTION MEMORY */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Control Bar */}
          <div className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setEditorActive(false)}>
              <ArrowLeft size={18} /> Kembali ke Galeri Template
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-success btn-lg" onClick={handleSaveTemplate}>
                <Check size={18} /> Simpan Template Struk
              </button>
            </div>
          </div>

          {/* Template Details Meta Form */}
          <div className="card" style={{ padding: '14px 20px' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nama Template</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Contoh: Template SPBU Sukaraja Real"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Label Badge</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTemplate.badge}
                  onChange={e => setEditingTemplate({ ...editingTemplate, badge: e.target.value })}
                  placeholder="Custom / Official"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Deskripsi Template</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTemplate.description}
                  onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Deskripsi singkat template struk..."
                />
              </div>
            </div>
          </div>

          {/* SPLIT-LAYOUT EDITOR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', position: 'relative' }}>
            {/* UMO EDITOR FLOATING BUBBLE SELECTION MENU */}
            {showBubbleMenu && (
              <div
                style={{
                  position: 'fixed',
                  top: `${bubblePos.top}px`,
                  left: `${bubblePos.left}px`,
                  zIndex: 9999,
                  background: '#0f172a',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  display: 'flex',
                  gap: '4px',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
                  animation: 'fadeIn 0.15s ease'
                }}
              >
                <button type="button" className={`pill-btn ${activeBold ? 'active' : ''}`} style={{ padding: '4px 6px' }} onClick={() => executeCommand('bold')}>
                  <Bold size={12} />
                </button>
                <button type="button" className={`pill-btn ${activeItalic ? 'active' : ''}`} style={{ padding: '4px 6px' }} onClick={() => executeCommand('italic')}>
                  <Italic size={12} />
                </button>

                <button type="button" className="pill-btn" style={{ padding: '4px 6px' }} onClick={() => applyInlineSelectionStyle({ fontSize: '14pt' })}>
                  14pt
                </button>
                <button type="button" className="pill-btn" style={{ padding: '4px 6px' }} onClick={() => applyInlineSelectionStyle({ fontSize: '16pt' })}>
                  16pt
                </button>

                <button type="button" className={`pill-btn ${activeAlignment === 'left' ? 'active' : ''}`} style={{ padding: '4px 6px' }} onClick={() => executeCommand('justifyLeft')}>
                  <AlignLeft size={12} />
                </button>
                <button type="button" className={`pill-btn ${activeAlignment === 'center' ? 'active' : ''}`} style={{ padding: '4px 6px' }} onClick={() => executeCommand('justifyCenter')}>
                  <AlignCenter size={12} />
                </button>
                <button type="button" className={`pill-btn ${activeAlignment === 'right' ? 'active' : ''}`} style={{ padding: '4px 6px' }} onClick={() => executeCommand('justifyRight')}>
                  <AlignRight size={12} />
                </button>
              </div>
            )}

            {/* LEFT COLUMN: UMO EDITOR RIBBON + PAPER CANVAS */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #2563eb', boxShadow: '0 8px 25px rgba(37,99,235,0.2)', margin: 0 }}>
              {/* Umo Editor Brand Header */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #0f172a)', padding: '10px 16px', color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} className="text-cyan" />
                  <span>Umo Editor - Word Thermal Receipt Designer</span>
                </div>
                
                {/* UNDO & REDO BUTTONS IN HEADER */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="pill-btn"
                    style={{ padding: '4px 8px', color: historyIndex > 0 ? '#fff' : 'var(--text-muted)' }}
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 size={14} /> Undo
                  </button>

                  <button
                    type="button"
                    className="pill-btn"
                    style={{ padding: '4px 8px', color: historyIndex < historyStack.length - 1 ? '#fff' : 'var(--text-muted)' }}
                    onClick={handleRedo}
                    disabled={historyIndex >= historyStack.length - 1}
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 size={14} /> Redo
                  </button>
                </div>
              </div>

              {/* Umo Editor Ribbon Tabs Bar */}
              <div style={{ background: '#1e293b', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '2px', padding: '0 8px' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px', border: 'none',
                    background: umoRibbonTab === 'home' ? '#0f172a' : 'transparent',
                    color: umoRibbonTab === 'home' ? '#60a5fa' : 'var(--text-muted)',
                    borderBottom: umoRibbonTab === 'home' ? '2px solid #3b82f6' : 'none',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                  onClick={() => setUmoRibbonTab('home')}
                >
                  Beranda (Home Toolbar)
                </button>

                <button
                  type="button"
                  style={{
                    padding: '8px 16px', border: 'none',
                    background: umoRibbonTab === 'insert' ? '#0f172a' : 'transparent',
                    color: umoRibbonTab === 'insert' ? '#60a5fa' : 'var(--text-muted)',
                    borderBottom: umoRibbonTab === 'insert' ? '2px solid #3b82f6' : 'none',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                  onClick={() => setUmoRibbonTab('insert')}
                >
                  Sisipkan (Nodes & Logo Spacing)
                </button>
              </div>

              {/* NON-BLOCKING EDITOR NOTICE BANNER */}
              {editorNotice && (
                <div style={{ background: '#0284c7', color: '#ffffff', padding: '6px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <Info size={14} /> <span>{editorNotice}</span>
                </div>
              )}

              {/* Umo Editor Ribbon Toolbar Content Area */}
              <div style={{ background: '#0f172a', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                {umoRibbonTab === 'home' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    {/* Undo & Redo Toolbar Group */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Riwayat (History)</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" className="pill-btn" style={{ padding: '4px 8px' }} onClick={handleUndo} title="Undo (Ctrl+Z)">
                          <Undo2 size={14} /> Undo
                        </button>
                        <button type="button" className="pill-btn" style={{ padding: '4px 8px' }} onClick={handleRedo} title="Redo (Ctrl+Y)">
                          <Redo2 size={14} /> Redo
                        </button>
                      </div>
                    </div>

                    {/* Font Family Selection Dropdown with Live Auto-Detection */}
                    <div className="form-group" style={{ margin: 0, width: '140px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Font Teks</label>
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: activeFontFamily ? 700 : 400 }}
                        onChange={e => applyInlineSelectionStyle({ fontFamily: e.target.value })}
                        value={activeFontFamily}
                      >
                        <option value="" disabled>-- Font --</option>
                        <option value="'Courier New', Courier, monospace">Courier New</option>
                        <option value="'Consolas', 'Courier New', monospace">Consolas</option>
                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                        <option value="'Roboto Mono', monospace">Roboto Mono</option>
                        <option value="'Arial', sans-serif">Arial</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                        <option value="'Impact', sans-serif">Impact</option>
                      </select>
                    </div>

                    {/* Font Size with Live Auto-Detection */}
                    <div className="form-group" style={{ margin: 0, width: '100px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Ukuran Font (pt)</label>
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: activeFontSize ? 700 : 400 }}
                        onChange={e => applyInlineSelectionStyle({ fontSize: `${e.target.value}pt` })}
                        value={activeFontSize}
                      >
                        <option value="" disabled>-- Size --</option>
                        <option value="10">10 pt</option>
                        <option value="11">11 pt</option>
                        <option value="12">12 pt</option>
                        <option value="12.5">12.5 pt</option>
                        <option value="14">14 pt</option>
                        <option value="16">16 pt</option>
                        <option value="18">18 pt</option>
                        <option value="20">20 pt</option>
                      </select>
                    </div>

                    {/* Styles B / I / U / S with Live Highlighted State Indicator */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Styles</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" className={`pill-btn ${activeBold ? 'active' : ''}`} style={{ padding: '4px 8px' }} onClick={() => executeCommand('bold')} title="Bold">
                          <Bold size={13} />
                        </button>
                        <button type="button" className={`pill-btn ${activeItalic ? 'active' : ''}`} style={{ padding: '4px 8px' }} onClick={() => executeCommand('italic')} title="Italic">
                          <Italic size={13} />
                        </button>
                        <button type="button" className={`pill-btn ${activeUnderline ? 'active' : ''}`} style={{ padding: '4px 8px' }} onClick={() => executeCommand('underline')} title="Underline">
                          <Underline size={13} />
                        </button>
                        <button type="button" className="pill-btn" style={{ padding: '4px 8px' }} onClick={() => executeCommand('strikeThrough')} title="Strikethrough">
                          <Strikethrough size={13} />
                        </button>
                      </div>
                    </div>

                    {/* CUSTOM EDITABLE NUMERIC INPUT FOR LEBAR TEKS (pt) WITH SELECTION RANGE PRESERVATION */}
                    <div className="form-group" style={{ margin: 0, width: '150px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                        <MoveHorizontal size={11} /> Lebar Teks (pt)
                      </label>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="4"
                          max="60"
                          className="form-input"
                          style={{ padding: '4px 6px', fontSize: '0.8rem', width: '70px', borderColor: 'var(--accent-cyan)' }}
                          value={textWidthPt}
                          onChange={e => setTextWidthPt(e.target.value)}
                          onFocus={saveCurrentSelectionRange}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyCustomWidthPt(textWidthPt);
                            }
                          }}
                          placeholder="12.5"
                        />
                        <button
                          type="button"
                          className="pill-btn"
                          style={{ padding: '4px 6px', fontSize: '0.75rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                          onMouseDown={saveCurrentSelectionRange}
                          onClick={() => applyCustomWidthPt(textWidthPt)}
                        >
                          Ubah
                        </button>
                      </div>
                    </div>

                    {/* CUSTOM EDITABLE NUMERIC INPUT FOR TINGGI TEKS (pt) WITH SELECTION RANGE PRESERVATION */}
                    <div className="form-group" style={{ margin: 0, width: '150px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)' }}>
                        <MoveVertical size={11} /> Tinggi Teks (pt)
                      </label>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="4"
                          max="60"
                          className="form-input"
                          style={{ padding: '4px 6px', fontSize: '0.8rem', width: '70px', borderColor: 'var(--accent-emerald)' }}
                          value={textHeightPt}
                          onChange={e => setTextHeightPt(e.target.value)}
                          onFocus={saveCurrentSelectionRange}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyCustomHeightPt(textHeightPt);
                            }
                          }}
                          placeholder="12.5"
                        />
                        <button
                          type="button"
                          className="pill-btn"
                          style={{ padding: '4px 6px', fontSize: '0.75rem', borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }}
                          onMouseDown={saveCurrentSelectionRange}
                          onClick={() => applyCustomHeightPt(textHeightPt)}
                        >
                          Ubah
                        </button>
                      </div>
                    </div>

                    {/* Line Spacing */}
                    <div className="form-group" style={{ margin: 0, width: '110px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Line Spacing</label>
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onChange={e => applyBlockLineStyle({ lineHeight: e.target.value })}
                        defaultValue=""
                      >
                        <option value="" disabled>-- Spasi --</option>
                        <option value="1.1">1.10 (Padat)</option>
                        <option value="1.35">1.35 (Normal)</option>
                        <option value="1.6">1.60 (Renggang)</option>
                        <option value="2.0">2.00 (Ganda)</option>
                      </select>
                    </div>

                    {/* Text Alignment with Live Highlighted Active State */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Rataan Teks</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" className={`pill-btn ${activeAlignment === 'left' ? 'active' : ''}`} onClick={() => executeCommand('justifyLeft')} title="Rata Kiri">
                          <AlignLeft size={14} />
                        </button>
                        <button type="button" className={`pill-btn ${activeAlignment === 'center' ? 'active' : ''}`} onClick={() => executeCommand('justifyCenter')} title="Rata Tengah">
                          <AlignCenter size={14} />
                        </button>
                        <button type="button" className={`pill-btn ${activeAlignment === 'right' ? 'active' : ''}`} onClick={() => executeCommand('justifyRight')} title="Rata Kanan">
                          <AlignRight size={14} />
                        </button>
                        <button type="button" className={`pill-btn ${activeAlignment === 'justify' ? 'active' : ''}`} onClick={() => executeCommand('justifyFull')} title="Justify">
                          <AlignJustify size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {umoRibbonTab === 'insert' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Insert Word Table & Line Dividers */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => insertUmoTable(3, 2)}
                      >
                        <Table size={15} /> Sisipkan Tabel Umo 2 Kolom
                      </button>

                      <button
                        type="button"
                        className="pill-btn"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => insertHtmlAtCursor('<hr style="border:none; border-top:1px dashed #000; margin:4px 0;" />')}
                      >
                        <Minus size={14} /> Garis Putus-Putus (---)
                      </button>

                      <button
                        type="button"
                        className="pill-btn"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => insertHtmlAtCursor('<hr style="border:none; border-top:2px solid #000; margin:4px 0;" />')}
                      >
                        <Minus size={14} /> Garis Tebal Solid (___)
                      </button>
                    </div>

                    {/* Special Symbols */}
                    <div>
                      <div className="form-label" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>
                        Sisipkan Simbol Khusus Struk:
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {SPECIAL_SYMBOLS.map(sym => (
                          <button
                            key={sym}
                            type="button"
                            className="pill-btn"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => insertHtmlAtCursor(`<span>${sym}</span>`)}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tag Buttons */}
                    <div>
                      <div className="form-label" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>
                        <Tag size={12} /> Klik Variabel Tag untuk Menyisipkan di Posisi Kursor:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {AVAILABLE_TAGS.map(t => (
                          <button
                            key={t.tag}
                            type="button"
                            className="pill-btn"
                            style={{ background: 'rgba(59,130,246,0.2)', color: 'var(--accent-cyan)', fontSize: '0.75rem' }}
                            onClick={() => insertHtmlAtCursor(`<span>${t.tag}</span>`)}
                          >
                            <Plus size={11} /> {t.tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* LOGO SIZE & LOGO SPACING MARGIN CONTROLS */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <div className="form-label" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                        🖼️ Pengaturan Ukuran Logo & Kerapatan Jarak Logo ke Teks:
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                        {/* Logo Width */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ukuran Logo ({editingTemplate.logoWidth || 160}px):</span>
                          <input
                            type="range"
                            min="80"
                            max="240"
                            value={editingTemplate.logoWidth || 160}
                            onChange={e => setEditingTemplate({ ...editingTemplate, logoWidth: parseInt(e.target.value) })}
                            style={{ width: '130px', accentColor: 'var(--accent-blue)' }}
                          />
                        </div>

                        {/* Logo Bottom Margin Spacing Slider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            Jarak Logo ke Teks ({editingTemplate.logoMarginBottom !== undefined ? editingTemplate.logoMarginBottom : -4}px):
                          </span>
                          <input
                            type="range"
                            min="-20"
                            max="40"
                            step="2"
                            value={editingTemplate.logoMarginBottom !== undefined ? editingTemplate.logoMarginBottom : -4}
                            onChange={e => setEditingTemplate({ ...editingTemplate, logoMarginBottom: parseInt(e.target.value) })}
                            style={{ width: '130px', accentColor: 'var(--accent-emerald)' }}
                          />
                          <button
                            type="button"
                            className="pill-btn"
                            onClick={() => setEditingTemplate({ ...editingTemplate, logoMarginBottom: -12 })}
                            style={{ fontSize: '0.7rem', padding: '2px 6px', borderColor: 'var(--accent-cyan)' }}
                          >
                            ⚡ Ultra Rapat (-12px)
                          </button>
                          <button
                            type="button"
                            className="pill-btn"
                            onClick={() => setEditingTemplate({ ...editingTemplate, logoMarginBottom: 0 })}
                            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                          >
                            Rapat (0px)
                          </button>
                        </div>
                      </div>

                      {/* DRAG & DROP LOGO DROPZONE */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDropImage}
                        style={{
                          border: `2px dashed ${isDragOver ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                          background: isDragOver ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.6)',
                          borderRadius: '8px',
                          padding: '12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          marginTop: '12px'
                        }}
                      >
                        <Upload size={20} style={{ color: 'var(--accent-cyan)', marginBottom: '4px' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Tarik & Lepas File Gambar Logo (PNG/JPG) di sini (atau Pilih File)
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSelectFileImage}
                          style={{ marginTop: '6px', fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* UMO EDITOR PHYSICAL PAPER CANVAS */}
              <div
                style={{
                  padding: '24px',
                  background: '#020617',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: '400px'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '10px', textAlign: 'center' }}>
                  📄 <b>Umo Editor Physical Paper Sheet:</b> Blok kata & ketik angka pt di Lebar/Tinggi Teks lalu tekan Ubah!
                </div>

                {/* Physical Document Paper */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '2px',
                    boxShadow: '0 12px 35px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                    padding: '24px 28px',
                    minHeight: '340px',
                    position: 'relative'
                  }}
                >
                  <div
                    ref={editorCanvasRef}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onKeyDown={handleEditorKeyDown}
                    onInput={handleCanvasInput}
                    onMouseUp={handleCanvasSelection}
                    onKeyUp={handleCanvasSelection}
                    onClick={updateActiveToolbarStateFromSelection}
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: '12.5px',
                      lineHeight: '1.35',
                      outline: 'none',
                      cursor: 'text',
                      minHeight: '260px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: REAL-TIME PHYSICAL 58mm THERMAL RECEIPT LIVE PREVIEW */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <EyeIcon /> <span>Live Preview Struk Real-Time</span>
              </div>

              <div
                className="receipt-wrapper"
                style={{
                  width: '300px',
                  margin: 0,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{ color: '#000' }}>
                  {/* Logo Preview */}
                  <div
                    style={{
                      textAlign: 'center',
                      marginBottom: `${editingTemplate.logoMarginBottom !== undefined ? editingTemplate.logoMarginBottom : -4}px`,
                      padding: 0,
                      lineHeight: 1
                    }}
                  >
                    {editingTemplate.customLogoUrl ? (
                      <img
                        src={editingTemplate.customLogoUrl}
                        alt="Logo"
                        style={{ width: `${editingTemplate.logoWidth || 160}px`, height: 'auto', maxHeight: '70px', objectFit: 'contain', display: 'inline-block', margin: 0 }}
                      />
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PertaminaLogoExact width={editingTemplate.logoWidth || 160} />
                      </div>
                    )}
                  </div>

                  {/* Compiled Live Text / HTML Preview */}
                  <div dangerouslySetInnerHTML={{ __html: compiledEditorPreviewText }} />
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
