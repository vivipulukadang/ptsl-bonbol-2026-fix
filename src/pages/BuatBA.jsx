import React, { useState } from 'react';
import { PageHeader, Spinner } from '../components/UI';
import { generateAndDownloadBA } from '../utils/generateBA';

const JENIS_OPTS = [
  { value: 'PULDADIS', label: 'Pengumpulan Data Yuridis (Puldadis)' },
  { value: 'PANITIA', label: 'Pemeriksaan Lapang dan Sidang Panitia Ajudikasi' },
];

export default function BuatBA() {
  const [jenis, setJenis] = useState('PULDADIS');
  const [nomor, setNomor] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jumlahBidang, setJumlahBidang] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);

  async function handleGenerate() {
    setError('');
    setHasil(null);
    if (!nomor.trim()) { setError('Nomor BA belum diisi.'); return; }
    if (!tanggal) { setError('Tanggal BA belum dipilih.'); return; }
    if (!String(jumlahBidang).trim()) { setError('Jumlah bidang belum diisi.'); return; }

    setLoading(true);
    try {
      const res = await generateAndDownloadBA({
        jenis,
        No_BA: nomor.trim(),
        Tanggal_BA: tanggal,
        jumlahBidang: String(jumlahBidang).trim(),
      });
      setHasil(res);
    } catch (e) {
      setError(e.message || 'Gagal membuat BA.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Buat BA"
        subtitle="Generate Berita Acara Penyelesaian Pekerjaan PTSL 2026"
      />

      <div className="card space-y-5">
        <div>
          <label className="label">Jenis BA</label>
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="input-field"
          >
            {JENIS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nomor BA</label>
            <input
              type="text"
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              placeholder="contoh: 12/BA-75.03.HP/V/2026"
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Tanggal BA</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label">Jumlah Bidang</label>
          <input
            type="number"
            min="0"
            value={jumlahBidang}
            onChange={(e) => setJumlahBidang(e.target.value)}
            placeholder="contoh: 120"
            className="input-field"
          />
          <p className="text-xs text-gray-400 mt-1">
            Mengisi bagian "sejumlah ... bidang" pada BA.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          Penandatangan (Ketua Panitia Ajudikasi) dan lampiran mengikuti format template asli.
          Aplikasi hanya mengisi Nomor, hari/tanggal, dan jumlah bidang.
        </div>

        {error && (
          <div className="badge-error w-full justify-start py-2 px-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleGenerate} disabled={loading} className="btn-primary inline-flex items-center gap-2">
            {loading && <Spinner size="sm" />}
            {loading ? 'Memproses...' : 'Generate BA'}
          </button>
        </div>
      </div>

      {hasil && (
        <div className="card mt-5">
          <h2 className="text-sm font-bold text-navy mb-3">Hasil</h2>
          <p className="text-sm text-gray-600">
            File <span className="font-semibold">{hasil.filename}</span> berhasil diunduh.
          </p>
        </div>
      )}
    </div>
  );
}
