import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Logs from './pages/Logs';
import Security from './pages/Security';
import Billing from './pages/Billing';
import APIDocs from './pages/APIDocs';
import Sidebar from './components/Sidebar';

function App() {
    const [token, setToken] = useState(localStorage.getItem('aura_token'));

    useEffect(() => {
        if (token) localStorage.setItem('aura_token', token);
        else localStorage.removeItem('aura_token');

        // Add axios interceptor for 401 handling
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    setToken(null);
                    localStorage.removeItem('aura_token');
                }
                return Promise.reject(error);
            }
        );

        return () => axios.interceptors.response.eject(interceptor);
    }, [token]);

    return (
        <Router basename="/v1/admin/dashboard/">
            <div className="min-h-screen flex bg-bg text-text flex-col lg:flex-row selection:bg-primary/30">
                {token && <Sidebar setToken={setToken} />}
                <main className={`flex-1 overflow-y-auto duration-300 ${token ? 'p-6 lg:p-8 pb-12 pt-20 lg:pt-8' : ''}`}>
                    <div className="max-w-[1600px] mx-auto">
                        <Routes>
                            <Route path="/login" element={!token ? <Login setToken={setToken} /> : <Navigate to="/" />} />
                            <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
                            <Route path="/clients" element={token ? <Clients /> : <Navigate to="/login" />} />
                            <Route path="/logs" element={token ? <Logs /> : <Navigate to="/login" />} />
                            <Route path="/security" element={token ? <Security /> : <Navigate to="/login" />} />
                            <Route path="/billing" element={token ? <Billing /> : <Navigate to="/login" />} />
                            <Route path="/docs" element={token ? <APIDocs /> : <Navigate to="/login" />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </Router>
    );
}

export default App;
