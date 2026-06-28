import BottomNav from '@/components/ui/BottomNav';
import { LocaleProvider } from '@/lib/i18n/context';
import { Locale } from '@/lib/i18n/translations';
import { cookies } from 'next/headers';

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale;

  return (
    <LocaleProvider initialLocale={locale}>
      <div className="mobile-shell">
        <main className="mobile-content">
          {children}
        </main>
        <BottomNav />
      </div>
    </LocaleProvider>
  );
}
