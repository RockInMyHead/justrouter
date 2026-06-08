const REF_STORAGE_KEY = 'velorix_ref';

export function captureReferralFromUrl(search = window.location.search) {
  const ref = new URLSearchParams(search).get('ref');
  if (!ref) return null;
  const normalized = String(ref).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return null;
  localStorage.setItem(REF_STORAGE_KEY, normalized);
  return normalized;
}

export function getStoredReferralCode() {
  return localStorage.getItem(REF_STORAGE_KEY) || '';
}

export function clearStoredReferralCode() {
  localStorage.removeItem(REF_STORAGE_KEY);
}
