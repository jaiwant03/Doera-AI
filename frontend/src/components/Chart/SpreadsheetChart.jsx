import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Download,
  Table as TableIcon,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import './SpreadsheetChart.css';

const PALETTE = [
  '#FF55BD', // Neon Pink / Magenta
  '#9C52E8', // Royal Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#F97316', // Orange
];

/**
 * Custom Dark Theme Tooltip for Recharts
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload || {};
    const val = payload[0].value;
    const formattedVal = typeof val === 'number' ? val.toLocaleString() : val;
    const name = dataItem.name || dataItem.label || label || 'Item';
    const pct = dataItem.percentage !== undefined && dataItem.percentage !== null ? `${dataItem.percentage}%` : null;

    return (
      <div className="doera-chart-tooltip">
        <div className="doera-tooltip-title">{name}</div>
        <div className="doera-tooltip-row">
          <span>{payload[0].name || 'Value'}:</span>
          <strong>{formattedVal}</strong>
        </div>
        {pct && (
          <div className="doera-tooltip-row" style={{ marginTop: 2 }}>
            <span>Share:</span>
            <span style={{ color: '#06B6D4', fontWeight: 600 }}>{pct}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const SpreadsheetChart = ({ chartConfig }) => {
  if (!chartConfig || !Array.isArray(chartConfig.data) || chartConfig.data.length === 0) {
    return null;
  }

  // Active chart type switcher state (bar, horizontal_bar, line, area, pie, doughnut, scatter)
  const initialType = (chartConfig.chartType || 'bar').toLowerCase();
  const [currentType, setCurrentType] = useState(initialType);
  const [showDataTable, setShowDataTable] = useState(false);
  const [isExported, setIsExported] = useState(false);

  // Normalize data array
  const data = useMemo(() => {
    return chartConfig.data.map((item, idx) => ({
      ...item,
      name: item.name || item.label || `Item ${idx + 1}`,
      value: Number(item.value) || 0,
      fill: item.color || PALETTE[idx % PALETTE.length],
    }));
  }, [chartConfig.data]);

  const seriesName = chartConfig.series?.[0]?.name || chartConfig.yAxis?.label || 'Value';
  const xAxisLabel = chartConfig.xAxis?.label || 'Dimension';
  const yAxisLabel = chartConfig.yAxis?.label || 'Total';

  // Export data as CSV
  const handleExportCSV = () => {
    const headers = [xAxisLabel, yAxisLabel, 'Percentage'];
    const lines = [headers.join(',')];
    data.forEach((d) => {
      const name = `"${String(d.name).replace(/"/g, '""')}"`;
      const val = d.value;
      const pct = d.percentage !== undefined && d.percentage !== null ? `${d.percentage}%` : '';
      lines.push(`${name},${val},${pct}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(chartConfig.title || 'doera-chart-data').toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setIsExported(true);
    setTimeout(() => setIsExported(false), 2500);
  };

  const stats = chartConfig.summaryStats || {};

  return (
    <div className="doera-chart-card">
      {/* 1. Header with Title & Live Chart Switcher */}
      <div className="doera-chart-header">
        <div className="doera-chart-title-area">
          <div className="doera-chart-title-row">
            <h4 className="doera-chart-title">{chartConfig.title || 'Dynamic Data Visualization'}</h4>
            <span className="doera-chart-badge">DOERA Verified Chart</span>
          </div>
          {chartConfig.description && (
            <p className="doera-chart-description">{chartConfig.description}</p>
          )}
        </div>

        {/* Live Chart Type Switcher Pills */}
        <div className="doera-chart-controls">
          <button
            type="button"
            className={`doera-chart-type-pill ${currentType === 'bar' ? 'active' : ''}`}
            onClick={() => setCurrentType('bar')}
            title="Vertical Bar Chart"
          >
            <BarChart3 size={13} />
            <span>Bar</span>
          </button>

          <button
            type="button"
            className={`doera-chart-type-pill ${currentType === 'horizontal_bar' ? 'active' : ''}`}
            onClick={() => setCurrentType('horizontal_bar')}
            title="Horizontal Bar Chart"
          >
            <Layers size={13} />
            <span>Horizontal</span>
          </button>

          <button
            type="button"
            className={`doera-chart-type-pill ${currentType === 'line' ? 'active' : ''}`}
            onClick={() => setCurrentType('line')}
            title="Line Trend Chart"
          >
            <LineChartIcon size={13} />
            <span>Line</span>
          </button>

          <button
            type="button"
            className={`doera-chart-type-pill ${currentType === 'area' ? 'active' : ''}`}
            onClick={() => setCurrentType('area')}
            title="Area Chart"
          >
            <AreaChartIcon size={13} />
            <span>Area</span>
          </button>

          <button
            type="button"
            className={`doera-chart-type-pill ${currentType === 'pie' || currentType === 'doughnut' ? 'active' : ''}`}
            onClick={() => setCurrentType(currentType === 'pie' ? 'doughnut' : 'pie')}
            title={currentType === 'doughnut' ? 'Switch to Solid Pie' : 'Switch to Doughnut'}
          >
            <PieChartIcon size={13} />
            <span>{currentType === 'doughnut' ? 'Doughnut' : 'Pie'}</span>
          </button>

          {/* Action Tools: Data Table & CSV Export */}
          <button
            type="button"
            className="doera-chart-action-btn"
            onClick={() => setShowDataTable(!showDataTable)}
            title="Toggle Raw Data Table"
          >
            <TableIcon size={13} />
            <span>{showDataTable ? 'Hide Data' : 'View Data'}</span>
          </button>

          <button
            type="button"
            className="doera-chart-action-btn"
            onClick={handleExportCSV}
            title="Export Data as CSV"
          >
            <Download size={13} />
            <span>{isExported ? 'Exported!' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Summary Stats Quick Bar */}
      {(stats.total !== undefined || stats.average !== undefined || stats.topItem) && (
        <div className="doera-chart-stats-bar">
          {stats.total !== undefined && (
            <div className="doera-stat-item">
              Total Volume: <strong>{Number(stats.total).toLocaleString()}</strong>
            </div>
          )}
          {stats.average !== undefined && (
            <div className="doera-stat-item">
              Average Mean: <strong>{Number(stats.average).toFixed(2)}</strong>
            </div>
          )}
          {stats.topItem && (
            <div className="doera-stat-item">
              Leading Segment: <strong className="stat-highlight">{stats.topItem}</strong>
            </div>
          )}
          {stats.count !== undefined && (
            <div className="doera-stat-item">
              Segments: <strong>{stats.count}</strong>
            </div>
          )}
        </div>
      )}

      {/* 3. Recharts Dynamic Visual Canvas */}
      <div className="doera-chart-canvas-wrap">
        <ResponsiveContainer width="100%" height={320}>
          {currentType === 'horizontal_bar' ? (
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#251630" horizontal={false} />
              <XAxis
                type="number"
                stroke="#8A7A96"
                tick={{ fill: '#B9AEBE', fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8A7A96"
                tick={{ fill: '#EDE4EE', fontSize: 11, fontWeight: 500 }}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#EDE4EE', fontSize: 11.5 }} />
              <Bar dataKey="value" name={seriesName} fill="#9C52E8" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`hbar-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : currentType === 'line' ? (
            <LineChart data={data} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#251630" />
              <XAxis
                dataKey="name"
                stroke="#8A7A96"
                tick={{ fill: '#B9AEBE', fontSize: 11 }}
                interval={0}
                angle={data.length > 6 ? -25 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
              />
              <YAxis
                stroke="#8A7A96"
                tick={{ fill: '#B9AEBE', fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#EDE4EE', fontSize: 11.5 }} />
              <Line
                type="monotone"
                dataKey="value"
                name={seriesName}
                stroke="#FF55BD"
                strokeWidth={3}
                dot={{ r: 5, fill: '#FF55BD', stroke: '#150C1C', strokeWidth: 2 }}
                activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </LineChart>
          ) : currentType === 'area' ? (
            <AreaChart data={data} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="doeraAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF55BD" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#9C52E8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#251630" />
              <XAxis
                dataKey="name"
                stroke="#8A7A96"
                tick={{ fill: '#B9AEBE', fontSize: 11 }}
                angle={data.length > 6 ? -25 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
              />
              <YAxis
                stroke="#8A7A96"
                tick={{ fill: '#B9AEBE', fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#EDE4EE', fontSize: 11.5 }} />
              <Area
                type="monotone"
                dataKey="value"
                name={seriesName}
                stroke="#FF55BD"
                strokeWidth={2.5}
                fill="url(#doeraAreaGrad)"
              />
            </AreaChart>
          ) : currentType === 'pie' || currentType === 'doughnut' ? (
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#EDE4EE', fontSize: 11.5 }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={105}
                innerRadius={currentType === 'doughnut' ? 58 : 0}
                paddingAngle={currentType === 'doughnut' ? 3 : 1}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: '#8A7A96', strokeWidth: 1 }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`pie-cell-${index}`}
                    fill={PALETTE[index % PALETTE.length]}
                    stroke="#130B1A"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          ) : (
            /* Default: Vertical Bar Chart */
            <BarChart data={data} margin={{ top: 20, right: 25, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#251630" />
              <XAxis
                dataKey="name"
                stroke="#8A7A96"
                tick={{ fill: '#B9AEBE', fontSize: 11 }}
                angle={data.length > 6 ? -25 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
              />
              <YAxis
                stroke="#8A7A96"
                tick={{ fill: '#B9AEBE', fontSize: 11 }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#EDE4EE', fontSize: 11.5 }} />
              <Bar dataKey="value" name={seriesName} fill="#FF55BD" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 4. Collapsible Ground-Truth Data Table */}
      {showDataTable && (
        <div className="doera-chart-data-table-wrap">
          <table className="doera-chart-data-table">
            <thead>
              <tr>
                <th>{xAxisLabel}</th>
                <th>{yAxisLabel}</th>
                <th>Distribution Share</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={`table-row-${idx}`}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: PALETTE[idx % PALETTE.length],
                          display: 'inline-block',
                        }}
                      />
                      <strong>{row.name}</strong>
                    </span>
                  </td>
                  <td>{row.value.toLocaleString()}</td>
                  <td>
                    {row.percentage !== undefined && row.percentage !== null
                      ? `${row.percentage}%`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SpreadsheetChart;
