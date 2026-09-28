import JSZip from 'jszip';
import mammoth from 'mammoth';
import { BookDocument, DocumentFormat, DocumentPageContent } from '../types';
import { pdfService } from './pdfService';

export class DocumentParserService {
  /**
   * Determine document format from file name and mime type
   */
  detectFormat(file: File): DocumentFormat {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'pptx' || ext === 'ppt') return 'pptx';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'epub') return 'epub';
    if (['txt', 'md', 'markdown', 'json', 'csv', 'rtf'].includes(ext)) return 'txt';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
    return 'txt';
  }

  /**
   * Main unified entry point: Parse any document file into BookDocument
   */
  async loadDocument(file: File): Promise<BookDocument> {
    const format = this.detectFormat(file);

    switch (format) {
      case 'pdf': {
        const book = await pdfService.loadPdfFile(file);
        book.format = 'pdf';
        return book;
      }
      case 'pptx':
        return this.parsePptx(file);
      case 'docx':
        return this.parseDocx(file);
      case 'epub':
        return this.parseEpub(file);
      case 'image':
        return this.parseImage(file);
      case 'txt':
      default:
        return this.parsePlainText(file);
    }
  }

  /**
   * Parse PowerPoint (.pptx) presentation
   */
  private async parsePptx(file: File): Promise<BookDocument> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    // Find all slide XML files
    const slideFiles: string[] = [];
    contents.forEach((relativePath) => {
      if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
        slideFiles.push(relativePath);
      }
    });

    // Sort slides numerically: slide1.xml, slide2.xml, slide10.xml
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      return numA - numB;
    });

    // If no slide files found, create a fallback slide
    if (slideFiles.length === 0) {
      return this.createFallbackDoc(file, 'pptx', 'Empty PowerPoint Presentation', [
        'No slides could be extracted from this presentation.',
      ]);
    }

    const pagesData: Record<number, DocumentPageContent> = {};
    const parser = new DOMParser();

    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const xmlStr = await contents.file(slidePath)?.async('text');
      const pageNum = i + 1;

      if (!xmlStr) {
        pagesData[pageNum] = {
          pageNum,
          title: `Slide ${pageNum}`,
          type: 'slide',
          textBlocks: ['[Empty Slide]'],
        };
        continue;
      }

      const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

      // Extract all text paragraphs (<a:p>)
      const paragraphNodes = Array.from(xmlDoc.getElementsByTagName('a:p'));
      const textParagraphs: string[] = [];

      for (const p of paragraphNodes) {
        const textRuns = Array.from(p.getElementsByTagName('a:t'));
        const paragraphText = textRuns.map((t) => t.textContent?.trim() || '').join(' ').trim();
        if (paragraphText) {
          textParagraphs.push(paragraphText);
        }
      }

      // Title detection: first non-empty paragraph or Slide N
      let title = `Slide ${pageNum}`;
      let subtitle: string | undefined = undefined;
      const bullets: string[] = [];
      const textBlocks: string[] = [];

      if (textParagraphs.length > 0) {
        title = textParagraphs[0];
        if (textParagraphs.length > 1 && textParagraphs[1].length < 120 && i === 0) {
          subtitle = textParagraphs[1];
          bullets.push(...textParagraphs.slice(2));
        } else {
          bullets.push(...textParagraphs.slice(1));
        }
      }

      // If slide 1 has few words, treat as Title Cover
      const isCover = pageNum === 1;

      pagesData[pageNum] = {
        pageNum,
        title,
        subtitle,
        type: isCover ? 'cover' : 'slide',
        bullets: bullets.length > 0 ? bullets : undefined,
        textBlocks: textBlocks.length > 0 ? textBlocks : undefined,
      };
    }

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      numPages: slideFiles.length,
      fileSize: file.size,
      format: 'pptx',
      pagesData,
    };
  }

  /**
   * Parse Microsoft Word (.docx) Document
   */
  private async parseDocx(file: File): Promise<BookDocument> {
    const arrayBuffer = await file.arrayBuffer();
    let rawHtml = '';

    try {
      const result = await mammoth.convertToHtml({ arrayBuffer });
      rawHtml = result.value;
    } catch {
      // Fallback: Extract document.xml via JSZip
      const zip = new JSZip();
      const zipDoc = await zip.loadAsync(arrayBuffer);
      const xmlStr = await zipDoc.file('word/document.xml')?.async('text');
      if (xmlStr) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
        const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
        rawHtml = paragraphs
          .map((p) => {
            const texts = Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent || '');
            return `<p>${texts.join('')}</p>`;
          })
          .filter((p) => p !== '<p></p>')
          .join('\n');
      }
    }

    if (!rawHtml.trim()) {
      return this.createFallbackDoc(file, 'docx', 'Word Document', [
        'The document contains no readable text.',
      ]);
    }

    // Split HTML into pages (approx 260 words per page or by headers)
    const pages = this.paginateHtml(rawHtml, file.name.replace(/\.[^/.]+$/, ''));

    const pagesData: Record<number, DocumentPageContent> = {};
    pages.forEach((p, idx) => {
      pagesData[idx + 1] = {
        pageNum: idx + 1,
        title: p.title || (idx === 0 ? file.name.replace(/\.[^/.]+$/, '') : undefined),
        htmlContent: p.html,
        type: idx === 0 ? 'cover' : 'article',
      };
    });

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      numPages: pages.length,
      fileSize: file.size,
      format: 'docx',
      pagesData,
    };
  }

  /**
   * Parse EPUB E-Book
   */
  private async parseEpub(file: File): Promise<BookDocument> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    // Locate container.xml to find .opf file
    const containerXml = await contents.file('META-INF/container.xml')?.async('text');
    let opfPath = 'content.opf';

    if (containerXml) {
      const match = containerXml.match(/full-path="([^"]+)"/i);
      if (match && match[1]) {
        opfPath = match[1];
      }
    }

    const opfFolder = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
    const opfXml = await contents.file(opfPath)?.async('text');

    const htmlFiles: string[] = [];
    let bookTitle = file.name.replace(/\.[^/.]+$/, '');

    if (opfXml) {
      const parser = new DOMParser();
      const opfDoc = parser.parseFromString(opfXml, 'application/xml');

      // Title
      const titleEl = opfDoc.getElementsByTagName('dc:title')[0];
      if (titleEl && titleEl.textContent) {
        bookTitle = titleEl.textContent.trim();
      }

      // Manifest items
      const manifestItems = Array.from(opfDoc.getElementsByTagName('item'));
      const idToHref: Record<string, string> = {};
      manifestItems.forEach((item) => {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        if (id && href) idToHref[id] = href;
      });

      // Spine order
      const itemrefs = Array.from(opfDoc.getElementsByTagName('itemref'));
      itemrefs.forEach((ref) => {
        const idref = ref.getAttribute('idref');
        if (idref && idToHref[idref]) {
          const fullPath = opfFolder + idToHref[idref];
          htmlFiles.push(fullPath);
        }
      });
    }

    // Fallback: find any xhtml or html files
    if (htmlFiles.length === 0) {
      contents.forEach((relativePath) => {
        if (/\.(html|xhtml|htm)$/i.test(relativePath) && !relativePath.includes('toc')) {
          htmlFiles.push(relativePath);
        }
      });
      htmlFiles.sort();
    }

    if (htmlFiles.length === 0) {
      return this.createFallbackDoc(file, 'epub', bookTitle, ['Unable to find readable chapters in EPUB.']);
    }

    const pagesData: Record<number, DocumentPageContent> = {};
    let totalPageCount = 0;

    for (const hPath of htmlFiles) {
      const rawText = await contents.file(hPath)?.async('text');
      if (!rawText) continue;

      // Extract body content
      const bodyMatch = rawText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyHtml = bodyMatch ? bodyMatch[1] : rawText;

      const subPages = this.paginateHtml(bodyHtml, bookTitle);
      for (const sp of subPages) {
        totalPageCount++;
        pagesData[totalPageCount] = {
          pageNum: totalPageCount,
          title: sp.title || (totalPageCount === 1 ? bookTitle : undefined),
          htmlContent: sp.html,
          type: totalPageCount === 1 ? 'cover' : 'article',
        };
      }
    }

    const finalCount = Math.max(1, totalPageCount);

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: bookTitle,
      numPages: finalCount,
      fileSize: file.size,
      format: 'epub',
      pagesData,
    };
  }

  /**
   * Parse Plain Text / Markdown / Code / JSON
   */
  private async parsePlainText(file: File): Promise<BookDocument> {
    const text = await file.text();
    const title = file.name.replace(/\.[^/.]+$/, '');

    // Split text into paragraphs
    const paragraphs = text
      .split(/\r?\n\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    // Paginate: ~280 words per page
    const pages: string[][] = [];
    let currentWords = 0;
    let currentPageParagraphs: string[] = [];

    for (const p of paragraphs) {
      const wordCount = p.split(/\s+/).length;
      if (currentWords + wordCount > 280 && currentPageParagraphs.length > 0) {
        pages.push(currentPageParagraphs);
        currentPageParagraphs = [p];
        currentWords = wordCount;
      } else {
        currentPageParagraphs.push(p);
        currentWords += wordCount;
      }
    }

    if (currentPageParagraphs.length > 0) {
      pages.push(currentPageParagraphs);
    }

    if (pages.length === 0) {
      pages.push(['[Empty Document]']);
    }

    const pagesData: Record<number, DocumentPageContent> = {};
    pages.forEach((paras, idx) => {
      const pageNum = idx + 1;
      const html = paras.map((p) => `<p>${this.escapeHtml(p)}</p>`).join('\n');
      pagesData[pageNum] = {
        pageNum,
        title: pageNum === 1 ? title : undefined,
        textBlocks: paras,
        htmlContent: html,
        type: pageNum === 1 ? 'cover' : 'text',
      };
    });

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      numPages: pages.length,
      fileSize: file.size,
      format: 'txt',
      pagesData,
    };
  }

  /**
   * Parse Images (JPG, PNG, WebP, etc.)
   */
  private async parseImage(file: File): Promise<BookDocument> {
    const imageUrl = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^/.]+$/, '');

    const pagesData: Record<number, DocumentPageContent> = {
      1: {
        pageNum: 1,
        title,
        type: 'image',
        imageUrl,
      },
    };

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      numPages: 1,
      fileSize: file.size,
      format: 'image',
      pagesData,
    };
  }

  /**
   * Utility to paginate arbitrary HTML by paragraph length
   */
  private paginateHtml(
    html: string,
    defaultTitle: string
  ): { title?: string; html: string }[] {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const children = Array.from(temp.children);
    if (children.length === 0) {
      return [{ title: defaultTitle, html: `<p>${html}</p>` }];
    }

    const pages: { title?: string; html: string }[] = [];
    let currentHtml = '';
    let currentWordCount = 0;
    let pageTitle: string | undefined = undefined;

    for (const child of children) {
      const tag = child.tagName.toLowerCase();
      const text = child.textContent || '';
      const words = text.split(/\s+/).filter(Boolean).length;

      // Start new page on major headings (H1 or H2) if we already have content
      if ((tag === 'h1' || tag === 'h2') && currentWordCount > 80) {
        pages.push({ title: pageTitle, html: currentHtml });
        currentHtml = child.outerHTML;
        currentWordCount = words;
        pageTitle = text.trim();
        continue;
      }

      if (!pageTitle && (tag === 'h1' || tag === 'h2' || tag === 'h3')) {
        pageTitle = text.trim();
      }

      if (currentWordCount + words > 290 && currentHtml.length > 0) {
        pages.push({ title: pageTitle, html: currentHtml });
        currentHtml = child.outerHTML;
        currentWordCount = words;
        pageTitle = undefined;
      } else {
        currentHtml += '\n' + child.outerHTML;
        currentWordCount += words;
      }
    }

    if (currentHtml.trim()) {
      pages.push({ title: pageTitle, html: currentHtml });
    }

    return pages.length > 0 ? pages : [{ title: defaultTitle, html: `<p>${html}</p>` }];
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private createFallbackDoc(
    file: File,
    format: DocumentFormat,
    title: string,
    messages: string[]
  ): BookDocument {
    return {
      id: `doc_${Date.now()}`,
      title: title || file.name,
      numPages: 1,
      fileSize: file.size,
      format,
      pagesData: {
        1: {
          pageNum: 1,
          title,
          type: 'cover',
          textBlocks: messages,
        },
      },
    };
  }
}

export const documentParserService = new DocumentParserService();
