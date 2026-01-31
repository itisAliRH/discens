import Link from 'next/link';
import {
  LuHouse,
  LuBookOpen,
  LuRotateCcw,
  LuMessageCircle,
  LuBrain,
  LuHistory,
  LuUser,
} from 'react-icons/lu';

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
      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm z-50">
        <div className="flex items-center justify-around h-16">
          <MobileNavLink href="/dashboard" icon={<LuHouse />} label="Home" />
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
