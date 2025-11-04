#!/bin/bash

# X List Scraper - Linux VM Initialization Script
# This script sets up the application on a fresh Linux VM

set -e  # Exit on error

echo "=================================="
echo "X List Scraper - Initialization"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    echo -e "${GREEN}✓${NC} Detected OS: $OS"
else
    echo -e "${RED}✗${NC} Cannot detect OS"
    exit 1
fi

# Update system
echo ""
echo "Updating system packages..."
sudo apt-get update -qq

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo ""
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✓${NC} Node.js installed: $(node --version)"
else
    echo -e "${GREEN}✓${NC} Node.js already installed: $(node --version)"
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
    echo ""
    echo "Installing pnpm..."
    npm install -g pnpm
    echo -e "${GREEN}✓${NC} pnpm installed: $(pnpm --version)"
else
    echo -e "${GREEN}✓${NC} pnpm already installed: $(pnpm --version)"
fi

# Install dependencies
echo ""
echo "Installing project dependencies..."
pnpm install --frozen-lockfile
echo -e "${GREEN}✓${NC} Dependencies installed"

# Install Playwright browsers
echo ""
echo "Installing Playwright browsers..."
npx playwright install chromium
echo ""
echo "Installing Playwright system dependencies..."
sudo npx playwright install-deps chromium
echo -e "${GREEN}✓${NC} Playwright installed"

# Build project
echo ""
echo "Building project..."
pnpm build
echo -e "${GREEN}✓${NC} Build complete"

# Make CLI executable
chmod +x bin/xlist-scrape

# Create data directory for cookies
mkdir -p data
echo -e "${GREEN}✓${NC} Data directory created"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created (please configure as needed)"
else
    echo -e "${YELLOW}⚠${NC} .env file already exists"
fi

# Install PM2 for process management (optional)
read -p "Install PM2 for process management? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo npm install -g pm2
    echo -e "${GREEN}✓${NC} PM2 installed"

    # Create PM2 ecosystem file
    cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'xlist-scraper',
    script: './dist/api/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
}
EOFPM2

    mkdir -p logs
    echo -e "${GREEN}✓${NC} PM2 ecosystem file created"
fi

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"

    read -p "Build Docker image? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Building Docker image..."
        docker build -t xlist-scraper .
        echo -e "${GREEN}✓${NC} Docker image built"
    fi
fi

# Run tests
read -p "Run tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running tests..."
    pnpm test
    echo -e "${GREEN}✓${NC} Tests passed"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}✓ Initialization Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   nano .env"
echo ""
echo "2. Start the server:"
echo "   pnpm start"
echo ""
echo "   Or with PM2:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:8080/health"
echo ""
echo "4. Access documentation:"
echo "   http://localhost:8080/docs"
echo ""
echo "5. Use CLI:"
echo "   ./bin/xlist-scrape --help"
echo ""
echo -e "${YELLOW}Note:${NC} If running on a cloud VM, ensure port 8080 is open in firewall"
echo ""
