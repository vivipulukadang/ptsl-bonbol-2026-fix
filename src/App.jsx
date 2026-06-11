import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BuatST from './pages/BuatST';
import MasterPegawai from './pages/MasterPegawai';
import BuatEviden from './pages/BuatEviden';
import LampiranIB from './pages/LampiranIB';
import RekapST from './pages/RekapST';
import BuatBA from './pages/BuatBA';
import {
  RekapTahapanPage, UploadPengumumanPage, UploadDashboardPage,
  PeriksaRiwayatPage, PeriksaKelengkapanPage,
  UploadSKPage, KalenderPage, AuditLogPage,
} from './pages/Placeholders';

const PAGES = {
  'dashboard':          (nav) => <Dashboard onNavigate={nav} />,
  'eviden-ptsl':        ()    => <BuatEviden />,
  'rekap-st':           (nav) => <RekapST onNavigate={nav} />,
  'buat-st':            ()    => <BuatST />,
  'lampiran-ib':        ()    => <LampiranIB />,
  'buat-ba':            ()    => <BuatBA />,
  'rekap-tahapan':      ()    => <RekapTahapanPage />,
  'upload-pengumuman':  ()    => <UploadPengumumanPage />,
  'upload-dashboard':   ()    => <UploadDashboardPage />,
  'periksa-riwayat':    ()    => <PeriksaRiwayatPage />,
  'periksa-kelengkapan':()    => <PeriksaKelengkapanPage />,
  'upload-sk':          ()    => <UploadSKPage />,
  'master-pegawai':     ()    => <MasterPegawai />,
  'kalender':           ()    => <KalenderPage />,
  'audit-log':          ()    => <AuditLogPage />,
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const navigate = (page) => setActivePage(page);
  const renderPage = PAGES[activePage] || PAGES.dashboard;

  return (
    <div className="flex min-h-screen font-sans">
      <Sidebar active={activePage} onNavigate={navigate} />
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto">
          {renderPage(navigate)}
        </div>
      </main>
    </div>
  );
}
