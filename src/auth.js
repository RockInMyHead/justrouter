export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('velorix_session') || 'null');
  } catch {
    localStorage.removeItem('velorix_session');
    return null;
  }
}

export function getToken() {
  try {
    return localStorage.getItem('velorix_token');
  } catch {
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem('velorix_token');
    localStorage.removeItem('velorix_session');
  } catch {}
}

export function saveAuth(token, user) {
  try {
    localStorage.setItem('velorix_token', token);
    localStorage.setItem('velorix_session', JSON.stringify(user));
  } catch {}
}
