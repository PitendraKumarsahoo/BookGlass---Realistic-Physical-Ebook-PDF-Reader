import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronDown,
  LayoutGrid,
  Search,
  BookOpen,
  Presentation,
  FileText,
  Book,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { BookDocument } from '../types';
import { pdfService } from '../services/pdfService';
import { audioService } from '../services/audioService';

interface ThumbnailDrawerProps {
  book: BookDocument;
  currentPage: number;
  currentSpread: number;
  singlePageMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (pageNum: number) => void;
}

// Sub-component for individual PDF thumbnail with lazy loading via IntersectionObserver
const PdfThumbnailItem: React.FC<{
  pdfDoc: any;
  pageNum: number;
  isActive: boolean;
}> = ({ pdfDoc, pageNum, isActive }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          pdfService
            .renderThumbnail(pdfDoc, pageNum, 110, 155)
            .then((url) => {
              if (!isCancelled && url) {
                setImgSrc(url);
                setLoading(false);
              }
            })
            .catch(() => {
              if (!isCancelled) setLoading(false);
            });
        }
      },
      { rootMargin: '120px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      isCancelled = true;
      observer.disconnect();
    };
  }, [pdfDoc, pageNum]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-white rounded overflow-hidden relative"
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={`Page ${pageNum}`}
          className="w-full h-full object-contain select-none"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-stone-400 bg-stone-900/10">
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          ) : (
            <span className="text-[9px] font-mono">{pageNum}</span>
          )}
        </div>
      )}
    </div>
  );
};

export const ThumbnailDrawer: React.FC<ThumbnailDrawerProps> = ({
  book,
  currentPage,
  currentSpread,
  singlePageMode,
  isOpen,
  onClose,
  onSelectPage,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLButtonElement>(null);
  const [jumpInput, setJumpInput] = useState<string>('');

  // Auto-scroll the active page thumbnail into view whenever drawer opens or currentPage changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        activeCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentPage]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput, 10);
    if (!isNaN(target) && target >= 1 && target <= book.numPages) {
      audioService.playPageTurn('forward');
      onSelectPage(target);
      setJumpInput('');
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  const isPageActive = (pageNum: number) => {
    if (singlePageMode) {
      return currentPage === pageNum;
    }
    // In spread mode, either left or right page in current spread is active
    if (currentSpread === 0) {
      return pageNum === 1;
    }
    const left = currentSpread * 2;
    const right = left + 1 <= book.numPages ? left + 1 : null;
    return pageNum === left || pageNum === right;
  };

  // Render thumbnail content based on book format
  const renderThumbnailPreview = (pageNum: number, isActive: boolean) => {
    if (book.format === 'pdf' && book.pdfDoc) {
      return <PdfThumbnailItem pdfDoc={book.pdfDoc} pageNum={pageNum} isActive={isActive} />;
    }

    if (book.pagesData && book.pagesData[pageNum]) {
      const pageData = book.pagesData[pageNum];

      if (pageData.type === 'slide') {
        return (
          <div className="w-full h-full bg-[#18181b] p-2 flex flex-col justify-between text-left select-none overflow-hidden border border-white/5 rounded">
            <div className="flex items-center gap-1 text-[8px] font-mono text-amber-300/80 truncate">
              <Presentation className="w-2.5 h-2.5 shrink-0" />
              <span>Slide {pageNum}</span>
            </div>
            <div className="text-[9px] font-serif font-medium text-stone-200 line-clamp-2 leading-tight">
              {pageData.title || `Slide ${pageNum}`}
            </div>
            <div className="space-y-0.5">
              <div className="w-full h-1 bg-white/10 rounded-full" />
              <div className="w-3/4 h-1 bg-white/10 rounded-full" />
            </div>
          </div>
        );
      }

      if (pageData.type === 'image' && pageData.imageUrl) {
        return (
          <div className="w-full h-full bg-black rounded overflow-hidden">
            <img
              src={pageData.imageUrl}
              alt={`Page ${pageNum}`}
              className="w-full h-full object-cover select-none"
            />
          </div>
        );
      }

      // Word / Text / Article
      return (
        <div className="w-full h-full bg-[#faf7f2] dark:bg-[#1a1918] p-2 flex flex-col justify-between text-left select-none overflow-hidden rounded border border-stone-300/30">
          <div className="text-[8px] font-serif italic text-stone-400 truncate">
            {pageData.title || book.title}
          </div>
          <div className="space-y-1">
            <div className="w-full h-1 bg-stone-400/30 rounded" />
            <div className="w-11/12 h-1 bg-stone-400/30 rounded" />
            <div className="w-4/5 h-1 bg-stone-400/30 rounded" />
            <div className="w-3/4 h-1 bg-stone-400/30 rounded" />
          </div>
          <div className="text-[8px] font-mono text-stone-400 text-right">{pageNum}</div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="w-full h-full bg-stone-800/80 p-2 flex flex-col items-center justify-center text-stone-400 rounded">
        <FileText className="w-5 h-5 text-amber-400/60 mb-1" />
        <span className="text-[10px] font-mono">{pageNum}</span>
      </div>
    );
  };

  const pagesArray = Array.from({ length: book.numPages }, (_, i) => i + 1);

  return (
    <>
      {/* Backdrop Dimmer */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Glass Bottom Drawer */}
      <aside
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out transform ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        aria-label="Document Page Thumbnails Navigation"
      >
        <div className="w-full max-w-6xl mx-auto rounded-t-3xl bg-[#0c0d12]/92 backdrop-blur-2xl border-t border-x border-white/15 shadow-[0_-20px_50px_rgba(0,0,0,0.85)] p-3 sm:p-5 flex flex-col gap-3">
          {/* Top Bar with Title, Jump Input & Close Button */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            {/* Left: Section Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-medium text-stone-100 flex items-center gap-2">
                  <span>Page Navigator</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-300">
                    {book.numPages} Pages
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400 font-sans hidden sm:block truncate max-w-xs">
                  {book.title}
                </p>
              </div>
            </div>

            {/* Center: Jump to Page Form */}
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={book.numPages}
                  placeholder={`1-${book.numPages}`}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  className="w-20 sm:w-24 px-2.5 py-1 text-xs font-mono bg-white/5 border border-white/15 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30"
                />
              </div>
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-xs font-serif transition-colors cursor-pointer"
              >
                Jump
              </button>
            </form>

            {/* Right: Quick actions & Close button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={scrollLeft}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer hidden md:flex"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={scrollRight}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer hidden md:flex"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer ml-1"
                title="Close Thumbnails (Esc or T)"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontally Scrollable Thumbnails Strip */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-3 overflow-x-auto py-2 px-1 scroll-smooth select-none focus:outline-hidden"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(251,191,36,0.3) rgba(255,255,255,0.05)',
            }}
          >
            {pagesArray.map((pageNum) => {
              const active = isPageActive(pageNum);
              return (
                <button
                  key={pageNum}
                  ref={active ? activeCardRef : null}
                  onClick={() => {
                    audioService.playPageTurn('forward');
                    onSelectPage(pageNum);
                  }}
                  className={`group relative shrink-0 flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all duration-200 cursor-pointer focus:outline-hidden ${
                    active
                      ? 'ring-2 ring-amber-400 bg-amber-500/15 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                      : 'hover:bg-white/10 hover:scale-102 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    width: '88px',
                  }}
                  title={`Go to Page ${pageNum}`}
                >
                  {/* Miniature Folio Canvas / Preview */}
                  <div
                    className="w-full rounded-lg overflow-hidden border border-white/10 shadow-md bg-stone-900 transition-all duration-200"
                    style={{
                      height: '118px',
                    }}
                  >
                    {renderThumbnailPreview(pageNum, active)}
                  </div>

                  {/* Page Indicator Badge */}
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded ${
                        active
                          ? 'bg-amber-400 text-stone-950 font-bold'
                          : 'text-stone-400 group-hover:text-stone-200'
                      }`}
                    >
                      {pageNum}
                    </span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom subtle hint */}
          <div className="flex items-center justify-between text-[10px] text-stone-500 px-1 pt-1 border-t border-white/5">
            <span>Click any page thumbnail to flip directly</span>
            <span className="font-mono">Tip: Press 'T' to toggle thumbnail drawer</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ThumbnailDrawer;
