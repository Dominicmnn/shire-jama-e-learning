import React, { useEffect, useRef, useState } from 'react';
import { LearningMaterial } from '../types';
import { getMaterialStreamUrl } from '../services/api';
import { X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerModalProps {
  material: LearningMaterial | null;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ material, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfRef.current || !canvasRef.current) return;
      const page = await pdfRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    };
    renderPage().catch((error) => setLoadError(error instanceof Error ? error.message : 'The page could not be rendered.'));
  }, [pageNumber]);

  useEffect(() => {
    if (!material) return undefined;

    const loadDocument = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const storedTokens = window.localStorage.getItem('shire-jama-auth-tokens');
        const accessToken = storedTokens ? JSON.parse(storedTokens).access : null;
        const requestUrl = getMaterialStreamUrl(String(material.id));
        const response = await fetch(requestUrl, {
          cache: 'no-store',
          headers: accessToken && !requestUrl.startsWith('blob:')
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        });
        if (!response.ok) {
          if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
          if (response.status === 403) throw new Error('You do not have access to this document.');
          if (response.status === 404) throw new Error('The PDF file is missing from server storage. Ask the administrator to restore the uploaded file.');
          throw new Error(`The document server returned HTTP ${response.status}.`);
        }
        const fileType = response.headers.get('content-type') || '';
        if (fileType && !fileType.toLowerCase().includes('application/pdf')) {
          throw new Error('The server did not return a PDF file. Ask the instructor to upload a PDF document.');
        }
        const fileBuffer = await response.arrayBuffer();
        if (fileBuffer.byteLength === 0) {
          throw new Error('The PDF file is empty on server storage. Ask the instructor to upload it again.');
        }
        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setPageNumber(1);
        const firstPage = await pdf.getPage(1);
        const firstViewport = firstPage.getViewport({ scale: 1.35 });
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('The PDF viewer could not be initialized.');
        canvas.width = firstViewport.width;
        canvas.height = firstViewport.height;
        await firstPage.render({ canvasContext: canvas.getContext('2d')!, viewport: firstViewport }).promise;
      } catch (error) {
        setLoadError(error instanceof TypeError && error.message === 'Failed to fetch'
          ? 'The document server could not be reached. Start the backend locally or configure VITE_API_URL for the deployed frontend.'
          : error instanceof Error ? error.message : 'The document could not be opened.');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [material]);

  if (!material) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white shadow-2xl w-full h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white line-clamp-1">{material.title}</h2>
              <p className="text-xs text-slate-400">
                Institutional Course Material &bull; {material.fileSize} &bull; Uploaded {material.uploadDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer */}
        <div className="flex-1 bg-slate-100 p-2 relative">
          {loading && <div className="h-full flex items-center justify-center text-sm text-slate-600">Opening document...</div>}
          {!loading && loadError && <div className="h-full flex items-center justify-center p-6 text-center text-sm font-semibold text-rose-700">{loadError}</div>}
          <div className={`h-full flex-col items-center gap-3 overflow-auto ${loading || loadError ? 'hidden' : 'flex'}`}>
            <canvas ref={canvasRef} className="max-w-full border border-slate-200 bg-white shadow" />
            {pageCount > 1 && <div className="sticky bottom-2 flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow">
              <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((page) => Math.max(1, page - 1))} className="rounded p-1 hover:bg-slate-700 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <span>Page {pageNumber} of {pageCount}</span>
              <button type="button" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))} className="rounded p-1 hover:bg-slate-700 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>}
          </div>
        </div>

        {/* Footer Notes */}
        {material.description && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Faculty Notes: </span>
            {material.description}
          </div>
        )}
      </div>
    </div>
  );
};