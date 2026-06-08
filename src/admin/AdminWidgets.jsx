import { formatNumber } from './formatters.js';

export function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm hover:bg-white/[0.06] transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className={'size-9 rounded-xl flex items-center justify-center ' + color}>
          <Icon size={18} />
        </div>
        <span className="text-white/50 text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="text-white/30 text-xs mt-1 font-mono">{sub}</div>}
    </div>
  );
}

export function ActivityChart({ data, valueKey = 'count', labelKey = 'label', color = 'rgba(59,130,246,0.6)', formatValue }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-white/20 text-xs font-mono">
        Нет данных
      </div>
    );
  }
  const maxValue = Math.max(...data.map(function(d) { return d[valueKey]; }), 1);
  const renderValue = formatValue || formatNumber;
  const chartHeight = 140;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '160px' }}>
      {data.map(function(d, i) {
        const h = Math.max((d[valueKey] / maxValue) * chartHeight, 3);
        return (
          <div key={i} className="group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0, position: 'relative' }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {renderValue(d[valueKey])}
            </div>
            <div
              style={{
                width: '100%',
                height: h + 'px',
                backgroundColor: color,
                borderTopLeftRadius: '2px',
                borderTopRightRadius: '2px',
                transition: 'all 0.5s',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', flexShrink: 0 }}>
              {(d[labelKey] || '').slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
