// ============================================================
// API Client — Apps Script Web App
// CORS fix: semua request pakai GET (query params)
// Write ops: pakai GET dengan payload di-encode ke base64 JSON
// ============================================================

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwOoyg6ImdqMw6RAYcuYZkHPe3ybaqzuDBgsWDx-sffG75N99SCP2OzYSIxBnmhKBY8/exec';

// GET — untuk read handlers dan write handlers (CORS-safe)
export async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status === 'error') throw new Error(json.message);
  return json;
}

// Write via GET — payload di-encode supaya panjang URL tidak meledak
// Apps Script doGet bisa handle ini karena params string
export async function apiWrite(action, payload = {}) {
  // Encode payload sebagai satu param 'p' agar URL tetap pendek
  const encoded = encodeURIComponent(JSON.stringify({ action, ...payload }));
  const res = await fetch(`${APPS_SCRIPT_URL}?action=${action}&_p=${encoded}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status === 'error') throw new Error(json.message);
  return json;
}

// Untuk write handler yang butuh payload besar, pakai POST dengan no-cors workaround:
// Set Content-Type text/plain agar tidak trigger preflight
export async function apiPost(action, payload = {}) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status === 'error') throw new Error(json.message);
    return json;
  } catch (e) {
    // Fallback ke GET jika POST gagal
    return apiGet(action, { ...payload });
  }
}

// ---- Read handlers ----
export const getMasterPegawai   = (p = {}) => apiGet('getMasterPegawai', p);
export const getMasterDesa      = (p = {}) => apiGet('getMasterDesa', p);
export const getPetugasDesa     = (p = {}) => apiGet('getPetugasPuldadisDesa', p);
export const getMasterDasarSK   = (p = {}) => apiGet('getMasterDasarSK', p);
export const getPanitiaPerSK    = (p = {}) => apiGet('getPanitiaPerSK', p);
export const getKalendar        = (p = {}) => apiGet('getKalendar', p);
export const getMasterTahapan   = (p = {}) => apiGet('getMasterTahapan', p);
export const getDesaByTahapan   = (p = {}) => apiGet('getDesaByTahapan', p);

// ---- Write handlers (pakai GET untuk hindari CORS) ----
export const bookTanggalST  = (p) => apiGet('bookTanggalST', p);
export const bookNomorST    = (p) => apiGet('bookNomorST', p);
export const addPetugasDesa = (p) => apiGet('addPetugasPuldadisDesa', p);
export const doUploadSK     = (p) => apiGet('uploadSK', p);
