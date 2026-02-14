'use client';

import { useEffect, useState } from 'react';

const API_PROGRESS_EVENT = 'caskfolio-api-progress';

declare global {
  interface Window {
    __caskfolioFetchPatched?: boolean;
    __caskfolioPendingRequests?: number;
  }
}

export function ApiProgressIndicator() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.__caskfolioFetchPatched) {
      const originalFetch = window.fetch.bind(window);
      window.__caskfolioPendingRequests = window.__caskfolioPendingRequests ?? 0;

      window.fetch = async (...args: Parameters<typeof fetch>) => {
        const [input] = args;
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const isApiRequest = url.includes('/api-proxy') || url.includes('/api/');

        if (isApiRequest) {
          window.__caskfolioPendingRequests = (window.__caskfolioPendingRequests ?? 0) + 1;
          window.dispatchEvent(
            new CustomEvent<number>(API_PROGRESS_EVENT, {
              detail: window.__caskfolioPendingRequests
            })
          );
        }

        try {
          return await originalFetch(...args);
        } finally {
          if (isApiRequest) {
            window.__caskfolioPendingRequests = Math.max((window.__caskfolioPendingRequests ?? 1) - 1, 0);
            window.dispatchEvent(
              new CustomEvent<number>(API_PROGRESS_EVENT, {
                detail: window.__caskfolioPendingRequests
              })
            );
          }
        }
      };

      window.__caskfolioFetchPatched = true;
    }

    const onProgress = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setPending(customEvent.detail ?? 0);
    };

    window.addEventListener(API_PROGRESS_EVENT, onProgress);
    setPending(window.__caskfolioPendingRequests ?? 0);

    return () => {
      window.removeEventListener(API_PROGRESS_EVENT, onProgress);
    };
  }, []);

  return <div className={`api-progress ${pending > 0 ? 'active' : ''}`} aria-hidden />;
}
