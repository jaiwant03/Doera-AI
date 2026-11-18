import React, { useState } from 'react';

const DataChart = ({ type = 'bar', data = [], title = 'Dataset Visualization' }) => {
  const [activeType, setActiveType] = useState(type);

  if (!data || data.length === 0) return null;

  // Extract label and numeric value keys
  const keys = Object.keys(data[0]);
  const labelKey = keys[0];
  const valueKey = keys.find((k, idx) => idx > 0 && typeof data[0][k] === 'number') || keys[1] || keys[0];

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const maxValue = Math.max(...values, 1);
  const chartHeight = 220;
  const chartWidth = 520;
  const barWidth = Math.max(16, Math.floor((chartWidth - 80) / data.length) - 10);

  const exportCSV = () => {
    const csvHeader = keys.join(',');
    const csvRows = data.map((row) => keys.map((k) => `"${row[k] || ''}"`).join(','));
    const blob = new Blob([[csvHeader, ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8EDF1',
        borderRadius: 14,
        padding: '16px 20px',
        margin: '16px 0',
        boxShadow: '0 4px 18px rgba(8, 127, 140, 0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#17243A' }}>{title}</h4>
          <span style={{ fontSize: 11, color: '#64748B' }}>{data.length} records analyzed</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveType('bar')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: activeType === 'bar' ? '1px solid #087F8C' : '1px solid #E2E8F0',
              background: activeType === 'bar' ? 'rgba(8, 127, 140, 0.08)' : '#FFFFFF',
              color: activeType === 'bar' ? '#087F8C' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Bar
          </button>
          <button
            type="button"
            onClick={() => setActiveType('line')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: activeType === 'line' ? '1px solid #087F8C' : '1px solid #E2E8F0',
              background: activeType === 'line' ? 'rgba(8, 127, 140, 0.08)' : '#FFFFFF',
              color: activeType === 'line' ? '#087F8C' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Line
          </button>
          <button
            type="button"
            onClick={exportCSV}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="doeraBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#087F8C" />
            <stop offset="100%" stopColor="#15966A" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = chartHeight - 32 - pct * (chartHeight - 64);
          return (
            <g key={idx}>
              <line x1={45} y1={y} x2={chartWidth - 10} y2={y} stroke="#F1F5F9" strokeDasharray="3 3" />
              <text x={38} y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8">
                {Math.round(maxValue * pct)}
              </text>
            </g>
          );
        })}

        {/* Bar chart mode */}
        {activeType === 'bar' &&
          data.map((d, idx) => {
            const val = Number(d[valueKey]) || 0;
            const h = (val / maxValue) * (chartHeight - 64);
            const x = 52 + idx * (barWidth + 10);
            const y = chartHeight - 32 - h;

            return (
              <g key={idx}>
                <rect x={x} y={y} width={barWidth} height={h} rx={4} fill="url(#doeraBarGrad)" />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 16}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#64748B"
                  fontWeight="500"
                >
                  {String(d[labelKey] || '').substring(0, 7)}
                </text>
              </g>
            );
          })}

        {/* Line chart mode */}
        {activeType === 'line' && (
          <>
            <polyline
              fill="none"
              stroke="#087F8C"
              strokeWidth="2.5"
              points={data
                .map((d, idx) => {
                  const val = Number(d[valueKey]) || 0;
                  const x = 52 + idx * ((chartWidth - 90) / Math.max(1, data.length - 1));
                  const y = chartHeight - 32 - (val / maxValue) * (chartHeight - 64);
                  return `${x},${y}`;
                })
                .join(' ')}
            />
            {data.map((d, idx) => {
              const val = Number(d[valueKey]) || 0;
              const x = 52 + idx * ((chartWidth - 90) / Math.max(1, data.length - 1));
              const y = chartHeight - 32 - (val / maxValue) * (chartHeight - 64);
              return <circle key={idx} cx={x} cy={y} r={4.5} fill="#15966A" stroke="#FFFFFF" strokeWidth={2} />;
            })}
          </>
        )}
      </svg>
    </div>
  );
};

export default DataChart;
