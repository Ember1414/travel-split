'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { pickColorByIndex } from '@/lib/constants';

type Props = {
  tripId: string;
  currentCount: number;
  onAdded?: () => void;
};

export default function AddMemberButton({ tripId, currentCount, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const n = name.trim();
    if (!n) {
      setError('请输入姓名');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.from('members').insert({
        trip_id: tripId,
        name: n,
        color: pickColorByIndex(currentCount),
      });
      if (error) throw error;
      setName('');
      setOpen(false);
      onAdded?.();
    } catch (e: any) {
      setError(e?.message || '添加失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink-700/30 text-ink-700/60"
        aria-label="添加成员"
      >
        <Plus size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-800/40 p-5 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="paper-card w-full max-w-sm p-5 animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-hand text-xl text-ink-700">添加成员</h3>
              <button
                onClick={() => setOpen(false)}
                className="touch-target flex items-center justify-center rounded-full text-ink-700/40"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入成员姓名"
              maxLength={12}
              autoFocus
              className="paper-card w-full px-4 py-2.5 text-base text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
            />

            {error && (
              <p className="mt-2 text-xs text-stamp-600">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="btn-primary mt-4 w-full"
            >
              {submitting ? '添加中...' : '添加'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
