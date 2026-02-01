# Discens - AI-Powered Language Learning App

A personalized language learning platform powered by AI, built with Next.js, Supabase, and OpenAI.

## Features

- 🧠 **Memory-based Learning**: Personalized vocabulary and grammar storage
- 🗣️ **AI Conversations**: Practice real-world scenarios with voice or text
- 📚 **Smart Reviews**: Spaced repetition using FSRS algorithm
- 🎯 **Adaptive Quizzes**: AI-generated exercises based on your level
- 🌍 **Multi-language**: Support for English and German
- 🎨 **Beautiful UI**: Dark/light mode with modern design
- 🔊 **Voice Support**: ElevenLabs integration for realistic conversations
- 📊 **Progress Tracking**: Streaks, badges, and XP system

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google, Apple, Email)
- **AI**: OpenAI GPT-4o & GPT-4o-mini
- **Voice**: ElevenLabs API
- **Styling**: Tailwind CSS v4
- **Icons**: React Icons (Lucide)
- **Spaced Repetition**: ts-fsrs

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- A Supabase account
- An OpenAI API key
- (Optional) ElevenLabs API key for voice features

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/discens.git
cd discens
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy `env.example` to `.env.local` and fill in your credentials:

```bash
cp env.example .env.local
```

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs Configuration (Optional - for voice conversations)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Set up Supabase**

- Create a new Supabase project
- Run the migrations in `supabase/migrations/` folder
- Configure authentication providers (Google, Apple, Email)
- Add your local URL to redirect URLs: `http://localhost:3000/callback`

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment

### Deploy to Cloudflare Pages (Recommended)

See our comprehensive [Cloudflare Deployment Guide](./docs/CLOUDFLARE_DEPLOYMENT.md) for step-by-step instructions on deploying to Cloudflare Pages via the dashboard. No GitHub Actions required - just connect your repo and deploy!

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/discens)

1. Click the button above or go to [Vercel](https://vercel.com/new)
2. Import your repository
3. Add environment variables (same as `.env.local`)
4. Deploy!

## Project Structure

```
discens/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (main)/         # Main app pages (dashboard, learn, etc.)
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   └── ui/             # UI components
│   ├── lib/                # Utilities and configurations
│   │   ├── ai/             # AI providers and logic
│   │   ├── auth/           # Authentication hooks
│   │   ├── fsrs/           # Spaced repetition logic
│   │   └── supabase/       # Supabase client configs
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── docs/                   # Documentation
```

## Key Features Explained

### Memory System
The core of Discens is the "Memory" - a personalized database of words, phrases, and grammar rules that grows as you learn. Each material has:
- Mastery level (0-5)
- CEFR level (A1-C2)
- Categories (travel, work, food, etc.)
- Examples and synonyms
- FSRS review scheduling

### AI Conversations
Practice real-world scenarios with AI characters:
- Café ordering
- Doctor appointments
- Job interviews
- And more!

Choose voice or text mode, with background ambiance for immersion.

### Smart Reviews
Uses the FSRS (Free Spaced Repetition Scheduler) algorithm to show you materials at optimal intervals for retention.

### Gamification
- Daily streaks
- XP and levels
- Badges for achievements
- Gems system (future: marketplace)

## Development

### Run tests

```bash
npm test
```

### Lint code

```bash
npm run lint
```

### Build for production

```bash
npm run build
```

### Generate Supabase types

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

- 📧 Email: support@discens.app
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/discens/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/discens/discussions)

## Acknowledgments

- Built for the Hamburg Cursor Hackathon
- Powered by OpenAI and ElevenLabs
- UI inspired by modern language learning apps
- FSRS algorithm by Jarrett Ye

---

Made with ❤️ by the Discens Team
