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
         <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current</span>
      </div>
      
      <div className="space-y-2 relative pr-16"> 
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

              {/* Current Indicator Arrow (Right Side) */}
              {current === item.grade && (
                 <div className="absolute right-0 flex items-center animate-fade-in-left z-10" style={{ right: '-60px' }}>
                    <div className="bg-slate-800 text-white text-sm font-bold h-8 px-3 flex items-center justify-center shadow-lg relative">
                       Current
                       {/* Arrow pointing left into the bar */}
                       <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[10px] border-r-slate-800"></div>
                    </div>
                 </div>
              )}

              {/* Potential Indicator (Ghosted inline or secondary marker) */}
              {potential === item.grade && potential !== current && (
                 <div className="absolute left-full ml-4 flex items-center opacity-40 hover:opacity-100 transition-opacity" style={{ left: item.width }}>
                     <div className="text-xs font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                        <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-slate-400"></div>
                        Potential
                     </div>
                 </div>
              )}
           </div>
        ))}

        {/* Vertical alignment line for potential if desired, or just keep simple */}
        <div className="absolute top-0 bottom-0 right-[-60px] w-px bg-slate-100 -z-10"></div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
         <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-3 h-3 bg-slate-800 block"></span> Current Rating
            <span className="w-3 h-3 bg-slate-300 block ml-4"></span> Potential Rating
         </div>
         <p className="text-xs text-slate-400 italic">
           * Graph mimics official UK EPC format. Actual certification requires a qualified assessor.
         </p>
      </div>
    </div>
  );
};

export default EPCBadge;