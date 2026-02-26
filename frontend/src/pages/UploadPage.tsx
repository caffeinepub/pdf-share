import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Copy, ExternalLink, X, Loader2, AlertCircle, RefreshCw, LogIn, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useStartUpload, useUploadChunk, useFinalizeUpload } from '@/hooks/useQueries';
import { Link } from '@tanstack/react-router';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useActor } from '@/hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';

const CHUNK_SIZE = 500 * 1024; // 500 KB
const RETRY_SHOW_DELAY_MS = 5000; // Show retry button after 5 seconds

function generateShareId(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

type UploadState =
    | { phase: 'idle' }
    | { phase: 'uploading'; currentChunk: number; totalChunks: number; label: string }
    | { phase: 'finalizing'; blobProgress: number }
    | { phase: 'done'; shareId: string }
    | { phase: 'error'; message: string };

export function UploadPage() {
    const [title, setTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copied, setCopied] = useState(false);
    const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' });
    const [showRetryButton, setShowRetryButton] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { identity, login, loginStatus, isInitializing } = useInternetIdentity();
    const { actor, isFetching: actorFetching } = useActor();
    const queryClient = useQueryClient();

    const isAuthenticated = !!identity;
    const isLoggingIn = loginStatus === 'logging-in';
    // Actor is ready when it's non-null and not currently being fetched
    const isActorReady = !!actor && !actorFetching;
    // Still initializing: user is authenticated but actor hasn't loaded yet
    const isActorInitializing = isAuthenticated && (actorFetching || !actor);

    // Start a timer when actor is initializing; show retry button after delay
    useEffect(() => {
        if (isActorInitializing && !isActorReady) {
            // Clear any existing timer
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
                setShowRetryButton(true);
            }, RETRY_SHOW_DELAY_MS);
        } else {
            // Actor is ready or not initializing — clear timer and hide retry button
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            setShowRetryButton(false);
            setIsRetrying(false);
        }

        return () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [isActorInitializing, isActorReady]);

    const handleRetryConnection = async () => {
        setIsRetrying(true);
        setShowRetryButton(false);
        // Invalidate the actor query to force a fresh initialization attempt
        await queryClient.invalidateQueries({
            predicate: (query) => query.queryKey.includes('actor'),
        });
        await queryClient.refetchQueries({
            predicate: (query) => query.queryKey.includes('actor'),
        });
        // If it still hasn't resolved after 5s, show the button again
        retryTimerRef.current = setTimeout(() => {
            if (!isActorReady) {
                setShowRetryButton(true);
                setIsRetrying(false);
            }
        }, RETRY_SHOW_DELAY_MS);
    };

    const startUpload = useStartUpload();
    const uploadChunk = useUploadChunk();
    const finalizeUpload = useFinalizeUpload();

    const handleLogin = async () => {
        try {
            await login();
        } catch (error: unknown) {
            const err = error as Error;
            if (err?.message === 'User is already authenticated') {
                // Already authenticated, ignore
            }
        }
    };

    const handleFileSelect = (file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file.');
            return;
        }
        setSelectedFile(file);
        if (!title) {
            setTitle(file.name.replace(/\.pdf$/i, ''));
        }
    };

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        },
        [title]
    );

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const runUpload = async (file: File, titleText: string) => {
        if (!isAuthenticated) {
            setUploadState({ phase: 'error', message: 'You must be logged in to upload files.' });
            return;
        }

        if (!isActorReady) {
            setUploadState({ phase: 'error', message: 'Connection is still initializing. Please wait a moment and try again.' });
            return;
        }

        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;

        const totalChunks = Math.max(1, Math.ceil(fileBytes.byteLength / CHUNK_SIZE));
        const newShareId = generateShareId();

        // Step 1: Start upload
        try {
            setUploadState({ phase: 'uploading', currentChunk: 0, totalChunks, label: 'Starting upload…' });
            await startUpload.mutateAsync({
                title: titleText,
                fileName: file.name,
                shareId: newShareId,
                totalChunks: BigInt(totalChunks),
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const isAuthError = msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('anonymous');
            const isConnectionError = msg.toLowerCase().includes('connection not ready') || msg.toLowerCase().includes('actor not available');
            setUploadState({
                phase: 'error',
                message: isAuthError
                    ? 'Upload failed: You must be logged in to upload files. Please ensure you are logged in and try again.'
                    : isConnectionError
                    ? 'Connection is still initializing. Please wait a moment and try again.'
                    : `Failed to start upload: ${msg}`,
            });
            return;
        }

        // Step 2: Upload chunks with retry
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, fileBytes.byteLength);
            const chunkData = fileBytes.slice(start, end);

            setUploadState({
                phase: 'uploading',
                currentChunk: i + 1,
                totalChunks,
                label: `Uploading chunk ${i + 1} of ${totalChunks}…`,
            });

            let success = false;
            let lastError = '';
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await uploadChunk.mutateAsync({
                        shareId: newShareId,
                        chunkIndex: BigInt(i),
                        chunkData,
                    });
                    success = true;
                    break;
                } catch (err: unknown) {
                    lastError = err instanceof Error ? err.message : String(err);
                    // brief pause before retry
                    if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
                }
            }

            if (!success) {
                const isAuthError = lastError.toLowerCase().includes('unauthorized') || lastError.toLowerCase().includes('anonymous');
                setUploadState({
                    phase: 'error',
                    message: isAuthError
                        ? 'Upload failed: You must be logged in to upload files. Please ensure you are logged in and try again.'
                        : `Failed to upload chunk ${i + 1} of ${totalChunks}: ${lastError}`,
                });
                return;
            }
        }

        // Step 3: Finalize (blob storage upload)
        setUploadState({ phase: 'finalizing', blobProgress: 0 });
        try {
            await finalizeUpload.mutateAsync({
                shareId: newShareId,
                fileBytes,
                onProgress: (pct) =>
                    setUploadState({ phase: 'finalizing', blobProgress: pct }),
            });
            setUploadState({ phase: 'done', shareId: newShareId });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const isAuthError = msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('anonymous');
            setUploadState({
                phase: 'error',
                message: isAuthError
                    ? 'Upload failed: You must be logged in to upload files. Please ensure you are logged in and try again.'
                    : `Failed to finalize upload: ${msg}`,
            });
        }
    };

    const handleUpload = () => {
        if (!selectedFile || !title.trim()) return;
        runUpload(selectedFile, title.trim());
    };

    const handleRetry = () => {
        if (!selectedFile || !title.trim()) return;
        runUpload(selectedFile, title.trim());
    };

    const handleReset = () => {
        setTitle('');
        setSelectedFile(null);
        setCopied(false);
        setUploadState({ phase: 'idle' });
    };

    const isUploading =
        uploadState.phase === 'uploading' || uploadState.phase === 'finalizing';

    // ── Success state ──────────────────────────────────────────────────────────
    if (uploadState.phase === 'done') {
        const shareUrl = `${window.location.origin}/view/${uploadState.shareId}`;

        const handleCopy = async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <main className="flex-1 py-12 sm:py-20">
                <div className="container mx-auto px-4 sm:px-6 max-w-lg">
                    <div className="card-glass p-8 text-center animate-fade-in">
                        <div className="flex justify-center mb-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                                <CheckCircle className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                            Upload Successful!
                        </h2>
                        <p className="text-muted-foreground mb-8">
                            Your PDF{' '}
                            <span className="text-foreground font-medium">"{title}"</span> is now
                            live and ready to share.
                        </p>

                        <div className="bg-secondary/60 rounded-lg p-4 mb-6">
                            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                                Shareable Link
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-sm text-foreground truncate font-mono bg-background/50 rounded px-3 py-2 border border-border">
                                    {shareUrl}
                                </code>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={handleCopy}
                                    className="shrink-0 border-border hover:bg-primary/10 hover:border-primary/40"
                                    title="Copy link"
                                >
                                    {copied ? (
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/view/$shareId"
                                params={{ shareId: uploadState.shareId }}
                                className="flex-1"
                            >
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 border-border hover:bg-secondary"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Preview PDF
                                </Button>
                            </Link>
                            <Button onClick={handleReset} className="flex-1 gap-2 shadow-glow">
                                <Upload className="h-4 w-4" />
                                Upload Another
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // ── Identity still initializing (page load) ────────────────────────────────
    if (isInitializing) {
        return (
            <main className="flex-1 py-12 sm:py-20">
                <div className="container mx-auto px-4 sm:px-6 max-w-lg">
                    <div className="mb-8">
                        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                            Upload PDF
                        </h1>
                        <p className="text-muted-foreground">
                            Upload a PDF document and get a shareable link instantly.
                        </p>
                    </div>
                    <div className="card-glass p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground text-sm">Initializing…</p>
                    </div>
                </div>
            </main>
        );
    }

    // ── Not authenticated — show login prompt ──────────────────────────────────
    if (!isAuthenticated) {
        return (
            <main className="flex-1 py-12 sm:py-20">
                <div className="container mx-auto px-4 sm:px-6 max-w-lg">
                    <div className="mb-8">
                        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                            Upload PDF
                        </h1>
                        <p className="text-muted-foreground">
                            Upload a PDF document and get a shareable link instantly.
                        </p>
                    </div>

                    <div className="card-glass p-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                                <LogIn className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <h2 className="font-display text-xl font-bold text-foreground mb-2">
                            Login Required
                        </h2>
                        <p className="text-muted-foreground mb-6 text-sm">
                            Anyone with an account can upload PDF files. Please log in to get started.
                        </p>
                        <Button
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="gap-2 shadow-glow px-8"
                            size="lg"
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Logging in…
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" />
                                    Log In
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    // ── Upload progress label ──────────────────────────────────────────────────
    let progressLabel = '';
    let progressValue = 0;

    if (uploadState.phase === 'uploading') {
        progressLabel = uploadState.label;
        progressValue =
            uploadState.totalChunks > 0
                ? Math.round((uploadState.currentChunk / uploadState.totalChunks) * 90)
                : 0;
    } else if (uploadState.phase === 'finalizing') {
        progressLabel = `Saving to storage… ${uploadState.blobProgress}%`;
        progressValue = 90 + Math.round(uploadState.blobProgress * 0.1);
    }

    return (
        <main className="flex-1 py-12 sm:py-20">
            <div className="container mx-auto px-4 sm:px-6 max-w-lg">
                {/* Page header */}
                <div className="mb-8">
                    <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                        Upload PDF
                    </h1>
                    <p className="text-muted-foreground">
                        Upload a PDF document and get a shareable link instantly.
                    </p>
                </div>

                <div className="card-glass p-6 sm:p-8 space-y-6">
                    {/* Actor initializing banner with retry */}
                    {isActorInitializing && !isUploading && (
                        <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 flex items-start gap-3">
                            <Wifi className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                {isRetrying ? (
                                    <p className="text-sm text-primary font-medium">
                                        Reconnecting to the network…
                                    </p>
                                ) : (
                                    <p className="text-sm text-primary font-medium">
                                        Connecting to the network…
                                    </p>
                                )}
                                {showRetryButton && !isRetrying && (
                                    <button
                                        onClick={handleRetryConnection}
                                        className="mt-1 text-xs text-primary/80 underline underline-offset-2 hover:text-primary transition-colors"
                                    >
                                        Taking too long? Retry connection
                                    </button>
                                )}
                            </div>
                            {(isRetrying || !showRetryButton) && (
                                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0 mt-0.5" />
                            )}
                            {showRetryButton && !isRetrying && (
                                <button
                                    onClick={handleRetryConnection}
                                    className="shrink-0 text-primary hover:text-primary/80 transition-colors"
                                    title="Retry connection"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Error banner */}
                    {uploadState.phase === 'error' && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-destructive font-medium">
                                    {uploadState.message}
                                </p>
                                {selectedFile && title.trim() && (
                                    <button
                                        onClick={handleRetry}
                                        className="mt-1 text-xs text-destructive/80 underline underline-offset-2 hover:text-destructive transition-colors"
                                    >
                                        Try again
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setUploadState({ phase: 'idle' })}
                                className="shrink-0 text-destructive/60 hover:text-destructive transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Title field */}
                    <div className="space-y-2">
                        <Label htmlFor="pdf-title" className="text-sm font-medium text-foreground">
                            Document Title
                        </Label>
                        <Input
                            id="pdf-title"
                            placeholder="Enter a title for your PDF…"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isUploading}
                            className="bg-background/50 border-border focus:border-primary/50"
                        />
                    </div>

                    {/* Drop zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`
                            relative rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer
                            ${isDragging
                                ? 'border-primary bg-primary/10 scale-[1.01]'
                                : 'border-border hover:border-primary/50 hover:bg-primary/5'
                            }
                            ${isUploading ? 'pointer-events-none opacity-60' : ''}
                            ${selectedFile ? 'bg-primary/5 border-primary/30' : ''}
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                        />

                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                                    <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground text-sm truncate max-w-[240px]">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                {!isUploading && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                    >
                                        <X className="h-3 w-3" />
                                        Remove
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground text-sm">
                                        Drop your PDF here
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        or click to browse files
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground/60">PDF files only</p>
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{progressLabel}</p>
                                <p className="text-xs text-muted-foreground font-mono">{progressValue}%</p>
                            </div>
                            <Progress value={progressValue} className="h-2" />
                        </div>
                    )}

                    {/* Upload button */}
                    <Button
                        onClick={handleUpload}
                        disabled={!selectedFile || !title.trim() || isUploading || !isActorReady}
                        className="w-full gap-2 shadow-glow"
                        size="lg"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {uploadState.phase === 'finalizing' ? 'Saving…' : 'Uploading…'}
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Upload PDF
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </main>
    );
}
