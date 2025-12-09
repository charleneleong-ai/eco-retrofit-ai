
import React, { useState } from 'react';
import { SavedAnalysis } from '../types';
import { deleteAnalysis } from '../services/dbService';
import { Trash2, Calendar, FileText, ArrowRight, Home, Building, FileCheck } from 'lucide-react';

interface HistoryViewProps {
  items: SavedAnalysis[];
  onSelect: (item: SavedAnalysis) => void;
  onRefresh: () => void;
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ items, onSelect, onRefresh, onBack }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this report? This cannot be undone.')) {
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <p className="text-slate-500 mt-1">Your saved retrofit plans and bills</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => {
          const savings = item.result.currentMonthlyAvg - item.result.projectedMonthlyAvg;
          const annualSavings = savings * 12;

          return (
            <div 
              key={item.id} 
              onClick={() => onSelect(item)}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-6 h-6 text-emerald-500" />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left: Info */}
                <div className="space-y-3">
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
                      {formatDate(item.date)}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-lg text-slate-800 line-clamp-1">
                    {item.result.summary.split('\n')[0].replace(/^[#* ]+/, '')}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      <FileCheck className="w-4 h-4 text-slate-400" />
                      {item.billFiles.length} Bills Saved
                    </span>
                  </div>
                </div>

                {/* Right: Stats & Actions */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Est. Annual Savings</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {item.result.currency}{Math.round(annualSavings).toLocaleString()}
                    </p>
                  </div>

                  <div className="w-px h-12 bg-slate-100 hidden md:block"></div>

                  <button 
                    onClick={(e) => handleDelete(e, item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                    title="Delete Report"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryView;
