# TCG Tracker - Railway Deployment Guide

This guide walks you through deploying TCG Tracker to Railway using GitHub integration.

## Prerequisites

- GitHub repository with your code
- Railway account (sign up at https://railway.com)
- Railway CLI installed (`railway` command available)
- Resend API key (for email functionality): https://resend.com/api-keys

## Architecture Overview

The deployment consists of 3 Railway services:

1. **PostgreSQL Database** - Managed PostgreSQL instance
2. **API Service** - Bun + Hono backend (`apps/api`)
3. **Web Service** - Vite React frontend (`apps/web`)

## Step-by-Step Deployment

### 1. Create a New Railway Project

1. Go to https://railway.com/new
2. Click "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub account
4. Select your `tcg-tracker` repository

### 2. Add PostgreSQL Database

1. In your Railway project dashboard, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will create and provision the database automatically
4. Note: The `DATABASE_URL` variable will be automatically available to all services

### 3. Deploy the API Service

1. Click "+ New" → "GitHub Repo" → Select your repository
2. Configure the service:
   - **Service Name**: `api`
   - **Root Directory**: `apps/api`
   - **Watch Paths**: Already configured in `apps/api/railway.json`

3. Add environment variables (Settings → Variables):
   ```
   NODE_ENV=production
   JWT_SECRET=<generate with: openssl rand -base64 32>
   PORT=${{PORT}}
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   FRONTEND_URL=${{web.PUBLIC_DOMAIN}}
   RESEND_API_KEY=<your-resend-api-key>
   RESEND_FROM_EMAIL=<your-verified-email>
   ```

4. Generate a public domain (Settings → Networking → Generate Domain)

### 4. Deploy the Web Service

1. Click "+ New" → "GitHub Repo" → Select your repository again
2. Configure the service:
   - **Service Name**: `web`
   - **Root Directory**: `apps/web`
   - **Watch Paths**: Already configured in `apps/web/railway.json`

3. Add environment variables:
   ```
   VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
   ```

4. Generate a public domain (Settings → Networking → Generate Domain)

### 5. Run Database Migrations

After the API service is deployed:

1. Go to the API service in Railway dashboard
2. Click on the service → "Variables" tab
3. Copy the `DATABASE_URL` value
4. Run migrations locally (or use Railway's CLI):
   ```bash
   # Connect to Railway project
   railway link

   # Run migrations against production database
   railway run bun run --filter @tcg-tracker/db db:push
   ```

   **⚠️ Warning**: This will apply schema changes directly to production. Consider using migrations in the future.

### 6. Verify Deployment

1. **API Health Check**: Visit `https://your-api-domain.railway.app/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Web Application**: Visit `https://your-web-domain.railway.app`
   - Should load the React application

3. **Check Logs**: Monitor deployment logs in Railway dashboard for any errors

## Configuration Files

The following Railway configuration files have been added:

- `railway.json` - Root configuration
- `apps/api/railway.json` - API service configuration
- `apps/web/railway.json` - Web service configuration

These files configure:
- **Railpack builder** (Railway's latest build system with Bun support)
- **Watch patterns** - Rebuilds when shared packages change
- **Build commands** - Installs dependencies and builds the app
- **Start commands** - How to run each service in production

## Environment Variables Reference

### API Service

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-populated by Railway |
| `JWT_SECRET` | Secret key for JWT tokens | Generate with `openssl rand -base64 32` |
| `PORT` | Server port | Auto-populated by Railway |
| `NODE_ENV` | Environment mode | `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.railway.app` |
| `RESEND_API_KEY` | Resend API key for emails | `re_...` |
| `RESEND_FROM_EMAIL` | Email sender address | `noreply@yourdomain.com` |

### Web Service

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-api.railway.app` |

## Railway Variable References

Railway supports variable references using `${{service.VARIABLE}}` syntax:

- `${{Postgres.DATABASE_URL}}` - References the PostgreSQL database URL
- `${{web.PUBLIC_DOMAIN}}` - References the web service's public domain
- `${{api.RAILWAY_PUBLIC_DOMAIN}}` - References the API service's domain
- `${{PORT}}` - Railway-provided port (required)

## Automatic Deployments

Once connected to GitHub:

- **Main branch pushes** → Automatic production deployments
- **Pull requests** → Automatic preview environments (optional)
- **Rollbacks** → One-click rollback to previous deployments

## Monitoring and Logs

- **Logs**: Railway Dashboard → Service → "Logs" tab
- **Metrics**: Railway Dashboard → Service → "Metrics" tab
- **Health Checks**: API has `/health` endpoint for monitoring

## Common Issues

### 1. Build Fails - "bun: command not found"

**Solution**: Ensure `railway.json` files use `"builder": "RAILPACK"`. Railpack automatically includes Bun.

### 2. Database Connection Errors

**Solution**: Verify `DATABASE_URL` is properly referenced: `${{Postgres.DATABASE_URL}}`

### 3. CORS Errors

**Solution**: Ensure `FRONTEND_URL` in API service matches the web service's public domain.

### 4. 502 Bad Gateway on Web Service

**Solution**: Vite preview server must bind to `0.0.0.0` and use Railway's `$PORT`:
```json
"startCommand": "bun run preview --host 0.0.0.0 --port $PORT"
```

## Production Checklist

Before going to production:

- [ ] Generate strong `JWT_SECRET` (not the example value)
- [ ] Configure custom domain (optional)
- [ ] Set up Resend with verified domain (not test domain)
- [ ] Review database backup strategy
- [ ] Enable Railway's log retention
- [ ] Set up monitoring/alerting
- [ ] Test authentication flow end-to-end
- [ ] Test email sending (password reset, etc.)
- [ ] Review CORS configuration
- [ ] Enable HTTPS redirects (Railway handles this automatically)

## Updating Environment Variables

To update environment variables after deployment:

1. Railway Dashboard → Service → "Variables" tab
2. Add/edit variables
3. Service will automatically redeploy with new values

## Useful Railway CLI Commands

```bash
# Link to Railway project
railway link

# View logs
railway logs

# Open service in browser
railway open

# Run commands against production environment
railway run <command>

# SSH into service (for debugging)
railway shell
```

## Scaling and Performance

Railway provides:
- **Automatic scaling**: Configure in service settings
- **Horizontal scaling**: Increase replica count
- **Vertical scaling**: Upgrade service plan for more resources

For this stack:
- **Database**: Start with Postgres plan ($5-10/mo)
- **API**: Hobby plan should handle moderate traffic
- **Web**: Static assets served efficiently via Railway's CDN

## Cost Estimation

- **PostgreSQL**: ~$5-10/month (Railway's database pricing)
- **API Service**: ~$5/month (Hobby plan)
- **Web Service**: ~$5/month (Hobby plan)
- **Total**: ~$15-20/month

Railway offers $5 free credits monthly on the Hobby plan.

## Next Steps

After successful deployment:

1. **Custom Domain**: Add your domain in Railway Dashboard → Settings → Networking
2. **Monitoring**: Set up external monitoring (e.g., UptimeRobot, Better Stack)
3. **Analytics**: Consider adding analytics (Plausible, Umami, etc.)
4. **Error Tracking**: Add Sentry or similar for error tracking
5. **CI/CD**: Add GitHub Actions for tests before deployment

## Resources

- [Railway Monorepo Guide](https://docs.railway.com/guides/monorepo)
- [Bun on Railway Guide](https://bun.com/docs/guides/deployment/railway)
- [Railway Nixpacks Documentation](https://docs.railway.com/reference/nixpacks)
- [Railpack vs Nixpacks (2026)](https://www.bitdoze.com/nixpacks-vs-railpack/)

## Support

- Railway Discord: https://discord.gg/railway
- Railway Documentation: https://docs.railway.com
- Railway Status: https://status.railway.com
