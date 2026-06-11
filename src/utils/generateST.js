// generateST.js
// Prinsip paten (instruksi Vivi, non-negotiable):
//   Output ST HARUS identik dengan template asli. Layout, font, kop, logo,
//   margin, footer, dan SEMUA isi lain tidak boleh disentuh.
//   Satu-satunya yang diganti adalah placeholder bertanda 'xxx' di template.
// Template asli di-embed sebagai base64 di stTemplates.js.
//
// Mekanisme:
//   1. Heal: placeholder 'xxx' yang terpecah ke beberapa run digabung dulu
//      jadi satu token kontigu (khusus PL/Sidang). Aman karena smart-quote
//      hanya muncul sebagai bagian 'xxx'.
//   2. Tabel petugas (Puldadis & Puldadis Desa): baris data tunggal di template
//      di-clone per petugas, lalu 'xxx' di tiap baris diisi.
//   3. Sisa 'xxx' di seluruh dokumen diganti BERURUTAN sesuai daftar nilai
//      per jenis ST. Tidak ada elemen lain yang diubah.

import JSZip from 'jszip';
import { PULDADIS, PULDADIS_DESA, PL_PANITIA, SIDANG_PANITIA } from './stTemplates';

const TEMPLATES = { PULDADIS, PULDADIS_DESA, PL_PANITIA, SIDANG_PANITIA };

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const TERBILANG = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam',
  'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'dua belas',
  'tiga belas', 'empat belas', 'lima belas'];

// -- util tanggal --
function parseISO(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function fmtFull(d) { return d ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : ''; }
function fmtDayMonth(d) { return d ? `${d.getDate()} ${BULAN[d.getMonth()]}` : ''; }
function terbilang(n) {
  n = Number(n) || 0;
  if (n >= 0 && n < TERBILANG.length) return TERBILANG[n];
  return String(n);
}
function rangeDayOnly(dates) {
  const ds = dates.map(parseISO).filter(Boolean).sort((a, b) => a - b);
  if (!ds.length) return '';
  if (ds.length === 1) return String(ds[0].getDate());
  return `${ds[0].getDate()}-${ds[ds.length - 1].getDate()}`;
}
function rangeDayMonth(dates) {
  const ds = dates.map(parseISO).filter(Boolean).sort((a, b) => a - b);
  if (!ds.length) return '';
  if (ds.length === 1) return fmtDayMonth(ds[0]);
  const a = ds[0], b = ds[ds.length - 1];
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}-${b.getDate()} ${BULAN[a.getMonth()]}`;
  return `${fmtDayMonth(a)} - ${fmtDayMonth(b)}`;
}

// -- util XML --
function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Bila ada \n, pecah keluar dari <w:t> dengan <w:br/> agar XML valid.
// (TOKEN selalu berada persis di dalam <w:t>...</w:t>.)
function toRunText(s) {
  const parts = String(s == null ? '' : s).split('\n');
  if (parts.length === 1) return xmlEscape(parts[0]);
  return xmlEscape(parts[0]) +
    parts.slice(1).map((p) => `</w:t><w:br/><w:t xml:space="preserve">${xmlEscape(p)}`).join('');
}

// Gabungkan 'xxx' yang terpecah lintas run menjadi satu token kontigu.
function healXxx(xml) {
  return xml.replace(
    /\u2018(?:<\/w:t>[\s\S]*?<w:t[^>]*>)*xxx(?:<\/w:t>[\s\S]*?<w:t[^>]*>)*\u2019/g,
    '\u2018xxx\u2019'
  );
}

const TOKEN = '\u2018xxx\u2019';

function replaceNext(xml, valueXml) {
  const i = xml.indexOf(TOKEN);
  if (i < 0) return { xml, replaced: false };
  return { xml: xml.slice(0, i) + valueXml + xml.slice(i + TOKEN.length), replaced: true };
}
function replaceInOrder(xml, values) {
  let out = xml;
  for (const v of values) {
    const r = replaceNext(out, toRunText(v));
    out = r.xml;
  }
  return out;
}

// -- kloning baris tabel petugas (Puldadis & Puldadis Desa) --
function fillPetugasTable(xml, petugas, mapper) {
  const tblMatch = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/);
  if (!tblMatch) return xml;
  const tbl = tblMatch[0];

  const rows = tbl.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
  const dataRowIdx = rows.findIndex((r) => r.includes(TOKEN));
  if (dataRowIdx < 0) return xml;
  const templateRow = rows[dataRowIdx];

  const list = (petugas && petugas.length) ? petugas : [{}];

  const builtRows = list.map((p, idx) => {
    let row = templateRow;
    const n = idx + 1;
    // No. urut: dukung "1." dalam satu run, atau "1" terpisah dari "."
    if (/(<w:t[^>]*>)\s*1\.\s*(<\/w:t>)/.test(row)) {
      row = row.replace(/(<w:t[^>]*>)\s*1\.\s*(<\/w:t>)/, `$1${n}.$2`);
    } else {
      row = row.replace(/(<w:t[^>]*>)\s*1\s*(<\/w:t>)/, `$1${n}$2`);
    }
    const vals = mapper(p, idx) || [];
    for (const v of vals) {
      const i = row.indexOf(TOKEN);
      if (i < 0) break;
      row = row.slice(0, i) + toRunText(v) + row.slice(i + TOKEN.length);
    }
    return row;
  }).join('');

  const newTbl = tbl.replace(templateRow, builtRows);
  return xml.replace(tbl, newTbl);
}

function buildPetugasNamaCell(p) {
  const nama = p.Nama_Cache || p.Nama || '';
  const nip = p.NIP_Cache || p.NIP_Lisensi_SK || '';
  const pangkat = p.Pangkat_Cache || p.Pangkat_Golongan || '';
  const lines = [nama];
  if (String(nip).trim()) lines.push(`NIP. ${nip}`);
  if (String(pangkat).trim()) lines.push(`Pangkat : ${pangkat}`);
  return lines.join('\n');
}

// -- entry point --
export async function generateAndDownloadST(stResult, skData, panitiaList) {
  const jenis = stResult.Kode_Jenis_ST || stResult.jenis || 'PULDADIS';
  const b64 = TEMPLATES[jenis];
  if (!b64) throw new Error(`Template untuk jenis ${jenis} tidak tersedia.`);

  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const zip = await JSZip.loadAsync(bytes);
  let xml = await zip.file('word/document.xml').async('string');
  xml = healXxx(xml);

  const desa = stResult.namaDesa || '';
  const kec = stResult.kecamatan || '';
  const tglList = (stResult.tglSTList && stResult.tglSTList.length)
    ? stResult.tglSTList : [stResult.Tanggal_ST];
  const tglST = parseISO(stResult.Tanggal_ST || tglList[0]);
  const jumlahHari = stResult.jumlahHari || tglList.length || 1;
  const volume = stResult.jumlahBidang != null ? `${stResult.jumlahBidang}` : '';
  const kades = stResult.namaKades || '';

  if (jenis === 'PULDADIS' || jenis === 'PULDADIS_DESA') {
    const petugas = stResult.petugasList || [];
    const mapper = (jenis === 'PULDADIS')
      ? (p) => [buildPetugasNamaCell(p), p.Jabatan_Struktural_Cache || p.Jabatan || '']
      : (p) => [p.Nama_Cache || p.Nama || '', desa];
    xml = fillPetugasTable(xml, petugas, mapper);

    xml = replaceInOrder(xml, [
      stResult.No_ST || '',
      desa,
      kec,
      rangeDayMonth(tglList),
      String(jumlahHari),
      terbilang(jumlahHari),
      fmtDayMonth(tglST),
      desa,
      kec,
    ]);
  } else {
    xml = replaceInOrder(xml, [
      stResult.No_ST || '',  // 0 NOMOR
      kades,                 // 1 baris 7 Kades nama
      desa,                  // 2 "Kepala Desa xxx"
      desa,                  // 3 body1 Desa
      kec,                   // 4 body1 Kecamatan
      volume,                // 5 body1 Volume
      desa,                  // 6 body2 Desa
      kec,                   // 7 body2 Kecamatan
      volume,                // 8 body2 Volume
      rangeDayOnly(tglList), // 9 Tanggal (bulan tetap dari template)
      String(jumlahHari),    // 10 selama angka
      terbilang(jumlahHari), // 11 terbilang
      fmtFull(tglST),        // 12 Suwawa, xxx
      desa,                  // 13 form DESA
      kec,                   // 14 form KECAMATAN
      kades,                 // 15 form baris 7 Kades nama
      desa,                  // 16 form "Kepala Desa xxx"
    ]);
  }

  zip.file('word/document.xml', xml);
  const out = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const safe = String(stResult.No_ST || jenis).replace(/[^\w.-]+/g, '_');
  const filename = `ST_${jenis}_${safe}.docx`;
  downloadBlob(out, filename);
  return { filename };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
