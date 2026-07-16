'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme: 'dark';
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId = '';
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetId) {
        return;
      }
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script]'
    );
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener('load', render, { once: true });
    } else {
      const script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.addEventListener('load', render, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken, siteKey]);

  return <div ref={containerRef} className="min-h-[65px]" />;
}
