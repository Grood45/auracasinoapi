import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, UserPlus, Shield, Globe as GlobeIcon,
    History as HistoryIcon, Receipt, Settings as SettingsIcon,
    LogOut, Activity as ActivityIcon, BookOpen, ChevronRight,
    ChevronLeft, Menu as MenuIcon, X as XIcon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ setToken }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Account Partners', icon: Users, path: '/clients' },
        { name: 'Activity Audit', icon: HistoryIcon, path: '/logs' },
        { name: 'Financials', icon: Receipt, path: '/billing' },
        { name: 'Security Core', icon: SettingsIcon, path: '/security' },
        { name: 'API Documentation', icon: BookOpen, path: '/docs' },
    ];


    const handleLogout = () => {
        setToken(null);
        navigate('/login');
    };

    const NavContent = ({ isCompact }) => (
        <div className="flex flex-col h-full">
            <div className={`flex items-center ${isCompact ? 'justify-center' : 'px-2'} mb-10 transition-all duration-300`}>
                <div className="relative">
                    <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md animate-pulse"></div>
                    <ActivityIcon className="text-primary w-8 h-8 relative" />
                </div>
                {!isCompact && (
                    <span className="text-xl font-bold tracking-tight ml-3 animate-fade-in whitespace-nowrap">
                        Aura <span className="text-primary">Proxy</span>
                    </span>
                )}
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.name}
                            onClick={() => {
                                navigate(item.path);
                                setIsMobileOpen(false);
                            }}
                            className={`w-full flex items-center ${isCompact ? 'justify-center' : 'px-4'} py-3.5 rounded-2xl transition-all group relative ${isActive
                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                                : 'text-text-muted hover:text-text hover:bg-white/5'
                                }`}
                            title={isCompact ? item.name : ''}
                        >
                            <item.icon className={`w-5 h-5 min-w-[20px] ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                            {!isCompact && <span className="font-medium text-[15px] ml-4 animate-fade-in whitespace-nowrap">{item.name}</span>}
                            {isCompact && isActive && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"></div>}
                        </button>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center ${isCompact ? 'justify-center' : 'px-4'} py-3.5 rounded-2xl text-error hover:bg-error/10 transition-all group`}
                    title={isCompact ? 'Logout' : ''}
                >
                    <LogOut className="w-5 h-5 min-w-[20px] group-hover:translate-x-1 transition-transform" />
                    {!isCompact && <span className="font-medium ml-4">Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass z-40 flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="text-primary w-6 h-6" />
                    <span className="font-bold">Aura Proxy</span>
                </div>
                <button onClick={() => setIsMobileOpen(true)} className="p-2 text-text-muted">
                    <MenuIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Drawer */}
            <div className={`fixed inset-0 z-50 lg:hidden transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
                <aside className="absolute left-0 top-0 bottom-0 w-72 glass flex flex-col p-6 border-none">
                    <button onClick={() => setIsMobileOpen(false)} className="absolute top-6 right-6 p-2 text-text-muted">
                        <XIcon className="w-6 h-6" />
                    </button>
                    <NavContent isCompact={false} />
                </aside>
            </div>

            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex transition-all duration-300 ease-in-out glass border-none rounded-r-[32px] m-4 mr-0 p-6 flex-col h-[calc(100vh-32px)] sticky top-4 ${isExpanded ? 'w-72' : 'w-24'}`}
                onMouseEnter={() => !isExpanded && setIsExpanded(true)}
                onMouseLeave={() => isExpanded && setIsExpanded(false)}
            >
                <NavContent isCompact={!isExpanded} />
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white border-4 border-bg hover:scale-110 transition-all z-50"
                >
                    {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            </aside>
        </>
    );
}
