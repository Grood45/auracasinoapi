import { useState, useEffect, useRef } from 'react';

export const useRealTimeLogs = (onNewLog) => {
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef(null);

    useEffect(() => {
        // Determine WebSocket URL
        // In dev, we proxy /v1 to localhost:3000, so we can use window.location.host if via proxy,
        // or explicitly localhost:3000.
        // Let's deduce protocol (ws/wss) and host.
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // If running on port 5173 (dev), we target 3000. If prod build served by backend, we use window.location.host.
        const host = window.location.port === '5173'
            ? 'localhost:3000'
            : window.location.host;

        const wsUrl = `${protocol}//${host}/v1/admin/ws/logs`;

        const connect = () => {
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                // console.log('WS Connected');
                setIsConnected(true);
            };

            ws.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'NEW_LOG' && message.data) {
                        if (onNewLog) onNewLog(message.data);
                    }
                } catch (err) {
                    console.error('WS Parse Error', err);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                // Reconnect after 3 seconds
                setTimeout(connect, 3000);
            };

            ws.current.onerror = (err) => {
                console.error('WS Error', err);
                ws.current.close();
            };
        };

        connect();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    return { isConnected };
};
