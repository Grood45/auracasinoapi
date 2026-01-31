import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    Activity, Shield, ShieldAlert, Globe, Clock, Search, Filter,
    ChevronLeft, ChevronRight, RefreshCw, XCircle, AlertTriangle,
    CheckCircle, Lock, Eye, Code, Terminal, Server, Zap, Database, FileJson, Download
} from 'lucide-react';
import { useRealTimeLogs } from '../hooks/useRealTimeLogs';

export default function Logs() {
    // --- State ---
    const [logs, setLogs] = useState([]);
    const [aggregates, setAggregates] = useState({
        avgResponseTime: 0,
        uniqueIPsCount: 0,
        activeWhitelistedIPs: 0,
        unauthorizedIPsCount: 0
    });
    const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20, pages: 1 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        method: 'All',
        status: 'All',
        whitelistStatus: 'All',
        startDate: '',
        endDate: '',
        minDuration: 0,
        maxDuration: 2000
    });

    // Modals
    const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);
    const [selectedIP, setSelectedIP] = useState(null); // For IP Details Modal
    const [jsonLog, setJsonLog] = useState(null); // For JSON Review

    // --- Data Fetching ---
    // --- React Query ---
    const { data, isLoading: queryLoading, refetch } = useQuery({
        queryKey: ['logsData', pagination.page, filters],
        queryFn: async () => {
            const params = {
                page: pagination.page,
                limit: 20,
                ...filters
            };
            Object.keys(params).forEach(key => {
                if (params[key] === 'All' || params[key] === '') delete params[key];
            });

            const res = await axios.get('/v1/admin/logs', {
                params,
                headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
            });
            return res.data;
        },
        keepPreviousData: true
    });

    useEffect(() => {
        if (data) {
            setLogs(data.logs);
            setPagination(data.pagination);
            if (data.aggregates) {
                setAggregates(prev => ({ ...prev, ...data.aggregates }));
            }
            setLoading(false);
        }
    }, [data]);

    const fetchLogs = (page) => {
        if (page) setPagination(prev => ({ ...prev, page }));
    };

    // --- Real-Time Update ---
    useRealTimeLogs((newLog) => {
        setLogs(prev => {
            const updated = [newLog, ...prev];
            if (updated.length > 20) updated.pop();
            return updated;
        });
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
        setAggregates(prev => ({
            ...prev,
            unauthorizedIPsCount: newLog.status === 'blocked' ? prev.unauthorizedIPsCount + 1 : prev.unauthorizedIPsCount,
            avgResponseTime: Math.round(((prev.avgResponseTime * prev.uniqueIPsCount) + newLog.responseTime) / (prev.uniqueIPsCount + 1))
        }));
    });

    // --- Actions ---
    const handleBlockIP = async (ip) => {
        if (!confirm(`Are you sure you want to BLOCK IP ${ip}? This will deny all future requests.`)) return;
        try {
            await axios.put('/v1/admin/ips/status', { ip, status: 'blocked' }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
            });
            alert(`IP ${ip} has been blocked.`);
            fetchLogs(pagination.page, true);
            if (selectedIP) setSelectedIP(null);
        } catch (err) {
            alert('Failed to block IP');
        }
    };

    // --- Render Helpers ---
    const getMethodColor = (method) => {
        switch (method) {
            case 'GET': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'POST': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'PUT': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-white/5 text-text-muted border-white/5';
        }
    };

    const getStatusBadge = (code, status) => {
        if (status === 'blocked' || code === 403) return <span className="inline-flex items-center gap-1.5 bg-error/10 text-error px-2.5 py-1 rounded-lg border border-error/20 text-[10px] font-bold uppercase tracking-wider"><ShieldAlert className="w-3 h-3" /> Blocked</span>;
        if (code >= 500) return <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-lg border border-orange-500/20 text-[10px] font-bold uppercase tracking-wider"><AlertTriangle className="w-3 h-3" /> Error</span>;
        return <span className="inline-flex items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-lg border border-success/20 text-[10px] font-bold uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> 200 OK</span>;
    };

    const getDurationColor = (ms) => {
        if (ms < 200) return 'text-success';
        if (ms < 800) return 'text-warning';
        return 'text-error';
    };

    return (
        <>
            <div className="space-y-8 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent">Activity Audit</h1>
                        <p className="text-text-muted mt-1 text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" /> Live Traffic Inspector
                        </p>
                    </div>
                    <button
                        onClick={() => setWhitelistModalOpen(true)}
                        className="bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all border border-white/10 hover:border-primary/30 flex items-center gap-2 shadow-lg hover:shadow-primary/10"
                    >
                        <Shield className="w-4 h-4 text-success" /> Whitelist Management
                    </button>
                </div>

                {/* Top Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatsCard label="Total Requests" value={pagination.total} icon={Database} color="text-primary" />
                    <StatsCard label="Avg Response" value={`${Math.round(aggregates.avgResponseTime || 0)}ms`} icon={Zap} color="text-amber-400" />
                    <StatsCard label="Unique IPs" value={aggregates.uniqueIPsCount || 0} icon={Globe} color="text-blue-400" />
                    <StatsCard label="Whitelisted" value={aggregates.activeWhitelistedIPs || 0} icon={CheckCircle} color="text-success" />
                    <StatsCard label="Unauthorized" value={aggregates.unauthorizedIPsCount || 0} icon={ShieldAlert} color="text-error" />
                </div>

                {/* Filters */}
                <div className="glass p-5 rounded-[24px] border border-white/5 space-y-4 shadow-xl">
                    <div className="flex items-center gap-2 text-sm font-bold text-text-muted uppercase tracking-widest mb-2">
                        <Filter className="w-4 h-4 text-primary" /> Advanced Filtering
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="lg:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text" placeholder="Search IP, Endpoint, or Client..."
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none placeholder:text-text-muted/50 transition-colors"
                                value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <select
                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                            value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value })}
                        >
                            <option value="All">All Methods</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                        <select
                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                            value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="All">All Status</option>
                            <option value="allowed">Allowed (200)</option>
                            <option value="blocked">Blocked (403)</option>
                            <option value="500">Error (500)</option>
                        </select>
                        <input
                            type="date"
                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none cursor-pointer"
                            value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        />
                        <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 py-2">
                            <span className="text-xs text-text-muted whitespace-nowrap font-mono w-16">{'<'} {filters.maxDuration}ms</span>
                            <input
                                type="range" min="0" max="2000" step="100"
                                value={filters.maxDuration}
                                onChange={e => setFilters({ ...filters, maxDuration: e.target.value })}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="glass rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 text-text-muted text-[11px] uppercase tracking-widest font-bold border-b border-white/5">
                                    <th className="px-6 py-4">Client / IP</th>
                                    <th className="px-6 py-4">Request Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4 text-right">Latency</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-colors">
                                                    <Globe className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white font-mono">{log.clientIp}</div>
                                                    <div className="text-[10px] text-text-muted">{log.clientId?.name || 'Unknown Client'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getMethodColor(log.method)}`}>
                                                        {log.method}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono text-text-muted/80 truncate max-w-[300px]" title={log.endpoint}>
                                                    {log.endpoint}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(log.statusCode, log.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-text-muted" />
                                                <div className="text-xs font-medium text-text-muted tabular-nums">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-text-muted/50 pl-5">{new Date(log.timestamp).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`text-sm font-bold tabular-nums ${getDurationColor(log.responseTime)}`}>
                                                {log.responseTime}ms
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setJsonLog(log)}
                                                    className="p-2 bg-white/5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all border border-transparent hover:border-primary/20"
                                                    title="View JSON"
                                                >
                                                    <FileJson className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedIP({ ip: log.clientIp, ...log })}
                                                    className="p-2 bg-white/5 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-white/20"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {log.status !== 'blocked' && (
                                                    <button
                                                        onClick={() => handleBlockIP(log.clientIp)}
                                                        className="p-2 bg-error/5 text-error/70 hover:text-error hover:bg-error/10 rounded-lg transition-all border border-transparent hover:border-error/20"
                                                        title="Block IP"
                                                    >
                                                        <Lock className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-between items-center p-4 border-t border-white/5 bg-white/[0.02]">
                        <div className="text-xs text-text-muted font-bold tracking-widest uppercase">Page {pagination.page} of {pagination.pages}</div>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={pagination.page >= pagination.pages} onClick={() => fetchLogs(pagination.page + 1)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>



            {/* --- MODALS --- */}

            {/* Whitelist Modal */}
            {
                whitelistModalOpen && (
                    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in custom-scrollbar">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 lg:p-8">
                            <div
                                className="glass w-full max-w-lg p-0 rounded-[32px] shadow-2xl relative text-left transform transition-all border border-white/10 overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                    <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="text-success w-5 h-5" /> Whitelist Manager</h2>
                                    <button onClick={() => setWhitelistModalOpen(false)} className="text-text-muted hover:text-white transition-colors"><XCircle className="w-6 h-6" /></button>
                                </div>
                                <div className="p-8">
                                    <div className="text-center py-10">
                                        <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                        <p className="text-text-muted text-sm">
                                            Manage your Account Partner IPs from the <br />
                                            <span className="text-white font-bold">Account Partners</span> section.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* IP Details Modal */}
            {
                selectedIP && (
                    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in custom-scrollbar">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 lg:p-8">
                            <div
                                className="glass w-full max-w-2xl p-0 rounded-[40px] shadow-2xl relative text-left transform transition-all border border-white/10 overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="h-32 bg-gradient-to-r from-primary/20 to-blue-500/20 relative flex items-center justify-center">
                                    <button onClick={() => setSelectedIP(null)} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10"><XCircle className="w-8 h-8" /></button>
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-white mb-1 tracking-tight font-mono">{selectedIP.clientIp}</div>
                                        <div className="text-sm font-bold uppercase tracking-widest text-white/60">IP Address Inspector</div>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <div className="p-8 space-y-8 bg-[#0f172a]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-text-muted">
                                                <Server className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Client</div>
                                                <div className="text-lg font-bold text-white">{selectedIP.clientId?.name || 'Unknown / Public'}</div>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl border ${selectedIP.status === 'allowed' ? 'bg-success/10 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error'}`}>
                                            <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                {selectedIP.status === 'allowed' ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                                {selectedIP.status}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2">Geolocation</div>
                                            <div className="flex items-center gap-2 text-white">
                                                <Globe className="w-4 h-4 text-blue-400" />
                                                <span>Unknown Location</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="text-xs text-text-muted uppercase font-bold tracking-widest mb-2">First Seen</div>
                                            <div className="flex items-center gap-2 text-white">
                                                <Clock className="w-4 h-4 text-amber-400" />
                                                <span>{new Date(selectedIP.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 mt-8">
                                        {selectedIP.status !== 'blocked' && (
                                            <button
                                                onClick={() => handleBlockIP(selectedIP.clientIp)}
                                                className="flex-1 py-4 bg-error text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-error/20"
                                            >
                                                <Lock className="w-5 h-5" /> BLOCK IP ACCESS
                                            </button>
                                        )}
                                        <button className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all">
                                            View Full History
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* JSON Viewer Modal */}
            {
                jsonLog && (
                    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in custom-scrollbar">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 lg:p-8">
                            <div
                                className="glass w-full max-w-4xl p-0 rounded-[32px] shadow-2xl relative text-left transform transition-all border border-white/10 overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                    <h2 className="text-xl font-bold flex items-center gap-2 font-mono"><Code className="text-primary w-5 h-5" /> Log Payload</h2>
                                    <button onClick={() => setJsonLog(null)} className="text-text-muted hover:text-white transition-colors"><XCircle className="w-6 h-6" /></button>
                                </div>
                                <div className="overflow-auto bg-[#0d1117] p-6 relative group max-h-[70vh]">
                                    <pre className="text-sm font-mono text-blue-300 leading-relaxed">
                                        <code>
                                            {jsonLog.requestBody && (
                                                <>
                                                    <span className="text-amber-400 font-bold">--- REQUEST BODY ---</span>
                                                    {'\n'}
                                                    {typeof jsonLog.requestBody === 'object' ? JSON.stringify(jsonLog.requestBody, null, 2) : jsonLog.requestBody}
                                                    {'\n\n'}
                                                </>
                                            )}
                                            {jsonLog.responseBody && (
                                                <>
                                                    <span className="text-green-400 font-bold">--- RESPONSE BODY ---</span>
                                                    {'\n'}
                                                    {typeof jsonLog.responseBody === 'object' ? JSON.stringify(jsonLog.responseBody, null, 2) : jsonLog.responseBody}
                                                    {'\n\n'}
                                                </>
                                            )}
                                            <span className="text-text-muted font-bold">--- FULL LOG METADATA ---</span>
                                            {'\n'}
                                            {JSON.stringify(jsonLog, null, 2)}
                                        </code>
                                    </pre>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(JSON.stringify(jsonLog, null, 2))}
                                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg text-text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copy JSON"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

        </>
    );
}

function StatsCard({ label, value, icon: Icon, color }) {
    return (
        <div className="glass p-5 rounded-[24px] border border-white/5 hover:border-primary/20 transition-all hover:-translate-y-1 shadow-lg hover:shadow-primary/5">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-2xl bg-white/5 ${color} bg-opacity-10 backdrop-blur-xl`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
            <div className="text-2xl font-bold pb-1 text-white">{value}</div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-70">{label}</div>
        </div>
    );
}
