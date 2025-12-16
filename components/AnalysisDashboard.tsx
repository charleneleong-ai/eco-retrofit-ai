
import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisResult, HomeProfile } from '../types';
import SavingsChart from './SavingsChart';
import UsageTrendsChart from './UsageTrendsChart';
import EPCBadge from './EPCBadge';
import HomeProfileModal from './HomeProfileModal';
import RetrofitVisualizer from './RetrofitVisualizer';
import Demo3DView from './Demo3DView'; // Import the new 3D view
import { updateBenchmark, generateRetrofitVisualization } from '../services/geminiService';
import { parseSavingsValue, getCurrencySymbol } from '../utils';
import ReactMarkdown, { Components } from 'react-markdown';
import { ArrowDown, Zap, Thermometer, Home, AlertCircle, Users, ExternalLink, BookOpen, MapPin, User, Calendar, PlusCircle, FileText, Video, Image as ImageIcon, Download, ArrowRight, CheckCircle2, Circle, SlidersHorizontal, Eye, LineChart, ArrowUp, HelpCircle, Coins, Timer, Layers, Map as MapIcon, Building2, Pencil, Leaf, Sparkles, Satellite, Plus, Minus, Box, RotateCcw, RotateCw, Grid, MoveVertical, ZoomIn, ZoomOut, PanelRightClose, PanelRightOpen } from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
  onUpdateAnalysis?: () => void;
  onEPCUpload?: (file: File) => void;
  isUpdatingEPC?: boolean;
  initialSelectedIndices?: number[];
  onSelectionChange?: (indices: number[]) => void;
  homeImages?: string[]; // New prop for visualization
  isDemoMode?: boolean; // New prop to trigger 3D demo view
}

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
  // Local state to handle data updates (like benchmark refinement)
  const [data, setData] = useState<AnalysisResult>(initialData);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Visualizer State
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualizerTarget, setVisualizerTarget] = useState<string>('');

  // Map & Plan State - Default to 'plan'
  const [mapView, setMapView] = useState<'satellite' | 'roadmap' | 'plan'>('plan');
  const [zoomLevel, setZoomLevel] = useState<number>(20);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  // Update local data if props change (e.g. parent re-analyzes)
  useEffect(() => {
     setData(initialData);
  }, [initialData]);

  // --- State for Interactive Features ---
  const [selectedRecs, setSelectedRecs] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Yearly');

  // Initialize selected recommendations
  useEffect(() => {
    if (data.recommendations) {
      if (initialSelectedIndices && initialSelectedIndices.length > 0) {
        // Use restored state if available
        setSelectedRecs(new Set(initialSelectedIndices));
      } else if (!initialSelectedIndices) {
        // Default to all selected only if no initial state provided (undefined)
        // If empty array [] is passed, it means user deselected everything, so we respect that.
        setSelectedRecs(new Set(data.recommendations.map((_, i) => i)));
      } else {
        setSelectedRecs(new Set());
      }
    }
  }, [data.recommendations, initialSelectedIndices]);

  const handleProfileSave = async (newProfile: HomeProfile) => {
      try {
          const newComparison = await updateBenchmark(data, newProfile);
          
          setData(prev => ({
              ...prev,
              homeProfile: newProfile,
              comparison: newComparison
          }));
      } catch (error) {
          console.error("Failed to update benchmark", error);
          alert("Could not update benchmark comparison. Please try again.");
      }
  };

  const openVisualizer = (e: React.MouseEvent, title: string) => {
      e.stopPropagation();
      setVisualizerTarget(title);
      setIsVisualizerOpen(true);
  };

  const handleMapSwitch = (type: 'satellite' | 'roadmap' | 'plan') => {
      setMapView(type);
      if (type !== 'plan') {
         // Reset zoom for maps
         setZoomLevel(type === 'satellite' ? 20 : 19);
      }
  };

  const handleZoom = (direction: 'in' | 'out') => {
      setZoomLevel(prev => {
          if (direction === 'in') return Math.min(prev + 1, 21);
          return Math.max(prev - 1, 12);
      });
  };

  // --- Derived Calculations ---
  
  // 1. Calculate Total Potential Annual Savings based on SELECTED recommendations
  const calculatedAnnualSavings = useMemo(() => {
    return data.recommendations.reduce((acc, rec, idx) => {
      if (selectedRecs.has(idx)) {
        return acc + parseSavingsValue(rec.estimatedAnnualSavings);
      }
      return acc;
    }, 0);
  }, [data.recommendations, selectedRecs]);

  // 2. Calculate Total Upfront Investment based on SELECTED recommendations
  const calculatedInvestment = useMemo(() => {
    return data.recommendations.reduce((acc, rec, idx) => {
      if (selectedRecs.has(idx)) {
        return acc + parseSavingsValue(rec.estimatedCost);
      }
      return acc;
    }, 0);
  }, [data.recommendations, selectedRecs]);

  // 3. Base Costs (Annual)
  const currentAnnualCost = data.currentMonthlyAvg * 12;
  
  // 4. Projected Costs (Annual) = Base - Calculated Savings
  const projectedAnnualCost = Math.max(0, currentAnnualCost - calculatedAnnualSavings);

  // 5. Payback Period
  const paybackPeriodYears = calculatedAnnualSavings > 0 ? calculatedInvestment / calculatedAnnualSavings : 0;

  // 6. View Mode Values
  let divisor = 12;
  if (viewMode === 'Weekly') divisor = 52;
  if (viewMode === 'Daily') divisor = 365;
  if (viewMode === 'Yearly') divisor = 1;

  const displayCurrent = currentAnnualCost / divisor;
  const displayProjected = projectedAnnualCost / divisor;
  const displaySavings = calculatedAnnualSavings / divisor;

  const savingsPercent = Math.round((calculatedAnnualSavings / currentAnnualCost) * 100);

  // 7. kWh Calculations (Approximation based on cost savings ratio)
  const { currentKwh, projectedKwh } = useMemo(() => {
     if (!data.usageBreakdown?.monthly) return { currentKwh: 0, projectedKwh: 0 };
     
     const totalAnnualKwh = data.usageBreakdown.monthly.reduce((acc, m) => acc + (m.kwh || 0), 0);
     const kwhDivisor = divisor; // Use the same divisor as cost (12, 52, 365, or 1)
     
     const currentAvgKwh = totalAnnualKwh / kwhDivisor;
     
     // Assume savings percentage applies roughly equally to kWh (simplification for UI)
     const percentSaved = currentAnnualCost > 0 ? calculatedAnnualSavings / currentAnnualCost : 0;
     const projectedAvgKwh = currentAvgKwh * (1 - percentSaved);
     
     return {
        currentKwh: currentAvgKwh,
        projectedKwh: projectedAvgKwh
     };
  }, [data.usageBreakdown, calculatedAnnualSavings, currentAnnualCost, divisor]);

  // --- Helper Functions ---

  const toggleRec = (index: number) => {
    const newSet = new Set(selectedRecs);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRecs(newSet);
    
    // Emit change to parent
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSet));
    }
  };

  const scrollToRec = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const element = document.getElementById(`rec-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
      setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2'), 2500);
    }
  };

  const scrollToPanel = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
      setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2'), 1500);
    }
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
    if (val < 100) return 'bg-emerald-50 text-emerald-700 border-emerald-100'; // Low Cost (Good)
    if (val < 1000) return 'bg-amber-50 text-amber-700 border-amber-100';     // Medium Cost
    return 'bg-rose-50 text-rose-700 border-rose-100';                         // High Cost
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

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'video': return <Video className="w-3 h-3" />;
      case 'image': return <ImageIcon className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const scrollToReference = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const element = document.getElementById(`ref-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-yellow-100');
      setTimeout(() => element.classList.remove('bg-yellow-100'), 2000);
    }
  };

  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        return (
          <a
            key={i}
            href={`#ref-${index}`}
            onClick={(e) => scrollToReference(e, index)}
            className="text-emerald-600 font-bold hover:underline cursor-pointer inline-block mx-0.5"
            title={`Go to source [${index}]`}
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const getPrimarySourceUrl = (description: string): string | null => {
    const match = description.match(/\[(\d+)\]/);
    if (match) {
      const index = parseInt(match[1]);
      if (data.dataSources && data.dataSources[index - 1]) {
        return data.dataSources[index - 1].url;
      }
    }
    return null;
  };

  const MarkdownComponents: Components = {
    p: ({ children }) => {
      const processed = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return renderTextWithCitations(child);
        }
        return child;
      });
      return <p className="mb-2 last:mb-0">{processed}</p>;
    },
    li: ({ children }) => {
      const processed = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return renderTextWithCitations(child);
        }
        return child;
      });
      return <li className="mb-1">{processed}</li>;
    }
  };

  // Google Maps Embed URL
  const mapUrl = useMemo(() => {
    const query = encodeURIComponent(data.address || 'London, UK');
    const type = mapView === 'satellite' ? 'h' : 'm'; // h = hybrid, m = map
    return `https://maps.google.com/maps?q=${query}&t=${type}&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;
  }, [data.address, mapView, zoomLevel]);

  // Default profile if none provided by API
  const defaultProfile: HomeProfile = {
      propertyType: 'Flat',
      bedrooms: 1,
      occupants: 2,
      homeHours: 'Evenings & Weekends',
      heatingType: 'Gas Central',
      hasEV: false,
      appliances: []
  };

  // Helper to access current profile safely
  const profile = data.homeProfile || defaultProfile;
  const currencySymbol = getCurrencySymbol(data.currency);

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      
      {/* Report Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <div className="bg-emerald-100 p-1.5 rounded-full">
               <Home className="w-4 h-4 text-emerald-600" />
             </div>
             <h1 className="text-xl font-bold text-slate-800">Retrofit Action Plan</h1>
           </div>
           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {data.customerName || 'Valued Customer'}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {data.address || 'Address not detected'}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {data.auditDate || new Date().toLocaleDateString()}</span>
           </div>
        </div>
        
        {onUpdateAnalysis && (
          <button 
            onClick={onUpdateAnalysis}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> 
          </button>
        )}
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[280px_1fr] gap-4">
        {/* Total Annual Savings Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 md:col-span-1 lg:col-span-1">
          <p className="text-sm font-medium text-slate-500">Projected Annual Savings</p>
          <div className="flex items-end gap-3 mt-1">
            <h2 className="text-4xl font-bold text-emerald-600">{currencySymbol}{Math.round(calculatedAnnualSavings).toLocaleString()}</h2>
            <span className="text-emerald-600 font-medium mb-1 flex items-center">
              <ArrowDown className="w-4 h-4 mr-0.5" />{savingsPercent}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Based on selected {selectedRecs.size}/{data.recommendations.length} actions</p>
          
          {/* Stats Grid: Investment & Payback */}
          <div className="grid grid-cols-2 gap-4 mt-5">
             <div className="relative group cursor-help">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  Investment
                  <HelpCircle className="w-3 h-3 text-slate-300 transition-colors group-hover:text-emerald-500" />
                </p>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                    <p className="font-bold text-emerald-400 mb-1">Upfront Cost</p>
                    <p className="text-slate-300 leading-relaxed">Estimated total cost for materials and installation of selected measures.</p>
                    <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                </div>

                <div className="flex items-center gap-1.5">
                   <div className="bg-slate-100 p-1 rounded-md">
                      <Coins className="w-3.5 h-3.5 text-slate-500" />
                   </div>
                   <span className="font-bold text-slate-700 text-sm">
                      {currencySymbol}{Math.round(calculatedInvestment).toLocaleString()}
                   </span>
                </div>
             </div>
             
             <div className="relative group cursor-help">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  Payback
                  <HelpCircle className="w-3 h-3 text-slate-300 transition-colors group-hover:text-emerald-500" />
                </p>

                {/* Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                    <p className="font-bold text-emerald-400 mb-1">ROI Timeline</p>
                    <p className="text-slate-300 leading-relaxed">Time required for energy bill savings to cover the initial investment cost.</p>
                    <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                </div>

                <div className="flex items-center gap-1.5">
                   <div className="bg-slate-100 p-1 rounded-md">
                      <Timer className="w-3.5 h-3.5 text-slate-500" />
                   </div>
                   <span className="font-bold text-slate-700 text-sm">
                      {paybackPeriodYears <= 0 ? '-' : paybackPeriodYears < 1 ? '< 1 Year' : `${paybackPeriodYears.toFixed(1)} Years`}
                   </span>
                </div>
             </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 relative group cursor-help">
            {/* Custom Interactive Tooltip / Hover Card */}
            <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white border border-slate-200 text-slate-600 text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                <p className="font-bold text-slate-800 mb-2 text-sm">EPC Rating Upgrade</p>
                <p className="leading-relaxed mb-3">
                   Improving your rating reduces fuel bills and carbon footprint.
                </p>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <p className="leading-relaxed">
                      Selected retrofits boost your home from <span className="font-bold text-amber-600">{data.epc?.current}</span> to <span className="font-bold text-emerald-600">{data.epc?.potential}</span>.
                  </p>
                </div>
                {/* Arrow */}
                <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45"></div>
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
               Efficiency Upgrade
               <HelpCircle className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </p>
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 text-slate-400 px-3 py-1 rounded font-bold text-sm">
                {data.epc?.current || '?'}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded font-bold text-sm border border-emerald-200">
                {data.epc?.potential || '?'}
              </div>
            </div>
          </div>
        </div>

        {/* Bill Impact & Action Plan Card */}
        <div id="savings-panel" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 md:col-span-2 lg:col-span-1 scroll-mt-24">
           {/* ... existing chart code ... */}
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
              <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                Bill Impact ({viewMode})
              </h3>
              
              {/* Toggle Switch */}
              <div className="bg-slate-100 p-1 rounded-lg flex items-center flex-wrap gap-1 sm:gap-0 w-full sm:w-auto justify-between sm:justify-start">
                  <button 
                    onClick={() => setViewMode('Daily')}
                    className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'Daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Daily
                  </button>
                  <button 
                    onClick={() => setViewMode('Weekly')}
                    className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'Weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Weekly
                  </button>
                  <button 
                    onClick={() => setViewMode('Monthly')}
                    className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'Monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setViewMode('Yearly')}
                    className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'Yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Yearly
                  </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-[400px_1fr] gap-4 md:h-[340px]">
              {/* Left Column: Chart & Stats */}
              <div className="flex flex-col justify-between gap-2 h-auto md:h-full md:col-span-5 lg:col-span-1">
                 <div className="w-full h-[220px] md:h-auto md:flex-1">
                    <SavingsChart 
                      current={displayCurrent} 
                      projected={displayProjected} 
                      currency={currencySymbol} 
                      label={`${viewMode} Cost`}
                      savings={displaySavings}
                      currentKwh={currentKwh}
                      projectedKwh={projectedKwh}
                    />
                 </div>
                 {/* ... stats ... */}
                 <div className="space-y-2 shrink-0">
                    <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-1">
                        <div>
                            <p className="text-xs text-slate-400 mb-0.5">Current Bill</p>
                            <p className="text-lg font-bold text-slate-700">{currencySymbol}{displayCurrent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-emerald-600/70 font-medium mb-0.5">Projected Bill</p>
                            <p className="text-lg font-bold text-emerald-600">{currencySymbol}{displayProjected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Right Column: Recommendation List Preview */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col h-80 md:h-full overflow-hidden md:col-span-7 lg:col-span-1">
                 <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 shrink-0">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                       <SlidersHorizontal className="w-3 h-3" />
                       Adjust Plan
                    </span>
                    <span className="text-[10px] text-slate-400">{selectedRecs.size}/{data.recommendations.length} Active</span>
                 </div>
                 
                 <div className="overflow-y-auto space-y-2 pr-1 scrollbar-hide flex-1">
                    {data.recommendations.map((rec, idx) => {
                      const isSelected = selectedRecs.has(idx);
                      const annualSaving = parseSavingsValue(rec.estimatedAnnualSavings);
                      const viewSaving = annualSaving / divisor;
                      
                      return (
                        <div key={idx} className="group flex items-center gap-2">
                          <div 
                            onClick={() => toggleRec(idx)}
                            className={`flex-1 p-1.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                                isSelected ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-100/50 border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                             <div className={`mt-0.5 ${isSelected ? 'text-emerald-500' : 'text-slate-300'}`}>
                                {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center gap-2 mb-0.5">
                                   <p className={`text-xs font-bold truncate ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{rec.title}</p>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-1">
                                   <span className={`text-[9px] px-1.5 py-px rounded font-semibold border ${getImpactColor(rec.impact)}`}>
                                      {rec.impact} Impact
                                   </span>
                                </div>

                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] text-slate-400 truncate">{rec.category}</span>
                                   <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      -{currencySymbol}{viewSaving.toFixed(2)}
                                   </span>
                                </div>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Executive Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Executive Summary</h3>
          <div className="prose prose-slate max-w-none text-slate-600 text-sm flex-1">
            <ReactMarkdown components={MarkdownComponents}>{data.summary}</ReactMarkdown>
          </div>
        </div>

        {/* EPC Chart */}
        <div className="space-y-4">
          {data.epc && (
             <EPCBadge 
               epcData={data.epc}
               isLoading={isUpdatingEPC}
               onFileSelected={onEPCUpload}
             />
          )}
        </div>
      </div>

      {/* Neighborhood Intelligence Panel & 3D Visualization */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          {/* Header */}
          <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div className="bg-indigo-100 p-1.5 rounded-lg">
                 <Satellite className="w-4 h-4 text-indigo-600" />
               </div>
               <div>
                  <h3 className="text-base font-bold text-slate-800">Property & Local Context</h3>
                  {data.comparison.neighborhoodName && (
                      <p className="text-xs text-slate-500 font-medium">{data.comparison.neighborhoodName}</p>
                  )}
               </div>
             </div>
             
             <div className="flex items-center gap-4">
               {/* Neighborhood Rank Badge */}
               <div className="relative group cursor-help z-20 hidden sm:block">
                   {/* Tooltip Start */}
                   <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 text-left">
                      <p className="font-bold text-emerald-400 mb-1">Efficiency Ranking</p>
                      <p className="text-slate-300 leading-relaxed">
                          Your home is more energy efficient than {data.comparison.efficiencyPercentile}% of similar properties in {data.comparison.neighborhoodName || 'your area'}.
                      </p>
                      {/* Arrow */}
                      <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-800 rotate-45"></div>
                   </div>
                   {/* Tooltip End */}

                   <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm transition-all group-hover:border-emerald-300 group-hover:shadow-md">
                       <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide flex items-center justify-end gap-1 group-hover:text-emerald-600 transition-colors">
                              Local Rank 
                              <HelpCircle className="w-3 h-3" />
                          </p>
                          <p className="text-sm font-bold text-slate-800 leading-none">Top {100 - data.comparison.efficiencyPercentile}%</p>
                       </div>
                       {/* Cleaner Donut Chart */}
                       <div className="w-10 h-10 relative flex items-center justify-center">
                           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                  className="text-slate-100"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                              />
                              <path
                                  className="transition-all duration-1000 ease-out"
                                  strokeDasharray={`${data.comparison.efficiencyPercentile}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke={data.comparison.efficiencyPercentile >= 75 ? '#10b981' : data.comparison.efficiencyPercentile >= 40 ? '#fbbf24' : '#ef4444'}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                              />
                           </svg>
                           <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${data.comparison.efficiencyPercentile >= 75 ? 'text-emerald-600' : data.comparison.efficiencyPercentile >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                               {data.comparison.efficiencyPercentile}
                           </div>
                       </div>
                   </div>
               </div>

               {/* Sidebar Toggle Button */}
               <button 
                  onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                  title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
               >
                  {isSidebarVisible ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
               </button>
             </div>
          </div>

          <div className={`grid grid-cols-1 ${isSidebarVisible ? 'md:grid-cols-2 lg:grid-cols-[1fr_350px]' : 'lg:grid-cols-1'} gap-0 transition-all duration-300`}>
             {/* Left: Map or Plan Visualization (Main Content) */}
             <div className="relative bg-slate-100 min-h-[500px] border-r border-slate-200 group overflow-hidden">
                
                {/* 1. Map Mode */}
                {mapView !== 'plan' && (
                    <>
                        <iframe 
                        title="Property Map"
                        width="100%" 
                        height="100%" 
                        src={mapUrl}
                        style={{ border: 0, opacity: 0.9, mixBlendMode: 'multiply' }} 
                        allowFullScreen 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                        className="grayscale-[10%] group-hover:grayscale-0 transition-all duration-500 absolute inset-0"
                        />
                        {/* Standard Zoom Controls for Map */}
                        <div className="absolute bottom-4 right-4 z-10 flex flex-col bg-white/95 backdrop-blur rounded-lg shadow-sm border border-slate-200 overflow-hidden w-8">
                            <button 
                                onClick={() => handleZoom('in')}
                                className="h-8 flex items-center justify-center hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors border-b border-slate-100"
                                title="Zoom In"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleZoom('out')}
                                className="h-8 flex items-center justify-center hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
                                title="Zoom Out"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                )}

                {/* 2. Plan Mode */}
                {mapView === 'plan' && (
                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center">
                        
                        {/* Always use the interactive 3D view for 'plan' mode, 
                            passing the analysis data so it can reset/update based on the new report. 
                            This replaces the legacy canvas generation logic for a richer experience. */}
                        <Demo3DView analysisData={data} isDemoMode={isDemoMode} />
                        
                    </div>
                )}
                
                {/* Mode Toggles (Bottom Left - Always visible) */}
                <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                    <div className="flex bg-white/95 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-200">
                        <button 
                            onClick={() => handleMapSwitch('roadmap')}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${mapView === 'roadmap' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Map
                        </button>
                        <button 
                            onClick={() => handleMapSwitch('satellite')}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${mapView === 'satellite' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Sat
                        </button>
                        <button 
                            onClick={() => handleMapSwitch('plan')}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${mapView === 'plan' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Grid className="w-3 h-3" />
                            Plan
                        </button>
                    </div>
                </div>
             </div>

             {/* Right: Comparison Matrix (Conditionally Rendered via CSS/Grid) */}
             {isSidebarVisible && (
                 <div className="p-6 bg-white flex flex-col h-full animate-fade-in-left">
                     <div className="flex items-center justify-between mb-4">
                         <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-500" />
                            Comparison Factors
                         </h4>
                         <button 
                            onClick={() => setIsProfileOpen(true)}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded transition-colors"
                         >
                            <Pencil className="w-3 h-3" /> Edit Profile
                         </button>
                     </div>
                     
                     <div className="space-y-4 flex-1">
                        {/* Dynamic Factors List */}
                        {data.comparison.factors && data.comparison.factors.length > 0 ? (
                            data.comparison.factors.map((factor, i) => (
                                <div key={i} className="group py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors -mx-2 px-2 rounded-lg">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1.5 shrink-0">
                                                {factor.label}
                                            </span>
                                            <div className="text-[10px] px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg rounded-tr-sm font-medium leading-relaxed max-w-[70%] text-left border border-slate-200/50 shadow-sm">
                                                {factor.variance}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pl-1">
                                            <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                                                {factor.userValue}
                                            </div>
                                            <div className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md">
                                                vs {factor.localAvg}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                             <div className="text-center py-8 text-slate-400 text-sm">
                                 Detailed comparison data not available.
                             </div>
                        )}
                     </div>

                     <div className="mt-6 bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 leading-relaxed">
                        <p className="font-bold mb-1 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            AI Insight
                        </p>
                        {renderTextWithCitations(data.comparison.description)}
                     </div>
                 </div>
             )}
          </div>
      </div>
      
      {/* Profile Modal */}
      <HomeProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)}
        currentProfile={data.homeProfile || defaultProfile}
        onSave={handleProfileSave}
      />
      
      {/* Visualizer Modal */}
      <RetrofitVisualizer 
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        homeImages={homeImages}
        recommendationTitle={visualizerTarget}
      />

      {/* Usage Trends Chart & Recommendations (Existing code) */}
      {/* Note: I'm relying on the existing structure below for the rest of the dashboard */}
      {data.usageBreakdown && (
        <UsageTrendsChart data={data.usageBreakdown} currency={data.currency} />
      )}

      {/* Recommendations Grid */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Zap className="w-6 h-6 text-emerald-500" />
          Recommended Actions
          <span className="text-sm font-normal text-slate-400 ml-2">Select actions to update projected savings</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendations.map((rec, idx) => {
            const sourceUrl = getPrimarySourceUrl(rec.description);
            const isSelected = selectedRecs.has(idx);
            const isVisualizable = ['Solar', 'Insulation', 'Windows'].includes(rec.category) && homeImages.length > 0;
            
            return (
              <div 
                key={idx} 
                id={`rec-${idx}`}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all flex flex-col group cursor-pointer relative ${
                    isSelected ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-slate-200 opacity-70 grayscale-[0.5] hover:opacity-100'
                }`}
                onClick={() => toggleRec(idx)}
              >
                <div className="absolute top-4 right-4 text-emerald-500 transition-opacity">
                    {isSelected ? <CheckCircle2 className="w-5 h-5 fill-emerald-50" /> : <Circle className="w-5 h-5 text-slate-300" />}
                </div>

                <div className="flex justify-between items-start mb-2 pr-10">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-slate-50 group-hover:bg-emerald-50' : 'bg-slate-50'}`}>
                      {getCategoryIcon(rec.category)}
                    </div>
                    <div>
                      <h4 className={`font-bold transition-colors ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>{rec.title}</h4>
                      <span className="text-xs font-medium text-slate-500">{rec.category}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-2 flex items-center gap-2">
                     <span className={`px-2 py-1 rounded-md text-xs font-semibold border inline-flex items-center justify-center ${getImpactColor(rec.impact)}`}>
                        {rec.impact} Impact
                     </span>
                     <div className="relative group/cost">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold border inline-flex items-center justify-center cursor-help ${getCostBadgeColor(rec.estimatedCost)}`}>
                            {getCostLabel(rec.estimatedCost)}
                        </span>
                        {/* Cost Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover/cost:opacity-100 transition-all pointer-events-none z-50 text-center">
                            <p className="font-bold text-emerald-400 mb-0.5">Est. Cost</p>
                            <p>{rec.estimatedCost}</p>
                            <p className="text-slate-400 mt-1 italic">Includes materials & install</p>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                        </div>
                     </div>
                </div>
                
                <div className="text-slate-600 text-sm mb-2 min-h-[40px] flex-grow">
                  {renderTextWithCitations(rec.description)}
                </div>
                
                <div className={`pt-2 border-t mt-auto transition-colors ${isSelected ? 'border-slate-100' : 'border-slate-100/50'}`}>
                   <div className="flex items-end justify-between gap-2">
                     <div className="flex gap-4 sm:gap-6">
                       <div>
                          <p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider mb-0.5">Est. Cost</p>
                          <p className="font-semibold text-slate-700 text-sm">{rec.estimatedCost}</p>
                       </div>
                       <div>
                          <p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider mb-0.5">Annual Savings</p>
                          <p className={`font-semibold text-sm transition-colors ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`}>{rec.estimatedAnnualSavings}</p>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2">
                       {isVisualizable && (
                           <button
                              onClick={(e) => openVisualizer(e, rec.title)}
                              className="flex items-center gap-1.5 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-100 hover:border-purple-200 transition-all"
                              title="Visualize this retrofit on your home"
                           >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Visualize</span>
                           </button>
                       )}

                       <button
                          onClick={(e) => {
                              e.stopPropagation();
                              scrollToPanel('savings-panel');
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all group/btn"
                          title="View Impact on Savings"
                       >
                          <LineChart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Impact</span>
                       </button>

                       {sourceUrl && (
                         <a 
                           href={sourceUrl} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           onClick={(e) => e.stopPropagation()} 
                           className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-100 hover:border-emerald-200 transition-all group/btn"
                         >
                        <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                         </a>
                       )}
                     </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* References Footer */}
      <div className="border-t border-slate-200 pt-6 mt-8" id="references-section">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  References & Data Sources
               </h4>
               <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">
                  {data.dataSources && data.dataSources.map((source, i) => (
                    <li 
                      key={i} 
                      id={`ref-${i + 1}`} 
                      className="pl-1 scroll-mt-24 transition-colors duration-500 rounded p-1"
                    >
                      <a 
                         href={source.url}
                         target="_blank"
                         rel="noopener noreferrer" 
                         className="hover:text-emerald-600 hover:underline inline-flex items-center gap-1 transition-colors"
                      >
                         {source.title}
                         <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </li>
                  ))}
               </ol>
            </div>

            <div>
               <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Analyzed Source Documents
               </h4>
               <ul className="space-y-1.5">
                  {data.sourceDocuments && data.sourceDocuments.length > 0 ? (
                    data.sourceDocuments.map((doc, i) => (
                      <li key={i}>
                        {doc.url ? (
                          <a 
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all group"
                          >
                             {getFileIcon(doc.type)}
                             <span className="truncate flex-1 group-hover:text-emerald-700">{doc.name}</span>
                             {doc.date && <span className="text-slate-400 text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">{doc.date}</span>}
                             <Download className="w-3 h-3 text-slate-300 group-hover:text-emerald-500" />
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg opacity-75">
                             {getFileIcon(doc.type)}
                             <span className="truncate flex-1">{doc.name}</span>
                             {doc.date && <span className="text-slate-400 text-[10px]">{doc.date}</span>}
                          </div>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-slate-400 italic">No documents available.</li>
                  )}
               </ul>
            </div>
         </div>
         <p className="text-center text-[10px] text-slate-400 mt-8">
            Generated by EcoRetrofit AI using Gemini 2.5 Flash. Information provided for guidance only.
         </p>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
