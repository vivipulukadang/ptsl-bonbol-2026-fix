import React from 'react';
import { PageHeader } from '../components/UI';

function ComingSoon({ title, subtitle, icon = '🔧', notes = [] }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="card flex flex-col items-center justify-center py-12 gap-3">
        <div className="text-5xl">{icon}</div>
        <p className="text-navy font-semibold">Segera Hadir</p>
        <p className="text-sm text-gray-400 text-center max-w-sm">
          Modul ini akan diimplementasikan di phase berikutnya.
        </p>
        {notes.length > 0 && (
          <ul className="mt-2 text-xs text-gray-400 text-left space-y-1">
            {notes.map((n, i) => <li key={i}>• {n}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

export function EvidenPTSLPage() {
  return <ComingSoon title="Eviden PTSL" subtitle="Generate file Evidence PTSL per Tahapan" icon="📊"
    notes={['Upload file KKP export (.xlsx)', 'Filter Sudah K1 / Potensi K1', 'Hapus 39 kolom sesuai aturan', 'Kategorisasi sheet per bulan']} />;
}

export function RekapSTPage({ onNavigate }) {
  return <ComingSoon title="Rekap ST" subtitle="Ringkasan seluruh Surat Tugas PTSL 2026" icon="📋"
    notes={['Tabel ST dari sheet 10_ST', 'Filter per tahapan, jenis, status']} />;
}

export function LampiranIBPage() {
  return <ComingSoon title="Lampiran I B" subtitle="Generate Lampiran I B per Desa" icon="📄"
    notes={['Satu file per desa', 'W-Layout tanda tangan otomatis (max 3 per baris)', 'Upload Evidence PTSL untuk auto-fill bidang']} />;
}

export function BuatBAPage() {
  return <ComingSoon title="Buat BA" subtitle="Generate BA Penyelesaian Pekerjaan Puldadis & Panitia" icon="📝"
    notes={['BA Puldadis: tutup ST Puldadis', 'BA Panitia: tutup pasangan ST PL + Sidang', '7 penandatangan untuk BA Panitia']} />;
}

export function RekapTahapanPage() {
  return <ComingSoon title="Rekapitulasi Tahapan" subtitle="Generate Rekapitulasi per Tahapan PTSL" icon="📈"
    notes={['Sheet 1: Detail per ST', 'Sheet 2: Agregat per Desa', 'Baris Total wajib ada']} />;
}

export function UploadPengumumanPage() {
  return <ComingSoon title="Upload Pengumuman" subtitle="Upload bukti cetak pengumuman PTSL per desa" icon="📌"
    notes={['PDF/JPG/PNG max 10MB', 'Validasi masa pengumuman ≥ 14 hari', 'Arsip otomatis ke Google Drive']} />;
}

export function UploadDashboardPage() {
  return <ComingSoon title="Upload Dashboard PTSL" subtitle="Upload screenshot dashboard PTSL" icon="🖼️"
    notes={['Sumber: KKP / Dashboard Pusat', 'Arsip ke Google Drive']} />;
}

export function PeriksaRiwayatPage() {
  return <ComingSoon title="Periksa Riwayat Tanah" subtitle="Analisis riwayat perolehan dan kepemilikan tanah dari berkas PDF" icon="🔍"
    notes={['OCR berkas PTSL (multi-file)', 'Ekstrak Riwayat Tanah ke list bernomor', 'Flag HIJAU/KUNING/MERAH per berkas', 'Download PDF + Excel hasil analisis']} />;
}

export function PeriksaKelengkapanPage() {
  return <ComingSoon title="QC Kelengkapan Berkas" subtitle="Checklist 12 item kelengkapan berkas PTSL" icon="✅"
    notes={['12 item ceklis per berkas', 'Status: ✓ Lengkap / ✗ Tidak ada / ? Perlu klarifikasi', 'Ekspor ceklis massal per desa']} />;
}

export function UploadSKPage() {
  return <ComingSoon title="Upload SK PTSL" subtitle="Daftarkan SK PTSL baru dan update susunan panitia" icon="📤"
    notes={['OCR/parse PDF SK', 'Auto-update 05_MASTER_DASAR_SK', 'Auto-salin panitia dari SK lama', 'Tandai pegawai mutasi']} />;
}

export function KalenderPage() {
  return <ComingSoon title="Kalender Kerja" subtitle="Hari kerja dan hari libur nasional 2026" icon="📅" />;
}

export function AuditLogPage() {
  return <ComingSoon title="Audit Log" subtitle="Riwayat seluruh perubahan data" icon="🗂️"
    notes={['Read-only', 'Filter per aksi, per tanggal', 'Dari sheet 99_AUDIT_LOG']} />;
}
