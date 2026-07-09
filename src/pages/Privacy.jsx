import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function Privacy() {
  const [content, setContent] = useState('');
  useEffect(() => {
    base44.entities.AppSettings.list().then((r) => setContent(r[0]?.privacy_html || 'Zásady ochrany osobních údajů nebyly dosud vyplněny.')).catch(() => setContent('Načítání selhalo.'));
  }, []);
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-heading font-bold mb-6">Zásady ochrany osobních údajů (GDPR)</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground"><ReactMarkdown>{content}</ReactMarkdown></div>
    </div>
  );
}