import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';
import Navbar from '@/components/ui/Navbar';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }
  
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        themes={['light', 'dark', 'system']}
      >
        <Navbar />
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
