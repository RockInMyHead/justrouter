function write(level, message, metadata) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(metadata && typeof metadata === 'object' ? metadata : {}),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info(message, metadata) {
    write('info', message, metadata);
  },
  warn(message, metadata) {
    write('warn', message, metadata);
  },
  error(message, metadata) {
    write('error', message, metadata);
  },
};
