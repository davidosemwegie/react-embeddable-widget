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
      (window as unknown).__DEALT_WIDGET_SHADOW_HOST__ || null;
    const stop = startClickMonitor({
      onEvent: (evt) => addClickLog(evt),
      ignoreWithin,
      maxTextChars: 160,
    });
    return () => stop();
  }, [mounted, addClickLog]);

  useEffect(() => {
    if (!mounted) return;

    const fetchRandomPokemon = async () => {
      const randomId = Math.floor(Math.random() * 1000) + 1;
      try {
        await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
      } catch (error) {
        console.error('Failed to fetch pokemon:', error);
      }
    };

    const interval = setInterval(fetchRandomPokemon, 5000);
    return () => clearInterval(interval);
  }, [mounted]);

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
      <h1 className='text-2xl font-bold text-black'> Widget Container </h1>
      <button
        className='px-2 py-1 text-sm bg-gray-100 rounded'
        onClick={() => console.log('Test Click')}
      >
        Test Click
      </button>
      <Widget />
    </WidgetContext.Provider>
  );
}
