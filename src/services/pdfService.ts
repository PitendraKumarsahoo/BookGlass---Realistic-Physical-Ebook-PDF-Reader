import * as pdfjsLib from 'pdfjs-dist';
import { BookDocument } from '../types';

// Set up PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker initialization:', e);
}

export type CanvasBufferType = OffscreenCanvas | HTMLCanvasElement;

export interface OffscreenPageBuffer {
  pageNum: number;
  buffer: CanvasBufferType;
  width: number;
  height: number;
  aspectRatio: number;
  scale: number;
  timestamp: number;
}

export interface RenderedPageResult {
  canvas: CanvasBufferType;
  width: number;
  height: number;
  aspectRatio: number;
  fromCache?: boolean;
}

class PdfService {
  // High-Resolution Offscreen Canvas Buffer Cache
  private offscreenBufferPool = new Map<number, OffscreenPageBuffer>();
  private activeRenderTasks = new Map<number, any>();
  private prefetchQueue: number[] = [];
  private isProcessingQueue = false;
  private currentDocId: string | null = null;

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
      // Retain fallback title
    }

    const docId = `pdf-${file.name}-${file.size}-${file.lastModified}`;
    if (this.currentDocId !== docId) {
      this.clearCache();
      this.currentDocId = docId;
    }

    return {
      id: docId,
      title,
      numPages: pdfDoc.numPages,
      fileSize: file.size,
      format: 'pdf',
      pdfDoc,
      isSample: false,
    };
  }

  /**
   * Synchronously checks if a pre-rendered offscreen buffer already exists for this page.
   * Enables 0ms instantaneous display during transitions.
   */
  getCachedBuffer(pageNum: number): OffscreenPageBuffer | null {
    const existing = this.offscreenBufferPool.get(pageNum);
    if (existing) {
      existing.timestamp = Date.now();
      return existing;
    }
    return null;
  }

  /**
   * Creates an offscreen canvas buffer using native OffscreenCanvas if supported,
   * falling back cleanly to detached HTMLCanvasElement.
   */
  private createOffscreenBuffer(width: number, height: number): CanvasBufferType {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        return new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
      } catch {
        // Fallback if browser security or context restricts OffscreenCanvas
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    return canvas;
  }

  /**
   * Render a page directly into a High-Resolution Offscreen Canvas Buffer at 2x Scale
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

    // 1. Check if High-Resolution Offscreen Buffer is already pre-rendered
    const cached = this.getCachedBuffer(pageNum);
    if (cached) {
      // Trigger background pre-rendering of upcoming pages
      this.preRenderUpcomingPages(pdfDoc, pageNum, targetWidth, targetHeight);
      return {
        canvas: cached.buffer,
        width: targetWidth,
        height: targetHeight,
        aspectRatio: cached.aspectRatio,
        fromCache: true,
      };
    }

    // 2. Perform High-Resolution Offscreen Rendering
    try {
      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const pageAspectRatio = unscaledViewport.width / unscaledViewport.height;

      // Fit page into target box preserving exact aspect ratio
      let fitWidth = targetWidth;
      let fitHeight = targetWidth / pageAspectRatio;
      if (fitHeight > targetHeight) {
        fitHeight = targetHeight;
        fitWidth = targetHeight * pageAspectRatio;
      }

      // Pre-render at 2x scale (or devicePixelRatio, whichever is higher) for 100% vector sharpness
      const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const targetScaleMultiplier = Math.max(2.0, deviceDpr * 1.25) * Math.max(1, zoomFactor);

      const renderPixelWidth = Math.max(Math.round(fitWidth * targetScaleMultiplier), 960);
      const renderScale = renderPixelWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: renderScale });

      const bufferWidth = Math.round(viewport.width);
      const bufferHeight = Math.round(viewport.height);

      // Instantiate offscreen buffer
      const offscreenBuffer = this.createOffscreenBuffer(bufferWidth, bufferHeight);
      const ctx = offscreenBuffer.getContext('2d', {
        alpha: false,
        willReadFrequently: false,
      }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (!ctx) return null;

      // High quality vector text rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Solid background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, bufferWidth, bufferHeight);

      // Cancel previous task on this page if running
      if (this.activeRenderTasks.has(pageNum)) {
        try {
          this.activeRenderTasks.get(pageNum).cancel();
        } catch {
          // Ignore
        }
      }

      const renderContext = {
        canvasContext: ctx as any,
        viewport,
        intent: 'display',
      };

      const task = page.render(renderContext);
      this.activeRenderTasks.set(pageNum, task);
      await task.promise;
      this.activeRenderTasks.delete(pageNum);

      // Store in Offscreen Buffer Pool with LRU bounding
      this.storeInBufferPool(pageNum, {
        pageNum,
        buffer: offscreenBuffer,
        width: fitWidth,
        height: fitHeight,
        aspectRatio: pageAspectRatio,
        scale: targetScaleMultiplier,
        timestamp: Date.now(),
      });

      // Proactively pre-render upcoming pages at 2x scale in background
      this.preRenderUpcomingPages(pdfDoc, pageNum, targetWidth, targetHeight);

      return {
        canvas: offscreenBuffer,
        width: fitWidth,
        height: fitHeight,
        aspectRatio: pageAspectRatio,
        fromCache: false,
      };
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        return null;
      }
      console.error(`Error rendering page ${pageNum}:`, err);
      return null;
    }
  }

  /**
   * Stores rendered offscreen page buffer into cache with LRU eviction
   */
  private storeInBufferPool(pageNum: number, entry: OffscreenPageBuffer): void {
    // Max 28 pages in buffer pool to prevent memory bloat while covering all upcoming spreads
    if (this.offscreenBufferPool.size >= 28) {
      let oldestKey: number | null = null;
      let oldestTime = Infinity;

      for (const [key, item] of this.offscreenBufferPool.entries()) {
        if (item.timestamp < oldestTime) {
          oldestTime = item.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey !== null) {
        this.offscreenBufferPool.delete(oldestKey);
      }
    }

    this.offscreenBufferPool.set(pageNum, entry);
  }

  /**
   * Proactively pre-renders upcoming pages into offscreen buffers at 2x scale.
   * Prioritizes immediate next/prev spread pages to ensure zero-latency transitions.
   */
  public preRenderUpcomingPages(
    pdfDoc: any,
    currentPage: number,
    targetWidth: number,
    targetHeight: number,
    count: number = 6
  ): void {
    if (!pdfDoc) return;

    // Build prioritized list: immediate next spread, previous spread, following spreads
    const candidates: number[] = [];
    for (let offset = 1; offset <= count; offset++) {
      const nextP = currentPage + offset;
      const prevP = currentPage - offset;

      if (nextP <= pdfDoc.numPages && !this.offscreenBufferPool.has(nextP)) {
        candidates.push(nextP);
      }
      if (prevP >= 1 && !this.offscreenBufferPool.has(prevP)) {
        candidates.push(prevP);
      }
    }

    // Add unique candidates to queue
    for (const p of candidates) {
      if (!this.prefetchQueue.includes(p)) {
        this.prefetchQueue.push(p);
      }
    }

    if (!this.isProcessingQueue) {
      this.processPrefetchQueue(pdfDoc, targetWidth, targetHeight);
    }
  }

  /**
   * Sequential background offscreen pre-rendering during idle frames
   */
  private async processPrefetchQueue(
    pdfDoc: any,
    targetWidth: number,
    targetHeight: number
  ): Promise<void> {
    if (this.prefetchQueue.length === 0 || !pdfDoc) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const pageNum = this.prefetchQueue.shift();

    if (pageNum && !this.offscreenBufferPool.has(pageNum)) {
      try {
        await this.renderPage(pdfDoc, pageNum, targetWidth, targetHeight, 1.0);
      } catch {
        // Ignore prefetch error
      }
    }

    // Continue processing during next idle opportunity
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => this.processPrefetchQueue(pdfDoc, targetWidth, targetHeight),
        { timeout: 800 }
      );
    } else {
      setTimeout(() => this.processPrefetchQueue(pdfDoc, targetWidth, targetHeight), 100);
    }
  }

  private thumbnailCache = new Map<number, string>();

  /**
   * Fast rendering of small page thumbnails for the thumbnail drawer
   */
  async renderThumbnail(
    pdfDoc: any,
    pageNum: number,
    width = 90,
    height = 125
  ): Promise<string | null> {
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return null;

    if (this.thumbnailCache.has(pageNum)) {
      return this.thumbnailCache.get(pageNum)!;
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = width / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      this.thumbnailCache.set(pageNum, dataUrl);
      return dataUrl;
    } catch {
      return null;
    }
  }

  /**
   * Clear all active tasks and offscreen buffers
   */
  public clearCache(): void {
    this.offscreenBufferPool.clear();
    this.thumbnailCache.clear();
    this.activeRenderTasks.forEach((task) => {
      try {
        task.cancel();
      } catch {
        // Ignore
      }
    });
    this.activeRenderTasks.clear();
    this.prefetchQueue = [];
    this.isProcessingQueue = false;
  }
}

export const pdfService = new PdfService();
