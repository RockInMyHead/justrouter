export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('velorix_session') || 'null');
  } catch {
    localStorage.removeItem('velorix_session');
    return null;
  }
}

export function getToken() {
  return localStorage.getItem('velorix_token');
}

export function clearAuth() {
  localStorage.removeItem('velorix_token');
  localStorage.removeItem('velorix_session');
}

export function saveAuth(token, user) {
  localStorage.setItem('velorix_token', token);
  localStorage.setItem('velorix_session', JSON.stringify(user));
}
