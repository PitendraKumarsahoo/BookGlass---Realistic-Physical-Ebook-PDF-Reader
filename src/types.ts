export type DocumentFormat =
  | 'pdf'
  | 'pptx'
  | 'docx'
  | 'epub'
  | 'txt'
  | 'image'
  | 'sample';

export interface DocumentPageContent {
  pageNum: number;
  title?: string;
  subtitle?: string;
  type?: 'cover' | 'slide' | 'article' | 'image' | 'text';
  textBlocks?: string[];
  htmlContent?: string;
  imageUrl?: string;
  slideNotes?: string;
  bullets?: string[];
}

export interface BookDocument {
  id: string;
  title: string;
  numPages: number;
  fileSize?: number;
  format?: DocumentFormat;
  pdfDoc?: any; // PDFDocumentProxy if PDF
  isSample?: boolean;
  pagesData?: Record<number, DocumentPageContent>;
}

export interface SpreadState {
  currentSpread: number; // 0-indexed spread
  totalSpreads: number;
  leftPageNum: number | null;
  rightPageNum: number | null;
  isCover: boolean;
}

export interface ReaderSettings {
  theme: 'night' | 'day' | 'sepia';
  nightLightEnabled: boolean;
  nightLightWarmth: number; // 0 to 100
  nightLightIntensity: number; // 0 to 100
  soundEnabled: boolean;
  zoom: number; // 0.8 to 1.5
  isFocusMode: boolean;
  singlePageMode: boolean; // For mobile or forced
}
