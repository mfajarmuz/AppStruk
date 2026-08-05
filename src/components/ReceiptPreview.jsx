import React, { useRef } from 'react';
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

  const commaPrice = (data.pricePerLiter || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const commaTotal = (data.totalAmount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const literDot = (parseFloat(data.liter) || 0).toFixed(2);
  const fuelFormatted = (data.fuelName || 'PERTAMINA_DEX').toUpperCase().replace(/\s+/g, '_');

  const dateStr = data.date || (data.dateTime ? data.dateTime.split(' ')[0] : '04/08/2026');
  const timeStr = data.time || (data.dateTime ? data.dateTime.split(' ')[1] || '07:52:30' : '07:52:30');
  const dateTimeCombined = data.dateTime || `${dateStr} ${timeStr}`;

  return templatePatternText
    .replace(/\{NO_SPBU\}/g, data.spbuNo || '3446125')
    .replace(/\{NAMA_SPBU\}/g, (data.spbuName || 'SPBU RY SUKARAJA JENGGALA').toUpperCase())
    .replace(/\{ALAMAT\}/g, (data.spbuAddress || 'JL. RAYA SUKARAJA DS. JENGGALA').toUpperCase())
    .replace(/\{SHIFT\}/g, data.shift || '2')
    .replace(/\{NO_TRANS\}/g, data.transactionNo ? data.transactionNo.replace('STR-', '') : '6101940')
    .replace(/\{WAKTU\}/g, dateTimeCombined)
    .replace(/\{TANGGAL\}/g, dateStr)
    .replace(/\{JAM\}/g, timeStr)
    .replace(/\{POMPA\}/g, data.pumpNo || '2')
    .replace(/\{NAMA_PRODUK\}/g, fuelFormatted)
    .replace(/\{HARGA_LITER\}/g, commaPrice)
    .replace(/\{HARGA_RP\}/g, `Rp. ${commaPrice}`)
    .replace(/\{VOLUME\}/g, literDot)
    .replace(/\{TOTAL_HARGA\}/g, commaTotal)
    .replace(/\{TOTAL_RP\}/g, `Rp. ${commaTotal}`)
    .replace(/\{OPERATOR\}/g, (data.operatorName || 'AGUS').toUpperCase())
    .replace(/\{METODE_BAYAR\}/g, (data.paymentMethod || 'CASH').toUpperCase())
    .replace(/\{PLAT_NO\}/g, (data.platNo || '').toUpperCase());
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
  isPrinting
}) {
  const receiptRef = useRef(null);
  const editableRef = useRef(null);
  const activeTemplate = template || {};

  const currentLogoWidth = activeTemplate.logoWidth || logoWidth || 160;
  const currentLogoMarginBottom = activeTemplate.logoMarginBottom !== undefined ? activeTemplate.logoMarginBottom : -4;

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

  return (
    <div className="preview-container">
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '320px' }}>
        <button
          className="btn btn-success btn-block"
          onClick={() => onPrint(receiptRef.current?.outerHTML || receiptRef.current?.innerHTML)}
          disabled={isPrinting}
        >
          <Printer size={18} />
          <span>{isPrinting ? 'Mencetak...' : 'Cetak Struk (58mm)'}</span>
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

      <div className="receipt-wrapper" ref={receiptRef}>
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
          {activeTemplate.htmlContent ? (
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
                minHeight: '200px'
              }}
            />
          ) : (
            <div
              ref={editableRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              onInput={handleDirectInlineEdit}
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '12.5px',
                lineHeight: '1.35',
                outline: 'none',
                cursor: 'text',
                padding: '2px',
                borderRadius: '2px',
                minHeight: '200px'
              }}
            >
              {compiledText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
