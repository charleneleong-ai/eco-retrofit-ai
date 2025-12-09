
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';
import { UsageBreakdown } from '../types';
import { ToggleLeft, ToggleRight } from 'lucide-react';

interface UsageTrendsChartProps {
  data: UsageBreakdown;
  currency: string;
}

const UsageTrendsChart: React.FC<UsageTrendsChartProps> = ({ data, currency }) => {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [metric, setMetric] = useState<'kwh' | 'cost'>('cost');
  const [showAverage, setShowAverage] = useState(false);
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});

  // Reset brush range when view changes to avoid index out of bounds
  useEffect(() => {
    setBrushRange({});
  }, [view]);

  const chartData = (data && data[view]) ? data[view] : [];

  // Calculate average dynamically based on the zoomed/brushed range
  const averageValue = useMemo(() => {
    if (!chartData.length) return 0;
    
    // Default to full range if brush hasn't been moved
    const start = brushRange.startIndex ?? 0;
    const end = brushRange.endIndex ?? chartData.length - 1;
    
    // Slice data to only include visible bars
    const visibleData = chartData.slice(start, end + 1);
    if (visibleData.length === 0) return 0;

    const total = visibleData.reduce((acc, item) => acc + (item[metric] || 0), 0);
    return total / visibleData.length;
  }, [chartData, metric, brushRange]);

  const formattedAverage = metric === 'cost' 
    ? `${currency}${averageValue.toFixed(2)}` 
    : `${averageValue.toFixed(1)} kWh`;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-bold text-slate-800">Usage Trends</h3>
        
        <div className="flex flex-wrap items-center gap-2">
           {/* Average Toggle */}
           <button
             onClick={() => setShowAverage(!showAverage)}
             className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
               showAverage 
                 ? 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200' 
                 : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
             }`}
           >
             {showAverage ? <ToggleRight className="w-4 h-4 text-amber-600" /> : <ToggleLeft className="w-4 h-4" />}
             {showAverage ? `Avg: ${formattedAverage}` : 'Show Avg'}
           </button>
           
           <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

           <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
             {/* View Tabs */}
             {['daily', 'weekly', 'monthly'].map((v) => (
                <button 
                  key={v}
                  onClick={() => setView(v as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${view === v ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {v}
                </button>
             ))}
           </div>
        </div>
      </div>

      <div className="h-72 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                dy={10}
                minTickGap={30} // Prevents overlap on large datasets like Daily
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                tickFormatter={(val) => metric === 'cost' ? `${currency}${val}` : val}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [
                  metric === 'cost' ? `${currency}${value.toFixed(2)}` : `${value.toFixed(1)} kWh`, 
                  metric === 'cost' ? 'Cost' : 'Energy'
                ]}
              />
              <Bar 
                dataKey={metric} 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
              
              {showAverage && (
                <ReferenceLine 
                    y={averageValue} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4"
                    label={{ 
                        position: 'right', 
                        value: `Avg: ${formattedAverage}`, 
                        fill: '#d97706',
                        fontSize: 10,
                        fontWeight: 600
                    }} 
                />
              )}

              {/* Slider (Brush) enabled for all views if enough data exists */}
              {chartData.length > 1 && (
                 <Brush 
                    dataKey="label" 
                    height={30} 
                    stroke="#10b981" 
                    fill="#ecfdf5" 
                    tickFormatter={() => ''}
                    alwaysShowText={false}
                    onChange={(e: any) => setBrushRange(e)}
                 />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No data available for this view
          </div>
        )}
      </div>
      
      <div className="flex justify-center mt-6 gap-4">
          <button onClick={() => setMetric('cost')} className={`text-xs font-medium flex items-center gap-1 ${metric === 'cost' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${metric === 'cost' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            Cost ({currency})
          </button>
          <button onClick={() => setMetric('kwh')} className={`text-xs font-medium flex items-center gap-1 ${metric === 'kwh' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${metric === 'kwh' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            Energy (kWh)
          </button>
      </div>
    </div>
  );
};

export default UsageTrendsChart;
