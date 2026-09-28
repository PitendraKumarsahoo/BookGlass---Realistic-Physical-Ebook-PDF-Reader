import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Minimize2, RotateCw } from 'lucide-react';
import { BookDocument, ReaderSettings } from '../types';
import { BookSpread } from './BookSpread';
import { NightLightLamp } from './NightLightLamp';
import { ReaderToolbar } from './ReaderToolbar';
import { ReaderControls } from './ReaderControls';
import { BookInfoModal } from './BookInfoModal';
import { ThumbnailDrawer } from './ThumbnailDrawer';
import { storageService } from '../services/storageService';
import { audioService } from '../services/audioService';

interface BookReaderProps {
  book: BookDocument;
  onBackToLibrary: () => void;
}

export const BookReader: React.FC<BookReaderProps> = ({
  book,
  onBackToLibrary,
}) => {
  // Settings loaded from localStorage (singlePageMode defaults to false for 2-page horizontal spread)
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const s = storageService.getSettings();
    return {
      ...s,
      singlePageMode: s.singlePageMode ?? false,
    };
  });

  // Viewport dimensions & Mobile check
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const isMobile = windowWidth < 768;

  // Mobile horizontal rotation state
  const [isMobileRotated, setIsMobileRotated] = useState<boolean>(false);

  // Collapsible page thumbnails drawer state
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Total spreads calculation:
  // Spread 0: Cover (Page 1)
  // Spread 1: Pages 2–3
  // Spread 2: Pages 4–5 ...
  const totalSpreads = Math.max(1, Math.floor(book.numPages / 2) + 1);

  // Saved progress (page number 1-indexed)
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const saved = storageService.getReadingProgress(book.id);
    return Math.min(Math.max(1, saved || 1), book.numPages);
  });

  // Spread index corresponding to currentPage for 2-page spread view
  const currentSpread = currentPage === 1 ? 0 : Math.floor(currentPage / 2);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [isIdle, setIsIdle] = useState<boolean>(false);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update settings handler
  const handleUpdateSettings = (newSettings: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      storageService.saveSettings(updated);
      if (typeof newSettings.soundEnabled === 'boolean') {
        audioService.setEnabled(newSettings.soundEnabled);
      }
      return updated;
    });
  };

  // Turn page logic
  const handleTurnPage = useCallback(
    (direction: 'next' | 'prev') => {
      audioService.initOnUserGesture();

      if (settings.singlePageMode) {
        // Single-page mode: advances strictly by 1 page
        setCurrentPage((prev) => {
          let next = prev;
          if (direction === 'next' && prev < book.numPages) {
            next = prev + 1;
          } else if (direction === 'prev' && prev > 1) {
            next = prev - 1;
          }
          storageService.saveReadingProgress(book.id, next);
          return next;
        });
      } else {
        // Two-page spread mode (default on mobile and desktop): advances by spread
        setCurrentPage((prev) => {
          let next = prev;
          if (direction === 'next') {
            if (prev === 1) {
              next = Math.min(book.numPages, 2);
            } else {
              next = Math.min(book.numPages, prev % 2 === 0 ? prev + 2 : prev + 1);
            }
          } else {
            if (prev <= 3) {
              next = 1;
            } else {
              next = Math.max(1, prev % 2 === 0 ? prev - 2 : prev - 3);
            }
          }
          storageService.saveReadingProgress(book.id, next);
          return next;
        });
      }
    },
    [settings.singlePageMode, book.id, book.numPages]
  );

  const handleJumpToPage = (targetPage: number) => {
    const clamped = Math.min(Math.max(1, targetPage), book.numPages);
    setCurrentPage(clamped);
    storageService.saveReadingProgress(book.id, clamped);
    audioService.playPageTurn('forward');
  };

  const handleJumpToSpread = (spreadIndex: number) => {
    const targetPage = spreadIndex === 0 ? 1 : spreadIndex * 2;
    handleJumpToPage(targetPage);
  };

  // Fullscreen toggle utilizing Browser Fullscreen API
  const toggleFullscreen = async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen API invocation:', err);
      setIsFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(
        !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement)
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Mobile horizontal rotation toggle
  const toggleMobileRotation = async () => {
    setIsMobileRotated((prev) => !prev);
    try {
      const orientation = screen.orientation as any;
      if (orientation && orientation.lock) {
        if (!isMobileRotated) {
          await orientation.lock('landscape').catch(() => {});
        } else {
          await orientation.lock('portrait').catch(() => {});
        }
      }
    } catch {}
  };

  // Global keyboard navigation event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          (activeEl as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      // Left/Right arrow keys for page turning
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleTurnPage('next');
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        handleTurnPage('prev');
        return;
      }

      // Spacebar for scrolling / advancing pages
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (e.shiftKey) {
          handleTurnPage('prev');
        } else {
          handleTurnPage('next');
        }
        return;
      }

      // Toggle Thumbnails drawer shortcut 'T'
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setShowThumbnails((prev) => !prev);
        return;
      }

      // Fullscreen shortcut 'F'
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }

      // Escape key to dismiss modals or exit fullscreen
      if (e.key === 'Escape') {
        if (showThumbnails) {
          setShowThumbnails(false);
        } else if (showInfoModal) {
          setShowInfoModal(false);
        } else if (isFullscreen) {
          toggleFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTurnPage, showThumbnails, showInfoModal, isFullscreen]);

  // Mouse idle detection for calm reading immersion
  useEffect(() => {
    const resetIdle = () => {
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 3000);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('mousedown', resetIdle);
    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('mousedown', resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center transition-colors duration-700 ${
        settings.theme === 'night'
          ? 'bg-[#0a0a0d]'
          : settings.theme === 'sepia'
          ? 'bg-[#1e1713]'
          : 'bg-[#18181b]'
      }`}
    >
      {/* Warm Reading Lamp Lighting Effect centered vertically on pages with 3s auto fade-out */}
      <NightLightLamp
        enabled={settings.nightLightEnabled && settings.theme === 'night'}
        warmth={settings.nightLightWarmth}
        intensity={settings.nightLightIntensity}
      />

      {/* Floating Top Glass Toolbar - Overlayed transparently or hidden during fullscreen/idle */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-opacity duration-300 pointer-events-none ${
          isFullscreen
            ? isIdle
              ? 'opacity-0'
              : 'opacity-10 hover:opacity-100 focus-within:opacity-100'
            : 'opacity-100'
        }`}
      >
        <div className="pointer-events-auto">
          <ReaderToolbar
            book={book}
            currentSpread={settings.singlePageMode ? currentPage : currentSpread}
            totalSpreads={settings.singlePageMode ? book.numPages : totalSpreads}
            settings={settings}
            isFullscreen={isFullscreen}
            isMobile={isMobile}
            isMobileRotated={isMobileRotated}
            showThumbnails={showThumbnails}
            onUpdateSettings={handleUpdateSettings}
            onToggleFullscreen={toggleFullscreen}
            onToggleRotate={toggleMobileRotation}
            onToggleThumbnails={() => setShowThumbnails((prev) => !prev)}
            onBackToLibrary={onBackToLibrary}
            onOpenDetails={() => setShowInfoModal(true)}
            isIdle={isIdle && !isFullscreen}
          />
        </div>
      </div>

      {/* Fullscreen Transparent Floating HUD: Unobtrusive exit & rotate pill */}
      {isFullscreen && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2 group">
          {isMobile && (
            <button
              onClick={toggleMobileRotation}
              className={`p-2 rounded-full glass-panel border border-white/10 text-stone-300 hover:text-white transition-opacity cursor-pointer shadow-lg ${
                isIdle ? 'opacity-20 group-hover:opacity-100' : 'opacity-80'
              } ${isMobileRotated ? 'text-amber-300 border-amber-400/30' : ''}`}
              title="Rotate View"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel text-stone-300 hover:text-amber-200 border border-white/10 transition-opacity cursor-pointer shadow-lg text-xs ${
              isIdle ? 'opacity-20 group-hover:opacity-100' : 'opacity-80'
            }`}
            title="Exit Fullscreen (Esc or F)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="font-serif text-[11px] hidden sm:inline">Exit Fullscreen</span>
          </button>
        </div>
      )}

      {/* The Central Reading Area - Expands to 100% of device screen in Fullscreen or Mobile */}
      <main
        className={`relative z-10 w-full h-full flex items-center justify-center transition-all duration-300 ${
          isFullscreen
            ? 'p-0 m-0 w-full h-full'
            : isMobile
            ? 'p-1 w-full h-full'
            : 'pt-8 pb-10 px-1 sm:pt-10 sm:pb-12 sm:px-2 md:px-3'
        }`}
      >
        <BookSpread
          book={book}
          currentPage={currentPage}
          currentSpread={currentSpread}
          totalSpreads={totalSpreads}
          settings={settings}
          isFullscreen={isFullscreen}
          isMobile={isMobile}
          isMobileRotated={isMobileRotated}
          onTurnPage={handleTurnPage}
          onToggleRotate={toggleMobileRotation}
          onToggleSinglePage={() =>
            handleUpdateSettings({ singlePageMode: !settings.singlePageMode })
          }
        />
      </main>

      {/* Floating Bottom Glass Controls */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-opacity duration-300 pointer-events-none ${
          isFullscreen
            ? isIdle
              ? 'opacity-0'
              : 'opacity-10 hover:opacity-100 focus-within:opacity-100'
            : 'opacity-100'
        }`}
      >
        <div className="pointer-events-auto">
          <ReaderControls
            book={book}
            currentSpread={settings.singlePageMode ? currentPage : currentSpread}
            totalSpreads={settings.singlePageMode ? book.numPages : totalSpreads}
            singlePageMode={settings.singlePageMode}
            isFullscreen={isFullscreen}
            isMobile={isMobile}
            isMobileRotated={isMobileRotated}
            showThumbnails={showThumbnails}
            onTurnPage={handleTurnPage}
            onJumpToSpread={settings.singlePageMode ? handleJumpToPage : handleJumpToSpread}
            onToggleSinglePage={() =>
              handleUpdateSettings({ singlePageMode: !settings.singlePageMode })
            }
            onToggleFullscreen={toggleFullscreen}
            onToggleRotate={toggleMobileRotation}
            onToggleThumbnails={() => setShowThumbnails((prev) => !prev)}
            isIdle={isIdle && !isFullscreen}
          />
        </div>
      </div>

      {/* Collapsible Glass-Styled Thumbnail Drawer for rapid visual navigation */}
      <ThumbnailDrawer
        book={book}
        currentPage={currentPage}
        currentSpread={currentSpread}
        singlePageMode={settings.singlePageMode}
        isOpen={showThumbnails}
        onClose={() => setShowThumbnails(false)}
        onSelectPage={(pageNum) => {
          handleJumpToPage(pageNum);
        }}
      />

      {/* Book Metadata & Reading Stats Modal */}
      {showInfoModal && (
        <BookInfoModal
          book={book}
          currentSpread={currentSpread}
          totalSpreads={totalSpreads}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </div>
  );
};

export default BookReader;
