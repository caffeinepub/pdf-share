import { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, FileText, CheckCircle, ExternalLink, Loader2, AlertCircle, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useGetAllPdfMeta, useDeletePdf, useUpdatePdfTitle } from '@/hooks/useQueries';
import { type Metadata } from '../backend';
import { Link } from '@tanstack/react-router';

function formatDate(uploadedAt: bigint): string {
    // uploadedAt is in nanoseconds
    const ms = Number(uploadedAt / BigInt(1_000_000));
    return new Date(ms).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function PdfRow({
    meta,
    onDelete,
}: {
    meta: Metadata;
    onDelete: (id: string) => void;
}) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(meta.title);
    const [editError, setEditError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const updateMutation = useUpdatePdfTitle();

    const shareUrl = `${window.location.origin}/view/${meta.shareId}`;

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEditStart = () => {
        setEditValue(meta.title);
        setEditError(null);
        setIsEditing(true);
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditValue(meta.title);
        setEditError(null);
    };

    const handleEditSave = async () => {
        const trimmed = editValue.trim();
        if (!trimmed) {
            setEditError('Title cannot be empty.');
            return;
        }
        if (trimmed === meta.title) {
            setIsEditing(false);
            return;
        }
        setEditError(null);
        try {
            await updateMutation.mutateAsync({ shareId: meta.shareId, newTitle: trimmed });
            setIsEditing(false);
        } catch {
            setEditError('Failed to update title. Please try again.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleEditSave();
        } else if (e.key === 'Escape') {
            handleEditCancel();
        }
    };

    return (
        <div className="card-glass p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-colors duration-200 animate-fade-in">
            {/* Icon + info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                    {isEditing ? (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={updateMutation.isPending}
                                    className="h-8 text-sm font-semibold bg-secondary border-primary/40 focus-visible:ring-primary/50 text-foreground"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleEditSave}
                                    disabled={updateMutation.isPending}
                                    className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10"
                                    title="Save title"
                                >
                                    {updateMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleEditCancel}
                                    disabled={updateMutation.isPending}
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                    title="Cancel"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            {editError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {editError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 group/title min-w-0">
                            <p className="font-semibold text-foreground truncate">{meta.title}</p>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleEditStart}
                                className="h-6 w-6 shrink-0 opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="Edit title"
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {meta.fileName} · Uploaded {formatDate(meta.uploadedAt)}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Link to="/view/$shareId" params={{ shareId: meta.shareId }}>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        title="View PDF"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">View</span>
                    </Button>
                </Link>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    title="Copy link"
                >
                    {copied ? (
                        <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline text-xs">{copied ? 'Copied!' : 'Copy Link'}</span>
                </Button>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete PDF"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-xs">Delete</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-display text-foreground">
                                Delete PDF?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                This will permanently delete{' '}
                                <span className="text-foreground font-medium">"{meta.title}"</span>. Any
                                existing share links will stop working.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-border hover:bg-secondary">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => onDelete(meta.shareId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

export function DashboardPage() {
    const { data: pdfs, isLoading, isError, refetch } = useGetAllPdfMeta();
    const deleteMutation = useDeletePdf();

    const handleDelete = (shareId: string) => {
        deleteMutation.mutate(shareId);
    };

    return (
        <main className="flex-1 py-12 sm:py-16">
            <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-foreground mb-1">Dashboard</h1>
                        <p className="text-muted-foreground text-sm">
                            Manage your uploaded PDFs and share links.
                        </p>
                    </div>
                    <Link to="/upload">
                        <Button className="gap-2 shadow-glow font-semibold">
                            <span className="hidden sm:inline">Upload PDF</span>
                            <span className="sm:hidden">Upload</span>
                        </Button>
                    </Link>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card-glass p-5 flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-lg bg-secondary" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-48 bg-secondary" />
                                    <Skeleton className="h-3 w-32 bg-secondary" />
                                </div>
                                <Skeleton className="h-8 w-24 bg-secondary" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {isError && (
                    <div className="card-glass p-8 text-center">
                        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                        <p className="text-foreground font-medium mb-1">Failed to load PDFs</p>
                        <p className="text-muted-foreground text-sm mb-4">
                            Something went wrong while fetching your documents.
                        </p>
                        <Button variant="outline" onClick={() => refetch()} className="border-border hover:bg-secondary">
                            Try Again
                        </Button>
                    </div>
                )}

                {/* Delete error */}
                {deleteMutation.isError && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Failed to delete PDF. Please try again.
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !isError && pdfs && pdfs.length === 0 && (
                    <div className="card-glass p-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mx-auto mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                            No PDFs yet
                        </h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Upload your first PDF to get started.
                        </p>
                        <Link to="/upload">
                            <Button className="gap-2 shadow-glow font-semibold">
                                Upload your first PDF
                            </Button>
                        </Link>
                    </div>
                )}

                {/* PDF list */}
                {!isLoading && !isError && pdfs && pdfs.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-4">
                            {pdfs.length} document{pdfs.length !== 1 ? 's' : ''}
                        </p>
                        {pdfs.map((meta) => (
                            <PdfRow
                                key={meta.shareId}
                                meta={meta}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}

                {/* Deleting overlay indicator */}
                {deleteMutation.isPending && (
                    <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-3 shadow-card text-sm text-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Deleting…
                    </div>
                )}
            </div>
        </main>
    );
}
