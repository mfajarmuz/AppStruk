export const DEFAULT_PERTAMINA_TEMPLATE = {
  id: 'pertamina-standard',
  name: 'SPBU Pertamina Standar (Resmi)',
  paperWidthMm: 58,
  paperMarginMm: 2,
  logoWidth: 160,
  logoMarginBottom: -4,
  content: `<div style="text-align:center; font-weight:bold; margin:0; padding:0;">{NO_SPBU}</div>
<div style="text-align:center; margin:0; padding:0;">{NAMA_SPBU}</div>
<div style="text-align:center; margin:0; padding:0;">{ALAMAT}</div>
<div style="display:flex; justify-content:space-between; margin:0; padding:0;"><span>Shift: {SHIFT}</span><span>No. Trans: {NO_TRANS}</span></div>
<div style="margin:0; padding:0;">Waktu: {WAKTU}</div>
<div style="border-top:1px dashed #000; margin:6px 0;"></div>
<div style="margin:0; padding:0;">Pulau/Pompa: {POMPA}</div>
<div style="margin:0; padding:0;">Nama Produk: {NAMA_PRODUK}</div>
<div style="margin:0; padding:0;">Harga/Liter: Rp. {HARGA_LITER}</div>
<div style="margin:0; padding:0;">Volume     : (L) {VOLUME}</div>
<div style="margin:0; padding:0;">Total Harga: Rp. {TOTAL_HARGA}</div>
<div style="margin:0; padding:0;">Operator   : {OPERATOR}</div>
<div style="border-top:1px dashed #000; margin:6px 0;"></div>
<div style="display:flex; justify-content:space-between; margin-top:4px;"><span>{METODE_BAYAR}</span><span>Rp. {TOTAL_HARGA}</span></div>
<div style="border-top:1px dashed #000; margin:6px 0;"></div>
<div style="text-align:center; margin-top:4px;">TERIMA KASIH & SELAMAT JALAN</div>`
};

export const AVAILABLE_TAGS = [
  { tag: '{NO_SPBU}', label: 'No SPBU', sample: '34.46125' },
  { tag: '{NAMA_SPBU}', label: 'Nama SPBU', sample: 'SPBU Sukaraja' },
  { tag: '{ALAMAT}', label: 'Alamat SPBU', sample: 'Jl. Raya Sukaraja No. 88' },
  { tag: '{SHIFT}', label: 'Shift', sample: '1' },
  { tag: '{NO_TRANS}', label: 'No Transaksi', sample: 'TRX-99823' },
  { tag: '{WAKTU}', label: 'Waktu / Tanggal', sample: '12/08/2026 09:15:00' },
  { tag: '{POMPA}', label: 'No Pompa', sample: '02' },
  { tag: '{NAMA_PRODUK}', label: 'Nama BBM', sample: 'PERTAMAX' },
  { tag: '{HARGA_LITER}', label: 'Harga / Liter', sample: '12.900' },
  { tag: '{VOLUME}', label: 'Volume (Liter)', sample: '15.50' },
  { tag: '{TOTAL_HARGA}', label: 'Total Rp', sample: '199.950' },
  { tag: '{OPERATOR}', label: 'Nama Operator', sample: 'Budi' },
  { tag: '{METODE_BAYAR}', label: 'Metode Bayar', sample: 'CASH' },
  { tag: '{PLAT_NO}', label: 'Plat Nomor', sample: 'B 1234 ABC' }
];
