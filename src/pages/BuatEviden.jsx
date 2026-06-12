import React, { useState } from 'react';
import { PageHeader, Spinner } from '../components/UI';
import { generateEviden, downloadBlob } from '../utils/generateEviden';

export default function BuatEviden() {
  const [sourceFile, setSourceFile] = useState(null);
  const [prevFiles, setPrevFiles] = useState([]);
  const [tahap, setTahap] = useState('2');
  const [sudah, setSudah] = useState(true);
  const [potensi, setPotensi] = useState(false);
  const [anomaliText, setAnomaliText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const parseAnomali = (txt) =>
    txt.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);

  async function handleGenerate() {
    setError('');
    setStats(null);
    if (!sourceFile) { setError('File sumber (export KKP) belum dipilih.'); return; }
    if (!sudah && !potensi) { setError('Pilih minimal satu: Sudah K1 atau Potensi K1.'); return; }
    if (!String(tahap).trim()) { setError('Tahapan belum diisi.'); return; }

    setLoading(true);
    try {
      const { blob, filename, stats } = await generateEviden({
        sourceFile,
        tahap,
        sudah,
        potensi,
        anomali: parseAnomali(anomaliText),
        prevFiles,
      });
      downloadBlob(blob, filename);
      setStats({ ...stats, filename });
    } catch (e) {
      setError(e.message || 'Gagal membuat Eviden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Buat Eviden PTSL"
        subtitle="Generate Evidence PTSL per Tahapan dari export KKP"
      />

      <div className="card space-y-5">
        <div>
          <label className="label">File Sumber (export KKP .xlsx)</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setSourceFile(e.target.files[0] || null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-navy file:text-white file:font-medium hover:file:bg-navy-light file:cursor-pointer"
          />
          {sourceFile && <p className="text-xs text-gray-500 mt-1">{sourceFile.name}</p>}
        </div>

        <div>
          <label className="label">File Eviden Tahapan Sebelumnya (opsional, boleh lebih dari satu)</label>
          <input
            type="file"
            accept=".xlsx"
            multiple
            onChange={(e) => setPrevFiles(Array.from(e.target.files || []))}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-navy file:border file:border-navy file:font-medium hover:file:bg-gray-50 file:cursor-pointer"
          />
          {prevFiles.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {prevFiles.length} file: {prevFiles.map((f) => f.name).join(', ')}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Nomor Berkas yang sudah muncul di file ini akan dikeluarkan dari sheet TAHAP.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tahapan</label>
            <input
              type="text"
              value={tahap}
              onChange={(e) => setTahap(e.target.value)}
              placeholder="contoh: 2"
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">Nama file: Evidence_PTSL_Tahap_{String(tahap).trim().padStart(2, '0')}.xlsx</p>
          </div>

          <div>
            <label className="label">Kategori K1</label>
            <div className="flex flex-col gap-1 mt-1">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={sudah} onChange={(e) => setSudah(e.target.checked)} className="accent-navy" />
                Sudah K1 <span className="text-gray-400">(DI208 terisi)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={potensi} onChange={(e) => setPotensi(e.target.checked)} className="accent-navy" />
                Potensi K1 <span className="text-gray-400">(DI201B terisi)</span>
              </label>
            </div>
          </div>
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
          <p className="text-xs text-gray-400 mt-1">Berkas dibatalkan / PBT tidak valid. Dikeluarkan dari semua sheet.</p>
        </div>

        {error && (
          <div className="badge-error w-full justify-start py-2 px-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleGenerate} disabled={loading} className="btn-primary inline-flex items-center gap-2">
            {loading && <Spinner size="sm" />}
            {loading ? 'Memproses...' : 'Generate Eviden'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="card mt-5">
          <h2 className="text-sm font-bold text-navy mb-3">Hasil</h2>
          <p className="text-sm text-gray-600 mb-3">
            File <span className="font-semibold">{stats.filename}</span> berhasil diunduh.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Sheet SEMUA_K1" value={stats.semuaK1} />
            <Stat label={`Sheet TAHAP_${stats.tahap}`} value={stats.tahapRows} />
            <Stat label="Dikeluarkan (prev)" value={stats.excludedPrev} />
            <Stat label="Anomali" value={stats.anomali} />
            <Stat label="Duplikat dilewati" value={stats.duplikatDilewati} />
            <Stat label="Sheet sumber" value={stats.sumberSheet} />
          </div>
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
