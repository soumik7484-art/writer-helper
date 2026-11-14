import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storyId: string) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Mystery');
  const [mood, setMood] = useState('Suspenseful');

  const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (selectedFile: File): boolean => {
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return false;
    }
    
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 10MB limit');
      return false;
    }
    
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        if (!title) {
          setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        if (!title) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('genre', genre);
      formData.append('mood', mood);
      formData.append('target_chapter_count', '6');

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/stories/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess(data.story.id);
        handleClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle('');
    setGenre('Mystery');
    setMood('Suspenseful');
    setError('');
    setSuccess(false);
    setDragActive(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(12, 10, 8, 0.85)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl rounded-xl shadow-2xl"
          style={{
            backgroundColor: '#E8DCC8',
            border: '3px solid #8A7969',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-6 border-b-2"
            style={{ borderColor: '#8A7969' }}
          >
            <div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: '#2C2416' }}>
                Upload Story Document
              </h2>
              <p className="font-typewriter text-xs mt-1" style={{ color: '#6E5943' }}>
                Extract chapters and generate visual storyboard analysis
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded hover:bg-black/10 transition-colors"
              style={{ color: '#6E5943' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Drag-drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive ? 'border-[#C49A61] bg-[#F5E6C0]/30' : 'border-[#A89F92]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={allowedTypes.join(',')}
                onChange={handleFileChange}
                className="hidden"
              />

              {!file ? (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto" style={{ color: '#C49A61' }} />
                  <div>
                    <p className="font-serif text-lg font-semibold" style={{ color: '#2C2416' }}>
                      Drop your story file here
                    </p>
                    <p className="font-typewriter text-xs mt-1" style={{ color: '#6E5943' }}>
                      or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="underline hover:text-[#C49A61]"
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                  <p className="font-typewriter text-xs" style={{ color: '#8A7969' }}>
                    Supported: PDF, DOCX, TXT • Max 10MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded bg-[#D9CBB0]">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8" style={{ color: '#8B6914' }} />
                    <div className="text-left">
                      <p className="font-serif font-semibold" style={{ color: '#2C2416' }}>
                        {file.name}
                      </p>
                      <p className="font-typewriter text-xs" style={{ color: '#6E5943' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-1.5 rounded hover:bg-black/10"
                    style={{ color: '#6E5943' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <label className="font-typewriter text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#6E5943' }}>
                  Story Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter story title (or auto-detect from filename)"
                  className="w-full px-4 py-2 rounded border-2 font-serif"
                  style={{
                    backgroundColor: '#FFFDF6',
                    borderColor: '#C4BCB0',
                    color: '#2C2416',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-typewriter text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#6E5943' }}>
                    Genre
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2 rounded border-2 font-serif"
                    style={{
                      backgroundColor: '#FFFDF6',
                      borderColor: '#C4BCB0',
                      color: '#2C2416',
                    }}
                  >
                    <option>Mystery</option>
                    <option>Horror</option>
                    <option>Fantasy</option>
                    <option>Sci-Fi</option>
                    <option>Romance</option>
                    <option>Adventure</option>
                    <option>Drama</option>
                  </select>
                </div>

                <div>
                  <label className="font-typewriter text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#6E5943' }}>
                    Mood
                  </label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full px-4 py-2 rounded border-2 font-serif"
                    style={{
                      backgroundColor: '#FFFDF6',
                      borderColor: '#C4BCB0',
                      color: '#2C2416',
                    }}
                  >
                    <option>Suspenseful</option>
                    <option>Dark</option>
                    <option>Atmospheric</option>
                    <option>Adventurous</option>
                    <option>Mysterious</option>
                    <option>Dramatic</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error/Success messages */}
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded" style={{ backgroundColor: '#F5EAEA' }}>
                <AlertCircle className="w-5 h-5" style={{ color: '#B5403A' }} />
                <p className="font-typewriter text-xs" style={{ color: '#B5403A' }}>
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 p-3 rounded" style={{ backgroundColor: '#D4F5D7' }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: '#4D7C44' }} />
                <p className="font-typewriter text-xs" style={{ color: '#4D7C44' }}>
                  Upload successful! Processing chapters...
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end space-x-3 p-6 border-t-2"
            style={{ borderColor: '#8A7969' }}
          >
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-5 py-2 rounded font-typewriter text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: '#D9CBB0',
                color: '#2C2416',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading || success}
              className="px-5 py-2 rounded font-typewriter text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#C49A61',
                color: '#14100D',
              }}
            >
              {uploading ? 'Uploading...' : 'Upload & Extract Chapters'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
