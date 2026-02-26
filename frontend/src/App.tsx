import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import GalleryPage from './pages/GalleryPage';
import { UploadPage } from './pages/UploadPage';
import { DashboardPage } from './pages/DashboardPage';
import ViewerPage from './pages/ViewerPage';
import { Toaster } from '@/components/ui/sonner';

// Layout component wrapping all pages
function Layout() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <Outlet />
            <Footer />
        </div>
    );
}

// Root route with layout
const rootRoute = createRootRoute({
    component: Layout,
});

// Page routes
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: HomePage,
});

const galleryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/gallery',
    component: GalleryPage,
});

const uploadRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/upload',
    component: UploadPage,
});

const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: DashboardPage,
});

const viewerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/view/$shareId',
    component: ViewerPage,
});

const routeTree = rootRoute.addChildren([
    indexRoute,
    galleryRoute,
    uploadRoute,
    dashboardRoute,
    viewerRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

export default function App() {
    return (
        <>
            <RouterProvider router={router} />
            <Toaster />
        </>
    );
}
