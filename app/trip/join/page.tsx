'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket } from 'lucide-react';
import Header from '@/components/Header';
import { getSupabase } from '@/lib/supabase';
import { addMyTrip } from '@/lib/localTrips';

export default function JoinTripPage() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateChar(i: number, v: string) {
    const ch = v.toUpperCase().slice(-1);
    if (!/[A-Z2-9]/.test(ch) && ch !== '') return;
    const next = [...code];
    next[i] = ch;
    setCode(next);
    if (ch && i < 5) {
      const el = document.getElementById(`code-${i + 1}`);
      el?.focus();
    }
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      const el = document.getElementById(`code-${i - 1}`);
      el?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    if (text) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setCode(next);
      if (text.length === 6) {
        const el = document.getElementById('code-5');
        el?.blur();
      }
    }
  }

  async function handleJoin() {
    setError(null);
    const joinCode = code.join('');
    if (joinCode.length !== 6) {
      setError('请输入完整的 6 位加入码');
      return;
    }
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { data: trip, error: tripErr } = await sb
        .from('trips')
        .select('*')
        .eq('join_code', joinCode)
        .maybeSingle();
      if (tripErr) throw tripErr;
      if (!trip) {
        setError('加入码无效，请检查后重试');
        return;
      }
      addMyTrip({
        id: trip.id,
        name: trip.name,
        joinedAt: new Date().toISOString(),
      });
      router.push(`/trip?id=${trip.id}`);
    } catch (e: any) {
      setError(e?.message || '加入失败');
    } finally {
      setSubmitting(false);
    }
  }

  const full = code.join('').length === 6;

  return (
    <main className="min-h-screen pb-32">
      <Header title="加入账本" showBack />

      <div className="px-5 py-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-desert-500/15 text-desert-600">
            <Ticket size={32} />
          </div>
          <h2 className="font-hand text-2xl text-ink-700">输入 6 位加入码</h2>
          <p className="mt-1 text-sm text-ink-700/60">
            向发起人索取加入码，输入后即可共同记账
          </p>
        </div>

        {/* 6 位输入框 */}
        <div
          className="mb-6 flex justify-center gap-2"
          onPaste={handlePaste}
        >
          {code.map((c, i) => (
            <input
              key={i}
              id={`code-${i}`}
              type="text"
              inputMode="text"
              value={c}
              onChange={(e) => updateChar(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              maxLength={1}
              className="font-hand h-14 w-12 rounded-card border-2 border-ink-700/15 bg-sand-50 text-center text-2xl text-ink-700 focus:border-desert-500 focus:outline-none"
            />
          ))}
        </div>

        <p className="mb-6 text-center text-xs text-ink-700/40">
          支持粘贴整段加入码 · 自动转大写
        </p>

        {error && (
          <div className="mb-4 rounded-card border border-stamp-500/30 bg-stamp-500/10 p-3 text-center text-xs text-stamp-600">
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-ink-700/10 bg-sand-100/90 p-4 backdrop-blur">
        <button
          onClick={handleJoin}
          disabled={!full || submitting}
          className="btn-primary w-full"
        >
          {submitting ? '加入中...' : '加入账本'}
        </button>
      </div>
    </main>
  );
}
