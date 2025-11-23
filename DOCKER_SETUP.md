# Docker Setup Guide

This guide explains how to set up and run the MySQL database using Docker for local development.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)
- Node.js and npm installed

## Quick Start

### 1. Copy Environment Variables

The repository includes `.env.local` with default development settings. If you need to customize:

```bash
cp .env.example .env.local
# Edit .env.local with your preferred settings
```

**Default admin credentials:**
- Username: admin (no username field, just password)
- Password: `admin123`

### 2. Start MySQL Container

```bash
# Start the MySQL database in detached mode
docker-compose up -d

# Check if the container is running
docker-compose ps

# View logs (optional)
docker-compose logs -f mysql
```

The MySQL database will be available at:
- Host: `localhost`
- Port: `3306`
- Database: `annetamistalgud`
- User: `catshelp`
- Password: `catshelp123`

### 3. Wait for MySQL to be Ready

The healthcheck will ensure MySQL is ready. You can check with:

```bash
# Wait for healthy status
docker-compose ps
```

### 4. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Start the Application

```bash
# Start frontend and backend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Admin panel: http://localhost:5173/admin

## Docker Commands

### Start the Database
```bash
docker-compose up -d
```

### Stop the Database
```bash
docker-compose down
```

### Stop and Remove All Data
```bash
docker-compose down -v
```

### View Logs
```bash
docker-compose logs -f mysql
```

### Access MySQL CLI
```bash
docker-compose exec mysql mysql -u catshelp -p
# Password: catshelp123
```

### Restart the Database
```bash
docker-compose restart mysql
```

## Database Management

### Reset Database (Clean Slate)

```bash
# Stop and remove containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait for healthy status
docker-compose ps

# Run migrations
npx prisma migrate dev --name init
```

### Backup Database

```bash
# Create backup
docker-compose exec mysql mysqldump -u catshelp -pcatshelp123 annetamistalgud > backup.sql

# Restore backup
docker-compose exec -T mysql mysql -u catshelp -pcatshelp123 annetamistalgud < backup.sql
```

## Environment Variables

Key environment variables in `.env.local`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSQL_DATABASE` | `annetamistalgud` | Database name |
| `MYSQL_USER` | `catshelp` | Database user |
| `MYSQL_PASSWORD` | `catshelp123` | Database password |
| `MYSQL_PORT` | `3306` | MySQL port |
| `DATABASE_URL` | Connection string | Prisma database URL |
| `JWT_SECRET` | (dev secret) | JWT signing key |
| `ADMIN_PASSWORD_HASH` | (bcrypt hash) | Admin password hash |

## Changing Admin Password

1. Generate a new bcrypt hash:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-new-password', 10).then(console.log)"
```

2. Copy the hash output

3. Update `ADMIN_PASSWORD_HASH` in `.env.local`

4. Restart the backend

## Troubleshooting

### Port 3306 Already in Use

If you have another MySQL instance running:

```bash
# Option 1: Stop other MySQL instance
sudo systemctl stop mysql

# Option 2: Change port in .env.local
MYSQL_PORT=3307
DATABASE_URL=mysql://catshelp:catshelp123@localhost:3307/annetamistalgud
```

### Container Won't Start

```bash
# Check logs
docker-compose logs mysql

# Remove old containers and volumes
docker-compose down -v

# Try again
docker-compose up -d
```

### Connection Refused

Wait for the healthcheck to pass:
```bash
docker-compose ps
# Should show "healthy" status
```

### Migration Errors

```bash
# Reset Prisma
npx prisma migrate reset

# Or create new migration
npx prisma migrate dev --name your_migration_name
```

## Production Notes

**DO NOT use these settings in production:**
- Change `MYSQL_PASSWORD` to a strong password
- Generate a strong `JWT_SECRET` (use `openssl rand -base64 32`)
- Change `ADMIN_PASSWORD_HASH` to use a strong password
- Use proper secrets management (not .env files)
- Configure proper backup strategy
- Use managed MySQL service or proper security hardening
