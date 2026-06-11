import React, { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getMasterPegawai } from '../api/appsScript';
import { LoadingState, ErrorState, EmptyState, StatusBadge, PageHeader } from '../components/UI';

export default function MasterPegawai() {
  const [filterStatus, setFilterStatus] = useState('');
  const { data, loading, error, refetch } = useFetch(
    getMasterPegawai,
    filterStatus ? { status: filterStatus } : {},
    [filterStatus]
  );

  return (
    <div>
      <PageHeader title="Master Pegawai" subtitle="Daftar pegawai Satgas PTSL 2026" />

      <div className="flex gap-3 mb-4">
        {['', 'Aktif', 'Mutasi'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${filterStatus === s ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-300 hover:border-navy'}`}
          >
            {s || 'Semua'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {data && data.length === 0 && <EmptyState message="Tidak ada pegawai." />}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ID</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Nama</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">NIP</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Pangkat</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Jabatan Tim</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Satgas</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.ID_Pegawai} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-400">{p.ID_Pegawai}</td>
                    <td className="py-2 px-3 font-medium">{p.Nama}</td>
                    <td className="py-2 px-3 text-gray-500 text-xs font-mono">{p.NIP_Lisensi_SK}</td>
                    <td className="py-2 px-3 text-gray-600 text-xs">{p.Pangkat_Golongan}</td>
                    <td className="py-2 px-3 text-gray-600 text-xs">{p.Jabatan_dalam_Tim}</td>
                    <td className="py-2 px-3 text-gray-500 text-xs">{p.Satgas}</td>
                    <td className="py-2 px-3"><StatusBadge status={p.Status_Aktif} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={7} className="py-2 px-3 text-xs text-gray-500 font-medium">
                    Total: {data.length} pegawai
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
