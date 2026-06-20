'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || `racer_${Date.now().toString(36)}` },
          },
        });
        if (error) throw error;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-[100px]"
          style={{ background: 'var(--accent-primary)' }}
        />
        <div
          className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-10 blur-[100px]"
          style={{ background: 'var(--accent-secondary)' }}
        />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-racing text-4xl font-bold tracking-wider text-gradient mb-2">
            F1 MANAGER
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] tracking-wide">
            Build your racing empire
          </p>
        </div>

        {/* Auth Card */}
        <div className="card p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          {/* Tab Toggle */}
          <div className="flex gap-1 p-1 bg-[var(--background)] rounded-xl mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                isLogin
                  ? 'bg-[var(--background-elevated)] text-white shadow-sm'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
              }`}
              id="tab-login"
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                !isLogin
                  ? 'bg-[var(--background-elevated)] text-white shadow-sm'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
              }`}
              id="tab-register"
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5 uppercase tracking-wider">
                  Team Manager Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. RacingLegend99"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors text-sm"
                  id="input-username"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors text-sm"
                id="input-email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors text-sm"
                id="input-password"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-sm relative"
              id="btn-submit"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? (
                'Enter the Paddock'
              ) : (
                'Create Team'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--foreground-muted)] mt-6">
          v{process.env.NEXT_PUBLIC_GAME_VERSION || '0.1.0'} • Built with 🏎️
        </p>
      </div>
    </div>
  );
}
