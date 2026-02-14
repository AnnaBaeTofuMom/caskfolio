'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_STATE_CHANGED_EVENT, readAuthContext } from '../../lib/auth-state';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api-proxy';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const idToken = hashParams.get('id_token') ?? queryParams.get('id_token');
    if (!idToken) return;

    const provider = detectProvider(idToken) === 'apple' ? 'apple' : 'google';
    setStatus(`Completing ${provider} login...`);
    fetch(`${API_BASE}/auth/${provider}/callback?idToken=${encodeURIComponent(idToken)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('oauth callback failed');
        const data = (await response.json()) as { token?: string; refreshToken?: string; email?: string; name?: string };
        completeLogin(data);
        setStatus('OAuth login successful');
      })
      .catch(() => setStatus('OAuth login failed'));
  }, []);

  function completeLogin(data: { token?: string; refreshToken?: string; email?: string; name?: string }) {
    if (!data.token) throw new Error('token missing');
    const refreshToken = data.refreshToken ?? data.token;
    window.localStorage.setItem('caskfolio_access_token', data.token);
    window.localStorage.setItem('caskfolio_refresh_token', refreshToken);
    const auth = readAuthContext(window.localStorage);
    const tokenEmail = auth?.email;
    if (data.email || tokenEmail || email) {
      window.localStorage.setItem('caskfolio_user_email', data.email ?? tokenEmail ?? email);
    }
    if (data.name) window.localStorage.setItem('caskfolio_user_name', data.name);
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
    router.push('/portfolio');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(mode === 'signin' ? 'Signing in...' : 'Creating account...');
    try {
      if (mode === 'signup') {
        const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });

        if (!signupResponse.ok) {
          setStatus('Signup failed');
          return;
        }
      }

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        setStatus('Login failed');
        return;
      }

      const data = (await response.json()) as { token?: string; refreshToken?: string; email?: string; name?: string };
      completeLogin(data);
      setStatus('Login successful');
    } catch {
      setStatus('Cannot connect to API server');
    }
  }

  async function startOauth(provider: 'google' | 'apple') {
    setStatus(`Redirecting to ${provider}...`);
    try {
      const redirectUri = `${window.location.origin}/auth/login`;
      const response = await fetch(`${API_BASE}/auth/${provider}?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        setStatus(`${provider} oauth start failed`);
        return;
      }
      const data = (await response.json()) as { url?: string; redirect?: string };
      const oauthUrl = data.url ?? data.redirect;
      if (!oauthUrl) {
        setStatus(`${provider} oauth url missing`);
        return;
      }
      if (!oauthUrl.startsWith('http://') && !oauthUrl.startsWith('https://') && !oauthUrl.startsWith('/')) {
        setStatus(`${provider} oauth start failed`);
        return;
      }
      window.location.href = oauthUrl.startsWith('/') ? `${window.location.origin}${oauthUrl}` : oauthUrl;
    } catch {
      setStatus(`${provider} oauth start failed`);
    }
  }

  return (
    <div className="login-wrap">
      <header className="login-head">
        <h1>Welcome Back</h1>
        <p className="sub">Sign in to manage your whisky collection</p>
      </header>
      <form suppressHydrationWarning className="card form-grid login-card" onSubmit={onSubmit}>
        <h2>Sign In</h2>
        <p className="sub">{mode === 'signin' ? 'Choose your preferred sign-in method' : 'Create your account first'}</p>

        <div className="actions" style={{ marginTop: 0 }}>
          <button className={`btn ${mode === 'signin' ? 'primary' : 'ghost'}`} type="button" onClick={() => setMode('signin')}>
            Sign In
          </button>
          <button className={`btn ${mode === 'signup' ? 'primary' : 'ghost'}`} type="button" onClick={() => setMode('signup')}>
            Sign Up
          </button>
        </div>

        {mode === 'signup' ? (
          <label>
            Name
            <input suppressHydrationWarning value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
        ) : null}

        <label>
          Email
          <input suppressHydrationWarning type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input suppressHydrationWarning type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
        </label>
        <button className="btn primary" type="submit">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        <div className="or-row">or continue with</div>

        <button className="btn ghost google-auth-btn" type="button" onClick={() => void startOauth('google')}>
          <span className="google-auth-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" role="img">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.5-.2-2.2H12z"
              />
              <path
                fill="#34A853"
                d="M12 21c2.5 0 4.7-.8 6.3-2.3l-3.1-2.4c-.9.6-2 1-3.2 1-2.5 0-4.5-1.7-5.2-4H3.6v2.5C5.2 18.9 8.3 21 12 21z"
              />
              <path
                fill="#4A90E2"
                d="M6.8 13.3c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.2H3.6C2.9 8.5 2.5 10 2.5 11.5s.4 3 1.1 4.3l3.2-2.5z"
              />
              <path
                fill="#FBBC05"
                d="M12 6.7c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.7 3.6 14.5 3 12 3 8.3 3 5.2 5.1 3.6 8.2l3.2 2.5c.7-2.3 2.7-4 5.2-4z"
              />
            </svg>
          </span>
          Continue with Google
        </button>
        {/* Apple login is temporarily hidden */}

        {/* Phone verification is temporarily hidden */}

        <p className="sub" style={{ fontSize: 12, textAlign: 'center' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
        <small>{status}</small>
      </form>
      <p className="sub" style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>
        Demo: Use any email to sign in. Add admin email to access admin panel.
      </p>
    </div>
  );
}

function detectProvider(idToken: string): 'google' | 'apple' {
  const parts = idToken.split('.');
  if (parts.length < 2) return 'google';
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { iss?: string };
    return payload.iss === 'https://appleid.apple.com' ? 'apple' : 'google';
  } catch {
    return 'google';
  }
}
