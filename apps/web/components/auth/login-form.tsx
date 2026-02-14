'use client';

import { FormEvent, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export function LoginForm() {
  const [email, setEmail] = useState('demo@caskfolio.com');
  const [password, setPassword] = useState('secret123');
  const [phone, setPhone] = useState('+821012341234');
  const [phoneCode, setPhoneCode] = useState('');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
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
        if (!data.token || !data.refreshToken) throw new Error('tokens missing');
        window.localStorage.setItem('caskfolio_access_token', data.token);
        window.localStorage.setItem('caskfolio_refresh_token', data.refreshToken);
        if (data.email) window.localStorage.setItem('caskfolio_user_email', data.email);
        if (data.name) window.localStorage.setItem('caskfolio_user_name', data.name);
        setStatus('OAuth login successful');
      })
      .catch(() => setStatus('OAuth login failed'));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Signing in...');

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
    if (!data.token || !data.refreshToken) {
      setStatus('Login succeeded but tokens missing');
      return;
    }

    window.localStorage.setItem('caskfolio_access_token', data.token);
    window.localStorage.setItem('caskfolio_refresh_token', data.refreshToken);
    window.localStorage.setItem('caskfolio_user_email', email);
    if (data.name) window.localStorage.setItem('caskfolio_user_name', data.name);
    setStatus('Login successful');
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
      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        setStatus(`${provider} oauth url missing`);
        return;
      }
      window.location.href = data.url;
    } catch {
      setStatus(`${provider} oauth start failed`);
    }
  }

  async function requestPhoneCode() {
    setStatus('Requesting phone verification code...');
    const response = await fetch(`${API_BASE}/auth/phone/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone })
    });
    if (!response.ok) {
      setStatus('Phone code request failed');
      return;
    }
    const data = (await response.json()) as { code?: string };
    if (data.code) {
      setPhoneCode(data.code);
      setStatus(`Verification code issued: ${data.code}`);
      return;
    }
    setStatus('Verification code sent');
  }

  async function verifyPhoneCode() {
    setStatus('Verifying phone...');
    const response = await fetch(`${API_BASE}/auth/phone/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, code: phoneCode })
    });
    setStatus(response.ok ? 'Phone verified successfully' : 'Phone verification failed');
  }

  return (
    <div className="login-wrap">
      <header className="login-head">
        <h1>Welcome Back</h1>
        <p className="sub">Sign in to manage your whisky collection</p>
      </header>
      <form suppressHydrationWarning className="card form-grid login-card" onSubmit={onSubmit}>
        <h2>Sign In</h2>
        <p className="sub">Choose your preferred sign-in method</p>

        <label>
          Email
          <input suppressHydrationWarning type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input suppressHydrationWarning type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        <button className="btn primary" type="submit">
          Sign In
        </button>

        <div className="or-row">or continue with</div>

        <button className="btn ghost" type="button" onClick={() => void startOauth('google')}>
          Continue with Google
        </button>
        <button className="btn ghost" type="button" onClick={() => void startOauth('apple')}>
          Continue with Apple
        </button>

        <button className="btn secondary" type="button" onClick={() => setShowPhoneVerification((prev) => !prev)}>
          Verify with Phone Number
        </button>

        {showPhoneVerification ? (
          <section className="phone-panel">
            <label>
              Phone
              <input suppressHydrationWarning value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8210..." />
            </label>
            <label>
              Code
              <input suppressHydrationWarning value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} placeholder="6-digit code" />
            </label>
            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => void requestPhoneCode()}>
                Request Code
              </button>
              <button className="btn primary" type="button" onClick={() => void verifyPhoneCode()}>
                Verify
              </button>
            </div>
          </section>
        ) : null}

        <small>{status}</small>
      </form>
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
