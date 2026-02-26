import { Heart } from 'lucide-react';

export function Footer() {
    const year = new Date().getFullYear();
    const appId = encodeURIComponent(window.location.hostname || 'pdf-share');

    return (
        <footer className="border-t border-border bg-card/50 py-6 mt-auto">
            <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>© {year} PDF Share. All rights reserved.</p>
                <p className="flex items-center gap-1.5">
                    Built with{' '}
                    <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
                    {' '}using{' '}
                    <a
                        href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                    >
                        caffeine.ai
                    </a>
                </p>
            </div>
        </footer>
    );
}
