import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('feedspy_cookie_consent')) setShow(true);
  }, []);
  if (!show) return null;
  const decide = (v) => { localStorage.setItem('feedspy_cookie_consent', v); setShow(false); };
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground">
        <span>Tento web používá cookies pro funkčnost a analýzu. Můžete přijmout nebo odmítnout.</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => decide('rejected')}>Odmítnout</Button>
          <Button size="sm" onClick={() => decide('accepted')}>Přijmout</Button>
        </div>
      </div>
    </div>
  );
}