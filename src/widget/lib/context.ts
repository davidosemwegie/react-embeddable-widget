import { createContext } from 'react';

export type NetworkLog = {
  id: string;
  type: 'fetch' | 'xhr';
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  durationMs?: number;
  error?: string;
  timestamp: number; // epoch ms
  // Optional details
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBodyPreview?: string;
  responseBodyPreview?: string;
  requestBodyTruncated?: boolean;
  responseBodyTruncated?: boolean;
};

export type ClickLog = {
  id: string;
  type: 'click';
  timestamp: number;
  tag: string;
  idAttr?: string;
  classes?: string[];
  role?: string;
  name?: string;
  text?: string; // truncated innerText
  selector?: string;
  x?: number;
  y?: number;
};

interface WidgetContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  clientKey: string;
  logs: NetworkLog[];
  addLog: (log: NetworkLog) => void;
  clearLogs: () => void;
  clickLogs: ClickLog[];
  addClickLog: (log: ClickLog) => void;
  clearClickLogs: () => void;
}

export const WidgetContext = createContext<WidgetContextType>({
  isOpen: false,
  setIsOpen: () => undefined,
  clientKey: '',
  logs: [],
  addLog: () => undefined,
  clearLogs: () => undefined,
  clickLogs: [],
  addClickLog: () => undefined,
  clearClickLogs: () => undefined,
});
