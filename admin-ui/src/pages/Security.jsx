import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShieldCheck, HardDrive, Monitor, Globe as GlobeIcon, Trash2,
    UserCog, Lock as LockIcon, Smartphone, Laptop, Clock,
    RefreshCw, AlertCircle, Key, LogOut, XCircle
} from 'lucide-react';

export default function Security() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirm: '' });

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/v1/admin/sessions', {
                headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
            });
            setSessions(res.data);
        } catch (err) {
            console.error('Session fetch failed', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (passData.newPassword !== passData.confirm) return alert('Passwords do not match');
        try {
            await axios.post('/v1/admin/reset-password', passData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
            });
            alert('Password changed. All devices logged out.');
            localStorage.removeItem('aura_token');
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.error || 'Update failed');
        }
    };

    const logoutSession = async (id) => {
        await axios.delete(`/v1/admin/sessions/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
        });
        fetchSessions();
    };

    const logoutAll = async () => {
        if (!confirm('Security Warning: Logout all other active devices?')) return;
        await axios.delete('/v1/admin/sessions/all', {
            headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
        });
        fetchSessions();
    };

    return (
        <div className="space-y-12 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent">Security & Governance</h1>
                <p className="text-text-muted mt-1">Manage active credentials, authorized devices, and access tokens.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Password Management */}
                <div className="glass p-10 rounded-[40px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <LockIcon className="w-32 h-32" />
                    </div>
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <Key className="text-primary w-6 h-6" />
                        </div>
                        Authentication Secrets
                    </h2>
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted ml-1">Current Password</label>
                            <input
                                type="password" required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-primary focus:outline-none transition-all placeholder:text-text-muted/30"
                                placeholder="••••••••••••"
                                value={passData.currentPassword}
                                onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted ml-1">New Password</label>
                            <input
                                type="password" required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-primary focus:outline-none transition-all placeholder:text-text-muted/30"
                                placeholder="New ultra-secure code"
                                value={passData.newPassword}
                                onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted ml-1">Confirm Identity</label>
                            <input
                                type="password" required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-primary focus:outline-none transition-all placeholder:text-text-muted/30"
                                placeholder="Repeat new password"
                                value={passData.confirm}
                                onChange={e => setPassData({ ...passData, confirm: e.target.value })}
                            />
                        </div>
                        <button className="bg-primary hover:bg-primary-hover w-full py-4 rounded-2xl font-bold mt-4 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest">
                            Rotate Access Key
                        </button>
                    </form>
                </div>

                {/* Session Guard */}
                <div className="glass p-10 rounded-[40px] flex flex-col">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-4">
                                <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center">
                                    <ShieldCheck className="text-success w-6 h-6" />
                                </div>
                                Authorized Sessions
                            </h2>
                            <p className="text-text-muted text-xs mt-2 uppercase tracking-widest font-bold">Monitor live administrator devices</p>
                        </div>
                        <button
                            onClick={logoutAll}
                            className="bg-error/10 text-error hover:bg-error/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-error/20 flex items-center gap-2"
                        >
                            <LogOut className="w-3 h-3" />
                            Purge All
                        </button>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                <RefreshCw className="w-10 h-10 animate-spin mb-4" />
                                <span className="text-sm font-bold tracking-widest uppercase">Validating Tokens...</span>
                            </div>
                        ) : sessions.map((s) => (
                            <div key={s.id} className="p-5 bg-white/5 border border-white/5 rounded-[24px] flex items-center gap-5 transition-all hover:bg-white/[0.08] group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.isCurrent ? 'bg-primary/20 text-primary' : 'bg-white/5 text-text-muted'
                                    }`}>
                                    {s.userAgent.includes('Mobile') ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg tabular-nums truncate">{s.ip}</span>
                                        {s.isCurrent && (
                                            <span className="text-[10px] font-black bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-tighter">Your Device</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        Last Action: {new Date(s.lastActive).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-text-muted/40 font-mono truncate" title={s.userAgent}>{s.userAgent}</div>
                                </div>
                                {!s.isCurrent && (
                                    <button
                                        onClick={() => logoutSession(s.id)}
                                        className="p-3 bg-white/5 hover:bg-error/10 text-text-muted hover:text-error rounded-xl transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                        title="Revoke Access"
                                    >
                                        <Trash2 className="w-5 h-5 transition-transform active:scale-90" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 flex items-start gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                        <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-text mb-1 uppercase tracking-widest">Security Protocol</h4>
                            <p className="text-xs text-text-muted leading-relaxed">
                                Sessions are automatically terminated after 24 hours of inactivity. Changing your security code will invalidate all existing sessions across all browsers.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
