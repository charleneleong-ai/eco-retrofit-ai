
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getCurrencySymbol } from '../utils';

interface SavingsChartProps {
  current: number;
  projected: number;
  currency: string;
  label?: string;
  savings?: number;
  currentKwh?: number;
  projectedKwh?: number;
}

const SavingsChart: React.FC<SavingsChartProps> = ({ 
  current, 
  projected, 
  currency, 
  label = 'Monthly Cost',
  savings,
  currentKwh,
  projectedKwh
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const data = [
    {
      name: label,
      Current: current,
      Projected: projected,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-slate-200 text-left z-50 max-w-[200px]">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">{label}</p>
          
          <div className="space-y-3">
             {/* Current */}
             <div>
                <div className="flex items-center justify-between gap-4">
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                      <span className="text-xs font-medium text-slate-500">Current</span>
                   </div>
                   <span className="text-sm font-bold text-slate-800">
                      {currencySymbol}{payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </span>
                </div>
                {currentKwh && currentKwh > 0 && (
                   <p className="text-[10px] text-slate-400 text-right mt-0.5">
                      ~{Math.round(currentKwh)} kWh
                   </p>
                )}
             </div>

             {/* Projected */}
             <div>
                <div className="flex items-center justify-between gap-4">
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-medium text-slate-500">Projected</span>
                   </div>
                   <span className="text-sm font-bold text-emerald-600">
                      {currencySymbol}{payload[1].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </span>
                </div>
                {projectedKwh && projectedKwh > 0 && (
                   <p className="text-[10px] text-emerald-600/60 text-right mt-0.5">
                      ~{Math.round(projectedKwh)} kWh
                   </p>
                )}
             </div>
             
             {/* Explanation */}
             {savings && savings > 0 && (
                <div className="pt-2 mt-1 border-t border-slate-100">
                   <p className="text-[10px] text-emerald-700 leading-snug">
                      Save <strong>{currencySymbol}{savings.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong> with selected actions.
                   </p>
                </div>
             )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide width={10} />
          <Tooltip 
            cursor={{fill: 'transparent'}}
            content={<CustomTooltip />}
            wrapperStyle={{ outline: 'none' }}
          />
          <Bar dataKey="Current" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={80} />
          <Bar dataKey="Projected" fill="#10b981" radius={[0, 4, 4, 0]} barSize={80} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SavingsChart;
