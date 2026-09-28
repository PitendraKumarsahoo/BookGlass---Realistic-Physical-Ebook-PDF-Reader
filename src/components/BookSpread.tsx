import React, { useState, useEffect, useRef } from 'react';
import { BookDocument, ReaderSettings } from '../types';
import { PageRenderer } from './PageRenderer';
import { audioService } from '../services/audioService';
import { pdfService } from '../services/pdfService';
import { RotateCw, Columns2, FileText } from 'lucide-react';

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
  onToggleSinglePage?: () => void;
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
  onToggleSinglePage,
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

  const isSinglePage = settings.singlePageMode;

  // Responsive sizing maximizing screen real estate for 2-page spread and single-page
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availableWidth = rect.width;
      const availableHeight = rect.height;

      if (isSinglePage) {
        // Single Page Mode: ~0.71 folio aspect ratio
        const fillW = isFullscreen ? 0.99 : 0.96;
        const fillH = isFullscreen ? 0.99 : 0.95;
        const targetAspect = 0.71;

        let targetW = availableWidth * fillW;
        let targetH = targetW / targetAspect;

        if (targetH > availableHeight * fillH) {
          targetH = availableHeight * fillH;
          targetW = targetH * targetAspect;
        }

        setDimensions({
          width: Math.max(260, Math.floor(targetW)),
          height: Math.max(340, Math.floor(targetH)),
        });
      } else {
        // TWO-PAGE SPREAD (Left Page | Spine | Right Page)
        // Works on desktop and mobile (especially horizontal landscape)
        const fillW = isFullscreen ? 0.99 : 0.97;
        const fillH = isFullscreen ? 0.98 : 0.94;
        const targetAspect = 1.42;

        let targetW = availableWidth * fillW;
        let targetH = targetW / targetAspect;

        if (targetH > availableHeight * fillH) {
          targetH = availableHeight * fillH;
          targetW = targetH * targetAspect;
        }

        setDimensions({
          width: Math.max(280, Math.floor(targetW)),
          height: Math.max(190, Math.floor(targetH)),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isSinglePage, isFullscreen, isMobileRotated]);

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
    if (isSinglePage && currentPage >= book.numPages) return;
    if (!isSinglePage && currentSpread >= totalSpreads - 1) return;

    setIsFlipping(true);
    setFlipDirection('next');
    setFlipProgress(0);
    audioService.playPageTurn('forward');

    const startTime = performance.now();
    const duration = isMobile ? 340 : 420;

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
    if (isSinglePage && currentPage <= 1) return;
    if (!isSinglePage && currentSpread <= 0) return;

    setIsFlipping(true);
    setFlipDirection('prev');
    setFlipProgress(0);
    audioService.playPageTurn('backward');

    const startTime = performance.now();
    const duration = isMobile ? 340 : 420;

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
  const maxStackDepth = isMobile ? 6 : 12; // px
  const leftStackPx = Math.max(2, Math.round(progressRatio * maxStackDepth));
  const rightStackPx = Math.max(2, Math.round((1 - progressRatio) * maxStackDepth));

  // Determine geometry
  const spineWidth = isMobile ? 14 : 22;
  const pageWidth = isSinglePage
    ? dimensions.width
    : Math.max(120, Math.floor((dimensions.width - spineWidth) / 2));
  const pageHeight = dimensions.height;

  // Next and Prev pages for 3D flip intermediate states
  const nextSpreadPages = getPageNumbersForSpread(currentSpread + 1);
  const prevSpreadPages = getPageNumbersForSpread(currentSpread - 1);

  // Proactively pre-render upcoming pages at 2x scale in High-Resolution Offscreen Canvas Buffer
  useEffect(() => {
    if (!book.pdfDoc) return;
    const basePage = isSinglePage ? currentPage : Math.max(1, currentSpread * 2);
    pdfService.preRenderUpcomingPages(
      book.pdfDoc,
      basePage,
      pageWidth,
      pageHeight,
      6
    );
  }, [book.pdfDoc, currentSpread, currentPage, isSinglePage, pageWidth, pageHeight]);

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

  // Portrait orientation detection for mobile view
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight >= window.innerWidth;
  });

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight >= window.innerWidth);
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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

  // Secondary dynamic subtle box-shadow layer that responds to the page-flip animation
  const secondaryShadowOffsetX = isFlipping
    ? (flipDirection === 'next' ? -1 : 1) * Math.sin(flipProgress * Math.PI) * 9
    : 0;
  const secondaryShadowBlur = isFlipping ? 8 + spineSin * 14 : 6;
  const secondaryShadowSpread = isFlipping ? 1 + spineSin * 3.5 : 0;
  const secondaryShadowAlpha = isFlipping ? 0.45 + spineSin * 0.4 : 0.35;
  const spineSecondaryShadow = `${secondaryShadowOffsetX.toFixed(1)}px 0 ${secondaryShadowBlur.toFixed(1)}px ${secondaryShadowSpread.toFixed(1)}px rgba(0, 0, 0, ${secondaryShadowAlpha.toFixed(2)})`;

  const spineAnimationClass = isFlipping
    ? flipDirection === 'next'
      ? 'spine-turning-forward'
      : 'spine-turning-backward'
    : '';

  // -------------------------------------------------------------
  // Dynamic Pseudo-Element Warm Reading Light Reflection Formula
  // Simulates an overhead incandescent lamp hitting curling paper
  // -------------------------------------------------------------
  const warmth = settings.nightLightWarmth ?? 50; // 0 (amber) to 100 (candle)
  const lampIntensity = (settings.nightLightIntensity ?? 50) / 100; // 0.1 to 1.0
  const isNightTheme = settings.theme === 'night';
  const isLampActive = settings.nightLightEnabled && isNightTheme;

  // Warm light chromatic spectrum
  const warmR = 255;
  const warmG = Math.round(235 - (warmth / 100) * 60); // 235 down to 175
  const warmB = Math.round(185 - (warmth / 100) * 115); // 185 down to 70

  // Curvature calculation of the bending paper leaf (0 at flat, 1.0 at 90deg vertical curl)
  const sinCurvature = isFlipping ? Math.sin(flipProgress * Math.PI) : 0;

  // Dynamic light incidence angle (degrees)
  // For 'next' (right-to-left arc): angle sweeps from ~112deg to ~202deg as paper rotates toward lamp
  // For 'prev' (left-to-right arc): angle sweeps from ~248deg to ~158deg
  // At rest: natural overhead angle of 135deg
  const lightAngle = isFlipping
    ? flipDirection === 'next'
      ? +(112 + flipProgress * 90).toFixed(1)
      : +(248 - flipProgress * 90).toFixed(1)
    : 135;

  // Specular highlight band center position (0% to 100% across the gradient)
  // Tracks the physical ridge of highest curvature as the leaf curls
  const ridgePos = isFlipping
    ? flipDirection === 'next'
      ? +(25 + (1 - flipProgress) * 50).toFixed(1)
    : +(25 + flipProgress * 50).toFixed(1)
    : 50;

  // Ridge band width: tight specular sheen at maximum curl, wider when flatter
  const bandHalfWidth = +(10 + sinCurvature * 12).toFixed(1);
  const pStart = Math.max(0, +ridgePos - +bandHalfWidth * 1.5).toFixed(1);
  const pMid = ridgePos;
  const pEnd = Math.min(100, +ridgePos + +bandHalfWidth * 1.5).toFixed(1);

  // Dynamic intensity & opacity based on curvature and lamp settings
  const baseIntensity = isLampActive ? 0.28 + lampIntensity * 0.42 : isNightTheme ? 0.2 : 0.14;
  const spreadLightOpacity = isFlipping
    ? +(0.2 + sinCurvature * 0.55 * (isLampActive ? 1.0 + lampIntensity * 0.35 : 0.85)).toFixed(3)
    : +(isLampActive ? 0.16 + lampIntensity * 0.18 : 0.08).toFixed(3);

  // Ambient radial glow from overhead reading light
  const spreadAmbientOpacity = isLampActive
    ? +(0.35 + lampIntensity * 0.35).toFixed(3)
    : isNightTheme
    ? '0.22'
    : '0.12';

  const spreadAmbientLight = `radial-gradient(ellipse 90% 70% at 50% -10%, rgba(${warmR}, ${warmG}, ${warmB}, ${
    isLampActive ? 0.22 * lampIntensity : 0.09
  }) 0%, transparent 75%)`;

  // Specular gradient reflecting curved paper surface
  const spreadLightGradient = isFlipping
    ? `linear-gradient(${lightAngle}deg, rgba(${warmR}, ${warmG}, ${warmB}, 0.02) 0%, rgba(${warmR}, ${warmG}, ${warmB}, ${+(
        0.1 +
        sinCurvature * 0.22
      ).toFixed(2)}) ${pStart}%, rgba(255, 255, 245, ${+(0.24 + sinCurvature * 0.5).toFixed(
        2
      )}) ${pMid}%, rgba(${warmR}, ${warmG}, ${warmB}, ${+(0.12 + sinCurvature * 0.24).toFixed(
        2
      )}) ${pEnd}%, rgba(${warmR}, ${warmG}, ${warmB}, 0.02) 100%)`
    : `linear-gradient(${lightAngle}deg, rgba(${warmR}, ${warmG}, ${warmB}, ${+(
        0.12 * baseIntensity
      ).toFixed(2)}) 0%, rgba(${warmR}, ${warmG}, ${warmB}, 0.03) 45%, rgba(0, 0, 0, 0.04) 100%)`;

  const spreadLightBlend = isLampActive && lampIntensity > 0.6 ? 'screen' : 'soft-light';

  // Dedicated gradients for the turning leaf front and back
  const leafFrontAngle = flipDirection === 'next'
    ? +(115 + flipProgress * 75).toFixed(1)
    : +(245 - flipProgress * 75).toFixed(1);

  const leafBackAngle = flipDirection === 'next'
    ? +(195 - flipProgress * 65).toFixed(1)
    : +(165 + flipProgress * 65).toFixed(1);

  const leafFrontGradient = `linear-gradient(${leafFrontAngle}deg, rgba(${warmR}, ${warmG}, ${warmB}, 0.04) 0%, rgba(255, 255, 240, ${+(
    0.28 +
    sinCurvature * 0.45
  ).toFixed(2)}) ${ridgePos}%, rgba(${warmR}, ${warmG}, ${warmB}, 0.03) 100%)`;

  const leafBackGradient = `linear-gradient(${leafBackAngle}deg, rgba(${warmR}, ${warmG}, ${warmB}, 0.04) 0%, rgba(255, 255, 240, ${+(
    0.22 +
    sinCurvature * 0.42
  ).toFixed(2)}) ${ridgePos}%, rgba(${warmR}, ${warmG}, ${warmB}, 0.03) 100%)`;

  const leafLightOpacity = +(0.3 + sinCurvature * 0.6).toFixed(3);

  // -------------------------------------------------------------
  // SINGLE-PAGE VIEW (When toggled by user or single page active)
  // -------------------------------------------------------------
  if (isSinglePage) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center p-1.5 sm:p-3 select-none overflow-hidden touch-pan-y transition-transform duration-300 ${
          isMobileRotated ? 'mobile-horizontal-container' : ''
        }`}
      >
        <div
          className="book-spread-light-overlay glass-mobile-page-container relative w-full h-full rounded-2xl border border-white/20 shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col items-center justify-center"
          style={{
            '--spread-light-gradient': spreadLightGradient,
            '--spread-light-opacity': spreadLightOpacity,
            '--spread-light-blend': spreadLightBlend,
            '--spread-ambient-light': spreadAmbientLight,
            '--spread-ambient-opacity': spreadAmbientOpacity,
          } as React.CSSProperties}
        >
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

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.04] via-transparent to-white/[0.06]" />
          </div>

          {/* Left/Right tap zones */}
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

          {/* Floating Mobile Top Glass Badge with Layout Toggle */}
          <div className="absolute top-2.5 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
            <div className="glass-panel px-3 py-1 rounded-full border border-white/10 shadow-lg text-[11px] font-mono text-amber-200/90 pointer-events-auto">
              Page {currentPage} of {book.numPages}
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {onToggleSinglePage && (
                <button
                  onClick={onToggleSinglePage}
                  className="px-2.5 py-1 rounded-full glass-panel border border-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer shadow-md text-xs flex items-center gap-1"
                  title="Switch to 2-Page Left/Right Spread"
                >
                  <Columns2 className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px]">2-Page Spread</span>
                </button>
              )}
              {onToggleRotate && (
                <button
                  onClick={onToggleRotate}
                  className={`p-1.5 rounded-full glass-panel border border-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer shadow-md ${
                    isMobileRotated ? 'text-amber-300 border-amber-400/40 bg-amber-500/20' : ''
                  }`}
                  title="Rotate View"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TWO-PAGE HORIZONTAL SPREAD (LEFT PAGE | SPINE | RIGHT PAGE)
  // Supports Mobile, Tablet, and Desktop with 3D Page Turn
  // -------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden touch-pan-y ${
        isMobileRotated ? 'mobile-horizontal-container' : ''
      }`}
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
        {/* Floating Zoom Reset Pill */}
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
          className="glass-pedestal relative rounded-xl sm:rounded-3xl p-1.5 sm:p-4 transition-all duration-300 flex items-center justify-center shadow-2xl"
          style={{
            width: dimensions.width + (isMobile ? 12 : 36),
            height: dimensions.height + (isMobile ? 12 : 36),
          }}
        >
          {/* Luminous Glass Corner Brackets */}
          <div className="absolute top-1.5 left-1.5 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-white/30 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-1.5 right-1.5 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-white/30 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-1.5 left-1.5 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-white/30 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-white/30 rounded-br-lg pointer-events-none" />

          {/* 3D Stage */}
          <div
            className="book-3d-scene relative transition-all duration-300 flex items-center justify-center"
            style={{
              width: dimensions.width,
              height: dimensions.height,
            }}
          >
            {/* Hardcover Casing Outer Bevel */}
            <div
              className={`absolute -inset-1.5 sm:-inset-4 rounded-xl transition-all duration-500 ${
                settings.theme === 'night'
                  ? 'bg-gradient-to-b from-[#151413] via-[#0d0c0b] to-[#121110] shadow-[0_28px_70px_rgba(0,0,0,0.85)] border border-stone-800/40'
                  : settings.theme === 'sepia'
                  ? 'bg-gradient-to-b from-[#2e231c] via-[#221a14] to-[#1c1510] shadow-[0_28px_60px_rgba(40,25,15,0.4)] border border-[#4a3a2d]/50'
                  : 'bg-gradient-to-b from-[#222120] via-[#1a1918] to-[#121212] shadow-[0_30px_70px_rgba(0,0,0,0.45)] border border-stone-700/50'
              }`}
              style={{
                transform: 'translateZ(-10px)',
              }}
            />

            {/* Stack Edges */}
            <>
              <div
                className={`absolute top-0 bottom-0 left-0 -translate-x-full rounded-l-xs transition-all duration-300 ${
                  settings.theme === 'night' ? 'page-stack-edge-dark' : 'page-stack-edge-left'
                }`}
                style={{
                  width: `${leftStackPx}px`,
                  boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.4), -3px 4px 10px rgba(0,0,0,0.4)',
                }}
              />
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

            {/* Book Body Container with Dynamic Warm Light Curved-Paper Pseudo-Element Overlay */}
            <div
              className="book-spread-light-overlay relative w-full h-full flex rounded-sm overflow-hidden"
              style={{
                boxShadow:
                  settings.theme === 'night'
                    ? '0 15px 35px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.4)'
                    : '0 15px 35px rgba(0,0,0,0.25), inset 0 0 15px rgba(0,0,0,0.08)',
                '--spread-light-gradient': spreadLightGradient,
                '--spread-light-opacity': spreadLightOpacity,
                '--spread-light-blend': spreadLightBlend,
                '--spread-ambient-light': spreadAmbientLight,
                '--spread-ambient-opacity': spreadAmbientOpacity,
              } as React.CSSProperties}
            >
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

                  {/* Left Spine Gutter Shadow */}
                  <div className="spine-gutter-left absolute top-0 right-0 bottom-0 w-6 sm:w-16 pointer-events-none" />
                  <div className="absolute top-0 left-0 bottom-0 w-2 sm:w-3 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                </div>

                {/* CENTER SPINE GUTTER */}
                <div
                  className={`relative h-full shrink-0 spine-crease z-20 pointer-events-none flex items-center justify-center overflow-hidden ${spineAnimationClass} ${
                    isMobile && isPortrait && !isMobileRotated ? 'spine-crease-portrait-glow' : ''
                  }`}
                  style={{
                    width: `${spineWidth}px`,
                    '--spine-brightness': spineBrightness.toFixed(3),
                    '--spine-contrast': spineContrast.toFixed(3),
                    '--spine-secondary-shadow': spineSecondaryShadow,
                    boxShadow: isFlipping
                      ? `${spineSecondaryShadow}, 0 0 ${Math.round(10 + spineSin * 14)}px rgba(0, 0, 0, ${(0.6 + spineSin * 0.28).toFixed(2)}), inset 0 0 ${Math.round(7 + spineSin * 7)}px rgba(0, 0, 0, ${(0.55 + spineSin * 0.23).toFixed(2)})`
                      : undefined,
                    transform: isFlipping
                      ? `perspective(800px) translateZ(${spineZ}px) rotateY(${spineTilt}deg)`
                      : 'translateZ(0px)',
                  } as React.CSSProperties}
                >
                  {/* Mobile portrait vertical glow along entire length of the spine crease */}
                  {isMobile && isPortrait && !isMobileRotated && (
                    <div
                      className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] pointer-events-none z-30"
                      style={{
                        background:
                          'linear-gradient(to bottom, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.45) 20%, rgba(253, 230, 138, 0.72) 50%, rgba(251, 191, 36, 0.45) 80%, rgba(251, 191, 36, 0.08) 100%)',
                        boxShadow:
                          '0 0 8px rgba(251, 191, 36, 0.45), 0 0 16px rgba(245, 158, 11, 0.28), 0 0 24px rgba(217, 119, 6, 0.16)',
                        filter: 'blur(0.6px)',
                        mixBlendMode: 'screen',
                      }}
                    />
                  )}

                  {isFlipping && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-100"
                      style={{
                        background: `linear-gradient(to right, rgba(0,0,0,${0.35 + spineSin * 0.25}) 0%, rgba(255,255,255,${0.18 * spineSin}) ${highlightPercent}%, rgba(0,0,0,${0.45 + spineSin * 0.25}) 100%)`,
                        opacity: spineSin,
                      }}
                    />
                  )}

                  {/* Stitched binding threads */}
                  <div
                    className="flex flex-col justify-around h-full py-2 sm:py-6 transition-all duration-150"
                    style={{
                      opacity: isFlipping ? 0.45 : 0.3,
                      transform: isFlipping ? `scaleY(${1 + spineSin * 0.06})` : 'scaleY(1)',
                    }}
                  >
                    <div className="w-0.5 sm:w-1 h-1.5 sm:h-3 bg-amber-200/40 rounded-full" />
                    <div className="w-0.5 sm:w-1 h-1.5 sm:h-3 bg-amber-200/40 rounded-full" />
                    <div className="w-0.5 sm:w-1 h-1.5 sm:h-3 bg-amber-200/40 rounded-full" />
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

                  {/* Right Spine Gutter Shadow */}
                  <div className="spine-gutter-right absolute top-0 left-0 bottom-0 w-6 sm:w-16 pointer-events-none z-20" />
                  <div className="absolute top-0 right-0 bottom-0 w-2 sm:w-3 bg-gradient-to-l from-black/15 to-transparent pointer-events-none z-20" />
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
                              ? `${-20 * Math.sin(flipProgress * Math.PI)}px 10px 30px rgba(0,0,0,0.6)`
                              : 'none',
                        }}
                      >
                        <div
                          className="book-spread-light-overlay absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{
                            transform: 'rotateY(0deg)',
                            '--spread-light-gradient': leafFrontGradient,
                            '--spread-light-opacity': leafLightOpacity,
                            '--spread-light-blend': spreadLightBlend,
                          } as React.CSSProperties}
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
                          className="book-spread-light-overlay absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{
                            transform: 'rotateY(180deg)',
                            '--spread-light-gradient': leafBackGradient,
                            '--spread-light-opacity': leafLightOpacity,
                            '--spread-light-blend': spreadLightBlend,
                          } as React.CSSProperties}
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
                              ? `${20 * Math.sin(flipProgress * Math.PI)}px 10px 30px rgba(0,0,0,0.6)`
                              : 'none',
                        }}
                      >
                        <div
                          className="book-spread-light-overlay absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{
                            transform: 'rotateY(0deg)',
                            '--spread-light-gradient': leafFrontGradient,
                            '--spread-light-opacity': leafLightOpacity,
                            '--spread-light-blend': spreadLightBlend,
                          } as React.CSSProperties}
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
                          className="book-spread-light-overlay absolute inset-0 w-full h-full backface-hidden overflow-hidden"
                          style={{
                            transform: 'rotateY(180deg)',
                            '--spread-light-gradient': leafBackGradient,
                            '--spread-light-opacity': leafLightOpacity,
                            '--spread-light-blend': spreadLightBlend,
                          } as React.CSSProperties}
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
