'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
    { href: '/dashboard/appointments', label: 'Agendamentos', icon: '📅' },
    { href: '/dashboard/campaigns', label: 'Campanhas', icon: '📡' },
    { href: '/dashboard/reports', label: 'Relatórios', icon: '📈' },
    { href: '/dashboard/settings', label: 'Configurações', icon: '⚙️' },
];

const ADMIN_ONLY = ['/dashboard/settings'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="space-y-3 text-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground text-sm">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const userRole = (session.user as { role?: string })?.role;
    const filteredNav = navItems.filter((item) => {
        if (ADMIN_ONLY.includes(item.href) && userRole !== 'ADMIN') return false;
        return true;
    });

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar */}
            <aside
                className={`${collapsed ? 'w-16' : 'w-64'} flex-shrink-0 bg-sidebar flex flex-col transition-all duration-300 ease-in-out`}
                style={{ background: 'hsl(var(--sidebar))' }}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        {!collapsed && (
                            <span className="text-white font-bold text-lg truncate">MedGrowth</span>
                        )}
                    </div>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors p-1 rounded"
                    >
                        {collapsed ? '→' : '←'}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {filteredNav.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                            >
                                <span className="text-lg flex-shrink-0">{item.icon}</span>
                                {!collapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="p-3 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
                    <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                                {session.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sidebar-foreground text-xs font-semibold truncate">{session.user?.name || session.user?.email}</p>
                                <p className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">{userRole}</p>
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors p-1 rounded text-xs"
                                title="Sair"
                            >
                                ↩
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-border flex items-center px-6 gap-4">
                    <div className="flex-1">
                        <h1 className="text-sm font-semibold text-foreground/70">
                            {filteredNav.find((n) => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-auto animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
