'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Users } from 'lucide-react';
import Header from '@/components/Header';
import { getSupabase } from '@/lib/supabase';
import { generateJoinCode, pickColorByIndex } from '@/lib/constants';
import { addMyTrip } from '@/lib/localTrips';

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateMember(i: number, v: string) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? v : m)));
  }

  function addMember() {
    setMembers((prev) => [...prev, '']);
  }

  function removeMember(i: number) {
    setMembers((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedMembers = members.map((m) => m.trim()).filter(Boolean);
    if (!trimmedName) {
      setError('请输入账本名称');
      return;
    }
    if (trimmedMembers.length < 2) {
      setError('至少需要 2 位成员');
      return;
    }
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const joinCode = generateJoinCode();

      // 1. 创建账本
      const { data: tripData, error: tripErr } = await sb
        .from('trips')
        .insert({
          name: trimmedName,
          join_code: joinCode,
        })
        .select()
        .single();
      if (tripErr) throw tripErr;

      const trip = tripData;

      // 2. 批量插入成员
      const memberRows = trimmedMembers.map((n, i) => ({
        trip_id: trip.id,
        name: n,
        color: pickColorByIndex(i),
      }));
      const { data: memberData, error: memberErr } = await sb
        .from('members')
        .insert(memberRows)
        .select();
      if (memberErr) throw memberErr;

      // 3. 记录到本地
      addMyTrip({
        id: trip.id,
        name: trip.name,
        joinedAt: new Date().toISOString(),
      });

      router.push(`/trip?id=${trip.id}`);
    } catch (e: any) {
      setError(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen pb-32">
      <Header title="新建账本" showBack />

      <div className="px-5 py-6">
        {/* 账本名 */}
        <section className="mb-6">
          <label className="font-hand mb-2 block text-lg text-ink-700">账本名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：海南五日游"
            maxLength={30}
            className="paper-card postcard-border w-full px-4 py-3 text-base text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
          />
        </section>

        {/* 成员 */}
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="font-hand flex items-center gap-2 text-lg text-ink-700">
              <Users size={18} /> 成员名单
            </label>
            <span className="text-xs text-ink-700/50">{members.length} 人</span>
          </div>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: '#E07A3E', opacity: 0.4 + (i % 8) / 10 }}
                >
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={m}
                  onChange={(e) => updateMember(i, e.target.value)}
                  placeholder={`成员 ${i + 1} 的姓名`}
                  maxLength={12}
                  className="paper-card flex-1 px-4 py-2.5 text-base text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
                />
                {members.length > 2 && (
                  <button
                    aria-label="删除"
                    onClick={() => removeMember(i)}
                    className="touch-target flex items-center justify-center text-ink-700/40 hover:text-stamp-500"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addMember}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-pill border border-dashed border-desert-500/40 py-2.5 text-sm text-desert-600 hover:bg-desert-500/5"
          >
            <Plus size={16} /> 添加成员
          </button>
          <p className="mt-2 text-xs text-ink-700/50">
            其他同伴可在加入账本后自行添加成员
          </p>
        </section>

        {error && (
          <div className="mb-4 rounded-card border border-stamp-500/30 bg-stamp-500/10 p-3 text-xs text-stamp-600">
            {error}
          </div>
        )}
      </div>

      {/* 底部保存 */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-ink-700/10 bg-sand-100/90 p-4 backdrop-blur">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? '创建中...' : '创建并生成加入码'}
        </button>
      </div>
    </main>
  );
}
