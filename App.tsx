
import React, { useState, useEffect } from 'react';
import { AppState, AnalysisResult, UserType, SavedAnalysis } from './types';
import { analyzeHomeData, extractEPCData } from './services/geminiService';
import { fileToBase64, extractFrameFromVideo } from './utils';
import { saveAnalysis, getAllAnalyses, updateAnalysisSelection } from './services/dbService';
import { MOCK_ANALYSIS_RESULT } from './services/mockData';
import UploadZone from './components/UploadZone';
import Button from './components/Button';
import AnalysisDashboard from './components/AnalysisDashboard';
import ChatInterface from './components/ChatInterface';
import HistoryView from './components/HistoryView';
import { ArrowRight, Leaf, Home, Building, History as HistoryIcon, Plus, PlayCircle, FileText, ExternalLink } from 'lucide-react';

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

  const [isUpdatingEPC, setIsUpdatingEPC] = useState(false); // New state for background EPC update
  const [loadingMsg, setLoadingMsg] = useState('Initializing Gemini...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

      // If we have no specific file messages (e.g. demo load where files state is empty but we want a generic start),
      // we ensure there's at least one message or it starts with the core steps.
      
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
      return;
    }

    setState('analyzing');
    setErrorMsg(null);
    // Initial message handled by useEffect

    try {
      // Convert inputs to Base64 with MimeType
      const billData = await Promise.all(billFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        mimeType: file.type, // keeping mimeType for service compatibility
        data: await fileToBase64(file)
      })));

      const homeImages = await Promise.all(homeFiles.map(fileToBase64));
      
      // Video Processing: Extract frames & prepare raw data
      const videoDataArray = await Promise.all(videoFiles.map(async (file) => ({
          mimeType: file.type,
          data: await fileToBase64(file)
      })));

      // Extract representative frames from videos to add to visualization pool
      // This allows the 3D Plan generator to use video content
      const videoFrames = await Promise.all(videoFiles.map(extractFrameFromVideo));
      const validVideoFrames = videoFrames.filter(f => f.length > 0);
      
      // Combine photos + video frames for the visualizer
      const allVisuals = [...homeImages, ...validVideoFrames];
      setProcessedHomeImages(allVisuals);
      
      if (videoFiles.length > 0) {
        setLoadingMsg('Analyzing video spatial data...');
      }
      
      const result = await analyzeHomeData(billData, homeImages, videoDataArray, userType, previousAnalysis);
      
      // Save to local DB
      setLoadingMsg('Saving results locally...');
      const savedId = await saveAnalysis(userType, result, billData.map(b => ({ name: b.name, type: b.type, data: b.data })));
      setCurrentAnalysisId(savedId);
      await loadHistory(); // Refresh history count

      setAnalysisResult(result);
      // Reset previous analysis context after successful update
      setPreviousAnalysis(null);
      setRestoredSelectedIndices(undefined); // Reset selections for fresh analysis
      
      setState('dashboard');
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "An unexpected error occurred during analysis.");
      setState('upload');
    }
  };

  const handleLoadDemo = async () => {
    setState('analyzing');
    // Note: useEffect will overwrite this with the first generic message shortly, 
    // but usually "Identifying insulation gaps..." is a fine start for a demo.
    setLoadingMsg("Loading sample data...");
    
    setTimeout(async () => {
      setAnalysisResult(MOCK_ANALYSIS_RESULT);
      // Demo data is specifically for a renter scenario
      setUserType('renter');
      
      // Generate mock file entries based on the result so history count matches
      // This ensures the "Bills Saved" count in history reflects the 11 mock bills
      const mockFiles = MOCK_ANALYSIS_RESULT.sourceDocuments?.map(doc => ({
        name: doc.name,
        type: doc.type === 'pdf' ? 'application/pdf' : doc.type === 'image' ? 'image/jpeg' : 'video/mp4',
        data: '' // No actual data for mock files to save space
      })) || [];

      // Save demo to history so it persists
      const savedId = await saveAnalysis('renter', MOCK_ANALYSIS_RESULT, mockFiles);
      setCurrentAnalysisId(savedId);
      await loadHistory();
      
      setRestoredSelectedIndices(undefined);
      setProcessedHomeImages([]); // No real images in demo
      setState('dashboard');
    }, 1500);
  };

  const handleUpdateAnalysis = () => {
    if (analysisResult) {
      setPreviousAnalysis(analysisResult);
      // Clear files so user knows they are uploading NEW ones
      setBillFiles([]);
      setHomeFiles([]);
      setVideoFiles([]);
      setState('upload');
    }
  };

  const handleEPCUpload = async (file: File) => {
    if (!analysisResult) return;
    
    setIsUpdatingEPC(true);
    try {
        const base64Data = await fileToBase64(file);
        
        // Use specialized lightweight function for speed
        // This targets only the EPC data fields instead of running full analysis
        const epcData = await extractEPCData({
            name: file.name, 
            mimeType: file.type, 
            data: base64Data 
        });

        // Manually merge into existing result
        const updatedResult: AnalysisResult = {
            ...analysisResult,
            epc: epcData,
            // Add to source docs
            sourceDocuments: [
                ...(analysisResult.sourceDocuments || []),
                { 
                    name: file.name, 
                    type: 'pdf', 
                    date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                }
            ]
        };

        // Update state
        setAnalysisResult(updatedResult);
        
        // Save the update
        if (currentAnalysisId) {
             // We treat the EPC as a generic file record for saving purposes
             const epcFileRecord = { 
                 name: file.name, 
                 type: file.type, 
                 data: base64Data 
             };
             
             // We save the NEW result but append the file to whatever files we tracked before
             // Note: In a real app we'd probably fetch existing files from DB to append to, 
             // or just save this new state as the latest version.
             const savedId = await saveAnalysis(
                 userType, 
                 updatedResult, 
                 [epcFileRecord] // Saving just this file record associated with this result version
             );
             setCurrentAnalysisId(savedId);
             await loadHistory();
        }

    } catch (error) {
        console.error("Failed to update EPC", error);
        alert("Could not verify the EPC document. Please try again.");
    } finally {
        setIsUpdatingEPC(false);
    }
  };

  const handleRestoreFromHistory = (item: SavedAnalysis) => {
    setUserType(item.userType);
    setAnalysisResult(item.result);
    // We don't restore the file inputs UI, just the results view
    setBillFiles([]);
    setHomeFiles([]);
    setVideoFiles([]);
    setPreviousAnalysis(null);
    setProcessedHomeImages([]); // Images from history likely not stored in full base64 in this simple version
    
    // Restore state
    setCurrentAnalysisId(item.id);
    setRestoredSelectedIndices(item.selectedRecommendationIndices);
    
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
    }
  };

  const handleDashboardSelectionChange = (indices: number[]) => {
    if (currentAnalysisId) {
      // 1. Auto-save changes to DB
      updateAnalysisSelection(currentAnalysisId, indices).catch(err => {
        console.error("Failed to auto-save selection state", err);
      });
      // 2. Update local state so selections persist if user navigates away and comes back
      setRestoredSelectedIndices(indices);
    }
  };

  const isHistoryActive = state === 'history';
  const isAnalysisActive = !isHistoryActive;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
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
             {/* "Start New" shortcut when inside a plan */}
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

                  {/* Show loaded sources */}
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
                  We will build a personalized retrofit plan for you and your home.
                </p>
              </div>
            )}

            {/* User Type Toggle */}
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

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
                {errorMsg}
              </div>
            )}

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
            <h3 className="mt-8 text-2xl font-bold text-slate-800">Analyzing Your Home</h3>
            <p className="text-slate-500 mt-2 max-w-md min-h-[24px] transition-all duration-300">{loadingMsg}</p>
          </div>
        )}

        {state === 'history' && (
          <HistoryView 
            items={historyItems}
            onSelect={handleRestoreFromHistory}
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
            />
            <ChatInterface analysisResult={analysisResult} />
          </>
        )}
      </main>
    </div>
  );
}
