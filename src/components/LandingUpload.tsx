import React, { useRef, useState } from 'react';
import {
  BookOpen,
  UploadCloud,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Presentation,
  FileText,
  Book,
  Image as ImageIcon,
} from 'lucide-react';
import { audioService } from '../services/audioService';

interface LandingUploadProps {
  onSelectFile: (file: File) => void;
  onOpenSampleBook: () => void;
}

export const LandingUpload: React.FC<LandingUploadProps> = ({
  onSelectFile,
  onOpenSampleBook,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setErrorMessage(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const supportedExts = [
      'pdf',
      'pptx',
      'ppt',
      'docx',
      'doc',
      'epub',
      'txt',
      'md',
      'markdown',
      'rtf',
      'json',
      'csv',
      'png',
      'jpg',
      'jpeg',
      'webp',
      'gif',
      'svg',
    ];

    if (!supportedExts.includes(ext) && file.type !== 'application/pdf') {
      setErrorMessage(
        'Please upload a supported document: PowerPoint (PPTX), PDF, Word (DOCX), EPUB, Text (TXT/MD), or Images.'
      );
      return;
    }

    // Initialize audio context on user gesture
    audioService.initOnUserGesture();
    audioService.playBookOpen();

    onSelectFile(file);
  };

  const handleSampleClick = () => {
    audioService.initOnUserGesture();
    audioService.playBookOpen();
    onOpenSampleBook();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-10 bg-[#090a0f] text-stone-200 overflow-hidden">
      {/* Soft ambient overhead lamp gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Top minimal brand bar */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-serif text-lg tracking-wide font-medium text-stone-100">
            BookGlass
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Client-Side · 100% Private</span>
        </div>
      </header>

      {/* Main Glass Centerpiece Card */}
      <main className="relative z-10 w-full max-w-2xl my-auto py-6">
        <div className="glass-panel rounded-3xl p-6 sm:p-12 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.7)] backdrop-blur-xl relative flex flex-col items-center text-center">
          {/* Subtle gold accent ring */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-300 mb-5 shadow-inner">
            <BookOpen className="w-7 h-7" />
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-medium tracking-tight text-stone-100 mb-2">
            Turn Any Document into a Book
          </h1>
          <p className="text-xs sm:text-sm font-serif italic text-stone-400 max-w-md mb-6">
            Read PowerPoint presentations, PDFs, Word docs, EPUBs, and text with realistic 3D page turns and ambient light.
          </p>

          {/* Supported Format Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-lg">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs">
              <Presentation className="w-3.5 h-3.5" />
              <span>PPT & PPTX</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-400/20 text-red-300 text-xs">
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs">
              <FileText className="w-3.5 h-3.5" />
              <span>DOCX & DOC</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs">
              <Book className="w-3.5 h-3.5" />
              <span>EPUB</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-500/10 border border-stone-400/20 text-stone-300 text-xs">
              <FileText className="w-3.5 h-3.5" />
              <span>TXT & Markdown</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-400/20 text-purple-300 text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Images</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="w-full mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Interactive Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full rounded-2xl border-2 border-dashed p-6 sm:p-10 flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                : 'border-white/15 bg-white/3 hover:border-amber-400/40 hover:bg-white/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.ppt,.docx,.doc,.epub,.txt,.md,.rtf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-stone-300 mb-1 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6 text-amber-300/80" />
            </div>

            <div className="font-serif text-lg font-medium text-stone-200">
              Drop any document or presentation here
            </div>

            <div className="text-xs text-stone-400">
              or <span className="text-amber-300 underline font-medium">browse from your computer / phone</span>
            </div>
          </div>

          {/* Classical Sample Book Option */}
          <div className="w-full mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>No document at hand?</span>
              </div>
              <div className="text-[11px] text-stone-400">
                Explore our curated 12-page classical edition.
              </div>
            </div>

            <button
              onClick={handleSampleClick}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-serif text-stone-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Read Sample Edition</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer information */}
      <footer className="relative z-10 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 py-2 border-t border-white/5 gap-2">
        <div>
          BookGlass · Realistic 3D Physical Document & Presentation Experience
        </div>
        <div className="flex items-center gap-4">
          <span>Keyboard Shortcuts (F: Fullscreen, ← →: Turn)</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingUpload;
