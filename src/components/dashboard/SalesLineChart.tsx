import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { formatMoney, formatCurrencyShort } from '../../utils/format';
import { exportSalesTrendsCsv } from '../../utils/csvExport';
import { TrendingUp, Calendar, Layers, DollarSign, Download } from 'lucide-react';

export interface DaySalesData {
  day: string;
  dateLabel: string;
  ca: number;
  marge: number;
  nombreVentes: number;
}

interface SalesLineChartProps {
  data: DaySalesData[];
  caJour: number;
  margeJour: number;
}

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload as DaySalesData;
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-white text-xs">{dataItem.day}</span>
          <span className="text-[10px] text-slate-400 font-mono">{dataItem.dateLabel}</span>
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name} :
            </span>
            <span className="font-mono font-bold text-white">
              {formatMoney(entry.value)}
            </span>
          </div>
        ))}
        <div className="pt-1 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-400">
          <span>Tickets encaissés :</span>
          <span className="font-bold font-mono text-slate-200">{dataItem.nombreVentes}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const SalesLineChart: React.FC<SalesLineChartProps> = ({ data, caJour, margeJour }) => {
  const [viewMode, setViewMode] = useState<'ALL' | 'CA_ONLY' | 'MARGE_ONLY'>('ALL');

  // Compute 7-day totals
  const total7DaysCA = data.reduce((acc, d) => acc + d.ca, 0);
  const total7DaysMarge = data.reduce((acc, d) => acc + d.marge, 0);
  const avgDailyCA = Math.round(total7DaysCA / data.length);

  // Compact axis values follow the active CDF/USD display setting.
  const formatYAxis = (value: number) => formatCurrencyShort(value);

  return (
    <div className="p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="font-black text-white text-base tracking-tight">
              Tendance des Ventes (7 Derniers Jours)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
              Recharts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Courbe d'évolution du Chiffre d'Affaires et des Marges Brutes Réalisées.
          </p>
        </div>

        {/* View mode toggle & CSV export */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-750 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'ALL'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CA + Marge
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CA_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'CA_ONLY'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CA Seul
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MARGE_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'MARGE_ONLY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Marge Seule
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportSalesTrendsCsv(data)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Télécharger les données 7 jours en fichier CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">CSV 7J</span>
          </button>
        </div>
      </div>

      {/* Quick summary ribbons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
        <div>
          <span className="text-slate-400 text-[11px] block">Total 7 Jours (CA) :</span>
          <span className="font-extrabold text-white font-mono text-sm sm:text-base">
            {formatMoney(total7DaysCA)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[11px] block">Moyenne Quotidienne :</span>
          <span className="font-bold text-orange-400 font-mono text-sm sm:text-base">
            {formatMoney(avgDailyCA)} / j
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-slate-400 text-[11px] block">Marge Nette 7 Jours :</span>
          <span className="font-bold text-emerald-400 font-mono text-sm sm:text-base">
            +{formatMoney(total7DaysMarge)}
          </span>
        </div>
      </div>

      {/* Recharts Responsive Line Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="caLineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />

            <XAxis
              dataKey="day"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <YAxis
              stroke="#94A3B8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
            />

            {(viewMode === 'ALL' || viewMode === 'CA_ONLY') && (
              <Line
                type="monotone"
                dataKey="ca"
                name="Chiffre d'Affaires"
                stroke="#F97316"
                strokeWidth={3}
                dot={{ r: 4, fill: '#F97316', stroke: '#0F172A', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#F97316', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}

            {(viewMode === 'ALL' || viewMode === 'MARGE_ONLY') && (
              <Line
                type="monotone"
                dataKey="marge"
                name="Marge Nette"
                stroke="#10B981"
                strokeWidth={2.5}
                strokeDasharray={viewMode === 'ALL' ? '4 2' : undefined}
                dot={{ r: 3.5, fill: '#10B981', stroke: '#0F172A', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
