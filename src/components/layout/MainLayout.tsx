"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Menu, X, Calendar, FileText, Users,
    Truck, LayoutDashboard, Settings, Building2, Link as LinkIcon, BarChart3, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/hooks/useUserRole";
import { UserRoleContext } from "@/lib/context/UserRoleContext";

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['Administrator', 'Superuser', 'Dispatcher'] },
    { name: 'Enquiries', href: '/enquiries', icon: FileText, roles: ['Administrator', 'Superuser', 'Dispatcher'] },
    { name: 'Jobs', href: '/jobs', icon: FileText, roles: ['Administrator', 'Superuser', 'Dispatcher', 'Operator'] },
    { name: 'Schedule', href: '/schedule', icon: Calendar, roles: ['Administrator', 'Superuser', 'Dispatcher', 'Operator'] },
    { name: 'Dockets', href: '/dockets', icon: FileText, roles: ['Administrator', 'Superuser', 'Dispatcher', 'Operator'] },
    { name: 'Billing', href: '/billing', icon: FileText, roles: ['Administrator', 'Superuser'] },
    { type: 'divider' },
    { name: 'Customers', href: '/customers', icon: Building2, roles: ['Administrator', 'Superuser', 'Dispatcher'] },
    { name: 'Assets', href: '/assets', icon: Truck, roles: ['Administrator', 'Superuser', 'Dispatcher'] },
    { name: 'Personnel', href: '/personnel', icon: Users, roles: ['Administrator', 'Superuser', 'Dispatcher'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['Administrator', 'Superuser'] },
    { type: 'divider' },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['Administrator', 'Superuser'] },
    { name: 'System Config', href: '/settings/system', icon: Settings, roles: ['Administrator'] },
    { name: 'External Links', href: '/settings/links', icon: LinkIcon, roles: ['Administrator', 'Superuser', 'Dispatcher', 'Operator'] },
];

export function MainLayout({ children, userRole }: { children: React.ReactNode, userRole: UserRole | null }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/80 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-800">
                    <Truck className="h-8 w-8 text-blue-500 mr-3" />
                    <span className="text-xl font-bold">ScheduleLab</span>
                    <button
                        className="ml-auto lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="h-6 w-6 text-gray-400 hover:text-white" />
                    </button>
                </div>

                <nav className="flex flex-1 flex-col mt-6">
                    <ul role="list" className="flex flex-1 flex-col gap-y-2 px-4 flex-grow">
                        {navigation.map((item, idx) => {
                            // Filter by role
                            if ('roles' in item) {
                                const allowedRoles = item.roles as string[];
                                if (userRole && !allowedRoles.includes(userRole)) return null;
                            }
                            if ('type' in item && item.type === 'divider') {
                                return <li key={`divider-${idx}`} className="my-2 border-t border-slate-800 mx-2" />;
                            }

                            // Use type guard or cast to bypass TS error on item.href/icon
                            const navItem = item as { name: string, href: string, icon: any };

                            // Determine if this nav item is active
                            const isActive = navItem.href === '/'
                                ? pathname === '/' // For the home (dashboard) route, must be exact match
                                : navItem.href === '/settings' // For settings, exact match as /settings/links is separate
                                    ? pathname === '/settings'
                                    : pathname === navItem.href || pathname?.startsWith(`${navItem.href}/`);

                            return (
                                <li key={navItem.name}>
                                    <Link
                                        href={navItem.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                            isActive
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-300 hover:text-white hover:bg-slate-800',
                                            'group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-colors'
                                        )}
                                    >
                                        <navItem.icon
                                            className={cn(
                                                isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                                                'h-6 w-6 shrink-0'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {navItem.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Sign Out Button at Bottom */}
                    <div className="mt-auto border-t border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-gray-400">Logged in as: {userRole || 'Unknown'}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold text-gray-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <LogOut className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-white" aria-hidden="true" />
                            Sign out
                        </button>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-700"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Menu className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
                        ScheduleLab
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto bg-gray-50 focus:outline-none">
                    <UserRoleContext.Provider value={userRole}>
                        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            {children}
                        </div>
                    </UserRoleContext.Provider>
                </main>
            </div>
        </div>
    );
}
