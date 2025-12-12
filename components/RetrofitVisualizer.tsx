
import React, { useState } from 'react';
import { generateRetrofitVisualization } from '../services/geminiService';
import Button from './Button';
import { Sparkles, X, ChevronRight, ImageIcon, AlertCircle, RotateCw, RotateCcw, Box, Layers, Maximize2 } from 'lucide-react';

interface RetrofitVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  homeImages: string[]; // Base64 strings
  recommendationTitle: string; // e.g., "Install Solar Panels"
}

type ViewAngle = 'Front Isometric' | 'Rotate Left' | 'Rotate Right' | 'Top-Down Plan';
type DetailLevel = 'Standard' | 'High';

const RetrofitVisualizer: React.FC<RetrofitVisualizerProps> = ({ 
  isOpen, 
  onClose, 
  homeImages, 
  recommendationTitle 
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 3D Controls State
  const [viewAngle, setViewAngle] = useState<ViewAngle>('Front Isometric');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('High'); // Default to High for Pro model quality

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (homeImages.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Pass the selected image AND the 3D control parameters to the AI service
      const result = await generateRetrofitVisualization(
          homeImages[selectedImageIndex], 
          recommendationTitle,
          viewAngle,
          detailLevel
      );
      setGeneratedImage(result);
    } catch (err) {
      console.error(err);
      setError("Could not generate visualization. Please try again or select a different photo.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasImages = homeImages && homeImages.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Box className="w-5 h-5 text-purple-600" />
              3D Architectural Visualizer
            </h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              Visualizing: <span className="font-semibold text-slate-700">{recommendationTitle}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row h-full">
          {!hasImages ? (
             <div className="w-full flex flex-col items-center justify-center text-slate-400 p-12">
                <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                <p>No home photos available to visualize.</p>
                <p className="text-xs mt-1">Upload photos in the main screen to use this feature.</p>
             </div>
          ) : (
            <>
               {/* Left: Controls & Source */}
               <div className="lg:w-80 border-r border-slate-200 bg-white flex flex-col z-10 shadow-lg">
                  <div className="p-4 flex-1 overflow-y-auto">
                      
                      {/* 1. Source Image */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Source Photo</h3>
                          <div className="grid grid-cols-2 gap-2">
                             {homeImages.map((img, idx) => (
                                <div 
                                  key={idx}
                                  onClick={() => { setSelectedImageIndex(idx); setGeneratedImage(null); }}
                                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedImageIndex === idx ? 'border-purple-600 ring-2 ring-purple-100' : 'border-transparent hover:border-slate-300'}`}
                                >
                                   <img src={`data:image/jpeg;base64,${img}`} alt={`Home ${idx}`} className="w-full h-full object-cover" />
                                   {selectedImageIndex === idx && (
                                      <div className="absolute inset-0 bg-purple-900/10 flex items-center justify-center">
                                         <div className="bg-white rounded-full p-1 shadow-sm">
                                            <Sparkles className="w-3 h-3 text-purple-600" />
                                         </div>
                                      </div>
                                   )}
                                </div>
                             ))}
                          </div>
                      </div>

                      {/* 2. 3D Rotation Controls */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              2. View Angle
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-sm normal-case font-medium">Generative Rotation</span>
                          </h3>
                          
                          <div className="flex bg-slate-100 p-1 rounded-lg mb-2">
                              <button 
                                onClick={() => setViewAngle('Front Isometric')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewAngle === 'Front Isometric' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                  Front
                              </button>
                              <button 
                                onClick={() => setViewAngle('Top-Down Plan')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewAngle === 'Top-Down Plan' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                  Top Plan
                              </button>
                          </div>
                          
                          <div className="flex gap-2">
                              <button 
                                onClick={() => setViewAngle('Rotate Left')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-bold transition-all ${viewAngle === 'Rotate Left' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                              >
                                  <RotateCcw className="w-3.5 h-3.5" /> 45° Left
                              </button>
                              <button 
                                onClick={() => setViewAngle('Rotate Right')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-bold transition-all ${viewAngle === 'Rotate Right' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                              >
                                  45° Right <RotateCw className="w-3.5 h-3.5" />
                              </button>
                          </div>
                      </div>

                      {/* 3. Granularity / Detail */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Granularity</h3>
                          <div className="space-y-2">
                             <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${detailLevel === 'Standard' ? 'bg-white border-purple-200 ring-1 ring-purple-100' : 'bg-slate-50 border-transparent opacity-70 hover:opacity-100'}`}>
                                <input 
                                    type="radio" name="detail" className="accent-purple-600" 
                                    checked={detailLevel === 'Standard'} 
                                    onChange={() => setDetailLevel('Standard')}
                                />
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Standard Model</p>
                                    <p className="text-[10px] text-slate-500">Fast generation, smooth surfaces.</p>
                                </div>
                             </label>
                             <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${detailLevel === 'High' ? 'bg-white border-purple-200 ring-1 ring-purple-100' : 'bg-slate-50 border-transparent opacity-70 hover:opacity-100'}`}>
                                <input 
                                    type="radio" name="detail" className="accent-purple-600" 
                                    checked={detailLevel === 'High'} 
                                    onChange={() => setDetailLevel('High')}
                                />
                                <div>
                                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                       High Fidelity <span className="bg-purple-100 text-purple-700 px-1 rounded text-[9px]">HD</span>
                                    </p>
                                    <p className="text-[10px] text-slate-500">Granular textures, realistic lighting.</p>
                                </div>
                             </label>
                          </div>
                      </div>

                  </div>
                  
                  {/* Action Footer */}
                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                      <Button 
                        onClick={handleGenerate} 
                        disabled={isLoading} 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200"
                      >
                         {isLoading ? 'Processing...' : 'Generate View'}
                      </Button>
                  </div>
               </div>

               {/* Right: Render Area */}
               <div className="flex-1 bg-slate-100/50 flex flex-col relative overflow-hidden">
                   
                  {/* Canvas Area */}
                  <div className="flex-1 flex items-center justify-center p-6 relative">
                      {/* Grid Background */}
                      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ 
                          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                          backgroundSize: '40px 40px'
                      }}></div>

                      {isLoading && (
                         <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-purple-100">
                                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-purple-800 font-bold mb-1">Rendering 3D View...</p>
                                <p className="text-xs text-purple-600/70">{viewAngle} • {detailLevel} Detail</p>
                            </div>
                         </div>
                      )}

                      {error && (
                          <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-sm relative z-10">
                              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                              <p className="text-slate-800 font-bold mb-1">Render Failed</p>
                              <p className="text-sm text-slate-500">{error}</p>
                          </div>
                      )}

                      {!isLoading && !generatedImage && !error && (
                         <div className="text-center text-slate-400 relative z-10">
                            <div className="w-20 h-20 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Box className="w-10 h-10 text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-500">Ready to Render</p>
                            <p className="text-sm mt-1">Configure your view settings on the left and click Generate.</p>
                         </div>
                      )}

                      {generatedImage && (
                         <div className="relative w-full h-full flex items-center justify-center z-10 group animate-fade-in">
                            <div className="relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-slate-900/5 max-h-full max-w-full">
                                <img 
                                    src={`data:image/jpeg;base64,${generatedImage}`} 
                                    alt="Retrofit Visualization" 
                                    className="max-h-full max-w-full object-contain"
                                />
                                
                                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md flex items-center gap-2">
                                   <Layers className="w-3.5 h-3.5 text-purple-300" />
                                   {viewAngle}
                                </div>
                                <div className="absolute bottom-4 right-4 bg-white/90 text-purple-800 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md shadow-sm">
                                   AI Render Preview
                                </div>
                            </div>
                         </div>
                      )}
                  </div>
                  
                  {/* Bottom Toolbar */}
                  {generatedImage && (
                      <div className="h-16 border-t border-slate-200 bg-white flex items-center justify-between px-6 z-10">
                           <div className="flex items-center gap-2 text-xs text-slate-500">
                               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                               Render Complete
                           </div>
                           <a 
                              href={`data:image/jpeg;base64,${generatedImage}`} 
                              download={`retrofit-${recommendationTitle.toLowerCase().replace(/\s/g, '-')}-${viewAngle}.jpg`}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
                           >
                              Download Render
                           </a>
                      </div>
                  )}

               </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetrofitVisualizer;
