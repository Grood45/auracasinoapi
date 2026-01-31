import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Users, Plus, Trash2, ShieldCheck, ShieldAlert, Phone, Network,
    CreditCard, Calendar, Clock, Zap, Crown, UserPlus, Copy, RefreshCw,
    ExternalLink, CheckCircle2, XCircle, Search, Filter, MoreVertical,
    ChevronDown, ChevronUp, AlertCircle, Key, Globe as GlobeIcon, Globe,
    Server, Database, Info, FileText, Lock, Unlock, Edit, Settings, ChevronRight
} from 'lucide-react';

// --- Constants & Configuration ---
const API_PROVIDERS = [
    {
        id: 'aura-casino',
        name: 'Aura Casino',
        icon: Database,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        apis: [
            { id: 'game-lobby', name: 'Game Lobby API' },
            { id: 'html-streaming', name: 'HTML Streaming' },
            { id: 'odds-api', name: 'Odds API' },
            { id: 'exchange-lobby', name: 'Exchange Lobby API' },
            { id: 'exchange-event-odds', name: 'Exchange Event Odds API' },
            { id: 'past-results', name: 'Past Results API' },
            { id: 'player-proxy', name: 'Aura Streaming' }
        ]
    },
    {
        id: 'royal-gaming',
        name: 'Royal Gaming',
        icon: Crown,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        apis: [
            { id: 'table-list', name: 'Table List API' },
            { id: 'market-list', name: 'Markets API' },
            { id: 'round-result', name: 'Round Result API' },
            { id: 'websocket', name: 'WebSocket API' },
            { id: 'h5live-streaming', name: 'Royal Streaming' }
        ]
    },
    {
        id: 'sportradar',
        name: 'Sportradar',
        icon: Zap,
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10',
        apis: [
            { id: 'sports-list', name: 'Sports List' },
            { id: 'inplay-catalogues', name: 'Inplay Catalogues' },
            { id: 'upcoming-catalogues', name: 'Upcoming Catalogues' },
            { id: 'market-odds', name: 'Market Odds' },
            { id: 'event-counts', name: 'Event Counts' },
            { id: 'srl-inplay', name: 'SRL Inplay' },
            { id: 'srl-upcoming', name: 'SRL Upcoming' },
            { id: 'full-inplay-list', name: 'Full Inplay List' },
            { id: 'full-upcoming-list', name: 'Full Upcoming List' },
            { id: 'virtual-cricket', name: 'Virtual Cricket' },
            { id: 'virtual-basketball', name: 'Virtual Basketball' }
        ]
    },
    {
        id: 'king-exchange',
        name: 'King Exchange Sport',
        icon: Globe,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        apis: [
            { id: 'sports-list', name: 'Sports List' },
            { id: 'all-events', name: 'All Events' },
            { id: 'fancy-markets', name: 'Fancy Markets' },
            { id: 'ball-by-ball', name: 'Ball By Ball' },
            { id: 'event-markets', name: 'Event Markets' },
            { id: 'event-results', name: 'Event Results' },
            { id: 'lottery-list', name: 'Lottery Games' },
            { id: 'racing-events', name: 'Racing Events' }
        ]
    }
];

/**
 * Premium Modal Wrapper
 * Handles Portal, Click Outside, Escape Key, and Centering
 */
function Modal({ isOpen, onClose, children, maxWidth = 'max-w-md' }) {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-backdrop"
                onClick={onClose}
            />
            {/* Modal Content */}
            <div className={`relative w-full ${maxWidth} animate-zoom-in z-[100000]`}>
                {children}
            </div>
        </div>,
        document.body
    );
}

// --- Internal UI Components ---

function StatsCard({ label, value, icon: Icon, color }) {
    return (
        <div className="glass p-5 rounded-[24px] border border-white/5 shadow-lg group hover:border-white/10 transition-all">
            <div className={`w-10 h-10 ${color} bg-white/5 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all`}><Icon className="w-5 h-5" /></div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-60 tracking-tighter">{label}</div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick, danger }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all group/btn min-w-[55px] ${danger
                ? 'text-error/60 hover:bg-error/10 hover:text-error'
                : 'text-text-muted hover:bg-white/5 hover:text-primary'
                }`}
        >
            <Icon className="w-4 h-4 group-hover/btn:scale-110 transition-all" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
        </button>
    );
}

function InputField({ label, value, onChange, type = "text", placeholder }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 opacity-50">{label}</label>
            <input type={type} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-all placeholder:text-white/5 text-xs" value={value} onChange={e => onChange(e.target.value)} />
        </div>
    );
}

function TypeCard({ active, onClick, icon: Icon, title, desc, color = "blue" }) {
    return (
        <div onClick={onClick} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-2 group ${active
            ? (color === "blue" ? "bg-primary/15 border-primary shadow-lg shadow-primary/10" : "bg-purple-500/15 border-purple-500 shadow-lg shadow-purple-500/10")
            : "bg-white/5 border-white/5 hover:border-white/10"
            }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active
                ? (color === "blue" ? "bg-primary text-white" : "bg-purple-500 text-white")
                : "bg-white/10 text-text-muted"
                }`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <div className={`text-sm font-bold ${active ? 'text-white' : 'text-text-muted opacity-60'}`}>{title}</div>
                <div className="text-[10px] text-text-muted opacity-40 font-medium leading-tight">{desc}</div>
            </div>
        </div>
    );
}

function StatusBtn({ active, onClick, icon: Icon, label, color }) {
    const activeClass = color === 'success'
        ? 'bg-success/15 border-success text-success shadow-lg shadow-success/10'
        : 'bg-error/15 border-error text-error shadow-lg shadow-error/10';

    return (
        <div onClick={onClick} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-3 group ${active ? activeClass : 'bg-white/5 border-white/5 text-text-muted hover:border-white/10'
            }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${active
                ? (color === 'success' ? 'bg-success text-white' : 'bg-error text-white')
                : 'bg-white/10 opacity-30 group-hover:opacity-100'
                }`}>
                <Icon className="w-7 h-7" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
        </div>
    );
}

export default function Clients() {
    const handleDeleteClient = async () => {
        if (!clientToDelete) return;
        try {
            await axios.delete(`/v1/admin/clients/${clientToDelete._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` } });
            setDeleteModalOpen(false);
            setClientToDelete(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Deletion failed');
        }
    };

    const handleRemoveIp = async (ipId) => {
        try {
            await axios.delete(`/v1/admin/ips/${ipId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` } });

            // Local state update for smooth feel
            setClients(prev => prev.map(c => {
                if (c._id === ipClient._id) {
                    return { ...c, ips: (c.ips || []).filter(i => i._id !== ipId) };
                }
                return c;
            }));

            setIpClient(prev => ({
                ...prev,
                ips: (prev.ips || []).filter(i => i._id !== ipId)
            }));

            // Background refresh
            fetchData();
        } catch (err) {
            console.error(err);
            alert('IP removal failed');
        }
    };
    // --- State ---
    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState({
        newUsers24h: 0, totalClients: 0, demoClients: 0, productionClients: 0, totalIPs: 0
    });
    // const [loading, setLoading] = useState(true); // Replaced by React Query

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [ipModalOpen, setIpModalOpen] = useState(false);
    const [accessModalOpen, setAccessModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Selections
    const [statusClient, setStatusClient] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [ipClient, setIpClient] = useState(null);
    const [newIpInput, setNewIpInput] = useState('');
    const [accessClient, setAccessClient] = useState(null);
    const [tempPermissions, setTempPermissions] = useState([]);
    const [clientToDelete, setClientToDelete] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');

    // Edit/Create Form
    const [editingClient, setEditingClient] = useState(null);
    const [newClient, setNewClient] = useState({
        name: '', domain: '', status: 'active', isDemo: true, ips: [''],
        startDate: new Date().toISOString().split('T')[0], endDate: '',
    });

    // --- React Query ---
    const queryClient = useQueryClient();
    const { data, isLoading: loading, refetch } = useQuery({
        queryKey: ['clientsData'],
        queryFn: async () => {
            const token = localStorage.getItem('aura_token');
            const [clientsRes, statsRes] = await Promise.all([
                axios.get('/v1/admin/clients', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/v1/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            return {
                clients: clientsRes.data,
                stats: statsRes.data
            };
        },
        keepPreviousData: true
    });

    // Sync Query Data to Local State (Optional, or just use derived state)
    // For minimal refactor, we can derive vars or use effect to key sync if complex
    // But direct usage is better. However, existing code uses 'clients' state.
    // Let's replace 'clients' and 'stats' usage with derived data,
    // OR sync them via useEffect (easier for compatibility with existing mutators if not refactoring all)
    // Actually, creating derived vars is cleaner.

    useEffect(() => {
        if (data) {
            setClients(data.clients);
            setStats(data.stats);
        }
    }, [data]);

    const fetchData = () => {
        queryClient.invalidateQueries(['clientsData']); // Trigger background refetch
        refetch(); // or force refetch
    };

    // Body scroll lock
    useEffect(() => {
        if (modalOpen || accessModalOpen || statusModalOpen || ipModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [modalOpen, accessModalOpen, statusModalOpen, ipModalOpen]);

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('aura_token');
            const payload = { ...newClient, clientType: newClient.isDemo ? 'demo' : 'production' };
            if (editingClient) {
                delete payload.ips;
                await axios.put(`/v1/admin/clients/${editingClient._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                payload.ips = newClient.ips.filter(ip => ip.trim());
                await axios.post('/v1/admin/clients', payload, { headers: { Authorization: `Bearer ${token}` } });
            }
            setModalOpen(false); resetForm(); fetchData();
        } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    };

    const handleStatusUpdate = async () => {
        try {
            await axios.put(`/v1/admin/clients/${statusClient._id}`, { status: selectedStatus }, { headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` } });
            setStatusModalOpen(false); fetchData();
        } catch (err) { alert('Status Update Failed'); }
    };

    const handleAccessUpdate = async () => {
        try {
            await axios.put(`/v1/admin/clients/${accessClient._id}`, { apiPermissions: tempPermissions }, { headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` } });
            setAccessModalOpen(false); fetchData();
        } catch (err) { alert('Access Update Failed'); }
    };

    const handleAddIp = async () => {
        if (!newIpInput.trim()) return;
        try {
            await axios.post(`/v1/admin/clients/${ipClient._id}/ips`, { ip: newIpInput.trim() }, { headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` } });
            setNewIpInput(''); setIpModalOpen(false); fetchData();
        } catch (err) { alert('IP Add Failed'); }
    };

    const resetForm = () => {
        setNewClient({ name: '', domain: '', status: 'active', isDemo: true, ips: [''], startDate: new Date().toISOString().split('T')[0], endDate: '' });
    };

    return (
        <div className="min-h-screen relative">
            {/* Main Content */}
            <div className="p-4 sm:p-8 animate-fade-in space-y-8 pb-20">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent flex items-center gap-3">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            Partner Management
                        </h1>
                        <p className="text-text-muted mt-1 text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-success" />
                            Configure API credentials and provider access
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingClient(null); resetForm(); setModalOpen(true); }}
                        className="bg-primary hover:bg-primary-hover px-8 py-4 rounded-3xl font-bold transition-all shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 flex items-center gap-3 text-white"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add New Partner
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatsCard label="Last 24h" value={stats.newUsers24h} icon={Clock} color="text-blue-400" />
                    <StatsCard label="Total Users" value={stats.totalClients} icon={Users} color="text-success" />
                    <StatsCard label="Demo" value={stats.demoClients} icon={Zap} color="text-yellow-400" />
                    <StatsCard label="Production" value={stats.productionClients} icon={Crown} color="text-purple-400" />
                    <StatsCard label="Total IPs" value={stats.totalIPs} icon={Globe} color="text-primary" />
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {(clients || []).map((client) => {
                        const activeProviders = (client.apiPermissions || []).filter(p => p.enabled);
                        return (
                            <div key={client._id} className="glass rounded-[32px] p-6 border border-white/5 hover:border-primary/20 transition-all shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all"></div>
                                <div className="relative flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center font-bold text-xl border border-white/10 group-hover:scale-110 transition-all">{client.name?.charAt(0)}</div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white max-w-[140px] truncate">{client.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[11px] font-bold text-white/50 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 font-mono tracking-tighter shadow-inner">ID: {client.numericId}</span>
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(client.numericId); alert('Account ID Copied!'); }}
                                                    className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 transition-all border border-white/5 active:scale-95"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 shadow-sm ${client.status === 'active' ? 'bg-success/20 text-success border-success/30' : 'bg-error/20 text-error border-error/30'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px] ${client.status === 'active' ? 'bg-success shadow-success/50' : 'bg-error shadow-error/50'}`}></div>
                                        {client.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6 relative">
                                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="text-[10px] text-text-muted font-bold uppercase mb-1">Type</div>
                                        <div className={`text-xs font-bold ${client.clientType === 'production' ? 'text-purple-400' : 'text-yellow-400'}`}>{client.clientType?.toUpperCase()}</div>
                                    </div>
                                    <div
                                        className="bg-black/20 p-3 rounded-2xl border border-white/5 group/ip cursor-pointer hover:border-blue-500/30 transition-all shadow-inner"
                                        onClick={() => { setIpClient(client); setIpModalOpen(true); }}
                                    >
                                        <div className="text-[10px] text-text-muted font-bold uppercase mb-1 flex items-center justify-between">
                                            IPs
                                            <Globe className="w-3 h-3 opacity-30 group-hover/ip:opacity-100 transition-all" />
                                        </div>
                                        <div className="text-xs font-bold text-white">{client.ips?.length || 0} Whitelisted</div>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="text-[10px] text-text-muted font-bold uppercase mb-1">Days Left</div>
                                        <div className="text-xs font-bold text-white">{client.endDate ? Math.ceil((new Date(client.endDate) - (new Date())) / (1000 * 86400)) : '∞'}</div>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5 col-span-2 shadow-inner">
                                        <div className="text-[10px] text-text-muted font-bold uppercase mb-2">Enabled Providers</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {activeProviders.length > 0 ? activeProviders.map(p => (
                                                <span key={p.provider} className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg font-bold uppercase tracking-tighter">
                                                    {API_PROVIDERS.find(ap => ap.id === p.provider)?.name || p.provider} ({p.apis?.length})
                                                </span>
                                            )) : <span className="text-[10px] text-text-muted italic opacity-50">No Active APIs</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-4 border-t border-white/5 relative">
                                    <ActionButton icon={Edit} label="Update" onClick={() => {
                                        setEditingClient(client);
                                        setNewClient({
                                            name: client.name, domain: client.domain || '', status: client.status,
                                            isDemo: client.clientType === 'demo', ips: [''],
                                            startDate: client.startDate ? new Date(client.startDate).toISOString().split('T')[0] : '',
                                            endDate: client.endDate ? new Date(client.endDate).toISOString().split('T')[0] : ''
                                        });
                                        setModalOpen(true);
                                    }} />
                                    <ActionButton icon={Key} label="Access" onClick={() => { setAccessClient(client); setTempPermissions(client.apiPermissions || []); setAccessModalOpen(true); }} />
                                    <ActionButton icon={GlobeIcon} label="IPs" onClick={() => { setIpClient(client); setIpModalOpen(true); }} />
                                    <ActionButton
                                        icon={Trash2}
                                        label="Delete"
                                        onClick={() => { setClientToDelete(client); setDeleteModalOpen(true); }}
                                        danger
                                    />
                                    <div className="flex-1"></div>
                                    <ActionButton icon={ShieldCheck} label="Status" onClick={() => { setStatusClient(client); setSelectedStatus(client.status); setStatusModalOpen(true); }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- Modals --- */}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} maxWidth="max-w-md">
                <div className="glass rounded-[28px] border border-white/10 shadow-3xl overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center"><UserPlus className="text-primary w-4.5 h-4.5" /></div>
                            <div>
                                <h2 className="text-base font-bold text-white leading-none">{editingClient ? 'Update Partner' : 'Add Partner'}</h2>
                                <p className="text-[9px] text-text-muted mt-1 uppercase tracking-widest font-bold opacity-60">Account Config</p>
                            </div>
                        </div>
                        <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
                    </div>

                    <form onSubmit={handleCreateOrUpdate} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="User/Org Name" value={newClient.name} onChange={v => setNewClient({ ...newClient, name: v })} placeholder="Account Name" />
                            <InputField label="Domain" value={newClient.domain} onChange={v => setNewClient({ ...newClient, domain: v })} placeholder="domain.com" />
                            <InputField label="Start Date" type="date" value={newClient.startDate} onChange={v => setNewClient({ ...newClient, startDate: v })} />
                            <InputField label="End Date" type="date" value={newClient.endDate} onChange={v => setNewClient({ ...newClient, endDate: v })} />

                            <div className="col-span-1 sm:col-span-2 space-y-2 mt-2">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">Auth Level</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <TypeCard active={newClient.isDemo} onClick={() => setNewClient({ ...newClient, isDemo: true })} icon={Zap} title="Demo" desc="Testing only" />
                                    <TypeCard active={!newClient.isDemo} onClick={() => setNewClient({ ...newClient, isDemo: false })} icon={Crown} title="Prod" desc="Full Access" color="purple" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-xs text-text-muted bg-white/5 hover:bg-white/10 transition-all">Cancel</button>
                            <button type="submit" className="flex-1 bg-primary py-3 rounded-xl font-bold text-xs text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                {editingClient ? 'Update Changes' : 'Create Partner'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal isOpen={accessModalOpen} onClose={() => setAccessModalOpen(false)} maxWidth="max-w-lg">
                <div className="glass rounded-[28px] border border-white/10 shadow-3xl overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><Lock className="w-4.5 h-4.5" /></div>
                            <div>
                                <h2 className="text-base font-bold text-white leading-none">API Access</h2>
                                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">{accessClient?.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setAccessModalOpen(false)} className="text-text-muted hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
                    </div>

                    <div className="p-5 max-h-[55vh] overflow-y-auto custom-scrollbar space-y-3">
                        {API_PROVIDERS.map((provider) => {
                            const perm = tempPermissions.find(p => p.provider === provider.id) || { provider: provider.id, enabled: false, apis: [] };
                            return (
                                <div key={provider.id} className="space-y-3">
                                    <div
                                        onClick={() => {
                                            const exists = tempPermissions.find(p => p.provider === provider.id);
                                            let next;
                                            if (exists) next = tempPermissions.map(p => p.provider === provider.id ? { ...p, enabled: !p.enabled } : p);
                                            else next = [...tempPermissions, { provider: provider.id, enabled: true, apis: [] }];
                                            setTempPermissions(next);
                                        }}
                                        className={`p-5 rounded-[24px] border transition-all cursor-pointer flex items-center justify-between ${perm.enabled ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/5' : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 ${provider.bg} ${provider.color} rounded-2xl flex items-center justify-center border border-white/5`}>
                                                <provider.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{provider.name}</div>
                                                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{perm.enabled ? `${perm.apis.length} APIs active` : 'Disabled'}</div>
                                            </div>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-all ${perm.enabled ? 'bg-primary' : 'bg-white/10'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${perm.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                    </div>

                                    {perm.enabled && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {provider.apis.map(api => (
                                                <div
                                                    key={api.id}
                                                    onClick={() => {
                                                        const next = tempPermissions.map(p => {
                                                            if (p.provider === provider.id) {
                                                                const apis = p.apis.includes(api.id) ? p.apis.filter(a => a !== api.id) : [...p.apis, api.id];
                                                                return { ...p, apis };
                                                            }
                                                            return p;
                                                        });
                                                        setTempPermissions(next);
                                                    }}
                                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${perm.apis.includes(api.id) ? 'border-primary/30 bg-primary/5' : 'bg-black/20 border-white/5 hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${perm.apis.includes(api.id) ? 'bg-primary border-primary text-white' : 'border-white/20'
                                                        }`}>
                                                        {perm.apis.includes(api.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <span className={`text-[11px] font-bold ${perm.apis.includes(api.id) ? 'text-white' : 'text-text-muted'}`}>{api.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-8 bg-white/5 border-t border-white/5 flex items-center justify-between">
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            <span className="text-white">{tempPermissions.filter(p => p.enabled).length}</span> Providers ACTIVE
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setAccessModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-text-muted hover:text-white transition-all">Cancel</button>
                            <button onClick={handleAccessUpdate} className="px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Save Permissions</button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} maxWidth="max-w-[320px]">
                <div className="glass p-6 rounded-[28px] border border-white/10 shadow-3xl relative text-center">
                    <button onClick={() => setStatusModalOpen(false)} className="absolute top-5 right-5 text-text-muted hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
                    <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3 shadow-xl ${selectedStatus === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-0.5">Quick Status</h2>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mb-5 opacity-50">{statusClient?.name}</p>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <StatusBtn active={selectedStatus === 'active'} onClick={() => setSelectedStatus('active')} icon={CheckCircle2} label="Active" color="success" />
                        <StatusBtn active={selectedStatus === 'blocked'} onClick={() => setSelectedStatus('blocked')} icon={ShieldAlert} label="Suspend" color="error" />
                    </div>

                    <button onClick={handleStatusUpdate} className="w-full bg-primary py-3.5 rounded-xl font-bold text-xs text-white shadow-lg hover:scale-[1.02] active:scale-95 transition-all">Apply Changes</button>
                </div>
            </Modal>

            <Modal isOpen={ipModalOpen} onClose={() => setIpModalOpen(false)} maxWidth="max-w-[320px]">
                <div className="glass rounded-[28px] border border-white/10 shadow-3xl overflow-hidden">
                    <div className="p-5 bg-white/5 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center"><Globe className="w-4.5 h-4.5" /></div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Whitelist</h3>
                                <p className="text-[8px] text-text-muted uppercase font-bold tracking-widest mt-0.5 opacity-50">Secure Access</p>
                            </div>
                        </div>
                        <button onClick={() => setIpModalOpen(false)} className="text-text-muted hover:text-white transition-colors"><XCircle className="w-5 h-5" /></button>
                    </div>
                    <div className="p-5 space-y-3.5">
                        <div className="max-h-[200px] overflow-y-auto space-y-2 custom-scrollbar">
                            {(ipClient?.ips || []).map(ip => (
                                <div key={ip._id} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl group">
                                    <span className="font-mono text-xs font-bold text-white/90">{ip.ip}</span>
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { navigator.clipboard.writeText(ip.ip); alert('Copied'); }} className="p-1.5 rounded-lg bg-white/5 text-text-muted hover:text-primary transition-all"><Copy className="w-3 h-3" /></button>
                                        <button
                                            onClick={() => handleRemoveIp(ip._id)}
                                            className="p-1.5 rounded-lg bg-white/5 text-text-muted hover:text-error transition-all"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <input className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-primary/50 transition-all" placeholder="Add IP Address" value={newIpInput} onChange={e => setNewIpInput(e.target.value)} />
                            <button onClick={handleAddIp} className="bg-primary px-4 py-2.5 rounded-xl font-bold text-xs text-white hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">Add</button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="max-w-[320px]">
                <div className="glass p-6 rounded-[28px] border border-white/10 shadow-3xl text-center">
                    <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-error" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Delete Partner?</h3>
                    <p className="text-sm text-text-muted mb-6">Are you sure you want to delete <span className="text-white font-medium">{clientToDelete?.name}</span>? This action cannot be undone.</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleDeleteClient}
                            className="w-full py-3 bg-error hover:bg-error/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-error/20"
                        >
                            Yes, Delete
                        </button>
                        <button
                            onClick={() => setDeleteModalOpen(false)}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

