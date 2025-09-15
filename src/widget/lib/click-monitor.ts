export type ClickMonitorOptions = {
  onEvent: (event: {
    id: string;
    type: 'click';
    timestamp: number;
    tag: string;
    idAttr?: string;
    classes?: string[];
    role?: string;
    name?: string;
    text?: string;
    selector?: string;
    x?: number;
    y?: number;
  }) => void;
  ignoreWithin?: Node | null;
  maxTextChars?: number;
};

function buildSelector(el: Element): string {
  try {
    const parts: string[] = [];
    let cur: Element | null = el;
    while (cur && parts.length < 5) {
      const tag = cur.tagName.toLowerCase();
      const id = cur.getAttribute('id');
      const cls = (cur.getAttribute('class') || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((c) => `.${c}`)
        .join('');
      if (id) {
        parts.unshift(`${tag}#${id}`);
        break;
      } else {
        const idx = (() => {
          let i = 1;
          let sib = cur.previousElementSibling;
          while (sib) {
            if (sib.tagName === cur!.tagName) i++;
            sib = sib.previousElementSibling;
          }
          return i;
        })();
        parts.unshift(`${tag}${cls}:nth-of-type(${idx})`);
      }
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  } catch {
    return '';
  }
}

export function startClickMonitor(options: ClickMonitorOptions) {
  const { onEvent, ignoreWithin = (window as any).__DEALT_WIDGET_SHADOW_HOST__ || null, maxTextChars = 120 } = options || {} as any;

  const handler = (ev: MouseEvent) => {
    try {
      const path = ev.composedPath?.() || [];
      if (ignoreWithin && path.includes(ignoreWithin)) return;
      const target = (ev.target as Element) || null;
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;

      const el = target as Element;
      const tag = el.tagName.toLowerCase();
      const idAttr = el.getAttribute('id') || undefined;
      const classes = (el.getAttribute('class') || '')
        .split(/\s+/)
        .filter(Boolean);
      const role = el.getAttribute('role') || undefined;
      const name = (el.getAttribute('name') || el.getAttribute('aria-label') || undefined) as string | undefined;
      let text = '';
      try {
        text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      } catch {}
      if (text && text.length > maxTextChars) text = text.slice(0, maxTextChars) + '…';

      const selector = buildSelector(el);
      const id = `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      onEvent({
        id,
        type: 'click',
        timestamp: Date.now(),
        tag,
        idAttr,
        classes,
        role,
        name,
        text: text || undefined,
        selector: selector || undefined,
        x: ev.clientX,
        y: ev.clientY,
      });
    } catch {}
  };

  window.addEventListener('click', handler, true);

  return function stop() {
    window.removeEventListener('click', handler, true);
  };
}

