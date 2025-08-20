# Docker Database Setup Guide

## Prerequisites

1. **Install Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - Ensure WSL 2 is enabled

## Quick Start

### 1. Start Database Services
```bash
npm run docker:db-only
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 2. Run Database Migrations
```bash
npm run db:migrate:dev
```

### 3. Start the Application
```bash
npm run dev
```

## Docker Commands Reference

| Command | Description |
|---------|-------------|
| `npm run docker:db-only` | Start only PostgreSQL and Redis |
| `npm run docker:run` | Start all services (PostgreSQL, Redis, InfluxDB) |
| `npm run docker:stop` | Stop all services |
| `npm run docker:logs` | View service logs |
| `npm run docker:reset` | Reset all data and restart services |

## Verify Setup

1. Check if containers are running:
   ```bash
   docker ps
   ```

2. Test database connection:
   ```bash
   npm run dev
   ```

3. Access Prisma Studio:
   ```bash
   npm run db:studio
   ```

## Troubleshooting

### Port Conflicts
If ports 5432, 6379 are already in use:
- Stop conflicting services
- Or modify ports in `docker-compose.yml`

### WSL 2 Issues
- Ensure WSL 2 is installed and set as default
- Restart Docker Desktop after WSL 2 setup

### Permission Issues
- Run PowerShell as Administrator if needed
- Ensure Docker has proper permissions

## Database Details

- **Database**: `dessai_dev`
- **Username**: `postgres`
- **Password**: `password`
- **Host**: `localhost`
- **Port**: `5432`

## Next Steps

After successful setup:
1. Run Prisma migrations: `npm run db:migrate:dev`
2. Seed initial data: `npm run db:seed`
3. Start development: `npm run dev`
