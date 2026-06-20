import BottomNav from '@/components/ui/BottomNav';

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mobile-shell">
      <main className="mobile-content">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
