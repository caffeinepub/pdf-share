import { Link, useRouterState } from '@tanstack/react-router';
import { FileText, LayoutDashboard, Upload } from 'lucide-react';

export function Header() {
    const routerState = useRouterState();
    const pathname = routerState.location.pathname;

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <img
                        src="/assets/generated/pdf-share-logo.dim_256x64.png"
                        alt="PDF Share"
                        className="h-8 w-auto object-contain"
                        onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                        }}
                    />
                    <span
                        className="hidden items-center gap-2 font-display font-bold text-lg text-foreground"
                        style={{ display: 'none' }}
                    >
                        <FileText className="h-5 w-5 text-primary" />
                        PDF Share
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-1 sm:gap-2">
                    <Link
                        to="/upload"
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                            isActive('/upload')
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                    >
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">Upload</span>
                    </Link>
                    <Link
                        to="/dashboard"
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                            isActive('/dashboard')
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                </nav>
            </div>
        </header>
    );
}
