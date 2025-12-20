
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateRetrofitVisualization } from '../services/geminiService';
import Button from './Button';
import Demo3DView, { Demo3DViewHandle } from './Demo3DView';
import { AnalysisResult, Recommendation } from '../types';
import { Sparkles, X, ImageIcon, AlertCircle, RotateCw, RotateCcw, Box, Layers, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

interface RetrofitVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  homeImages: string[]; // Base64 strings
  recommendations: Recommendation[];
  analysisResult?: AnalysisResult;
  isDemoMode?: boolean;
}

type ViewAngle = 'Front Isometric' | 'Rotate Left' | 'Rotate Right' | 'Top-Down Plan';
type DetailLevel = 'Standard' | 'High';

const RetrofitVisualizer: React.FC<RetrofitVisualizerProps> = ({ 
  isOpen, 
  onClose, 
  homeImages, 
  recommendations,
  analysisResult,
  isDemoMode = false
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // Strategy Builder State
  const [activeActions, setActiveActions] = useState<Set<number>>(new Set());
  
  const [viewAngle, setViewAngle] = useState<ViewAngle>('Front Isometric');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('Standard');

  const demo3DRef = useRef<Demo3DViewHandle>(null);
  
  // Cache key: combined actions sorted + view params
  const [renderCache, setRenderCache] = useState<Record<string, string>>({});

  // Sync internal view with forcedView prop
  const forced3DView = useMemo(() => {
      switch(viewAngle) {
          case 'Top-Down Plan': return 'top';
          case 'Rotate Left': return 'left';
          case 'Rotate Right': return 'right';
          case 'Front Isometric':
          default: return 'perspective';
      }
  }, [viewAngle]);

  const toggleAction = (idx: number) => {
    const newSet = new Set(activeActions);
    if (newSet.has(idx)) {
        newSet.delete(idx);
    } else {
        newSet.add(idx);
    }
    setActiveActions(newSet);
  };

  const combinedTitle = useMemo(() => {
      if (activeActions.size === 0) return "General efficiency improvements";
      return Array.from(activeActions)
        .map(idx => recommendations[idx].title)
        .join(" and ");
  }, [activeActions, recommendations]);

  const handleGenerate = useCallback(async () => {
    const actionKey = Array.from(activeActions).sort().join(",");
    const cacheKey = `${actionKey}|${viewAngle}|${detailLevel}`;
    
    if (renderCache[cacheKey]) {
        setError(null);
        setGeneratedImage(renderCache[cacheKey]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      let sourceImage = '';
      
      if (demo3DRef.current) {
          const snapshot = demo3DRef.current.getSnapshot();
          if (snapshot) sourceImage = snapshot;
      }

      if (!sourceImage && homeImages.length > 0) {
          sourceImage = homeImages[selectedImageIndex];
      }

      if (!sourceImage) {
          throw new Error("No source visual found to analyse.");
      }

      const result = await generateRetrofitVisualization(
          sourceImage, 
          combinedTitle,
          viewAngle,
          detailLevel
      );
      
      setRenderCache(prev => ({
          ...prev,
          [cacheKey]: result
      }));
      
      setGeneratedImage(result);
    } catch (err) {
      console.error(err);
      setError("Could not generate visualisation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [homeImages, selectedImageIndex, combinedTitle, viewAngle, detailLevel, renderCache, activeActions]);

  // Handle cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setGeneratedImage(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-4">
      {/* Modal Container with explicit height to ensure internal scrolling works */}
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
        
        {/* Header - Top Bar with Action Button */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-600" />
                Retrofit Strategy Visualiser
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                AI Structural Simulation
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2 bg-purple-100/50 px-3 py-1.5 rounded-lg border border-purple-100">
               <Layers className="w-4 h-4 text-purple-600" />
               <span className="text-xs font-bold text-purple-700">{activeActions.size} Measures Selected</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
                onClick={handleGenerate} 
                disabled={isLoading || activeActions.size === 0} 
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transform active:scale-95 transition-all"
            >
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <Sparkles className="w-4 h-4" />
                )}
                {isLoading ? 'Synthesising...' : 'Apply Strategy'}
            </Button>
            
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-full relative bg-slate-50">
            
              {/* Left: Strategy Builder Sidebar */}
              {/* md:h-full ensures full height on desktop. h-[40%] on mobile gives space for render area. */}
              <div className="md:w-80 w-full h-[40%] md:h-full border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col z-10 shadow-xl overflow-hidden shrink-0">
                  <div className="p-5 flex-1 overflow-y-auto min-h-0">
                      
                      {/* 1. Measure Strategy */}
                      <div className="mb-8">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[10px] text-slate-500 font-black">1</span>
                              Select Measures
                          </h3>
                          <div className="space-y-2">
                              {recommendations.map((rec, idx) => {
                                  const isActive = activeActions.has(idx);
                                  return (
                                      <button
                                          key={idx}
                                          onClick={() => toggleAction(idx)}
                                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                                              isActive 
                                              ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-sm' 
                                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                          }`}
                                      >
                                          <div className={`mt-0.5 shrink-0 transition-colors ${isActive ? 'text-purple-600' : 'text-slate-300'}`}>
                                              {isActive ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="text-xs font-bold leading-tight truncate">{rec.title}</p>
                                              <p className="text-[10px] opacity-60 mt-1 font-medium">{rec.category}</p>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {/* 2. View Angle */}
                      <div className="mb-8">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[10px] text-slate-500 font-black">2</span>
                              View Perspective
                          </h3>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                              {(['Front Isometric', 'Top-Down Plan'] as ViewAngle[]).map(angle => (
                                  <button 
                                    key={angle}
                                    onClick={() => setViewAngle(angle)}
                                    className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${viewAngle === angle ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'}`}
                                  >
                                      {angle === 'Front Isometric' ? 'Isometric' : 'Top Plan'}
                                  </button>
                              ))}
                          </div>
                          <div className="flex gap-2">
                              <button 
                                onClick={() => setViewAngle('Rotate Left')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-[11px] font-bold transition-all ${viewAngle === 'Rotate Left' ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                              >
                                  <RotateCcw className="w-4 h-4" /> 45° L
                              </button>
                              <button 
                                onClick={() => setViewAngle('Rotate Right')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-[11px] font-bold transition-all ${viewAngle === 'Rotate Right' ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                              >
                                  45° R <RotateCw className="w-4 h-4" />
                              </button>
                          </div>
                      </div>

                      {/* 3. Detail */}
                      <div className="mb-8">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[10px] text-slate-500 font-black">3</span>
                              Granularity
                          </h3>
                          <div className="space-y-2">
                              {(['Standard', 'High'] as DetailLevel[]).map(level => (
                                  <label key={level} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${detailLevel === level ? 'bg-white border-purple-200 ring-1 ring-purple-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-70 hover:opacity-100'}`}>
                                    <input 
                                        type="radio" name="detail" className="accent-purple-600 w-4 h-4" 
                                        checked={detailLevel === level} 
                                        onChange={() => setDetailLevel(level)}
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            {level === 'High' ? <>High Fidelity <span className="bg-purple-100 text-purple-700 px-1.5 rounded text-[9px] font-black uppercase">HD</span></> : 'Fast Draft'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{level === 'High' ? 'Ray-traced lighting.' : 'Quick structure scan.'}</p>
                                    </div>
                                  </label>
                              ))}
                          </div>
                      </div>

                  </div>
                  
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-center text-slate-400 font-medium">
                      Select measures and click "Apply Strategy" to render changes.
                  </div>
              </div>

              {/* Right: Render Area */}
              <div className="flex-1 flex flex-col relative overflow-hidden h-[60%] md:h-full">
                  <div className="flex-1 flex items-center justify-center p-8 relative">
                      
                      {/* Interactive Context */}
                      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${generatedImage && !showComparison ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                          <Demo3DView 
                              analysisData={analysisResult} 
                              isDemoMode={isDemoMode} 
                              minimalUI={true} 
                              forcedView={forced3DView}
                          />
                      </div>

                      {isLoading && (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md animate-fade-in">
                            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-purple-100 max-w-sm text-center">
                                <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-6"></div>
                                <h4 className="text-purple-900 font-black text-lg mb-2">Simulating Strategy...</h4>
                                <p className="text-xs text-purple-600/70 leading-relaxed px-4">{combinedTitle}</p>
                                <div className="mt-6 flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"></div>
                                   <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]"></div>
                                   <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                          </div>
                      )}

                      {error && (
                          <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-sm relative z-30 animate-fade-in">
                              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                              <h4 className="text-slate-900 font-black mb-2">Analysis Interrupted</h4>
                              <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
                              <Button onClick={handleGenerate} className="mt-6 bg-slate-900 text-white w-full">Try Again</Button>
                          </div>
                      )}

                      {generatedImage && !showComparison && (
                          <div className="relative w-full h-full flex items-center justify-center z-10 group animate-fade-in">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 max-h-full max-w-full bg-white">
                                <img 
                                    src={`data:image/jpeg;base64,${generatedImage}`} 
                                    alt="Retrofit Visualisation" 
                                    className="max-h-full max-w-full object-contain"
                                />
                                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-xl flex items-center gap-2 border border-white/20">
                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                    AI Render Active
                                </div>
                            </div>
                          </div>
                      )}
                      
                      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-3">
                          <button
                              onMouseDown={() => setShowComparison(true)}
                              onMouseUp={() => setShowComparison(false)}
                              onMouseLeave={() => setShowComparison(false)}
                              onTouchStart={() => setShowComparison(true)}
                              onTouchEnd={() => setShowComparison(false)}
                              className="bg-white/90 hover:bg-white text-slate-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl border border-slate-200 flex items-center gap-2.5 transition-all active:scale-95 backdrop-blur-md"
                          >
                              {showComparison ? <Eye className="w-4 h-4 text-purple-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                              {showComparison ? 'Viewing Structural Model' : 'Hold to View Original'}
                          </button>
                      </div>
                  </div>
                  
                  {generatedImage && (
                      <div className="h-16 border-t border-slate-200 bg-white flex items-center justify-between px-6 z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Combined Strategy Synthesised</span>
                            </div>
                            <a 
                              href={`data:image/jpeg;base64,${generatedImage}`} 
                              download={`retrofit-strategy-${activeActions.size}-measures.jpg`}
                              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                              Download Concept
                            </a>
                      </div>
                  )}
              </div>
        </div>
      </div>
    </div>
  );
};

export default RetrofitVisualizer;
