# Portland OCDS Explorer

A modern web application for exploring the City of Portland, Oregon's Open Contracting Data Standard (OCDS) compliant contracting dataset. This tool provides a user-friendly interface to search, filter, and visualize tenders and contracts.

**Live Demo**: [https://portland-ocds.wegov.nyc](https://portland-ocds.wegov.nyc)

## Architecture

The application is built on a modern, containerized stack:

*   **Frontend**: React (Vite) + TypeScript.
*   **Backend**: FastAPI (Python 3.12).
*   **Database**: PostgreSQL 16 (storing raw OCDS JSONB for flexible querying).
*   **Infrastructure**: Docker & Docker Compose.

## Quick Start (Local Development)

### Prerequisites
*   Docker & Docker Compose installed on your machine.
*   Git.

### 1. Clone the Repository
```bash
git clone https://github.com/wegovnyc/portland-ocds.git
cd portland-ocds
```

### 2. Start the Application
The project uses Docker Compose to orchestrate the database, backend, and frontend.

```bash
docker-compose -f docker-compose.modern.yml up --build
```

*   **Frontend**: Accessible at `http://localhost:3000`
*   **API Documentation**: Accessible at `http://localhost:8000/docs`

### 3. Data Ingestion
The application automatically ingests OCDS data placed in the mapped directory.

1.  Place your OCDS JSON files in the root folder named `OCDS 2025.10.06/` (or update the volume mapping in `docker-compose.modern.yml`).
2.  Restart the backend container. The system automatically detects and loads data into the PostgreSQL database using a high-performance streaming ETL process.

## Deployment Guide (Production)

This guide assumes you are deploying to an Ubuntu VPS (e.g., AWS EC2, DigitalOcean Droplet).

### 1. Server Setup
Ensure Docker and Docker Compose are installed:
```bash
sudo apt update
sudo apt install docker.io docker-compose
```

### 2. Deploy Code
Copy the repository to your server:
```bash
# Example using git
git clone https://github.com/wegovnyc/portland-ocds.git ~/portland-ocds
cd ~/portland-ocds
```

### 3. Start Services
Run the containers in detached mode:
```bash
sudo docker-compose -f docker-compose.modern.yml up -d --build
```

### 4. Reverse Proxy (Nginx) & SSL
We recommend using Nginx as a reverse proxy to handle SSL and routing.

#### Install Nginx
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

#### Configuration
create `/etc/nginx/sites-available/portland-ocds` with the following content:

```nginx
server {
    server_name your-domain.com;

    # Frontend Proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Proxy (Rewrites /api/2.4/ to root /)
    location /api/2.4/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/portland-ocds /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL Certificate
Secure your site with Let's Encrypt:
```bash
sudo certbot --nginx -d your-domain.com
```

## Security Note
The default configuration uses standard credentials (`postgres`/`postgres`). For production:
1.  Update the `POSTGRES_PASSWORD` in `docker-compose.modern.yml` and `backend/main.py` (or use `.env`).
2.  Ensure your firewall (e.g., AWS Security Group) blocks external access to port `5432`.

## Credits
Built by [WeGovNYC](https://wegov.nyc) to support open data initiatives.
Based on the OCDS dataset provided by the **City of Portland**.
