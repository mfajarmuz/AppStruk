export const DEFAULT_PERTAMINA_TEMPLATE = {
  id: 'pertamina-standard',
  name: 'SPBU Pertamina Standar (Resmi Plain Text)',
  paperWidthMm: 58,
  paperMarginMm: 2,
  logoWidth: 160,
  logoMarginBottom: 4,
  content: `{NO_SPBU}
{NAMA_SPBU}
{ALAMAT}
Shift: {SHIFT}            No. Trans: {NO_TRANS}
Waktu: {WAKTU}
-----------------------------------------
Pulau/Pompa: {POMPA}
Nama Produk: {NAMA_PRODUK}
Harga/Liter: Rp. {HARGA_LITER}
Volume     : (L) {VOLUME}
Total Harga: Rp. {TOTAL_HARGA}
Operator   : {OPERATOR}
-----------------------------------------
{METODE_BAYAR}                   Rp. {TOTAL_HARGA}
-----------------------------------------
TERIMA KASIH & SELAMAT JALAN`
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
