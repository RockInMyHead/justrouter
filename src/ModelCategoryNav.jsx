import { useNavigate, useLocation } from 'react-router-dom';

export const MODEL_NAV_ITEMS = [
  { label: 'Текст', category: 'text' },
  { label: 'Аудио', category: 'audio' },
  { label: 'Фото', category: 'image' },
  { label: 'Видео', category: 'video' },
];

export default function ModelCategoryNav({
  activeCategory,
  onSelect,
  layout = 'horizontal',
  className = '',
  buttonClassName = '',
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (category) => {
    onSelect?.(category);
    navigate(`/models/${encodeURIComponent(category)}`, {
      state: { view: 'catalog' },
      replace: location.pathname.startsWith('/models'),
    });
  };

  return (
    <div
      className={
        layout === 'vertical'
          ? `flex flex-col gap-1 ${className}`
          : `flex items-center gap-1 flex-wrap ${className}`
      }
    >
      {MODEL_NAV_ITEMS.map((item) => {
        const active = activeCategory === item.category;
        return (
          <button
            key={item.category}
            type="button"
            onClick={() => go(item.category)}
            className={
              buttonClassName
              || (layout === 'vertical'
                ? 'text-white/70 hover:text-white text-base py-3 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 text-left'
                : `text-sm px-3 sm:px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                  active ? 'text-white bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`)
            }
            style={layout === 'vertical' ? { fontFamily: 'Inter, sans-serif' } : { fontFamily: 'Inter, sans-serif' }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
