
import React, { useState } from 'react';
import { SavedAnalysis, AnalysisVersion, SourceDoc } from '../types';
import { deleteAnalysis, deleteAnalysisVersion } from '../services/dbService';
import { parseSavingsValue } from '../utils';
import { Trash2, Calendar, FileText, ArrowRight, Home, Building, FileCheck, MapPin, Layers, Clock, ChevronDown, ChevronUp, FilePlus, X } from 'lucide-react';

interface HistoryViewProps {
  items: SavedAnalysis[];
  onSelect: (item: SavedAnalysis, version?: AnalysisVersion) => void;
  onUpdate: (item: SavedAnalysis) => void; // New prop for handling version updates
  onRefresh: () => void;
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ items, onSelect, onUpdate, onRefresh, onBack }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this report history? This cannot be undone.')) {
      setDeletingId(id);
      try {
        await deleteAnalysis(id);
        onRefresh();
      } catch (error) {
        console.error("Failed to delete", error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDeleteVersion = async (e: React.MouseEvent, analysisId: string, versionId: string) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this specific version?')) {
          try {
              await deleteAnalysisVersion(analysisId, versionId);
              onRefresh();
          } catch (error) {
              console.error("Failed to delete version", error);
          }
      }
  };

  const handleUpdateClick = (e: React.MouseEvent, item: SavedAnalysis) => {
      e.stopPropagation();
      onUpdate(item);
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
     e.stopPropagation();
     setExpandedId(expandedId === id ? null : id);
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
      });
  }

  const getFileSummary = (docs: SourceDoc[] | undefined) => {
      if (!docs || docs.length === 0) return "0 files processed";
      
      const bills = docs.filter(d => d.type === 'pdf').length;
      const videos = docs.filter(d => d.type === 'video').length;
      const images = docs.filter(d => d.type === 'image').length;
      
      const parts = [];
      if (bills > 0) parts.push(`${bills} Bill${bills !== 1 ? 's' : ''}`);
      if (videos > 0) parts.push(`${videos} Video${videos !== 1 ? 's' : ''}`);
      if (images > 0) parts.push(`${images} Photo${images !== 1 ? 's' : ''}`);
      
      if (parts.length === 0) return `${docs.length} files processed`;
      return parts.join(', ') + ' processed';
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">No Saved Reports</h3>
        <p className="text-slate-500 mb-8">You haven't performed any audits yet. Upload your bills to get started.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Analysis History</h2>
          <p className="text-slate-500 mt-1">Your saved retrofit plans and versions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => {
          // Use the latest version for the main card display
          const latestVersion = item.versions[0];
          if (!latestVersion) return null;

          const result = latestVersion.result;
          const versionCount = item.versions.length;
          
          let annualSavings = 0;
          let selectedCount = 0;
          const totalCount = result.recommendations?.length || 0;

          if (result.recommendations && result.recommendations.length > 0) {
            const indicesToUse = latestVersion.selectedRecommendationIndices 
              ? latestVersion.selectedRecommendationIndices 
              : result.recommendations.map((_, i) => i); 
            
            selectedCount = indicesToUse.length;

            annualSavings = result.recommendations.reduce((acc, rec, idx) => {
              if (indicesToUse.includes(idx)) {
                return acc + parseSavingsValue(rec.estimatedAnnualSavings);
              }
              return acc;
            }, 0);
          } else {
             annualSavings = (result.currentMonthlyAvg - result.projectedMonthlyAvg) * 12;
          }

          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 transition-all overflow-hidden group">
                
                {/* Main Card (Latest Version) */}
                <div 
                    onClick={() => onSelect(item, latestVersion)}
                    className="p-6 cursor-pointer hover:bg-slate-50/50 relative flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <ArrowRight className="w-6 h-6 text-emerald-500" />
                    </div>

                    {/* Left: Info */}
                    <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border flex items-center gap-1.5 ${
                                item.userType === 'homeowner' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                                {item.userType === 'homeowner' ? <Home className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                                {item.userType}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(item.updatedAt)}
                            </span>
                            {versionCount > 1 ? (
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    v{versionCount}
                                </span>
                            ) : (
                                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                    v1
                                </span>
                            )}
                        </div>
                        
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 truncate">
                                {result.customerName || 'Retrofit Analysis'}
                            </h3>
                            
                            {result.address && (
                                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{result.address}</span>
                                </p>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-500 pt-1">
                            <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-xs font-medium truncate max-w-full">
                                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                                {getFileSummary(result.sourceDocuments)}
                            </span>
                        </div>
                    </div>

                    {/* Right: Stats & Actions */}
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Est. Annual Savings</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {result.currency}{Math.round(annualSavings).toLocaleString()}
                            </p>
                            {totalCount > 0 && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Based on selected {selectedCount}/{totalCount} actions
                                </p>
                            )}
                        </div>

                        <div className="w-px h-12 bg-slate-100 hidden md:block"></div>

                        <div className="flex items-center gap-2 z-10">
                            <button
                                onClick={(e) => handleUpdateClick(e, item)}
                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                title="Add data to create New Version"
                            >
                                <FilePlus className="w-5 h-5" />
                            </button>

                            {versionCount > 1 && (
                                <button
                                    onClick={(e) => toggleExpand(e, item.id)}
                                    className={`p-2 rounded-lg transition-colors border ${
                                        expandedId === item.id 
                                        ? 'bg-slate-100 text-slate-700 border-slate-300' 
                                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                                    }`}
                                    title="View Version History"
                                >
                                    {expandedId === item.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                            )}

                            <button 
                                onClick={(e) => handleDelete(e, item.id)}
                                disabled={deletingId === item.id}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Report"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Version History Expanded List */}
                {expandedId === item.id && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-2 animate-fade-in">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-2 mb-2">Version History</p>
                        {item.versions.map((ver, idx) => {
                            const isLatest = idx === 0;
                            return (
                                <div 
                                   key={ver.versionId} 
                                   className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm cursor-pointer transition-all group/version"
                                >
                                    <div 
                                      className="flex items-center gap-3 flex-1"
                                      onClick={() => onSelect(item, ver)}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                            isLatest ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            v{versionCount - idx}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                {formatDate(ver.timestamp)}
                                                {isLatest && <span className="text-[10px] bg-emerald-600 text-white px-1.5 rounded-sm">LATEST</span>}
                                            </p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" /> {formatTime(ver.timestamp)}
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                {getFileSummary(ver.result.sourceDocuments)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={(e) => handleDeleteVersion(e, item.id, ver.versionId)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover/version:opacity-100"
                                            title="Delete this version"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div onClick={() => onSelect(item, ver)}>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover/version:text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryView;
