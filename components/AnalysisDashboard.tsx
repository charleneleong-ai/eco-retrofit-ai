
import React from 'react';
import { AnalysisResult } from '../types';
import SavingsChart from './SavingsChart';
import UsageTrendsChart from './UsageTrendsChart';
import EPCBadge from './EPCBadge';
import ReactMarkdown from 'react-markdown';
import { ArrowDown, Zap, Thermometer, Home, AlertCircle, Users, ExternalLink, BookOpen, MapPin, User, Calendar, PlusCircle } from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
  onUpdateAnalysis?: () => void;
}

const AnalysisDashboard: React.FC<DashboardProps> = ({ data, onUpdateAnalysis }) => {
  const annualSavings = (data.currentMonthlyAvg - data.projectedMonthlyAvg) * 12;
  const savingsPercent = Math.round(((data.currentMonthlyAvg - data.projectedMonthlyAvg) / data.currentMonthlyAvg) * 100);

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
            Update / Add Data
          </button>
        )}
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Projected Annual Savings</p>
          <div className="flex items-end gap-3 mt-2">
            <h2 className="text-4xl font-bold text-emerald-600">{data.currency}{Math.round(annualSavings).toLocaleString()}</h2>
            <span className="text-emerald-600 font-medium mb-1 flex items-center">
              <ArrowDown className="w-4 h-4 mr-0.5" />{savingsPercent}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Based on current vs. post-retrofit usage</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 col-span-2">
           <h3 className="text-sm font-medium text-slate-500 mb-4">Monthly Bill Impact</h3>
           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full h-40 md:h-auto">
                <SavingsChart current={data.currentMonthlyAvg} projected={data.projectedMonthlyAvg} currency={data.currency} />
              </div>
              <div className="space-y-4 min-w-[140px] w-full md:w-auto">
                  <div className="flex justify-between md:block">
                    <p className="text-xs text-slate-400">Current Average</p>
                    <p className="text-xl font-bold text-slate-700">{data.currency}{data.currentMonthlyAvg}</p>
                  </div>
                  <div className="flex justify-between md:block">
                    <p className="text-xs text-slate-400">Projected Average</p>
                    <p className="text-xl font-bold text-emerald-600">{data.currency}{data.projectedMonthlyAvg}</p>
                  </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Executive Summary</h3>
          <div className="prose prose-slate max-w-none text-slate-600">
            <ReactMarkdown>{data.summary}</ReactMarkdown>
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

              <p className="text-sm text-slate-600 italic leading-relaxed line-clamp-3">"{data.comparison.description}"</p>
            </div>
          </div>

          {/* EPC Chart */}
          {data.epc && (
             <EPCBadge current={data.epc.current} potential={data.epc.potential} />
          )}
        </div>
      </div>

      {/* Usage Trends Chart (New) */}
      {data.usageBreakdown && (
        <UsageTrendsChart data={data.usageBreakdown} currency={data.currency} />
      )}

      {/* Data Sources Section */}
      {data.dataSources && data.dataSources.length > 0 && (
         <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
               <BookOpen className="w-4 h-4 text-slate-500" />
               Data Sources & Benchmarks
            </h4>
            <div className="flex flex-wrap gap-2">
               {data.dataSources.map((source, i) => (
               <a 
                  key={i} 
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm hover:text-emerald-600 hover:border-emerald-200 transition-colors"
               >
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                  {source.title}
               </a>
               ))}
            </div>
         </div>
      )}

      {/* Recommendations Grid */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-emerald-500" />
          Recommended Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    {getCategoryIcon(rec.category)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{rec.title}</h4>
                    <span className="text-xs font-medium text-slate-500">{rec.category}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getImpactColor(rec.impact)}`}>
                  {rec.impact} Impact
                </span>
              </div>
              
              <p className="text-slate-600 text-sm mb-4 min-h-[60px]">{rec.description}</p>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                 <div>
                    <p className="text-slate-400 text-xs">Est. Cost</p>
                    <p className="font-semibold text-slate-700">{rec.estimatedCost}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-slate-400 text-xs">Yearly Savings</p>
                    <p className="font-semibold text-emerald-600">{rec.estimatedAnnualSavings}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
