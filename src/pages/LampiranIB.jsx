import React, { useState } from 'react';
import { PageHeader, Spinner } from '../components/UI';
import { generateLampiranIB, listDesa, downloadBlob } from '../utils/generateLampiranIB';

export default function LampiranIB() {
  const [sourceFile, setSourceFile] = useState(null);
  const [desaList, setDesaList] = useState([]);
  const [desaPilihan, setDesaPilihan] = useState('__ALL__');
  const [statusTanah, setStatusTanah] = useState('Tanah Negara');
  const [petugasText, setPetugasText] = useState('');
  const [anomaliText, setAnomaliText] = useState('');
  const [loadingDesa, setLoadingDesa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);

  const parseLines = (txt) =>
    txt.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const parseAnomali = (txt) =>
    txt.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);

  async function handleFile(file) {
    setSourceFile(file);
    setDesaList([]);
    setDesaPilihan('__ALL__');
    setHasil(null);
    setError('');
    if (!file) return;
    setLoadingDesa(true);
    try {
      const list = await listDesa(file);
      setDesaList(list);
    } catch (e) {
      setError('Gagal membaca daftar desa: ' + (e.message || e));
    } finally {
      setLoadingDesa(false);
    }
  }

  async function handleGenerate() {
    setError('');
    setHasil(null);
    if (!sourceFile) { setError('File Evidence belum dipilih.'); return; }

    setLoading(true);
    try {
      const res = await generateLampiranIB({
        sourceFile,
        desaPilihan,
        petugas: parseLines(petugasText),
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
        subtitle="Generate Lampiran I B per desa dari file Evidence PTSL"
      />

      <div className="card space-y-5">
        <div>
          <label className="label">File Evidence (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFile(e.target.files[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-navy file:text-white file:font-medium hover:file:bg-navy-light file:cursor-pointer"
          />
          {sourceFile && <p className="text-xs text-gray-500 mt-1">{sourceFile.name}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Gunakan file Evidence hasil menu Buat Eviden (sheet TAHAP atau SEMUA_K1).
          </p>
        </div>

        <div>
          <label className="label">Desa</label>
          {loadingDesa ? (
            <p className="text-sm text-gray-500 flex items-center gap-2"><Spinner size="sm" /> Membaca daftar desa...</p>
          ) : (
            <select
              value={desaPilihan}
              onChange={(e) => setDesaPilihan(e.target.value)}
              disabled={!sourceFile}
              className="input-field"
            >
              <option value="__ALL__">Semua desa (unduh sebagai ZIP)</option>
              {desaList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Satu desa menghasilkan satu file. "Semua desa" menghasilkan satu ZIP berisi file per desa.
          </p>
        </div>

        <div>
          <label className="label">Status Tanah</label>
          <input
            type="text"
            value={statusTanah}
            onChange={(e) => setStatusTanah(e.target.value)}
            placeholder="Tanah Negara"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Petugas (satu nama per baris)</label>
          <textarea
            value={petugasText}
            onChange={(e) => setPetugasText(e.target.value)}
            placeholder={'contoh:\nMoh. Septian Ahmad\nSilva R. Uno\nRamlah Taib'}
            rows={4}
            className="input-field"
          />
          <p className="text-xs text-gray-400 mt-1">
            Tanda tangan disusun pola W (maksimal 3 per baris, baris bawah tidak lebih banyak dari baris atas).
          </p>
        </div>

        <div>
          <label className="label">Nomor Berkas Anomali (opsional)</label>
          <textarea
            value={anomaliText}
            onChange={(e) => setAnomaliText(e.target.value)}
            placeholder="Pisahkan dengan koma, spasi, atau baris baru. contoh: 685, 720, 731"
            rows={2}
            className="input-field"
          />
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
            File <span className="font-semibold">{hasil.filename}</span> berhasil diunduh.
          </p>
          {hasil.mode === 'single' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Stat label="Desa" value={hasil.desa} />
              <Stat label="Jumlah bidang" value={hasil.jumlah} />
            </div>
          )}
          {hasil.mode === 'zip' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desa</th>
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
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-semibold text-navy break-words">{value}</p>
    </div>
  );
}
