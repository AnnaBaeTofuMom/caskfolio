'use client';

import { FormEvent, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export function LoginForm() {
  const [email, setEmail] = useState('demo@caskfolio.com');
  const [password, setPassword] = useState('secret123');
  const [status, setStatus] = useState('');

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

    const data = (await response.json()) as { token?: string; refreshToken?: string };
    if (!data.token || !data.refreshToken) {
      setStatus('Login succeeded but tokens missing');
      return;
    }

    window.localStorage.setItem('caskfolio_access_token', data.token);
    window.localStorage.setItem('caskfolio_refresh_token', data.refreshToken);
    setStatus('Login successful');
  }

  return (
    <form className="card form-grid" onSubmit={onSubmit}>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </label>
      <button className="btn primary" type="submit">
        Login
      </button>
      <a className="btn ghost" href={`${API_BASE}/auth/google/callback?idToken=demo`}>
        Continue with Google (dev)
      </a>
      <a className="btn ghost" href={`${API_BASE}/auth/apple/callback?idToken=demo.demo.demo`}>
        Continue with Apple (dev)
      </a>
      <small>{status}</small>
    </form>
  );
}
