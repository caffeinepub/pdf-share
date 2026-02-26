import { useState, useRef, useEffect } from 'react';
import {
    Copy,
    Trash2,
    FileText,
    CheckCircle,
    ExternalLink,
    Loader2,
    AlertCircle,
    Pencil,
    X,
    Check,
    ShieldBan,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import {
    useGetAllPdfMeta,
    useDeletePdf,
    useUpdatePdfTitle,
    useBannedUsers,
    useKickUser,
    useUnbanUser,
} from '@/hooks/useQueries';
import { type Metadata } from '../backend';
import { Link } from '@tanstack/react-router';
import { useActor } from '@/hooks/useActor';
import { useQuery } from '@tanstack/react-query';
import { Principal } from '@dfinity/principal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(uploadedAt: bigint): string {
    const ms = Number(uploadedAt / BigInt(1_000_000));
    return new Date(ms).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function useIsAdmin() {
    const { actor, isFetching } = useActor();
    return useQuery<boolean>({
        queryKey: ['isAdmin'],
        queryFn: async () => {
            if (!actor) return false;
            return actor.isCallerAdmin();
        },
        enabled: !!actor && !isFetching,
    });
}

// ─── PDF Row ─────────────────────────────────────────────────────────────────

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

// ─── Kick Form ────────────────────────────────────────────────────────────────

function KickByPrincipalForm({
    onKick,
    isPending,
    bannedSet,
}: {
    onKick: (principal: Principal) => void;
    isPending: boolean;
    bannedSet: Set<string>;
}) {
    const [principalInput, setPrincipalInput] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [pendingPrincipal, setPendingPrincipal] = useState<Principal | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        const trimmed = principalInput.trim();
        if (!trimmed) {
            setValidationError('Please enter a principal ID.');
            return;
        }
        let parsed: Principal;
        try {
            parsed = Principal.fromText(trimmed);
        } catch {
            setValidationError('Invalid principal ID format.');
            return;
        }
        if (bannedSet.has(parsed.toString())) {
            setValidationError('This user is already banned.');
            return;
        }
        setPendingPrincipal(parsed);
    };

    const confirmKick = () => {
        if (pendingPrincipal) {
            onKick(pendingPrincipal);
            setPrincipalInput('');
            setPendingPrincipal(null);
        }
    };

    return (
        <div className="card-glass p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Kick User by Principal
            </h3>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                    value={principalInput}
                    onChange={(e) => {
                        setPrincipalInput(e.target.value);
                        setValidationError(null);
                    }}
                    placeholder="Enter principal ID (e.g. aaaaa-aa)"
                    className="font-mono text-xs bg-secondary border-border focus-visible:ring-primary/50 text-foreground"
                    disabled={isPending}
                />
                <AlertDialog
                    open={!!pendingPrincipal}
                    onOpenChange={(open) => {
                        if (!open) setPendingPrincipal(null);
                    }}
                >
                    <AlertDialogTrigger asChild>
                        <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            disabled={isPending}
                            className="gap-1.5 shrink-0"
                        >
                            {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <ShieldBan className="h-3.5 w-3.5" />
                            )}
                            Kick
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-display text-foreground">
                                Kick this user?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                This will ban the following principal from uploading:
                                <span className="block mt-2 font-mono text-xs text-foreground bg-secondary rounded px-2 py-1 break-all">
                                    {pendingPrincipal?.toString()}
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                className="border-border hover:bg-secondary"
                                onClick={() => setPendingPrincipal(null)}
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmKick}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Kick User
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </form>
            {validationError && (
                <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {validationError}
                </p>
            )}
        </div>
    );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function AdminPanel() {
    const { data: bannedUsers, isLoading: bannedLoading, isError: bannedError } = useBannedUsers();
    const kickMutation = useKickUser();
    const unbanMutation = useUnbanUser();

    const [kickError, setKickError] = useState<string | null>(null);
    const [unbanError, setUnbanError] = useState<string | null>(null);

    const bannedSet = new Set((bannedUsers ?? []).map((p: Principal) => p.toString()));

    const handleKick = async (principal: Principal) => {
        setKickError(null);
        try {
            await kickMutation.mutateAsync(principal);
        } catch (e: unknown) {
            setKickError(e instanceof Error ? e.message : 'Failed to kick user.');
        }
    };

    const handleUnban = async (principal: Principal) => {
        setUnbanError(null);
        try {
            await unbanMutation.mutateAsync(principal);
        } catch (e: unknown) {
            setUnbanError(e instanceof Error ? e.message : 'Failed to unban user.');
        }
    };

    return (
        <section className="mt-12">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15">
                    <Users className="h-4 w-4 text-destructive" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">User Management</h2>
                <Badge variant="destructive" className="text-xs ml-1">Admin Only</Badge>
            </div>

            {/* Kick form */}
            <KickByPrincipalForm
                onKick={handleKick}
                isPending={kickMutation.isPending}
                bannedSet={bannedSet}
            />

            {kickError && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {kickError}
                </div>
            )}

            {/* Banned users list */}
            <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Banned Users
                </h3>

                {bannedLoading && (
                    <div className="space-y-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="card-glass p-3 flex items-center gap-3">
                                <Skeleton className="h-4 w-64 bg-secondary" />
                                <Skeleton className="h-7 w-16 bg-secondary ml-auto" />
                            </div>
                        ))}
                    </div>
                )}

                {bannedError && (
                    <div className="card-glass p-4 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Failed to load banned users.
                    </div>
                )}

                {!bannedLoading && !bannedError && (bannedUsers ?? []).length === 0 && (
                    <div className="card-glass p-5 text-center text-muted-foreground text-sm">
                        No banned users.
                    </div>
                )}

                {!bannedLoading && !bannedError && (bannedUsers ?? []).length > 0 && (
                    <div className="space-y-2">
                        {(bannedUsers ?? []).map((principal: Principal) => (
                            <div
                                key={principal.toString()}
                                className="card-glass p-3 flex items-center gap-3 hover:border-destructive/30 transition-colors"
                            >
                                <ShieldBan className="h-4 w-4 text-destructive shrink-0" />
                                <span className="text-xs font-mono text-foreground flex-1 truncate">
                                    {principal.toString()}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUnban(principal)}
                                    disabled={unbanMutation.isPending}
                                    className="gap-1.5 text-xs border-border hover:bg-secondary shrink-0"
                                >
                                    {unbanMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-3 w-3" />
                                    )}
                                    Unban
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {unbanError && (
                    <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {unbanError}
                    </div>
                )}
            </div>
        </section>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardPage() {
    const { data: pdfs, isLoading, isError, refetch } = useGetAllPdfMeta();
    const deleteMutation = useDeletePdf();
    const { data: isAdmin } = useIsAdmin();

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
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            className="border-border hover:bg-secondary"
                        >
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

                {/* PDF list */}
                {!isLoading && !isError && (
                    <>
                        {pdfs && pdfs.length > 0 ? (
                            <div className="space-y-3">
                                {pdfs.map((meta) => (
                                    <PdfRow key={meta.shareId} meta={meta} onDelete={handleDelete} />
                                ))}
                            </div>
                        ) : (
                            <div className="card-glass p-12 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                                <p className="text-foreground font-medium mb-1">No PDFs yet</p>
                                <p className="text-muted-foreground text-sm mb-6">
                                    Upload your first PDF to get a shareable link.
                                </p>
                                <Link to="/upload">
                                    <Button className="shadow-glow font-semibold">
                                        Upload your first PDF
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </>
                )}

                {/* Admin Panel — only visible to the admin principal */}
                {isAdmin && <AdminPanel />}
            </div>
        </main>
    );
}
