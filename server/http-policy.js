export function isNoIndexPath(pathname) {
  return pathname.startsWith('/api/')
    || pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname === '/account'
    || pathname.startsWith('/account/');
}
