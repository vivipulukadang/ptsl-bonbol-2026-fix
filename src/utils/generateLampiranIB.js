// ============================================================
// generateLampiranIB.js  Generator Lampiran I B (.xlsx) di browser
// ------------------------------------------------------------
// Sumber: file Evidence_PTSL_Tahap_XX.xlsx (hasil menu Buat Eviden).
// Aturan paten (RULE_ADM_LAMPIRAN_I_B, RULE_ADM_TTD_W_LAYOUT):
//   - Satu Desa = Satu File. Banyak desa -> ZIP berisi N file.
//   - Filter baris per Desa (Letak Tanah), buang anomali.
//   - NIK apostrof leading (disimpan sebagai teks).
//   - Tanggal Lahir format dd/mm/yy.
//   - Area tanda tangan W-Layout: maksimum 3 per baris, baris bawah <= atas, centered.
//   - Layout tabel mengikuti sampel Format Lampiran I B (18 kolom).
// ============================================================

import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';

// 18 kolom fisik sesuai sampel.
const COLS = [
  { key: 'no',        title: 'No',             num: '1',  width: 3.5  },
  { key: 'berkas',    title: 'No. Berkas',     num: '2',  width: 9.5  },
  { key: 'nama',      title: 'Nama',           num: '3',  width: 20   },
  { key: 'nik',       title: 'NIK',            num: '4',  width: 18   },
  { key: 'tempat',    title: 'Tempat',         num: '5',  width: 13   }, // bagian dari "Tempat Tanggal Lahir"
  { key: 'tgllahir',  title: 'Tanggal Lahir',  num: '',   width: 9    }, // num kosong (digabung dgn 5)
  { key: 'alamat',    title: 'Alamat',         num: '6',  width: 16   },
  { key: 'pekerjaan', title: 'Pekerjaan',      num: '7',  width: 11   },
  { key: 'letak',     title: 'Letak Tanah',    num: '8',  width: 11   },
  { key: 'bidang',    title: 'Nomor Bidang',   num: '9',  width: 16   },
  { key: 'statustnh', title: 'Status Tanah',   num: '10', width: 9    },
  { key: 'penggunaan',title: 'Status Penggunaan', num: '11', width: 10 },
  { key: 'sengketa',  title: 'Status Sengketa',num: '13', width: 9    },
  { key: 'luas',      title: 'Luas (m\u00B2)', num: '14', width: 6    },
  { key: 'bIdent',    title: 'Identitas',      num: '15', width: 9    },
  { key: 'bKuasa',    title: 'Penguasaan',     num: '16', width: 10   },
  { key: 'bGuna',     title: 'Penggunaan',     num: '17', width: 10   },
  { key: 'bOleh',     title: 'Perolehan',      num: '18', width: 10   },
];
const NCOL = COLS.length; // 18

const NULLISH = new Set(['', 'null', 'none', '(null)', 'nan', '-']);
const THIN = { style: 'thin', color: { rgb: '000000' } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function norm(s) {
  if (s === null || s === undefined) return '';
  return String(s).trim().toLowerCase().replace(/ /g, '').replace(/\./g, '').replace(/_/g, '');
}
function clean(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') { if (NULLISH.has(v.trim().toLowerCase())) return null; return v.trim(); }
  return v;
}
function stripNik(v) {
  v = clean(v);
  if (v === null) return '';
  let s = String(v).trim();
  if (s.toLowerCase().startsWith('nik')) s = s.slice(3).replace(/^[ .:]+/, '');
  return s.trim();
}
function fmtTglLahir(v) {
  v = clean(v);
  if (v === null) return '';
  let d = null;
  if (v instanceof Date && !isNaN(v.getTime())) d = v;
  else {
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    else { m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) return s; }
  }
  if (!d) return String(v);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function readWb(buf) {
  return XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
}
function pickSheet(wb) {
  // utamakan TAHAP_*, fallback SEMUA_K1, lalu sheet pertama yg punya 'desa'
  const names = wb.SheetNames;
  const tahap = names.find((n) => norm(n).startsWith('tahap'));
  if (tahap) return tahap;
  const semua = names.find((n) => norm(n) === 'semuak1');
  if (semua) return semua;
  for (const n of names) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, blankrows: false });
    if (aoa.length && new Set((aoa[0] || []).map(norm)).has('desa')) return n;
  }
  return names[0];
}
function hidx(headerRow) {
  const idx = {};
  (headerRow || []).forEach((h, c) => { const n = norm(h); if (n && !(n in idx)) idx[n] = c; });
  return idx;
}

// W-Layout: bagi N petugas jadi baris-baris (max 3, atas >= bawah)
function wlayout(n) {
  if (n <= 0) return [];
  const rows = Math.ceil(n / 3);
  const base = Math.floor(n / rows);
  let rem = n % rows;
  const out = [];
  for (let i = 0; i < rows; i++) { out.push(base + (rem > 0 ? 1 : 0)); if (rem > 0) rem--; }
  return out; // mis. 4 -> [2,2], 5 -> [3,2], 7 -> [3,2,2]
}

// ---- style helper ----
function st(opts = {}) {
  const s = {
    font: { name: 'Calibri', sz: opts.sz || 9, bold: !!opts.bold, italic: !!opts.italic },
    alignment: { horizontal: opts.h || 'center', vertical: 'center', wrapText: opts.wrap !== false },
  };
  if (opts.border !== false) s.border = BORDER;
  return s;
}
function setCell(ws, r, c, v, s, z) {
  const ref = XLSX.utils.encode_cell({ r, c });
  const t = typeof v === 'number' ? 'n' : 's';
  ws[ref] = { v: v === null || v === undefined ? '' : v, t, s };
  if (z) ws[ref].z = z;
}

function buildDesaSheet(desa, kecamatan, rows, petugas, statusTanah) {
  const ws = {};
  let R = 0;

  // baris judul
  setCell(ws, R, 0, 'LAMPIRAN 1b', st({ bold: true, h: 'left', border: false, sz: 9 })); R++;
  const titleRow = R;
  setCell(ws, R, 0, 'REKAPITULASI DATA ISIAN INVENTARISASI DAN IDENTIFIKASI PESERTA PENDAFTARAN TANAH SISTEMATIS LENGKAP TAHUN 2026', st({ bold: true, border: false, sz: 11 })); R++;
  const subTitleRow = R;
  setCell(ws, R, 0, `DESA ${String(desa).toUpperCase()} KECAMATAN ${String(kecamatan || '').toUpperCase()}`, st({ bold: true, border: false, sz: 11 })); R++;

  // header band (3 baris: r0 grup, r1 sub, r2 nomor)
  const hb = R;       // grup band
  const hs = R + 1;   // sub header
  const hn = R + 2;   // nomor kolom

  // isi semua sel header dgn border+style dulu (agar grid penuh)
  for (let rr = hb; rr <= hn; rr++) {
    for (let c = 0; c < NCOL; c++) setCell(ws, rr, c, '', st({ bold: true }));
  }
  // grup band
  setCell(ws, hb, 0, 'No', st({ bold: true }));
  setCell(ws, hb, 1, 'No. Berkas', st({ bold: true }));
  setCell(ws, hb, 2, 'IDENTITAS SUBYEK', st({ bold: true }));
  setCell(ws, hb, 8, 'IDENTIFIKASI OBYEK', st({ bold: true }));
  setCell(ws, hb, 14, 'LAMPIRAN BUKTI', st({ bold: true }));
  // sub header (r1)
  const subAt = { 2: 'Nama', 3: 'NIK', 4: 'Tempat Tanggal Lahir', 6: 'Alamat', 7: 'Pekerjaan',
    8: 'Letak Tanah', 9: 'Nomor Bidang', 10: 'Status Tanah', 11: 'Status Penggunaan',
    12: 'Status Sengketa', 13: 'Luas (m\u00B2)', 14: 'Identitas', 15: 'Penguasaan', 16: 'Penggunaan', 17: 'Perolehan' };
  Object.entries(subAt).forEach(([c, t]) => setCell(ws, hs, +c, t, st({ bold: true })));
  // nomor kolom (r2)
  setCell(ws, hn, 0, '1', st({ bold: true, italic: true }));
  setCell(ws, hn, 1, '2', st({ bold: true, italic: true }));
  COLS.forEach((col, c) => { if (c >= 2 && col.num) setCell(ws, hn, c, col.num, st({ bold: true, italic: true })); });

  // data
  let dr = hn + 1;
  rows.forEach((row, i) => {
    const vals = {
      no: i + 1,
      berkas: row.berkas,
      nama: row.nama,
      nik: row.nik,           // teks (apostrof leading otomatis krn t='s')
      tempat: row.tempat,
      tgllahir: row.tgllahir,
      alamat: row.alamat,
      pekerjaan: row.pekerjaan,
      letak: String(desa).toUpperCase(),
      bidang: row.bidang,
      statustnh: statusTanah,
      penggunaan: '',
      sengketa: '',
      luas: row.luas,
      bIdent: '', bKuasa: '', bGuna: '', bOleh: '',
    };
    COLS.forEach((col, c) => {
      const v = vals[col.key];
      const isNum = col.key === 'luas' && typeof v === 'number';
      setCell(ws, dr, c, v === undefined || v === null ? '' : v, st({ sz: 9 }));
    });
    dr++;
  });

  // ---- area tanda tangan (W-Layout) ----
  let sr = dr + 2;
  const single = petugas.length <= 1;
  // posisi heading & blok
  // blok lebar ~6 kolom; centered untuk >1, kanan untuk 1
  const blockW = 6;

  // heading
  const headingCols = single ? [NCOL - blockW, NCOL - 1] : null;
  if (single) {
    setCell(ws, sr, NCOL - blockW, 'Petugas Pengumpul Yuridis', st({ border: false, sz: 9 }));
    setCell(ws, sr + 1, NCOL - blockW, 'PTSL 2026', st({ border: false, sz: 9 }));
  } else {
    const startC = Math.floor((NCOL - blockW) / 2);
    setCell(ws, sr, startC, 'Petugas Pengumpul Yuridis', st({ border: false, sz: 9 }));
    setCell(ws, sr + 1, startC, 'PTSL 2026', st({ border: false, sz: 9 }));
  }
  let nameRowStart = sr + 5; // 3 baris kosong utk tanda tangan

  // distribusi W-layout
  const layout = wlayout(petugas.length);
  let pIdx = 0;
  let curRow = nameRowStart;
  layout.forEach((cnt) => {
    const totalW = cnt * blockW;
    const startC = Math.max(0, Math.floor((NCOL - totalW) / 2));
    for (let k = 0; k < cnt; k++) {
      const c = single ? (NCOL - blockW) : (startC + k * blockW);
      const nm = petugas[pIdx++] || '';
      setCell(ws, curRow, c, nm, st({ bold: true, border: false, sz: 9 }));
    }
    curRow += 3; // jarak antar baris W-layout
  });

  // ref, merges, widths
  const lastRow = curRow;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: NCOL - 1 } });
  ws['!cols'] = COLS.map((c) => ({ wch: c.width }));

  const merges = [];
  const M = (r1, c1, r2, c2) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  M(titleRow, 0, titleRow, NCOL - 1);
  M(subTitleRow, 0, subTitleRow, NCOL - 1);
  M(hb, 0, hs, 0);        // No (grup+sub), nomor di baris hn
  M(hb, 1, hs, 1);        // No. Berkas
  M(hb, 2, hb, 7);        // IDENTITAS SUBYEK
  M(hb, 8, hb, 13);       // IDENTIFIKASI OBYEK
  M(hb, 14, hb, 17);      // LAMPIRAN BUKTI
  M(hs, 4, hs, 5);        // Tempat Tanggal Lahir
  M(hn, 4, hn, 5);        // nomor "5"
  ws['!merges'] = merges;

  return ws;
}

// ---- API utama -------------------------------------------------------------
export async function generateLampiranIB({
  sourceFile,
  desaPilihan = '__ALL__',
  petugas = [],
  statusTanah = 'Tanah Negara',
  anomali = [],
}) {
  if (!sourceFile) throw new Error('File Evidence belum dipilih.');
  const petugasList = (petugas || []).map((s) => String(s).trim()).filter(Boolean);
  if (petugasList.length === 0) throw new Error('Minimal satu Petugas Pengumpul Yuridis harus diisi.');

  const buf = await sourceFile.arrayBuffer();
  const wb = readWb(buf);
  const sheetName = pickSheet(wb);
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, blankrows: false });
  if (!aoa.length) throw new Error('Sheet data tidak ditemukan di file Evidence.');
  const idx = hidx(aoa[0]);

  const get = (row, key) => { const c = idx[key]; return c === undefined ? null : row[c]; };
  const anomaliSet = new Set((anomali || []).map((x) => String(x).replace(/\.0$/, '').trim()).filter(Boolean));

  // kelompokkan per desa
  const byDesa = {};
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const desa = clean(get(row, 'desa'));
    if (!desa) continue;
    const bk = clean(get(row, 'nomorberkas'));
    const bkKey = bk === null ? '' : String(bk).replace(/\.0$/, '').trim();
    if (bkKey && anomaliSet.has(bkKey)) continue;
    const key = String(desa).toUpperCase();
    if (!byDesa[key]) byDesa[key] = { desa: String(desa), kecamatan: clean(get(row, 'kecamatan')) || '', rows: [] };
    byDesa[key].rows.push({
      berkas: bk === null ? '' : String(bk).replace(/\.0$/, ''),
      nama: clean(get(row, 'nama')) || '',
      nik: stripNik(get(row, 'nik')),
      tempat: clean(get(row, 'tempatlahir')) || '',
      tgllahir: fmtTglLahir(get(row, 'tanggallahir')),
      alamat: clean(get(row, 'alamat')) || '',
      pekerjaan: clean(get(row, 'pekerjaan')) || '',
      bidang: (() => { const v = clean(get(row, 'nib')); return v === null ? '' : String(v); })(),
      luas: (() => { const v = clean(get(row, 'luas')); const n = Number(v); return (v !== null && !isNaN(n)) ? n : (v || ''); })(),
    });
  }

  const desaKeys = Object.keys(byDesa).sort();
  if (desaKeys.length === 0) throw new Error('Tidak ada data desa yang terbaca dari file Evidence.');

  const tahapStr = (() => { const m = norm(sheetName).match(/tahap(\d+)/); return m ? m[1].padStart(2, '0') : 'XX'; })();

  const buildOne = (key) => {
    const g = byDesa[key];
    const wbOut = XLSX.utils.book_new();
    const ws = buildDesaSheet(g.desa, g.kecamatan, g.rows, petugasList, statusTanah);
    XLSX.utils.book_append_sheet(wbOut, ws, 'Lampiran I B');
    const out = XLSX.write(wbOut, { type: 'array', bookType: 'xlsx', cellStyles: true });
    const safe = String(g.desa).replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
    return { blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      filename: `Lampiran_I_B_${safe}_Tahap_${tahapStr}.xlsx`, desa: g.desa, jumlah: g.rows.length };
  };

  if (desaPilihan && desaPilihan !== '__ALL__') {
    const key = String(desaPilihan).toUpperCase();
    if (!byDesa[key]) throw new Error(`Desa "${desaPilihan}" tidak ada di file Evidence.`);
    const one = buildOne(key);
    return { mode: 'single', ...one, daftarDesa: desaKeys.map((k) => byDesa[k].desa) };
  }

  // semua desa -> ZIP
  const zip = new JSZip();
  const ringkasan = [];
  for (const key of desaKeys) {
    const one = buildOne(key);
    zip.file(one.filename, await one.blob.arrayBuffer());
    ringkasan.push({ desa: one.desa, jumlah: one.jumlah });
  }
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return { mode: 'zip', blob: zipBlob, filename: `Lampiran_I_B_SemuaDesa_Tahap_${tahapStr}.zip`,
    ringkasan, daftarDesa: desaKeys.map((k) => byDesa[k].desa) };
}

export function listDesa(file) {
  return file.arrayBuffer().then((buf) => {
    const wb = readWb(buf);
    const sheetName = pickSheet(wb);
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, blankrows: false });
    if (!aoa.length) return [];
    const idx = hidx(aoa[0]);
    const c = idx['desa'];
    if (c === undefined) return [];
    const set = new Set();
    for (let r = 1; r < aoa.length; r++) { const d = clean(aoa[r] && aoa[r][c]); if (d) set.add(String(d)); }
    return Array.from(set).sort();
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
