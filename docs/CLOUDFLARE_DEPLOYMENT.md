# Cloudflare Pages Deployment Guide

This guide will help you deploy your Discens application to Cloudflare Pages.

## Prerequisites

- A Cloudflare account ([sign up here](https://dash.cloudflare.com/sign-up))
- A GitHub repository with your Discens code
- A Supabase project set up ([see main README](../README.md))
- ElevenLabs API key (optional, for voice features)
- OpenAI API key (for AI features)

## Step 1: Create a Cloudflare Pages Project

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Pages**
3. Click **Create a project**
4. Choose **Connect to Git**
5. Select your GitHub repository (you may need to authorize Cloudflare)
6. Configure build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/` (leave empty)
   - **Node version**: `20`

## Step 2: Configure Environment Variables

In your Cloudflare Pages project settings, go to **Settings** → **Environment variables** and add:

### Required Variables

```plaintext
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-project.pages.dev
```

### Optional Variables

```plaintext
# ElevenLabs Configuration (for voice features)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
```

**Important**: Add these variables for both **Production** and **Preview** environments.

## Step 3: Configure GitHub Secrets (for GitHub Actions)

If using the automated GitHub Actions workflow, add these secrets to your repository:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

```plaintext
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=https://your-project.pages.dev
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id (optional)
```

### Getting Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click your profile → **API Tokens**
3. Click **Create Token**
4. Use the **Edit Cloudflare Workers** template or create a custom token with:
   - **Account** → **Cloudflare Pages** → **Edit**
5. Copy the token and add it as `CLOUDFLARE_API_TOKEN`

### Getting Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. The Account ID is visible in the right sidebar or in the URL
4. Copy it and add as `CLOUDFLARE_ACCOUNT_ID`

## Step 4: Deploy

### Option A: Automatic Deployment (Recommended)

The GitHub Actions workflow will automatically deploy when you:
- Push to the `main` branch
- Create a pull request

Check the **Actions** tab in your GitHub repository to monitor deployment status.

### Option B: Manual Deployment via Cloudflare Dashboard

1. Push your code to GitHub
2. Go to your Cloudflare Pages project
3. Click **View builds**
4. Cloudflare will automatically build and deploy

### Option C: Using Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
npm run build

# Deploy
wrangler pages deploy .next --project-name=discens
```

## Step 5: Configure Custom Domain (Optional)

1. In your Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `discens.app`)
4. Follow the DNS configuration instructions
5. Update `NEXT_PUBLIC_APP_URL` to your custom domain

## Step 6: Update Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Cloudflare Pages URL to:
   - **Site URL**: `https://your-project.pages.dev`
   - **Redirect URLs**: Add both:
     - `https://your-project.pages.dev/callback`
     - `https://your-project.pages.dev/**`

## Troubleshooting

### Build Fails

- Check that all environment variables are set correctly
- Verify Node.js version is 20 or higher
- Check build logs in Cloudflare Pages dashboard

### Authentication Issues

- Ensure Supabase redirect URLs include your Cloudflare Pages domain
- Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

### API Errors

- Verify all API keys are set in environment variables
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set for server-side operations
- Ensure OpenAI API key has sufficient credits

## Performance Optimization

Cloudflare Pages provides:
- **Global CDN**: Content served from 300+ locations worldwide
- **Automatic HTTPS**: SSL certificates managed automatically
- **DDoS protection**: Built-in security
- **Edge caching**: Static assets cached at the edge

## Monitoring

1. View deployment logs in Cloudflare Pages dashboard
2. Monitor analytics in **Analytics** tab
3. Set up alerts for build failures
4. Use Cloudflare Web Analytics for visitor insights

## Next Steps

- Set up a custom domain
- Configure preview deployments for PRs
- Enable Cloudflare Analytics
- Set up branch deployments for staging

## Support

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Supabase Documentation](https://supabase.com/docs)
