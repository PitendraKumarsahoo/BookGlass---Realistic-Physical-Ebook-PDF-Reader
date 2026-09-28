/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookDocument } from './types';
import { LandingUpload } from './components/LandingUpload';
import { LoadingScreen } from './components/LoadingScreen';
import { BookReader } from './components/BookReader';
import { documentParserService } from './services/documentParserService';
import { SAMPLE_BOOK_META } from './services/sampleBook';

export default function App() {
  const [view, setView] = useState<'landing' | 'loading' | 'reader'>('landing');
  const [currentBook, setCurrentBook] = useState<BookDocument | null>(null);
  const [loadingFileName, setLoadingFileName] = useState<string | undefined>(undefined);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Manage browser history popstate so pressing Browser Back returns to landing page instead of exiting website
  useEffect(() => {
    const handlePopState = () => {
      // If user presses browser back button or back swipe while reading, return to home/landing view
      setView('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle uploaded user document (PowerPoint PPTX, PDF, Word DOCX, EPUB, TXT, Images)
  const handleSelectFile = async (file: File) => {
    setLoadingFileName(file.name);
    setView('loading');
    setGlobalError(null);

    try {
      // Push history state so browser Back returns to landing page
      window.history.pushState({ bookglassView: 'reader' }, '');

      // Small artificial breathing room for the animated book opening transition
      const [bookDoc] = await Promise.all([
        documentParserService.loadDocument(file),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      setCurrentBook(bookDoc);
      setView('reader');
    } catch (err: any) {
      console.error('Failed to open document:', err);
      setGlobalError(
        'This file could not be opened. Please verify it is a valid PowerPoint, PDF, Word, EPUB, or text document.'
      );
      setView('landing');
    }
  };

  // Handle curated classical sample book
  const handleOpenSampleBook = async () => {
    setLoadingFileName('Meditations on the Solitude of Reading');
    setView('loading');
    setGlobalError(null);

    // Push history state so browser Back returns to landing page
    window.history.pushState({ bookglassView: 'reader' }, '');

    await new Promise((resolve) => setTimeout(resolve, 800));

    setCurrentBook({
      ...SAMPLE_BOOK_META,
      isSample: true,
      format: 'sample',
    });
    setView('reader');
  };

  const handleBackToLibrary = () => {
    // If we pushed state, back up history cleanly
    if (window.history.state?.bookglassView === 'reader') {
      window.history.back();
    }
    setView('landing');
  };

  return (
    <div className="min-h-screen w-full bg-[#090a0f] text-stone-200">
      {view === 'landing' && (
        <LandingUpload
          onSelectFile={handleSelectFile}
          onOpenSampleBook={handleOpenSampleBook}
        />
      )}

      {view === 'loading' && (
        <LoadingScreen fileName={loadingFileName} />
      )}

      {view === 'reader' && currentBook && (
        <BookReader
          book={currentBook}
          onBackToLibrary={handleBackToLibrary}
        />
      )}
    </div>
  );
}
