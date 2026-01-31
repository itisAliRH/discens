import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Discens - AI Language Learning',
    template: '%s | Discens',
  },
  description:
    'Personalized AI-powered language learning app based on memory. Learn English or German with adaptive quizzes, real conversations, and spaced repetition.',
  keywords: [
    'language learning',
    'AI',
    'German',
    'English',
    'spaced repetition',
    'FSRS',
    'vocabulary',
    'grammar',
  ],
  authors: [{ name: 'Discens Team' }],
  creator: 'Discens',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://discens.app',
    title: 'Discens - AI Language Learning',
    description: 'Personalized AI-powered language learning app based on memory',
    siteName: 'Discens',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discens - AI Language Learning',
    description: 'Personalized AI-powered language learning app based on memory',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
