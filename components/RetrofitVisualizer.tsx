
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
  const sidebar3DRef = useRef<Demo3DViewHandle>(null);
  
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

  const lastGeneratedRef = useRef<string>('');

  // Automatically select the first recommendation if none are selected when opening
  useEffect(() => {
    if (isOpen && activeActions.size === 0 && recommendations.length > 0) {
      setActiveActions(new Set([0]));
    }
  }, [isOpen, recommendations]);

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
        lastGeneratedRef.current = cacheKey;
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
          throw new Error("No source visual found to analyze.");
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
      lastGeneratedRef.current = cacheKey;
    } catch (err) {
      console.error(err);
      setError("Could not generate visualization. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [homeImages, selectedImageIndex, combinedTitle, viewAngle, detailLevel, renderCache, activeActions]);

  useEffect(() => {
    if (isOpen && (homeImages.length > 0 || isDemoMode) && activeActions.size > 0) {
      const actionKey = Array.from(activeActions).sort().join(",");
      const cacheKey = `${actionKey}|${viewAngle}|${detailLevel}`;
      
      if (lastGeneratedRef.current !== cacheKey) {
        if (renderCache[cacheKey]) {
            handleGenerate();
        } else {
            const timer = setTimeout(() => handleGenerate(), 800);
            return () => clearTimeout(timer);
        }
      }
    }
  }, [isOpen, homeImages.length, isDemoMode, combinedTitle, viewAngle, detailLevel, handleGenerate, renderCache, activeActions]);

  useEffect(() => {
    if (!isOpen) {
      lastGeneratedRef.current = '';
      setGeneratedImage(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Box className="w-5 h-5 text-purple-600" />
              Retrofit Strategy Visualizer
            </h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              Active Measures: <span className="font-semibold text-slate-700">{activeActions.size} selected</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row h-full relative">
            
              {/* Left: Strategy Builder Sidebar */}
              <div className="lg:w-80 border-r border-slate-200 bg-white flex flex-col z-10 shadow-lg h-full overflow-hidden">
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                      
                      {/* 1. Measure Strategy */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              1. Select Measures to Visualise
                          </h3>
                          <div className="space-y-2">
                              {recommendations.map((rec, idx) => {
                                  const isActive = activeActions.has(idx);
                                  return (
                                      <button
                                          key={idx}
                                          onClick={() => toggleAction(idx)}
                                          className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                                              isActive 
                                              ? 'bg-purple-50 border-purple-200 text-purple-900' 
                                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                          }`}
                                      >
                                          <div className={`mt-0.5 shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-300'}`}>
                                              {isActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                          </div>
                                          <div>
                                              <p className="text-[11px] font-bold leading-tight">{rec.title}</p>
                                              <p className="text-[9px] opacity-60 mt-0.5">{rec.category}</p>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {/* 2. View Angle */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              2. View Angle
                          </h3>
                          <div className="flex bg-slate-100 p-1 rounded-lg mb-2">
                              {(['Front Isometric', 'Top-Down Plan'] as ViewAngle[]).map(angle => (
                                  <button 
                                    key={angle}
                                    onClick={() => setViewAngle(angle)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewAngle === angle ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      {angle === 'Front Isometric' ? 'Front' : 'Top Plan'}
                                  </button>
                              ))}
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

                      {/* 3. Detail */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Granularity</h3>
                          <div className="space-y-2">
                              {(['Standard', 'High'] as DetailLevel[]).map(level => (
                                  <label key={level} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${detailLevel === level ? 'bg-white border-purple-200 ring-1 ring-purple-100' : 'bg-slate-50 border-transparent opacity-70 hover:opacity-100'}`}>
                                    <input 
                                        type="radio" name="detail" className="accent-purple-600" 
                                        checked={detailLevel === level} 
                                        onChange={() => setDetailLevel(level)}
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            {level === 'High' ? <>High Fidelity <span className="bg-purple-100 text-purple-700 px-1 rounded text-[9px]">HD</span></> : 'Standard Model'}
                                        </p>
                                        <p className="text-[10px] text-slate-500">{level === 'High' ? 'Granular textures, realistic lighting.' : 'Fast generation, smooth surfaces.'}</p>
                                    </div>
                                  </label>
                              ))}
                          </div>
                      </div>

                  </div>
                  
                  <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                      <Button 
                        onClick={handleGenerate} 
                        disabled={isLoading || activeActions.size === 0} 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200"
                      >
                          {isLoading ? 'Processing...' : 'Apply Strategy'}
                      </Button>
                  </div>
              </div>

              {/* Right: Render Area */}
              <div className="flex-1 bg-slate-100/50 flex flex-col relative overflow-hidden">
                  <div className="flex-1 flex items-center justify-center p-6 relative">
                      
                      {/* Interactive Context */}
                      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${generatedImage && !showComparison ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                          <Demo3DView 
                              ref={demo3DRef}
                              analysisData={analysisResult} 
                              isDemoMode={isDemoMode} 
                              minimalUI={true} 
                              forcedView={forced3DView}
                          />
                      </div>

                      {isLoading && (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm">
                            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-purple-100 max-w-xs text-center">
                                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-purple-800 font-bold mb-1">Synthesizing Retrofit...</p>
                                <p className="text-[10px] text-purple-600/70">{combinedTitle}</p>
                            </div>
                          </div>
                      )}

                      {error && (
                          <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-sm relative z-30">
                              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                              <p className="text-slate-800 font-bold mb-1">Render Failed</p>
                              <p className="text-sm text-slate-500">{error}</p>
                          </div>
                      )}

                      {generatedImage && !showComparison && (
                          <div className="relative w-full h-full flex items-center justify-center z-10 group animate-fade-in">
                            <div className="relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-slate-900/5 max-h-full max-w-full">
                                <img 
                                    src={`data:image/jpeg;base64,${generatedImage}`} 
                                    alt="Retrofit Visualization" 
                                    className="max-h-full max-w-full object-contain"
                                />
                                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-purple-300" />
                                    {activeActions.size} measures applied
                                </div>
                            </div>
                          </div>
                      )}
                      
                      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
                          <button
                              onMouseDown={() => setShowComparison(true)}
                              onMouseUp={() => setShowComparison(false)}
                              onMouseLeave={() => setShowComparison(false)}
                              onTouchStart={() => setShowComparison(true)}
                              onTouchEnd={() => setShowComparison(false)}
                              className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold shadow-lg border border-slate-200 flex items-center gap-2 transition-transform active:scale-95"
                          >
                              {showComparison ? <Eye className="w-3.5 h-3.5 text-purple-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                              {showComparison ? 'Viewing Source' : 'Hold to Compare'}
                          </button>
                      </div>
                  </div>
                  
                  {generatedImage && (
                      <div className="h-16 border-t border-slate-200 bg-white flex items-center justify-between px-6 z-10 shrink-0">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Combined Strategy Rendered
                            </div>
                            <a 
                              href={`data:image/jpeg;base64,${generatedImage}`} 
                              download={`retrofit-strategy-${activeActions.size}-measures.jpg`}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
                            >
                              Download Render
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
