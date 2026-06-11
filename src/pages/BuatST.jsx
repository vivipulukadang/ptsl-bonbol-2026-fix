import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import {
  getMasterDasarSK, getMasterPegawai, getMasterTahapan,
  getDesaByTahapan, getPanitiaPerSK, getKalendar,
  bookTanggalST, bookNomorST
} from '../api/appsScript';
import { LoadingState, ErrorState, PageHeader, Spinner } from '../components/UI';
import { parseEvidenceFile } from '../utils/parseEvidence';
import { generateAndDownloadST } from '../utils/generateST';

// ─── Konstanta ────────────────────────────────────────────────
const JENIS_ST = [
  { value: 'PULDADIS',       label: 'ST Puldadis',                   butuhPetugas: true,  butuhBidang: false },
  { value: 'PULDADIS_DESA',  label: 'ST Puldadis Desa',              butuhPetugas: false, butuhBidang: false },
  { value: 'PL_PANITIA',     label: 'ST Panitia Pemeriksaan Lapang', butuhPetugas: false, butuhBidang: true  },
  { value: 'SIDANG_PANITIA', label: 'ST Sidang Panitia Ajudikasi',   butuhPetugas: false, butuhBidang: true  },
];

// Aturan available dates per jenis ST (dari desain)
// Puldadis/PuldadisDesa: tanggal ST <= tanggal mulai
// PL/Sidang: tanggal mulai < tanggal ST < tanggal pengumuman
function isDateAvailable(iso, jenisValue, tglMulai, tglPengumuman) {
  if (!tglMulai) return false;
  if (jenisValue === 'PULDADIS' || jenisValue === 'PULDADIS_DESA') {
    return iso <= tglMulai;
  }
  return iso > tglMulai && (!tglPengumuman || iso < tglPengumuman);
}

// ─── Upload Evidence Panel ────────────────────────────────────
function UploadEvidencePanel({ onParsed, parsedResult }) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing]   = useState(false);
  const [error, setError]       = useState(null);
  const [subMenu, setSubMenu]   = useState('SUDAH_K1');
  const [fileName, setFileName] = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Format file harus .xlsx atau .xls'); return;
    }
    setFileName(file.name);
    setParsing(true);
    setError(null);
    try {
      const result = await parseEvidenceFile(file, subMenu);
      onParsed(result);
    } catch (e) {
      setError(e.message);
      onParsed(null);
    } finally {
      setParsing(false);
    }
  }, [subMenu, onParsed]);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-navy">Upload Evidence PTSL</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Upload file Evidence PTSL_Tahap_x.xlsx hasil export KKP.
            Tanggal mulai, pengumuman, desa, dan jumlah bidang akan otomatis terisi.
          </p>
        </div>
      </div>

      {/* Sub-menu K1 */}
      <div className="flex gap-2 mb-3">
        {[
          { value: 'SUDAH_K1',   label: 'Sudah K1 (DI208)' },
          { value: 'POTENSI_K1', label: 'Potensi K1 (DI201B)' },
        ].map(o => (
          <button key={o.value} type="button"
            onClick={() => { setSubMenu(o.value); if (fileName) setFileName(null); onParsed(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
              ${subMenu === o.value ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${dragging ? 'border-navy bg-blue-50' : 'border-gray-200 hover:border-navy hover:bg-gray-50'}`}
        onClick={() => document.getElementById('evidence-upload').click()}
      >
        <input id="evidence-upload" type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        {parsing ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner />
            <p className="text-sm text-gray-500">Membaca file Evidence...</p>
          </div>
        ) : parsedResult ? (
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-semibold text-green-700">{fileName}</p>
            <p className="text-xs text-green-600">
              {parsedResult.totalRows} bidang · {parsedResult.bulkGroups.length} bulk · {Object.keys(parsedResult.desaStats).length} desa
            </p>
            <p className="text-xs text-gray-400 mt-1">Klik untuk ganti file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl">📂</div>
            <p className="text-sm text-gray-500">Drag & drop atau klik untuk pilih file</p>
            <p className="text-xs text-gray-400">Evidence_PTSL_Tahap_x.xlsx</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {error}</p>
      )}

      {/* Preview bulk groups */}
      {parsedResult && parsedResult.bulkGroups.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Bulk yang terdeteksi ({parsedResult.bulkGroups.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {parsedResult.bulkGroups.map((g, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
                <span className="font-medium text-navy">{g.desa}</span>
                <span className="text-gray-500">{g.tglMulai}</span>
                <span className="text-gray-400">{g.tglPengumuman || '—'}</span>
                <span className="bg-navy text-white px-1.5 py-0.5 rounded">{g.bidangList.length} bidang</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Pilih desa di bawah untuk mulai membuat ST dari bulk ini.</p>
        </div>
      )}
    </div>
  );
}

// ─── Searchable Dropdown ──────────────────────────────────────
function SearchableDropdown({ options, value, onChange, placeholder, labelKey = 'label', valueKey = 'value', disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() =>
    options.filter(o => String(o[labelKey] || '').toLowerCase().includes(query.toLowerCase())),
    [options, query, labelKey]
  );
  const selected = options.find(o => o[valueKey] === value);

  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)}
        className={`input-field text-left flex justify-between items-center ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}>
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected[labelKey] : placeholder}
        </span>
        <span className="text-gray-400 ml-2">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-hidden">
          <div className="p-2 border-b">
            <input autoFocus type="text"
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy"
              placeholder="Cari..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="overflow-y-auto max-h-40">
            {filtered.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">Tidak ditemukan</p>}
            {filtered.map(o => (
              <button key={o[valueKey]} type="button"
                onClick={() => { onChange(o[valueKey]); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-navy hover:text-white transition-colors
                  ${o[valueKey] === value ? 'bg-navy/10 font-medium' : ''}`}>
                {o[labelKey]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Petugas Multi-Select ────────────────────────────────────
function PetugasMultiSelect({ pegawaiList, selected, onChange }) {
  const [query, setQuery] = useState('');
  const filtered = pegawaiList.filter(p =>
    String(p.Nama || '').toLowerCase().includes(query.toLowerCase()) ||
    String(p.NIP_Lisensi_SK || '').includes(query)
  );
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div>
      <input type="text" className="input-field mb-2"
        placeholder="🔍 Cari nama atau NIP..." value={query}
        onChange={e => setQuery(e.target.value)} />
      <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto">
        {filtered.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">Tidak ditemukan</p>}
        {filtered.map(p => (
          <label key={p.ID_Pegawai}
            className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0">
            <input type="checkbox" checked={selected.includes(p.ID_Pegawai)}
              onChange={() => toggle(p.ID_Pegawai)} className="mt-0.5 rounded" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{p.Nama}</p>
              <p className="text-xs text-gray-400">{p.NIP_Lisensi_SK} · {p.Pangkat_Golongan}</p>
            </div>
            <span className="text-xs text-navy bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">
              {p.Jabatan_dalam_Tim}
            </span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-navy mt-1 font-medium">{selected.length} petugas dipilih</p>
      )}
    </div>
  );
}

// ─── Kalender Tanggal ST ──────────────────────────────────────
function KalenderST({ kalenderData, tglMulai, tglPengumuman, jenisValue, jumlahHari, selected, onChange }) {
  const hariKerjaSet = useMemo(() => {
    const s = new Set();
    (kalenderData || []).forEach(k => {
      // Cek semua kemungkinan nama kolom
      const val = k['Adalah_Hari_Kerja'] ?? k['Is_Hari_Kerja'] ?? k['Boleh_Booking'];
      const isKerja = val === true || val === 1 ||
        String(val).toLowerCase() === 'ya' ||
        String(val).toLowerCase() === 'true' ||
        String(val) === 'TRUE';
      if (isKerja) s.add(String(k['Tanggal']).substring(0, 10));
    });
    return s;
  }, [kalenderData]);

  const availableDates = useMemo(() => {
    if (!tglMulai) return new Set();
    const available = new Set();
    const base = new Date(tglMulai);
    const rangeStart = new Date(base); rangeStart.setDate(rangeStart.getDate() - 90);
    const rangeEnd   = tglPengumuman ? new Date(tglPengumuman) : new Date(base);
    if (!tglPengumuman) rangeEnd.setDate(rangeEnd.getDate() + 30);

    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const iso = cur.toISOString().substring(0, 10);
      if (hariKerjaSet.has(iso) && isDateAvailable(iso, jenisValue, tglMulai, tglPengumuman)) {
        available.add(iso);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return available;
  }, [tglMulai, tglPengumuman, hariKerjaSet, jenisValue]);

  // Default view: bulan dari tglMulai
  const [viewMonth, setViewMonth] = useState(() => {
    const d = tglMulai ? new Date(tglMulai) : new Date();
    // Untuk Puldadis: tampilkan bulan sebelum tglMulai (karena tanggal ST harus sebelum tglMulai)
    if (jenisValue === 'PULDADIS' || jenisValue === 'PULDADIS_DESA') {
      d.setDate(1);
    }
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const days = useMemo(() => {
    const { year, month } = viewMonth;
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const result = [];
    const startDow = (first.getDay() + 6) % 7;
    for (let i = 0; i < startDow; i++) result.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      result.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    }
    return result;
  }, [viewMonth]);

  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const DOW   = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

  const toggleDate = (iso) => {
    if (!availableDates.has(iso)) return;
    if (jumlahHari <= 1) {
      onChange([iso]);
    } else {
      if (selected.includes(iso)) {
        onChange(selected.filter(d => d !== iso));
      } else if (selected.length < jumlahHari) {
        onChange([...selected, iso].sort());
      }
    }
  };

  const prevMonth = () => setViewMonth(v => v.month === 0
    ? { year: v.year-1, month: 11 } : { year: v.year, month: v.month-1 });
  const nextMonth = () => setViewMonth(v => v.month === 11
    ? { year: v.year+1, month: 0 } : { year: v.year, month: v.month+1 });

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="text-navy hover:bg-gray-100 rounded p-1 text-sm">◀</button>
        <span className="text-sm font-semibold text-navy">{BULAN[viewMonth.month]} {viewMonth.year}</span>
        <button type="button" onClick={nextMonth} className="text-navy hover:bg-gray-100 rounded p-1 text-sm">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {DOW.map(d => <div key={d} className="text-xs font-semibold text-gray-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {days.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const isAvail    = availableDates.has(iso);
          const isSelected = selected.includes(iso);
          return (
            <button key={iso} type="button" onClick={() => toggleDate(iso)} disabled={!isAvail}
              className={`rounded text-xs py-1.5 transition-colors
                ${isSelected  ? 'bg-navy text-white font-bold' :
                  isAvail     ? 'bg-green-50 text-green-800 hover:bg-green-200 border border-green-200' :
                                'text-gray-300 cursor-not-allowed'}`}>
              {parseInt(iso.substring(8), 10)}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-200 rounded inline-block"/>Tersedia</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-navy rounded inline-block"/>Dipilih</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 rounded inline-block"/>Tidak tersedia</span>
      </div>
      {jenisValue === 'PULDADIS' || jenisValue === 'PULDADIS_DESA' ? (
        <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded px-2 py-1">
          Tanggal ST harus ≤ Tanggal Mulai ({tglMulai})
        </p>
      ) : (
        <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded px-2 py-1">
          Tanggal ST harus setelah Tanggal Mulai dan sebelum Tanggal Pengumuman
        </p>
      )}
      {jumlahHari > 1 && (
        <p className="text-xs text-gold mt-1 font-medium">
          Pilih {jumlahHari} tanggal (dipilih: {selected.length})
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function BuatST() {
  const allSK      = useFetch(getMasterDasarSK, {});
  const allPegawai = useFetch(getMasterPegawai, { status: 'Aktif' });
  const tahapan    = useFetch(getMasterTahapan, {});
  const kalender   = useFetch(getKalendar, { tahun: '2026' });

  const [step, setStep]             = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [idSTResult, setIdSTResult] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [stResult, setStResult]     = useState(null);
  const [generating, setGenerating] = useState(false);

  // Evidence state
  const [evidenceParsed, setEvidenceParsed] = useState(null);

  // Form
  const [f, setF] = useState({
    jenis:          'PULDADIS',
    id_tahapan:     '',
    id_sk_dasar:    '',
    id_desa:        '',
    jumlah_hari:    1,
    tgl_mulai:      '',
    tgl_pengumuman: '',
    tgl_st_list:    [],
    petugas_ids:    [],
    bulk_index:     null, // index bulk yang dipilih dari evidence
  });
  const [noST, setNoST] = useState('');

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const jenisInfo = JENIS_ST.find(j => j.value === f.jenis) || JENIS_ST[0];

  // Saat BULK dipilih → auto-fill tanggal & desa DARI BULK ITU (bukan agregat desa).
  // Tiap bulk = 1 ST, punya tgl mulai & tgl pengumuman sendiri. Patokan validasi
  // tanggal ST mengikuti tgl mulai bulk terpilih, bukan bulk paling awal desa.
  useEffect(() => {
    if (f.bulk_index == null || !evidenceParsed) return;
    const bulk = evidenceParsed.bulkGroups[f.bulk_index];
    if (!bulk) return;
    setF(p => ({
      ...p,
      id_desa: bulk.desa,
      tgl_mulai: bulk.tglMulai || '',
      tgl_pengumuman: bulk.tglPengumuman || '',
      tgl_st_list: [],
    }));
  }, [f.bulk_index, evidenceParsed]);

  // Auto-set SK dari tahapan
  useEffect(() => {
    if (!f.id_tahapan || !allSK.data) return;
    const match = allSK.data.find(sk =>
      sk.Tahap_Berlaku === f.id_tahapan && sk.Status === 'Aktif'
    ) || allSK.data.find(sk => sk.Tahap_Berlaku === f.id_tahapan);
    if (match) set('id_sk_dasar', match.ID_SK);
  }, [f.id_tahapan, allSK.data]);

  // Panitia untuk PL & Sidang
  const panitiaFetch = useFetch(
    getPanitiaPerSK,
    f.id_sk_dasar && (f.jenis === 'PL_PANITIA' || f.jenis === 'SIDANG_PANITIA')
      ? { id_sk: f.id_sk_dasar, id_desa: f.id_desa }
      : {},
    [f.id_sk_dasar, f.id_desa, f.jenis]
  );

  // Bulk options — tiap bulk = 1 ST (desa + tgl mulai + tgl pengumuman spesifik)
  const bulkOptions = useMemo(() => {
    if (!evidenceParsed) return [];
    return evidenceParsed.bulkGroups.map((b, i) => ({
      value: i,
      label: `${b.desa} — mulai ${b.tglMulai}${b.tglPengumuman ? ` \u2192 ${b.tglPengumuman}` : ''} (${b.bidangList.length} bidang)`,
    }));
  }, [evidenceParsed]);

  // Jumlah bidang dari BULK terpilih
  const jumlahBidang = useMemo(() => {
    if (f.bulk_index == null || !evidenceParsed) return 0;
    const b = evidenceParsed.bulkGroups[f.bulk_index];
    return b ? b.bidangList.length : 0;
  }, [f.bulk_index, evidenceParsed]);

  // Kades dari evidence
  const kadesSelected = useMemo(() => {
    if (!f.id_desa || !evidenceParsed) return '';
    const d = evidenceParsed.desaStats[f.id_desa.toUpperCase()];
    return d ? `Kades akan diisi dari master desa ${f.id_desa}` : '';
  }, [f.id_desa, evidenceParsed]);

  // SK options — semua versi
  const skOptions = (allSK.data || []).map(sk => ({
    value: sk.ID_SK,
    label: `${sk.Nomor_SK} (${sk.Versi} — ${sk.Tahap_Berlaku})`,
  }));

  const tahapanOptions = (tahapan.data || []).map(t => ({
    value: t.ID_Tahapan || t['ID_Tahapan'],
    label: `${t.ID_Tahapan || t['ID_Tahapan']} — ${t.Nama_Tahapan || t['Nama_Tahapan'] || ''}`,
  }));

  const pegawaiList = (allPegawai.data || []).filter(p =>
    String(p.Jabatan_dalam_Tim || '') !== ''
  );

  // ── Submit Step 1 ──
  const handleStep1 = async () => {
    setError(null);
    if (!f.id_tahapan)  { setError('Pilih tahapan pencairan.'); return; }
    if (!f.id_sk_dasar) { setError('Pilih SK dasar.'); return; }
    if (f.bulk_index == null && !f.id_desa) { setError('Pilih bulk dari Evidence.'); return; }
    if (!f.tgl_mulai)   { setError('Tanggal mulai belum terisi. Upload Evidence PTSL atau isi manual.'); return; }
    if (f.tgl_st_list.length === 0) { setError('Pilih tanggal ST di kalender.'); return; }
    if (jenisInfo.butuhPetugas && f.petugas_ids.length === 0) { setError('Pilih minimal satu petugas BPN.'); return; }

    setSubmitting(true);
    try {
      const tglMulaiST  = f.tgl_st_list[0];
      const tglSelesaiST = f.tgl_st_list[f.tgl_st_list.length - 1];

      const res = await bookTanggalST({
        kode_jenis_st:           f.jenis,
        id_tahapan:              f.id_tahapan,
        id_sk_dasar:             f.id_sk_dasar,
        tanggal_st:              tglMulaiST,
        tgl_mulai_pelaksanaan:   f.tgl_mulai,
        tgl_selesai_pelaksanaan: f.tgl_pengumuman || f.tgl_mulai,
        id_pegawai_list:         JSON.stringify(jenisInfo.butuhPetugas ? f.petugas_ids : []),
        id_desa_list:            JSON.stringify([{ id_desa: f.id_desa, jml_bidang: jumlahBidang }]),
        user: 'Vivi',
      });
      setIdSTResult(res.data.id_st);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2 = async () => {
    setError(null);
    if (!noST.trim()) { setError('Nomor ST wajib diisi.'); return; }
    setSubmitting(true);
    try {
      const res = await bookNomorST({ id_st: idSTResult, no_st: noST.trim(), user: 'Vivi' });
      setSuccessMsg(`ST ${res.data.no_st} berhasil diterbitkan (${res.data.id_st}).`);
      // Simpan semua data untuk generate dokumen
      setStResult({
        No_ST: res.data.no_st,
        Kode_Jenis_ST: f.jenis,
        Tanggal_ST: f.tgl_st_list[0],
        tglSTList: f.tgl_st_list,
        namaDesa: f.id_desa,
        kecamatan: evidenceParsed?.bulkGroups?.[f.bulk_index]?.kecamatan
          || evidenceParsed?.desaStats?.[f.id_desa.toUpperCase()]?.kecamatan || '',
        jumlahBidang,
        namaKades: kadesSelected,
        jabatanKades: `Kepala Desa ${f.id_desa}`,
        petugasList: (allPegawai.data || [])
          .filter(p => f.petugas_ids.includes(p.ID_Pegawai))
          .map(p => ({
            Nama_Cache: p.Nama,
            NIP_Cache:  p.NIP_Lisensi_SK,
            Pangkat_Cache: p.Pangkat_Golongan,
            Jabatan_Struktural_Cache: p.Jabatan,
            Jabatan_dalam_Tim: p.Jabatan_dalam_Tim,
          })),
      });
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setF({ jenis:'PULDADIS', id_tahapan:'', id_sk_dasar:'', id_desa:'', jumlah_hari:1,
      tgl_mulai:'', tgl_pengumuman:'', tgl_st_list:[], petugas_ids:[], bulk_index: null });
    setNoST(''); setIdSTResult(null); setError(null); setSuccessMsg(null);
  };

  if (allSK.loading || allPegawai.loading || tahapan.loading) return <LoadingState />;
  if (allSK.error) return <ErrorState message={allSK.error} onRetry={allSK.refetch} />;

  return (
    <div>
      <PageHeader title="Buat ST" subtitle="Workflow 2 Langkah: Booking Tanggal → Booking Nomor" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[1,2,3].map((s,i) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0
              ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-navy text-white' : 'bg-gray-200 text-gray-400'}`}>
              {step > s ? '✓' : s}
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">⚠ {error}</div>
      )}

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="space-y-5">

          {/* Upload Evidence — paling atas */}
          <UploadEvidencePanel
            onParsed={(result) => {
              setEvidenceParsed(result);
              setF(p => ({ ...p, bulk_index: null, id_desa: '', tgl_mulai: '', tgl_pengumuman: '', tgl_st_list: [] }));
            }}
            parsedResult={evidenceParsed}
          />

          {/* Jenis ST */}
          <div className="card">
            <h3 className="font-semibold text-navy mb-3">Jenis Surat Tugas</h3>
            <div className="grid grid-cols-2 gap-2">
              {JENIS_ST.map(j => (
                <button key={j.value} type="button"
                  onClick={() => { set('jenis', j.value); set('tgl_st_list', []); }}
                  className={`border rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-all
                    ${f.jenis === j.value ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'}`}>
                  {j.label}
                </button>
              ))}
            </div>
            {(f.jenis === 'PL_PANITIA' || f.jenis === 'SIDANG_PANITIA') && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                Susunan panitia mengikuti SK yang dipilih (otomatis), kecuali Kepala Desa yang menyesuaikan desa lokasi.
              </div>
            )}
          </div>

          {/* Tahapan & SK */}
          <div className="card">
            <h3 className="font-semibold text-navy mb-3">Tahapan & SK Dasar</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tahapan Pencairan *</label>
                {tahapanOptions.length > 0 ? (
                  <SearchableDropdown options={tahapanOptions} value={f.id_tahapan}
                    onChange={v => { set('id_tahapan', v); set('id_desa', ''); set('tgl_st_list', []); }}
                    placeholder="— Pilih Tahapan —" />
                ) : (
                  <select className="input-field" value={f.id_tahapan}
                    onChange={e => { set('id_tahapan', e.target.value); set('id_desa', ''); }}>
                    <option value="">— Pilih Tahapan —</option>
                    {['T01','T02','T03','T04'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="label">SK Dasar * (semua versi)</label>
                <SearchableDropdown options={skOptions} value={f.id_sk_dasar}
                  onChange={v => set('id_sk_dasar', v)} placeholder="— Pilih SK —" />
                {f.id_sk_dasar && allSK.data && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {allSK.data.find(s => s.ID_SK === f.id_sk_dasar)?.Tentang?.substring(0, 70)}...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Desa & Bidang */}
          <div className="card">
            <h3 className="font-semibold text-navy mb-1">Desa & Bidang</h3>
            {!evidenceParsed ? (
              <p className="text-sm text-gray-400 py-2">
                Upload Evidence PTSL di atas untuk melihat daftar desa dan auto-fill data.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bulk * (dari Evidence)</label>
                  <SearchableDropdown options={bulkOptions} value={f.bulk_index}
                    onChange={v => { set('bulk_index', v); set('tgl_st_list', []); }}
                    placeholder="— Pilih Bulk —" />
                  <p className="text-xs text-gray-400 mt-1">{bulkOptions.length} bulk di Evidence ini</p>
                </div>
                <div>
                  <label className="label">Jumlah Bidang</label>
                  <div className="input-field bg-gray-50 text-gray-600">
                    {jumlahBidang > 0 ? `${jumlahBidang} bidang` : '—'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Auto-fill dari Evidence</p>
                </div>
              </div>
            )}
          </div>

          {/* Tanggal Pelaksanaan */}
          <div className="card">
            <h3 className="font-semibold text-navy mb-1">Tanggal Pelaksanaan</h3>
            {evidenceParsed && f.id_desa ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 mb-3">
                Auto-fill dari Evidence: Tanggal Mulai = <strong>{f.tgl_mulai || '—'}</strong>,
                Tanggal Pengumuman = <strong>{f.tgl_pengumuman || '—'}</strong>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3">
                Pilih desa dari Evidence untuk auto-fill, atau isi manual.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Tanggal Mulai *</label>
                <input type="date" className="input-field" value={f.tgl_mulai}
                  onChange={e => { set('tgl_mulai', e.target.value); set('tgl_st_list', []); }} />
              </div>
              <div>
                <label className="label">Tanggal Pengumuman</label>
                <input type="date" className="input-field" value={f.tgl_pengumuman}
                  onChange={e => { set('tgl_pengumuman', e.target.value); set('tgl_st_list', []); }} />
              </div>
            </div>

            {f.tgl_mulai && (
              <>
                <div className="mb-3">
                  <label className="label">Jumlah Hari ST</label>
                  <select className="input-field w-28"
                    value={f.jumlah_hari}
                    onChange={e => { set('jumlah_hari', parseInt(e.target.value)); set('tgl_st_list', []); }}>
                    {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} hari</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">
                    Tanggal ST *
                    {(f.jenis === 'PULDADIS' || f.jenis === 'PULDADIS_DESA')
                      ? ' — pilih tanggal ≤ Tanggal Mulai'
                      : ' — pilih tanggal setelah Tanggal Mulai, sebelum Pengumuman'}
                  </label>
                  {kalender.loading
                    ? <LoadingState message="Memuat kalender..." />
                    : <KalenderST
                        kalenderData={kalender.data}
                        tglMulai={f.tgl_mulai}
                        tglPengumuman={f.tgl_pengumuman}
                        jenisValue={f.jenis}
                        jumlahHari={f.jumlah_hari}
                        selected={f.tgl_st_list}
                        onChange={v => set('tgl_st_list', v)}
                      />
                  }
                  {f.tgl_st_list.length > 0 && (
                    <p className="text-xs text-navy mt-1 font-medium">
                      Dipilih: {f.tgl_st_list.join(', ')}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Petugas BPN — hanya untuk Puldadis */}
          {jenisInfo.butuhPetugas && (
            <div className="card">
              <h3 className="font-semibold text-navy mb-3">Petugas BPN *</h3>
              <PetugasMultiSelect
                pegawaiList={pegawaiList}
                selected={f.petugas_ids}
                onChange={v => set('petugas_ids', v)}
              />
            </div>
          )}

          {/* Susunan panitia — PL & Sidang */}
          {(f.jenis === 'PL_PANITIA' || f.jenis === 'SIDANG_PANITIA') && f.id_sk_dasar && (
            <div className="card">
              <h3 className="font-semibold text-navy mb-3">Susunan Panitia</h3>
              {panitiaFetch.loading ? <LoadingState message="Memuat panitia..." /> :
               panitiaFetch.error   ? <p className="text-xs text-red-500">{panitiaFetch.error}</p> :
               (panitiaFetch.data || []).length === 0
                 ? <p className="text-xs text-gray-400">Data panitia belum tersedia untuk SK ini.</p>
                 : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1 px-2 text-gray-500">No</th>
                          <th className="text-left py-1 px-2 text-gray-500">Nama</th>
                          <th className="text-left py-1 px-2 text-gray-500">Jabatan dalam Tim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(panitiaFetch.data || []).map((p, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1 px-2 text-gray-400">{p.Urutan || i+1}</td>
                            <td className="py-1 px-2 font-medium">{p.Nama_Cache || p.Nama}</td>
                            <td className="py-1 px-2 text-gray-500">{p.Jabatan_dalam_Tim}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleStep1} disabled={submitting}
              className="btn-primary flex items-center gap-2">
              {submitting && <Spinner size="sm" />}
              Book Tanggal →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-navy">Step 2 — Booking Nomor ST</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            Tanggal berhasil di-book. ID_ST: <strong>{idSTResult}</strong>.
            Sekarang ambil nomor ST dari bagian TU, lalu isi di bawah.
          </div>
          <div>
            <label className="label">Nomor ST (dari TU) *</label>
            <input type="text" className="input-field" value={noST}
              onChange={e => setNoST(e.target.value)}
              placeholder="Contoh: 37.5/ST-75.03.HP/VI/2026" />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">ID_ST: {idSTResult}</p>
            <button onClick={handleStep2} disabled={submitting}
              className="btn-primary flex items-center gap-2">
              {submitting && <Spinner size="sm" />}
              Terbitkan ST →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="card text-center py-10">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-bold text-navy text-lg mb-2">ST Berhasil Diterbitkan</h2>
          <p className="text-gray-600 text-sm mb-6">{successMsg}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={async () => {
                setGenerating(true);
                setError(null);
                try {
                  const skData = (allSK.data || []).find(s => s.ID_SK === f.id_sk_dasar);
                  console.log('stResult:', JSON.stringify(stResult));
                  console.log('skData:', JSON.stringify(skData));
                  const panitiaData = (f.jenis === 'PL_PANITIA' || f.jenis === 'SIDANG_PANITIA')
                    ? (panitiaFetch.data || [])
                    : [];
                  await generateAndDownloadST(stResult, skData, panitiaData);
                } catch(e) {
                  console.error('Generate error:', e);
                  setError('Gagal generate dokumen: ' + e.message);
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              {generating && <Spinner size="sm" />}
              📄 Download ST (.docx)
            </button>
            <button onClick={resetForm} className="btn-secondary">Buat ST Baru</button>
          </div>
        </div>
      )}
    </div>
  );
}
