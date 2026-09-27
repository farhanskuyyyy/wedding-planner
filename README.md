# Wedding Planner Dashboard - Farhan & Tazkiah

A modern, responsive wedding planning dashboard built with Node.js, Express, SQLite, and Tailwind CSS.

## Features

- **Dashboard Overview**: Total budget summary, progress bars, budget pie chart, wedding countdown
- **Guest Management**: Track guests by category with capacity monitoring
- **Budget Tracker**: Budget vs actual comparison with charts
- **Savings Calculator**: Monthly contribution tracking with projections
- **Dark Mode**: Full dark mode support
- **Mobile Responsive**: Works on all devices

## Tech Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: Plain HTML/CSS/JS + Tailwind CSS + Chart.js
- **Database**: SQLite with WAL mode

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
node server.js

# Visit http://localhost:3457
```

## Deployment to VPS

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Manual Deployment

1. Copy files to VPS:
```bash
scp -r . root@43.156.107.63:/opt/wedding-planner/
```

2. Install dependencies on VPS:
```bash
ssh root@43.156.107.63
cd /opt/wedding-planner
npm install --production
```

3. Start with PM2:
```bash
pm2 start server.js --name wedding-planner
pm2 save
```

4. Configure nginx:
```nginx
server {
    listen 80;
    server_name wedding.kreasifarhan.my.id;
    
    location / {
        proxy_pass http://127.0.0.1:3457;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

5. Setup SSL:
```bash
certbot --nginx -d wedding.kreasifarhan.my.id
```

## API Endpoints

- `GET /api/dashboard` - Dashboard overview data
- `GET /api/budget` - Budget categories
- `POST /api/budget` - Add budget
- `PUT /api/budget/:id` - Update budget
- `DELETE /api/budget/:id` - Delete budget
- `GET /api/guests` - Guest categories
- `POST /api/guests` - Add guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest
- `GET /api/guest-capacity` - Guest capacity
- `PUT /api/guest-capacity/:owner` - Update capacity
- `GET /api/savings` - Savings data
- `PUT /api/savings/:owner` - Update savings
- `GET /api/funds` - Fund sources
- `POST /api/funds` - Add fund
- `PUT /api/funds/:id` - Update fund
- `DELETE /api/funds/:id` - Delete fund
- `GET /api/settings` - App settings
- `PUT /api/settings` - Update settings

## Seeded Data

The app comes pre-seeded with:

**Farhan:**
- Budget: Nikah (Rp98M), Honeymoon (Rp1.9M), Bang Ade (Rp5M), Lamaran (Rp400K)
- Funds: Bibit (Rp98M), Ipot (Rp9M)
- Savings: Rp4M/month × 8 months = Rp32M
- Guests: 174 pax, 87 undangan

**Tazkiah:**
- Budget: Isi Rumah (Rp20M), Pengajian (Rp5M), Kontrak (Rp6M), etc.
- Funds: Bibit (Rp33M), Ipot (Rp5M), HSBC (Rp7M)
- Savings: Rp1.5M/month × 8 months = Rp12M
- Guests: 179 pax, 88 undangan

## Environment Variables

- `PORT` - Server port (default: 3457)

## License

Private - Farhan & Tazkiah Wedding
