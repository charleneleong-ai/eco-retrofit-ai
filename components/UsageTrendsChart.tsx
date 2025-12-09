
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { UsageBreakdown, UsageMetric } from '../types';

interface UsageTrendsChartProps {
  data: UsageBreakdown;
  currency: string;
}

const getCurrencySymbol = (code: string) => {
  const c = code ? code.toUpperCase() : '';
  if (c === 'GBP' || c === 'POUND' || c === 'POUNDS') return '£';
  if (c === 'USD' || c === 'DOLLAR' || c === 'DOLLARS') return '$';
  if (c === 'EUR' || c === 'EURO' || c === 'EUROS') return '€';
  return code || '$';
};

// Robust formatter for "Jan 25" or "1 Jan 25"
const formatLabel = (label: string) => {
  if (!label) return '';
  const parts = label.split(' ');
  
  const monthMap: Record<string, string> = {
    Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
    Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
  };

  // Handle "Jan 25" (Month View)
  if (parts.length === 2) {
      const m = monthMap[parts[0]] || parts[0];
      const y = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
      return `${m} ${y}`;
  }
  
  // Handle "1 Jan 25" (Day View / Date Range)
  if (parts.length >= 3) {
      const d = parts[0];
      const m = monthMap[parts[1]] || parts[1];
      const yStr = parts[parts.length - 1].replace("'", "");
      const fullYear = yStr.length === 2 ? `20${yStr}` : yStr;
      return `${d} ${m} ${fullYear}`;
  }
  
  return label;
};

// Helper to parse date from label
const parseDateFromLabel = (label: string): Date | null => {
    try {
        const cleanLabel = label.replace("'", "");
        const parts = cleanLabel.split(' ');
        
        if (parts.length >= 3) {
            const day = parts[0];
            const month = parts[1];
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            
            const date = new Date(`${day} ${month} ${year}`);
            if (!isNaN(date.getTime())) return date;
        } else if (parts.length === 2) {
             let year = parts[1];
             if (year.length === 2) year = '20' + year;
             const date = new Date(`1 ${parts[0]} ${year}`);
             if (!isNaN(date.getTime())) return date;
        }
    } catch (e) {
        return null;
    }
    return null;
};

// --- Custom Calendar Component ---
interface CustomDatePickerProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: Date; // The date currently selected in the chart
    onSelectDate: (date: Date) => void;
    mode: 'day' | 'month'; // 'month' for Month view (selects a whole month), 'day' for Day/Week view
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ isOpen, onClose, currentDate, onSelectDate, mode }) => {
    const [viewDate, setViewDate] = useState(currentDate);

    useEffect(() => {
        if (isOpen) {
            setViewDate(currentDate);
        }
    }, [isOpen, currentDate]);

    if (!isOpen) return null;

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newDate = new Date(viewDate);
        if (mode === 'month') {
            newDate.setFullYear(newDate.getFullYear() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setViewDate(newDate);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newDate = new Date(viewDate);
        if (mode === 'month') {
            newDate.setFullYear(newDate.getFullYear() + 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setViewDate(newDate);
    };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Render Month Grid (for selecting a Month)
    const renderMonthGrid = () => {
        return (
            <div className="grid grid-cols-3 gap-2 p-2">
                {months.map((m, i) => {
                    const isSelected = currentDate.getMonth() === i && currentDate.getFullYear() === viewDate.getFullYear();
                    return (
                        <button
                            key={m}
                            onClick={(e) => {
                                e.stopPropagation();
                                const d = new Date(viewDate.getFullYear(), i, 1);
                                onSelectDate(d);
                                onClose();
                            }}
                            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                                isSelected 
                                ? 'bg-emerald-600 text-white shadow-md' 
                                : 'hover:bg-emerald-50 text-slate-700 hover:text-emerald-700'
                            }`}
                        >
                            {m}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Render Day Grid (for selecting a Day/Week)
    const renderDayGrid = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
        // Adjust for Monday start (0=Mon, 6=Sun)
        const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        // Pad start
        for (let i = 0; i < startOffset; i++) {
            days.push(null);
        }
        // Fill days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return (
            <div className="p-2">
                <div className="grid grid-cols-7 mb-2">
                    {['M','T','W','T','F','S','S'].map((d,i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                        if (d === null) return <div key={`empty-${i}`} />;
                        
                        const thisDate = new Date(year, month, d);
                        // Check if selected (Day mode: exact date. Week mode: check if in same week?)
                        // For simplicity, just check exact date match for styling, parent handles logic
                        const isSelected = thisDate.toDateString() === currentDate.toDateString();
                        const isToday = new Date().toDateString() === thisDate.toDateString();

                        return (
                            <button
                                key={d}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectDate(thisDate);
                                    onClose();
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                                    isSelected 
                                    ? 'bg-emerald-600 text-white font-bold shadow-md' 
                                    : isToday 
                                        ? 'bg-slate-100 text-emerald-600 font-bold border border-emerald-200'
                                        : 'hover:bg-emerald-50 text-slate-700'
                                }`}
                            >
                                {d}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div 
           className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-64 animate-fade-in-up"
           onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
                <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-slate-800">
                    {mode === 'month' ? viewDate.getFullYear() : viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Grid */}
            {mode === 'month' ? renderMonthGrid() : renderDayGrid()}
            
            {/* Footer */}
            <div className="p-2 border-t border-slate-100 flex justify-center">
                 <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-xs text-slate-400 hover:text-slate-600">
                     Close
                 </button>
            </div>
        </div>
    );
};

// --- Main Chart Component ---

const UsageTrendsChart: React.FC<UsageTrendsChartProps> = ({ data, currency }) => {
  const [activeTab, setActiveTab] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Year');
  const [metric, setMetric] = useState<'cost' | 'kwh'>('cost');
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Navigation Indices
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  
  const currencySymbol = getCurrencySymbol(currency);

  // Group daily data into Monday-Sunday weeks
  const weeksData = useMemo(() => {
    if (!data.daily || data.daily.length === 0) return [];
    
    const weeks: UsageMetric[][] = [];
    let currentWeek: UsageMetric[] = [];
    
    data.daily.forEach((day) => {
        const date = parseDateFromLabel(day.label);
        
        if (date) {
            const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday
            
            // If it's Monday and we have a current week running, close it and start new
            // Note: If currentWeek is empty, we just start filling it (even if it's Monday)
            if (dayOfWeek === 1 && currentWeek.length > 0) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        
        currentWeek.push(day);
    });
    
    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }
    
    return weeks;
  }, [data.daily]);

  // Initialize indices
  useEffect(() => {
    if (data.monthly?.length) setSelectedMonthIndex(data.monthly.length - 1);
    if (weeksData.length > 0) setSelectedWeekIndex(weeksData.length - 1);
    if (data.daily?.length) setSelectedDayIndex(data.daily.length - 1);
  }, [data, weeksData.length]); 

  // Reset brush range
  useEffect(() => {
    setBrushRange(null);
  }, [activeTab, selectedMonthIndex, selectedWeekIndex, selectedDayIndex]);

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
            setIsCalendarOpen(false);
        }
    };
    if (isCalendarOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  const generateHourlyData = (dayMetric: UsageMetric) => {
     const hours = [];
     const totalKwh = dayMetric.kwh || 0;
     const totalCost = dayMetric.cost || 0;
     
     // Simple dual-peak profile
     const profile = [
       0.02, 0.02, 0.01, 0.01, 0.01, 0.02, // 00-05
       0.05, 0.08, 0.06, 0.04, 0.04, 0.04, // 06-11
       0.04, 0.04, 0.05, 0.06, 0.08, 0.10, // 12-17
       0.12, 0.08, 0.06, 0.04, 0.02, 0.01  // 18-23
     ];
     
     const sumProfile = profile.reduce((a, b) => a + b, 0);
     
     for(let i=0; i<24; i++) {
        const ratio = profile[i] / sumProfile;
        hours.push({
           label: `${i.toString().padStart(2, '0')}:00`,
           kwh: totalKwh * ratio,
           cost: totalCost * ratio,
        });
     }
     return hours;
  };

  const chartData = useMemo(() => {
    switch (activeTab) {
      case 'Year': 
        return data.monthly || [];
      case 'Month': {
         const targetMonth = data.monthly[selectedMonthIndex];
         if (!targetMonth) return [];
         
         const parts = targetMonth.label.split(' ');
         if (parts.length < 2) return [];
         const m = parts[0]; 
         const y = parts[1]; 

         return data.daily.filter(d => d.label.includes(m) && d.label.includes(y));
      }
      case 'Week': {
         if (weeksData.length === 0) return [];
         const idx = Math.min(Math.max(0, selectedWeekIndex), weeksData.length - 1);
         return weeksData[idx];
      }
      case 'Day': {
         const day = data.daily[selectedDayIndex];
         return day ? generateHourlyData(day) : [];
      }
      default: 
        return data.monthly || [];
    }
  }, [activeTab, data, selectedMonthIndex, selectedWeekIndex, selectedDayIndex, weeksData]);

  const visibleData = useMemo(() => {
    if (!brushRange || !chartData.length) {
      return chartData;
    }
    const start = Math.max(0, brushRange.startIndex);
    const end = Math.min(chartData.length - 1, brushRange.endIndex);
    return chartData.slice(start, end + 1);
  }, [chartData, brushRange]);

  const subtitle = useMemo(() => {
    if (activeTab === 'Year') {
       if (!visibleData.length) return '';
       const first = visibleData[0].label;
       const last = visibleData[visibleData.length - 1].label;
       const y1 = first.match(/\d+$/)?.[0] || '';
       const y2 = last.match(/\d+$/)?.[0] || '';
       
       if (y1 === y2) return y1.length === 2 ? `20${y1}` : y1;
       return (y1 && y2) ? `20${y1}-20${y2}` : '';
    }
    if (activeTab === 'Month') {
       return data.monthly[selectedMonthIndex] ? formatLabel(data.monthly[selectedMonthIndex].label) : '';
    }
    if (activeTab === 'Week') {
       if (chartData.length > 0) {
           const start = formatLabel(chartData[0].label);
           const end = formatLabel(chartData[chartData.length - 1].label);
           return `${start} - ${end}`;
       }
       return '';
    }
    if (activeTab === 'Day') {
        const d = data.daily[selectedDayIndex];
        return d ? formatLabel(d.label) : '';
    }
    return '';
  }, [activeTab, visibleData, data, selectedMonthIndex, selectedWeekIndex, selectedDayIndex, chartData]);

  // Determine current selected Date object for the custom picker
  const currentSelectedDate = useMemo(() => {
    if (activeTab === 'Month') {
        const m = data.monthly[selectedMonthIndex];
        if (m) {
            const d = parseDateFromLabel(m.label);
            if (d) return d;
        }
    } else if (activeTab === 'Week') {
        const week = weeksData[selectedWeekIndex];
        if (week && week[0]) {
            const d = parseDateFromLabel(week[0].label);
            if (d) return d;
        }
    } else if (activeTab === 'Day') {
        const d = data.daily[selectedDayIndex];
        if (d) {
            const date = parseDateFromLabel(d.label);
            if (date) return date;
        }
    }
    return new Date(); // Fallback
  }, [activeTab, selectedMonthIndex, selectedWeekIndex, selectedDayIndex, data, weeksData]);

  // Handle date selection from custom picker
  const handleDateSelect = (date: Date) => {
      const time = date.getTime();
      
      if (activeTab === 'Month') {
          // Match Year and Month
          const idx = data.monthly.findIndex(item => {
              const d = parseDateFromLabel(item.label);
              return d && d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
          });
          if (idx !== -1) setSelectedMonthIndex(idx);
      } else if (activeTab === 'Week') {
          // Match Week
          const idx = weeksData.findIndex(week => {
              const start = parseDateFromLabel(week[0].label);
              const end = parseDateFromLabel(week[week.length - 1].label);
              if (!start || !end) return false;
              // Normalize times for comparison
              const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
              const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).getTime();
              return time >= sTime && time <= eTime;
          });
          if (idx !== -1) setSelectedWeekIndex(idx);
      } else if (activeTab === 'Day') {
          // Match Day
          const idx = data.daily.findIndex(item => {
              const dDate = parseDateFromLabel(item.label);
              return dDate && dDate.toDateString() === date.toDateString();
          });
          if (idx !== -1) setSelectedDayIndex(idx);
      }
  };

  const totalValue = useMemo(() => {
    if (!visibleData.length) return 0;
    return visibleData.reduce((acc, item) => acc + (item[metric] || 0), 0);
  }, [visibleData, metric]);

  const averageValue = useMemo(() => {
    if (!visibleData.length) return 0;
    const total = visibleData.reduce((acc, item) => acc + (item[metric] || 0), 0);
    return total / visibleData.length;
  }, [visibleData, metric]);

  const formatXAxis = (label: string) => {
    if (activeTab === 'Year') return label.charAt(0);
    if (activeTab === 'Month') return label.split(' ')[0]; // "1 Jan 25" -> "1"
    if (activeTab === 'Week') {
        const date = parseDateFromLabel(label);
        if (date) {
            return date.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W
        }
        return label.split(' ')[0];
    }
    if (activeTab === 'Day') {
        return label.split(':')[0]; // "00:00" -> "00"
    }
    return label;
  };

  const handlePrev = () => {
      if (activeTab === 'Month') setSelectedMonthIndex(curr => Math.max(0, curr - 1));
      if (activeTab === 'Week') setSelectedWeekIndex(curr => Math.max(0, curr - 1));
      if (activeTab === 'Day') setSelectedDayIndex(curr => Math.max(0, curr - 1));
  };

  const handleNext = () => {
      if (activeTab === 'Month') setSelectedMonthIndex(curr => Math.min(data.monthly.length - 1, curr + 1));
      if (activeTab === 'Week') setSelectedWeekIndex(curr => Math.min(weeksData.length - 1, curr + 1));
      if (activeTab === 'Day') setSelectedDayIndex(curr => Math.min(data.daily.length - 1, curr + 1));
  };

  const isPrevDisabled = () => {
      if (activeTab === 'Month') return selectedMonthIndex <= 0;
      if (activeTab === 'Week') return selectedWeekIndex <= 0;
      if (activeTab === 'Day') return selectedDayIndex <= 0;
      return true; // Year view has no nav
  };

  const isNextDisabled = () => {
      if (activeTab === 'Month') return selectedMonthIndex >= data.monthly.length - 1;
      if (activeTab === 'Week') return selectedWeekIndex >= weeksData.length - 1;
      if (activeTab === 'Day') return selectedDayIndex >= data.daily.length - 1;
      return true;
  };
  
  const showNav = activeTab !== 'Year';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        
        {/* Left Header: Title + Subtitle/Nav */}
        <div>
           <h3 className="text-xl font-bold text-slate-800">Usage Trends</h3>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                {activeTab} Overview
              </span>
              
              {/* Dynamic Subtitle / Navigation */}
              <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 relative">
                 {showNav && (
                    <button onClick={handlePrev} disabled={isPrevDisabled()} className="hover:text-emerald-700 disabled:opacity-30 p-0.5">
                       <ChevronLeft className="w-3 h-3" />
                    </button>
                 )}
                 
                 {/* Navigation Label + Custom Date Picker Trigger */}
                 <div 
                    className="relative flex items-center justify-center group cursor-pointer" 
                    ref={calendarRef}
                    onClick={() => {
                        if(showNav) setIsCalendarOpen(!isCalendarOpen);
                    }}
                 >
                    <span className={`text-xs text-emerald-600 font-bold text-center select-none ${activeTab === 'Week' ? 'min-w-[140px]' : 'min-w-[60px]'}`}>
                        {subtitle}
                    </span>
                    {showNav && (
                       <CalendarIcon className="w-3 h-3 text-emerald-400 ml-1.5" />
                    )}

                    {/* Custom Popup */}
                    <CustomDatePicker 
                        isOpen={isCalendarOpen} 
                        onClose={() => setIsCalendarOpen(false)}
                        currentDate={currentSelectedDate}
                        onSelectDate={handleDateSelect}
                        mode={activeTab === 'Month' ? 'month' : 'day'}
                    />
                 </div>

                 {showNav && (
                    <button onClick={handleNext} disabled={isNextDisabled()} className="hover:text-emerald-700 disabled:opacity-30 p-0.5">
                       <ChevronRight className="w-3 h-3" />
                    </button>
                 )}
              </div>
           </div>
        </div>

        {/* Right Header: Controls */}
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
           <div className="flex items-center gap-3 self-end">
              {/* Metric Toggle */}
              <div className="hidden sm:flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setMetric('cost')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${metric === 'cost' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {currencySymbol}
                  </button>
                  <button 
                    onClick={() => setMetric('kwh')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${metric === 'kwh' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    kWh
                  </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['Day', 'Week', 'Month', 'Year'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => {
                          setActiveTab(tab as any);
                          setIsCalendarOpen(false); // Close calendar on tab switch
                      }}
                      className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                        activeTab === tab 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab}
                    </button>
                ))}
              </div>
           </div>
           
           {/* Stats Display: Total & Average */}
           <div className="flex flex-wrap justify-end items-center gap-x-6 gap-y-2 self-end mt-1">
              {/* Average */}
              <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Average:</span>
                  <span className="text-lg font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 border-dashed flex items-center">
                    {metric === 'cost' ? currencySymbol : ''}
                    {averageValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    {metric === 'kwh' && <span className="font-medium ml-1">kWh</span>}
                  </span>
              </div>

              {/* Total */}
              <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total:</span>
                  <span className="text-lg font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center">
                    {metric === 'cost' ? currencySymbol : ''}
                    {totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    {metric === 'kwh' && <span className="font-medium ml-1 text-slate-500">kWh</span>}
                  </span>
              </div>
           </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            key={activeTab + selectedMonthIndex + selectedWeekIndex + selectedDayIndex} 
            data={chartData} 
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
              tickFormatter={formatXAxis}
              dy={10}
              minTickGap={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8' }} 
              tickFormatter={(val) => metric === 'cost' ? `${currencySymbol}${val}` : val.toString()}
            />
            <Tooltip 
               content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataItem = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl min-w-[120px] text-center z-50">
                        <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">{label}</p>
                        
                        {/* Primary Value (Large) */}
                        <div className="mb-1">
                          <p className="text-xl font-bold text-slate-800 leading-none">
                             {metric === 'cost' ? currencySymbol : ''}
                             {Number(payload[0].value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                             {metric === 'kwh' && <span className="text-sm font-medium text-slate-500 ml-1">kWh</span>}
                          </p>
                        </div>
                        
                        {/* Secondary Value (Small) - Shows the other metric */}
                        <div className="text-xs text-slate-500 font-medium mt-1 pt-1 border-t border-slate-100">
                           {metric === 'cost' 
                             ? <span>{dataItem.kwh?.toLocaleString(undefined, {maximumFractionDigits: 1})} kWh</span>
                             : <span>{currencySymbol}{dataItem.cost?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                           }
                        </div>
                      </div>
                    );
                  }
                  return null;
               }}
               cursor={{ fill: '#f8fafc' }} 
            />
            
            <ReferenceLine y={averageValue} stroke="#f59e0b" strokeDasharray="5 5" />

            <Bar 
              dataKey={metric} 
              fill="#10b981" 
              radius={[4, 4, 4, 4]} 
              barSize={activeTab === 'Year' ? 40 : undefined} 
            />
            
            {/* Show Brush for all views. Color set to Light Green. */}
            <Brush 
                dataKey="label" 
                height={20} 
                stroke="#10b981"
                fill="#d1fae5"
                tickFormatter={() => ''}
                travellerWidth={10}
                className="opacity-50"
                onChange={(range: any) => {
                  if (range && typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
                    setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                  }
                }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UsageTrendsChart;
