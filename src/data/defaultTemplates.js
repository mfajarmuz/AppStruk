export const DEFAULT_TEMPLATES = [
  {
    id: 'pertamina-sukaraja-real',
    name: 'SPBU Sukaraja Real (100% Presisi Foto Struk 5.7cm)',
    description: 'Template 100% persis sesuai foto struk asli (Logo, 3446125, Garis Putus, Shift, No. Trans, Waktu, Detail & Total CASH).',
    badge: '★ 100% Presisi Foto Struk',
    logoWidth: 160,
    logoMarginBottom: -4,
    htmlContent: `<div style="text-align:center; font-weight:bold; margin:0; padding:0;">{NO_SPBU}</div><div style="text-align:center; margin:0; padding:0;">{NAMA_SPBU}</div><div style="text-align:center; margin:0; padding:0;">{ALAMAT}</div><div style="display:flex; justify-content:space-between; margin:0; padding:0;"><span>Shift: {SHIFT}</span><span>No. Trans: {NO_TRANS}</span></div><div style="margin:0; padding:0;">Waktu: {WAKTU}</div><div style="border-top:1px dashed #000; margin:6px 0;"></div><div style="margin:0; padding:0;">Pulau/Pompa: {POMPA}</div><div style="margin:0; padding:0;">Nama Produk: {NAMA_PRODUK}</div><div style="margin:0; padding:0;">Harga/Liter: Rp. {HARGA_LITER}</div><div style="margin:0; padding:0;">Volume     : (L) {VOLUME}</div><div style="margin:0; padding:0;">Total Harga: Rp. {TOTAL_HARGA}</div><div style="margin:0; padding:0;">Operator   : {OPERATOR}</div><div style="border-top:1px dashed #000; margin:6px 0;"></div><div style="display:flex; justify-content:space-between; margin-top:4px;"><span>{METODE_BAYAR}</span><span>{TOTAL_HARGA}</span></div>`,
    pattern: `{NO_SPBU}\n{NAMA_SPBU}\n{ALAMAT}\nShift: {SHIFT}          No. Trans: {NO_TRANS}\nWaktu: {WAKTU}\n-----------------------------------------\nPulau/Pompa: {POMPA}\nNama Produk: {NAMA_PRODUK}\nHarga/Liter: Rp. {HARGA_LITER}\nVolume     : (L) {VOLUME}\nTotal Harga: Rp. {TOTAL_HARGA}\nOperator   : {OPERATOR}\n-----------------------------------------\n{METODE_BAYAR}                                {TOTAL_HARGA}`
  },
  {
    id: 'pertamina-std',
    name: 'SPBU Pertamina Standard',
    description: 'Format struk standar resmi SPBU Pertamina dengan Logo dan Rincian Transaksi.',
    badge: 'Standard',
    logoWidth: 160,
    logoMarginBottom: 0,
    htmlContent: `<div style="text-align:center; font-weight:bold; margin:0; padding:0;">{NO_SPBU}</div><div style="text-align:center; margin:0; padding:0;">{NAMA_SPBU}</div><div style="text-align:center; margin:0; padding:0;">{ALAMAT}</div><div style="border-top:1px dashed #000; margin:6px 0;"></div><div style="margin:0; padding:0;">No. Trans: {NO_TRANS}</div><div style="margin:0; padding:0;">Waktu    : {WAKTU}</div><div style="border-top:1px dashed #000; margin:6px 0;"></div><div style="margin:0; padding:0;">Produk   : {NAMA_PRODUK}</div><div style="margin:0; padding:0;">Harga/L  : Rp. {HARGA_LITER}</div><div style="margin:0; padding:0;">Volume   : {VOLUME} L</div><div style="margin:0; padding:0;">Total    : Rp. {TOTAL_HARGA}</div><div style="border-top:1px dashed #000; margin:6px 0;"></div><div style="text-align:center;">TERIMA KASIH & SELAMAT JALAN</div>`
  }
];
