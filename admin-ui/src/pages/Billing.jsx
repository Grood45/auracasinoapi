import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Receipt, Plus, Search, Filter, Download,
    CheckCircle2, Clock, AlertCircle, FileText,
    ExternalLink, RefreshCw, IndianRupee, User,
    Calendar, MoreVertical, XCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Billing() {
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newInvoice, setNewInvoice] = useState({
        clientId: '',
        billingPeriod: '',
        amountDue: 0,
        amountPaid: 0,
        paymentMode: 'Bank Transfer',
        transactionRef: '',
        remarks: ''
    });

    const fetchBillingData = async () => {
        const token = localStorage.getItem('aura_token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [billingRes, clientsRes] = await Promise.all([
                axios.get('/v1/admin/billing', { headers }),
                axios.get('/v1/admin/clients', { headers })
            ]);
            setInvoices(billingRes.data);
            setClients(clientsRes.data);
        } catch (err) {
            console.error('Billing data fetch failed', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBillingData();
    }, []);

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/v1/admin/billing/create', newInvoice, {
                headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
            });
            setModalOpen(false);
            setNewInvoice({
                clientId: '', billingPeriod: '', amountDue: 0,
                amountPaid: 0, paymentMode: 'Bank Transfer',
                transactionRef: '', remarks: ''
            });
            fetchBillingData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create invoice');
        }
    };
    const handleDownloadPDF = (inv) => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235);
        doc.text('AURA CASINO PROXY', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Official Service Invoice', 105, 28, { align: 'center' });
        doc.setDrawColor(230);
        doc.line(20, 35, 190, 35);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Invoice ID: ${inv.invoiceId}`, 20, 45);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 190, 45, { align: 'right' });
        doc.text(`Partner: ${inv.client?.name || 'Valued Client'}`, 20, 55);
        doc.text(`Period: ${inv.billingPeriod}`, 20, 62);
        doc.autoTable({
            startY: 75,
            head: [['Description', 'Amount (INR)']],
            body: [
                ['Infrastructure & Proxy License Fee', `INR ${inv.amountDue.toLocaleString()}`],
                ['Security & IP Filtering Services', 'Included'],
                ['Support & Maintenance', 'Included']
            ],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`Total Amount Due: INR ${inv.amountDue.toLocaleString()}`, 190, finalY, { align: 'right' });
        doc.text(`Amount Paid: INR ${inv.amountPaid.toLocaleString()}`, 190, finalY + 7, { align: 'right' });
        doc.setFontSize(14);
        doc.setTextColor(inv.status === 'paid' ? [34, 197, 94] : [239, 68, 68]);
        doc.text(`BALANCE: INR ${inv.balance.toLocaleString()}`, 190, finalY + 17, { align: 'right' });
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('This is a computer-generated invoice. No signature required.', 105, 285, { align: 'center' });
        doc.save(`${inv.invoiceId}.pdf`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-success/10 text-success border-success/20';
            case 'partial': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
            case 'unpaid': return 'bg-error/10 text-error border-error/20';
            default: return 'bg-white/5 text-text-muted border-white/10';
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent">Billing & Invoices</h1>
                    <p className="text-text-muted mt-1">Manage client payments, generate invoices, and track revenue.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search invoice or client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 focus:border-primary focus:outline-none transition-all placeholder:text-text-muted/50 text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="bg-primary hover:bg-primary-hover px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Create Invoice
                    </button>
                </div>
            </header>

            {/* Invoices Table */}
            <div className="glass overflow-hidden rounded-[32px] border border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-text-muted text-[11px] uppercase tracking-widest font-bold">
                                <th className="px-6 py-5">Invoice ID</th>
                                <th className="px-6 py-5">Client Name</th>
                                <th className="px-6 py-5">Period</th>
                                <th className="px-6 py-5">Amount Due</th>
                                <th className="px-6 py-5">Paid</th>
                                <th className="px-6 py-5">Balance</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-20 text-center">
                                        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                                        <span className="text-text-muted italic">Loading financial records...</span>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (
                                <tr key={inv._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-mono font-bold tracking-tight">{inv.invoiceId}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                {inv.client?.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-sm font-medium">{inv.client?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-text-muted">{inv.billingPeriod}</td>
                                    <td className="px-6 py-4 text-sm font-bold">₹{inv.amountDue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-success">₹{inv.amountPaid.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-error">₹{inv.balance.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(inv.status)}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDownloadPDF(inv)}
                                            className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-20 text-center text-text-muted italic">
                                        No invoices found in the system.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Invoice Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="glass w-full max-w-2xl p-8 rounded-[40px] shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setModalOpen(false)} className="absolute top-8 right-8 text-text-muted hover:text-text transition-colors">
                            <XCircle className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <Receipt className="text-primary w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Generate New Invoice</h2>
                                <p className="text-text-muted text-sm">Create a manual bill for production clients.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateInvoice} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">Select Client</label>
                                    <select
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-primary focus:outline-none transition-all"
                                        value={newInvoice.clientId}
                                        onChange={e => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                                    >
                                        <option value="" disabled className="bg-bg">Choose Partner...</option>
                                        {clients.map(c => (
                                            <option key={c._id} value={c._id} className="bg-bg">{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">Billing Period</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-primary focus:outline-none transition-all"
                                        placeholder="e.g. Oct 2023"
                                        value={newInvoice.billingPeriod}
                                        onChange={e => setNewInvoice({ ...newInvoice, billingPeriod: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">Total Amount Due (₹)</label>
                                    <input
                                        type="number" required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-primary focus:outline-none transition-all text-lg font-bold"
                                        value={newInvoice.amountDue}
                                        onChange={e => setNewInvoice({ ...newInvoice, amountDue: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">Amount Paid Initial (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-primary focus:outline-none transition-all text-lg font-bold text-success"
                                        value={newInvoice.amountPaid}
                                        onChange={e => setNewInvoice({ ...newInvoice, amountPaid: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">Payment Mode</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-primary focus:outline-none transition-all"
                                        value={newInvoice.paymentMode}
                                        onChange={e => setNewInvoice({ ...newInvoice, paymentMode: e.target.value })}
                                    >
                                        <option value="Bank Transfer" className="bg-bg">Bank Transfer</option>
                                        <option value="USDT (Crypto)" className="bg-bg">USDT (Crypto)</option>
                                        <option value="Cash/Other" className="bg-bg">Cash/Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">Transaction Ref / ID</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-primary focus:outline-none transition-all"
                                        placeholder="UTR / TxHash"
                                        value={newInvoice.transactionRef}
                                        onChange={e => setNewInvoice({ ...newInvoice, transactionRef: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">Admin Remarks</label>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-primary focus:outline-none transition-all min-h-[100px]"
                                    placeholder="Internal notes for this invoice..."
                                    value={newInvoice.remarks}
                                    onChange={e => setNewInvoice({ ...newInvoice, remarks: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-8">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-bold transition-all text-sm text-text-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary hover:bg-primary-hover py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                                >
                                    Generate & Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
