import React, { useState, useEffect, useRef } from 'react';
import { BookDocument, ReaderSettings } from '../types';
import { PageRenderer } from './PageRenderer';
import { audioService } from '../services/audioService';
import { RotateCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

export interface BookSpreadProps {
  book: BookDocument;
  currentPage: number; // 1-indexed current page
  currentSpread: number; // 0-indexed spread for two-page mode
  totalSpreads: number;
  settings: ReaderSettings;
  isFullscreen?: boolean;
  isMobile?: boolean;
  isMobileRotated?: boolean;
  onTurnPage: (direction: 'next' | 'prev') => void;
  onToggleRotate?: () => void;
  onPageClick?: (pageNum: number) => void;
}

export const BookSpread: React.FC<BookSpreadProps> = ({
  book,
  currentPage,
  currentSpread,
  totalSpreads,
  settings,
  isFullscreen = false,
  isMobile = false,
  isMobileRotated = false,
  onTurnPage,
  onToggleRotate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 900,
    height: 600,
  });

  // Interactive Zoom & Pan State (Trackpad, Mousepad & Multi-touch screen pinch)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef<boolean>(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Flipping animation state
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [flipProgress, setFlipProgress] = useState<number>(0); // 0 to 1

  // Multi-touch pinch zoom tracking
  const initialTouchDist = useRef<number | null>(null);
  const initialTouchScale = useRef<number>(1.0);
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);

  // Responsive sizing maximizing screen real estate
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availableWidth = rect.width;
      const availableHeight = rect.height;

      if (isMobile) {
        // On mobile devices (width < 768px): strictly 100% of container in single-page mode
        setDimensions({
          width: Math.max(280, Math.floor(availableWidth)),
          height: Math.max(340, Math.floor(availableHeight)),
        });
      } else {
        // Desktop / Tablet two-page horizontal spread mode
        const fillW = isFullscreen ? 0.985 : 0.96;
        const fillH = isFullscreen ? 0.975 : 0.93;
        const targetAspect = 1.42;

        let targetW = availableWidth * fillW;
        let targetH = targetW / targetAspect;

        if (targetH > availableHeight * fillH) {
          targetH = availableHeight * fillH;
          targetW = targetH * targetAspect;
        }

        setDimensions({
          width: Math.max(320, Math.floor(targetW)),
          height: Math.max(260, Math.floor(targetH)),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isMobile, isFullscreen, isMobileRotated]);

  // Page numbers for two-page spread
  const getPageNumbersForSpread = (spreadIdx: number) => {
    if (spreadIdx === 0) {
      return { left: null, right: 1 };
    }
    const left = spreadIdx * 2;
    const right = left + 1 <= book.numPages ? left + 1 : null;
    return { left, right };
  };

  const { left: currentLeft, right: currentRight } = getPageNumbersForSpread(currentSpread);

  // Trigger page turn with 3D animation
  const handleNext = () => {
    if (isFlipping) return;
    if (isMobile && currentPage >= book.numPages) return;
    if (!isMobile && currentSpread >= totalSpreads - 1) return;

    setIsFlipping(true);
    setFlipDirection('next');
    setFlipProgress(0);
    audioService.playPageTurn('forward');

    const startTime = performance.now();
    const duration = isMobile ? 320 : 460;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const eased =
        rawProgress < 0.5
          ? 4 * rawProgress * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

      setFlipProgress(eased);

      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        onTurnPage('next');
        setIsFlipping(false);
        setFlipDirection(null);
        setFlipProgress(0);
      }
    };

    requestAnimationFrame(animate);
  };

  const handlePrev = () => {
    if (isFlipping) return;
    if (isMobile && currentPage <= 1) return;
    if (!isMobile && currentSpread <= 0) return;

    setIsFlipping(true);
    setFlipDirection('prev');
    setFlipProgress(0);
    audioService.playPageTurn('backward');

    const startTime = performance.now();
    const duration = isMobile ? 320 : 460;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const eased =
        rawProgress < 0.5
          ? 4 * rawProgress * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

      setFlipProgress(eased);

      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        onTurnPage('prev');
        setIsFlipping(false);
        setFlipDirection(null);
        setFlipProgress(0);
      }
    };

    requestAnimationFrame(animate);
  };

  // Stack thickness based on progress
  const progressRatio = totalSpreads > 1 ? currentSpread / (totalSpreads - 1) : 0;
  const maxStackDepth = 12; // px
  const leftStackPx = Math.max(2, Math.round(progressRatio * maxStackDepth));
  const rightStackPx = Math.max(2, Math.round((1 - progressRatio) * maxStackDepth));

  // Determine geometry
  const spineWidth = 22;
  const pageWidth = Math.max(140, Math.floor((dimensions.width - spineWidth) / 2));
  const pageHeight = dimensions.height;

  // Next and Prev pages for 3D flip intermediate states
  const nextSpreadPages = getPageNumbersForSpread(currentSpread + 1);
  const prevSpreadPages = getPageNumbersForSpread(currentSpread - 1);

  // Wheel zoom / Trackpad pinch handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.006;
        setZoomScale((prev) => {
          const next = Math.min(2.5, Math.max(0.65, +(prev + delta).toFixed(2)));
          if (next <= 1.0) setPanOffset({ x: 0, y: 0 });
          return next;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Multi-Touch Pinch & Touch Swipe Navigation Listeners
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialTouchDist.current = getDistance(e.touches[0], e.touches[1]);
        initialTouchScale.current = zoomScale;
      } else if (e.touches.length === 1) {
        touchStartPos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };

        if (zoomScale > 1.0) {
          isPanning.current = true;
          panStart.current = {
            x: e.touches[0].clientX - panOffset.x,
            y: e.touches[0].clientY - panOffset.y,
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDist.current !== null) {
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDist / initialTouchDist.current;
        const newZoom = Math.min(2.5, Math.max(0.65, +(initialTouchScale.current * scaleChange).toFixed(2)));
        setZoomScale(newZoom);
        if (newZoom <= 1.0) setPanOffset({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && isPanning.current && zoomScale > 1.0) {
        const maxPanX = (dimensions.width * (zoomScale - 1)) / 2;
        const maxPanY = (dimensions.height * (zoomScale - 1)) / 2;
        const nextX = e.touches[0].clientX - panStart.current.x;
        const nextY = e.touches[0].clientY - panStart.current.y;
        setPanOffset({
          x: Math.min(maxPanX, Math.max(-maxPanX, nextX)),
          y: Math.min(maxPanY, Math.max(-maxPanY, nextY)),
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      initialTouchDist.current = null;
      isPanning.current = false;

      if (touchStartPos.current && zoomScale <= 1.05 && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartPos.current.x;
        const deltaY = touch.clientY - touchStartPos.current.y;
        const deltaTime = Date.now() - touchStartPos.current.time;

        const minDistance = 35;
        const isHorizontalDominant = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

        if (isHorizontalDominant && Math.abs(deltaX) >= minDistance && deltaTime < 850) {
          if (deltaX < 0) {
            handleNext();
          } else {
            handlePrev();
          }
        }
      }
      touchStartPos.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleNext, handlePrev, zoomScale, dimensions, panOffset]);

  // Dynamic spine 3D depth and keyframe flex values
  const spineSin = isFlipping ? Math.sin(flipProgress * Math.PI) : 0;
  const spineBrightness = isFlipping
    ? 1 + (flipDirection === 'next' ? 0.35 : -0.22) * spineSin
    : 1;
  const spineContrast = isFlipping ? 1 + 0.45 * spineSin : 1;
  const spineZ = -4 * spineSin;
  const spineTilt = isFlipping ? (flipDirection === 'next' ? -2.5 : 2.5) * spineSin : 0;
  const highlightPercent = isFlipping
    ? flipDirection === 'next'
      ? Math.round(20 + flipProgress * 60)
      : Math.round(80 - flipProgress * 60)
    : 50;

  const spineAnimationClass = isFlipping
    ? flipDirection === 'next'
      ? 'spine-turning-forward'
      : 'spine-turning-backward'
    : '';

  // -------------------------------------------------------------
  // MOBILE STRICT SINGLE-PAGE READING MODE (width < 768px)
  // Page takes up 100% of the screen width and height in a glass-morphic container
  // -------------------------------------------------------------
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center p-1.5 sm:p-3 select-none overflow-hidden touch-pan-y transition-transform duration-300 ${
          isMobileRotated ? 'mobile-horizontal-container' : ''
        }`}
      >
        {/* Glass-Morphic Full Screen Container for Single Page */}
        <div className="glass-mobile-page-container relative w-full h-full rounded-2xl border border-white/20 shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col items-center justify-center">
          {/* Main 100% Page Rendering Canvas */}
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            style={{
              transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
              transformOrigin: 'center center',
              transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <PageRenderer
              book={book}
              pageNum={currentPage}
              side="right"
              targetWidth={dimensions.width}
              targetHeight={dimensions.height}
              theme={settings.theme}
              onClick={handleNext}
            />

            {/* Subtle specular glass highlight sheen */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.04] via-transparent to-white/[0.06]" />
          </div>

          {/* Transparent Tap Navigation Overlays (Left 35% -> Prev, Right 65% -> Next) */}
          <div className="absolute inset-0 flex pointer-events-none z-20">
            <div
              className="w-1/3 h-full cursor-pointer pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              title="Previous Page"
            />
            <div
              className="w-2/3 h-full cursor-pointer pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              title="Next Page"
            />
          </div>

          {/* Floating Mobile Top Glass Badge with Quick Rotate Option */}
          <div className="absolute top-2.5 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
            <div className="glass-panel px-3 py-1 rounded-full border border-white/10 shadow-lg text-[11px] font-mono text-amber-200/90 pointer-events-auto">
              Page {currentPage} of {book.numPages}
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {onToggleRotate && (
                <button
                  onClick={onToggleRotate}
                  className={`p-1.5 rounded-full glass-panel border border-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer shadow-md ${
                    isMobileRotated ? 'text-amber-300 border-amber-400/40 bg-amber-500/20' : ''
                  }`}
                  title="Rotate to Horizontal (Landscape) / Portrait"
                  aria-label="Rotate View"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Page Arrows on Mobile Edges */}
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full glass-panel border border-white/15 text-stone-300 hover:text-white transition-opacity ${
              currentPage <= 1 ? 'opacity-0 pointer-events-none' : 'opacity-40 hover:opacity-100'
            }`}
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentPage >= book.numPages}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full glass-panel border border-white/15 text-stone-300 hover:text-white transition-opacity ${
              currentPage >= book.numPages ? 'opacity-0 pointer-events-none' : 'opacity-40 hover:opacity-100'
            }`}
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DESKTOP & TABLET TWO-PAGE SPREAD WITH 3D TURNING & GLASS PEDESTAL
  // -------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center select-none overflow-hidden touch-pan-y"
    >
      {/* Zoomed & Panned Viewport Stage */}
      <div
        className="relative flex items-center justify-center"
        style={{
          transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
          transformOrigin: 'center center',
          transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        {/* Floating Zoom Indicator & Reset when zoomed */}
        {zoomScale !== 1.0 && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 glass-panel px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 text-xs shadow-xl animate-fade-in pointer-events-auto">
            <span className="font-mono text-amber-200/90">{Math.round(zoomScale * 100)}%</span>
            <button
              onClick={() => {
                setZoomScale(1.0);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="text-[10px] text-stone-400 hover:text-white underline cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}

        {/* 3D Glass Exhibition Pedestal & Book Housing */}
        <div
          className="glass-pedestal relative rounded-2xl sm:rounded-3xl p-3 sm:p-5 transition-all duration-300 flex items-center justify-center shadow-2xl"
          style={{
            width: dimensions.width + 36,
            height: dimensions.height + 36,
          }}
        >
          {/* Luminous Glass Corner Brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/30 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/30 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/30 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/30 rounded-br-lg pointer-events-none" />

          {/* 3D Stage */}
          <div
            className="book-3d-scene relative transition-all duration-300 flex items-center justify-center"
            style={{
              width: dimensions.width,
              height: dimensions.height,
            }}
          >
            {/* PHYSICAL HARDCOVER BOOK CASING / OUTER LEATHER BEVEL */}
            <div
              className={`absolute -inset-2.5 sm:-inset-4 rounded-xl transition-all duration-500 ${
                settings.theme === 'night'
                  ? 'bg-gradient-to-b from-[#151413] via-[#0d0c0b] to-[#121110] shadow-[0_28px_70px_rgba(0,0,0,0.85),0_10px_25px_rgba(0,0,0,0.6)] border border-stone-800/40'
                  : settings.theme === 'sepia'
                  ? 'bg-gradient-to-b from-[#2e231c] via-[#221a14] to-[#1c1510] shadow-[0_28px_60px_rgba(40,25,15,0.4),0_8px_20px_rgba(40,25,15,0.3)] border border-[#4a3a2d]/50'
                  : 'bg-gradient-to-b from-[#222120] via-[#1a1918] to-[#121212] shadow-[0_30px_70px_rgba(0,0,0,0.45),0_12px_24px_rgba(0,0,0,0.25)] border border-stone-700/50'
              }`}
              style={{
                transform: 'translateZ(-10px)',
              }}
            />

            {/* PHYSICAL PAGE STACK EDGES */}
            <>
              {/* Left stack edge */}
              <div
                className={`absolute top-0 bottom-0 left-0 -translate-x-full rounded-l-xs transition-all duration-300 ${
                  settings.theme === 'night' ? 'page-stack-edge-dark' : 'page-stack-edge-left'
                }`}
                style={{
                  width: `${leftStackPx}px`,
                  boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.4), -3px 4px 10px rgba(0,0,0,0.4)',
                }}
              />
              {/* Right stack edge */}
              <div
                className={`absolute top-0 bottom-0 right-0 translate-x-full rounded-r-xs transition-all duration-300 ${
                  settings.theme === 'night' ? 'page-stack-edge-dark' : 'page-stack-edge-right'
                }`}
                style={{
                  width: `${rightStackPx}px`,
                  boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.4), 3px 4px 10px rgba(0,0,0,0.4)',
                }}
              />
            </>

            {/* BOOK BODY CONTAINER */}
            <div
              className="relative w-full h-full flex rounded-sm overflow-hidden"
              style={{
                boxShadow:
                  settings.theme === 'night'
                    ? '0 15px 35px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.4)'
                    : '0 15px 35px rgba(0,0,0,0.25), inset 0 0 15px rgba(0,0,0,0.08)',
              }}
            >
              {/* TWO-PAGE HORIZONTAL SPREAD */}
              <div className="relative w-full h-full flex">
                {/* LEFT PAGE LEAF */}
                <div
                  className="relative h-full overflow-hidden cursor-pointer group"
                  style={{ width: pageWidth }}
                  onClick={handlePrev}
                  title="Click to turn to previous page"
                >
                  <PageRenderer
                    book={book}
                    pageNum={isFlipping && flipDirection === 'prev' ? prevSpreadPages.left : currentLeft}
                    side="left"
                    targetWidth={pageWidth}
                    targetHeight={pageHeight}
                    theme={settings.theme}
                  />

                  {/* Left Page Spine Gutter Shadow */}
                  <div className="spine-gutter-left absolute top-0 right-0 bottom-0 w-8 sm:w-16 pointer-events-none" />
                  <div className="absolute top-0 left-0 bottom-0 w-2 sm:w-3 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* CENTER SPINE GUTTER WITH DYNAMIC LIGHTING & KEYFRAME SHIFT */}
                <div
                  className={`relative h-full shrink-0 spine-crease z-20 pointer-events-none flex items-center justify-center overflow-hidden ${spineAnimationClass}`}
                  style={{
                    width: `${spineWidth}px`,
                    '--spine-brightness': spineBrightness.toFixed(3),
                    '--spine-contrast': spineContrast.toFixed(3),
                    transform: isFlipping
                      ? `perspective(800px) translateZ(${spineZ}px) rotateY(${spineTilt}deg)`
                      : 'translateZ(0px)',
                  } as React.CSSProperties}
                >
                  {isFlipping && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-100"
                      style={{
                        background: `linear-gradient(to right, rgba(0,0,0,${0.35 + spineSin * 0.25}) 0%, rgba(255,255,255,${0.18 * spineSin}) ${highlightPercent}%, rgba(0,0,0,${0.45 + spineSin * 0.25}) 100%)`,
                        opacity: spineSin,
                      }}
                    />
                  )}

                  {/* Stitched binding thread markings */}
                  <div
                    className="flex flex-col justify-around h-full py-4 sm:py-6 transition-all duration-150"
                    style={{
                      opacity: isFlipping ? 0.45 : 0.3,
                      transform: isFlipping ? `scaleY(${1 + spineSin * 0.06})` : 'scaleY(1)',
                    }}
                  >
                    <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-amber-200/40 rounded-full shadow-xs" />
                    <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-amber-200/40 rounded-full shadow-xs" />
                    <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-amber-200/40 rounded-full shadow-xs" />
                    <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-amber-200/40 rounded-full shadow-xs" />
                  </div>
                </div>

                {/* RIGHT PAGE LEAF */}
                <div
                  className="relative h-full overflow-hidden cursor-pointer group"
                  style={{ width: pageWidth }}
                  onClick={handleNext}
                  title="Click to turn to next page"
                >
                  <PageRenderer
                    book={book}
                    pageNum={isFlipping && flipDirection === 'next' ? nextSpreadPages.right : currentRight}
                    side="right"
                    targetWidth={pageWidth}
                    targetHeight={pageHeight}
                    theme={settings.theme}
                  />

                  {/* Right Page Spine Gutter Shadow */}
                  <div className="spine-gutter-right absolute top-0 left-0 bottom-0 w-8 sm:w-16 pointer-events-none z-20" />
                  <div className="absolute top-0 right-0 bottom-0 w-2 sm:w-3 bg-gradient-to-l from-black/15 to-transparent pointer-events-none z-20" />
                  <div className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-tl from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20" />
                </div>

                {/* 3D TURNING LEAF */}
                {isFlipping && (
                  <div
                    className="absolute top-0 bottom-0 z-40 pointer-events-none"
                    style={{
                      left: flipDirection === 'next' ? pageWidth + spineWidth : 0,
                      width: pageWidth,
                      perspective: '2500px',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Flipping Forward */}
                    {flipDirection === 'next' && (
                      <div
                        className="relative w-full h-full leaf-origin-left backface-hidden"
                        style={{
                          transform: `rotateY(${-180 * flipProgress}deg)`,
                          transformStyle: 'preserve-3d',
                          boxShadow:
                            flipProgress > 0.05 && flipProgress < 0.95
                              ? `${-24 * Math.sin(flipProgress * Math.PI)}px 12px 36px rgba(0,0,0,0.6)`
                              : 'none',
                        }}
                      >
                        <div
                          className="absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{ transform: 'rotateY(0deg)' }}
                        >
                          <PageRenderer
                            book={book}
                            pageNum={currentRight}
                            side="right"
                            targetWidth={pageWidth}
                            targetHeight={pageHeight}
                            theme={settings.theme}
                          />
                          <div
                            className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                            style={{ opacity: Math.sin(flipProgress * Math.PI) * 0.35 }}
                          />
                        </div>

                        <div
                          className="absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{ transform: 'rotateY(180deg)' }}
                        >
                          <PageRenderer
                            book={book}
                            pageNum={nextSpreadPages.left}
                            side="left"
                            targetWidth={pageWidth}
                            targetHeight={pageHeight}
                            theme={settings.theme}
                          />
                          <div
                            className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                            style={{ opacity: Math.sin(flipProgress * Math.PI) * 0.25 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Flipping Backward */}
                    {flipDirection === 'prev' && (
                      <div
                        className="relative w-full h-full leaf-origin-right backface-hidden"
                        style={{
                          transform: `rotateY(${180 * flipProgress}deg)`,
                          transformStyle: 'preserve-3d',
                          boxShadow:
                            flipProgress > 0.05 && flipProgress < 0.95
                              ? `${24 * Math.sin(flipProgress * Math.PI)}px 12px 36px rgba(0,0,0,0.6)`
                              : 'none',
                        }}
                      >
                        <div
                          className="absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{ transform: 'rotateY(0deg)' }}
                        >
                          <PageRenderer
                            book={book}
                            pageNum={currentLeft}
                            side="left"
                            targetWidth={pageWidth}
                            targetHeight={pageHeight}
                            theme={settings.theme}
                          />
                          <div
                            className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                            style={{ opacity: Math.sin(flipProgress * Math.PI) * 0.35 }}
                          />
                        </div>

                        <div
                          className="absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{ transform: 'rotateY(180deg)' }}
                        >
                          <PageRenderer
                            book={book}
                            pageNum={prevSpreadPages.right}
                            side="right"
                            targetWidth={pageWidth}
                            targetHeight={pageHeight}
                            theme={settings.theme}
                          />
                          <div
                            className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                            style={{ opacity: Math.sin(flipProgress * Math.PI) * 0.25 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSpread;
