import { useNavigate } from '@tanstack/react-router';
import { FileText, Calendar, ExternalLink } from 'lucide-react';
import { useListPdfs } from '../hooks/useQueries';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from '../backend';

function PdfCard({ pdf }: { pdf: Metadata }) {
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate({ to: '/view/$shareId', params: { shareId: pdf.shareId } });
  };

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
        <span>{new Date(Number(pdf.uploadedAt) / 1_000_000).toLocaleDateString()}</span>
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

export default function GalleryPage() {
  const { data: pdfs, isLoading, isError } = useListPdfs();

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">
            PDF Gallery
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Browse and open all publicly shared PDF documents.
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
            <p className="text-destructive text-lg font-medium">Failed to load PDFs. Please try again later.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && pdfs?.length === 0 && (
          <div className="text-center py-20">
            <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">No PDFs have been shared yet.</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && pdfs && pdfs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pdfs.map((pdf) => (
              <PdfCard key={pdf.shareId} pdf={pdf} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
