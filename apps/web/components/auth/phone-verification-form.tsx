'use client';

import { FormEvent, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export function PhoneVerificationForm() {
  const [email, setEmail] = useState('demo@caskfolio.com');
  const [phone, setPhone] = useState('+821012341234');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setStatus('Requesting code...');

    const response = await fetch(`${API_BASE}/auth/phone/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone })
    });

    if (!response.ok) {
      setStatus('Code request failed');
      return;
    }

    const data = (await response.json()) as { code?: string };
    if (data.code) {
      setCode(data.code);
      setStatus(`Code issued (dev): ${data.code}`);
      return;
    }

    setStatus('Code requested');
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setStatus('Verifying code...');

    const response = await fetch(`${API_BASE}/auth/phone/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, code })
    });

    if (!response.ok) {
      setStatus('Phone verify failed');
      return;
    }

    setStatus('Phone verified');
  }

  return (
    <form className="card form-grid" onSubmit={verifyCode}>
      <h2>Phone Verification</h2>
      <label>
        Email
        <input suppressHydrationWarning type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Phone
        <input suppressHydrationWarning value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        Code
        <input suppressHydrationWarning value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" />
      </label>
      <div className="actions">
        <button className="btn ghost" type="button" onClick={requestCode}>
          Request Code
        </button>
        <button className="btn primary" type="submit">
          Verify Code
        </button>
      </div>
      <small>{status}</small>
    </form>
  );
}
