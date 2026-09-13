import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';

export const FileDropzone = ({
  onFileSelect,
  selectedFile,
  onClearFile,
  acceptedFormats = ['.pdf'],
  maxSizeMb = 10,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);

  const validateAndSelectFile = (file) => {
    setError(null);
    if (!file) return;

    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!acceptedFormats.includes(ext)) {
      setError(`Unsupported file format '${ext}'. Only PDF files are supported.`);
      return;
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum ${maxSizeMb} MB limit.`);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected File Card */}
      {selectedFile ? (
        <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900">{selectedFile.name}</p>
              <p className="text-xs text-surface-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearFile}
            className="p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Dropzone Box */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 ${
            isDragOver
              ? 'border-brand-500 bg-brand-50/60 shadow-sm scale-[1.01]'
              : 'border-surface-300 bg-surface-50/50 hover:bg-surface-100/60 hover:border-surface-400'
          }`}
        >
          <input
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleInputChange}
            aria-label="Upload PDF Document"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none"
          />
          <div className="flex flex-col items-center space-y-3 pointer-events-none">
            <div className="p-3.5 bg-white rounded-full border border-surface-200 shadow-sm text-brand-600">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800">
                Click to upload or drag & drop PDF
              </p>
              <p className="text-xs text-surface-500 mt-1">PDF documents up to {maxSizeMb} MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
