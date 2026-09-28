import React, { useEffect, useRef, useState } from 'react';
import { BookDocument, DocumentPageContent } from '../types';
import { pdfService } from '../services/pdfService';
import { SAMPLE_PAGES, SamplePageContent } from '../services/sampleBook';
import { Presentation, FileText, Book, Image as ImageIcon } from 'lucide-react';

interface PageRendererProps {
  book: BookDocument;
  pageNum: number | null;
  side: 'left' | 'right';
  targetWidth: number;
  targetHeight: number;
  theme: 'night' | 'day' | 'sepia';
  onClick?: () => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  book,
  pageNum,
  side,
  targetWidth,
  targetHeight,
  theme,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Render PDF Canvas onto local canvas without DOM stealing
  useEffect(() => {
    if (!book.pdfDoc || pageNum === null) return;

    let isCancelled = false;
    setLoading(true);
    setError(null);

    const render = async () => {
      try {
        const result = await pdfService.renderPage(
          book.pdfDoc,
          pageNum,
          targetWidth,
          targetHeight
        );

        if (isCancelled) return;

        if (result && canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = result.canvas.width;
          canvas.height = result.canvas.height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(result.canvas, 0, 0);
          }
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Could not render page');
          setLoading(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [book.pdfDoc, pageNum, targetWidth, targetHeight]);

  // If pageNum is null, this is an authentic blank flyleaf/endpaper
  if (pageNum === null) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-8 select-none transition-colors duration-300 ${
          theme === 'night'
            ? 'bg-[#181614] text-stone-600'
            : theme === 'sepia'
            ? 'bg-[#f4ede1] text-amber-900/40'
            : 'bg-[#faf7f2] text-stone-300'
        }`}
      >
        <div className="w-12 h-12 rounded-full border border-current opacity-20 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-current opacity-30" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MULTI-FORMAT DOCUMENT PAGES (PPTX, DOCX, EPUB, TXT, IMAGES)
  // -------------------------------------------------------------
  if (book.pagesData && book.pagesData[pageNum]) {
    const pageData: DocumentPageContent = book.pagesData[pageNum];

    // THEME-BASED STYLING
    const themeBg =
      theme === 'night'
        ? 'bg-[#181715] text-stone-200'
        : theme === 'sepia'
        ? 'bg-[#f6efe4] text-[#2c221a]'
        : 'bg-[#faf8f4] text-[#1e1c19]';

    // Slide presentation layout (PPT / PPTX)
    if (pageData.type === 'slide') {
      return (
        <div
          onClick={onClick}
          className={`w-full h-full flex flex-col justify-between p-6 sm:p-10 select-none cursor-pointer transition-colors duration-300 overflow-hidden ${themeBg}`}
        >
          {/* Slide Top Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Presentation className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[11px] font-mono tracking-wider text-stone-400 truncate max-w-[200px]">
                {book.title}
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-300/90">
              Slide {pageNum}
            </span>
          </div>

          {/* Slide Main Body Content */}
          <div className="my-auto py-4 flex flex-col gap-4">
            {pageData.title && (
              <div>
                <h2 className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-stone-100 mb-1">
                  {pageData.title}
                </h2>
                {pageData.subtitle && (
                  <p className="text-xs sm:text-sm font-serif italic text-stone-400">
                    {pageData.subtitle}
                  </p>
                )}
                <div className="w-16 h-0.5 bg-gradient-to-r from-amber-500 to-transparent mt-2" />
              </div>
            )}

            {/* Bullet Points */}
            {pageData.bullets && pageData.bullets.length > 0 && (
              <ul className="space-y-2.5 sm:space-y-3.5 my-2">
                {pageData.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed">
                    <span className="w-2 h-2 rounded-full bg-amber-500/80 mt-1.5 shrink-0 shadow-xs shadow-amber-500/50" />
                    <span className="text-stone-300">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Additional Text Blocks */}
            {pageData.textBlocks && pageData.textBlocks.length > 0 && (
              <div className="space-y-2">
                {pageData.textBlocks.map((tb, idx) => (
                  <p key={idx} className="text-xs sm:text-sm leading-relaxed text-stone-300">
                    {tb}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Slide Footer */}
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-400/80 border-t border-stone-500/15 pt-2">
            <span>PowerPoint Presentation</span>
            <span>Slide {pageNum} of {book.numPages}</span>
          </div>
        </div>
      );
    }

    // Cover page layout
    if (pageData.type === 'cover') {
      const getFormatIcon = () => {
        if (book.format === 'pptx') return <Presentation className="w-8 h-8 text-amber-400" />;
        if (book.format === 'docx') return <FileText className="w-8 h-8 text-blue-400" />;
        if (book.format === 'epub') return <Book className="w-8 h-8 text-emerald-400" />;
        return <FileText className="w-8 h-8 text-amber-400" />;
      };

      return (
        <div
          onClick={onClick}
          className={`w-full h-full flex flex-col justify-between p-8 sm:p-14 select-none cursor-pointer text-center transition-colors duration-300 ${themeBg}`}
        >
          <div className="flex justify-center pt-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-mono px-3 py-1 rounded-full border border-stone-500/20 text-stone-400">
              {book.format?.toUpperCase() || 'DOCUMENT'}
            </span>
          </div>

          <div className="my-auto flex flex-col items-center gap-5 sm:gap-7">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl">
              {getFormatIcon()}
            </div>

            <div className="max-w-md">
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-stone-100 leading-tight mb-3">
                {pageData.title || book.title}
              </h1>
              {pageData.subtitle && (
                <p className="font-serif italic text-xs sm:text-sm text-stone-400">
                  {pageData.subtitle}
                </p>
              )}
            </div>

            <div className="w-12 h-0.5 bg-amber-500/40" />

            <div className="text-[11px] font-mono text-stone-400">
              {book.numPages} Pages · High Definition
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-t border-stone-500/10 pt-2">
            <span>BookGlass</span>
            <span>Page 1</span>
          </div>
        </div>
      );
    }

    // Image page layout
    if (pageData.type === 'image' && pageData.imageUrl) {
      return (
        <div
          onClick={onClick}
          className={`w-full h-full flex items-center justify-center p-2 sm:p-4 select-none cursor-pointer overflow-hidden ${themeBg}`}
        >
          <img
            src={pageData.imageUrl}
            alt={pageData.title || 'Page'}
            className="w-full h-full object-contain rounded-lg shadow-md select-none"
          />
        </div>
      );
    }

    // Text / Article / DOCX / EPUB page layout
    return (
      <div
        onClick={onClick}
        className={`w-full h-full flex flex-col justify-between p-6 sm:p-10 select-none cursor-pointer transition-colors duration-300 overflow-hidden ${themeBg}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-500/15 pb-2 text-[10px] uppercase tracking-wider font-mono text-stone-400">
          <span className="truncate max-w-[200px]">{book.title}</span>
          <span>Folio {pageNum}</span>
        </div>

        {/* Content */}
        <div className="my-auto py-3 space-y-3 overflow-hidden text-xs sm:text-sm leading-relaxed font-serif">
          {pageData.title && (
            <h2 className="font-serif text-base sm:text-xl font-bold text-stone-100 border-b border-stone-500/10 pb-1.5 mb-2">
              {pageData.title}
            </h2>
          )}

          {pageData.htmlContent ? (
            <div
              className="prose prose-invert prose-stone max-w-none text-xs sm:text-sm leading-relaxed space-y-2.5 font-serif first-letter:text-2xl sm:first-letter:text-3xl first-letter:font-serif first-letter:float-left first-letter:mr-2"
              dangerouslySetInnerHTML={{ __html: pageData.htmlContent }}
            />
          ) : (
            pageData.textBlocks?.map((paragraph, idx) => (
              <p
                key={idx}
                className={idx === 0 ? 'first-letter:text-2xl sm:first-letter:text-3xl first-letter:font-serif first-letter:float-left first-letter:mr-2 text-stone-200' : 'text-stone-300'}
              >
                {paragraph}
              </p>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] font-serif text-stone-400 border-t border-stone-500/10 pt-1.5">
          <span>{side === 'left' ? pageNum : ''}</span>
          <span className="text-[9px] tracking-widest uppercase font-mono text-stone-500">
            BookGlass
          </span>
          <span>{side === 'right' ? pageNum : ''}</span>
        </div>
      </div>
    );
  }

  // Handle built-in sample book editorial pages
  if (book.isSample) {
    const pageData: SamplePageContent | undefined = SAMPLE_PAGES.find(
      (p) => p.pageNumber === pageNum
    );

    return (
      <div
        onClick={onClick}
        className={`w-full h-full flex flex-col justify-between p-6 sm:p-10 select-none cursor-pointer transition-colors duration-300 ${
          theme === 'night'
            ? 'bg-[#1c1b18] text-stone-200'
            : theme === 'sepia'
            ? 'bg-[#f6efe4] text-[#2c221a]'
            : 'bg-[#faf8f4] text-[#1e1c19]'
        }`}
        style={{
          boxSizing: 'border-box',
        }}
      >
        {pageData ? (
          <div className="flex flex-col h-full justify-between">
            {/* Top header row */}
            <div className="flex items-center justify-between border-b border-stone-500/15 pb-2.5">
              <span className="text-[10px] tracking-[0.2em] uppercase font-sans text-stone-400">
                {pageData.chapter || book.title}
              </span>
              <span className="text-xs font-serif italic text-stone-400">
                {side === 'left' ? '§ Folio Left' : '§ Folio Right'}
              </span>
            </div>

            {/* Page Body Content */}
            <div className="my-auto py-3 flex flex-col gap-3 sm:gap-4">
              {pageData.type === 'cover' && (
                <div className="text-center py-8 sm:py-12 flex flex-col items-center justify-center gap-4 sm:gap-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-stone-500/30 flex items-center justify-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-amber-600/40" />
                  </div>
                  <div>
                    <h1 className="font-serif text-xl sm:text-3xl font-medium tracking-wide leading-tight mb-2">
                      {pageData.title}
                    </h1>
                    <p className="text-xs sm:text-sm font-serif italic text-stone-400 max-w-xs mx-auto">
                      {pageData.subtitle}
                    </p>
                  </div>
                  <div className="w-12 h-[1px] bg-stone-500/30 my-1" />
                  <div className="text-[10px] sm:text-[11px] font-sans tracking-widest uppercase text-stone-400">
                    {pageData.body?.join(' • ')}
                  </div>
                </div>
              )}

              {pageData.type !== 'cover' && (
                <>
                  {pageData.title && (
                    <div>
                      <h2 className="font-serif text-base sm:text-xl font-medium tracking-normal mb-1">
                        {pageData.title}
                      </h2>
                      {pageData.subtitle && (
                        <p className="text-[11px] sm:text-xs font-serif italic text-stone-400">
                          {pageData.subtitle}
                        </p>
                      )}
                    </div>
                  )}

                  {pageData.body?.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className={`text-xs sm:text-sm font-serif leading-relaxed text-justify ${
                        idx === 0 && pageData.type === 'editorial'
                          ? 'first-letter:text-2xl sm:first-letter:text-4xl first-letter:font-serif first-letter:font-semibold first-letter:float-left first-letter:mr-2.5 first-letter:leading-none text-stone-800 dark:text-stone-100'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))}

                  {pageData.quote && (
                    <blockquote className="my-2 border-l-2 border-amber-500/40 pl-3 py-1 italic font-serif text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                      "{pageData.quote.text}"
                      <footer className="text-[9px] sm:text-[10px] not-italic tracking-wider uppercase font-sans text-stone-400 mt-1">
                        — {pageData.quote.author}
                      </footer>
                    </blockquote>
                  )}
                </>
              )}
            </div>

            {/* Bottom folio number */}
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-serif text-stone-400 border-t border-stone-500/10 pt-1.5">
              <span>{side === 'left' ? pageNum : ''}</span>
              <span className="text-[9px] tracking-widest uppercase font-sans text-stone-400/60">
                BookGlass
              </span>
              <span>{side === 'right' ? pageNum : ''}</span>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Render for PDF with dedicated High-DPI canvas
  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer transition-colors duration-300 ${
        theme === 'night'
          ? 'bg-[#181715]'
          : theme === 'sepia'
          ? 'bg-[#f7f1e6]'
          : 'bg-[#faf8f5]'
      }`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/10 backdrop-blur-xs z-10 text-stone-400 text-xs">
          <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="font-serif italic">Loading page {pageNum}...</span>
        </div>
      )}

      {error && (
        <div className="text-center p-6 text-stone-500 text-xs font-serif">
          {error}
        </div>
      )}

      {/* The rendered PDF page canvas - crisp, Full-HD vector scaling */}
      <div className="w-full h-full flex items-center justify-center p-0.5 sm:p-1.5">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain select-none"
          style={{
            imageRendering: 'auto',
          }}
        />
      </div>

      {/* Subtle page number imprint at footer for real book feeling */}
      <div
        className={`absolute bottom-2 ${
          side === 'left' ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
        } text-[10px] font-serif tracking-widest select-none pointer-events-none ${
          theme === 'night' ? 'text-stone-400' : 'text-stone-500'
        }`}
      >
        {pageNum}
      </div>
    </div>
  );
};

export default PageRenderer;
