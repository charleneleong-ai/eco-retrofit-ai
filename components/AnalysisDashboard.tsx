
import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisResult, HomeProfile, Recommendation, ComparisonFactor } from '../types';
import SavingsChart from './SavingsChart';
import UsageTrendsChart from './UsageTrendsChart';
import EPCBadge from './EPCBadge';
import HomeProfileModal from './HomeProfileModal';
import RetrofitVisualizer from './RetrofitVisualizer';
import Demo3DView from './Demo3DView';
import { updateBenchmark } from '../services/geminiService';
import { parseSavingsValue, getCurrencySymbol } from '../utils';
import ReactMarkdown, { Components } from 'react-markdown';
import { ArrowDown, Zap, Thermometer, Home, AlertCircle, Users, ExternalLink, BookOpen, MapPin, User, Calendar, PlusCircle, FileText, Video, Image as ImageIcon, Download, ArrowRight, CheckCircle2, Circle, SlidersHorizontal, LineChart, HelpCircle, Coins, Timer, Layers, Pencil, Sparkles, Satellite, Plus, Minus, Grid, PanelRightClose, PanelRightOpen, Globe, UserCheck, Activity, Info, Brain } from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
  onUpdateAnalysis?: () => void;
  onEPCUpload?: (file: File) => void;
  isUpdatingEPC?: boolean;
  initialSelectedIndices?: number[];
  onSelectionChange?: (indices: number[]) => void;
  homeImages?: string[];
  isDemoMode?: boolean;
}

const FactorItem: React.FC<{ factor: ComparisonFactor }> = ({ factor }) => {
    const [isHovered, setIsHovered] = useState(false);
    const isLivingPattern = factor.label.toLowerCase().includes('pattern') || factor.label.toLowerCase().includes('occupancy') || factor.label.toLowerCase().includes('load') || factor.label.toLowerCase().includes('preference');

    return (
        <div 
            className="group py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors -mx-2 px-2 rounded-lg relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            {isLivingPattern ? <UserCheck className="w-3 h-3 text-emerald-500" /> : <Home className="w-3 h-3 text-slate-400" />}
                            {factor.label}
                        </span>
                    </div>
                    <div className={`text-[10px] px-3 py-1.5 rounded-lg rounded-tr-sm font-medium leading-relaxed max-w-[70%] text-left border shadow-sm ${isLivingPattern ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        {factor.variance}
                    </div>
                </div>
                <div className="flex items-center justify-between pl-1">
                    <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLivingPattern ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                        {factor.userValue}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md">vs {factor.localAvg}</div>
                        {factor.explanation && (
                            <Info className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-400 transition-colors cursor-help" />
                        )}
                    </div>
                </div>
            </div>

            {/* Methodology Pop-up (Explanation) */}
            {isHovered && factor.explanation && (
                <div className="absolute left-0 right-0 bottom-full mb-2 z-50 animate-fade-in-up">
                    <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-purple-100 ring-1 ring-slate-900/5 max-w-sm">
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Brain className="w-3 h-3" /> AI Methodology
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{factor.explanation}"
                        </p>
                        <div className="absolute left-6 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white/95"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnalysisDashboard: React.FC<DashboardProps> = ({ 
  data: initialData, 
  onUpdateAnalysis, 
  onEPCUpload, 
  isUpdatingEPC = false,
  initialSelectedIndices,
  onSelectionChange,
  homeImages = [],
  isDemoMode = false
}) => {
  const [data, setData] = useState<AnalysisResult>(initialData);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualizerTarget, setVisualizerTarget] = useState<{title: string, category: string} | null>(null);
  const [mapView, setMapView] = useState<'satellite' | 'roadmap' | 'plan'>('plan');
  const [zoomLevel, setZoomLevel] = useState<number>(20);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  const scrollToPanel = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => { setData(initialData); }, [initialData]);

  const [selectedRecs, setSelectedRecs] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Yearly');

  useEffect(() => {
    if (data.recommendations) {
      if (initialSelectedIndices && initialSelectedIndices.length > 0) {
        setSelectedRecs(new Set(initialSelectedIndices));
      } else if (!initialSelectedIndices) {
        setSelectedRecs(new Set(data.recommendations.map((_, i) => i)));
      } else {
        setSelectedRecs(new Set());
      }
    }
  }, [data.recommendations, initialSelectedIndices]);

  const handleProfileSave = async (newProfile: HomeProfile) => {
      try {
          const newComparison = await updateBenchmark(data, newProfile);
          setData(prev => ({ ...prev, homeProfile: newProfile, comparison: newComparison }));
      } catch (error) {
          alert("Could not update benchmark comparison.");
      }
  };

  const openVisualizer = (e: React.MouseEvent, rec: Recommendation) => {
      e.stopPropagation();
      setVisualizerTarget({ title: rec.title, category: rec.category });
      setIsVisualizerOpen(true);
  };

  const handleMapSwitch = (type: 'satellite' | 'roadmap' | 'plan') => {
      setMapView(type);
      if (type !== 'plan') setZoomLevel(type === 'satellite' ? 20 : 19);
  };

  const handleZoom = (direction: 'in' | 'out') => {
      setZoomLevel(prev => direction === 'in' ? Math.min(prev + 1, 21) : Math.max(prev - 1, 12));
  };

  const calculatedAnnualSavings = useMemo(() => {
    return data.recommendations.reduce((acc, rec, idx) => {
      if (selectedRecs.has(idx)) return acc + parseSavingsValue(rec.estimatedAnnualSavings);
      return acc;
    }, 0);
  }, [data.recommendations, selectedRecs]);

  const calculatedInvestment = useMemo(() => {
    return data.recommendations.reduce((acc, rec, idx) => {
      if (selectedRecs.has(idx)) return acc + parseSavingsValue(rec.estimatedCost);
      return acc;
    }, 0);
  }, [data.recommendations, selectedRecs]);

  const currentAnnualCost = data.currentMonthlyAvg * 12;
  const projectedAnnualCost = Math.max(0, currentAnnualCost - calculatedAnnualSavings);
  const paybackPeriodYears = calculatedAnnualSavings > 0 ? calculatedInvestment / calculatedAnnualSavings : 0;

  let divisor = 12;
  if (viewMode === 'Weekly') divisor = 52;
  if (viewMode === 'Daily') divisor = 365;
  if (viewMode === 'Yearly') divisor = 1;

  const displayCurrent = currentAnnualCost / divisor;
  const displayProjected = projectedAnnualCost / divisor;
  const displaySavings = calculatedAnnualSavings / divisor;
  const savingsPercent = Math.round((calculatedAnnualSavings / currentAnnualCost) * 100);

  const { currentKwh, projectedKwh } = useMemo(() => {
     if (!data.usageBreakdown?.monthly) return { currentKwh: 0, projectedKwh: 0 };
     const totalAnnualKwh = data.usageBreakdown.monthly.reduce((acc, m) => acc + (m.kwh || 0), 0);
     const currentAvgKwh = totalAnnualKwh / divisor;
     const percentSaved = currentAnnualCost > 0 ? calculatedAnnualSavings / currentAnnualCost : 0;
     const projectedAvgKwh = currentAvgKwh * (1 - percentSaved);
     return { currentKwh: currentAvgKwh, projectedKwh: projectedAvgKwh };
  }, [data.usageBreakdown, calculatedAnnualSavings, currentAnnualCost, divisor]);

  const toggleRec = (index: number) => {
    const newSet = new Set(selectedRecs);
    if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
    setSelectedRecs(newSet);
    if (onSelectionChange) onSelectionChange(Array.from(newSet));
  };

  const getImpactColor = (impact: string) => {
    switch(impact) {
      case 'High': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getCostBadgeColor = (costStr: string) => {
    const val = parseSavingsValue(costStr);
    if (val < 100) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (val < 1000) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-rose-50 text-rose-700 border-rose-100';
  };
  
  const getCostLabel = (costStr: string) => {
    const val = parseSavingsValue(costStr);
    if (val < 100) return 'Low Cost';
    if (val < 1000) return 'Medium Cost';
    return 'High Cost';
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'Insulation': return <Home className="w-5 h-5 text-indigo-500" />;
      case 'Heating': return <Thermometer className="w-5 h-5 text-rose-500" />;
      case 'Solar': return <Zap className="w-5 h-5 text-amber-500" />;
      default: return <AlertCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        return (
          <a key={i} href={`#ref-${index}`} className="text-emerald-600 font-bold hover:underline cursor-pointer inline-block mx-0.5">{part}</a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const MarkdownComponents: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{React.Children.map(children, (child) => typeof child === 'string' ? renderTextWithCitations(child) : child)}</p>,
    li: ({ children }) => <li className="mb-1">{React.Children.map(children, (child) => typeof child === 'string' ? renderTextWithCitations(child) : child)}</li>
  };

  const mapUrl = useMemo(() => {
    const query = encodeURIComponent(data.address || 'London, UK');
    const type = mapView === 'satellite' ? 'h' : 'm'; 
    return `https://maps.google.com/maps?q=${query}&t=${type}&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;
  }, [data.address, mapView, zoomLevel]);

  const currencySymbol = getCurrencySymbol(data.currency);

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <div className="bg-emerald-100 p-1.5 rounded-full"><Home className="w-4 h-4 text-emerald-600" /></div>
             <h1 className="text-xl font-bold text-slate-800">Retrofit Action Plan</h1>
           </div>
           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {data.customerName || 'Valued Customer'}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {data.address || 'Address not detected'}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {data.auditDate || new Date().toLocaleDateString()}</span>
           </div>
        </div>
        {onUpdateAnalysis && <button onClick={onUpdateAnalysis} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-md"><PlusCircle className="w-4 h-4" /></button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col h-full ${data.epc ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
          <h3 className="text-xl font-bold text-slate-800 mb-4">Executive Summary</h3>
          <div className="prose prose-slate max-w-none text-slate-600 text-sm flex-1 leading-relaxed">
            <ReactMarkdown components={MarkdownComponents}>{data.summary}</ReactMarkdown>
          </div>
        </div>
        {data.epc && <div className="lg:col-span-2 h-full"><EPCBadge epcData={data.epc} isLoading={isUpdatingEPC} onFileSelected={onEPCUpload} className="h-full" /></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[280px_1fr] gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 md:col-span-1 lg:col-span-1">
          <p className="text-sm font-medium text-slate-500">Projected Annual Savings</p>
          <div className="flex items-end gap-3 mt-1">
            <h2 className="text-4xl font-bold text-emerald-600">{currencySymbol}{Math.round(calculatedAnnualSavings).toLocaleString()}</h2>
            <span className="text-emerald-600 font-medium mb-1 flex items-center"><ArrowDown className="w-4 h-4 mr-0.5" />{savingsPercent}%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Based on selected {selectedRecs.size}/{data.recommendations.length} actions</p>
          <div className="grid grid-cols-2 gap-4 mt-5">
             <div className="relative group cursor-help">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">Investment <HelpCircle className="w-3 h-3 text-slate-300" /></p>
                <div className="flex items-center gap-1.5"><div className="bg-slate-100 p-1 rounded-md"><Coins className="w-3.5 h-3.5 text-slate-500" /></div><span className="font-bold text-slate-700 text-sm">{currencySymbol}{Math.round(calculatedInvestment).toLocaleString()}</span></div>
             </div>
             <div className="relative group cursor-help">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">Payback <HelpCircle className="w-3 h-3 text-slate-300" /></p>
                <div className="flex items-center gap-1.5"><div className="bg-slate-100 p-1 rounded-md"><Timer className="w-3.5 h-3.5 text-slate-500" /></div><span className="font-bold text-slate-700 text-sm">{paybackPeriodYears <= 0 ? '-' : paybackPeriodYears < 1 ? '< 1 Year' : `${paybackPeriodYears.toFixed(1)} Years`}</span></div>
             </div>
          </div>
        </div>

        <div id="savings-panel" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 md:col-span-2 lg:col-span-1 scroll-mt-24">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
              <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">Bill Impact ({viewMode})</h3>
              <div className="bg-slate-100 p-1 rounded-lg flex items-center flex-wrap gap-1 sm:gap-0 w-full sm:w-auto justify-between sm:justify-start">
                  {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(mode => <button key={mode} onClick={() => setViewMode(mode as any)} className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{mode}</button>)}
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-[400px_1fr] gap-4 md:h-[340px]">
              <div className="flex flex-col justify-between gap-2 h-auto md:h-full md:col-span-5 lg:col-span-1">
                 <div className="w-full h-[220px] md:h-auto md:flex-1"><SavingsChart current={displayCurrent} projected={displayProjected} currency={currencySymbol} label={`${viewMode} Cost`} savings={displaySavings} currentKwh={currentKwh} projectedKwh={projectedKwh} /></div>
                 <div className="space-y-2 shrink-0"><div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-1"><div><p className="text-xs text-slate-400 mb-0.5">Current Bill</p><p className="text-lg font-bold text-slate-700">{currencySymbol}{displayCurrent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div><div className="text-right"><p className="text-xs text-emerald-600/70 font-medium mb-0.5">Projected Bill</p><p className="text-lg font-bold text-emerald-600">{currencySymbol}{displayProjected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div></div></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col h-80 md:h-full overflow-hidden md:col-span-7 lg:col-span-1">
                 <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 shrink-0"><span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><SlidersHorizontal className="w-3 h-3" />Adjust Plan</span><span className="text-[10px] text-slate-400">{selectedRecs.size}/{data.recommendations.length} Active</span></div>
                 <div className="overflow-y-auto space-y-2 pr-1 scrollbar-hide flex-1">
                    {data.recommendations.map((rec, idx) => {
                      const isSelected = selectedRecs.has(idx);
                      const annualSaving = parseSavingsValue(rec.estimatedAnnualSavings);
                      const viewSaving = annualSaving / divisor;
                      return (
                        <div key={idx} className="group flex items-center gap-2">
                          <div onClick={() => toggleRec(idx)} className={`flex-1 p-1.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${isSelected ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-100/50 border-transparent opacity-60 hover:opacity-100'}`}><div className={`mt-0.5 ${isSelected ? 'text-emerald-500' : 'text-slate-300'}`}>{isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-center gap-2 mb-0.5"><p className={`text-xs font-bold truncate ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{rec.title}</p></div><div className="flex items-center gap-2 mb-1"><span className={`text-[9px] px-1.5 py-px rounded font-semibold border ${getImpactColor(rec.impact)}`}>{rec.impact} Impact</span></div><div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 truncate">{rec.category}</span><span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>-{currencySymbol}{viewSaving.toFixed(2)}</span></div></div></div>
                        </div>
                      );
                    })}
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div className="bg-indigo-100 p-1.5 rounded-lg"><Satellite className="w-4 h-4 text-indigo-600" /></div>
               <div><h3 className="text-base font-bold text-slate-800">Property & Living Context</h3>{data.comparison.neighborhoodName && <p className="text-xs text-slate-500 font-medium">{data.comparison.neighborhoodName}</p>}</div>
             </div>
             <div className="flex items-center gap-4">
               <div className="relative group cursor-help z-20 hidden sm:block">
                   <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm transition-all group-hover:border-emerald-300 group-hover:shadow-md">
                       <div className="text-right"><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide flex items-center justify-end gap-1">Local Rank <HelpCircle className="w-3 h-3" /></p><p className="text-sm font-bold text-slate-800 leading-none">Top {100 - data.comparison.efficiencyPercentile}%</p></div>
                       <div className="w-10 h-10 relative flex items-center justify-center"><svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36"><path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" /><path className="transition-all duration-1000 ease-out" strokeDasharray={`${data.comparison.efficiencyPercentile}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={data.comparison.efficiencyPercentile >= 75 ? '#10b981' : data.comparison.efficiencyPercentile >= 40 ? '#fbbf24' : '#ef4444'} strokeWidth="3" strokeLinecap="round" /></svg><div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${data.comparison.efficiencyPercentile >= 75 ? 'text-emerald-600' : data.comparison.efficiencyPercentile >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>{data.comparison.efficiencyPercentile}</div></div>
                   </div>
               </div>
               <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">{isSidebarVisible ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}</button>
             </div>
          </div>
          <div className={`grid grid-cols-1 ${isSidebarVisible ? 'md:grid-cols-2 lg:grid-cols-[1fr_350px]' : 'lg:grid-cols-1'} gap-0 transition-all duration-300`}>
             <div className="relative bg-slate-100 min-h-[500px] border-r border-slate-200 group overflow-hidden">
                {mapView !== 'plan' && <iframe title="Property Map" width="100%" height="100%" src={mapUrl} style={{ border: 0, opacity: 0.9, mixBlendMode: 'multiply' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="grayscale-[10%] group-hover:grayscale-0 transition-all duration-500 absolute inset-0" />}
                {mapView === 'plan' && <div className="absolute inset-0 bg-white flex flex-col items-center justify-center"><Demo3DView analysisData={data} isDemoMode={isDemoMode} /></div>}
                <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2"><div className="flex bg-white/95 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-200"><button onClick={() => handleMapSwitch('roadmap')} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${mapView === 'roadmap' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Map</button><button onClick={() => handleMapSwitch('satellite')} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${mapView === 'satellite' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Sat</button><button onClick={() => handleMapSwitch('plan')} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${mapView === 'plan' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}><Grid className="w-3 h-3" />Plan</button></div></div>
             </div>
             {isSidebarVisible && (
                 <div className="p-6 bg-white flex flex-col h-full animate-fade-in-left">
                     <div className="flex items-center justify-between mb-4"><h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Layers className="w-4 h-4 text-slate-500" />Intelligence Comparison</h4><button onClick={() => setIsProfileOpen(true)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded transition-colors"><Pencil className="w-3 h-3" /> Edit Profile</button></div>
                     <div className="space-y-4 flex-1">
                        {data.comparison.factors && data.comparison.factors.map((factor, i) => (
                            <FactorItem key={i} factor={factor} />
                        ))}
                     </div>
                     <div className="mt-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed shadow-sm"><p className="font-bold mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Composite Audit Summary</p><div className="bg-white/60 p-2 rounded-lg mb-2">{renderTextWithCitations(data.comparison.description)}</div><p className="text-[10px] opacity-70 italic">Insights derived from structural building stock and detected household behavioral patterns.</p></div>
                 </div>
             )}
          </div>
      </div>
      
      <HomeProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} currentProfile={data.homeProfile || {propertyType: 'Flat', bedrooms: 1, occupants: 2, homeHours: 'Evenings & Weekends', heatingType: 'Gas Boiler', hasEV: false, appliances: []}} onSave={handleProfileSave} />
      <RetrofitVisualizer isOpen={isVisualizerOpen} onClose={() => setIsVisualizerOpen(false)} homeImages={homeImages} recommendationTitle={visualizerTarget?.title || ''} recommendationCategory={visualizerTarget?.category || ''} analysisResult={data} isDemoMode={isDemoMode} />
      {data.usageBreakdown && <UsageTrendsChart data={data.usageBreakdown} currency={data.currency} />}

      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2"><Zap className="w-6 h-6 text-emerald-500" />Recommended Actions<span className="text-sm font-normal text-slate-400 ml-2">Select actions to update projected savings</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendations.map((rec, idx) => (
            <div key={idx} id={`rec-${idx}`} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all flex flex-col group cursor-pointer relative ${selectedRecs.has(idx) ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-slate-200 opacity-70 grayscale-[0.5] hover:opacity-100'}`} onClick={() => toggleRec(idx)}>
              <div className="absolute top-4 right-4 text-emerald-500 transition-opacity">{selectedRecs.has(idx) ? <CheckCircle2 className="w-5 h-5 fill-emerald-50" /> : <Circle className="w-5 h-5 text-slate-300" />}</div>
              <div className="flex justify-between items-start mb-2 pr-10"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${selectedRecs.has(idx) ? 'bg-slate-50 group-hover:bg-emerald-50' : 'bg-slate-50'}`}>{getCategoryIcon(rec.category)}</div><div><h4 className={`font-bold transition-colors ${selectedRecs.has(idx) ? 'text-slate-800' : 'text-slate-600'}`}>{rec.title}</h4><span className="text-xs font-medium text-slate-500">{rec.category}</span></div></div></div>
              <div className="mb-2 flex items-center gap-2"><span className={`px-2 py-1 rounded-md text-xs font-semibold border inline-flex items-center justify-center ${getImpactColor(rec.impact)}`}>{rec.impact} Impact</span><span className={`px-2 py-1 rounded-md text-xs font-semibold border inline-flex items-center justify-center ${getCostBadgeColor(rec.estimatedCost)}`}>{getCostLabel(rec.estimatedCost)}</span></div>
              <div className="text-slate-600 text-sm mb-2 min-h-[40px] flex-grow">{renderTextWithCitations(rec.description)}</div>
              <div className={`pt-2 border-t mt-auto transition-colors ${selectedRecs.has(idx) ? 'border-slate-100' : 'border-slate-100/50'}`}><div className="flex items-end justify-between gap-2"><div className="flex gap-4 sm:gap-6"><div><p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider mb-0.5">Est. Cost</p><p className="font-semibold text-slate-700 text-sm">{rec.estimatedCost}</p></div><div><p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider mb-0.5">Annual Savings</p><p className={`font-semibold text-sm transition-colors ${selectedRecs.has(idx) ? 'text-emerald-600' : 'text-slate-500'}`}>{rec.estimatedAnnualSavings}</p></div></div><div className="flex items-center gap-2"><button onClick={(e) => openVisualizer(e, rec)} className="flex items-center gap-1.5 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-100 hover:border-purple-200 transition-all"><Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">Visualize</span></button><button onClick={(e) => { e.stopPropagation(); scrollToPanel('savings-panel'); }} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all"><LineChart className="w-3.5 h-3.5" /><span className="hidden sm:inline">Impact</span></button></div></div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200 pt-6 mt-8" id="references-section">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-500" />References & Data Sources</h4><ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">{data.dataSources && data.dataSources.map((source, i) => (<li key={i} id={`ref-${i + 1}`} className="pl-1 scroll-mt-24 transition-colors duration-500 rounded p-1"><a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 hover:underline inline-flex items-center gap-1 transition-colors">{source.title} <ExternalLink className="w-3 h-3 text-slate-400" /></a></li>))}</ol></div>
            <div><h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />Analyzed Source Documents</h4><ul className="space-y-1.5">{data.sourceDocuments && data.sourceDocuments.map((doc, i) => (<li key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">{doc.type === 'video' ? <Video className="w-3 h-3" /> : doc.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}<span className="truncate flex-1">{doc.name}</span>{doc.date && <span className="text-slate-400 text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">{doc.date}</span>}</li>))}</ul></div>
         </div>
         <p className="text-center text-[10px] text-slate-400 mt-8">Generated by EcoRetrofit AI using Gemini 3 Flash. Information provided for guidance only.</p>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
