import React, { useState } from 'react';

const NAV = [
  {
    group: 'Satgas Administrasi',
    items: [
      { id: 'dashboard',        label: 'Dashboard',                    icon: '▦' },
      { id: 'eviden-ptsl',      label: 'Eviden PTSL',                  icon: '📊' },
      { id: 'rekap-st',         label: 'Rekap ST',                     icon: '📋' },
      { id: 'buat-st',          label: 'Buat ST',                      icon: '✏️' },
      { id: 'lampiran-ib',      label: 'Lampiran I B',                 icon: '📄' },
      { id: 'buat-ba',          label: 'Buat BA',                      icon: '📝' },
      { id: 'rekap-tahapan',    label: 'Rekapitulasi Tahapan',         icon: '📈' },
      { id: 'upload-pengumuman',label: 'Upload Pengumuman',            icon: '📌' },
      { id: 'upload-dashboard', label: 'Upload Dashboard PTSL',        icon: '🖼️' },
    ],
  },
  {
    group: 'Satgas Yuridis',
    items: [
      { id: 'periksa-riwayat',     label: 'Periksa Riwayat Tanah',   icon: '🔍' },
      { id: 'periksa-kelengkapan', label: 'QC Kelengkapan Berkas',    icon: '✅' },
    ],
  },
  {
    group: 'Konfigurasi',
    items: [
      { id: 'upload-sk',      label: 'Upload SK PTSL',     icon: '📤' },
      { id: 'master-pegawai', label: 'Master Pegawai',     icon: '👤' },
      { id: 'kalender',       label: 'Kalender Kerja',     icon: '📅' },
      { id: 'audit-log',      label: 'Audit Log',          icon: '🗂️' },
    ],
  },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="w-60 min-h-screen bg-navy flex flex-col flex-shrink-0">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            BPN
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Aplikasi PTSL</p>
            <p className="text-blue-300 text-xs">Bone Bolango 2026</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map((section) => (
          <div key={section.group} className="mb-4">
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest px-2 mb-1.5">
              {section.group}
            </p>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium mb-0.5 transition-colors text-left
                  ${active === item.id
                    ? 'bg-gold text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="text-sm w-4 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-blue-400 text-xs">Kantah Kab. Bone Bolango</p>
      </div>
    </aside>
  );
}
