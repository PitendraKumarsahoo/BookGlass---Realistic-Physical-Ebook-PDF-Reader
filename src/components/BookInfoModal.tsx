import React from 'react';
import { X, Book, FileText, HardDrive, Compass, Clock } from 'lucide-react';
import { BookDocument } from '../types';

interface BookInfoModalProps {
  book: BookDocument;
  currentSpread: number;
  totalSpreads: number;
  onClose: () => void;
}

export const BookInfoModal: React.FC<BookInfoModalProps> = ({
  book,
  currentSpread,
  totalSpreads,
  onClose,
}) => {
  const percentage =
    totalSpreads > 1 ? Math.round((currentSpread / (totalSpreads - 1)) * 100) : 0;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '420 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Estimated reading time (~250 words/min, ~300 words/page)
  const estMinutesRemaining = Math.max(
    1,
    Math.round(((book.numPages * (100 - percentage)) / 100) * 1.2)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
            <Book className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-stone-100 leading-snug truncate max-w-[280px]">
              {book.title}
            </h3>
            <p className="text-xs text-stone-400 font-sans">
              {book.isSample
                ? 'Curated Classical Folio'
                : book.format === 'pptx'
                ? 'PowerPoint Presentation'
                : book.format === 'docx'
                ? 'Word Document'
                : book.format === 'epub'
                ? 'EPUB Electronic Book'
                : book.format === 'image'
                ? 'High-Resolution Image'
                : book.format === 'txt'
                ? 'Text / Markdown Folio'
                : 'PDF Document'}
            </p>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/3 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Length</span>
            </div>
            <div className="font-mono text-base font-semibold text-stone-200">
              {book.numPages} <span className="text-xs font-normal text-stone-400">pages</span>
            </div>
          </div>

          <div className="bg-white/3 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Progress</span>
            </div>
            <div className="font-mono text-base font-semibold text-stone-200">
              {percentage}% <span className="text-xs font-normal text-stone-400">completed</span>
            </div>
          </div>

          <div className="bg-white/3 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Storage Size</span>
            </div>
            <div className="font-mono text-base font-semibold text-stone-200">
              {formatFileSize(book.fileSize)}
            </div>
          </div>

          <div className="bg-white/3 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Remaining</span>
            </div>
            <div className="font-mono text-base font-semibold text-stone-200">
              ~{estMinutesRemaining} <span className="text-xs font-normal text-stone-400">min</span>
            </div>
          </div>
        </div>

        {/* Local Storage Privacy Note */}
        <div className="text-[11px] text-stone-400 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 leading-relaxed">
          <p className="font-medium text-amber-200/90 mb-0.5">Privacy First</p>
          This document is processed exclusively within your browser sandbox. No pages or text are ever transmitted to any remote servers.
        </div>
      </div>
    </div>
  );
};
