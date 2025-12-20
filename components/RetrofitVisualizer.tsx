
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateRetrofitVisualization } from '../services/geminiService';
import Button from './Button';
import Demo3DView, { Demo3DViewHandle } from './Demo3DView';
import { AnalysisResult } from '../types';
import { Sparkles, X, ImageIcon, AlertCircle, RotateCw, RotateCcw, Box, Layers, Eye, EyeOff } from 'lucide-react';

interface RetrofitVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  homeImages: string[]; // Base64 strings
  recommendationTitle: string; 
  recommendationCategory: string;
  analysisResult?: AnalysisResult;
  isDemoMode?: boolean;
}

type ViewAngle = 'Front Isometric' | 'Rotate Left' | 'Rotate Right' | 'Top-Down Plan';
type DetailLevel = 'Standard' | 'High';

const RetrofitVisualizer: React.FC<RetrofitVisualizerProps> = ({ 
  isOpen, 
  onClose, 
  homeImages, 
  recommendationTitle,
  recommendationCategory,
  analysisResult,
  isDemoMode = false
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  const [viewAngle, setViewAngle] = useState<ViewAngle>('Front Isometric');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('Standard');

  const demo3DRef = useRef<Demo3DViewHandle>(null);
  const sidebar3DRef = useRef<Demo3DViewHandle>(null);
  
  // Local cache to store results for this recommendation session
  // Key format: "Title|Angle|Detail"
  const [renderCache, setRenderCache] = useState<Record<string, string>>({});

  // Map the control panel's ViewAngle to Demo3DView's internal view strings
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

  const handleGenerate = useCallback(async () => {
    const cacheKey = `${recommendationTitle}|${viewAngle}|${detailLevel}`;
    
    // Check if we have this specific configuration cached
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
          recommendationTitle,
          viewAngle,
          detailLevel
      );
      
      // Save to cache before setting state
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
  }, [homeImages, selectedImageIndex, recommendationTitle, viewAngle, detailLevel, renderCache]);

  useEffect(() => {
    if (isOpen && (homeImages.length > 0 || isDemoMode)) {
      const cacheKey = `${recommendationTitle}|${viewAngle}|${detailLevel}`;
      
      if (lastGeneratedRef.current !== cacheKey) {
        // If it's in the cache, we trigger immediately to avoid the "scanning" feel for instant loads
        if (renderCache[cacheKey]) {
            handleGenerate();
        } else {
            // New render: Small delay to allow 3D scene to initialize and orient before capturing snapshot
            const timer = setTimeout(() => handleGenerate(), 800);
            return () => clearTimeout(timer);
        }
      }
    }
  }, [isOpen, homeImages.length, isDemoMode, selectedImageIndex, recommendationTitle, viewAngle, detailLevel, handleGenerate, renderCache]);

  // Reset session tracking when modal is closed, but keep cache for better UX if they re-open same recommendation
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
              Retrofit Visualizer
            </h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              Visualizing: <span className="font-semibold text-slate-700">{recommendationTitle}</span>
              <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">{recommendationCategory}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row h-full relative">
            
              {/* Left: Controls */}
              <div className="lg:w-80 border-r border-slate-200 bg-white flex flex-col z-10 shadow-lg h-full overflow-hidden">
                  <div className="p-4 flex-1 overflow-y-auto">
                      
                      {/* 1. Location Context (Small Sidebar Reference) */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              1. Location Context
                          </h3>
                          <div className="h-40 w-full rounded-xl overflow-hidden border border-slate-200 relative group cursor-grab">
                              <div className="absolute inset-0 bg-slate-50">
                                  <Demo3DView 
                                      ref={sidebar3DRef}
                                      analysisData={analysisResult} 
                                      isDemoMode={isDemoMode} 
                                      minimalUI={true} 
                                      initialView="perspective"
                                      highlightCategory={recommendationCategory}
                                  />
                              </div>
                              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[9px] font-bold text-slate-500 shadow-sm pointer-events-none">
                                  Location Map
                              </div>
                          </div>
                      </div>

                      {/* 2. View Angle */}
                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              2. View Angle
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

                      {/* 3. Detail */}
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
                  
                  <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                      <Button 
                        onClick={handleGenerate} 
                        disabled={isLoading} 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200"
                      >
                          {isLoading ? 'Processing...' : 'Regenerate View'}
                      </Button>
                  </div>
              </div>

              {/* Right: Render Area */}
              <div className="flex-1 bg-slate-100/50 flex flex-col relative overflow-hidden">
                  <div className="flex-1 flex items-center justify-center p-6 relative">
                      
                      {/* Background: Interactive Demo 3D View as the base context */}
                      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${generatedImage && !showComparison ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                          <Demo3DView 
                              ref={demo3DRef}
                              analysisData={analysisResult} 
                              isDemoMode={isDemoMode} 
                              minimalUI={true} 
                              forcedView={forced3DView}
                              highlightCategory={recommendationCategory}
                          />
                      </div>

                      {isLoading && (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm">
                            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-purple-100">
                                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-purple-800 font-bold mb-1">Applying Retrofit...</p>
                                <p className="text-xs text-purple-600/70">{viewAngle} • AI Synthesis</p>
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
                                    {viewAngle} AI Vision
                                </div>
                            </div>
                          </div>
                      )}
                      
                      {/* Comparison / State Overlay */}
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
                          
                          {!showComparison && generatedImage && (
                              <div className="bg-white/90 text-purple-800 px-3 py-1.5 rounded-lg text-[10px] font-bold backdrop-blur-md shadow-sm border border-purple-100">
                                  AI Render Applied
                              </div>
                          )}
                      </div>
                  </div>
                  
                  {generatedImage && (
                      <div className="h-16 border-t border-slate-200 bg-white flex items-center justify-between px-6 z-10 shrink-0">
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
        </div>
      </div>
    </div>
  );
};

export default RetrofitVisualizer;
