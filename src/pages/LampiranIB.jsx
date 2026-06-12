import React, { useState, useMemo } from 'react';
import { PageHeader, Spinner } from '../components/UI';
import { useFetch } from '../hooks/useFetch';
import { getMasterPegawai } from '../api/appsScript';
import { generateLampiranIB, listDesa, downloadBlob } from '../utils/generateLampiranIB';

export default function LampiranIB() {
  const [sourceFile, setSourceFile] = useState(null);
  const [desaAll, setDesaAll] = useState([]);
  const [desaSelected, setDesaSelected] = useState([]);
  const [petugasByDesa, setPetugasByDesa] = useState({}); // { DESA: [ID_Pegawai,...] }
  const [statusTanah, setStatusTanah] = useState('Tanah Negara');
  const [query, setQuery] = useState('');
  const [anomaliText, setAnomaliText] = useState('');
  const [loadingDesa, setLoadingDesa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);

  const allPegawai = useFetch(getMasterPegawai, { status: 'Aktif' });

  const parseAnomali = (txt) => txt.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);

  const pegawaiFiltered = useMemo(() => {
    const arr = allPegawai.data || [];
    if (!query.trim()) return arr;
    const q = query.toLowerCase();
    return arr.filter((p) =>
      String(p.Nama || '').toLowerCase().includes(q) ||
      String(p.NIP_Lisensi_SK || p.NIP || '').includes(query));
  }, [allPegawai.data, query]);

  const nameById = useMemo(() => {
    const m = {};
    (allPegawai.data || []).forEach((p) => { m[p.ID_Pegawai] = p.Nama; });
    return m;
  }, [allPegawai.data]);

  async function handleFile(file) {
    setSourceFile(file);
    setDesaAll([]); setDesaSelected([]); setPetugasByDesa({}); setHasil(null); setError('');
    if (!file) return;
    setLoadingDesa(true);
    try {
      const list = await listDesa(file);
      setDesaAll(list); setDesaSelected(list);
    } catch (e) {
      setError('Gagal membaca daftar desa: ' + (e.message || e));
    } finally { setLoadingDesa(false); }
  }

  const toggleDesa = (d) =>
    setDesaSelected((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  const togglePetugas = (desa, id) =>
    setPetugasByDesa((prev) => {
      const cur = prev[desa] || [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, [desa]: next };
    });

  async function handleGenerate() {
    setError(''); setHasil(null);
    if (!sourceFile) { setError('File Evidence belum dipilih.'); return; }
    if (desaSelected.length === 0) { setError('Pilih minimal satu desa.'); return; }
    const missing = desaSelected.filter((d) => !(petugasByDesa[d] && petugasByDesa[d].length));
    if (missing.length) { setError('Pilih petugas untuk desa: ' + missing.join(', ')); return; }

    const mapNames = {};
    desaSelected.forEach((d) => { mapNames[d] = (petugasByDesa[d] || []).map((id) => nameById[id]).filter(Boolean); });

    setLoading(true);
    try {
      const res = await generateLampiranIB({
        sourceFile,
        desaList: desaSelected,
        petugasByDesa: mapNames,
        statusTanah: statusTanah.trim() || 'Tanah Negara',
        anomali: parseAnomali(anomaliText),
      });
      downloadBlob(res.blob, res.filename);
      setHasil(res);
    } catch (e) {
      setError(e.message || 'Gagal membuat Lampiran I B.');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="Buat Lampiran I B"
        subtitle="Satu file Excel, satu sheet per desa, petugas bisa beda tiap desa" />

      <div className="card space-y-5">
        <div>
          <label className="label">File Evidence (.xlsx)</label>
          <input type="file" accept=".xlsx"
            onChange={(e) => handleFile(e.target.files[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-navy file:text-white file:font-medium hover:file:bg-navy-light file:cursor-pointer" />
          {sourceFile && <p className="text-xs text-gray-500 mt-1">{sourceFile.name}</p>}
        </div>

        <div>
          <label className="label">Desa (jadi sheet terpisah dalam satu file)</label>
          {loadingDesa ? (
            <p className="text-sm text-gray-500 flex items-center gap-2"><Spinner size="sm" /> Membaca daftar desa...</p>
          ) : desaAll.length === 0 ? (
            <p className="text-sm text-gray-400">Upload Evidence dulu.</p>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setDesaSelected(desaAll)} className="text-xs text-navy underline">Pilih semua</button>
                <button type="button" onClick={() => setDesaSelected([])} className="text-xs text-gray-500 underline">Kosongkan</button>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto divide-y">
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
              <p className="text-xs text-gray-400 mt-1">{desaSelected.length} desa dipilih.</p>
            </>
          )}
        </div>

        <div>
          <label className="label">Status Tanah</label>
          <input type="text" value={statusTanah} onChange={(e) => setStatusTanah(e.target.value)}
            placeholder="Tanah Negara" className="input-field" />
        </div>

        {desaSelected.length > 0 && (
          <div>
            <label className="label">Petugas Pengumpul Yuridis per Desa</label>
            {allPegawai.loading ? (
              <p className="text-sm text-gray-500 flex items-center gap-2"><Spinner size="sm" /> Memuat master pegawai...</p>
            ) : (
              <>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama / NIP (filter daftar di bawah)..." className="input-field mb-3" />
                <div className="space-y-3">
                  {desaSelected.map((desa) => {
                    const sel = petugasByDesa[desa] || [];
                    return (
                      <div key={desa} className="border border-gray-200 rounded-lg">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-semibold text-navy">{desa}</span>
                          <span className="text-xs text-gray-500">{sel.length} petugas</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y">
                          {pegawaiFiltered.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">Tidak ada pegawai.</p>}
                          {pegawaiFiltered.map((p) => {
                            const checked = sel.includes(p.ID_Pegawai);
                            return (
                              <label key={p.ID_Pegawai} className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${checked ? 'bg-navy/5' : ''}`}>
                                <input type="checkbox" checked={checked} onChange={() => togglePetugas(desa, p.ID_Pegawai)} />
                                <span className="text-gray-700">{p.Nama}
                                  {p.NIP_Lisensi_SK ? <span className="text-gray-400"> — {p.NIP_Lisensi_SK}</span> : null}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Tanda tangan pola W: sampai 4 petugas dalam satu baris, di atasnya tertulis "Petugas Pengumpul Yuridis PTSL 2026" per petugas.
                </p>
              </>
            )}
          </div>
        )}

        <div>
          <label className="label">Nomor Berkas Anomali (opsional)</label>
          <textarea value={anomaliText} onChange={(e) => setAnomaliText(e.target.value)}
            placeholder="Pisahkan dengan koma, spasi, atau baris baru. contoh: 685, 720, 731"
            rows={2} className="input-field" />
        </div>

        {error && <div className="badge-error w-full justify-start py-2 px-3 rounded-lg text-sm">{error}</div>}

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
            File <span className="font-semibold">{hasil.filename}</span> berhasil diunduh ({hasil.ringkasan.length} sheet).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desa (sheet)</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Jumlah bidang</th>
              </tr></thead>
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
