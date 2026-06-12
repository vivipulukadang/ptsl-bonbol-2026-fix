import React from 'react';
import { useFetch } from '../hooks/useFetch';
import { getMasterDasarSK, getMasterPegawai, getMasterDesa, getMasterTahapan } from '../api/appsScript';
import { LoadingState, ErrorState, StatusBadge } from '../components/UI';

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`card border-l-4 ${accent ? 'border-gold' : 'border-navy'}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-navy mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-navy">{label}</span>
        <span className="text-sm font-bold text-gold">{value}/{max}</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}% dari target</p>
    </div>
  );
}

export default function Dashboard() {
  const sk       = useFetch(getMasterDasarSK, {});
  const pegawai  = useFetch(getMasterPegawai, { status: 'Aktif' });
  const desa     = useFetch(getMasterDesa, {});
  const tahapan  = useFetch(getMasterTahapan, {});

  if (sk.loading) return <LoadingState />;
  if (sk.error)   return <ErrorState message={sk.error} onRetry={sk.refetch} />;

  const skAktif = (sk.data || []).find(s => s.Status === 'Aktif');

  // Data progres — tahap 1 sudah selesai manual: 22 bidang
  const TARGET_TOTAL = 500;
  const SELESAI_TAHAP1 = 22;

  // Hitung tahapan yang sudah selesai dari master tahapan
  const tahapanSelesai = (tahapan.data || []).filter(t =>
    String(t['Status'] || '').toLowerCase().includes('selesai') ||
    String(t['Status'] || '').toLowerCase().includes('closed')
  ).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-navy">Dashboard PTSL Bone Bolango 2026</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ringkasan status kegiatan</p>
      </div>

      {/* Progress Tahapan Pencairan */}
      <div className="card mb-5">
        <h2 className="font-semibold text-navy mb-4">Progres Tahapan Pencairan</h2>
        <ProgressBar value={SELESAI_TAHAP1} max={TARGET_TOTAL} label="Total Bidang Siap Pencairan" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Tahap 1</p>
            <p className="text-2xl font-bold text-green-700">{SELESAI_TAHAP1}</p>
            <p className="text-xs text-green-600">bidang — Eviden selesai</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Sisa Target</p>
            <p className="text-2xl font-bold text-blue-700">{TARGET_TOTAL - SELESAI_TAHAP1}</p>
            <p className="text-xs text-blue-600">bidang lagi</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Target PTSL Bone Bolango 2026: {TARGET_TOTAL} bidang.
          Tahap 1 diselesaikan manual sebelum aplikasi ini dibuat.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Pegawai Aktif"    value={pegawai.data?.length ?? '—'} sub="Satgas PTSL 2026" />
        <StatCard label="Desa Terdaftar"   value={desa.data?.length ?? '—'}    sub="Di seluruh kecamatan" accent />
        <StatCard label="Versi SK"         value={sk.data?.length ?? '—'}      sub="SK PTSL 2026" />
        <StatCard label="SK Aktif"         value={skAktif ? '1' : '0'}         sub={skAktif?.Versi ?? 'Tidak ada'} accent />
      </div>

      {/* Riwayat SK */}
      <div className="card">
        <h2 className="font-semibold text-navy mb-4">Riwayat SK PTSL</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['ID','Nomor SK','Versi','Tahap','Status','Berlaku Mulai'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sk.data || []).map((s) => (
                <tr key={s.ID_SK} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs text-gray-400">{s.ID_SK}</td>
                  <td className="py-2 px-3 font-medium text-xs">{s.Nomor_SK}</td>
                  <td className="py-2 px-3 text-gray-600 text-xs">{s.Versi}</td>
                  <td className="py-2 px-3 text-gray-600 text-xs">{s.Tahap_Berlaku}</td>
                  <td className="py-2 px-3"><StatusBadge status={s.Status} /></td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{s.Tanggal_Berlaku_Mulai?.substring(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
