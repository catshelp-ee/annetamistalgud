# GitHub Actions Workflows

This directory contains GitHub Actions workflows for deploying and managing the Cats HELP donation platform.

## Available Workflows

### 1. 🚀 Deploy to Production (`deploy-production.yml`)

Deploys the application with **LIVE Montonio payments**.

**Trigger:** Manual (`workflow_dispatch`)
**Confirmation Required:** Type `PRODUCTION`
**Environment:** Production with live payments
**PM2 App Name:** `annetamistalgud-production`
**URL:** https://www.catshelp.ee

**What it does:**
- Builds frontend and backend
- Creates `.env.production` with production Montonio credentials
- Deploys to production directory
- Restarts PM2 with production environment
- Keeps last 5 production releases

**When to use:**
- After thoroughly testing in sandbox
- When ready to accept real donations
- For production bug fixes

⚠️ **WARNING:** This enables LIVE payments. Real money will be processed!

---

### 2. 🧪 Deploy to Sandbox (`deploy-sandbox.yml`)

Deploys the application with **TEST Montonio payments**.

**Trigger:** Manual (`workflow_dispatch`)
**Confirmation Required:** Type `SANDBOX`
**Environment:** Sandbox with test payments
**PM2 App Name:** `annetamistalgud-sandbox`
**URL:** https://test.catshelp.ee (or subdomain)

**What it does:**
- Builds frontend and backend
- Creates `.env.sandbox` with sandbox Montonio credentials
- Deploys to sandbox directory
- Restarts PM2 with sandbox environment
- Keeps last 3 sandbox releases

**When to use:**
- Testing new features before production
- Testing payment flow changes
- QA and user acceptance testing

✅ **Safe:** Only test payments are processed. No real money involved.

---

### 3. 🗄️ Database Migration (`database-migrate.yml`)

Applies Prisma database migrations or resets the database.

**Trigger:** Manual (`workflow_dispatch`)
**Options:**
- **Deploy** (Safe) - Applies pending migrations without data loss
- **Reset** (Dangerous) - Drops and recreates database

**Confirmation Required:**
- Type `MIGRATE` for deploy
- Type `RESET-DATABASE` for reset

**What it does:**
- Creates database backup (optional, enabled by default)
- Runs Prisma migrations on the server
- Restarts all PM2 applications
- Keeps last 10 database backups

**When to use:**
- After creating new Prisma migrations locally
- When database schema needs updating
- When you need to reset database (development only!)

⚠️ **WARNING:** Reset mode deletes ALL data! Always backup first!

---

### 4. 📦 Deploy (Legacy) (`deploy.yml`)

Legacy deployment workflow - manual trigger only.

**Trigger:** Manual (`workflow_dispatch`)
**Confirmation Required:** Type `deploy`
**Status:** Deprecated - Use production or sandbox workflows instead

---

## Required GitHub Secrets

Configure these secrets in GitHub repository settings (`Settings` → `Secrets and variables` → `Actions`):

### Server Access
```
SERVER_HOST           # VPS hostname or IP
SERVER_USER           # SSH username
CATSHELP_SSH_KEY      # Private SSH key for authentication
```

### Database
```
DATABASE_URL          # MySQL connection string
                      # Format: mysql://user:pass@host:3306/database
```

### Authentication
```
JWT_SECRET            # Secret for JWT token signing
ADMIN_PASSWORD_HASH   # Bcrypt hash of admin password
```

### Montonio Production (Live Payments)
```
MONTONIO_PRODUCTION_ACCESS_KEY    # Production API key
MONTONIO_PRODUCTION_SECRET_KEY    # Production secret key
```

### Montonio Sandbox (Test Payments)
```
MONTONIO_SANDBOX_ACCESS_KEY       # Sandbox API key
MONTONIO_SANDBOX_SECRET_KEY       # Sandbox secret key
```

### Google Sheets (Optional)
```
SHEETS_ID                 # Google Sheet ID for hoiukodu data
PROD_CREDENTIALS_PATH     # Path to credentials.json on server
```

---

## Deployment Flow

### Typical Development → Production Flow

1. **Develop Locally**
   - Make changes and test locally
   - Use ngrok for webhook testing
   - Commit changes to feature branch

2. **Deploy to Sandbox**
   - Merge to `main` or create PR
   - Run `Deploy to Sandbox` workflow
   - Test thoroughly with Montonio test bank accounts
   - Verify donations are tracked correctly

3. **Deploy to Production**
   - Once sandbox testing passes
   - Run `Deploy to Production` workflow
   - Monitor PM2 logs for any issues
   - Test with a small real donation

4. **Database Changes**
   - Create Prisma migration locally: `npx prisma migrate dev`
   - Commit migration files
   - Run `Database Migration` workflow (Deploy mode)
   - Verify schema changes applied correctly

---

## How to Run a Workflow

### Via GitHub Web UI

1. Go to `Actions` tab in GitHub
2. Select the workflow from the left sidebar
3. Click `Run workflow` button
4. Select branch (usually `main`)
5. Fill in required inputs (confirmation text)
6. Click `Run workflow`

### Via GitHub CLI

```bash
# Deploy to production
gh workflow run deploy-production.yml \
  --field confirmation=PRODUCTION

# Deploy to sandbox
gh workflow run deploy-sandbox.yml \
  --field confirmation=SANDBOX

# Run database migration (deploy)
gh workflow run database-migrate.yml \
  --field migration_type=deploy \
  --field confirmation=MIGRATE \
  --field backup_first=true

# Reset database (DANGEROUS!)
gh workflow run database-migrate.yml \
  --field migration_type=reset \
  --field confirmation=RESET-DATABASE \
  --field backup_first=true
```

---

## PM2 Management on Server

After deployment, you can manage apps via SSH:

```bash
# View all running apps
pm2 list

# View logs
pm2 logs annetamistalgud-production
pm2 logs annetamistalgud-sandbox

# Restart an app
pm2 restart annetamistalgud-production

# Stop an app
pm2 stop annetamistalgud-production

# View app details
pm2 describe annetamistalgud-production

# Save PM2 process list
pm2 save

# View monitoring dashboard
pm2 monit
```

---

## Rollback Procedure

If a deployment causes issues, you can quickly rollback:

1. **SSH into server:**
   ```bash
   ssh user@server
   cd /data01/virt133730/domeenid/www.catshelp.ee/annetamistalgud/releases
   ```

2. **List recent releases:**
   ```bash
   ls -lt | head -10
   ```

3. **Symlink to previous release:**
   ```bash
   # For production
   ln -sfn releases/prod-2025.01.01-12.30.00-abc1234/dist annetamistalgud
   pm2 restart annetamistalgud-production

   # For sandbox
   ln -sfn releases/sandbox-2025.01.01-12.30.00-abc1234/dist annetamistalgud-sandbox/current
   pm2 restart annetamistalgud-sandbox
   ```

4. **Verify rollback:**
   ```bash
   pm2 logs annetamistalgud-production --lines 50
   ```

---

## Troubleshooting

### Workflow fails with "permission denied"
- Check SSH key is correctly added to secrets
- Verify SSH key has proper permissions on server
- Ensure server user has write access to deployment directories

### PM2 app won't start
- Check environment file exists: `ls /path/to/app/.env.*`
- View PM2 logs: `pm2 logs app-name --err`
- Verify DATABASE_URL and other secrets are correct
- Check Node.js version compatibility

### Database migration fails
- Ensure DATABASE_URL secret is correct
- Check database server is accessible
- Verify database user has migration permissions
- Review Prisma migration files for syntax errors

### Payments not working after deployment
- Verify correct Montonio credentials for environment
- Check NOTIFY_URL is accessible (not localhost)
- Review Montonio API logs in application logs
- Ensure Montonio API URLs are correct (Stargate endpoints)

---

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use strong confirmation** for destructive operations
3. **Always backup** before database migrations
4. **Test in sandbox** before deploying to production
5. **Monitor logs** after deployment
6. **Rotate SSH keys** periodically
7. **Keep dependencies** updated regularly
8. **Review workflow** runs for anomalies

---

## Monitoring

After deployment, monitor:

- **PM2 Logs:** `pm2 logs app-name`
- **Application Health:** Check website loads
- **Payment Flow:** Test a small donation
- **Database:** Verify connections work
- **Disk Space:** `df -h` (releases accumulate)

---

## Support

For issues with deployments:
1. Check workflow run logs in GitHub Actions
2. SSH into server and check PM2 logs
3. Verify secrets are configured correctly
4. Review server disk space and permissions
5. Contact development team if issues persist

---

**Remember:** Every euro saved helps rescue more cats! 🐱💖
