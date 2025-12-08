import React, { useState } from 'react';
import { AppState, AnalysisResult, UserType } from './types';
import { analyzeHomeData } from './services/geminiService';
import { fileToBase64 } from './utils';
import UploadZone from './components/UploadZone';
import Button from './components/Button';
import AnalysisDashboard from './components/AnalysisDashboard';
import ChatInterface from './components/ChatInterface';
import { ArrowRight, Leaf, Home, Building } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>('upload');
  const [userType, setUserType] = useState<UserType>('homeowner');
  const [billFiles, setBillFiles] = useState<File[]>([]);
  const [homeFiles, setHomeFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Initializing Gemini 3...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setLoadingMsg('Processing files...');

    try {
      // Convert inputs to Base64 with MimeType
      const billData = await Promise.all(billFiles.map(async (file) => ({
        mimeType: file.type,
        data: await fileToBase64(file)
      })));

      const homeImages = await Promise.all(homeFiles.map(fileToBase64));
      
      let videoData: string | null = null;
      let videoMime: string | null = null;
      
      if (videoFiles.length > 0) {
        setLoadingMsg('Uploading and processing video...');
        videoData = await fileToBase64(videoFiles[0]);
        videoMime = videoFiles[0].type;
      }

      setLoadingMsg(`Gemini 3 is creating your ${userType} plan...`);
      
      const result = await analyzeHomeData(billData, homeImages, videoData, videoMime, userType);
      setAnalysisResult(result);
      setState('dashboard');
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "An unexpected error occurred during analysis.");
      setState('upload');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">EcoRetrofit <span className="text-emerald-600">AI</span></h1>
          </div>
          {state === 'dashboard' && (
            <Button variant="ghost" onClick={() => {
              setState('upload');
              setAnalysisResult(null);
              setBillFiles([]);
              setHomeFiles([]);
              setVideoFiles([]);
            }}>
              New Analysis
            </Button>
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        
        {state === 'upload' && (
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Turn Your Bills into Savings</h2>
              <p className="text-lg text-slate-600">
                Upload your energy bills, photos of your home, and a quick walkthrough video. 
                Gemini 3 will build a personalized retrofit plan for you.
              </p>
            </div>

            {/* User Type Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex gap-1">
                <button 
                  onClick={() => setUserType('homeowner')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    userType === 'homeowner' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-4 h-4" /> Homeowner
                </button>
                <button 
                  onClick={() => setUserType('renter')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    userType === 'renter' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-50'
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
                  label="Walkthrough Video" 
                  description="A short clip walking through rooms (Max 20MB)"
                  accept="video/*"
                  icon="video"
                  files={videoFiles}
                  onFilesSelected={(files) => setVideoFiles([files[0]])} // Limit to 1
                  onRemoveFile={(idx) => handleRemoveFile(setVideoFiles, idx)}
                />
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <Button 
                onClick={handleAnalyze} 
                className="px-8 py-3 text-lg shadow-emerald-200 shadow-xl hover:shadow-2xl hover:shadow-emerald-200 transform hover:-translate-y-1"
              >
                Start Analysis <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
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
            <p className="text-slate-500 mt-2 max-w-md">{loadingMsg}</p>
          </div>
        )}

        {state === 'dashboard' && analysisResult && (
          <>
            <AnalysisDashboard data={analysisResult} />
            <ChatInterface analysisResult={analysisResult} />
          </>
        )}
      </main>
    </div>
  );
}