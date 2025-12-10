
import React from 'react';
import { Upload, AlertTriangle } from 'lucide-react';

interface EPCBadgeProps {
  current: string;
  potential: string;
  isEstimate?: boolean;
  onUploadClick?: () => void;
}

const EPCBadge: React.FC<EPCBadgeProps> = ({ current, potential, isEstimate, onUploadClick }) => {
  const grades = [
    { grade: 'A', range: '92+', color: '#008054', width: '28%', desc: 'Excellent efficiency - Lowest possible running costs' },
    { grade: 'B', range: '81-91', color: '#19b459', width: '38%', desc: 'Very efficient - Low running costs' },
    { grade: 'C', range: '69-80', color: '#8dce46', width: '48%', desc: 'Average efficiency - Standard running costs' },
    { grade: 'D', range: '55-68', color: '#ffd500', width: '58%', desc: 'Below average - Higher running costs' },
    { grade: 'E', range: '39-54', color: '#fcc035', width: '68%', desc: 'Low efficiency - High running costs' },
    { grade: 'F', range: '21-38', color: '#ea7500', width: '78%', desc: 'Very low efficiency - Very high running costs' },
    { grade: 'G', range: '1-20', color: '#e32f21', width: '88%', desc: 'Inefficient - Extremely high running costs' },
  ];

  return (
    <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-3">
         <div>
            <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                Energy Efficiency Rating
                {isEstimate && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-medium border border-amber-200">ESTIMATED</span>}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Higher cost efficiency <span className="mx-1">•</span> Lower CO₂ emissions
            </p>
         </div>
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
              {potential === item.grade && potential !== current && (
                 <div className="absolute right-0 flex items-center z-10 animate-fade-in-left">
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
           <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Estimated Rating
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                     Derived from your energy bills and home profile.
                  </p>
              </div>
              {onUploadClick && (
                <button 
                  onClick={onUploadClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-md hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-sm whitespace-nowrap"
                >
                    <Upload className="w-3 h-3" />
                    Upload Official EPC
                </button>
              )}
           </div>
        </div>
      )}
      
      {!isEstimate && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
            <p className="text-xs text-slate-400 italic">
            * Graph mimics official UK EPC format.
            </p>
        </div>
      )}
    </div>
  );
};

export default EPCBadge;
