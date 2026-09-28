import * as pdfjsLib from 'pdfjs-dist';
import { BookDocument } from '../types';

// Set up worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker initialization:', e);
}

export interface RenderedPageResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  aspectRatio: number;
}

class PdfService {
  private pageRenderCache = new Map<string, HTMLCanvasElement>();
  private activeRenderTasks = new Map<string, any>();

  /**
   * Load PDF file locally from File or Blob or ArrayBuffer
   */
  async loadPdfFile(file: File): Promise<BookDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;
    let title = file.name.replace(/\.[^/.]+$/, '');

    try {
      const metadata = await pdfDoc.getMetadata();
      const info = metadata?.info as Record<string, any> | undefined;
      if (info?.Title && typeof info.Title === 'string' && info.Title.trim().length > 0) {
        title = info.Title.trim();
      }
    } catch {
      // Keep filename
    }

    // Clear previous render cache to free memory
    this.clearCache();

    return {
      id: `pdf-${file.name}-${file.size}-${file.lastModified}`,
      title,
      numPages: pdfDoc.numPages,
      fileSize: file.size,
      pdfDoc,
      isSample: false,
    };
  }

  /**
   * Render a specific page to an HTML Canvas with True Full-HD Vector Crispness
   */
  async renderPage(
    pdfDoc: any,
    pageNum: number,
    targetWidth: number,
    targetHeight: number,
    zoomFactor: number = 1.0
  ): Promise<RenderedPageResult | null> {
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) {
      return null;
    }

    // Calculate High-DPI target resolution for razor-sharp, Full-HD crystal legibility
    const dpr = Math.max(window.devicePixelRatio || 2, 2.5);
    const effectiveZoom = Math.max(1, zoomFactor);
    // Ensure at least 1800px width for vector text rendering so small text is 100% crisp
    const renderPixelWidth = Math.max(Math.round(targetWidth * dpr * effectiveZoom), 1800);
    
    // Cache key incorporates page and render quality tier
    const cacheKey = `p_${pageNum}_w${Math.round(renderPixelWidth / 200) * 200}`;

    const cached = this.pageRenderCache.get(cacheKey);
    if (cached) {
      return {
        canvas: cached,
        width: targetWidth,
        height: targetHeight,
        aspectRatio: cached.width / cached.height,
      };
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const pageAspectRatio = unscaledViewport.width / unscaledViewport.height;

      // Fit page into target box while preserving exact aspect ratio
      let fitWidth = targetWidth;
      let fitHeight = targetWidth / pageAspectRatio;
      if (fitHeight > targetHeight) {
        fitHeight = targetHeight;
        fitWidth = targetHeight * pageAspectRatio;
      }

      // Compute render scale based on Full-HD target pixel width
      const renderScale = renderPixelWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return null;

      // High quality rendering settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Crisp paper background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      // Cancel any ongoing render task for this page key
      if (this.activeRenderTasks.has(cacheKey)) {
        try {
          this.activeRenderTasks.get(cacheKey).cancel();
        } catch {
          // Ignore
        }
      }

      const task = page.render(renderContext);
      this.activeRenderTasks.set(cacheKey, task);
      await task.promise;
      this.activeRenderTasks.delete(cacheKey);

      // Keep cache bounded to prevent memory bloat on large documents
      if (this.pageRenderCache.size > 16) {
        const firstKey = this.pageRenderCache.keys().next().value;
        if (firstKey) this.pageRenderCache.delete(firstKey);
      }

      this.pageRenderCache.set(cacheKey, canvas);

      return {
        canvas,
        width: fitWidth,
        height: fitHeight,
        aspectRatio: pageAspectRatio,
      };
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        return null;
      }
      console.error(`Error rendering page ${pageNum}:`, err);
      return null;
    }
  }

  public clearCache(): void {
    this.pageRenderCache.clear();
    this.activeRenderTasks.forEach((task) => {
      try {
        task.cancel();
      } catch {
        // Ignore
      }
    });
    this.activeRenderTasks.clear();
  }
}

export const pdfService = new PdfService();
