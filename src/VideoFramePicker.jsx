import { useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { readImageFile } from './ReferenceImagePicker.jsx';

function FrameSlot({
  label,
  description,
  image,
  onChange,
  disabled,
  accentColor,
  optional = false,
}) {
  const inputRef = useRef(null);

  const handleFile = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const url = await readImageFile(file);
      onChange({ url, preview: url, name: file.name });
    } catch (err) {
      onChange(null, err.message);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 gap-2">
      <div className="min-h-[4.75rem] flex flex-col gap-1">
        <span className="text-white/50 text-xs font-medium uppercase tracking-wide leading-snug">
          {label}
        </span>
        {optional && (
          <span className="text-white/25 text-[10px] normal-case tracking-normal">Опционально</span>
        )}
        {description && (
          <p className="text-white/35 text-xs leading-relaxed">{description}</p>
        )}
      </div>

      {image ? (
        <div
          className="relative group aspect-video rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <img src={image.preview || image.url} alt={label} className="w-full h-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 size-7 rounded-full bg-black/70 text-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label={`Удалить ${label.toLowerCase()}`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ border: '1px dashed rgba(255,255,255,0.14)', color: accentColor }}
        >
          <Upload size={18} />
          <span className="text-xs font-medium text-white/45">Загрузить фото</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function VideoFramePicker({
  firstFrame,
  lastFrame,
  onFirstFrameChange,
  onLastFrameChange,
  supportsFirst = false,
  supportsLast = false,
  disabled = false,
  accentColor = '#10B981',
  uploadError = '',
}) {
  if (!supportsFirst && !supportsLast) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon size={14} className="text-white/30 shrink-0" />
        <span className="text-white/40 text-xs font-medium uppercase tracking-wide">
          Кадры для image-to-video
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {supportsFirst && (
          <FrameSlot
            label="Начальный кадр"
            description="Первый кадр готового видео совпадёт с этим изображением"
            image={firstFrame}
            onChange={(img, err) => onFirstFrameChange(img, err)}
            disabled={disabled}
            accentColor={accentColor}
          />
        )}
        {supportsLast && (
          <FrameSlot
            label="Конечный кадр"
            description="Видео плавно перейдёт к этой сцене к концу ролика"
            image={lastFrame}
            onChange={(img, err) => onLastFrameChange(img, err)}
            disabled={disabled}
            accentColor={accentColor}
            optional={supportsFirst}
          />
        )}
      </div>

      {uploadError && (
        <div
          className="rounded-xl p-3 text-amber-300 text-sm"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}
        >
          {uploadError}
        </div>
      )}

      <p className="text-white/35 text-xs leading-relaxed">
        JPEG, PNG, WebP или GIF до 8 МБ, минимум 240×240 px.
        {supportsFirst && supportsLast && ' Можно загрузить только начальный кадр или оба для перехода между сценами.'}
      </p>
    </div>
  );
}
