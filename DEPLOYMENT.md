# Deployment Guide

Complete guide for deploying X List Scraper to a Linux VM.

## Quick Start

```bash
# Clone repository
git clone https://github.com/bracta/xlist-scraper.git
cd xlist-scraper

# Run initialization script
chmod +x init.sh
./init.sh
```

The init script will:
- Install Node.js and pnpm
- Install dependencies
- Install Playwright browsers
- Build the project
- Optionally install PM2
- Optionally build Docker image

## Manual Setup

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Node.js 18+
- 2GB+ RAM
- 10GB+ disk space

### Step-by-Step Installation

```bash
# 1. Update system
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install pnpm
npm install -g pnpm

# 4. Clone repository
git clone https://github.com/bracta/xlist-scraper.git
cd xlist-scraper

# 5. Install dependencies
pnpm install

# 6. Install Playwright
npx playwright install chromium
sudo npx playwright install-deps chromium

# 7. Build project
pnpm build

# 8. Configure environment
cp .env.example .env
nano .env

# 9. Start server
pnpm start
```

## Running the Server

### Option 1: Direct Node.js

```bash
# Start server
node dist/api/server.js

# Or with npm script
pnpm start
```

### Option 2: PM2 (Recommended for Production)

```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions from the output

# Monitor
pm2 monit

# View logs
pm2 logs xlist-scraper

# Restart
pm2 restart xlist-scraper
```

### Option 3: Docker

```bash
# Using Docker Compose (easiest)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Or using Docker directly
docker build -t xlist-scraper .
docker run -d -p 8080:8080 --name xlist-scraper xlist-scraper
```

### Option 4: Systemd Service

Create `/etc/systemd/system/xlist-scraper.service`:

```ini
[Unit]
Description=X List Scraper API
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/xlist-scraper
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStart=/usr/bin/node /path/to/xlist-scraper/dist/api/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable xlist-scraper
sudo systemctl start xlist-scraper
sudo systemctl status xlist-scraper
```

## Firewall Configuration

### UFW (Ubuntu)

```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP API
sudo ufw allow 8080/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Cloud Provider Firewall

**AWS EC2 Security Groups:**
- Inbound: TCP 8080 from 0.0.0.0/0
- Inbound: TCP 22 from your IP (SSH)

**GCP Firewall Rules:**
```bash
gcloud compute firewall-rules create allow-xlist-scraper \
  --allow tcp:8080 \
  --source-ranges 0.0.0.0/0
```

**Azure Network Security Groups:**
- Add inbound rule for port 8080

## Reverse Proxy Setup

### Nginx

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/xlist-scraper
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeout for long scraping operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/xlist-scraper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

## Environment Variables

Create `.env` file:

```bash
# Server
PORT=8080
HOST=0.0.0.0
LOG_LEVEL=info
NODE_ENV=production

# Scraper
HEADLESS=true
CONCURRENCY=1

# Optional: Cookie persistence
PERSIST_COOKIES_PATH=/home/user/xlist-scraper/data/cookies.json

# Optional: Proxy
# PROXY=http://user:pass@proxy:port

# Optional: Authentication
# AUTH_MODE=required
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:8080/health
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Logs
pm2 logs xlist-scraper --lines 100
```

### Custom Health Check Script

Create `healthcheck.sh`:

```bash
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ $RESPONSE -eq 200 ]; then
    echo "OK"
    exit 0
else
    echo "FAIL: HTTP $RESPONSE"
    exit 1
fi
```

Add to crontab for monitoring:

```bash
*/5 * * * * /path/to/healthcheck.sh || systemctl restart xlist-scraper
```

## Performance Tuning

### Increase Node.js Memory

```bash
# In PM2 ecosystem.config.js
node_args: '--max-old-space-size=2048'

# Or in systemd
Environment=NODE_OPTIONS=--max-old-space-size=2048
```

### Adjust Concurrency

```bash
# In .env
CONCURRENCY=2  # Increase for more parallel scraping
```

**Warning:** Higher concurrency may trigger rate limits.

## Backup

### Backup Cookies

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
tar -czf backup-$(date +%Y%m%d).tar.gz data/cookies.json .env
EOF

chmod +x backup.sh

# Add to crontab (daily at 2am)
0 2 * * * /path/to/backup.sh
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process
kill -9 <PID>
```

### Playwright Installation Issues

```bash
# Manually install dependencies
sudo npx playwright install-deps chromium

# If still failing, install system packages
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

### Out of Memory

```bash
# Check memory usage
free -h

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Rate Limiting

Solution: Use authenticated cookies
```bash
# Export cookies from browser to data/cookies.json
# Set in .env:
PERSIST_COOKIES_PATH=/path/to/data/cookies.json
```

## Security Hardening

```bash
# 1. Run as non-root user
sudo useradd -m -s /bin/bash xlist
sudo -u xlist bash

# 2. Restrict file permissions
chmod 600 .env
chmod 600 data/cookies.json

# 3. Enable firewall
sudo ufw enable

# 4. Keep system updated
sudo apt-get update && sudo apt-get upgrade -y

# 5. Use authentication
# In .env: AUTH_MODE=required
```

## Cloud-Specific Notes

### AWS EC2

```bash
# Instance type: t3.medium or larger
# AMI: Ubuntu 22.04 LTS
# Storage: 20GB+ EBS
# Security Group: Allow 8080, 22
```

### Google Cloud Platform

```bash
# Machine type: e2-medium or larger
# Image: Ubuntu 22.04 LTS
# Disk: 20GB+ SSD
# Firewall: Allow tcp:8080
```

### DigitalOcean

```bash
# Droplet: 2GB+ RAM
# Image: Ubuntu 22.04 LTS
# Add tag: xlist-scraper
```

## Updates

```bash
# Pull latest changes
git pull origin master

# Rebuild
pnpm install
pnpm build

# Restart
pm2 restart xlist-scraper
# or
sudo systemctl restart xlist-scraper
```

## Support

For issues, check:
1. Application logs: `pm2 logs` or `journalctl -u xlist-scraper`
2. Health endpoint: `curl http://localhost:8080/health`
3. GitHub Issues: https://github.com/bracta/xlist-scraper/issues
