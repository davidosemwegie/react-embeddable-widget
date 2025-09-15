export type NetworkMonitorOptions = {
  onEvent: (event: {
    id: string;
    type: 'fetch' | 'xhr';
    method: string;
    url: string;
    status?: number;
    ok?: boolean;
    durationMs?: number;
    error?: string;
    timestamp: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBodyPreview?: string;
    responseBodyPreview?: string;
    requestBodyTruncated?: boolean;
    responseBodyTruncated?: boolean;
  }) => void;
  ignoreUrls?: string[];
  maxResponseChars?: number; // if provided, we may attempt reading small bodies later
};

function shouldIgnore(url: string, ignore?: string[]) {
  if (!ignore || ignore.length === 0) return false;
  try {
    const u = String(url);
    return ignore.some((i) => u.includes(i));
  } catch {
    return false;
  }
}

let monitorActive = false;

export function startNetworkMonitor(options: NetworkMonitorOptions) {
  if (monitorActive) return () => {};
  monitorActive = true;

  const { onEvent, ignoreUrls } = options;
  const maxChars = Math.max(0, options.maxResponseChars ?? 0);

  // fetch
  const originalFetch = window.fetch.bind(window);
  // @ts-ignore - keep ref on window for restore
  const prevFetch = window.fetch;

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const timestamp = Date.now();
    const id = `f_${timestamp}_${Math.random().toString(36).slice(2)}`;

    let input = args[0];
    let init = args[1] || {};
    let method = 'GET';
    let url = '';

    try {
      if (input instanceof Request) {
        method = input.method || 'GET';
        url = input.url;
      } else {
        url = String(input);
        // @ts-ignore
        method = (init && init.method) || 'GET';
      }
    } catch {}

    if (shouldIgnore(url, ignoreUrls)) {
      return originalFetch(...args);
    }

    // Collect request headers and body best-effort
    let requestHeaders: Record<string, string> | undefined;
    let requestBodyPreview: string | undefined;
    let requestBodyTruncated: boolean | undefined;

    try {
      if (input instanceof Request) {
        const headersObj: Record<string, string> = {};
        input.headers?.forEach?.((v, k) => {
          headersObj[k] = v;
        });
        requestHeaders = headersObj;
        if (maxChars > 0 && input.body && typeof input.clone === 'function') {
          try {
            const txt = await input.clone().text();
            requestBodyPreview = txt.slice(0, maxChars);
            requestBodyTruncated = txt.length > maxChars;
          } catch {}
        }
      } else if (init) {
        const hdrs = (init as any).headers;
        if (hdrs) {
          const headersObj: Record<string, string> = {};
          try {
            if (hdrs instanceof Headers) {
              hdrs.forEach((v, k) => (headersObj[k] = v));
            } else if (Array.isArray(hdrs)) {
              for (const [k, v] of hdrs) headersObj[String(k)] = String(v);
            } else if (typeof hdrs === 'object') {
              for (const k of Object.keys(hdrs)) headersObj[k] = String((hdrs as any)[k]);
            }
          } catch {}
          requestHeaders = headersObj;
        }
        const body = (init as any).body;
        if (maxChars > 0 && body) {
          try {
            if (typeof body === 'string') {
              requestBodyPreview = body.slice(0, maxChars);
              requestBodyTruncated = body.length > maxChars;
            } else if (body instanceof URLSearchParams) {
              const s = body.toString();
              requestBodyPreview = s.slice(0, maxChars);
              requestBodyTruncated = s.length > maxChars;
            } else if (body instanceof FormData) {
              const parts: string[] = [];
              body.forEach((v, k) => parts.push(`${k}=${typeof v === 'string' ? v : '[file]'}`));
              const s = parts.join('&');
              requestBodyPreview = s.slice(0, maxChars);
              requestBodyTruncated = s.length > maxChars;
            }
          } catch {}
        }
      }
    } catch {}

    const start = performance.now();
    try {
      const res = await originalFetch(...args);
      const end = performance.now();
      let responseHeaders: Record<string, string> | undefined;
      let responseBodyPreview: string | undefined;
      let responseBodyTruncated: boolean | undefined;
      if (maxChars > 0) {
        try {
          const clone = res.clone();
          const txt = await clone.text();
          responseBodyPreview = txt.slice(0, maxChars);
          responseBodyTruncated = txt.length > maxChars;
        } catch {}
      }
      try {
        const headersObj: Record<string, string> = {};
        res.headers?.forEach?.((v, k) => (headersObj[k] = v));
        responseHeaders = headersObj;
      } catch {}
      onEvent({
        id,
        type: 'fetch',
        method,
        url,
        status: res.status,
        ok: res.ok,
        durationMs: Math.round(end - start),
        timestamp,
        requestHeaders,
        responseHeaders,
        requestBodyPreview,
        responseBodyPreview,
        requestBodyTruncated,
        responseBodyTruncated,
      });
      return res;
    } catch (e: any) {
      const end = performance.now();
      onEvent({
        id,
        type: 'fetch',
        method,
        url,
        error: e?.message || 'Network error',
        durationMs: Math.round(end - start),
        timestamp,
        requestHeaders,
        requestBodyPreview,
        requestBodyTruncated,
      });
      throw e;
    }
  };

  // XHR
  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR(this: XMLHttpRequest) {
    const xhr = new OriginalXHR();
    let method = 'GET';
    let url = '';
    let startTime = 0;
    const id = `x_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const originalOpen = xhr.open.bind(xhr);
    xhr.open = function (...args: Parameters<XMLHttpRequest['open']>) {
      method = (args[0] as string) || 'GET';
      // args[1] can be string | URL in newer libdom
      const rawUrl = args[1] as any;
      url = typeof rawUrl === 'string' ? rawUrl : String(rawUrl ?? '');
      originalOpen(...args);
    } as any;

    const requestHeaders: Record<string, string> = {};
    const originalSetHeader = xhr.setRequestHeader.bind(xhr);
    xhr.setRequestHeader = function (header: string, value: string) {
      try {
        requestHeaders[header.toLowerCase()] = value;
      } catch {}
      return originalSetHeader(header, value);
    };

    const originalSend = xhr.send.bind(xhr);
    xhr.send = function (...args: Parameters<XMLHttpRequest['send']>) {
      if (!shouldIgnore(url, ignoreUrls)) {
        startTime = performance.now();
        const timestamp = Date.now();
        const finalize = (error?: string) => {
          const end = performance.now();
          try {
            let responseHeaders: Record<string, string> | undefined;
            try {
              const raw = xhr.getAllResponseHeaders?.();
              if (raw) {
                responseHeaders = {};
                raw.split(/\r?\n/).forEach((line) => {
                  const idx = line.indexOf(':');
                  if (idx > 0) {
                    const k = line.slice(0, idx).trim().toLowerCase();
                    const v = line.slice(idx + 1).trim();
                    if (k) responseHeaders![k] = v;
                  }
                });
              }
            } catch {}

            let responseBodyPreview: string | undefined;
            let responseBodyTruncated: boolean | undefined;
            if (maxChars > 0) {
              try {
                const txt = String((xhr.responseType === '' || xhr.responseType === 'text') ? xhr.responseText : '');
                responseBodyPreview = txt.slice(0, maxChars);
                responseBodyTruncated = txt.length > maxChars;
              } catch {}
            }

            onEvent({
              id,
              type: 'xhr',
              method,
              url,
              status: xhr.status,
              ok: xhr.status >= 200 && xhr.status < 300,
              durationMs: Math.round(end - startTime),
              error,
              timestamp,
              requestHeaders,
              responseHeaders,
              responseBodyPreview,
              responseBodyTruncated,
            });
          } catch {}
        };

        xhr.addEventListener('load', () => finalize());
        xhr.addEventListener('error', () => finalize('Network error'));
        xhr.addEventListener('abort', () => finalize('Aborted'));
        xhr.addEventListener('timeout', () => finalize('Timed out'));
      }
      originalSend(...args);
    } as any;

    return xhr;
  }

  // @ts-ignore
  window.XMLHttpRequest = PatchedXHR;

  return function stop() {
    // restore
    // @ts-ignore
    window.fetch = prevFetch;
    window.XMLHttpRequest = OriginalXHR;
    monitorActive = false;
  };
}
