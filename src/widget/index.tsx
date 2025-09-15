import { createRoot } from 'react-dom/client';
import { WidgetContainer } from './components/widget-container';
import './styles/style.css';

// Capture the executing script element at module load time.
// document.currentScript is only reliable during script evaluation.
const executingScript = (typeof document !== 'undefined'
  ? (document.currentScript as HTMLScriptElement | null)
  : null);

function initializeWidget() {
  if (document.readyState !== 'loading') {
    onReady();
  } else {
    document.addEventListener('DOMContentLoaded', onReady);
  }
}

async function onReady() {
  try {
    const element = document.createElement('div');
    const shadow = element.attachShadow({ mode: 'open' });
    const shadowRoot = document.createElement('div');
    const clientKey = getClientKey();

    shadowRoot.id = 'widget-root';

    const component = (
      <WidgetContainer clientKey={clientKey} />
    );

    shadow.appendChild(shadowRoot);
    await injectStyle(shadow);
    const root = createRoot(shadowRoot);
    root.render(component);

    document.body.appendChild(element);

    // Expose the host element (outside of shadow) so we can ignore clicks within the widget
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__DEALT_WIDGET_SHADOW_HOST__ = element;
    } catch {}
  } catch (error) {
    console.warn('Widget initialization failed:', error);
  }
}

async function injectStyle(shadow: ShadowRoot) {
  const fileName = process.env.WIDGET_NAME || 'widget';
  const cssUrl = process.env.WIDGET_CSS_URL || `/${fileName}.css`;

  try {
    const response = await fetch(cssUrl, { credentials: 'omit' });
    if (!response.ok) throw new Error('Failed to fetch CSS');
    const cssText = await response.text();

    const supportsAdopted =
      // @ts-ignore
      !!shadow.adoptedStyleSheets && typeof CSSStyleSheet !== 'undefined' &&
      // @ts-ignore
      typeof CSSStyleSheet.prototype.replace === 'function';

    if (supportsAdopted) {
      const sheet = new CSSStyleSheet();
      // @ts-ignore
      await sheet.replace(cssText);
      // @ts-ignore
      shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
      return;
    }

    const style = document.createElement('style');
    style.textContent = cssText;
    shadow.appendChild(style);
  } catch (_e) {
    // Fallback to link element if fetching fails
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    shadow.appendChild(link);
  }
}

function getClientKey() {
  // Prefer the script captured during evaluation
  let clientKey = executingScript?.getAttribute('data-client-key') || null;

  // Fallback: find a script tag with the data attribute present
  if (!clientKey) {
    const fallback = document.querySelector(
      'script[data-client-key]'
    ) as HTMLScriptElement | null;
    clientKey = fallback?.getAttribute('data-client-key') || null;
  }

  if (!clientKey) {
    throw new Error('Missing data-client-key attribute');
  }

  return clientKey;
}

initializeWidget();
