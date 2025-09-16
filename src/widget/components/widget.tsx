import { useContext, useMemo, useState } from 'react';
import { NetworkLog, WidgetContext } from '../lib/context';

export function Widget() {
  const { isOpen, setIsOpen, logs, clearLogs, clickLogs, clearClickLogs } =
    useContext(WidgetContext);

  const [activeTab, setActiveTab] = useState<'network' | 'clicks'>('network');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>(''); // fetch/xhr
  const [urlQuery, setUrlQuery] = useState<string>('');

  const total = logs.length;
  const filtered = useMemo(() => {
    return logs
      .filter((l) => {
        if (methodFilter && l.method.toUpperCase() !== methodFilter)
          return false;
        if (typeFilter && l.type !== typeFilter) return false;
        if (statusFilter) {
          const s = l.status || 0;
          if (statusFilter === '2xx' && !(s >= 200 && s < 300)) return false;
          if (statusFilter === '3xx' && !(s >= 300 && s < 400)) return false;
          if (statusFilter === '4xx' && !(s >= 400 && s < 500)) return false;
          if (statusFilter === '5xx' && !(s >= 500 && s < 600)) return false;
          if (statusFilter === 'error' && !l.error) return false;
        }
        if (urlQuery && !l.url.toLowerCase().includes(urlQuery.toLowerCase()))
          return false;
        return true;
      })
      .slice(0, 200);
  }, [logs, methodFilter, statusFilter, urlQuery, typeFilter]);

  const recentDurations = useMemo(
    () =>
      filtered
        .slice(0, 30)
        .map((l) => l.durationMs || 0)
        .reverse(),
    [filtered],
  );
  const maxDur = useMemo(
    () => Math.max(1, ...recentDurations),
    [recentDurations],
  );

  if (!isOpen) {
    return (
      <button className='widget-button' onClick={() => setIsOpen(true)}>
        Open Widget{total ? ` (${total})` : ''}
      </button>
    );
  }

  return (
    <div className='widget-container'>
      <div className='widget-header'>
        <div className='flex items-center gap-3'>
          <h3>Monitor</h3>
          <div className='flex text-xs bg-gray-100 rounded overflow-hidden'>
            <button
              className={`px-2 py-1 ${activeTab === 'network' ? 'bg-white' : ''}`}
              onClick={() => setActiveTab('network')}
            >
              Network
            </button>
            <button
              className={`px-2 py-1 ${activeTab === 'clicks' ? 'bg-white' : ''}`}
              onClick={() => setActiveTab('clicks')}
            >
              Clicks
            </button>
          </div>
        </div>
        <div className='flex gap-2'>
          {activeTab === 'network' ? (
            <button
              onClick={clearLogs}
              className='px-2 py-1 text-sm bg-gray-100 rounded'
            >
              Clear
            </button>
          ) : (
            <button
              onClick={clearClickLogs}
              className='px-2 py-1 text-sm bg-gray-100 rounded'
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className='px-2 py-1 text-sm bg-gray-100 rounded'
          >
            Close
          </button>
        </div>
      </div>

      <div className='widget-content'>
        {activeTab === 'network' ? (
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <select
                className='text-xs border rounded px-1 py-0.5'
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <option value=''>Any method</option>
                {[
                  'GET',
                  'POST',
                  'PUT',
                  'PATCH',
                  'DELETE',
                  'OPTIONS',
                  'HEAD',
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className='text-xs border rounded px-1 py-0.5'
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value=''>Any status</option>
                {['2xx', '3xx', '4xx', '5xx', 'error'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className='text-xs border rounded px-1 py-0.5'
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value=''>Any type</option>
                {['fetch', 'xhr'].map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                className='flex-1 text-xs border rounded px-2 py-0.5'
                placeholder='Filter by URL'
                value={urlQuery}
                onChange={(e) => setUrlQuery(e.target.value)}
              />
            </div>

            <div className='text-xs text-gray-500 mb-1'>
              Showing {filtered.length} of {total}
            </div>
            <div className='flex items-end gap-0.5 h-10 mb-2'>
              {recentDurations.map((d, i) => (
                <div
                  key={i}
                  title={`${d} ms`}
                  className='bg-indigo-400 w-1'
                  style={{
                    height: `${Math.max(2, Math.round((d / maxDur) * 100))}%`,
                  }}
                />
              ))}
            </div>

            <div className='h-[260px] overflow-auto space-y-2'>
              {filtered.length === 0 ? (
                <div className='text-sm text-gray-500'>
                  No network requests captured.
                </div>
              ) : (
                <NetworkList items={filtered} />
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className='text-xs text-gray-500 mb-2'>
              Total clicks: {clickLogs.length}
            </div>
            <div className='h-[300px] overflow-auto space-y-2'>
              {clickLogs.length === 0 ? (
                <div className='text-sm text-gray-500'>No clicks captured.</div>
              ) : (
                clickLogs.slice(0, 200).map((c) => (
                  <div
                    key={c.id}
                    className='border border-gray-200 rounded p-2'
                  >
                    <div className='flex items-center justify-between text-[11px]'>
                      <div className='font-mono'>
                        {c.tag}
                        {c.idAttr ? `#${c.idAttr}` : ''}
                        {c.classes && c.classes.length
                          ? '.' + c.classes.slice(0, 2).join('.')
                          : ''}
                      </div>
                      <div className='text-gray-600'>
                        {new Date(c.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {c.text && (
                      <div className='mt-1 text-[12px] text-gray-800 break-all'>
                        {c.text}
                      </div>
                    )}
                    {c.selector && (
                      <div className='mt-1 text-[10px] text-gray-500 break-all'>
                        {c.selector}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkList({ items }: { items: NetworkLog[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <>
      {items.map((item: NetworkLog) => {
        const isOpen = !!expanded[item.id];
        return (
          <div key={item.id} className='border border-gray-200 rounded p-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span
                  className={`px-1.5 py-0.5 rounded text-white text-[10px] ${item.type === 'fetch' ? 'bg-indigo-600' : 'bg-emerald-600'}`}
                >
                  {String(item.type).toUpperCase()}
                </span>
                <span className='font-mono text-[11px] font-semibold'>
                  {item.method}
                </span>
              </div>
              <div className='text-[11px] text-gray-600'>
                {item.durationMs ?? 0} ms
              </div>
            </div>
            <div className='mt-1 break-all text-[12px] text-gray-800'>
              {item.url}
            </div>
            <div className='mt-1 text-[11px]'>
              {item.error ? (
                <span className='text-red-600'>{item.error}</span>
              ) : (
                <span
                  className={item.ok ? 'text-green-600' : 'text-yellow-700'}
                >
                  {typeof item.status === 'number'
                    ? `Status ${item.status}${item.ok ? ' OK' : ''}`
                    : 'Pending'}
                </span>
              )}
              <button
                className='ml-2 text-[11px] underline'
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [item.id]: !isOpen }))
                }
              >
                {isOpen ? 'Hide' : 'Details'}
              </button>
            </div>
            {isOpen && (
              <div className='mt-2 space-y-1'>
                {item.requestHeaders && (
                  <div className='text-[10px] text-gray-700'>
                    <span className='font-semibold'>Req headers:</span>{' '}
                    {Object.entries(item.requestHeaders)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('; ')}
                  </div>
                )}
                {item.responseHeaders && (
                  <div className='text-[10px] text-gray-700'>
                    <span className='font-semibold'>Res headers:</span>{' '}
                    {Object.entries(item.responseHeaders)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('; ')}
                  </div>
                )}
                {item.requestBodyPreview && (
                  <div className='text-[10px] text-gray-700 break-all'>
                    <span className='font-semibold'>Req body:</span>{' '}
                    {item.requestBodyPreview}
                    {item.requestBodyTruncated ? ' …[truncated]' : ''}
                  </div>
                )}
                {item.responseBodyPreview && (
                  <div className='text-[10px] text-gray-700 break-all'>
                    <span className='font-semibold'>Res body:</span>{' '}
                    {item.responseBodyPreview}
                    {item.responseBodyTruncated ? ' …[truncated]' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
