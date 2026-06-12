// ============================================================
// parseEvidence.js — Parser Evidence PTSL (.xlsx) di browser
// ============================================================

import * as XLSX from 'xlsx';

function toDateStr(val) {
  if (!val || val === 'null' || val === '') return null;

  // Date object (dari cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // String berbagai format. Format Excel Vivi: dd/mm/yy (hari/bulan/tahun-2digit).
  if (typeof val === 'string') {
    const t = val.trim();
    // ISO: yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.substring(0, 10);
    // dd/mm/yy atau dd/mm/yyyy (slash). Tahun 2 digit -> 20yy.
    const ms = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (ms) {
      const yy = ms[3].length === 2 ? 2000 + parseInt(ms[3], 10) : parseInt(ms[3], 10);
      return `${yy}-${ms[2].padStart(2, '0')}-${ms[1].padStart(2, '0')}`;
    }
    // dd-mm-yy atau dd-mm-yyyy (dash), interpretasi sama: hari-bulan-tahun.
    const md = t.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (md) {
      const yy = md[3].length === 2 ? 2000 + parseInt(md[3], 10) : parseInt(md[3], 10);
      return `${yy}-${md[2].padStart(2, '0')}-${md[1].padStart(2, '0')}`;
    }
  }

  // Number = Excel serial date
  if (typeof val === 'number') {
    try {
      // Excel epoch: 1 Jan 1900 = serial 1 (dengan bug Lotus 1-2-3)
      const d = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
        const da = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${mo}-${da}`;
      }
    } catch(e) {}
  }

  return null;
}

export async function parseEvidenceFile(file, subMenu = 'SUDAH_K1') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // raw: true agar Date tetap sebagai Date object, bukan string
        const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: true });

        // Cari sheet yang punya kolom 'Tanggal mulai'
        let targetSheet = null;
        let targetRows  = [];

        for (const sname of wb.SheetNames) {
          const ws   = wb.Sheets[sname];
          // sheet_to_json dengan raw:true agar nilai angka/date tidak dikonversi
          const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
          if (rows.length > 0 && ('Tanggal mulai' in rows[0] || 'DI208' in rows[0])) {
            targetSheet = sname;
            targetRows  = rows;
            break;
          }
        }

        if (!targetSheet || targetRows.length === 0) {
          reject(new Error('Sheet dengan data Evidence tidak ditemukan.'));
          return;
        }

        // Filter K1 / Potensi K1
        const filtered = targetRows.filter(row => {
          if (subMenu === 'SUDAH_K1') {
            const v = row['DI208'];
            return v !== null && v !== '' && v !== undefined && v !== 'null';
          } else {
            const v = row['DI201B'];
            return v !== null && v !== '' && v !== undefined && v !== 'null';
          }
        });

        if (filtered.length === 0) {
          reject(new Error(
            subMenu === 'SUDAH_K1'
              ? 'Tidak ada baris dengan DI208 terisi (Sudah K1).'
              : 'Tidak ada baris dengan DI201B terisi (Potensi K1).'
          ));
          return;
        }

        // Group per (Desa + tglMulai + tglPengumuman) = 1 bulk = 1 ST
        const groupMap = {};

        filtered.forEach(row => {
          const desa          = String(row['Desa'] || '').trim().toUpperCase();
          const kecamatan     = String(row['Kecamatan'] || '').trim();
          const tglMulai      = toDateStr(row['Tanggal mulai']);
          const tglPengumuman = toDateStr(row['Tgl DI201B']);
          const nomorBerkas   = row['Nomor berkas'];
          const NIB           = row['NIB'];
          const nama          = row['Nama'];
          const nik           = row['Nik'] || row['NIK'];

          if (!desa || !tglMulai) return; // skip baris tanpa desa atau tanggal

          const key = `${desa}||${tglMulai}||${tglPengumuman || ''}`;
          if (!groupMap[key]) {
            groupMap[key] = { desa, kecamatan, tglMulai, tglPengumuman, bidangList: [] };
          }
          groupMap[key].bidangList.push({ nomorBerkas, NIB, nama, nik });
        });

        const bulkGroups = Object.values(groupMap).sort((a, b) => {
          if (a.desa !== b.desa) return a.desa.localeCompare(b.desa);
          return (a.tglMulai || '').localeCompare(b.tglMulai || '');
        });

        if (bulkGroups.length === 0) {
          reject(new Error('Data terbaca tapi tidak bisa dikelompokkan. Cek format kolom Desa dan Tanggal mulai.'));
          return;
        }

        // Agregat per desa
        const desaStats = {};
        bulkGroups.forEach(g => {
          const key = g.desa;
          if (!desaStats[key]) {
            desaStats[key] = {
              desa: g.desa,
              kecamatan: g.kecamatan,
              jumlahBidang: 0,
              tglMulaiList: [],
              tglPengumumanList: [],
            };
          }
          desaStats[key].jumlahBidang += g.bidangList.length;
          if (g.tglMulai && !desaStats[key].tglMulaiList.includes(g.tglMulai))
            desaStats[key].tglMulaiList.push(g.tglMulai);
          if (g.tglPengumuman && !desaStats[key].tglPengumumanList.includes(g.tglPengumuman))
            desaStats[key].tglPengumumanList.push(g.tglPengumuman);
        });

        Object.values(desaStats).forEach(d => {
          d.tglMulaiList.sort();
          d.tglPengumumanList.sort();
          d.tglMulaiAwal      = d.tglMulaiList[0] || null;
          d.tglPengumumanAwal = d.tglPengumumanList[0] || null;
        });

        resolve({
          sheetName:  targetSheet,
          totalRows:  filtered.length,
          bulkGroups,
          desaStats,
        });

      } catch (err) {
        reject(new Error('Gagal membaca file: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('FileReader error.'));
    reader.readAsArrayBuffer(file);
  });
}
