import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { HOME_GALLERY_ITEMS } from '../shared/home-gallery.js';

const pageBg = 'var(--page-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

function GalleryCard({ item, onOpen }) {
  return (
    <article className="group relative mb-4 break-inside-avoid rounded-2xl overflow-hidden cursor-pointer">
      <img
        src={item.src}
        alt={item.alt}
        loading="lazy"
        decoding="async"
        className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]"
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
        aria-hidden
      />

      <button
        type="button"
        onClick={() => onOpen(item)}
        className="absolute inset-x-0 bottom-0 p-4 text-left translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 ease-out"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      >
        <p className="text-emerald-400 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
          <Sparkles size={12} />
          {item.modelName}
        </p>
        <p className="text-white/85 text-xs leading-relaxed line-clamp-3">{item.promptRu}</p>
        <span className="inline-flex items-center gap-1 mt-2 text-white/50 text-[11px] group-hover:text-white/70 transition-colors">
          Открыть и редактировать
          <ArrowRight size={12} />
        </span>
      </button>
    </article>
  );
}

export default function HomeGallerySection() {
  const navigate = useNavigate();

  const handleOpen = (item) => {
    navigate('/models/image', {
      state: {
        openModelId: item.modelId,
        initialPrompt: item.promptRu,
        initialReferenceImage: item.src,
        galleryModelName: item.modelName,
      },
    });
  };

  return (
    <section id="как-работает" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: pageBg }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ backgroundColor: softPanelBg, color: 'var(--milk-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Sparkles size={12} />
            Галерея
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            Сгенерировано нейросетями
          </h2>
          <p className="mt-4 text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Наведите на работу — увидите модель и промпт. Нажмите, чтобы открыть генератор и переделать изображение под себя.
          </p>
        </div>

        <div className="columns-2 md:columns-3 lg:columns-3 gap-4">
          {HOME_GALLERY_ITEMS.map((item) => (
            <GalleryCard key={item.id} item={item} onOpen={handleOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
