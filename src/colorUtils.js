export function colorWithAlpha(color, alpha = 0.15) {
  if (!color) return `rgba(255,255,255,${alpha})`;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const full = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (color.startsWith('hsl(')) {
    return color.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `, ${alpha})`);
  }
  if (color.startsWith('hsla(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }
  return color;
}

/** Кнопка с акцентным цветом модели — белый текст, читаемый контраст */
export function accentButtonStyle(color) {
  return {
    backgroundColor: colorWithAlpha(color, 0.28),
    color: '#ffffff',
    border: `1px solid ${colorWithAlpha(color, 0.6)}`,
    WebkitTextFillColor: '#ffffff',
  };
}

export function accentIconWrapStyle(color) {
  return {
    backgroundColor: colorWithAlpha(color, 0.18),
  };
}

export function accentBadgeStyle(color) {
  return {
    backgroundColor: colorWithAlpha(color, 0.18),
    color: '#ffffff',
    border: `1px solid ${colorWithAlpha(color, 0.35)}`,
  };
}

export function accentBorder(color, alpha = 0.45) {
  return colorWithAlpha(color, alpha);
}
