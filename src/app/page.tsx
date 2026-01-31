import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Logo/Brand */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground text-3xl font-bold mb-4">
            D
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Discens
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-2">
            AI-Powered Language Learning
          </p>
        </div>

        {/* Tagline */}
        <div className="max-w-2xl mb-12 animate-slide-up">
          <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed">
            Learn languages the way your brain works.{' '}
            <span className="text-primary font-semibold">
              Personalized memory
            </span>
            , adaptive quizzes, and real conversations powered by AI.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
          >
            Start Learning
            <svg
              className="ml-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          <FeatureCard
            icon="🧠"
            title="Memory-Based Learning"
            description="Your knowledge grows with every session. Track words, phrases, and grammar you've mastered."
          />
          <FeatureCard
            icon="🎯"
            title="Adaptive Quizzes"
            description="AI generates personalized exercises based on your progress and learning goals."
          />
          <FeatureCard
            icon="🗣️"
            title="Real Conversations"
            description="Practice with AI role-plays. Be a customer, employee, or patient - mistakes corrected after."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-sm text-muted-foreground border-t border-border">
        <p>
          Built with ❤️ at{' '}
          <a
            href="https://luma.com/hl7wv7k3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Hamburg Cursor Hackathon
          </a>
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
