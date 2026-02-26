import { Link, useRouterState } from '@tanstack/react-router';
import { FileText, LayoutDashboard, Upload, LogIn, LogOut, Loader2, BookOpen, Rss } from 'lucide-react';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export function Header() {
    const routerState = useRouterState();
    const pathname = routerState.location.pathname;
    const { identity, login, clear, loginStatus } = useInternetIdentity();
    const queryClient = useQueryClient();

    const isAuthenticated = !!identity;
    const isLoggingIn = loginStatus === 'logging-in';

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname === path || pathname.startsWith(path + '/');
    };

    const handleAuth = async () => {
        if (isAuthenticated) {
            await clear();
            queryClient.clear();
        } else {
            try {
                await login();
            } catch (error: unknown) {
                const err = error as Error;
                if (err?.message === 'User is already authenticated') {
                    await clear();
                    setTimeout(() => login(), 300);
                }
            }
        }
    };

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

                {/* Navigation + Auth */}
                <nav className="flex items-center gap-1 sm:gap-2">
                    <Link
                        to="/"
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                            isActive('/')
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden sm:inline">Gallery</span>
                    </Link>
                    <Link
                        to="/feed"
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                            isActive('/feed')
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                    >
                        <Rss className="h-4 w-4" />
                        <span className="hidden sm:inline">Feed</span>
                    </Link>
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

                    {/* Auth button */}
                    <Button
                        onClick={handleAuth}
                        disabled={isLoggingIn}
                        variant={isAuthenticated ? 'outline' : 'default'}
                        size="sm"
                        className={`ml-1 gap-1.5 ${isAuthenticated ? 'border-border hover:bg-secondary' : 'shadow-glow'}`}
                    >
                        {isLoggingIn ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="hidden sm:inline">Logging in…</span>
                            </>
                        ) : isAuthenticated ? (
                            <>
                                <LogOut className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Log Out</span>
                            </>
                        ) : (
                            <>
                                <LogIn className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Log In</span>
                            </>
                        )}
                    </Button>
                </nav>
            </div>
        </header>
    );
}
