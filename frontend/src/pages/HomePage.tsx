import { Link } from '@tanstack/react-router';
import { Upload, Share2, Eye, ArrowRight, FileText, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HomePage() {
    return (
        <main className="flex-1">
            {/* Hero */}
            <section className="relative overflow-hidden py-20 sm:py-32">
                {/* Background glow */}
                <div
                    className="pointer-events-none absolute inset-0 -z-10"
                    style={{
                        background:
                            'radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.75 0.16 65 / 0.12), transparent)',
                    }}
                />
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-fade-in">
                        <Zap className="h-3.5 w-3.5" />
                        Simple PDF Sharing
                    </div>
                    <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in">
                        Share PDFs with{' '}
                        <span className="text-primary">anyone, instantly</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in">
                        Upload your PDF documents and get a shareable link in seconds. No sign-up required for viewers — just share and they can read.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
                        <Link to="/upload">
                            <Button size="lg" className="gap-2 font-semibold shadow-glow">
                                <Upload className="h-4 w-4" />
                                Upload a PDF
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link to="/dashboard">
                            <Button variant="outline" size="lg" className="gap-2 font-semibold border-border hover:bg-secondary">
                                View Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-16 sm:py-24">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-foreground mb-12">
                        How it works
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Upload,
                                title: 'Upload',
                                desc: 'Select any PDF from your device and give it a title. Your file is stored securely on-chain.',
                            },
                            {
                                icon: Share2,
                                title: 'Share',
                                desc: 'Get a unique shareable link instantly. Copy it and send it to anyone you want.',
                            },
                            {
                                icon: Eye,
                                title: 'View',
                                desc: 'Recipients open the link and view the PDF directly in their browser — no downloads needed.',
                            },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="card-glass p-6 flex flex-col items-start gap-4 hover:border-primary/40 transition-colors duration-200"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-display font-semibold text-lg text-foreground mb-1">{title}</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust section */}
            <section className="py-12 border-t border-border">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span>Stored on-chain</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>PDF format supported</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span>Instant sharing</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
