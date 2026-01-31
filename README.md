# Aura Casino Proxy

High-performance Node.js proxy for Aura Casino, Royal Gaming, and Sports APIs with request logging, URL masking, and shared WebSocket connections.

## 🛠 Project Structure

- `/` - Backend Node.js server (Fastify)
- `/admin-ui` - Frontend Admin Dashboard (React + Vite + Tailwind)
- `/src/public` - Built frontend files (Automatically served by Backend)

---

## 🚀 Local Development

### 1. Backend Setup
```bash
# Install dependencies
npm install

# Setup Environment
cp .env.example .env # or create .env manually
# Ensure MongoDB is running (locally or remote)

# Start Server
npm start
```
The backend will run at `http://localhost:3000`.

### 2. Admin UI Setup
```bash
cd admin-ui

# Install dependencies
npm install

# Start Development Server
npm run dev
```
The Admin UI will run at `http://localhost:5173/v1/admin/dashboard/`.

---

## 🌐 AWS Deployment Guide (Step-by-Step)

### 1. EC2 Instance Prep (Ubuntu 22.04)
- Allow ports in Security Group: `22` (SSH), `80` (HTTP), `443` (HTTPS).

### 2. Install Node.js, MongoDB & Nginx
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

# Install MongoDB (If not using Atlas)
sudo apt-get install -y mongodb

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### 3. Deploy Code
```bash
# 1. Clone your repository
git clone <your-repo-url> /var/www/aura-proxy
cd /var/www/aura-proxy

# 2. Setup Backend Dependencies
npm install

# 3. Build Admin UI (Required for Production)
cd admin-ui
npm install
npm run build  # Files will be built into ../src/public
cd ..

# 4. Setup .env file
nano .env
# Paste your MONGODB_URI, JWT_SECRET, ADMIN_USERNAME, etc.
```

### 4. Start Production Server with PM2
```bash
pm2 start src/server.js --name "aura-proxy"
pm2 save
pm2 startup
```

### 5. Nginx Configuration (Reverse Proxy)
`sudo nano /etc/nginx/sites-available/default`
```nginx
server {
    listen 80;
    server_name your-domain.com; # Replace with your IP or Domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
`sudo nginx -t`
`sudo systemctl restart nginx`

---

## � API Endpoints List

### 🏏 Sports APIs (`/v1/sports/*`)
*Requires IP Whitelisting*

- `GET /v1/sports/list` - List of all sports.
- `GET /v1/sports/all-events` - List of all live events.
- `GET /v1/sports/event-markets/:sportId/:eventId` - Market list for specific event.
- `GET /v1/sports/fancy-markets` - Fancy market data.
- `GET /v1/sports/ball-by-ball/:sportId/:eventId` - Ball-by-ball commentary/odds.
- `GET /v1/sports/event-results/:eventId` - Past match results.

### 🃏 Royal Gaming APIs (`/v1/royal/*`)
*Requires IP Whitelisting (Except Socket)*

- `GET /v1/royal/tables` - Cached table list from MongoDB.
- `GET /v1/royal/markets?gameId=..&tableId=..` - Cached market data.
- `GET /v1/royal/round-result` - Proxy for round result details.
- `GET /v1/royal/player?stream=STREAM_ID` - Live streaming player (HTML/Iframe).
- `ws /v1/royal/ws/:gameId/:tableId` - **SHARED WebSocket Proxy**. (Bypasses IP Whitelist for testing).

### 🎰 Aura Casino Proxy (`/v1/auracasino/*`)
*Requires IP Whitelisting*

- `GET /v1/allgamelobby` - operator lobby data.
- `GET /v1/auracasino/:gameId` - Masked streaming player for Aura games.
- `GET /v1/auracasino/player/:gameId` - Internal player proxy (hides original URLs).

---

## 🔐 Admin Management APIs
*Requires JWT Token in Authorization Header*

- `POST /v1/admin/login` - Admin authentication.
- `GET /v1/admin/stats` - dashboard summary.
- `GET /v1/admin/clients` - List all partner clients.
- `POST /v1/admin/clients` - Add new client.
- `PUT /v1/admin/clients/:id` - Edit client or reset API tokens.
- `POST /v1/admin/clients/:id/ips` - Whitelist new IP for client.
- `GET /v1/admin/logs` - Traffic & Security logs.
- `GET /v1/admin/billing` - Billing history management.

---

## 🔑 Admin Credentials
Default credentials (set in `.env`):
- **Username**: `admin`
- **Password**: `admin123`
