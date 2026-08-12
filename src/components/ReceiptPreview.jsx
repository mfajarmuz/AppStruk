import React, { useRef } from 'react';
import { Printer, Eye } from 'lucide-react';

export function PertaminaLogoExact({ width = 160 }) {
  return (
    <svg width={width} height="auto" viewBox="0 0 450 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 20 L150 20 L110 65 L40 65 Z" fill="#ED1C24" />
      <path d="M120 68 L190 68 L160 115 L90 115 Z" fill="#00A3E0" />
      <path d="M160 20 L230 20 L210 55 L140 55 Z" fill="#78BE20" />
      <text x="245" y="75" fontFamily="Arial Black, Impact, sans-serif" fontSize="52" fontWeight="900" fill="#0033A0" letterSpacing="-1">PERTAMINA</text>
    </svg>
  );
}

export function parseReceiptTemplate(plainTextTemplate, data) {
  if (!plainTextTemplate) return '';
  let result = plainTextTemplate;
  const map = {
    '{NO_SPBU}': data.noSpbu || '34.46125',
    '{NAMA_SPBU}': data.namaSpbu || 'SPBU Sukaraja',
    '{ALAMAT}': data.alamat || 'Jl. Raya Sukaraja No. 88',
    '{SHIFT}': data.shift || '1',
    '{NO_TRANS}': data.noTrans || 'TRX-99823',
    '{WAKTU}': data.waktu || '12/08/2026 09:15:00',
    '{POMPA}': data.pompa || '02',
    '{NAMA_PRODUK}': data.namaProduk || 'PERTAMAX',
    '{HARGA_LITER}': data.hargaLiter || '12.900',
    '{VOLUME}': data.volume || '15.50',
    '{TOTAL_HARGA}': data.totalHarga || '199.950',
    '{TOTAL_RP}': data.totalHarga || '199.950',
    '{OPERATOR}': data.operator || 'Budi',
    '{METODE_BAYAR}': data.metodeBayar || 'CASH',
    '{PLAT_NO}': data.platNo || 'B 1234 ABC'
  };

  Object.entries(map).forEach(([tag, val]) => {
    result = result.replaceAll(tag, val);
  });

  // Convert plain text lines to HTML lines with white-space pre-wrap
  const lines = result.split('\n');
  const htmlLines = lines.map((line, idx) => {
    // Header lines (No SPBU, Nama SPBU, Alamat) and footer lines -> auto center alignment
    const isCenteredHeaderOrFooter = idx < 3 || line.includes('TERIMA KASIH');
    const alignStyle = isCenteredHeaderOrFooter ? 'text-align: center;' : 'text-align: left;';
    const fontWeight = idx === 0 || line.includes('Total Harga') ? 'font-weight: bold;' : 'font-weight: normal;';
    
    // Replace dashed divider with clean border or keep as text
    if (line.trim().startsWith('---') || line.trim().startsWith('===')) {
      return `<div style="border-top: 1px dashed #000; margin: 4px 0;"></div>`;
    }
    
    return `<div style="white-space: pre-wrap; ${alignStyle} ${fontWeight} margin: 0; padding: 0;">${line || '&nbsp;'}</div>`;
  });

  return htmlLines.join('');
}

export default function ReceiptPreview({ template, formData, printerSettings, onPrint }) {
  const receiptRef = useRef(null);

  const paperWidthMm = printerSettings?.paperWidth || template?.paperWidthMm || 58;
  const paperMarginMm = printerSettings?.paperMargin || template?.paperMarginMm || 2;
  const paperWidthPx = Math.round(paperWidthMm * (384 / 58));
  const marginPx = Math.round(paperMarginMm * (384 / 58));

  const compiledHtml = parseReceiptTemplate(template?.content || '', formData);

  const handlePrintClick = () => {
    if (onPrint && receiptRef.current) {
      onPrint(receiptRef.current.outerHTML, paperWidthMm);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={16} /> Pratinjau Struk Physical ({paperWidthMm}mm)
        </div>
        <button type="button" className="btn btn-primary" onClick={handlePrintClick} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Printer size={16} /> Cetak Struk ({paperWidthMm}mm)
        </button>
      </div>

      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={receiptRef}
          className="receipt-wrapper"
          style={{
            width: `${paperWidthPx}px`,
            minWidth: `${paperWidthPx}px`,
            maxWidth: `${paperWidthPx}px`,
            paddingLeft: `${marginPx}px`,
            paddingRight: `${marginPx}px`,
            background: '#ffffff',
            color: '#000000',
            fontFamily: "'FontA', 'ESC-POS-FontA', 'GB18030', 'Lucida Console', 'Consolas', 'Courier New', monospace",
            fontSize: '7.5pt',
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: '-0.3px',
            boxSizing: 'border-box',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            paddingTop: '12px',
            paddingBottom: '16px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: `${template?.logoMarginBottom || 4}px` }}>
            <PertaminaLogoExact width={template?.logoWidth || 160} />
          </div>

          <div dangerouslySetInnerHTML={{ __html: compiledHtml }} />
        </div>
      </div>
    </div>
  );
}
