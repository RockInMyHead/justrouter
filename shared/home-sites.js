export const SITE_ORIGIN = 'https://justrouter.ru';

/** Path on main domain — always works without per-subdomain DNS */
export function siteUrl(id) {
  return `${SITE_ORIGIN}/demos/${id}/`;
}

export function siteLabel(id) {
  return `justrouter.ru/demos/${id}`;
}

export function getSiteById(id) {
  return HOME_SITE_ITEMS.find((item) => item.id === id) ?? null;
}

/** Цены шаблонов сайтов, ₽ (от 2000, 2 бесплатных) */
export const SITE_PRICE_MIN = 0;
export const SITE_PRICE_MAX = 5000;

export const HOME_SITE_ITEMS = [
  {
    id: 'spark',
    priceRub: 2000,
    preview: '/gallery/sites/spark.svg',
    alt: 'Build Faster — AI website builder hero с HLS video',
    titleRu: 'Build Faster',
    livePreview: true,
    previewBg: '#000000',
    stack: 'React · Motion · hls.js',
  },
  {
    id: 'talvex',
    priceRub: 3500,
    preview: '/gallery/sites/talvex.svg',
    alt: 'Talvex — HR dashboard с Recharts и glass cards',
    titleRu: 'Talvex',
    livePreview: true,
    previewBg: '#E3E5E6',
    stack: 'React · Recharts',
  },
  {
    id: 'drive',
    priceRub: 2000,
    preview: '/gallery/sites/drive.svg',
    alt: 'New Era — automotive hero с видео-фоном',
    titleRu: 'New Era',
    livePreview: true,
    previewBg: '#010101',
    stack: 'React · Tailwind',
  },
  {
    id: 'kinetic',
    priceRub: 2000,
    preview: '/gallery/sites/kinetic.svg',
    alt: 'Kinetic Orange — brutalist studio с marquees и skew',
    titleRu: 'Kinetic Orange',
    livePreview: true,
    previewBg: '#FF4D00',
    stack: 'React · Tailwind',
  },
  {
    id: 'wealth',
    priceRub: 5000,
    preview: '/gallery/sites/wealth.svg',
    alt: 'Scroll-driven hero с видео и glass panel',
    titleRu: 'Unleash Full Power',
    livePreview: true,
    previewBg: '#000000',
    stack: 'React · GSAP · hls.js',
  },
  {
    id: 'slides',
    priceRub: 0,
    preview: '/gallery/sites/slides.svg',
    alt: 'securify — fullscreen video hero с staggered typography',
    titleRu: 'securify',
    livePreview: true,
    previewBg: '#000000',
    stack: 'React · Tailwind',
  },
  {
    id: 'neon',
    priceRub: 0,
    preview: '/gallery/sites/neon.svg',
    alt: 'LinkFlow hero — boomerang video loop и зелёная типографика',
    titleRu: 'LinkFlow',
    livePreview: true,
    previewBg: '#d4e4d0',
    stack: 'React · Tailwind',
  },
  {
    id: 'design',
    priceRub: 2000,
    preview: '/gallery/sites/design.svg',
    alt: 'Learnly — hero с accordion-карточками и поиском',
    titleRu: 'Learnly',
    livePreview: true,
    previewBg: '#f4f4f2',
    stack: 'React · CSS',
  },
  {
    id: 'bloom',
    priceRub: 4000,
    preview: '/gallery/sites/bloom.svg',
    alt: 'AI Agent hero — видео-фон, blur pill, glass dashboard',
    titleRu: 'AI Agent',
    livePreview: true,
    previewBg: '#000000',
    stack: 'React · Tailwind',
  },
];
