
import React, { useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Video } from 'lucide-react';

interface UploadZoneProps {
  label: string;
  accept: string;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  icon: 'document' | 'image' | 'video';
  description: string;
}

const UploadZone: React.FC<UploadZoneProps> = ({ 
  label, 
  accept, 
  files, 
  onFilesSelected, 
  onRemoveFile,
  icon,
  description
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
    // Reset input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const IconComponent = icon === 'document' ? FileText : icon === 'video' ? Video : ImageIcon;

  return (
    <div className="w-full">
      <div 
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors group h-48"
      >
        <div className="p-3 bg-slate-100 rounded-full mb-3 group-hover:bg-emerald-100 transition-colors">
          <IconComponent className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
        </div>
        <h3 className="font-semibold text-slate-700">{label}</h3>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept={accept} 
          multiple // Always allow multiple files
          onChange={handleFileInput}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-slate-100 p-2 rounded">
                   <IconComponent className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveFile(idx); }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadZone;
