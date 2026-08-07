import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Printer, Save, Image, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, Bold } from 'lucide-react';

// Exact Authentic Pertamina Logo Vector SVG
export function PertaminaLogoExact({ width = 160, height = 48 }) {
  const calculatedHeight = Math.round(width * (48 / 160));
  return (
    <svg viewBox="0 0 520 160" width={width} height={calculatedHeight} xmlns="http://www.w3.org/2000/svg">
      <g fill="#000000">
        <path d="M 112,24 L 160,24 C 168,24 174,27 178,33 L 194,56 C 197,60 197,66 194,70 L 178,93 C 174,99 168,102 160,102 L 132,102 L 152,73 C 153,71 153,69 152,67 L 138,47 C 135,43 130,40 125,40 L 101,40 Z" />
        <path d="M 32,136 L 102,36 C 105,31 111,28 117,28 L 134,28 L 68,136 C 65,141 59,144 53,144 L 36,144 C 30,144 26,140 28,136 Z" />
        <path d="M 104,102 L 160,102 C 166,102 170,106 170,112 L 170,126 C 170,136 166,136 160,136 L 81,136 Z" />
        <text
          x="205"
          y="114"
          fontFamily="'Segoe UI Black', 'Arial Black', 'Montserrat', 'Trebuchet MS', sans-serif"
          fontWeight="900"
          fontSize="66"
          fill="#000000"
          letterSpacing="-0.5px"
        >
          PERTAMINA
        </text>
      </g>
    </svg>
  );
}

// Template Parser Function replacing dynamic tags with live form data
export function parseReceiptTemplate(templatePatternText, data) {
  if (!templatePatternText) return '';

  const commaPrice = (data?.pricePerLiter || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const commaTotal = (data?.totalAmount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const literDot = (parseFloat(data?.liter) || 0).toFixed(2);
  const fuelFormatted = (data?.fuelName || 'PERTAMINA_DEX').toUpperCase().replace(/\s+/g, '_');

  const dateStr = data?.date || (data?.dateTime ? data.dateTime.split(' ')[0] : '04/08/2026');
  const timeStr = data?.time || (data?.dateTime ? data.dateTime.split(' ')[1] || '07:52:30' : '07:52:30');
  const dateTimeCombined = data?.dateTime || `${dateStr} ${timeStr}`;

  let parsed = templatePatternText
    .replace(/\{NO_SPBU\}/g, data?.spbuNo || '3446125')
    .replace(/\{NAMA_SPBU\}/g, (data?.spbuName || 'SPBU RY SUKARAJA JENGGALA').toUpperCase())
    .replace(/\{ALAMAT\}/g, (data?.spbuAddress || 'JL. RAYA SUKARAJA DS. JENGGALA').toUpperCase())
    .replace(/\{SHIFT\}/g, data?.shift || '1')
    .replace(/\{NO_TRANS\}/g, data?.transactionNo ? data.transactionNo.replace('STR-', '') : '6137760')
    .replace(/\{WAKTU\}/g, dateTimeCombined)
    .replace(/\{TANGGAL\}/g, dateStr)
    .replace(/\{JAM\}/g, timeStr)
    .replace(/\{POMPA\}/g, data?.pumpNo || '1')
    .replace(/\{NAMA_PRODUK\}/g, fuelFormatted)
    .replace(/\{HARGA_LITER\}/g, commaPrice)
    .replace(/\{HARGA_RP\}/g, `Rp. ${commaPrice}`)
    .replace(/\{VOLUME\}/g, literDot)
    .replace(/\{TOTAL_HARGA\}/g, commaTotal)
    .replace(/\{TOTAL_RP\}/g, `Rp. ${commaTotal}`)
    .replace(/\{OPERATOR\}/g, (data?.operatorName || 'AJIS').toUpperCase())
    .replace(/\{METODE_BAYAR\}/g, (data?.paymentMethod || 'CASH').toUpperCase())
    .replace(/\{PLAT_NO\}/g, (data?.platNo || '').toUpperCase());

  // If text is plain text without HTML divs, convert into clean structured divs
  if (!parsed.includes('<div') && !parsed.includes('<span')) {
    const lines = parsed.split('\n');
    parsed = lines.map(line => {
      // Auto convert 2-column spaced lines (e.g. CASH                 500,000)
      const spaceMatch = line.match(/^(\S.*?)\s{5,}(\S.*)$/);
      if (spaceMatch) {
        return `<div style="display: flex; justify-content: space-between; width: 100%; margin: 0; padding: 0;"><span>${spaceMatch[1]}</span><span>${spaceMatch[2]}</span></div>`;
      }
      return `<div style="margin: 0; padding: 0;">${line || '&nbsp;'}</div>`;
    }).join('');
  }

  return parsed;
}

export default function ReceiptPreview({
  templatePattern,
  setTemplatePattern,
  fontSettings,
  setFontSettings,
  logoWidth,
  setLogoWidth,
  receiptData,
  template,
  onPrint,
  onSaveHistory,
  isPrinting,
  selectedPrinter = ''
}) {
  const receiptRef = useRef(null);
  const editableRef = useRef(null);
  const activeTemplate = template || {};

  const currentLogoWidth = activeTemplate.logoWidth || logoWidth || 160;
  const currentLogoMarginBottom = activeTemplate.logoMarginBottom !== undefined ? activeTemplate.logoMarginBottom : -4;
  
  const paperWidthMm = activeTemplate.paperWidthMm || fontSettings?.paperWidth || 58;
  const paperWidthPx = Math.round(paperWidthMm * (384 / 58));
  const paperMarginMm = activeTemplate.paperMarginMm !== undefined ? activeTemplate.paperMarginMm : 0;
  const marginPx = Math.round(paperMarginMm * (paperWidthPx / paperWidthMm));

  // Parsed Text result with dynamic variables replaced
  const activeContent = activeTemplate.htmlContent || activeTemplate.pattern || templatePattern;
  const compiledText = parseReceiptTemplate(activeContent, receiptData);

  // Execute Selection Formatting
  const applySelectionFormat = (command, value = null) => {
    if (editableRef.current) {
      editableRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  // Sync user direct edits on paper preview back to template pattern safely
  const handleDirectInlineEdit = (e) => {
    const text = e.target.innerText;
    // Only update if template pattern is raw text (doesn't contain structured template tags)
    if (!activeTemplate.htmlContent) {
      setTemplatePattern(text);
    }
  };

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleConfirmPrint = async () => {
    setShowPreviewModal(false);
    
    // Direct Native Vector HTML Mode (Matches original SPBU receipt 100% with razor-sharp thin vector text)
    const isBitmapMode = false; // Set to true only if bitmap capture is explicitly needed

    if (isBitmapMode && receiptRef.current) {
      try {
        const canvas = await html2canvas(receiptRef.current, {
          scale: 4,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false
        });

        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const val = luminance < 210 ? 0 : 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        const imgUrl = canvas.toDataURL('image/png');
        const imageHtml = `<div class="receipt-wrapper" style="width:100%; text-align:center; margin:0; padding:0; background:#fff;"><img src="${imgUrl}" style="width:100%; height:auto; display:block; margin:0 auto; image-rendering:pixelated; image-rendering:crisp-edges;" /></div>`;
        onPrint(imageHtml);
        return;
      } catch (err) {
        console.warn('html2canvas capture warning, fallback to HTML:', err);
      }
    }

    // Direct Native Vector HTML Print (Default & 100% Authentic Vector Text)
    onPrint(receiptRef.current?.outerHTML || receiptRef.current?.innerHTML);
  };

  return (
    <div className="preview-container">
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '320px' }}>
        <button
          className="btn btn-success btn-block"
          onClick={() => setShowPreviewModal(true)}
          disabled={isPrinting}
        >
          <Printer size={18} />
          <span>{isPrinting ? 'Mencetak...' : `Cetak Struk (${paperWidthMm}mm)`}</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '320px' }}>
        <button
          className="btn btn-secondary btn-block"
          onClick={onSaveHistory}
        >
          <Save size={16} />
          <span>Simpan ke Riwayat</span>
        </button>
      </div>

      {/* PRINT PREVIEW MODAL DIALOG */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto',
            background: 'var(--bg-card)', border: '1px solid var(--accent-cyan)',
            borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', padding: '16px 20px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={20} /> Pratinjau Sebelum Cetak (Print Preview)
              </div>
              <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setShowPreviewModal(false)}>✕</button>
            </div>

            {/* Thermal Receipt Preview Paper Card - Dynamic Paper Width */}
            <div style={{ background: '#334155', padding: '16px 8px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', marginBottom: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ width: `${paperWidthPx}px`, minWidth: `${paperWidthPx}px`, flexShrink: 0, height: 'auto', transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-40px' }}>
                <div className="receipt-wrapper" style={{ margin: '0 auto', width: `${paperWidthPx}px`, minWidth: `${paperWidthPx}px`, maxWidth: `${paperWidthPx}px`, boxSizing: 'border-box', paddingLeft: `${marginPx}px`, paddingRight: `${marginPx}px`, boxShadow: '0 10px 25px rgba(0,0,0,0.6)' }}>
                  <div style={{ color: '#000', letterSpacing: '-0.2px' }}>
                    {activeTemplate.showLogo !== false && (
                      <div style={{ textAlign: 'center', marginBottom: `${currentLogoMarginBottom}px`, padding: 0, lineHeight: 1 }}>
                        {activeTemplate.customLogoUrl || receiptData?.customLogoUrl ? (
                          <img src={activeTemplate.customLogoUrl || receiptData.customLogoUrl} alt="Logo" style={{ width: `${currentLogoWidth}px`, height: 'auto', maxHeight: '70px', objectFit: 'contain', display: 'inline-block', margin: 0 }} />
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center' }}><PertaminaLogoExact width={currentLogoWidth} /></div>
                        )}
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: compiledText }} style={{ fontFamily: "'GB18030', 'SimSun', 'SimHei', 'Lucida Console', 'Consolas', 'Courier New', monospace", fontSize: '7.5pt', fontWeight: 600, lineHeight: '1.25', letterSpacing: '-0.4px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Printer Spec Summary */}
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-color)' }}>
              <div>📄 <b>Ukuran Kertas:</b> Thermal {paperWidthMm}mm ({paperWidthPx}px @ 203 DPI)</div>
              <div>🖨️ <b>Target Printer:</b> {selectedPrinter || 'Printer Windows Standar (Dialog Cetak)'}</div>
              <div>✨ <b>Status Format:</b> Presisi 100% Sesuai Struk Fisik</div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPreviewModal(false)}>
                Batal
              </button>
              <button className="btn btn-success" style={{ flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }} onClick={handleConfirmPrint}>
                <Printer size={18} /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Selection Alignment Toolbar */}
      <div
        style={{
          width: '100%',
          maxWidth: '320px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Selection Formatting Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format Baris Diblok:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button type="button" className="pill-btn" style={{ padding: '4px 8px' }} onClick={() => applySelectionFormat('bold')} title="Bold">
              <Bold size={13} />
            </button>
            <button type="button" className="pill-btn" style={{ padding: '4px 8px' }} onClick={() => applySelectionFormat('justifyLeft')} title="Rata Kiri">
              <AlignLeft size={13} /> Kiri
            </button>
            <button type="button" className="pill-btn" style={{ padding: '4px 8px' }} onClick={() => applySelectionFormat('justifyCenter')} title="Rata Tengah">
              <AlignCenter size={13} /> Tengah
            </button>
            <button type="button" className="pill-btn" style={{ padding: '4px 8px' }} onClick={() => applySelectionFormat('justifyRight')} title="Rata Kanan">
              <AlignRight size={13} /> Kanan
            </button>
          </div>
        </div>

        {/* Logo Resizer Slider */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Image size={13} className="text-cyan" /> Ukuran Logo ({currentLogoWidth}px)
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button type="button" className="pill-btn" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => setLogoWidth(Math.max(80, (currentLogoWidth) - 20))}>
              <ZoomOut size={12} />
            </button>
            <button type="button" className="pill-btn" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => setLogoWidth(Math.min(260, (currentLogoWidth) + 20))}>
              <ZoomIn size={12} />
            </button>
          </div>
        </div>

        <input
          type="range"
          min="80"
          max="240"
          step="5"
          value={currentLogoWidth}
          onChange={e => setLogoWidth(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
        />
      </div>

      {/* Direct WYSIWYG Editable Paper Canvas */}
      <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textAlign: 'center' }}>
        ✏️ <b>Live Edit Langsung di Kertas Struk:</b> Klik teks di kertas untuk edit langsung!
      </div>

      <div className="receipt-wrapper" ref={receiptRef} style={{ width: `${paperWidthPx}px`, minWidth: `${paperWidthPx}px`, maxWidth: `${paperWidthPx}px`, boxSizing: 'border-box', paddingLeft: `${marginPx}px`, paddingRight: `${marginPx}px` }}>
        <div style={{ color: '#000', letterSpacing: '-0.2px' }}>
          {/* Header Logo with Dynamic Bottom Margin Spacing & Zero Line Height */}
          {activeTemplate.showLogo !== false && (
            <div style={{ textAlign: 'center', marginBottom: `${currentLogoMarginBottom}px`, padding: 0, lineHeight: 1 }}>
              {activeTemplate.customLogoUrl || receiptData?.customLogoUrl ? (
                <img
                  src={activeTemplate.customLogoUrl || receiptData.customLogoUrl}
                  alt="Logo"
                  style={{ width: `${currentLogoWidth}px`, height: 'auto', maxHeight: '70px', objectFit: 'contain', display: 'inline-block', margin: 0 }}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <PertaminaLogoExact width={currentLogoWidth} />
                </div>
              )}
            </div>
          )}

          {/* Direct ContentEditable Struk Paper Area */}
          <div
            ref={editableRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onInput={handleDirectInlineEdit}
            dangerouslySetInnerHTML={{ __html: compiledText }}
            style={{
              outline: 'none',
              cursor: 'text',
              padding: '2px',
              borderRadius: '2px',
              minHeight: '200px',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '7.5pt',
              fontWeight: 600,
              lineHeight: '1.25',
              letterSpacing: '-0.4px'
            }}
          />
        </div>
      </div>
    </div>
  );
}
