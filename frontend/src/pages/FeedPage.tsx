import { useNavigate } from '@tanstack/react-router';
import { FileText, Calendar, ExternalLink, Rss } from 'lucide-react';
import { useListPdfs } from '../hooks/useQueries';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from '../backend';

function FeedCard({ pdf }: { pdf: Metadata }) {
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate({ to: '/view/$shareId', params: { shareId: pdf.shareId } });
  };

  const uploadDate = new Date(Number(pdf.uploadedAt) / 1_000_000);

  return (
    <div
      className="card-glass group flex flex-col gap-3 p-5 hover:shadow-glow transition-all duration-200 cursor-pointer"
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      aria-label={`Open PDF: ${pdf.title}`}
    >
      {/* Icon + Title */}
      <div className="flex items-start gap-3">
        <div className="mt-1 shrink-0 rounded-lg bg-primary/10 p-2">
          <FileText className="text-primary" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-foreground text-base leading-snug line-clamp-2">
            {pdf.title}
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5 truncate">{pdf.fileName}</p>
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar size={13} />
        <span>
          {uploadDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span className="ml-auto text-muted-foreground/60">
          {uploadDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Open button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium group-hover:bg-primary/90 transition-colors w-full"
      >
        <ExternalLink size={15} />
        Open PDF
      </button>
    </div>
  );
}

export default function FeedPage() {
  const { data: pdfs, isLoading, isError } = useListPdfs();

  // Sort newest-first
  const sortedPdfs = pdfs
    ? [...pdfs].sort((a, b) => Number(b.uploadedAt) - Number(a.uploadedAt))
    : [];

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 mb-4 rounded-full bg-primary/10 px-4 py-1.5">
            <Rss className="text-primary" size={16} />
            <span className="text-primary text-sm font-medium">All Uploads</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">
            Community Feed
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Every PDF shared on the platform — from all accounts, newest first.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-glass p-5 flex flex-col gap-3">
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-9 w-full rounded mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-20">
            <p className="text-destructive text-lg font-medium">
              Failed to load the feed. Please try again later.
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && sortedPdfs.length === 0 && (
          <div className="text-center py-20">
            <Rss className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">No PDFs have been shared yet.</p>
            <p className="text-muted-foreground/60 text-sm mt-2">
              Be the first to upload a document!
            </p>
          </div>
        )}

        {/* Count badge */}
        {!isLoading && !isError && sortedPdfs.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{sortedPdfs.length}</span>{' '}
              {sortedPdfs.length === 1 ? 'document' : 'documents'} shared
            </span>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && sortedPdfs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPdfs.map((pdf) => (
              <FeedCard key={pdf.shareId} pdf={pdf} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
