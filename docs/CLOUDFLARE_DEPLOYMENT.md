# Cloudflare Pages Deployment Guide

This guide will help you deploy your Discens application to Cloudflare Pages using the **Cloudflare Dashboard** (no GitHub Actions needed).

## Prerequisites

- A Cloudflare account ([sign up here](https://dash.cloudflare.com/sign-up))
- Your code pushed to a GitHub or GitLab repository
- A Supabase project set up ([see main README](../README.md))
- OpenAI API key (for AI features)
- (Optional) ElevenLabs API key for voice features

---

## Step 1: Push Your Code to Git

Make sure your latest code is pushed to GitHub or GitLab:

```bash
git add .
git commit -m "feat: prepare for Cloudflare Pages deployment"
git push origin main
```

---

## Step 2: Create Cloudflare Pages Project

1. **Log in to Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)

2. **Navigate to Workers & Pages**
   - Click on **Workers & Pages** in the left sidebar
   - Or visit directly: [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)

3. **Create New Application**
   - Click **Create application**
   - Select the **Pages** tab
   - Click **Connect to Git**

4. **Connect Your Repository**
   - Authorize Cloudflare to access your GitHub/GitLab account (if not already done)
   - Select your **discens** repository from the list
   - Click **Begin setup**

---

## Step 3: Configure Build Settings

In the **Set up builds and deployments** section, configure as follows:

### Basic Settings

| Configuration | Value |
|--------------|-------|
| **Production branch** | `main` (or your default branch) |
| **Framework preset** | Next.js |
| **Build command** | `npm run build` |
| **Build output directory** | `.next` |

### Advanced Settings

1. **Node.js version**: The build will use Node.js v22 by default (latest)
   - If you need a specific version, add environment variable: `NODE_VERSION=20`

2. **Root directory**: Leave empty (or `/` if your app is in a subdirectory)

3. **Project name**: This will be your subdomain (`discens.pages.dev`)
   - You can customize this to whatever you prefer

---

## Step 4: Add Environment Variables

**IMPORTANT:** Before deploying, you must add environment variables.

1. Scroll down to **Environment variables (advanced)**
2. Click **Add variable** for each variable below

### Required Variables

Add these for **both Production and Preview** environments:

```plaintext
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration  
OPENAI_API_KEY=sk-your_openai_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://discens.pages.dev
```

### Optional Variables (for Voice Features)

```plaintext
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Where to Find These Values:

- **Supabase URL & Keys**: 
  - Go to your [Supabase Project](https://supabase.com/dashboard)
  - Settings → API
  - Copy `URL`, `anon` key, and `service_role` key

- **OpenAI API Key**:
  - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
  - Create a new API key

- **ElevenLabs API Key** (optional):
  - Go to [ElevenLabs Dashboard](https://elevenlabs.io/)
  - Get your API key for voice conversations
  - Voice agents are created dynamically per session

---

## Step 5: Deploy!

1. **Review your configuration**
   - Make sure all settings are correct
   - Verify all environment variables are added

2. **Click "Save and Deploy"**
   - Cloudflare will now:
     - Clone your repository
     - Install dependencies (`npm ci`)
     - Build your Next.js app (`npm run build`)
     - Deploy to the edge

3. **Monitor the build**
   - You'll see real-time build logs
   - First build typically takes 2-5 minutes
   - Watch for any errors in the logs

4. **Access your deployed site**
   - Once complete, you'll get a URL: `https://discens.pages.dev`
   - Click the link to view your live site!

---

## Step 6: Configure Supabase Redirect URLs

**CRITICAL:** Update Supabase to allow authentication from your new domain.

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Add these URLs:

**Site URL:**
```
https://discens.pages.dev
```

**Redirect URLs:** (add all of these)
```
https://discens.pages.dev/callback
https://discens.pages.dev/**
http://localhost:3000/callback
http://localhost:3000/**
```

5. Click **Save**

---

## Step 7: Test Your Deployment

1. **Visit your site**: `https://discens.pages.dev`
2. **Test authentication**:
   - Try logging in with Google/Email
   - Verify the callback works
3. **Test core features**:
   - Create account or log in
   - Complete onboarding
   - Try learning mode
   - Test conversations

---

## Automatic Deployments

From now on, Cloudflare Pages will **automatically**:
- ✅ Deploy every commit pushed to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Run builds and deploy within minutes

### Preview Deployments

Every pull request gets its own preview URL:
- Format: `https://abc123.discens.pages.dev`
- Perfect for testing changes before merging
- Automatically cleaned up when PR is closed

---

## Managing Your Deployment

### View Deployments

1. Go to **Workers & Pages** in Cloudflare Dashboard
2. Click your **discens** project
3. View all deployments with status and links

### Update Environment Variables

1. Go to your project in Cloudflare Dashboard
2. Click **Settings** → **Environment variables**
3. Add/Edit/Delete variables
4. Choose whether to apply to:
   - **Production** only
   - **Preview** only
   - **Both**
5. **Important**: Redeploy after changing variables
   - Go to **Deployments** tab
   - Click ⋯ (three dots) on latest deployment
   - Select **Retry deployment**

### View Build Logs

1. Go to **Deployments** tab
2. Click on any deployment
3. View detailed build logs to debug issues

### Rollback a Deployment

1. Go to **Deployments** tab
2. Find a previous successful deployment
3. Click ⋯ (three dots)
4. Select **Rollback to this deployment**

---

## Custom Domain Setup (Optional)

Want to use your own domain instead of `discens.pages.dev`?

1. **Add Custom Domain**
   - In your project, go to **Custom domains**
   - Click **Set up a custom domain**
   - Enter your domain (e.g., `app.yourdomain.com`)
   - Follow DNS configuration instructions

2. **Update Environment Variables**
   - Change `NEXT_PUBLIC_APP_URL` to your custom domain
   - Example: `https://app.yourdomain.com`

3. **Update Supabase URLs**
   - Add your custom domain to Supabase redirect URLs
   - Both site URL and redirect URLs

4. **SSL Certificate**
   - Cloudflare automatically provisions SSL certificates
   - HTTPS is enabled by default
   - Certificates auto-renew

---

## Troubleshooting

### Build Fails

**Check the build logs first!** Common issues:

1. **Missing environment variables**
   - Error: `NEXT_PUBLIC_SUPABASE_URL is not defined`
   - Fix: Add all required environment variables

2. **Node.js version mismatch**
   - Your local Node.js version differs from build
   - Fix: Add `NODE_VERSION=20` environment variable

3. **Build command fails**
   - Error during `npm run build`
   - Fix: Test build locally first: `npm run build`
   - Check for TypeScript errors or missing dependencies

4. **Out of memory**
   - Large builds can exceed memory limits
   - Fix: Optimize your build or contact Cloudflare support

### Authentication Issues

1. **OAuth redirect fails**
   - Fix: Ensure Cloudflare Pages URL is in Supabase redirect URLs
   - Must include `https://your-project.pages.dev/callback`

2. **Session not persisting**
   - Fix: Check that cookies are enabled
   - Verify `NEXT_PUBLIC_APP_URL` matches your actual domain

### API Errors

1. **OpenAI API errors**
   - Check API key is valid and has credits
   - Verify `OPENAI_API_KEY` is set correctly

2. **Supabase connection errors**
   - Verify all three Supabase environment variables are set
   - Check that Supabase project is active and not paused

3. **ElevenLabs voice not working**
   - Verify `ELEVENLABS_API_KEY` is set
   - Voice features require server-side API key only (agents are created dynamically)
   - Voice features are optional and won't break the app if missing

### Pages Not Loading

1. **404 errors on routes**
   - Next.js routing should work automatically
   - If issues persist, ensure build output directory is `.next`

2. **Assets not loading**
   - Check browser console for errors
   - Verify `NEXT_PUBLIC_APP_URL` is set correctly

---

## Performance & Features

Cloudflare Pages provides:

- 🌍 **Global CDN**: 300+ data centers worldwide
- ⚡ **Edge Computing**: Ultra-low latency
- 🔒 **Automatic HTTPS**: Free SSL certificates
- 🛡️ **DDoS Protection**: Enterprise-grade security
- 📊 **Analytics**: Built-in visitor insights
- 🔄 **Instant Rollbacks**: One-click deployment rollback
- 🌿 **Preview Deployments**: Test PRs before merging
- ♾️ **Unlimited Bandwidth**: No bandwidth charges

---

## Monitoring & Analytics

### View Analytics

1. Go to your project in Cloudflare Dashboard
2. Click **Analytics** tab
3. View metrics:
   - Page views
   - Unique visitors
   - Bandwidth usage
   - Request status codes

### Set Up Web Analytics

1. Go to **Analytics & Logs** → **Web Analytics**
2. Add your site
3. Get more detailed visitor insights

### Monitor Build Status

- Set up notifications for failed builds
- Check deployment status via Cloudflare dashboard
- Build status is also visible in GitHub/GitLab PRs

---

## Cost

Cloudflare Pages is **FREE** for:
- ✅ Unlimited sites
- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds per month
- ✅ 1 concurrent build

**Need more?** Upgrade to Pages Pro:
- 5,000 builds/month
- 5 concurrent builds
- Advanced features

---

## Next Steps

- ✅ Deploy to production
- ✅ Set up custom domain
- ✅ Configure Supabase authentication
- ✅ Test all features
- ✅ Monitor analytics
- ✅ Set up preview deployments for PRs

---

## Support & Resources

- 📚 [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- 💬 [Cloudflare Community](https://community.cloudflare.com/)
- 🐛 [Report Issues](https://github.com/yourusername/discens/issues)
- 📖 [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

---

## Security Best Practices

1. **Never commit secrets** to Git
   - Use environment variables for all sensitive data
   - Add `.env.local` to `.gitignore`

2. **Rotate API keys regularly**
   - Update in Cloudflare dashboard
   - Redeploy after rotation

3. **Use Preview deployments**
   - Test changes before merging to production
   - Each PR gets its own isolated environment

4. **Monitor access logs**
   - Check for unusual activity
   - Use Cloudflare's security features

---

**You're all set!** 🎉 Your Discens app should now be live on Cloudflare Pages.
