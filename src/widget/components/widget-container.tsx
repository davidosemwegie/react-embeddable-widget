import { useState, useEffect, useCallback } from 'react';
import { WidgetContext, type NetworkLog, type ClickLog } from '../lib/context';
import { Widget } from './widget';
import { startNetworkMonitor } from '../lib/network-monitor';
import { startClickMonitor } from '../lib/click-monitor';

interface WidgetContainerProps {
  clientKey: string;
}

export function WidgetContainer({ clientKey }: WidgetContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [clickLogs, setClickLogs] = useState<ClickLog[]>([]);

  const addLog = useCallback((log: NetworkLog) => {
    // cap at 200 entries
    setLogs((prev) => {
      const next = [log, ...prev];
      if (next.length > 200) next.length = 200;
      return next;
    });
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);
  const addClickLog = useCallback((log: ClickLog) => {
    setClickLogs((prev) => {
      const next = [log, ...prev];
      if (next.length > 200) next.length = 200;
      return next;
    });
  }, []);
  const clearClickLogs = useCallback(() => setClickLogs([]), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const fileName = 'widget';
    const cssUrl = `/${fileName}.css`;
    const stop = startNetworkMonitor({
      onEvent: (evt) => {
        addLog({ ...evt });
      },
      ignoreUrls: [cssUrl],
      maxResponseChars: 500,
    });
    return () => {
      stop();
    };
  }, [mounted, addLog]);

  useEffect(() => {
    if (!mounted) return;
    // Best-effort ignore all clicks inside the widget host element if exposed globally
    const ignoreWithin =
      (window as unknown as { __DEALT_WIDGET_SHADOW_HOST__: unknown })
        .__DEALT_WIDGET_SHADOW_HOST__ || null;
    const stop = startClickMonitor({
      onEvent: (evt) => addClickLog(evt),
      // @ts-expect-error - ignoreWithin is not typed
      ignoreWithin,
      maxTextChars: 160,
    });
    return () => stop();
  }, [mounted, addClickLog]);

  if (!mounted) {
    return null;
  }

  return (
    <WidgetContext.Provider
      value={{
        isOpen,
        setIsOpen,
        clientKey,
        logs,
        addLog,
        clearLogs,
        clickLogs,
        addClickLog,
        clearClickLogs,
      }}
    >
      <Widget />
    </WidgetContext.Provider>
  );
}
