const { securityHook } = require('../utils/proxy');

async function streamingRoutes(fastify, options) {
    // Security Hook to restrict access to whitelisted IPs
    fastify.addHook('preHandler', securityHook);

    /**
     * Simplified Route for Iframe Use
     * URL: /v1/royal/player?stream=STREAM_ID
     */
    fastify.get('/v1/royal/player', { config: { provider: 'royal-gaming', apiId: 'h5live-streaming' } }, async (request, reply) => {
        const { stream } = request.query;

        if (!stream) {
            return reply.code(400).send({ error: 'Missing Required Parameter', message: 'Please provide a "stream" ID.' });
        }

        // Global/Default configuration for the streaming session
        // These can be updated here as they change, or later moved to a DB/Config file.
        const config = {
            cid: '690479',
            pid: '25129809459',
            token: '11a8885c6a32e3019d47255e75fc0180',
            expires: '1782827280',
            flags: 'faststart',
            options: '17',
            url: 'rtmp://localhost/splay'
        };

        reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royal Casino Live</title>
    <script src="https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.4.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #000000;
            --accent: #f3ba2f;
            --text: #ffffff;
        }
        body, html {
            margin: 0; padding: 0; height: 100%; width: 100%;
            overflow: hidden; background-color: var(--bg);
            font-family: 'Outfit', sans-serif; color: var(--text);
        }
        #player-wrapper {
            width: 100%; height: 100%; position: relative;
        }
        #nanoplayer { width: 100%; height: 100%; }
        
        /* Iframe-friendly overlays */
        .badge {
            position: absolute; top: 10px; left: 10px; z-index: 10;
            background: rgba(0,0,0,0.5); padding: 4px 10px;
            border-radius: 6px; font-size: 11px; font-weight: 600;
            display: flex; align-items: center; gap: 6px;
            backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1);
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #666; }
        .dot.live { background: #00ff00; box-shadow: 0 0 6px #00ff00; }
        .dot.error { background: #ff4757; }

        .loader {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: var(--bg); display: flex; flex-direction: column;
            align-items: center; justify-content: center; z-index: 5;
            transition: opacity 0.5s ease-out;
        }
        .spinner {
            width: 30px; height: 30px; border: 2px solid rgba(243, 186, 47, 0.1);
            border-top: 2px solid var(--accent); border-radius: 50%;
            animation: spin 0.8s linear infinite; margin-bottom: 12px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .retry-hint {
            position: absolute; bottom: 10px; right: 10px; z-index: 10;
            font-size: 10px; color: rgba(255,255,255,0.3);
            text-decoration: none; cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="player-wrapper">
        <div class="badge">
            <div id="status-dot" class="dot"></div>
            <span id="status-text">CONNECTING</span>
        </div>

        <div class="loader" id="loader">
            <div class="spinner"></div>
            <div style="font-size: 12px; color: #888;">LOADING STREAM...</div>
        </div>

        <div id="nanoplayer"></div>
        <div class="retry-hint" onclick="reconnect()">RECONNECT</div>
    </div>

    <script>
        var player;
        var retryCount = 0;
        var maxRetries = 10;
        var isBuffering = false;
        var bufferTimeout;

        var playerConfig = {
            "source": {
                "h5live": {
                    "server": {
                        "websocket": "wss://bintu-play.nanocosmos.de/h5live/authstream/stream.mp4",
                        "hls": "https://bintu-play.nanocosmos.de/h5live/authstream/playlist.m3u8"
                    },
                    "params": {
                        "url": "${config.url}",
                        "stream": "${stream}",
                        "cid": "${config.cid}",
                        "pid": "${config.pid}",
                        "flags": "${config.flags}",
                        "token": "${config.token}",
                        "expires": "${config.expires}",
                        "options": "${config.options}"
                    }
                }
            },
            "playback": { "autoplay": true, "muted": true, "keepMuted": false },
            "style": { "width": "100%", "height": "100%", "aspectratio": "16:9", "controls": true }
        };

        function init() {
            player = new NanoPlayer("nanoplayer");
            
            player.setup(playerConfig).then(function() {
                hideLoader();
                console.log("Player Setup OK");
            }, function(err) {
                console.error("Setup Error", err);
                updateUI('error', 'SETUP FAILED');
                handleFailure();
            });

            player.on("Status", function(e) {
                var status = e.data.status;
                if (status === "playing") {
                    updateUI('live', 'LIVE');
                    retryCount = 0;
                    clearTimeout(bufferTimeout);
                } else if (status === "buffering") {
                    updateUI('default', 'BUFFERING...');
                    monitorBuffer();
                }
            });

            player.on("Error", function(e) {
                console.error("Stream Error", e.data);
                updateUI('error', 'RECONNECTING...');
                handleFailure();
            });
        }

        function monitorBuffer() {
            clearTimeout(bufferTimeout);
            bufferTimeout = setTimeout(() => {
                console.log("Buffer timeout reached. Reconnecting...");
                reconnect();
            }, 10000); // Reconnect if buffering for more than 10s
        }

        function handleFailure() {
            if (retryCount < maxRetries) {
                retryCount++;
                var delay = Math.min(2000 * retryCount, 10000);
                setTimeout(reconnect, delay);
            }
        }

        function reconnect() {
            if (player) {
                player.destroy();
                init();
            }
        }

        function updateUI(type, text) {
            const dot = document.getElementById('status-dot');
            const label = document.getElementById('status-text');
            dot.className = 'dot';
            if (type === 'live') dot.classList.add('live');
            if (type === 'error') dot.classList.add('error');
            if (label) label.innerText = text;
        }

        function hideLoader() {
            const loader = document.getElementById('loader');
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }

        document.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>
        `);
    });

    /**
     * Original Route (maintained for compatibility)
     */
    fastify.get('/v1/royal/stream', async (request, reply) => {
        const { stream } = request.query;
        if (stream) {
            return reply.redirect(`/v1/royal/player?stream=${stream}`);
        }
        reply.send({ message: 'Royal Streaming Route. Use /v1/royal/player?stream=ID for the player.' });
    });
}

module.exports = streamingRoutes;
