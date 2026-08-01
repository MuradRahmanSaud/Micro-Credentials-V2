import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';
import { FOLDER_LOCATIONS } from '../FolderLocation';

interface MultiDocumentUploadProps {
  label: string;
  value: string; // Comma separated URLs
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function MultiDocumentUpload({ label, value, onChange, disabled }: MultiDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urls = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newUrls = [...urls];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        formDataUpload.append("folderPath", FOLDER_LOCATIONS.DOCUMENTS);
        
        // Simple filename formatting
        const newFileName = file.name;
        formDataUpload.append("departmentName", newFileName.replace(/\.[^/.]+$/, ""));

        const response = await axios.post("/api/upload", formDataUpload, { timeout: 60000 });
        const uploadedUrl = response.data?.url || response.data?.fileLink;
        
        if (uploadedUrl) {
          let viewUrl = uploadedUrl;
          if (viewUrl.includes("drive.google.com/uc") || viewUrl.includes("export=download")) {
            const fileIdMatch = viewUrl.match(/[?&]id=([^&]+)/);
            if (fileIdMatch && fileIdMatch[1]) {
              viewUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
            }
          }
          newUrls.push(viewUrl);
        }
      }

      onChange(newUrls.join(', '));
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeUrl = (index: number) => {
    const newUrls = [...urls];
    newUrls.splice(index, 1);
    onChange(newUrls.join(', '));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{label}</span>
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 text-teal-600 rounded hover:bg-teal-100 transition-colors disabled:opacity-50 text-[10px] font-bold uppercase tracking-wider"
        >
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload Documents
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {urls.length > 0 ? (
        <div className="space-y-2">
          {urls.map((url, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-teal-600 hover:text-teal-800 flex-1 min-w-0">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="text-xs truncate">{url}</span>
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeUrl(idx)}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded ml-2 shrink-0 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-400 p-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
          No documents uploaded
        </div>
      )}
    </div>
  );
}
