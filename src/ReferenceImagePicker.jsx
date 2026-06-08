import { useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
export const MIN_IMAGE_EDGE = 240;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const UPLOAD_MAX_EDGE = 1280;
const UPLOAD_JPEG_QUALITY = 0.82;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = objectUrl;
  });
}

function estimateDataUrlBytes(dataUrl) {
  const base64Part = String(dataUrl).split(',')[1] || '';
  return Math.ceil((base64Part.length * 3) / 4);
}

function fitImageDimensions(naturalWidth, naturalHeight) {
  let width = naturalWidth;
  let height = naturalHeight;
  const minDim = Math.min(width, height);
  if (minDim < MIN_IMAGE_EDGE) {
    const upscale = MIN_IMAGE_EDGE / minDim;
    width = Math.round(width * upscale);
    height = Math.round(height * upscale);
  }
  const longestEdge = Math.max(width, height);
  if (longestEdge > UPLOAD_MAX_EDGE) {
    const downscale = UPLOAD_MAX_EDGE / longestEdge;
    width = Math.round(width * downscale);
    height = Math.round(height * downscale);
  }
  if (Math.min(width, height) < MIN_IMAGE_EDGE) {
    throw new Error(`Изображение слишком маленькое. Минимум ${MIN_IMAGE_EDGE}×${MIN_IMAGE_EDGE} пикселей.`);
  }
  return { width, height };
}

async function compressImageFile(file) {
  const img = await loadImageElement(file);
  const { width, height } = fitImageDimensions(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось обработать изображение');
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', UPLOAD_JPEG_QUALITY);
  if (estimateDataUrlBytes(dataUrl) > MAX_IMAGE_FILE_BYTES) {
    throw new Error('Изображение слишком большое даже после сжатия');
  }
  return dataUrl;
}

export function readImageFile(file) {
  return (async () => {
    if (!file?.type?.startsWith('image/')) {
      throw new Error('Можно загружать только изображения (JPEG, PNG, WebP, GIF)');
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      throw new Error('Файл больше 8 МБ');
    }
    return compressImageFile(file);
  })();
}

function createImageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ROLE_OPTIONS = [
  { value: 'reference', label: 'Референс' },
  { value: 'first_frame', label: 'Первый кадр' },
  { value: 'last_frame', label: 'Последний кадр' },
];

export default function ReferenceImagePicker({
  images,
  onChange,
  maxCount = 4,
  disabled = false,
  hint,
  allowFrameTypes = false,
  accentColor = '#10B981',
}) {
  const inputRef = useRef(null);
  const canAdd = images.length < maxCount;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const next = [...images];
    for (const file of files) {
      if (next.length >= maxCount) break;
      try {
        const url = await readImageFile(file);
        next.push({
          id: createImageId(),
          url,
          preview: url,
          name: file.name,
          role: 'reference',
        });
      } catch (err) {
        onChange(next, err.message);
        return;
      }
    }
    onChange(next, '');
  };

  const updateRole = (id, role) => {
    onChange(images.map((img) => (img.id === id ? { ...img, role } : img)), '');
  };

  const removeImage = (id) => {
    onChange(images.filter((img) => img.id !== id), '');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/40 text-xs font-medium uppercase tracking-wide">Изображения</span>
        <span className="text-white/30 text-xs">{images.length}/{maxCount}</span>
      </div>

      {hint && <p className="text-white/40 text-sm leading-relaxed">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative group w-24 h-24 rounded-xl overflow-hidden shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <img src={img.preview || img.url} alt={img.name || 'upload'} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 size-6 rounded-full bg-black/70 text-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Удалить"
              >
                <X size={12} />
              </button>
            )}
            {allowFrameTypes && (
              <select
                value={img.role || 'reference'}
                onChange={(e) => updateRole(img.id, e.target.value)}
                disabled={disabled}
                className="absolute bottom-0 inset-x-0 text-[9px] font-mono bg-black/75 text-white/80 border-0 outline-none py-1 px-1"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: '#111' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        {canAdd && !disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer hover:bg-white/[0.06]"
            style={{ border: '1px dashed rgba(255,255,255,0.14)', color: accentColor }}
          >
            <Upload size={16} />
            <span className="text-xs font-medium text-white/50">Загрузить</span>
          </button>
        )}
      </div>

      {!images.length && (
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm text-white/40"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ImageIcon size={14} className="shrink-0 text-white/25" />
          <span>JPEG, PNG, WebP или GIF до 8 МБ — используйте как референс</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function imagesToPayload(images, { includeRoles = false } = {}) {
  if (!images?.length) return includeRoles ? [] : [];
  if (includeRoles) {
    return images.map((img) => ({ url: img.url, role: img.role || 'reference' }));
  }
  return images.map((img) => img.url);
}
