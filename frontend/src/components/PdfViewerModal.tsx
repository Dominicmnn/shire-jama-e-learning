import React, { useEffect, useRef, useState } from 'react';
import { LearningMaterial } from '../types';
import { X, FileText } from 'lucide-react';

interface PdfViewerModalProps {
  material: LearningMaterial | null;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ material, onClose }) => {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const viewerUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (viewerUrlRef.current) URL.revokeObjectURL(viewerUrlRef.current);
  }, []);

  useEffect(() => {
    if (!material) return undefined;

    if (viewerUrlRef.current) {
      URL.revokeObjectURL(viewerUrlRef.current);
      viewerUrlRef.current = null;
    }
    setViewerUrl(null);

    const loadDocument = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const storedTokens = window.localStorage.getItem('shire-jama-auth-tokens');
        const accessToken = storedTokens ? JSON.parse(storedTokens).access : null;
        const materialUrl = new URL(material.fileUrl, window.location.origin);
        const isLocalBackend = ['localhost', '127.0.0.1'].includes(materialUrl.hostname)
          && ['localhost', '127.0.0.1'].includes(window.location.hostname);
        const requestUrl = isLocalBackend
          ? `${window.location.origin}${materialUrl.pathname}${materialUrl.search}`
          : material.fileUrl;
        const response = await fetch(requestUrl, {
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
        const file = await response.blob();
        if (file.type && file.type !== 'application/pdf' && !file.type.endsWith('/pdf')) {
          throw new Error('The server did not return a PDF file. Ask the instructor to upload a PDF document.');
        }
        const nextViewerUrl = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }));
        viewerUrlRef.current = nextViewerUrl;
        setViewerUrl(nextViewerUrl);
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
          {!loading && !loadError && viewerUrl && (
            <iframe
              src={`${viewerUrl}#toolbar=0&navpanes=0&download=0`}
              className="w-full h-full rounded border border-slate-200 shadow-inner bg-white"
              title={material.title}
            />
          )}
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