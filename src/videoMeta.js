export function parseModelVideoMeta(model) {
  const raw = model?.video_meta;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function modelSupportsFrameType(model, frameType) {
  const meta = parseModelVideoMeta(model);
  const supported = meta?.supported_frame_images;
  if (!Array.isArray(supported)) return false;
  return supported.includes(frameType);
}

export function modelSupportsAnyFrameImages(model) {
  const meta = parseModelVideoMeta(model);
  return Array.isArray(meta?.supported_frame_images) && meta.supported_frame_images.length > 0;
}

export function getVideoOptionLists(model) {
  const meta = parseModelVideoMeta(model);
  return {
    durations: meta?.supported_durations?.length ? meta.supported_durations : [4, 6, 8],
    resolutions: meta?.supported_resolutions?.length ? meta.supported_resolutions : ['720p', '1080p'],
    aspectRatios: meta?.supported_aspect_ratios?.length ? meta.supported_aspect_ratios : ['16:9', '9:16'],
  };
}

export function videoFramesToPayload(firstFrame, lastFrame) {
  const items = [];
  if (firstFrame?.url) items.push({ url: firstFrame.url, role: 'first_frame' });
  if (lastFrame?.url) items.push({ url: lastFrame.url, role: 'last_frame' });
  return items;
}
