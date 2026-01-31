import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    Users, ShieldCheck, UserCheck, Lock, Unlock,
    DollarSign, CreditCard, Wallet, Activity, Globe, Ban,
    History, TrendingUp, RefreshCw, Clock, Search, UserPlus
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function Dashboard() {
    const [ipAction, setIpAction] = useState({ ip: '', loading: false });

    // React Query for Dashboard Data
    const { data, isLoading: loading, error, refetch } = useQuery({
        queryKey: ['dashboardData'],
        queryFn: async () => {
            const token = localStorage.getItem('aura_token');
            const headers = { Authorization: `Bearer ${token}` };
            const [statsRes, chartRes, logsRes] = await Promise.all([
                axios.get('/v1/admin/stats', { headers }),
                axios.get('/v1/admin/charts/hits', { headers }),
                axios.get('/v1/admin/logs?limit=10', { headers })
            ]);
            return {
                stats: statsRes.data,
                chartData: chartRes.data,
                recentLogs: logsRes.data.logs
            };
        },
        refetchInterval: 5000,
        keepPreviousData: true
    });

    const stats = data?.stats || {
        totalClients: 0,
        demoClients: 0,
        productionClients: 0,
        demoIPCount: 0,
        productionIPCount: 0,
        blockedIPCount: 0,
        totalEarnings: 0,
        remainingBalance: 0,
        overallTotal: 0,
        totalUniqueIPRequests: 0,
        todayTotalHits: 0,
        newUsers24h: 0,
        recentUsers: []
    };
    const chartData = data?.chartData || [];
    const recentLogs = data?.recentLogs || [];

    const fetchDashboardData = () => refetch();

    const handleIpAction = async (status) => {
        if (!ipAction.ip) return;
        setIpAction(prev => ({ ...prev, loading: true }));
        try {
            const token = localStorage.getItem('aura_token');
            await axios.put('/v1/admin/ips/status',
                { ip: ipAction.ip, status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIpAction(prev => ({ ...prev, ip: '' }));
            refetch(); // Refresh immediately
            alert(`IP ${status === 'blocked' ? 'Blocked' : 'Unblocked'} successfully`);
        } catch (err) {
            alert(err.response?.data?.error || 'Action failed');
        } finally {
            setIpAction(prev => ({ ...prev, loading: false }));
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

    const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

    const pieData = [
        { name: 'Production', value: stats.productionClients },
        { name: 'Demo', value: stats.demoClients },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent">Live Dashboard</h1>
                    <p className="text-text-muted mt-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                        Real-time system monitoring
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchDashboardData}
                        className="glass p-2.5 rounded-xl hover:text-primary transition-colors group"
                    >
                        <RefreshCw className={`w-5 h-5 group-hover:rotate-180 transition-all duration-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="glass px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </header>

            {/* Section 1: Client Statistics */}
            <section>
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" /> Client Statistics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <DashboardCard label="Total Clients" value={stats.totalClients} icon={Users} color="text-blue-400" bg="bg-blue-400/10" loading={loading} />
                    <DashboardCard label="Production Clients" value={stats.productionClients} icon={ShieldCheck} color="text-purple-400" bg="bg-purple-400/10" loading={loading} />
                    <DashboardCard label="Demo Clients" value={stats.demoClients} icon={UserCheck} color="text-amber-400" bg="bg-amber-400/10" loading={loading} />
                    <DashboardCard label="New Users (24h)" value={stats.newUsers24h} icon={UserPlus} color="text-green-400" bg="bg-green-400/10" loading={loading} />
                </div>
            </section>

            {/* Section 2: Revenue & Balance */}
            <section>
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" /> Revenue & Balance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <DashboardCard label="Total Earnings" value={formatCurrency(stats.totalEarnings)} icon={Wallet} color="text-emerald-400" bg="bg-emerald-400/10" loading={loading} />
                    <DashboardCard label="Remaining Balance" value={formatCurrency(stats.remainingBalance)} icon={CreditCard} color="text-rose-400" bg="bg-rose-400/10" loading={loading} />
                    <DashboardCard label="Overall Total" value={formatCurrency(stats.overallTotal)} icon={DollarSign} color="text-cyan-400" bg="bg-cyan-400/10" loading={loading} />
                </div>
            </section>

            {/* Section 3: IP Management */}
            <section>
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-400" /> IP Management
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <DashboardCard label="Demo IPs" value={stats.demoIPCount} icon={Globe} color="text-indigo-400" bg="bg-indigo-400/10" loading={loading} />
                    <DashboardCard label="Production IPs" value={stats.productionIPCount} icon={ShieldCheck} color="text-violet-400" bg="bg-violet-400/10" loading={loading} />
                    <DashboardCard label="Blocked IPs" value={stats.blockedIPCount} icon={Ban} color="text-red-500" bg="bg-red-500/10" loading={loading} />

                    {/* Quick Block/Unblock Action */}
                    <div className="glass p-4 rounded-3xl flex flex-col justify-center gap-3">
                        <div className="text-sm font-semibold text-text-muted uppercase tracking-wider">Quick IP Action</div>
                        <input
                            type="text"
                            placeholder="Enter IP Address"
                            className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                            value={ipAction.ip}
                            onChange={(e) => setIpAction(prev => ({ ...prev, ip: e.target.value }))}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleIpAction('blocked')}
                                disabled={ipAction.loading || !ipAction.ip}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                <Lock className="w-3 h-3" /> Block
                            </button>
                            <button
                                onClick={() => handleIpAction('active')}
                                disabled={ipAction.loading || !ipAction.ip}
                                className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                <Unlock className="w-3 h-3" /> Unblock
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: Traffic & Security */}
            <section>
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" /> Traffic Analytics (Today)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DashboardCard label="Unique IP Requests" value={stats.totalUniqueIPRequests} icon={Users} color="text-orange-400" bg="bg-orange-400/10" loading={loading} />
                    <DashboardCard label="Total Hits" value={stats.todayTotalHits} icon={TrendingUp} color="text-pink-400" bg="bg-pink-400/10" loading={loading} />
                </div>
            </section>

            {/* Hits & Performance Charts (Kept as requested) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4">
                <div className="xl:col-span-2 glass p-6 rounded-[32px]">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-primary w-5 h-5" />
                        Hits Timeline (24h)
                    </h2>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="hour" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontSize: '12px' }} />
                                <Area type="monotone" dataKey="allowed" stroke="#10b981" fillOpacity={1} fill="url(#colorAllowed)" strokeWidth={2} />
                                <Area type="monotone" dataKey="blocked" stroke="#ef4444" fillOpacity={1} fill="url(#colorBlocked)" strokeWidth={2} />
                                <Legend />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass p-6 rounded-[32px]">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Users className="text-primary w-5 h-5" />
                        Client Distribution
                    </h2>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Section 1.5: Recent Users (Last 24 Hours) - Moved Here */}
            <section>
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-green-400" /> Recent Users (Last 24 Hours)
                    </h3>
                </div>
                <div className="glass overflow-hidden rounded-[32px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 text-text-muted text-[11px] uppercase tracking-widest font-bold">
                                    <th className="px-6 py-4">Username</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Start Date</th>
                                    <th className="px-6 py-4">IPs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.recentUsers && stats.recentUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                    {user.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{user.name}</div>
                                                    <div className="text-[10px] text-text-muted">ID: {user._id.slice(-6)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${user.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${user.clientType === 'production' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {user.clientType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-text-muted">
                                            {new Date(user.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white">
                                                {user.ipCount || 0}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!stats.recentUsers || stats.recentUsers.length === 0) && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-text-muted italic">No new users in the last 24 hours</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Activity Feed */}
            <div className="glass overflow-hidden rounded-[32px]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <History className="text-primary w-5 h-5" />
                        Recent Activities
                    </h2>
                    <button className="text-sm font-semibold text-primary hover:underline">View All Logs</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-text-muted text-[11px] uppercase tracking-widest font-bold">
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Endpoint</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 text-xs tabular-nums text-text-muted">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                {log.clientId?.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-sm font-medium">{log.clientId?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-text-muted">{log.ip || log.clientIp}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'allowed' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm max-w-[200px] truncate text-text-muted">{log.endpoint}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function DashboardCard({ label, value, icon: Icon, color, bg, loading }) {
    return (
        <div className="glass p-5 rounded-3xl glass-hover">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${bg} rounded-2xl`}>
                    <Icon className={`${color} w-6 h-6`} />
                </div>
                {loading && <div className="h-4 w-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />}
            </div>
            <div className="text-2xl font-bold mb-1 tracking-tight truncate">
                {loading ? <div className="h-8 w-16 bg-white/5 animate-pulse rounded" /> : value}
            </div>
            <div className="text-text-muted text-xs font-semibold uppercase tracking-wider">{label}</div>
        </div>
    );
}
