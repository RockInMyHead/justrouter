export function getAdminToken() {
  return localStorage.getItem('velorix_admin_token');
}

export function clearAdminToken() {
  localStorage.removeItem('velorix_admin_token');
}

export function setAdminToken(token) {
  localStorage.setItem('velorix_admin_token', token);
}

export function getAdminHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
  };
}

export function adminFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...getAdminHeaders(), ...(options.headers || {}) },
  }).then(function(res) {
    if (res.status === 401 || res.status === 403) {
      clearAdminToken();
      window.dispatchEvent(new CustomEvent('velorix:admin-auth-expired'));
    }
    return res;
  });
}
