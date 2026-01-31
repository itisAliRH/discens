import Link from 'next/link';
import {
  LuHome,
  LuBookOpen,
  LuRotateCcw,
  LuMessageCircle,
  LuBrain,
  LuHistory,
  LuUser,
} from 'react-icons/lu';
import LanguageSelector from '@/components/ui/LanguageSelector';
import ThemeToggle from '@/components/ui/ThemeToggle';

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
            <NavLink href="/dashboard" icon={<LuHome />} label="Home" />
            <NavLink href="/learn" icon={<LuBookOpen />} label="Learn" />
            <NavLink href="/review" icon={<LuRotateCcw />} label="Review" />
            <NavLink href="/conversation" icon={<LuMessageCircle />} label="Talk" />
            <NavLink href="/history" icon={<LuHistory />} label="History" />
            <NavLink href="/memory" icon={<LuBrain />} label="Memory" />
          </nav>

          {/* Right side: Theme toggle + Language selector + User menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            >
              <LuUser className="w-4 h-4" />
            </Link>
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
          <MobileNavLink href="/dashboard" icon={<LuHome />} label="Home" />
          <MobileNavLink href="/learn" icon={<LuBookOpen />} label="Learn" />
          <MobileNavLink href="/conversation" icon={<LuMessageCircle />} label="Talk" />
          <MobileNavLink href="/history" icon={<LuHistory />} label="History" />
          <MobileNavLink href="/profile" icon={<LuUser />} label="Profile" />
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <span className="w-4 h-4">{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}

function MobileNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="text-xs">{label}</span>
    </Link>
  );
}
