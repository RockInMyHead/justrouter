export const MAX_REFERENCE_IMAGES = 4;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MIN_IMAGE_EDGE = 240;

function readDataUrlDimensions(dataUrl) {
  const match = /^data:image\/(\w+);base64,(.+)$/i.exec(String(dataUrl || '').trim());
  if (!match) return null;
  const buf = Buffer.from(match[2], 'base64');
  const type = match[1].toLowerCase();

  if (type === 'png' && buf.length >= 24) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (type === 'gif' && buf.length >= 10) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (type === 'jpeg' || type === 'jpg') {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      const segmentLength = buf.readUInt16BE(offset + 2);
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }
  return null;
}

function assertImageDimensions(url) {
  if (!/^data:image\//i.test(url)) return;
  const dims = readDataUrlDimensions(url);
  if (!dims) return;
  const minDim = Math.min(dims.width, dims.height);
  if (minDim < MIN_IMAGE_EDGE) {
    throw new Error(`Изображение ${dims.width}×${dims.height} слишком маленькое. Минимум ${MIN_IMAGE_EDGE}×${MIN_IMAGE_EDGE} пикселей.`);
  }
}

export function normalizeImageUrl(url) {
  const value = String(url || '').trim();
  if (!value) throw new Error('Пустой URL изображения');
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value)) {
    const base64Part = value.split(',')[1] || '';
    const bytes = Math.ceil((base64Part.length * 3) / 4);
    if (bytes > MAX_IMAGE_BYTES) {
      throw new Error(`Изображение слишком большое (макс. ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} МБ)`);
    }
    assertImageDimensions(value);
    return value;
  }
  throw new Error('Изображение должно быть HTTPS-ссылкой или base64 data URL');
}

export function normalizeImageList(urls, { max = MAX_REFERENCE_IMAGES } = {}) {
  if (!urls) return [];
  if (!Array.isArray(urls)) throw new Error('images должен быть массивом');
  if (urls.length > max) throw new Error(`Максимум ${max} изображений`);
  return urls.map(normalizeImageUrl);
}

export function normalizeStructuredImages(items, { max = MAX_REFERENCE_IMAGES + 2 } = {}) {
  if (!items?.length) return { frameImages: [], inputReferences: [] };
  if (!Array.isArray(items)) throw new Error('images должен быть массивом');
  if (items.length > max) throw new Error(`Слишком много изображений (макс. ${max})`);

  const frameImages = [];
  const inputReferences = [];
  let firstFrameCount = 0;
  let lastFrameCount = 0;

  for (const item of items) {
    const url = normalizeImageUrl(item?.url);
    const role = item?.role || 'reference';

    if (role === 'first_frame') {
      firstFrameCount += 1;
      if (firstFrameCount > 1) throw new Error('Можно загрузить только один первый кадр');
      frameImages.push({
        type: 'image_url',
        image_url: { url },
        frame_type: 'first_frame',
      });
      continue;
    }

    if (role === 'last_frame') {
      lastFrameCount += 1;
      if (lastFrameCount > 1) throw new Error('Можно загрузить только один последний кадр');
      frameImages.push({
        type: 'image_url',
        image_url: { url },
        frame_type: 'last_frame',
      });
      continue;
    }

    if (inputReferences.length >= MAX_REFERENCE_IMAGES) {
      throw new Error(`Максимум ${MAX_REFERENCE_IMAGES} референс-изображений`);
    }
    inputReferences.push({
      type: 'image_url',
      image_url: { url },
    });
  }

  return { frameImages, inputReferences };
}

export function validateVideoRequestForModel(model, {
  frameImages = [],
  inputReferences = [],
  duration,
  resolution,
  aspectRatio,
  videoMeta,
} = {}) {
  const meta = videoMeta || null;
  const supportedFrames = meta?.supported_frame_images || [];

  if (frameImages.length && !supportedFrames.length) {
    throw new Error('Эта модель не поддерживает загрузку начального или конечного кадра');
  }

  for (const frame of frameImages) {
    if (!supportedFrames.includes(frame.frame_type)) {
      const label = frame.frame_type === 'first_frame' ? 'начальный кадр' : 'конечный кадр';
      throw new Error(`Модель не поддерживает ${label}`);
    }
  }

  if (inputReferences.length && meta?.supported_input_references === false) {
    throw new Error('Эта модель не поддерживает референс-изображения');
  }

  if (duration != null && meta?.supported_durations?.length) {
    const value = Number(duration);
    if (!meta.supported_durations.includes(value)) {
      throw new Error(`Длительность ${value} сек не поддерживается. Доступно: ${meta.supported_durations.join(', ')} сек`);
    }
  }

  if (resolution && meta?.supported_resolutions?.length && !meta.supported_resolutions.includes(resolution)) {
    throw new Error(`Разрешение ${resolution} не поддерживается. Доступно: ${meta.supported_resolutions.join(', ')}`);
  }

  if (aspectRatio && meta?.supported_aspect_ratios?.length && !meta.supported_aspect_ratios.includes(aspectRatio)) {
    throw new Error(`Формат ${aspectRatio} не поддерживается. Доступно: ${meta.supported_aspect_ratios.join(', ')}`);
  }
}

export function summarizeImagesForLog(count) {
  if (!count) return '';
  return ` [${count} изображ.]`;
}
