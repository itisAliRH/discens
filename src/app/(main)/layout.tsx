import Link from 'next/link';

/**
 * Main app layout with navigation
 * Used for authenticated pages (dashboard, learn, review, etc.)
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              D
            </div>
            <span className="font-semibold hidden sm:block">Discens</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" icon="🏠" label="Home" />
            <NavLink href="/learn" icon="📚" label="Learn" />
            <NavLink href="/review" icon="🔄" label="Review" />
            <NavLink href="/conversation" icon="💬" label="Talk" />
            <NavLink href="/memory" icon="🧠" label="Memory" />
          </nav>

          {/* User menu placeholder */}
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs">👤</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm z-50">
        <div className="flex items-center justify-around h-16">
          <MobileNavLink href="/dashboard" icon="🏠" label="Home" />
          <MobileNavLink href="/learn" icon="📚" label="Learn" />
          <MobileNavLink href="/review" icon="🔄" label="Review" />
          <MobileNavLink href="/conversation" icon="💬" label="Talk" />
          <MobileNavLink href="/memory" icon="🧠" label="Memory" />
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <span>{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}

function MobileNavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </Link>
  );
}
