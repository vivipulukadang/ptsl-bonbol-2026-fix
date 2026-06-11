# Aplikasi PTSL Bone Bolango 2026

Aplikasi web (React + Vite + Tailwind) untuk administrasi PTSL. Seluruh pembuatan
dokumen berjalan di browser (client side), tanpa server backend tambahan, sehingga
cukup di-deploy sebagai situs statis di Vercel.

## Yang sudah jalan begitu di-deploy
- **Buat Eviden PTSL**: upload export KKP, pilih Sudah K1 / Potensi K1, isi tahapan,
  lampirkan file Eviden tahapan sebelumnya (opsional), hasilkan file
  `Evidence_PTSL_Tahap_XX.xlsx` (dua sheet: SEMUA_K1 dan TAHAP_XX) langsung terunduh.
- **Buat ST**: template Word sudah tertanam di aplikasi, dokumen dibuat di browser.

Menu lain (Lampiran I B, Rekapitulasi, QC, dll.) masih bertanda "Segera Hadir" dan
akan diisi di tahap berikutnya. Aplikasi tetap aman di-deploy karena tidak ada menu
yang rusak.

---

## Cara deploy dari nol (untuk yang belum pernah pakai GitHub)

Yang dibutuhkan: akun email, browser. Tidak perlu terminal.

### Langkah 1. Buat akun GitHub
1. Buka https://github.com lalu klik **Sign up**.
2. Daftar dengan email, buat username dan password.

### Langkah 2. Buat repository baru
1. Setelah login, klik tanda **+** di kanan atas, pilih **New repository**.
2. Repository name: `ptsl-bonbol-2026`.
3. Pilih **Public** atau **Private** (keduanya bisa di-deploy ke Vercel).
4. JANGAN centang "Add a README". Klik **Create repository**.

### Langkah 3. Upload isi folder ini
1. Di halaman repository yang baru dibuat, klik link **uploading an existing file**
   (atau tombol **Add file -> Upload files**).
2. Buka folder `ptsl-bonbol-2026` hasil ekstrak di laptop. Pilih SEMUA isinya
   (file dan subfolder seperti `src`, `public`, `index.html`, `package.json`, dll.),
   lalu seret ke area upload di browser.
   - Penting: yang diupload adalah ISI folder, bukan folder `ptsl-bonbol-2026` itu
     sendiri. Setelah upload, `package.json` harus berada di level paling atas repo.
   - Folder `node_modules` tidak ada di paket ini dan memang tidak perlu diupload.
3. Di bagian bawah, klik **Commit changes**.

### Langkah 4. Hubungkan ke Vercel dan deploy
1. Buka https://vercel.com lalu **Sign up** menggunakan akun GitHub (Continue with GitHub).
2. Klik **Add New... -> Project**.
3. Pilih repository `ptsl-bonbol-2026`, klik **Import**.
4. Vercel otomatis mendeteksi Vite. Biarkan pengaturan default:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Klik **Deploy**. Tunggu sampai selesai, lalu buka link `*.vercel.app` yang diberikan.

### Update aplikasi di kemudian hari
- Edit file langsung di GitHub (web editor) atau upload ulang file yang berubah,
  lalu **Commit changes**. Vercel otomatis build ulang dan memperbarui situs.

---

## Menjalankan di laptop (opsional, jika ingin coba lokal)
```
npm install
npm run dev
```
Buka alamat localhost yang muncul (biasanya http://localhost:5173).

## Catatan teknis
- Stack: React 19, Vite, Tailwind CSS.
- Eviden memakai `xlsx-js-style` untuk menulis Excel ber-format (header kuning,
  Calibri, border, lebar kolom, NIK sebagai teks, DI310 format mm/yyyy).
- `vercel.json` sudah berisi rewrite SPA agar refresh halaman tidak error.
