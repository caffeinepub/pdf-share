import { useParams, useNavigate } from '@tanstack/react-router';
import {
    FileText,
    AlertCircle,
    ArrowLeft,
    Copy,
    CheckCircle,
    Loader2,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useGetPdf, useGetAllPdfMeta } from '@/hooks/useQueries';
import { Link } from '@tanstack/react-router';
import { useState, useMemo, useEffect, useRef } from 'react';

export function ViewerPage() {
    const { shareId } = useParams({ from: '/view/$shareId' });
    const navigate = useNavigate();

    // Metadata for title + next-PDF navigation
    const { data: pdf, isLoading: metaLoading, isError: metaError } = useGetPdf(shareId);
    const { data: allPdfs } = useGetAllPdfMeta();
    const [copied, setCopied] = useState(false);

    // PDF blob URL state
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetchProgress, setFetchProgress] = useState<{ current: number; total: number } | null>(null);
    const prevShareId = useRef<string | null>(null);

    const shareUrl = `${window.location.origin}/view/${shareId}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Find the next PDF in upload order (ascending by uploadedAt)
    const nextPdf = useMemo(() => {
        if (!allPdfs || allPdfs.length === 0) return null;
        const sorted = [...allPdfs].sort((a, b) => Number(a.uploadedAt - b.uploadedAt));
        const currentIndex = sorted.findIndex((p) => p.shareId === shareId);
        if (currentIndex === -1 || currentIndex === sorted.length - 1) return null;
        return sorted[currentIndex + 1];
    }, [allPdfs, shareId]);

    const handleNextPdf = () => {
        if (nextPdf) {
            navigate({ to: '/view/$shareId', params: { shareId: nextPdf.shareId } });
        }
    };

    // Fetch PDF via direct URL from ExternalBlob once metadata is available
    useEffect(() => {
        if (!pdf) return;
        if (prevShareId.current === shareId && pdfObjectUrl) return;

        prevShareId.current = shareId;

        // Revoke previous object URL to avoid memory leaks
        if (pdfObjectUrl) {
            URL.revokeObjectURL(pdfObjectUrl);
            setPdfObjectUrl(null);
        }
        setFetchError(null);
        setFetchProgress(null);

        const loadPdf = async () => {
            try {
                const directUrl = pdf.file.getDirectURL();

                // Fetch with progress tracking via XHR
                const objectUrl = await new Promise<string>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', directUrl, true);
                    xhr.responseType = 'blob';

                    xhr.onprogress = (event) => {
                        if (event.lengthComputable && event.total > 0) {
                            setFetchProgress({
                                current: event.loaded,
                                total: event.total,
                            });
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            const blob = new Blob([xhr.response], { type: 'application/pdf' });
                            resolve(URL.createObjectURL(blob));
                        } else {
                            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error while fetching PDF'));
                    xhr.send();
                });

                setPdfObjectUrl(objectUrl);
                setFetchProgress(null);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                setFetchError(`Failed to load PDF: ${msg}`);
                setFetchProgress(null);
            }
        };

        loadPdf();
    }, [pdf, shareId]);

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
        };
    }, [pdfObjectUrl]);

    const isLoading = metaLoading || (!pdfObjectUrl && !fetchError && !metaError);
    const isError = metaError || !!fetchError;

    const fetchProgressPct =
        fetchProgress && fetchProgress.total > 0
            ? Math.round((fetchProgress.current / fetchProgress.total) * 100)
            : null;

    return (
        <main className="flex-1 flex flex-col">
            {/* Viewer header bar */}
            <div className="border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 py-3">
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to="/dashboard">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            {metaLoading ? (
                                <Skeleton className="h-5 w-40 bg-secondary" />
                            ) : pdf ? (
                                <h1 className="font-display font-semibold text-foreground truncate">
                                    {pdf.title}
                                </h1>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {pdf && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopy}
                                className="gap-2 border-border hover:bg-primary/10 hover:border-primary/40"
                            >
                                {copied ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline text-xs">
                                    {copied ? 'Copied!' : 'Copy Link'}
                                </span>
                            </Button>
                        )}

                        {nextPdf && (
                            <Button
                                size="sm"
                                onClick={handleNextPdf}
                                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                <span className="hidden sm:inline text-xs font-medium">
                                    Next PDF
                                </span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col">
                {/* Loading */}
                {isLoading && !isError && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center w-full max-w-xs">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                            {fetchProgressPct !== null ? (
                                <>
                                    <p className="text-muted-foreground mb-3">
                                        Loading PDF… {fetchProgressPct}%
                                    </p>
                                    <Progress value={fetchProgressPct} className="h-2" />
                                </>
                            ) : (
                                <p className="text-muted-foreground">Loading PDF…</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Error / Not found */}
                {isError && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="card-glass p-10 text-center max-w-sm">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-4">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h2 className="font-display text-xl font-bold text-foreground mb-2">
                                PDF Not Found
                            </h2>
                            <p className="text-muted-foreground text-sm mb-6">
                                {fetchError ??
                                    "This PDF doesn't exist or may have been deleted. Check the link and try again."}
                            </p>
                            <Link to="/">
                                <Button
                                    variant="outline"
                                    className="border-border hover:bg-secondary"
                                >
                                    Go Home
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* PDF iframe */}
                {!isLoading && !isError && pdfObjectUrl && (
                    <iframe
                        src={pdfObjectUrl}
                        title={pdf?.title ?? 'PDF Viewer'}
                        className="flex-1 w-full border-0"
                        style={{ minHeight: 'calc(100vh - 130px)' }}
                    />
                )}
            </div>
        </main>
    );
}
