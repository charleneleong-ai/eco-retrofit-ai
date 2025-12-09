
import React from 'react';

interface EPCBadgeProps {
  current: string;
  potential: string;
}

const EPCBadge: React.FC<EPCBadgeProps> = ({ current, potential }) => {
  const grades = [
    { grade: 'A', range: '92+', color: '#008054', width: '28%' },
    { grade: 'B', range: '81-91', color: '#19b459', width: '38%' },
    { grade: 'C', range: '69-80', color: '#8dce46', width: '48%' },
    { grade: 'D', range: '55-68', color: '#ffd500', width: '58%' },
    { grade: 'E', range: '39-54', color: '#fcc035', width: '68%' },
    { grade: 'F', range: '21-38', color: '#ea7500', width: '78%' },
    { grade: 'G', range: '1-20', color: '#e32f21', width: '88%' },
  ];

  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-end mb-6">
         <div>
            <h4 className="font-bold text-slate-800 text-base">Energy Efficiency Rating</h4>
            <p className="text-xs text-slate-500 mt-1">
              Higher cost efficiency <span className="mx-1">•</span> Lower CO₂ emissions
            </p>
         </div>
      </div>
      
      {/* Container with right padding to reserve space for the badges */}
      <div className="space-y-2 relative pr-28"> 
        {grades.map((item) => (
           <div key={item.grade} className="flex items-center h-8 relative group">
              {/* Colored Bar */}
              <div 
                className="h-full flex items-center justify-between px-3 text-white font-bold text-sm shadow-sm transition-all duration-500 relative z-0"
                style={{ 
                  width: item.width, 
                  backgroundColor: item.color,
                  clipPath: 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)' // Arrow shape
                }}
              >
                <span>{item.grade}</span>
                <span className="text-[10px] opacity-80 font-normal">{item.range}</span>
              </div>

              {/* Current Indicator Badge (Right Aligned) */}
              {current === item.grade && (
                 <div className="absolute right-0 flex items-center z-10 animate-fade-in-left">
                    <div className="bg-slate-900 text-white text-xs font-bold h-8 px-3 min-w-[85px] flex items-center justify-center shadow-lg relative rounded-sm">
                       Current
                       {/* Arrow pointing left */}
                       <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-slate-900"></div>
                    </div>
                 </div>
              )}

              {/* Potential Indicator Badge (Right Aligned) */}
              {potential === item.grade && potential !== current && (
                 <div className="absolute right-0 flex items-center z-10 animate-fade-in-left">
                     <div className="bg-slate-400 text-white text-xs font-bold h-8 px-3 min-w-[85px] flex items-center justify-center shadow-sm relative rounded-sm">
                        Potential
                        {/* Arrow pointing left */}
                        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-slate-400"></div>
                     </div>
                 </div>
              )}
           </div>
        ))}
        
        {/* Subtle vertical guide line for alignment */}
        <div className="absolute top-0 bottom-0 right-[85px] w-px bg-slate-100 border-l border-dashed border-slate-200 -z-10"></div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
         <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-slate-900 block rounded-sm"></span> Current
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-slate-400 block rounded-sm"></span> Potential
            </div>
         </div>
         <p className="text-xs text-slate-400 italic">
           * Graph mimics official UK EPC format. Actual certification requires a qualified assessor.
         </p>
      </div>
    </div>
  );
};

export default EPCBadge;
