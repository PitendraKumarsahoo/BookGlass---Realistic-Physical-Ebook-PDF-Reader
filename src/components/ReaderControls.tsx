import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Columns2,
  FileText,
  RotateCw,
} from 'lucide-react';
import { BookDocument } from '../types';

interface ReaderControlsProps {
  book: BookDocument;
  currentSpread: number;
  totalSpreads: number;
  singlePageMode?: boolean;
  isFullscreen?: boolean;
  isMobile?: boolean;
  isMobileRotated?: boolean;
  onTurnPage: (direction: 'next' | 'prev') => void;
  onJumpToSpread: (target: number) => void;
  onToggleSinglePage?: () => void;
  onToggleFullscreen?: () => void;
  onToggleRotate?: () => void;
  isIdle: boolean;
}

export const ReaderControls: React.FC<ReaderControlsProps> = ({
  book,
  currentSpread,
  totalSpreads,
  singlePageMode = false,
  isFullscreen = false,
  isMobile = false,
  isMobileRotated = false,
  onTurnPage,
  onJumpToSpread,
  onToggleSinglePage,
  onToggleFullscreen,
  onToggleRotate,
  isIdle,
}) => {
  const [showSlider, setShowSlider] = useState<boolean>(false);
  const sliderDrawerRef = useRef<HTMLDivElement>(null);
  const sliderTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close page scrubber line drawer after user finishes interacting ("after work auto off")
  const resetSliderAutoClose = () => {
    if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
    sliderTimerRef.current = setTimeout(() => {
      setShowSlider(false);
    }, 2800);
  };

  useEffect(() => {
    if (showSlider) {
      resetSliderAutoClose();
      const handleClickOutside = (e: MouseEvent) => {
        if (sliderDrawerRef.current && !sliderDrawerRef.current.contains(e.target as Node)) {
          setShowSlider(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
      };
    }
  }, [showSlider]);

  // Compute percentage
  const percentage = isMobile
    ? Math.round((currentSpread / book.numPages) * 100)
    : totalSpreads > 1
    ? Math.round((currentSpread / (totalSpreads - 1)) * 100)
    : 0;

  // Compute page label
  const getPageLabel = () => {
    if (isMobile) {
      return `Page ${currentSpread} / ${book.numPages}`;
    }
    if (singlePageMode) {
      const page = currentSpread === 0 ? 1 : Math.min(book.numPages, currentSpread * 2);
      return `Page ${page} / ${book.numPages}`;
    }
    if (currentSpread === 0) {
      return `Page 1 / ${book.numPages}`;
    }
    const left = currentSpread * 2;
    const right = left + 1 <= book.numPages ? left + 1 : null;
    return right ? `${left}–${right} / ${book.numPages}` : `${left} / ${book.numPages}`;
  };

  const isPrevDisabled = isMobile ? currentSpread <= 1 : currentSpread <= 0;
  const isNextDisabled = isMobile ? currentSpread >= book.numPages : currentSpread >= totalSpreads - 1;

  return (
    <footer
      className={`fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-out flex flex-col items-center gap-1.5 sm:gap-2 max-w-[96vw] ${
        isIdle && !showSlider
          ? 'opacity-20 hover:opacity-100 translate-y-1'
          : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Optional scrub slider drawer */}
      {showSlider && (
        <div
          ref={sliderDrawerRef}
          className="glass-panel px-4 sm:px-5 py-2.5 rounded-full border border-white/10 shadow-xl flex items-center gap-3 backdrop-blur-md w-72 sm:w-96 animate-fade-in"
          onMouseEnter={() => {
            if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
          }}
          onMouseLeave={resetSliderAutoClose}
          onTouchStart={() => {
            if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
          }}
          onTouchEnd={resetSliderAutoClose}
        >
          <span className="text-[10px] font-mono text-stone-400">1</span>
          <input
            type="range"
            min={isMobile ? 1 : 0}
            max={isMobile ? book.numPages : totalSpreads - 1}
            value={currentSpread}
            onChange={(e) => {
              onJumpToSpread(Number(e.target.value));
              resetSliderAutoClose();
            }}
            className="w-full accent-amber-500 h-1 bg-stone-700/80 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] font-mono text-stone-400">{book.numPages}</span>
        </div>
      )}

      {/* Main floating control pill */}
      <div className="glass-panel rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-3.5 shadow-2xl border border-white/10 backdrop-blur-md">
        {/* Previous Button */}
        <button
          onClick={() => onTurnPage('prev')}
          disabled={isPrevDisabled}
          className={`flex items-center gap-1 text-xs font-serif tracking-wide px-2 sm:px-3 py-1 rounded-full transition-all cursor-pointer ${
            isPrevDisabled
              ? 'opacity-30 cursor-not-allowed text-stone-500'
              : 'text-stone-300 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Center Page Indicator & Scrubber Toggle */}
        <div className="flex items-center">
          <button
            onClick={() => {
              setShowSlider(!showSlider);
              if (!showSlider) resetSliderAutoClose();
            }}
            className="group flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
            title="Click to toggle page scrubber slider"
          >
            <span className="font-mono text-xs text-amber-200/90 font-medium tabular-nums">
              {getPageLabel()}
            </span>
            <span className="text-[10px] text-stone-400 group-hover:text-stone-200 hidden xs:inline">
              ({percentage}%)
            </span>
            <SlidersHorizontal className="w-3 h-3 text-stone-400 group-hover:text-amber-300 transition-colors ml-0.5" />
          </button>
        </div>

        {/* Next Button */}
        <button
          onClick={() => onTurnPage('next')}
          disabled={isNextDisabled}
          className={`flex items-center gap-1 text-xs font-serif tracking-wide px-2 sm:px-3 py-1 rounded-full transition-all cursor-pointer ${
            isNextDisabled
              ? 'opacity-30 cursor-not-allowed text-stone-500'
              : 'text-stone-300 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
          aria-label="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Vertical divider */}
        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        {/* Mobile Horizontal Rotation Button */}
        {isMobile && onToggleRotate && (
          <button
            onClick={onToggleRotate}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isMobileRotated
                ? 'text-amber-300 bg-amber-400/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/10'
            }`}
            title="Rotate View (Horizontal / Landscape)"
            aria-label="Rotate View"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Desktop Layout Mode Toggle */}
        {!isMobile && onToggleSinglePage && (
          <button
            onClick={onToggleSinglePage}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              singlePageMode
                ? 'text-amber-300 bg-amber-400/15'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/10'
            }`}
            title={
              singlePageMode
                ? 'Switch to Two-Page Spread'
                : 'Switch to Single Page View'
            }
            aria-label="Toggle Page Layout"
          >
            {singlePageMode ? (
              <FileText className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Columns2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Fullscreen Option right in bottom controls (mobile + desktop) */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 rounded-full transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (100% Screen View)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </footer>
  );
};

export default ReaderControls;
