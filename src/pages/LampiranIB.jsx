import React, { useState, useMemo } from 'react';
import { PageHeader, Spinner } from '../components/UI';
import { useFetch } from '../hooks/useFetch';
import { getMasterPegawai } from '../api/appsScript';
import { generateLampiranIB, listDesa, downloadBlob } from '../utils/generateLampiranIB';

export default function LampiranIB() {
  const [sourceFile, setSourceFile] = useState(null);
  const [desaAll, setDesaAll] = useState([]);          // semua desa di Evidence
  const [desaSelected, setDesaSelected] = useState([]); // desa yang diikutkan (jadi sheet)
  const [statusTanah, setStatusTanah] = useState('Tanah Negara');
  const [petugasIds, setPetugasIds] = useState([]);     // ID_Pegawai terpilih
  const [petugasQuery, setPetugasQuery] = useState('');
  const [anomaliText, setAnomaliText] = useState('');
  const [loadingDesa, setLoadingDesa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);

  const allPegawai = useFetch(getMasterPegawai, { status: 'Aktif' });

  const parseAnomali = (txt) =>
    txt.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);

  const pegawaiList = useMemo(() => {
    const arr = allPegawai.data || [];
    if (!petugasQuery.trim()) return arr;
    const q = petugasQuery.toLowerCase();
    return arr.filter((p) =>
      String(p.Nama || '').toLowerCase().includes(q) ||
      String(p.NIP_Lisensi_SK || p.NIP || '').includes(petugasQuery)
    );
  }, [allPegawai.data, petugasQuery]);

  const petugasNames = useMemo(() => {
    const arr = allPegawai.data || [];
    return petugasIds
      .map((id) => arr.find((p) => p.ID_Pegawai === id))
      .filter(Boolean)
      .map((p) => p.Nama);
  }, [petugasIds, allPegawai.data]);

  async function handleFile(file) {
    setSourceFile(file);
    setDesaAll([]); setDesaSelected([]); setHasil(null); setError('');
    if (!file) return;
    setLoadingDesa(true);
    try {
      const list = await listDesa(file);
      setDesaAll(list);
      setDesaSelected(list); // default: semua desa diikutkan
    } catch (e) {
      setError('Gagal membaca daftar desa: ' + (e.message || e));
    } finally {
      setLoadingDesa(false);
    }
  }

  const toggleDesa = (d) =>
    setDesaSelected((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  const togglePetugas = (id) =>
    setPetugasIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  async function handleGenerate() {
    setError(''); setHasil(null);
    if (!sourceFile) { setError('File Evidence belum dipilih.'); return; }
    if (desaSelected.length === 0) { setError('Pilih minimal satu desa.'); return; }
    if (petugasNames.length === 0) { setError('Pilih minimal satu petugas.'); return; }

    setLoading(true);
    try {
      const res = await generateLampiranIB({
        sourceFile,
        desaList: desaSelected,
        petugas: petugasNames,
        statusTanah: statusTanah.trim() || 'Tanah Negara',
        anomali: parseAnomali(anomaliText),
      });
      downloadBlob(res.blob, res.filename);
      setHasil(res);
    } catch (e) {
      setError(e.message || 'Gagal membuat Lampiran I B.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Buat Lampiran I B"
        subtitle="Satu file Excel, satu sheet per desa, dari file Evidence PTSL"
      />

      <div className="card space-y-5">
        <div>
          <label className="label">File Evidence (.xlsx)</label>
          <input type="file" accept=".xlsx"
            onChange={(e) => handleFile(e.target.files[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-navy file:text-white file:font-medium hover:file:bg-navy-light file:cursor-pointer" />
          {sourceFile && <p className="text-xs text-gray-500 mt-1">{sourceFile.name}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Gunakan file Evidence hasil menu Buat Eviden (sheet TAHAP atau SEMUA_K1).
          </p>
        </div>

        <div>
          <label className="label">Desa (jadi sheet terpisah dalam satu file)</label>
          {loadingDesa ? (
            <p className="text-sm text-gray-500 flex items-center gap-2"><Spinner size="sm" /> Membaca daftar desa...</p>
          ) : desaAll.length === 0 ? (
            <p className="text-sm text-gray-400">Upload Evidence dulu untuk melihat daftar desa.</p>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setDesaSelected(desaAll)} className="text-xs text-navy underline">Pilih semua</button>
                <button type="button" onClick={() => setDesaSelected([])} className="text-xs text-gray-500 underline">Kosongkan</button>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y">
                {desaAll.map((d) => {
                  const checked = desaSelected.includes(d);
                  return (
                    <label key={d} className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${checked ? 'bg-navy/5' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleDesa(d)} />
                      <span className="text-gray-700">{d}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">{desaSelected.length} desa dipilih, masing-masing jadi satu sheet.</p>
            </>
          )}
        </div>

        <div>
          <label className="label">Status Tanah</label>
          <input type="text" value={statusTanah}
            onChange={(e) => setStatusTanah(e.target.value)}
            placeholder="Tanah Negara" className="input-field" />
        </div>

        <div>
          <label className="label">Petugas Pengumpul Yuridis (pilih dari master pegawai)</label>
          {allPegawai.loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2"><Spinner size="sm" /> Memuat master pegawai...</p>
          ) : allPegawai.error ? (
            <p className="text-xs text-red-500">{allPegawai.error}</p>
          ) : (
            <>
              <input type="text" value={petugasQuery} onChange={(e) => setPetugasQuery(e.target.value)}
                placeholder="Cari nama / NIP..." className="input-field mb-2" />
              <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y">
                {pegawaiList.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">Tidak ada pegawai.</p>}
                {pegawaiList.map((p) => {
                  const checked = petugasIds.includes(p.ID_Pegawai);
                  return (
                    <label key={p.ID_Pegawai} className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${checked ? 'bg-navy/5' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => togglePetugas(p.ID_Pegawai)} />
                      <span className="text-gray-700">{p.Nama}
                        {p.NIP_Lisensi_SK ? <span className="text-gray-400"> — {p.NIP_Lisensi_SK}</span> : null}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {petugasIds.length} petugas dipilih. Tanda tangan disusun pola W (maksimal 3 per baris, baris bawah tidak lebih banyak dari baris atas).
              </p>
            </>
          )}
        </div>

        <div>
          <label className="label">Nomor Berkas Anomali (opsional)</label>
          <textarea value={anomaliText} onChange={(e) => setAnomaliText(e.target.value)}
            placeholder="Pisahkan dengan koma, spasi, atau baris baru. contoh: 685, 720, 731"
            rows={2} className="input-field" />
        </div>

        {error && (
          <div className="badge-error w-full justify-start py-2 px-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleGenerate} disabled={loading || !sourceFile} className="btn-primary inline-flex items-center gap-2">
            {loading && <Spinner size="sm" />}
            {loading ? 'Memproses...' : 'Generate Lampiran I B'}
          </button>
        </div>
      </div>

      {hasil && (
        <div className="card mt-5">
          <h2 className="text-sm font-bold text-navy mb-3">Hasil</h2>
          <p className="text-sm text-gray-600 mb-3">
            File <span className="font-semibold">{hasil.filename}</span> berhasil diunduh
            ({hasil.ringkasan.length} sheet).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desa (sheet)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Jumlah bidang</th>
                </tr>
              </thead>
              <tbody>
                {hasil.ringkasan.map((r) => (
                  <tr key={r.desa} className="border-b border-gray-50">
                    <td className="py-2 px-3">{r.desa}</td>
                    <td className="py-2 px-3">{r.jumlah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
