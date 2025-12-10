
import React, { useState, useRef } from 'react';
import { Upload, AlertTriangle, ExternalLink, Loader2, CheckCircle2, ChevronDown, ChevronUp, FileText, Calendar, Maximize, Hash, Info } from 'lucide-react';
import { EPCRating } from '../types';

interface EPCBadgeProps {
  epcData?: EPCRating;
  current?: string;
  potential?: string;
  isEstimate?: boolean;
  isLoading?: boolean;
  onFileSelected?: (file: File) => void;
}

const EPCBadge: React.FC<EPCBadgeProps> = ({ epcData, current: propCurrent, potential: propPotential, isEstimate: propEstimate, isLoading, onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback to props if epcData object isn't provided (for backward compat)
  const current = epcData?.current || propCurrent || 'E';
  const potential = epcData?.potential || propPotential || 'C';
  const isEstimate = epcData?.isEstimate ?? propEstimate ?? true;

  const grades = [
    { grade: 'A', range: '92+', color: '#008054', width: '28%', desc: 'Excellent efficiency - Lowest possible running costs' },
    { grade: 'B', range: '81-91', color: '#19b459', width: '38%', desc: 'Very efficient - Low running costs' },
    { grade: 'C', range: '69-80', color: '#8dce46', width: '48%', desc: 'Average efficiency - Standard running costs' },
    { grade: 'D', range: '55-68', color: '#ffd500', width: '58%', desc: 'Below average - Higher running costs' },
    { grade: 'E', range: '39-54', color: '#fcc035', width: '68%', desc: 'Low efficiency - High running costs' },
    { grade: 'F', range: '21-38', color: '#ea7500', width: '78%', desc: 'Very low efficiency - Very high running costs' },
    { grade: 'G', range: '1-20', color: '#e32f21', width: '88%', desc: 'Inefficient - Extremely high running costs' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isLoading && e.dataTransfer.files && e.dataTransfer.files.length > 0 && onFileSelected) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFileSelected) {
      onFileSelected(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const getRatingColor = (rating: string) => {
      const r = rating.toLowerCase();
      if (r.includes('good') || r.includes('very good')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      if (r.includes('average')) return 'text-amber-600 bg-amber-50 border-amber-100';
      if (r.includes('poor')) return 'text-red-600 bg-red-50 border-red-100';
      return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  const isMaxPotential = current === potential;

  return (
    <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden transition-all duration-300">
      {isLoading && (
         <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex items-center justify-center flex-col gap-3 transition-opacity duration-300">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-sm font-semibold text-emerald-700 animate-pulse">Extracting Certificate Data...</p>
         </div>
      )}

      <div className="flex justify-between items-start mb-3">
         <div>
            <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                Energy Efficiency Rating
                {isEstimate ? (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-medium border border-amber-200">ESTIMATED</span>
                ) : (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                    </span>
                )}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Higher cost efficiency <span className="mx-1">•</span> Lower CO₂ emissions
            </p>
         </div>
         {!isEstimate && epcData?.score && (
             <div className="text-right">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Score</p>
                <p className="text-2xl font-bold text-slate-800 leading-none">{epcData.score}</p>
             </div>
         )}
      </div>
      
      {/* Container with right padding to reserve space for the badges */}
      <div className="space-y-1.5 relative pr-28"> 
        {grades.map((item) => (
           <div 
             key={item.grade} 
             className="flex items-center h-7 relative group cursor-help"
             title={`${item.grade} Rating: ${item.desc}`} // Native tooltip
           >
              {/* Colored Bar */}
              <div 
                className="h-full flex items-center justify-between px-3 text-white font-bold text-sm shadow-sm transition-all duration-500 relative z-0 opacity-90 group-hover:opacity-100"
                style={{ 
                  width: item.width, 
                  backgroundColor: item.color,
                  clipPath: 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)' // Arrow shape
                }}
              >
                <span>{item.grade}</span>
                <span className="text-[10px] opacity-80 font-normal hidden sm:inline">{item.range}</span>
              </div>
              
              {/* Current Indicator Badge (Right Aligned) */}
              {current === item.grade && (
                 <div className="absolute right-0 flex items-center z-10 animate-fade-in-left">
                    <div className="bg-slate-900 text-white text-xs font-bold h-7 px-3 min-w-[85px] flex items-center justify-center shadow-lg relative rounded-sm">
                       Current
                       <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-slate-900"></div>
                    </div>
                 </div>
              )}

              {/* Potential Indicator Badge (Right Aligned) */}
              {potential === item.grade && (
                 <div className={`absolute right-0 flex items-center z-10 animate-fade-in-left ${potential === current ? 'mt-8' : ''}`}>
                     <div className="bg-slate-400 text-white text-xs font-bold h-7 px-3 min-w-[85px] flex items-center justify-center shadow-sm relative rounded-sm">
                        Potential
                        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-slate-400"></div>
                     </div>
                 </div>
              )}
           </div>
        ))}
        
        {/* Subtle vertical guide line for alignment */}
        <div className="absolute top-0 bottom-0 right-[85px] w-px bg-slate-100 border-l border-dashed border-slate-200 -z-10"></div>
      </div>
      
      {isEstimate && (
        <div className="mt-4 pt-3 border-t border-slate-100">
           <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Estimated Rating
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                     Derived from your bills. 
                     <a 
                       href="https://www.gov.uk/find-energy-certificate" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-emerald-600 hover:text-emerald-700 hover:underline ml-1 inline-flex items-center gap-0.5 font-medium transition-colors"
                     >
                       Find your official EPC <ExternalLink className="w-2.5 h-2.5" />
                     </a>
                  </div>
              </div>
              
              {onFileSelected && (
                <div
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative w-40 h-14 shrink-0 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all group ${
                        isDragging 
                        ? 'border-emerald-500 bg-emerald-50 scale-105' 
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50 bg-white'
                    } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="application/pdf,image/*" 
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center pointer-events-none">
                        <Upload className={`w-4 h-4 mb-0.5 transition-colors ${isDragging ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                        <span className={`text-[9px] font-bold transition-colors ${isDragging ? 'text-emerald-700' : 'text-slate-400 group-hover:text-emerald-600'}`}>
                           Drop PDF or Click
                        </span>
                    </div>
                </div>
              )}
           </div>
        </div>
      )}
      
      {!isEstimate && (
        <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between bg-emerald-50/50 rounded-lg p-2 border border-emerald-100 mb-3">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                   <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 
                   <span>Certificate Verified</span>
                </p>
                <div className="flex gap-4 text-xs items-center">
                    <span className="font-medium text-slate-600 flex items-center gap-1">
                        Current: <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">{current}</span>
                    </span>
                    <span className="font-medium text-slate-600 flex items-center gap-1">
                        Potential: <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">{potential}</span>
                    </span>
                </div>
            </div>

            {/* AI Insight Box for Current=Potential */}
            {isMaxPotential && epcData?.upgradePotentialExplanation && (
               <div className="mb-3 bg-amber-50 border border-amber-100 rounded-lg p-3 relative">
                  <div className="flex items-start gap-2">
                     <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                     <div>
                        <p className="text-xs font-bold text-amber-800 mb-0.5">Efficiency Ceiling Reached?</p>
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                           {epcData.upgradePotentialExplanation}
                        </p>
                     </div>
                  </div>
               </div>
            )}

            {/* Accordion Trigger */}
            <button 
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors py-1 mb-2"
            >
                <span>Certificate Data</span>
                {isDetailsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Expanded Details */}
            {isDetailsExpanded && epcData && (
                <div className="animate-fade-in space-y-3">
                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                             <FileText className="w-3.5 h-3.5 text-slate-400" />
                             <div>
                                 <p className="text-slate-400 uppercase tracking-wider font-semibold text-[9px]">Property Type</p>
                                 <p className="font-medium text-slate-700 truncate">{epcData.propertyType || 'N/A'}</p>
                             </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                             <Maximize className="w-3.5 h-3.5 text-slate-400" />
                             <div>
                                 <p className="text-slate-400 uppercase tracking-wider font-semibold text-[9px]">Total Area</p>
                                 <p className="font-medium text-slate-700 truncate">{epcData.totalFloorArea || 'N/A'}</p>
                             </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                             <Calendar className="w-3.5 h-3.5 text-slate-400" />
                             <div>
                                 <p className="text-slate-400 uppercase tracking-wider font-semibold text-[9px]">Valid Until</p>
                                 <p className="font-medium text-slate-700 truncate">{epcData.validUntil || 'N/A'}</p>
                             </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                             <Hash className="w-3.5 h-3.5 text-slate-400" />
                             <div>
                                 <p className="text-slate-400 uppercase tracking-wider font-semibold text-[9px]">Certificate</p>
                                 <p className="font-medium text-slate-700 truncate" title={epcData.certificateNumber}>
                                     {epcData.certificateNumber ? `${epcData.certificateNumber.slice(0, 9)}...` : 'N/A'}
                                 </p>
                             </div>
                        </div>
                    </div>

                    {/* Breakdown Table */}
                    {epcData.breakdown && epcData.breakdown.length > 0 && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-[10px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold text-slate-600">Feature</th>
                                        <th className="px-3 py-2 font-semibold text-slate-600">Description</th>
                                        <th className="px-3 py-2 font-semibold text-slate-600 text-right">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {epcData.breakdown.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-3 py-1.5 font-medium text-slate-700">{item.name}</td>
                                            <td className="px-3 py-1.5 text-slate-500">{item.description}</td>
                                            <td className="px-3 py-1.5 text-right">
                                                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${getRatingColor(item.rating)}`}>
                                                    {item.rating}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EPCBadge;
