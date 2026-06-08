import { HOME_SITE_ITEMS } from '../shared/home-sites.js';

const SITE_PROMPTS = {
  kinetic:
    'Brutalist digital-first: #FF4D00 + чёрный + белый, Archivo Black + Space Mono, floating pill-nav, hero 16vw, skewed marquee, service list с hover-стрелкой, rotating scroll indicator SVG',
  drive:
    'Build a full-screen automotive hero section for a car dealership/marketplace website. Use Google Fonts: Inter (400, 500, 600) and Bebas Neue. Background: Full-viewport-height section (min 600px, max 965px) with a dark (#010101) fallback background. Looping, muted, autoplaying background video covering the entire section using object-cover. Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260213_051817_c7d8ccc6-bfaa-417c-8474-e5cefeea26b4.mp4. Add a subtle top gradient overlay (260px tall, from black/30 to transparent) and a matching bottom gradient overlay (260px tall, from black/30 to transparent) for text readability. Large decorative text: Centered horizontally, positioned about 15% from the top. Display the words "NEW ERA" as very large, bold, all-caps decorative typography spanning about 75% of the width (max 1073px). Fill the text with a vertical linear gradient: white at 83% opacity at the top, fading to white at 12% opacity at the bottom. This text should be behind the content but above the video. Top navbar (pinned to top, full width, horizontal padding 80px on desktop): Left: A small abstract pinwheel/spinner logo icon (28x28, white) next to the brand name "Logoipsum" in white, Inter font, ~24px. Hide the brand name on small screens. Center: Navigation links — "Home", "Shop", "Blog", "About Us", "Contact Us" — in Inter, light gray (#EEEFF2), with -0.32px letter-spacing. Hidden on screens below lg breakpoint. Right: A "Sign In" text link in white (#FBFBFD), and a white rounded (8px) "Cart" button (48px tall) with a small shopping cart icon (18x18, dark #272835) and "Cart" label in Inter medium, dark text (#272835). The button has a subtle box-shadow. Hide "Sign In" on small screens. Bottom CTA area (pinned to bottom of the section, same horizontal padding): Left side: A paragraph in Inter, white, ~20px/30px line-height, max-width 414px: "Choose from thousands of certified cars you can trust, transparently priced, because buying a car should feel exciting." Next to it, a white rounded (8px) "Shop Now" button (48px tall) with an arrow-right icon (18x18, dark), Inter medium text, dark text (#272835), with a light border (#EEEFF2) and subtle shadow. On small screens, stack the paragraph and button vertically. Right side: A large tagline in Bebas Neue, white, 64px on desktop (48px–60px on smaller screens), line-height 1, max-width 466px: "Find the perfect car that fits our journey". On large screens, the left and right sides sit in a single row aligned to the bottom. On smaller screens they stack vertically. Make the entire section fully responsive. Use Tailwind CSS and React.',
  design:
    'Hero Learnly: React + TS + Tailwind 3, Outfit, CSS-only анимации — accordion image cards (Pexels), search bar с gradient hover, mobile drawer, «Study. Train. Rise.»',
  wealth:
    'Scroll-driven hero 500vh: React 19 + GSAP ScrollTrigger/ScrollTo, hls.js Mux HLS scrub по скроллу, Dirtyline headline «Unleash The Full Power», glass panel About Us с marquee, pill-nav с liquid hover',
  slides:
    'Hero data-security SaaS securify: React + TS + Tailwind, Readex Pro, CloudFront video loop, pill navbar, giant staggered «protect / your / data», stat blocks +65k / +1.5b / +300k, чёрно-белая палитра',
  neon:
    'React 18 + Tailwind 3.4 + lucide-react: hero LinkFlow с boomerang canvas loop (CloudFront MP4, 30fps), Neue Haas Grotesk, pill-nav, mobile drawer, FluxEngine CTA — только CSS transitions',
  talvex:
    'Build HR dashboard "Talvex": React, TypeScript, Vite, Tailwind, Recharts, Lucide. Sofia Pro from onlinewebfonts. Palette #FFD85F / #303030 / #898989, white/60 cards backdrop-blur-3xl. Fixed SVG background #E3E5E6 + yellow blurred blob. Navbar pill Talvex + 8 nav links + Configs + Bell dot + avatar. Welcome row Kasven + segment bar + stats 78/56/203. Grid: profile photo Nora, Activity bar chart (Friday #FFD85F tooltip 5h23m), Focus timer ring 02:35, Induction 18% + tasks, Hardware accordion ThinkPad, Calendar August 2024 events. Responsive mobile stack / tablet 2-col / desktop 4-col grid lg:h-screen.',
  spark:
    'Create dark mode hero for AI website builder: motion + hls.js + lucide-react. Instrument Sans/Serif. Black #000 bg, Mux HLS video 60% opacity + black/60 blur overlay, blue/indigo decorative blurs. Navbar sunburst + Products/Customer Stories/Resources/Pricing + Book A Demo + Get Started. Hero: «Design at the speed of thought» serif, «Build Faster» 136px gradient to #b4c0ff, subheadline AI SEO copy, CTA Start Building Free white pill + blue arrow #3054ff, See Examples link. Motion fade/scale animations.',
  bloom:
    'Hero AI agent platform: чёрный фон, CloudFront video 120%, blur pill #000 77.5px, Manrope/Inter/Instrument Serif, navbar LOGOIPSUM, purple CTA #7b39fc, glassmorphic dashboard preview',
};

export function getSiteById(id) {
  const item = HOME_SITE_ITEMS.find((entry) => entry.id === id);
  const promptRu = SITE_PROMPTS[id];
  if (!item || !promptRu) return null;
  return { ...item, promptRu };
}
