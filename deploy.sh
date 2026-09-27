#!/bin/bash
# Wedding Planner Deployment Script
# Deploy to VPS at 43.156.107.63

set -e

VPS="root@43.156.107.63"
DEPLOY_DIR="/opt/wedding-planner"
DOMAIN="wedding.kreasifarhan.my.id"

echo "🚀 Deploying Wedding Planner to $VPS..."

# Create remote directory
ssh $VPS "mkdir -p $DEPLOY_DIR/data"

# Copy files
echo "📦 Copying files..."
scp -r /home/ubuntu/wedding-planner/server.js $VPS:$DEPLOY_DIR/
scp -r /home/ubuntu/wedding-planner/package.json $VPS:$DEPLOY_DIR/
scp -r /home/ubuntu/wedding-planner/public $VPS:$DEPLOY_DIR/
scp -r /home/ubuntu/wedding-planner/data/ $VPS:$DEPLOY_DIR/

# Install dependencies and setup
echo "📥 Installing dependencies on VPS..."
ssh $VPS "cd $DEPLOY_DIR && npm install --production"

# Setup PM2 if not installed
echo "⚙️ Setting up PM2..."
ssh $VPS "npm list -g pm2 || npm install -g pm2"

# Stop existing process
ssh $VPS "pm2 stop wedding-planner 2>/dev/null || true"
ssh $VPS "pm2 delete wedding-planner 2>/dev/null || true"

# Start with PM2
echo "🚀 Starting app..."
ssh $VPS "cd $DEPLOY_DIR && pm2 start server.js --name wedding-planner --env PORT=3457"
ssh $VPS "pm2 save"

# Setup nginx
echo "🌐 Configuring nginx..."
ssh $VPS "cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX'
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3457;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX"

ssh $VPS "ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN"
ssh $VPS "nginx -t && systemctl reload nginx"

# Setup SSL with certbot
echo "🔒 Setting up SSL..."
ssh $VPS "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@kreasifarhan.my.id || true"

echo "✅ Deployment complete!"
echo "🌐 Visit: https://$DOMAIN"
