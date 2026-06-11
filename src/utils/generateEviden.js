// ============================================================
// generateEviden.js  Generator Eviden PTSL (.xlsx) di browser
// ------------------------------------------------------------
// Replikasi persis engine Python teruji (eviden_generator.py).
// Membaca export mentah KKP (.xlsx) + file Eviden tahapan
// sebelumnya, lalu menghasilkan Evidence_PTSL_Tahap_{XX}.xlsx
// berisi dua sheet: SEMUA_K1 dan TAHAP_{XX}.
//
// Keputusan terkunci (sesi 2026-06-08):
//   K1    = ceklis. sudah = DI208 tidak kosong, potensi = DI201B tidak kosong, union opsi tercentang
//   Font  = Calibri 11pt, header bold fill FFFF00, NIK & Tempat Lahir 10pt
//   DI310 = mm/yyyy -> 01/2026 (override sampel)
//   Kolom tanggal lain = mm-dd-yy (ikut sampel)
//   Eksklusi prev = murni per Nomor Berkas; scan semua sheet
//     KECUALI SEMUA_K1, My Worksheet, Ket.DI
// ============================================================

import * as XLSX from 'xlsx-js-style';

// 29 kolom output. src = nama header sumber (ter-normalisasi) atau null.
// kind: null | 'renumber' | 'blank' | 'nik' | 'di310' | 'date'
// num : format angka (untuk number). size: ukuran font data.
const COLUMNS = [
  { title: 'No',             src: null,           kind: 'renumber', z: 'General',  width: 3.33,  size: 11 },
  { title: 'Nomor Berkas',   src: 'nomorberkas',  kind: null,       z: 'General',  width: 11.83, size: 11 },
  { title: 'Tahun Berkas',   src: 'tahunberkas',  kind: null,       z: 'General',  width: 11.16, size: 11 },
  { title: 'Surat Tugas',    src: null,           kind: 'blank',    z: 'General',  width: 15.5,  size: 11 },
  { title: 'Backlog',        src: null,           kind: 'blank',    z: 'General',  width: 7.0,   size: 11 },
  { title: 'Tanggal Mulai',  src: 'tanggalmulai', kind: 'date',     z: 'mm-dd-yy', width: 11.66, size: 11 },
  { title: 'Tanggal Selesai',src: 'tanggalselesai',kind: 'date',    z: 'mm-dd-yy', width: 12.5,  size: 11 },
  { title: 'Desa',           src: 'desa',         kind: null,       z: 'General',  width: 11.0,  size: 11 },
  { title: 'Kecamatan',      src: 'kecamatan',    kind: null,       z: 'General',  width: 13.0,  size: 11 },
  { title: 'NIB',            src: 'nib',          kind: 'num',      z: '#,##0',    width: 16.33, size: 11 },
  { title: 'Luas',           src: 'luas',         kind: null,       z: 'General',  width: 5.16,  size: 11 },
  { title: 'Nama',           src: 'nama',         kind: null,       z: 'General',  width: 18.0,  size: 11 },
  { title: 'NIK',            src: 'nik',          kind: 'nik',      z: 'General',  width: 14.5,  size: 10 },
  { title: 'Tempat Lahir',   src: 'tempatlahir',  kind: null,       z: 'General',  width: 11.16, size: 10 },
  { title: 'Tanggal Lahir',  src: 'tanggallahir', kind: 'date',     z: 'mm-dd-yy', width: 11.0,  size: 11 },
  { title: 'Alamat',         src: 'alamat',       kind: null,       z: 'General',  width: 15.16, size: 11 },
  { title: 'Pekerjaan',      src: 'pekerjaan',    kind: null,       z: 'General',  width: 11.0,  size: 11 },
  { title: 'Nomor Hak',      src: 'nomorhak',     kind: 'num',      z: '0',        width: 16.33, size: 11 },
  { title: 'Tgl Hak',        src: 'tglhak',       kind: 'date',     z: 'mm-dd-yy', width: 8.5,   size: 11 },
  { title: 'DI201B',         src: 'di201b',       kind: null,       z: 'General',  width: 6.83,  size: 11 },
  { title: 'Tgl DI201B',     src: 'tgldi201b',    kind: 'date',     z: 'mm-dd-yy', width: 9.33,  size: 11 },
  { title: 'DI310',          src: 'di310',        kind: 'di310',    z: 'mm/yyyy',  width: 6.66,  size: 11 },
  { title: 'Tgl DI310',      src: 'tgldi310',     kind: 'date',     z: 'mm-dd-yy', width: 8.5,   size: 11 },
  { title: 'DI307 Hak',      src: 'di307hak',     kind: null,       z: 'General',  width: 9.0,   size: 11 },
  { title: 'Tgl DI307 Hak',  src: 'tgldi307hak',  kind: 'date',     z: 'mm-dd-yy', width: 11.5,  size: 11 },
  { title: 'DI208',          src: 'di208',        kind: null,       z: 'General',  width: 5.83,  size: 11 },
  { title: 'Tgl DI208',      src: 'tgldi208',     kind: 'date',     z: 'mm-dd-yy', width: 8.5,   size: 11 },
  { title: 'DI301A',         src: 'di301a',       kind: null,       z: 'General',  width: 7.0,   size: 11 },
  { title: 'Tgl DI301A',     src: 'tgldi301a',    kind: 'date',     z: 'mm-dd-yy', width: 9.5,   size: 11 },
];

const NULLISH = new Set(['', 'null', 'none', '(null)', 'nan', '-']);
const RESERVED_SHEETS = new Set(['semuak1', 'myworksheet', 'ketdi', 'worksheet']);

const THIN = { style: 'thin', color: { rgb: '000000' } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const HEADER_FILL = { patternType: 'solid', fgColor: { rgb: 'FFFF00' } };

// ---- helper normalisasi ----------------------------------------------------
function norm(s) {
  if (s === null || s === undefined) return '';
  return String(s).trim().toLowerCase().replace(/ /g, '').replace(/\./g, '').replace(/_/g, '');
}

function clean(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    if (NULLISH.has(v.trim().toLowerCase())) return null;
    return v.trim();
  }
  return v;
}

function berkasKey(v) {
  v = clean(v);
  if (v === null) return null;
  if (typeof v === 'number' && Number.isInteger(v)) v = String(v);
  let s = String(v).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return s || null;
}

function stripNik(v) {
  v = clean(v);
  if (v === null) return null;
  let s = String(v).trim();
  if (s.toLowerCase().startsWith('nik')) {
    s = s.slice(3).replace(/^[ .:]+/, '');
  }
  s = s.trim();
  return s || null;
}

// DI310 -> Date awal bulan (untuk format mm/yyyy)
function coerceMonthYear(v) {
  v = clean(v);
  if (v === null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), 1));
  }
  const s = String(v).trim();
  // ISO penuh / parsial
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
  // mm/yyyy atau mm/yy
  m = s.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let yr = +m[2];
    if (yr < 100) yr += 2000;
    return new Date(Date.UTC(yr, +m[1] - 1, 1));
  }
  // Mon-YY atau Mon-YYYY (Jan-26)
  const BLN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5, jul: 6,
                aug: 7, agu: 8, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11 };
  m = s.match(/^([A-Za-z]{3,})[-\s](\d{2,4})$/);
  if (m) {
    const mo = BLN[m[1].slice(0, 3).toLowerCase()];
    if (mo !== undefined) {
      let yr = +m[2];
      if (yr < 100) yr += 2000;
      return new Date(Date.UTC(yr, mo, 1));
    }
  }
  return null;
}

// Date apa pun -> Date UTC tengah malam (untuk serial Excel yang stabil)
function toUtcDate(v) {
  v = clean(v);
  if (v === null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);     // dd/mm/yyyy
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
function dateSerial(d) {
  return Math.round((d.getTime() - EXCEL_EPOCH) / 86400000);
}

// ---- pembacaan workbook ----------------------------------------------------
async function readWorkbook(file) {
  const buf = await file.arrayBuffer();
  return XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
}

function sheetAOA(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
}

function headerIndex(headerRow) {
  const idx = {};
  (headerRow || []).forEach((h, c) => {
    const n = norm(h);
    if (n && !(n in idx)) idx[n] = c;
  });
  return idx;
}

// pilih sheet sumber: maksimal cocok {nomorberkas,di208,di201b,nama,nik}
function findSourceSheet(wb) {
  const needed = ['nomorberkas', 'di208', 'di201b', 'nama', 'nik'];
  let best = null, bestScore = -1, bestAOA = null;
  for (const name of wb.SheetNames) {
    const aoa = sheetAOA(wb, name);
    if (!aoa.length) continue;
    const hdr = new Set((aoa[0] || []).map(norm));
    const score = needed.reduce((a, k) => a + (hdr.has(k) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = name; bestAOA = aoa; }
  }
  return { name: best, aoa: bestAOA };
}

// ambil Nomor Berkas yang sudah diproses dari satu file Eviden tahap sebelumnya
function extractPrevBerkas(wb) {
  const out = new Set();
  for (const name of wb.SheetNames) {
    if (RESERVED_SHEETS.has(norm(name))) continue;
    const aoa = sheetAOA(wb, name);
    if (!aoa.length) continue;
    const idx = headerIndex(aoa[0]);
    const col = idx['nomorberkas'];
    if (col === undefined) continue;
    for (let r = 1; r < aoa.length; r++) {
      const k = berkasKey(aoa[r][col]);
      if (k) out.add(k);
    }
  }
  return out;
}

function passesK1(row, idx, sudah, potensi) {
  if (sudah) {
    const c = idx['di208'];
    if (c !== undefined && clean(row[c]) !== null) return true;
  }
  if (potensi) {
    const c = idx['di201b'];
    if (c !== undefined && clean(row[c]) !== null) return true;
  }
  return false;
}

// susun satu baris output (29 nilai mentah) dari satu baris sumber
function buildRecord(row, idx) {
  return COLUMNS.map((col) => {
    if (col.kind === 'renumber' || col.kind === 'blank') return null;
    const ci = idx[col.src];
    const raw = ci !== undefined ? row[ci] : null;
    if (col.kind === 'nik') return stripNik(raw);
    if (col.kind === 'di310') return coerceMonthYear(raw);
    if (col.kind === 'date') return toUtcDate(raw);
    return clean(raw);
  });
}

// ---- penulisan sheet ber-style --------------------------------------------
function makeCell(value, col, isHeader, rowNumber) {
  const font = { name: 'Calibri', sz: isHeader ? 11 : col.size, bold: !!isHeader };
  const alignment = isHeader
    ? { horizontal: 'center', vertical: 'center', wrapText: true }
    : { horizontal: 'center', vertical: 'center' };
  const s = { font, alignment, border: BORDER };
  if (isHeader) s.fill = HEADER_FILL;

  if (isHeader) return { v: col.title, t: 's', s };

  if (col.kind === 'renumber') return { v: rowNumber, t: 'n', s };
  if (col.kind === 'blank') return { v: '', t: 's', s };

  if (value === null || value === undefined) return { v: '', t: 's', s };

  // tanggal -> serial + format
  if (col.kind === 'date' || col.kind === 'di310') {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return { v: dateSerial(value), t: 'n', z: col.z, s };
    }
    return { v: '', t: 's', s };
  }
  // NIK selalu teks (cegah konversi number Excel)
  if (col.kind === 'nik') return { v: String(value), t: 's', s };
  // kolom angka
  if (col.kind === 'num') {
    const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.\-]/g, ''));
    if (!isNaN(num) && String(value).trim() !== '') return { v: num, t: 'n', z: col.z, s };
    return { v: String(value), t: 's', s };
  }
  // default
  if (typeof value === 'number') return { v: value, t: 'n', s };
  return { v: String(value), t: 's', s };
}

function buildSheet(records) {
  const ws = {};
  const lastCol = COLUMNS.length - 1;
  const lastRow = records.length + 1; // +1 header

  // header
  COLUMNS.forEach((col, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = makeCell(null, col, true, 0);
  });
  // data
  records.forEach((rec, ri) => {
    const r = ri + 1;
    COLUMNS.forEach((col, c) => {
      const val = col.kind === 'renumber' ? r : rec[c];
      ws[XLSX.utils.encode_cell({ r, c })] = makeCell(val, col, false, r);
    });
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow - 1, c: lastCol } });
  ws['!cols'] = COLUMNS.map((col) => ({ wch: col.width }));
  ws['!rows'] = [{ hpt: 28.5 }]; // tinggi baris header
  return ws;
}

// ---- API utama -------------------------------------------------------------
export async function generateEviden({
  sourceFile,
  tahap,
  sudah = true,
  potensi = false,
  anomali = [],
  prevFiles = [],
}) {
  if (!sourceFile) throw new Error('File sumber (export KKP) belum dipilih.');
  if (!sudah && !potensi) throw new Error('Minimal satu opsi K1 harus dipilih (Sudah K1 atau Potensi K1).');

  const tahapStr = /^\d+$/.test(String(tahap).trim())
    ? String(parseInt(tahap, 10)).padStart(2, '0')
    : String(tahap).trim();

  const wbSrc = await readWorkbook(sourceFile);
  const { name: srcName, aoa } = findSourceSheet(wbSrc);
  if (!srcName || !aoa || !aoa.length) {
    throw new Error('Sheet sumber tidak ditemukan (tidak ada kolom Nomor Berkas/DI208/DI201B).');
  }
  const idx = headerIndex(aoa[0]);
  if (idx['nomorberkas'] === undefined) {
    throw new Error('Kolom Nomor Berkas tidak ditemukan di file sumber.');
  }

  // himpunan eksklusi
  const anomaliSet = new Set((anomali || []).map(berkasKey).filter(Boolean));
  const prevSet = new Set();
  for (const pf of (prevFiles || [])) {
    const wbPrev = await readWorkbook(pf);
    extractPrevBerkas(wbPrev).forEach((k) => prevSet.add(k));
  }

  const semua = [];
  const tahapRows = [];
  const seen = new Set();
  let dupCount = 0;

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    if (!passesK1(row, idx, sudah, potensi)) continue;
    const bk = berkasKey(row[idx['nomorberkas']]);
    if (bk === null) continue;
    if (anomaliSet.has(bk)) continue;
    if (seen.has(bk)) { dupCount++; continue; }
    seen.add(bk);
    const rec = buildRecord(row, idx);
    semua.push(rec);
    if (!prevSet.has(bk)) tahapRows.push(rec);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(semua), 'SEMUA_K1');
  XLSX.utils.book_append_sheet(wb, buildSheet(tahapRows), `TAHAP_${tahapStr}`);

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true });
  const filename = `Evidence_PTSL_Tahap_${tahapStr}.xlsx`;

  const stats = {
    tahap: tahapStr,
    sumberSheet: srcName,
    k1Sudah: sudah,
    k1Potensi: potensi,
    semuaK1: semua.length,
    tahapRows: tahapRows.length,
    excludedPrev: prevSet.size,
    anomali: anomaliSet.size,
    duplikatDilewati: dupCount,
  };

  return { blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename, stats };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
