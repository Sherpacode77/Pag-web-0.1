#!/bin/bash

# CERO.UNO - Automated Hostinger Deployment Script
# Usage: ssh root@YOUR_VPS_IP < init-deployment.sh
# Or: bash init-deployment.sh

set -e

echo "🚀 CERO.UNO Deployment Initialization"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prompt for user input
read -p "Enter your domain (e.g., cero.uno): " DOMAIN
read -p "Enter VPS IP address: " VPS_IP
read -p "Enter GitHub repository URL: " REPO_URL
read -sp "Enter ADMIN_USERNAME: " ADMIN_USERNAME
echo
read -sp "Enter ADMIN_PASSWORD (min 20 chars): " ADMIN_PASSWORD
echo

# Validate inputs
if [ -z "$DOMAIN" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}❌ Error: Missing required inputs${NC}"
    exit 1
fi

if [ ${#ADMIN_PASSWORD} -lt 20 ]; then
    echo -e "${RED}❌ Error: ADMIN_PASSWORD must be at least 20 characters${NC}"
    exit 1
fi

echo -e "${YELLOW}⏳ Starting deployment...${NC}"

# Step 1: Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Step 3: Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}🔧 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# Step 4: Create app directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
mkdir -p /home/cero-uno-app
cd /home/cero-uno-app

# Step 5: Clone repository
if [ -d ".git" ]; then
    echo -e "${GREEN}✓ Repository already cloned, pulling latest...${NC}"
    git pull
else
    echo -e "${YELLOW}📥 Cloning repository...${NC}"
    git clone $REPO_URL .
fi

# Step 6: Generate secure session secret
echo -e "${YELLOW}🔐 Generating ADMIN_SESSION_SECRET...${NC}"
ADMIN_SESSION_SECRET=$(openssl rand -base64 32)

# Step 7: Create .env.production
echo -e "${YELLOW}⚙️  Creating .env.production...${NC}"
cat > .env.production << EOF
NODE_ENV=production
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_SESSION_SECRET=$ADMIN_SESSION_SECRET
EOF

chmod 600 .env.production
echo -e "${GREEN}✓ Environment file created (secured with 600 permissions)${NC}"

# Step 8: Build and start containers
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker-compose build

echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker-compose up -d

# Wait for app to be ready
echo -e "${YELLOW}⏳ Waiting for app to be ready...${NC}"
sleep 10

# Step 9: Verify deployment
if docker-compose exec -T app curl -s http://localhost:3000 &>/dev/null; then
    echo -e "${GREEN}✓ Application is running!${NC}"
else
    echo -e "${RED}❌ Application failed to start. Check logs:${NC}"
    docker-compose logs app
    exit 1
fi

# Step 10: Install and configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
apt install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Step 11: Setup SSL with Certbot
echo -e "${YELLOW}🔒 Setting up SSL certificate...${NC}"
apt install -y certbot python3-certbot-nginx

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

# Step 12: Setup auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# Step 13: Setup firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📋 Your CERO.UNO Instance:"
echo "   URL: https://$DOMAIN"
echo "   Admin Login: https://$DOMAIN/admin"
echo "   SSH: ssh root@$VPS_IP"
echo ""
echo "🔐 Security:"
echo "   Username: $ADMIN_USERNAME"
echo "   Password: (as entered above)"
echo "   Session Secret: Securely stored in .env.production"
echo ""
echo "📍 Next Steps:"
echo "   1. Test admin login at https://$DOMAIN/admin"
echo "   2. Configure Mercado Pago in admin panel"
echo "   3. Setup GTM/GA4 integration"
echo "   4. Configure backups (see DEPLOYMENT_HOSTINGER.md)"
echo ""
echo "💡 Useful Commands:"
echo "   View logs: docker-compose -f /home/cero-uno-app/docker-compose.yml logs -f"
echo "   Restart app: docker-compose -f /home/cero-uno-app/docker-compose.yml restart"
echo "   Update app: cd /home/cero-uno-app && git pull && docker-compose build && docker-compose up -d"
echo ""
