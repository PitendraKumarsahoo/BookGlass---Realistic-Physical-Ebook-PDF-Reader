import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  BookOpen,
  Info,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Columns2,
  FileText,
  RotateCw,
} from 'lucide-react';
import { BookDocument, ReaderSettings } from '../types';

interface ReaderToolbarProps {
  book: BookDocument;
  currentSpread: number;
  totalSpreads: number;
  settings: ReaderSettings;
  isFullscreen: boolean;
  isMobile?: boolean;
  isMobileRotated?: boolean;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  onToggleFullscreen: () => void;
  onToggleRotate?: () => void;
  onBackToLibrary: () => void;
  onOpenDetails: () => void;
  isIdle: boolean;
}

export const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  book,
  currentSpread,
  settings,
  isFullscreen,
  isMobile = false,
  isMobileRotated = false,
  onUpdateSettings,
  onToggleFullscreen,
  onToggleRotate,
  onBackToLibrary,
  onOpenDetails,
  isIdle,
}) => {
  const [showLampMenu, setShowLampMenu] = useState(false);
  const lampMenuRef = useRef<HTMLDivElement>(null);
  const lampTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close lamp menu after user finishes interaction ("after work auto off")
  const resetLampAutoClose = () => {
    if (lampTimerRef.current) clearTimeout(lampTimerRef.current);
    lampTimerRef.current = setTimeout(() => {
      setShowLampMenu(false);
    }, 2800);
  };

  useEffect(() => {
    if (showLampMenu) {
      resetLampAutoClose();
      const handleClickOutside = (e: MouseEvent) => {
        if (lampMenuRef.current && !lampMenuRef.current.contains(e.target as Node)) {
          setShowLampMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLampMenu]);

  // Compute current display page string
  const getPageDisplay = () => {
    if (isMobile) {
      return `Page ${currentSpread} of ${book.numPages}`;
    }
    if (settings.singlePageMode) {
      const page = currentSpread === 0 ? 1 : Math.min(book.numPages, currentSpread * 2);
      return `Page ${page} of ${book.numPages}`;
    }
    if (currentSpread === 0) {
      return `Cover · Page 1 of ${book.numPages}`;
    }
    const left = currentSpread * 2;
    const right = left + 1 <= book.numPages ? left + 1 : null;
    return right
      ? `Pages ${left}–${right} of ${book.numPages}`
      : `Page ${left} of ${book.numPages}`;
  };

  const handleZoom = (delta: number) => {
    const nextZoom = Math.min(1.4, Math.max(0.75, +(settings.zoom + delta).toFixed(2)));
    onUpdateSettings({ zoom: nextZoom });
  };

  const resetZoom = () => {
    onUpdateSettings({ zoom: 1.0 });
  };

  return (
    <header
      className={`fixed top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 z-40 max-w-6xl mx-auto transition-all duration-500 ease-out ${
        isIdle && !showLampMenu
          ? 'opacity-20 hover:opacity-100 translate-y-[-2px]'
          : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="glass-panel rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between shadow-2xl border border-white/10 backdrop-blur-md">
        {/* Left Zone: Brand / Return to Library */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1 sm:gap-2 text-xs font-medium text-stone-300 hover:text-white transition-colors cursor-pointer group py-1 px-1.5 sm:px-2 rounded-lg hover:bg-white/5"
            title="Return to library or upload another book"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400 group-hover:scale-105 transition-transform shrink-0" />
            <span className="font-serif tracking-wide text-xs sm:text-sm font-semibold text-stone-100">
              BookGlass
            </span>
          </button>
        </div>

        {/* Center Zone: Book Title and Page Indicator */}
        <div className="flex items-center gap-2 overflow-hidden px-2 sm:px-4 text-center">
          <span
            className="font-serif text-xs sm:text-sm text-stone-200 truncate max-w-[90px] sm:max-w-[220px] md:max-w-md font-medium"
            title={book.title}
          >
            {book.title}
          </span>
          <span className="text-stone-600 text-xs hidden md:inline" aria-hidden="true">
            ·
          </span>
          <span className="text-[11px] font-mono text-amber-200/80 tracking-wide shrink-0 hidden sm:inline">
            {getPageDisplay()}
          </span>
        </div>

        {/* Right Zone: Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 relative">
          {/* Mobile Horizontal Rotation Toggle */}
          {isMobile && onToggleRotate && (
            <button
              onClick={onToggleRotate}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isMobileRotated
                  ? 'text-amber-300 bg-amber-500/20 border border-amber-400/30'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
              title="Rotate View (Horizontal / Landscape)"
              aria-label="Rotate View"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Single Page / Two-Page Spread Toggle (Desktop only, since mobile is strictly single page) */}
          {!isMobile && (
            <button
              onClick={() =>
                onUpdateSettings({ singlePageMode: !settings.singlePageMode })
              }
              className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                settings.singlePageMode
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-400/25'
                  : 'text-stone-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
              title={
                settings.singlePageMode
                  ? 'Switch to Two-Page Horizontal Spread'
                  : 'Switch to Single Page View'
              }
              aria-label="Toggle Page Layout"
            >
              {settings.singlePageMode ? (
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              ) : (
                <Columns2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="text-[10px] sm:text-[11px] font-medium hidden sm:inline">
                {settings.singlePageMode ? '1 Page' : 'Spread'}
              </span>
            </button>
          )}

          {/* Zoom controls (Desktop) */}
          {!isMobile && (
            <div className="hidden lg:flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/5 mr-0.5">
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-1 text-stone-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetZoom}
                className="px-1 text-[10px] font-mono text-stone-300 hover:text-white"
                title="Reset Zoom"
              >
                {Math.round(settings.zoom * 100)}%
              </button>
              <button
                onClick={() => handleZoom(0.1)}
                className="p-1 text-stone-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
              settings.soundEnabled
                ? 'text-amber-300 bg-amber-400/10 hover:bg-amber-400/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
            }`}
            title={settings.soundEnabled ? 'Page Turn Sounds ON' : 'Page Turn Sounds Muted'}
            aria-label="Toggle Page Sounds"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>

          {/* Reading Light Toggle & Settings with Auto-Close */}
          <div className="relative" ref={lampMenuRef}>
            <button
              onClick={() => {
                setShowLampMenu(!showLampMenu);
                if (!showLampMenu) resetLampAutoClose();
              }}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                settings.nightLightEnabled
                  ? 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/20'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
              }`}
              title="Warm Center Reading Lamp"
              aria-label="Reading Lamp Settings"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[11px] font-medium hidden md:inline">
                {settings.nightLightEnabled ? 'Lamp ON' : 'Lamp'}
              </span>
            </button>

            {/* Lamp popup controls */}
            {showLampMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-64 glass-panel rounded-xl p-4 shadow-2xl border border-amber-500/20 z-50 animate-fade-in"
                onMouseEnter={() => {
                  if (lampTimerRef.current) clearTimeout(lampTimerRef.current);
                }}
                onMouseLeave={resetLampAutoClose}
                onTouchStart={() => {
                  if (lampTimerRef.current) clearTimeout(lampTimerRef.current);
                }}
                onTouchEnd={resetLampAutoClose}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                  <span className="font-serif text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Center Reading Light
                  </span>
                  <button
                    onClick={() => {
                      onUpdateSettings({ nightLightEnabled: !settings.nightLightEnabled });
                      resetLampAutoClose();
                    }}
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded cursor-pointer ${
                      settings.nightLightEnabled
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {settings.nightLightEnabled ? 'Active' : 'Off'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-stone-300 mb-1">
                      <span>Light Warmth</span>
                      <span className="font-mono text-amber-300/80">
                        {settings.nightLightWarmth}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.nightLightWarmth}
                      onChange={(e) => {
                        onUpdateSettings({
                          nightLightWarmth: Number(e.target.value),
                          nightLightEnabled: true,
                        });
                        resetLampAutoClose();
                      }}
                      className="w-full accent-amber-500 h-1 bg-stone-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-stone-300 mb-1">
                      <span>Brightness</span>
                      <span className="font-mono text-amber-300/80">
                        {settings.nightLightIntensity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.nightLightIntensity}
                      onChange={(e) => {
                        onUpdateSettings({
                          nightLightIntensity: Number(e.target.value),
                          nightLightEnabled: true,
                        });
                        resetLampAutoClose();
                      }}
                      className="w-full accent-amber-500 h-1 bg-stone-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Day / Night Theme Toggle */}
          <button
            onClick={() =>
              onUpdateSettings({
                theme: settings.theme === 'night' ? 'day' : 'night',
              })
            }
            className="p-1.5 sm:p-2 text-stone-400 hover:text-stone-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title={settings.theme === 'night' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            aria-label="Toggle Day / Night"
          >
            {settings.theme === 'night' ? (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            ) : (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            )}
          </button>

          {/* Book Info Modal */}
          <button
            onClick={onOpenDetails}
            className="p-1.5 sm:p-2 text-stone-400 hover:text-stone-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="Book Metadata & Reading Statistics"
            aria-label="Book Information"
          >
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Fullscreen Button (Browser Fullscreen API) */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 sm:p-2 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (100% Screen View)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default ReaderToolbar;
