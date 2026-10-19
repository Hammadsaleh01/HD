export function sanitizeLogInput(val: any): any {
  if (!val) return val;
  if (typeof val === 'string') {
    // Sanitize any user input: remove newline injection, trim, mask email parts if needed
    return val.replace(/[\r\n\t]/g, ' ').slice(0, 200);
  }
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map(sanitizeLogInput);
    }
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      const lower = k.toLowerCase();
      if (lower.includes('password') || lower.includes('token') || lower.includes('secret')) {
        clean[k] = '[REDACTED]';
      } else if (lower === 'cnic') {
        clean[k] = '[ENCRYPTED_PII]';
      } else {
        clean[k] = sanitizeLogInput(v);
      }
    }
    return clean;
  }
  return val;
}

export const logger = {
  info: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.log(`[${timestamp}] [INFO] ${msg}`, sanitizeLogInput(meta));
    } else {
      console.log(`[${timestamp}] [INFO] ${msg}`);
    }
  },
  warn: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.warn(`[${timestamp}] [WARN] ${msg}`, sanitizeLogInput(meta));
    } else {
      console.warn(`[${timestamp}] [WARN] ${msg}`);
    }
  },
  error: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.error(`[${timestamp}] [ERROR] ${msg}`, sanitizeLogInput(meta));
    } else {
      console.error(`[${timestamp}] [ERROR] ${msg}`);
    }
  }
};
