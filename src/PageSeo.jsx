import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeo } from './seo.js';

export default function PageSeo() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    applySeo(pathname, search);
  }, [pathname, search]);

  return null;
}
