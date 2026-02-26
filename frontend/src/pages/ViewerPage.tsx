import { useState, useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { ArrowLeft, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useGetPdf, useListPdfs } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Progress } from '@/components/ui/progress';

export default function ViewerPage() {
  const { shareId } = useParams({ from: '/view/$shareId' });
  const { actor, isFetching: actorFetching } = useActor();

  const {
    data: pdf,
    isLoading: metaLoading,
    isPending: metaPending,
    isError: metaError,
    error: metaErrorObj,
  } = useGetPdf(shareId);

  const { data: allPdfs } = useListPdfs();

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  // Fetch PDF bytes from ExternalBlob direct URL via XHR for progress tracking
  useEffect(() => {
    if (!pdf?.file) return;

    let cancelled = false;
    setFetchError(null);
    setLoadProgress(0);
    setPdfObjectUrl(null);

    const url = pdf.file.getDirectURL();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (event) => {
      if (event.lengthComputable && !cancelled) {
        setLoadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = new Blob([xhr.response], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        setPdfObjectUrl(objectUrl);
        setLoadProgress(100);
      } else {
        setFetchError(`Failed to load PDF (HTTP ${xhr.status})`);
      }
    };

    xhr.onerror = () => {
      if (!cancelled) setFetchError('Network error while loading PDF.');
    };

    xhr.send();

    return () => {
      cancelled = true;
      xhr.abort();
    };
  }, [pdf?.file]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Next PDF navigation
  const nextPdf = (() => {
    if (!allPdfs || allPdfs.length <= 1) return null;
    const idx = allPdfs.findIndex((p) => p.shareId === shareId);
    if (idx === -1) return null;
    return allPdfs[(idx + 1) % allPdfs.length];
  })();

  // Actor is still initializing
  const actorReady = !!actor && !actorFetching;

  // True loading: actor not ready yet, or meta query running, or PDF bytes not yet fetched
  const isLoading =
    !actorReady ||
    metaLoading ||
    metaPending ||
    (!pdfObjectUrl && !fetchError && !metaError);

  const hasError = metaError || !!fetchError;

  const loadingMessage = !actorReady
    ? 'Initializing…'
    : metaLoading || metaPending
    ? 'Fetching PDF info…'
    : 'Loading PDF…';

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/gallery" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="flex-1 font-display font-semibold text-foreground truncate text-base">
          {pdf?.title ?? (isLoading ? 'Loading…' : 'PDF Viewer')}
        </h1>
        {nextPdf && (
          <Link
            to="/view/$shareId"
            params={{ shareId: nextPdf.shareId }}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Next <ChevronRight size={16} />
          </Link>
        )}
      </div>

      {/* Loading state */}
      {isLoading && !hasError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
          {loadProgress > 0 && loadProgress < 100 && (
            <div className="w-64">
              <Progress value={loadProgress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground mt-1">{loadProgress}%</p>
            </div>
          )}
          <p className="text-muted-foreground text-sm">{loadingMessage}</p>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
          <AlertCircle className="text-destructive" size={40} />
          <p className="text-destructive font-medium text-lg">Failed to load PDF</p>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            {fetchError ??
              (metaErrorObj instanceof Error
                ? metaErrorObj.message
                : 'The PDF metadata could not be retrieved. It may have been deleted or the link is invalid.')}
          </p>
          <Link to="/gallery" className="mt-2 text-primary hover:underline text-sm font-medium">
            ← Back to Gallery
          </Link>
        </div>
      )}

      {/* PDF iframe */}
      {pdfObjectUrl && !isLoading && !hasError && (
        <iframe
          src={pdfObjectUrl}
          className="flex-1 w-full border-0"
          style={{ minHeight: 'calc(100vh - 56px)' }}
          title={pdf?.title ?? 'PDF Viewer'}
        />
      )}
    </main>
  );
}
