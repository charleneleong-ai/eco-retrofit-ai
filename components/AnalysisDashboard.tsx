
import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisResult } from '../types';
import SavingsChart from './SavingsChart';
import UsageTrendsChart from './UsageTrendsChart';
import EPCBadge from './EPCBadge';
import ReactMarkdown, { Components } from 'react-markdown';
import { ArrowDown, Zap, Thermometer, Home, AlertCircle, Users, ExternalLink, BookOpen, MapPin, User, Calendar, PlusCircle, FileText, Video, Image as ImageIcon, Download, ArrowRight, CheckCircle2, Circle, SlidersHorizontal, Eye, LineChart, ArrowUp } from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
  onUpdateAnalysis?: () => void;
}

const AnalysisDashboard: React.FC<DashboardProps> = ({ data, onUpdateAnalysis }) => {
  // --- State for Interactive Features ---
  const [selectedRecs, setSelectedRecs] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'Monthly' | 'Weekly' | 'Daily'>('Monthly');

  // Initialize selected recommendations (all selected by default)
  useEffect(() => {
    if (data.recommendations) {
      setSelectedRecs(new Set(data.recommendations.map((_, i) => i)));
    }
  }, [data.recommendations]);

  // Helper to parse savings string (e.g., "£45 - £60" -> 52.5)
  const parseSavingsValue = (savingsStr: string): number => {
    try {
      // Remove currency symbols and split
      const numbers = savingsStr.replace(/[^0-9\.\-]/g, ' ').split('-').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      if (numbers.length === 2) return (numbers[0] + numbers[1]) / 2;
      if (numbers.length === 1) return numbers[0];
      return 0;
    } catch (e) {
      return 0;
    }
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

  // 2. Base Costs (Annual)
  const currentAnnualCost = data.currentMonthlyAvg * 12;
  
  // 3. Projected Costs (Annual) = Base - Calculated Savings
  const projectedAnnualCost = Math.max(0, currentAnnualCost - calculatedAnnualSavings);

  // 4. View Mode Values
  let divisor = 12;
  if (viewMode === 'Weekly') divisor = 52;
  if (viewMode === 'Daily') divisor = 365;

  const displayCurrent = currentAnnualCost / divisor;
  const displayProjected = projectedAnnualCost / divisor;
  // const displaySavings = calculatedAnnualSavings / divisor; // Unused but available

  const savingsPercent = Math.round((calculatedAnnualSavings / currentAnnualCost) * 100);

  // --- Helper Functions ---

  const toggleRec = (index: number) => {
    const newSet = new Set(selectedRecs);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRecs(newSet);
  };

  const scrollToRec = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const element = document.getElementById(`rec-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a temporary highlight effect
      element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
      setTimeout(() => element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2'), 2500);
    }
  };

  const scrollToPanel = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a temporary highlight effect
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
      return <p className="mb-4">{processed}</p>;
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

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Report Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Annual Savings Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Projected Annual Savings</p>
          <div className="flex items-end gap-3 mt-2">
            <h2 className="text-4xl font-bold text-emerald-600">{data.currency}{Math.round(calculatedAnnualSavings).toLocaleString()}</h2>
            <span className="text-emerald-600 font-medium mb-1 flex items-center">
              <ArrowDown className="w-4 h-4 mr-0.5" />{savingsPercent}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Based on selected actions</p>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Efficiency Upgrade</p>
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
        <div id="savings-panel" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 col-span-2 scroll-mt-24">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                Bill Impact ({viewMode})
                {selectedRecs.size < data.recommendations.length && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                     Modified Plan
                  </span>
                )}
              </h3>
              
              {/* Toggle Switch */}
              <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                  <button 
                    onClick={() => setViewMode('Monthly')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'Monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setViewMode('Weekly')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'Weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Weekly
                  </button>
                  <button 
                    onClick={() => setViewMode('Daily')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'Daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Daily
                  </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Chart & Stats */}
              <div className="flex flex-col justify-between">
                 <div className="h-40 w-full mb-4">
                    <SavingsChart 
                      current={displayCurrent} 
                      projected={displayProjected} 
                      currency={data.currency} 
                      label={`${viewMode} Cost`}
                    />
                 </div>
                 <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-4">
                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">Current</p>
                        <p className="text-lg font-bold text-slate-700">{data.currency}{displayCurrent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-emerald-600/70 font-medium mb-0.5">Projected</p>
                        <p className="text-lg font-bold text-emerald-600">{data.currency}{displayProjected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                 </div>
              </div>

              {/* Right Column: Recommendation List Preview */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col max-h-[260px]">
                 <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
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
                            className={`flex-1 p-2 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                               isSelected ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-100/50 border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                             <div className={`mt-0.5 ${isSelected ? 'text-emerald-500' : 'text-slate-300'}`}>
                                {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${isSelected ? 'text-slate-700' : 'text-slate-500'}`}>{rec.title}</p>
                                <div className="flex items-center justify-between mt-0.5">
                                   <span className="text-[10px] text-slate-400 truncate">{rec.category}</span>
                                   <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      -{data.currency}{viewSaving.toFixed(2)}
                                   </span>
                                </div>
                             </div>
                          </div>
                          <button
                              onClick={(e) => scrollToRec(e, idx)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                              title="View Details"
                          >
                              <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Executive Summary</h3>
          <div className="prose prose-slate max-w-none text-slate-600">
            <ReactMarkdown components={MarkdownComponents}>{data.summary}</ReactMarkdown>
          </div>
        </div>

        {/* Neighborhood Benchmark & EPC */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
            
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">Neighborhood</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center relative z-10">
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 font-medium">Efficiency Score</span>
                  <span className="font-bold text-slate-700">{data.comparison.efficiencyPercentile}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-100">
                  <div 
                    className="bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500 h-full rounded-full transition-all duration-1000 relative"
                    style={{ width: `${data.comparison.efficiencyPercentile}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white opacity-50"></div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 text-right">Better than {data.comparison.efficiencyPercentile}% of similar homes</p>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Local Benchmark</p>
                <p className="text-2xl font-bold text-slate-800">{data.currency}{data.comparison.similarHomeAvgCost}<span className="text-sm font-normal text-slate-400">/mo</span></p>
              </div>

              <div className="text-sm text-slate-600 italic leading-relaxed line-clamp-3">
                 "{renderTextWithCitations(data.comparison.description)}"
              </div>
            </div>
          </div>

          {/* EPC Chart */}
          {data.epc && (
             <EPCBadge current={data.epc.current} potential={data.epc.potential} />
          )}
        </div>
      </div>

      {/* Usage Trends Chart */}
      {data.usageBreakdown && (
        <UsageTrendsChart data={data.usageBreakdown} currency={data.currency} />
      )}

      {/* Recommendations Grid */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-emerald-500" />
          Recommended Actions
          <span className="text-sm font-normal text-slate-400 ml-2">Select actions to update projected savings</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.recommendations.map((rec, idx) => {
            const sourceUrl = getPrimarySourceUrl(rec.description);
            const isSelected = selectedRecs.has(idx);
            
            return (
              <div 
                key={idx} 
                id={`rec-${idx}`}
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all flex flex-col group cursor-pointer relative ${
                    isSelected ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-slate-200 opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
                }`}
                onClick={() => toggleRec(idx)}
              >
                {/* Selection Checkbox (Visual) */}
                <div className="absolute top-6 right-6 text-emerald-500">
                    {isSelected ? <CheckCircle2 className="w-6 h-6 fill-emerald-50" /> : <Circle className="w-6 h-6 text-slate-300" />}
                </div>

                <div className="flex justify-between items-start mb-4 pr-10">
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
                
                {/* Impact Badge - Moved below header to avoid collision with checkbox */}
                <div className="mb-4">
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold border inline-flex items-center justify-center min-w-[80px] ${getImpactColor(rec.impact)}`}>
                        {rec.impact}
                     </span>
                </div>
                
                <div className="text-slate-600 text-sm mb-4 min-h-[60px] flex-grow">
                  {renderTextWithCitations(rec.description)}
                </div>
                
                <div className={`pt-4 border-t mt-auto transition-colors ${isSelected ? 'border-slate-100' : 'border-slate-100/50'}`}>
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
                       {/* Scroll Back To Savings Impact Button */}
                       <button
                          onClick={(e) => {
                              e.stopPropagation();
                              scrollToPanel('savings-panel');
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all group/btn"
                          title="View Impact on Savings"
                       >
                          <LineChart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline"></span>
                       </button>

                       {sourceUrl && (
                         <a 
                           href={sourceUrl} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           onClick={(e) => e.stopPropagation()} // Prevent card toggle
                           className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-100 hover:border-emerald-200 transition-all group/btn"
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
      <div className="border-t border-slate-200 pt-8 mt-12" id="references-section">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* References / Data Sources */}
            <div>
               <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  References & Data Sources
               </h4>
               <ol className="list-decimal list-inside space-y-3 text-xs text-slate-600">
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

            {/* Analyzed Documents */}
            <div>
               <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Analyzed Source Documents
               </h4>
               <ul className="space-y-2">
                  {data.sourceDocuments && data.sourceDocuments.length > 0 ? (
                    data.sourceDocuments.map((doc, i) => (
                      <li key={i}>
                        {doc.url ? (
                          <a 
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all group"
                          >
                             {getFileIcon(doc.type)}
                             <span className="truncate flex-1 group-hover:text-emerald-700">{doc.name}</span>
                             {doc.date && <span className="text-slate-400 text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">{doc.date}</span>}
                             <Download className="w-3 h-3 text-slate-300 group-hover:text-emerald-500" />
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg opacity-75">
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
         <p className="text-center text-[10px] text-slate-400 mt-12">
            Generated by EcoRetrofit AI using Gemini 2.5 Flash. Information provided for guidance only.
         </p>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
