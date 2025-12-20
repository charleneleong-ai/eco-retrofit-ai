import React, { useState, useEffect } from 'react';
import { AppState, AnalysisResult, UserType, SavedAnalysis, AnalysisVersion } from './types';
import { analyzeHomeData, extractEPCData } from './services/geminiService';
import { fileToBase64, extractFrameFromVideo, generateDemoFloorPlan } from './utils';
import { saveAnalysis, getAllAnalyses, updateAnalysisSelection, deleteAnalysis } from './services/dbService';
import { MOCK_ANALYSIS_RESULT } from './services/mockData';
import UploadZone from './components/UploadZone';
import Button from './components/Button';
import AnalysisDashboard from './components/AnalysisDashboard';
import ChatInterface from './components/ChatInterface';
import HistoryView from './components/HistoryView';
import { ArrowRight, Leaf, Home, Building, History as HistoryIcon, Plus, PlayCircle, FileText, ExternalLink, AlertCircle } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>('upload');
  const [userType, setUserType] = useState<UserType>('homeowner');
  const [billFiles, setBillFiles] = useState<File[]>([]);
  const [homeFiles, setHomeFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [previousAnalysis, setPreviousAnalysis] = useState<AnalysisResult | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [restoredSelectedIndices, setRestoredSelectedIndices] = useState<number[] | undefined>(undefined);
  
  // Store processed images (base64) to pass to visualizer
  const [processedHomeImages, setProcessedHomeImages] = useState<string[]>([]);
  
  // Flag for Demo Mode to enable 3D View
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [isUpdatingEPC, setIsUpdatingEPC] = useState(false); // New state for background EPC update
  const [loadingMsg, setLoadingMsg] = useState('Initializing Gemini...');
  
  // Error handling
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [historyItems, setHistoryItems] = useState<SavedAnalysis[]>([]);

  // Load history count on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Dynamic loading message
  useEffect(() => {
    let interval: number;
    if (state === 'analyzing') {
      const messages: string[] = [];

      // Conditionally add messages based on what was uploaded
      if (billFiles.length > 0) {
        messages.push("Reading energy bills...");
      }
      if (homeFiles.length > 0) {
        messages.push("Scanning home photos for inefficiencies...");
      }
      if (videoFiles.length > 0) {
        messages.push("Processing video walkthroughs...");
      }

      // Always add the core analysis steps
      messages.push(
        "Identifying insulation gaps...",
        "Calculating potential savings...",
        "Comparing with neighborhood benchmarks...",
        "Finalizing your eco-retrofit plan..."
      );

      let i = 0;
      setLoadingMsg(messages[0]);
      interval = window.setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMsg(messages[i]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [state, billFiles.length, homeFiles.length, videoFiles.length]);

  const loadHistory = async () => {
    try {
      const items = await getAllAnalyses();
      setHistoryItems(items);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleRemoveFile = (setFiles: React.Dispatch<React.SetStateAction<File[]>>, index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (billFiles.length === 0 && homeFiles.length === 0 && videoFiles.length === 0) {
      setErrorMsg("Please upload at least one file to start analysis.");
      setShowErrorModal(true);
      return;
    }

    // MANDATORY: Check if user has selected a paid API key via AI Studio overlay
    // This is required for advanced models like Gemini 1.5 Pro / 2.5 Flash / Veo etc.
    if ((window as any).aistudio && !(await (window as any).aistudio.hasSelectedApiKey())) {
        try {
            await (window as any).aistudio.openSelectKey();
            // We assume success and proceed immediately to avoid race conditions as per documentation
        } catch (e) {
            console.error("Failed to open key selector", e);
            setErrorMsg("Please select a paid API key project to continue with high-fidelity analysis.");
            setShowErrorModal(true);
            return;
        }
    }

    setState('analyzing');
    setErrorMsg(null);
    setShowErrorModal(false);
    setIsDemoMode(false);

    try {
      // Convert inputs to Base64 with MimeType
      const billData = await Promise.all(billFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        mimeType: file.type || 'application/pdf',
        data: await fileToBase64(file)
      })));

      const homeImages: string[] = await Promise.all(homeFiles.map(fileToBase64));
      
      // Process videos safely
      const videoDataArray = await Promise.all(videoFiles.map(async (file) => {
          try {
              const data = await fileToBase64(file);
              return {
                  mimeType: file.type || 'video/mp4', // Fallback
                  data: data
              };
          } catch (e) {
              console.warn(`Failed to process video ${file.name}`, e);
              return null;
          }
      }));
      // Filter out failed videos
      const validVideoData = videoDataArray.filter((v): v is { mimeType: string; data: string } => v !== null);

      // Extract representative frames
      const videoFrames: string[] = await Promise.all(videoFiles.map(extractFrameFromVideo));
      const validVideoFrames = videoFrames.filter(f => f.length > 0);
      
      const allVisuals: string[] = [...homeImages, ...validVideoFrames];
      setProcessedHomeImages(allVisuals);
      
      if (videoFiles.length > 0) {
        setLoadingMsg('Analyzing video spatial data...');
      }
      
      // CRITICAL FIX: Pass 'allVisuals' (including video frames) as images, 
      // but pass 'validVideoData' as metadata only, NOT as payload, to prevent Network Errors on large payloads.
      const result = await analyzeHomeData(billData, allVisuals, validVideoData, userType, previousAnalysis);
      
      setLoadingMsg('Saving results locally...');
      
      // Aggregate all file data for saving
      const allInputFiles = [
          ...billData.map(b => ({ name: b.name, type: b.type, data: b.data })),
          ...homeImages.map((data, i) => ({ name: `Photo ${i+1}`, type: 'image/jpeg', data })),
          ...validVideoData.map((v, i) => ({ name: `Video ${i+1}`, type: v.mimeType, data: v.data }))
      ];

      // Save logic: Pass currentAnalysisId if it exists to append version
      const savedId = await saveAnalysis(
          userType, 
          result, 
          allInputFiles,
          currentAnalysisId // Pass existing ID to trigger version update
      );
      
      setCurrentAnalysisId(savedId);
      await loadHistory();

      setAnalysisResult(result);
      setPreviousAnalysis(null);
      setRestoredSelectedIndices(undefined); 
      
      setState('dashboard');
      
    } catch (error: any) {
      console.error(error);
      const msg = error.message || "An unexpected error occurred during analysis.";
      setErrorMsg(msg);
      setShowErrorModal(true);
      setState('upload');
    }
  };

  const handleLoadDemo = async () => {
    setState('analyzing');
    setLoadingMsg("Loading sample data...");
    
    // Clean up existing Demo entries to prevent duplicates
    try {
        const existingHistory = await getAllAnalyses();
        const demoEntries = existingHistory.filter(item => 
            // Identify demo entries by the specific customer name used in mockData
            item.versions[0]?.result.customerName === MOCK_ANALYSIS_RESULT.customerName
        );
        
        // Delete all found old demo entries
        for (const entry of demoEntries) {
            await deleteAnalysis(entry.id);
        }
    } catch (e) {
        console.warn("Failed to cleanup old demo entries", e);
    }
    
    // For demo, we now use the interactive Three.js view instead of generating a static 2D canvas plan
    setIsDemoMode(true);
    
    // We still generate one static frame for the Visualizer context (e.g. for "Visualize Retrofit" modal)
    // This keeps the "Visualizer" feature functional even in demo mode
    const mockFrame = await generateDemoFloorPlan(); 
    setProcessedHomeImages([mockFrame]);

    setTimeout(async () => {
      setAnalysisResult(MOCK_ANALYSIS_RESULT);
      setUserType('renter');
      setPreviousAnalysis(null);
      
      // Mock files for history purposes (empty data to save space)
      const mockFiles = MOCK_ANALYSIS_RESULT.sourceDocuments?.map(doc => ({
        name: doc.name,
        type: doc.type === 'pdf' ? 'application/pdf' : doc.type === 'image' ? 'image/jpeg' : 'video/mp4',
        data: '' 
      })) || [];

      // Save demo (this creates a fresh ID)
      const savedId = await saveAnalysis('renter', MOCK_ANALYSIS_RESULT, mockFiles);
      setCurrentAnalysisId(savedId);
      await loadHistory();
      
      setRestoredSelectedIndices(undefined);
      setState('dashboard');
    }, 1000);
  };

  const handleUpdateAnalysis = () => {
    if (analysisResult) {
      setPreviousAnalysis(analysisResult);
      setBillFiles([]);
      setHomeFiles([]);
      setVideoFiles([]);
      setState('upload');
    }
  };

  const handleHistoryUpdate = (item: SavedAnalysis) => {
      if (item.versions && item.versions.length > 0) {
          const latestResult = item.versions[0].result;
          setPreviousAnalysis(latestResult);
          setCurrentAnalysisId(item.id);
          setUserType(item.userType);
          
          setBillFiles([]);
          setHomeFiles([]);
          setVideoFiles([]);
          setProcessedHomeImages([]); 
          setErrorMsg(null);
          setShowErrorModal(false);
          
          setState('upload');
      }
  };

  const handleEPCUpload = async (file: File) => {
    if (!analysisResult) return;
    
    setIsUpdatingEPC(true);
    try {
        const base64Data = await fileToBase64(file);
        
        const epcData = await extractEPCData({
            name: file.name, 
            mimeType: file.type, 
            data: base64Data 
        });

        const updatedResult: AnalysisResult = {
            ...analysisResult,
            epc: epcData,
            sourceDocuments: [
                ...(analysisResult.sourceDocuments || []),
                { 
                    name: file.name, 
                    type: 'pdf', 
                    date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                }
            ]
        };

        setAnalysisResult(updatedResult);
        
        if (currentAnalysisId) {
             const epcFileRecord = { 
                 name: file.name, 
                 type: file.type, 
                 data: base64Data 
             };
             
             // Pass currentAnalysisId to append this EPC update as a new version
             await saveAnalysis(
                 userType, 
                 updatedResult, 
                 [epcFileRecord],
                 currentAnalysisId
             );
             await loadHistory();
        }

    } catch (error) {
        console.error("Failed to update EPC", error);
        alert("Could not verify the EPC document. Please try again.");
    } finally {
        setIsUpdatingEPC(false);
    }
  };

  const handleRestoreFromHistory = (item: SavedAnalysis, version?: AnalysisVersion) => {
    // If no specific version requested, use the latest (index 0)
    const targetVersion = version || item.versions[0];
    
    if (!targetVersion) return;

    setUserType(item.userType);
    setAnalysisResult(targetVersion.result);
    
    setBillFiles([]);
    setHomeFiles([]);
    setVideoFiles([]);
    setPreviousAnalysis(null);
    setProcessedHomeImages([]); 
    setIsDemoMode(false); // Reset demo mode on restore (unless we store it in history, but for now simple)
    
    // Set ID to the Parent ID so updates continue the history chain
    setCurrentAnalysisId(item.id);
    setRestoredSelectedIndices(targetVersion.selectedRecommendationIndices);
    
    setState('dashboard');
  };

  const handleNewAnalysis = () => {
    if (state !== 'upload' || previousAnalysis) {
        setState('upload');
        setAnalysisResult(null);
        setPreviousAnalysis(null);
        setCurrentAnalysisId(null);
        setRestoredSelectedIndices(undefined);
        setBillFiles([]);
        setHomeFiles([]);
        setVideoFiles([]);
        setProcessedHomeImages([]);
        setIsDemoMode(false);
        setShowErrorModal(false);
    }
  };

  const handleDashboardSelectionChange = (indices: number[]) => {
    if (currentAnalysisId) {
      updateAnalysisSelection(currentAnalysisId, indices).catch(err => {
        console.error("Failed to auto-save selection state", err);
      });
      setRestoredSelectedIndices(indices);
    }
  };

  const isHistoryActive = state === 'history';
  const isAnalysisActive = !isHistoryActive;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-fade-in-up">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <AlertCircle className="w-8 h-8 text-red-600" />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Failed</h3>
             <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                {errorMsg && errorMsg.includes('NetworkError') 
                   ? "The upload failed due to a network connection issue. This can happen with very large files or videos. Please try again with fewer or smaller files." 
                   : (errorMsg || "We encountered an issue processing your data. Please check your connection and try again.")}
             </p>
             <button 
                onClick={() => { setShowErrorModal(false); setErrorMsg(null); }}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
             >
                Try Again
             </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleNewAnalysis}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-emerald-200 shadow-lg">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">EcoRetrofit <span className="text-emerald-600">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
             {analysisResult && (
               <button 
                 onClick={handleNewAnalysis}
                 className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                 title="Start a fresh analysis"
               >
                 <Plus className="w-4 h-4" />
                 <span className="hidden sm:inline">New Analysis</span>
               </button>
             )}

             <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
               <button
                  onClick={() => {
                      if (analysisResult) {
                          setState('dashboard');
                      } else {
                          handleNewAnalysis();
                      }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                      isAnalysisActive
                      ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
               >
                  {analysisResult ? <FileText className="w-4 h-4" /> : <Leaf className={`w-4 h-4 ${isAnalysisActive ? 'fill-emerald-600' : ''}`} />}
                  <span className="hidden sm:inline">{analysisResult ? 'Current Analysis' : 'New Analysis'}</span>
               </button>

               <button
                  onClick={() => {
                    loadHistory();
                    setState('history');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 relative ${
                      isHistoryActive
                      ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
               >
                  <HistoryIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                  {historyItems.length > 0 && !isHistoryActive && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white">
                      {historyItems.length}
                    </span>
                  )}
               </button>
             </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        
        {state === 'upload' && (
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            
            {previousAnalysis ? (
               <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <Plus className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-800 text-lg">Update Existing Analysis</h3>
                      <p className="text-emerald-700/80 mt-1 text-sm">
                        You are adding data to the plan for <strong>{previousAnalysis.address || 'your property'}</strong>. 
                        Upload new bills or photos to refine the recommendations.
                      </p>
                      <button onClick={handleNewAnalysis} className="text-xs font-bold text-emerald-600 mt-2 underline hover:text-emerald-700">Start Fresh Instead</button>
                    </div>
                  </div>

                  {previousAnalysis.sourceDocuments && previousAnalysis.sourceDocuments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-emerald-200/60">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Sources currently in this analysis:
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {previousAnalysis.sourceDocuments.map((doc, i) => (
                          <li key={i}>
                            {doc.url ? (
                                <a 
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-white/60 px-3 py-1.5 rounded-md border border-emerald-100/50 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all w-full group cursor-pointer"
                                >
                                  <span className="truncate flex-1 group-hover:text-emerald-600">{doc.name}</span>
                                  <ExternalLink className="w-3 h-3 text-emerald-400 group-hover:text-emerald-600" />
                                </a>
                            ) : (
                                <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-white/60 px-3 py-1.5 rounded-md border border-emerald-100/50 w-full">
                                  <span className="truncate flex-1">{doc.name}</span>
                                </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
               </div>
            ) : (
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Turn Your Bills into Savings</h2>
                <p className="text-lg text-slate-600">
                  Upload your energy bills, photos of your home, and a quick walkthrough video. 
                  We will build a personalised retrofit plan for you and your home.
                </p>
              </div>
            )}

            <div className="flex flex-col items-center mb-10">
              <p className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">I am a</p>
              <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex gap-1">
                <button 
                  onClick={() => setUserType('homeowner')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    userType === 'homeowner' 
                      ? 'bg-emerald-600 text-white shadow-md transform scale-105' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Home className="w-4 h-4" /> Homeowner
                </button>
                <button 
                  onClick={() => setUserType('renter')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    userType === 'renter' 
                      ? 'bg-emerald-600 text-white shadow-md transform scale-105' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Building className="w-4 h-4" /> Renter
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <UploadZone 
                label="Energy Bills" 
                description="Upload photos or PDFs of recent bills"
                accept="image/*,application/pdf"
                icon="document"
                files={billFiles}
                onFilesSelected={(files) => setBillFiles(prev => [...prev, ...files])}
                onRemoveFile={(idx) => handleRemoveFile(setBillFiles, idx)}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UploadZone 
                  label="Home Photos" 
                  description="Photos of windows, attic, boiler, etc."
                  accept="image/*"
                  icon="image"
                  files={homeFiles}
                  onFilesSelected={(files) => setHomeFiles(prev => [...prev, ...files])}
                  onRemoveFile={(idx) => handleRemoveFile(setHomeFiles, idx)}
                />
                <UploadZone 
                  label="Walkthrough Videos" 
                  description="Short clips walking through rooms"
                  accept="video/*"
                  icon="video"
                  files={videoFiles}
                  onFilesSelected={(files) => setVideoFiles(prev => [...prev, ...files])} 
                  onRemoveFile={(idx) => handleRemoveFile(setVideoFiles, idx)}
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center gap-4">
              <Button 
                onClick={handleAnalyze} 
                className="px-8 py-3 text-lg shadow-emerald-200 shadow-xl hover:shadow-2xl hover:shadow-emerald-200 transform hover:-translate-y-1"
              >
                {previousAnalysis ? 'Update Analysis' : 'Start Analysis'} <ArrowRight className="w-5 h-5 ml-1" />
              </Button>

              {!previousAnalysis && (
                <button 
                  onClick={handleLoadDemo}
                  className="text-sm font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" /> Load Demo Data
                </button>
              )}
            </div>
          </div>
        )}

        {state === 'analyzing' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-pulse">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-emerald-100 rounded-full animate-spin border-t-emerald-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="mt-8 text-2xl font-bold text-slate-800">Analysing Your Home</h3>
            <p className="text-slate-500 mt-2 max-w-md min-h-[24px] transition-all duration-300">{loadingMsg}</p>
          </div>
        )}

        {state === 'history' && (
          <HistoryView 
            items={historyItems}
            onSelect={handleRestoreFromHistory}
            onUpdate={handleHistoryUpdate}
            onRefresh={loadHistory}
            onBack={handleNewAnalysis}
          />
        )}

        {state === 'dashboard' && analysisResult && (
          <>
            <AnalysisDashboard 
              data={analysisResult} 
              onUpdateAnalysis={handleUpdateAnalysis}
              onEPCUpload={handleEPCUpload}
              isUpdatingEPC={isUpdatingEPC}
              initialSelectedIndices={restoredSelectedIndices}
              onSelectionChange={handleDashboardSelectionChange}
              homeImages={processedHomeImages}
              isDemoMode={isDemoMode}
            />
            <ChatInterface analysisResult={analysisResult} />
          </>
        )}
      </main>
    </div>
  );
}