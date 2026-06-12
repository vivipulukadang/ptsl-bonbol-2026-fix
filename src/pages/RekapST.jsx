import React, { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getMasterDasarSK } from '../api/appsScript';
import { LoadingState, ErrorState, EmptyState, StatusBadge, PageHeader } from '../components/UI';

// Rekap ST membaca dari Apps Script — untuk sekarang tampilkan daftar SK
// dan placeholder untuk ST list yang akan ditambah handler getST di Phase 3
export default function RekapST({ onNavigate }) {
  const sk = useFetch(getMasterDasarSK, {});

  return (
    <div>
      <PageHeader
        title="Rekap ST"
        subtitle="Daftar Surat Tugas PTSL 2026"
        action={
          <button onClick={() => onNavigate('buat-st')} className="btn-primary text-sm">
            + Buat ST Baru
          </button>
        }
      />

      {/* Info panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-800">
        <strong>Catatan:</strong> Handler <code>getRekapST</code> akan ditambahkan di Phase 3.
        Tabel ini akan menampilkan seluruh ST dari sheet <code>10_ST</code> beserta status, desa, dan petugas.
      </div>

      {/* SK summary sebagai placeholder */}
      <div className="card">
        <h2 className="font-semibold text-navy mb-4">SK Dasar per Tahapan</h2>
        {sk.loading && <LoadingState />}
        {sk.error && <ErrorState message={sk.error} onRetry={sk.refetch} />}
        {sk.data && sk.data.length === 0 && <EmptyState message="Tidak ada SK terdaftar." />}
        {sk.data && sk.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ID</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Nomor SK</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Versi</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tahap</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {sk.data.map((s) => (
                  <tr key={s.ID_SK} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-400">{s.ID_SK}</td>
                    <td className="py-2 px-3 font-medium">{s.Nomor_SK}</td>
                    <td className="py-2 px-3 text-gray-600">{s.Versi}</td>
                    <td className="py-2 px-3 text-gray-600">{s.Tahap_Berlaku}</td>
                    <td className="py-2 px-3"><StatusBadge status={s.Status} /></td>
                    <td className="py-2 px-3 text-gray-400 text-xs max-w-xs truncate">{s.Catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
