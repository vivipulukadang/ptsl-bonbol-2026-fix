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
  const ttdMerges = [];
  const blockW = 6; // 3 blok = 18 kolom = lebar penuh
  let sr = dr + 2;
  // heading, centered lebar penuh
  setCell(ws, sr, 0, 'Petugas Pengumpul Yuridis', st({ border: false, sz: 10 }));
  setCell(ws, sr + 1, 0, 'PTSL 2026', st({ border: false, sz: 10 }));
  ttdMerges.push({ s: { r: sr, c: 0 }, e: { r: sr, c: NCOL - 1 } });
  ttdMerges.push({ s: { r: sr + 1, c: 0 }, e: { r: sr + 1, c: NCOL - 1 } });

  // distribusi W-layout: tiap baris max 3 blok, di-center membentuk pola W
  const layout = wlayout(petugas.length);
  const SIG_SPACE = 3; // ruang kosong untuk tanda tangan
  let curRow = sr + 3;
  let pIdx = 0;
  layout.forEach((cnt) => {
    const totalW = cnt * blockW;
    const startC = Math.max(0, Math.floor((NCOL - totalW) / 2));
    const nameRow = curRow + SIG_SPACE;
    for (let k = 0; k < cnt; k++) {
      const c0 = startC + k * blockW;
      const c1 = c0 + blockW - 1;
      const nm = petugas[pIdx++] || '';
      setCell(ws, nameRow, c0, nm, st({ bold: true, border: false, sz: 10 }));
      ttdMerges.push({ s: { r: nameRow, c: c0 }, e: { r: nameRow, c: c1 } });
    }
    curRow = nameRow + 2;
  });
  const lastRow = curRow;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: NCOL - 1 } });
  ws['!cols'] = COLS.map((c) => ({ wch: c.width }));

  const merges = [];
  const M = (r1, c1, r2, c2) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  M(0, 0, 0, NCOL - 1);  // LAMPIRAN 1b: merge A-R, rata kiri
  M(titleRow, 0, titleRow, NCOL - 1);
  M(subTitleRow, 0, subTitleRow, NCOL - 1);
  M(hb, 0, hs, 0);        // No (grup+sub), nomor di baris hn
  M(hb, 1, hs, 1);        // No. Berkas
  M(hb, 2, hb, 7);        // IDENTITAS SUBYEK
  M(hb, 8, hb, 13);       // IDENTIFIKASI OBYEK
  M(hb, 14, hb, 17);      // LAMPIRAN BUKTI
  M(hs, 4, hs, 5);        // Tempat Tanggal Lahir
  M(hn, 4, hn, 5);        // nomor "5"
  ttdMerges.forEach((m) => merges.push(m));
  ws['!merges'] = merges;

  return ws;
}

// ---- API utama -------------------------------------------------------------
export async function generateLampiranIB({
  sourceFile,
  desaPilihan = '__ALL__',
  desaList = [],
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

  // Tentukan desa yang diikutkan. Prioritas: desaList (multi-select). Lalu desaPilihan
  // tunggal (kompat lama). Default: semua desa.
  let wanted;
  if (desaList && desaList.length) {
    wanted = desaList.map((d) => String(d).toUpperCase());
  } else if (desaPilihan && desaPilihan !== '__ALL__') {
    wanted = [String(desaPilihan).toUpperCase()];
  } else {
    wanted = desaKeys.slice();
  }

  // Satu workbook, satu sheet per desa (bukan ZIP terpisah).
  const wbOut = XLSX.utils.book_new();
  const ringkasan = [];
  const usedNames = new Set();
  for (const key of desaKeys) {
    if (!wanted.includes(key)) continue;
    const g = byDesa[key];
    const ws = buildDesaSheet(g.desa, g.kecamatan, g.rows, petugasList, statusTanah);
    // nama sheet: bersih dari karakter terlarang Excel, max 31 char, unik
    let base = String(g.desa).replace(/[:\\/?*\[\]]/g, '').trim().slice(0, 28) || 'Desa';
    let sn = base, n = 2;
    while (usedNames.has(sn.toLowerCase())) { sn = `${base.slice(0, 26)}_${n++}`; }
    usedNames.add(sn.toLowerCase());
    XLSX.utils.book_append_sheet(wbOut, ws, sn);
    ringkasan.push({ desa: g.desa, jumlah: g.rows.length });
  }
  if (!ringkasan.length) throw new Error('Tidak ada desa terpilih untuk di-generate.');

  const out = XLSX.write(wbOut, { type: 'array', bookType: 'xlsx', cellStyles: true });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = ringkasan.length === 1
    ? `Lampiran_I_B_${String(ringkasan[0].desa).replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_')}_Tahap_${tahapStr}.xlsx`
    : `Lampiran_I_B_Tahap_${tahapStr}.xlsx`;
  return { mode: 'multi', blob, filename, ringkasan, daftarDesa: desaKeys.map((k) => byDesa[k].desa) };
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
