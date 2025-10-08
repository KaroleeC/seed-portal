import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { brand, getThemedLogo } from '@/assets';
import { useTheme } from '@/theme';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const logoSrc = getThemedLogo(brand, theme);
  const logoFallback = brand.darkFallback;

  useEffect(() => {
    // If already signed in, redirect home
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = '/';
      }
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) setError(error.message);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to start sign-in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src={logoSrc}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== logoFallback) {
                target.src = logoFallback;
              }
            }}
            alt="Seed Financial Logo"
            className="h-16 mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-white">Welcome to Seed Portal</h2>
          <p className="mt-2 text-sm text-white/80">Use your @seedfinancial.io Google account</p>
        </div>

        <Card className="w-full shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Secure Google sign-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
            )}
            <Button onClick={handleGoogleSignIn} disabled={loading} className="w-full bg-[#e24c00] hover:bg-[#c13e00] text-white">
              {loading ? 'Redirecting…' : 'Sign in with Google'}
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="w-full">
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
