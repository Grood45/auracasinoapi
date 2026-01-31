import React, { useState } from 'react';
import { BookOpen, Trophy, Gamepad2, Download, Copy, Check, ExternalLink, Code2, ShieldCheck, Globe, Crown, X, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function APIDocs() {
    const [activeTab, setActiveTab] = useState('aura');
    const [copiedId, setCopiedId] = useState(null);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [selectedDocs, setSelectedDocs] = useState({
        aura: true,
        king: true,
        royal: true,
        sportradar: true
    });

    const domain = 'https://fastodds.online';

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const auraEndpoints = [
        { name: 'Game Lobby', method: 'GET', path: '/v1/allgamelobby', desc: 'Get list of all Aura Casino providers and game categories' },
        { name: 'Stream Game', method: 'GET', path: '/v1/auracasino/:gameId', desc: 'Get the HTML streaming iframe for a specific gameId', params: 'gameId' },
        { name: 'Game Odds', method: 'GET', path: '/v1/auracasino/odds/:gameId', desc: 'Get real-time odds for a specific game', params: 'gameId' },
        { name: 'Exchange Lobby', method: 'GET', path: '/v1/auracasino/exchange/lobby', desc: 'Get Exchange games lobby data' },
        { name: 'Exchange Odds', method: 'GET', path: '/v1/auracasino/exchange/odds/:exchangeId/:gameId', desc: 'Get Exchange event odds', params: 'exchangeId, gameId' },
        { name: 'Past Results', method: 'GET', path: '/v1/auracasino/post_results/:gameId', desc: 'Get past results history for a game', params: 'gameId' },
        { name: 'Player Proxy', method: 'GET', path: '/v1/auracasino/player/:gameId', desc: 'Internal proxy for streaming content (Advanced integration)', params: 'gameId' },
    ];

    const kingExchangeEndpoints = [
        { name: 'Sports List', method: 'GET', path: '/v1/sports/list', desc: 'Get all available sports (Cricket, Soccer, Tennis, etc.)' },
        { name: 'All Events', method: 'GET', path: '/v1/sports/all-events', desc: 'Get list of all active matches/events across all sports' },
        { name: 'Event Results', method: 'GET', path: '/v1/sports/event-results/:eventId', desc: 'Get detailed score and results for a specific event', params: 'eventId (Path or Query)' },
        { name: 'Fancy Markets', method: 'GET', path: '/v1/sports/fancy-markets', desc: 'Get all fancy/bookmaker markets for sports' },
        { name: 'Ball By Ball', method: 'GET', path: '/v1/sports/ball-by-ball/:sportId/:eventId', desc: 'Live ball-by-ball commentary and status data', params: 'sportId, eventId' },
        { name: 'Event Markets', method: 'GET', path: '/v1/sports/event-markets/:sportId/:eventId', desc: 'Get all betting markets for a specific match', params: 'sportId, eventId' },
        { name: 'Lottery Games', method: 'GET', path: '/v1/sports/lottery-list', desc: 'Get list of available lottery and numbers games' },
        { name: 'Racing Events', method: 'GET', path: '/v1/sports/racing-events', desc: 'Get upcoming Horse Racing and Greyhound events' },
    ];

    const royalEndpoints = [
        { name: 'Active Tables', method: 'GET', path: '/v1/royal/tables', desc: 'Get list of all active Royal Gaming tables' },
        { name: 'Table Markets', method: 'GET', path: '/v1/royal/markets', desc: 'Get current markets/odds for a table', params: 'gameId, tableId (Query)' },
        { name: 'Round Result', method: 'GET', path: '/v1/royal/round-result', desc: 'Get detailed result of a specific round', params: 'gameId, tableId, roundId (Query)' },
        { name: 'Live Stream', method: 'GET', path: '/v1/royal/player', desc: 'Watch live stream (Returns HTML Player)', params: 'stream (Query)' },
        { name: 'WebSocket Feed', method: 'WS', path: '/v1/royal/ws/:gameId/:tableId', desc: 'Real-time WebSocket feed for game events', params: 'gameId, tableId' },
    ];

    const sportRadarEndpoints = [
        { name: 'Sports List', method: 'GET', path: '/v1/sportradar/sports', desc: 'Get list of all available SportRadar sports' },
        { name: 'Inplay Catalogues', method: 'GET', path: '/v1/sportradar/inplay-catalogues/:sportId', desc: 'Get cached list of inplay events for a specific sport', params: 'sportId' },
        { name: 'Upcoming Catalogues', method: 'GET', path: '/v1/sportradar/upcoming-catalogues/:sportId', desc: 'Get cached list of upcoming matches for a specific sport', params: 'sportId' },
        { name: 'Market Odds', method: 'GET', path: '/v1/sportradar/markets/:sportId/:eventId', desc: 'Get real-time betting markets and odds', params: 'sportId, eventId' },
        { name: 'Event Counts', method: 'GET', path: '/v1/sportradar/event-counts', desc: 'Get count of active events per sport' },
        { name: 'SRL Inplay', method: 'GET', path: '/v1/sportradar/srl/inplay', desc: 'Get Simulated Reality League (SRL) live events' },
        { name: 'SRL Upcoming', method: 'GET', path: '/v1/sportradar/srl/upcoming', desc: 'Get SRL upcoming matches (Paginated & Merged)' },
        { name: 'Full Inplay List', method: 'GET', path: '/v1/sportradar/full_eventlist/inplay/:sportId', desc: 'Get paginated full list of inplay events for a specific sport', params: 'sportId' },
        { name: 'Full Upcoming List', method: 'GET', path: '/v1/sportradar/full_eventlist/upcoming/:sportId', desc: 'Get paginated full list of upcoming events for a specific sport', params: 'sportId' },
        { name: 'Virtual Cricket', method: 'GET', path: '/v1/sportradar/virtual-cricket/index.html', desc: 'Watch live Virtual Cricket stream (Returns HTML Player)' },
        { name: 'Virtual Basketball', method: 'GET', path: '/v1/sportradar/virtual-basketball/index.html', desc: 'Watch live Virtual Basketball stream (Returns HTML Player)' },
    ];

    const getActiveEndpoints = () => {
        console.log('Active Tab:', activeTab);
        if (activeTab === 'sportradar') console.log('SportRadar Endpoints:', sportRadarEndpoints);

        if (activeTab === 'aura') return auraEndpoints;
        if (activeTab === 'king') return kingExchangeEndpoints;
        if (activeTab === 'royal') return royalEndpoints;
        if (activeTab === 'sportradar') return sportRadarEndpoints;
        return [];
    };

    const toggleDocSelection = (key) => {
        setSelectedDocs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const generatePDF = () => {
        try {
            const doc = new jsPDF();
            let hasContent = false;
            let sectionCounter = 1;

            // Header
            doc.setFontSize(22);
            doc.setTextColor(37, 99, 235);
            doc.text('Aura Proxy - API Documentation', 20, 20);

            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(`Official Domain: ${domain}`, 20, 30);
            doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 20, 37);

            // Security
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text(`${sectionCounter++}. Authentication & Security`, 20, 50);
            doc.setFontSize(11);
            doc.setTextColor(80);
            const securityText = 'This API is protected via IP Whitelisting. Your server IP must be registered in the Aura Admin Panel. No API tokens are required once the IP is whitelisted.';
            doc.text(doc.splitTextToSize(securityText, 170), 20, 60);

            let currentY = 80;

            // Aura Casino Section
            if (selectedDocs.aura) {
                hasContent = true;
                doc.setFontSize(16);
                doc.setTextColor(0);
                doc.text(`${sectionCounter++}. Aura Casino API`, 20, currentY);
                const auraData = auraEndpoints.map(e => [e.name, e.method, e.path, e.params || '-']);
                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Endpoint', 'Method', 'Path', 'Params']],
                    body: auraData,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229] }
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // KingExchange Section
            if (selectedDocs.king) {
                hasContent = true;
                doc.setFontSize(16);
                doc.setTextColor(0);
                // Check if page break needed
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.text(`${sectionCounter++}. KingExchange Sport API`, 20, currentY);
                const kingData = kingExchangeEndpoints.map(e => [e.name, e.method, e.path, e.params || '-']);
                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Endpoint', 'Method', 'Path', 'Params']],
                    body: kingData,
                    theme: 'grid',
                    headStyles: { fillColor: [37, 99, 235] }
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Royal Game Section
            if (selectedDocs.royal) {
                hasContent = true;
                doc.setFontSize(16);
                doc.setTextColor(0);
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.text(`${sectionCounter++}. Royal Game API`, 20, currentY);
                const royalData = royalEndpoints.map(e => [e.name, e.method, e.path, e.params || '-']);
                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Endpoint', 'Method', 'Path', 'Params']],
                    body: royalData,
                    theme: 'grid',
                    headStyles: { fillColor: [245, 158, 11] }
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // SportRadar Section
            if (selectedDocs.sportradar) {
                hasContent = true;
                doc.setFontSize(16);
                doc.setTextColor(0);
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.text(`${sectionCounter++}. SportRadar API`, 20, currentY);
                const sportRadarData = sportRadarEndpoints.map(e => [e.name, e.method, e.path, e.params || '-']);
                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Endpoint', 'Method', 'Path', 'Params']],
                    body: sportRadarData,
                    theme: 'grid',
                    headStyles: { fillColor: [234, 88, 12] } // Orange-600
                });
            }

            if (!hasContent) {
                alert("Please select at least one API provider.");
                return;
            }

            doc.save('Aura_API_Documentation.pdf');
            setShowDownloadModal(false);
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">API Documentation</h1>
                    <p className="text-text-muted flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Complete guide for developers to integrate Aura, Sports, Royal, and SportRadar APIs
                    </p>
                </div>
                <button
                    onClick={() => setShowDownloadModal(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 whitespace-nowrap"
                >
                    <Download className="w-5 h-5" />
                    <span className="font-semibold">Download PDF Doc</span>
                </button>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-[24px] border border-white/5">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                        <Globe className="text-primary w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-1 text-lg">Base Domain</h3>
                    <p className="text-primary font-mono text-sm break-all">{domain}</p>
                </div>
                <div className="glass p-6 rounded-[24px] border border-white/5">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                        <ShieldCheck className="text-green-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-1 text-lg">Authentication</h3>
                    <p className="text-text-muted text-sm">Automated via IP Whitelisting in Security Core.</p>
                </div>
                <div className="glass p-6 rounded-[24px] border border-white/5">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Code2 className="text-purple-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-1 text-lg">Format</h3>
                    <p className="text-text-muted text-sm">All responses are in standard JSON format.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap p-1.5 bg-white/5 rounded-2xl w-fit border border-white/5 gap-2 md:gap-0">
                <button
                    onClick={() => setActiveTab('aura')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'aura' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                >
                    <Gamepad2 className="w-4 h-4" />
                    <span className="font-medium">Aura Casino</span>
                </button>
                <button
                    onClick={() => setActiveTab('king')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'king' ? 'bg-blue-600 text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                >
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium">KingExchange Sport</span>
                </button>
                <button
                    onClick={() => setActiveTab('royal')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'royal' ? 'bg-amber-500 text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                >
                    <Crown className="w-4 h-4" />
                    <span className="font-medium">Royal Game</span>
                </button>
                <button
                    onClick={() => setActiveTab('sportradar')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'sportradar' ? 'bg-orange-600 text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                >
                    <Globe className="w-4 h-4" /> {/* Reusing Globe, or import Activity/Zap if preferred */}
                    <span className="font-medium">SportRadar</span>
                </button>
            </div>

            {/* Endpoints Table */}
            <div className="glass rounded-[32px] border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/2">
                                <th className="px-8 py-5 font-semibold text-sm">Endpoint Name</th>
                                <th className="px-8 py-5 font-semibold text-sm">Method</th>
                                <th className="px-8 py-5 font-semibold text-sm">Full Path & Example</th>
                                <th className="px-8 py-5 font-semibold text-sm">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {getActiveEndpoints().map((ep, idx) => {
                                const fullUrl = `${domain}${ep.path}`;
                                return (
                                    <tr key={idx} className="hover:bg-white/2 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-text mb-0.5">{ep.name}</span>
                                                {ep.params && <span className="text-xs text-primary bg-primary/5 px-2 py-0.5 rounded-full w-fit">Params: {ep.params}</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ep.method === 'GET' ? 'bg-blue-500/10 text-blue-400' : (ep.method === 'WS' ? 'bg-purple-500/10 text-purple-400' : 'bg-green-500/10 text-green-400')}`}>
                                                {ep.method}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <code className="bg-black/20 text-text-muted px-3 py-1.5 rounded-lg text-xs font-mono border border-white/5 group-hover:text-primary transition-colors">
                                                    {ep.path}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(fullUrl, idx)}
                                                    className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-primary transition-all"
                                                    title="Copy full URL"
                                                >
                                                    {copiedId === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                {ep.method === 'GET' && (
                                                    <a
                                                        href={fullUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-primary transition-all"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-text-muted leading-relaxed">
                                            {ep.desc}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Integration Tip */}
            <div className="p-8 rounded-[32px] bg-gradient-to-r from-primary/10 to-transparent border border-primary/10">
                <div className="flex gap-6 items-start">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                        <BookOpen className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold mb-2">Integration Pro-Tip</h4>
                        <p className="text-text-muted leading-relaxed max-w-3xl">
                            All Sports APIs are optimized for low latency. When calling from your server side, ensure you set the
                            <code className="mx-1 text-primary">Accept: application/json</code> header to receive machine-readable
                            responses. Non-whitelisted IPs will automatically receive a 403 Forbidden status with debugging details.
                        </p>
                    </div>
                </div>
            </div>

            {/* Download Modal - Add SportRadar */}
            {showDownloadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl transform scale-100 transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <FileDown className="text-primary w-6 h-6" />
                                Select Documentation
                            </h3>
                            <button
                                onClick={() => setShowDownloadModal(false)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div
                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={() => toggleDocSelection('aura')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Gamepad2 className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold">Aura Casino</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedDocs.aura ? 'bg-primary border-primary' : 'border-gray-500'}`}>
                                    {selectedDocs.aura && <Check className="w-4 h-4 text-black" />}
                                </div>
                            </div>

                            <div
                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={() => toggleDocSelection('king')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold">KingExchange Sport</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedDocs.king ? 'bg-primary border-primary' : 'border-gray-500'}`}>
                                    {selectedDocs.king && <Check className="w-4 h-4 text-black" />}
                                </div>
                            </div>

                            <div
                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={() => toggleDocSelection('royal')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold">Royal Game</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedDocs.royal ? 'bg-primary border-primary' : 'border-gray-500'}`}>
                                    {selectedDocs.royal && <Check className="w-4 h-4 text-black" />}
                                </div>
                            </div>

                            <div
                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={() => toggleDocSelection('sportradar')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold">SportRadar</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedDocs.sportradar ? 'bg-primary border-primary' : 'border-gray-500'}`}>
                                    {selectedDocs.sportradar && <Check className="w-4 h-4 text-black" />}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowDownloadModal(false)}
                                className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={generatePDF}
                                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                            >
                                Download Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
