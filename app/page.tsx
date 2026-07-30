'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, LogIn, MapPinned, AlertTriangle } from 'lucide-react';
import TripCard from '@/components/TripCard';
import EmptyState from '@/components/EmptyState';
import SettingsMenu from '@/components/SettingsMenu';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getMyTrips, removeMyTrip, type MyTripRef } from '@/lib/localTrips';
import type { Trip, Member, Expense } from '@/types';

type TripView = {
  trip: Trip;
  memberCount: number;
  totalAmount: number;
  expenseCount: number;
};

export default function HomePage() {
  const [myTrips, setMyTrips] = useState<MyTripRef[]>([]);
  const [views, setViews] = useState<Record<string, TripView>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const list = getMyTrips();
    setMyTrips(list);
    if (!configured) {
      setLoading(false);
      setError('Supabase 未配置，请先在 .env.local 中填入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    if (list.length === 0) {
      setLoading(false);
      return;
    }
    loadViews(list);
  }, [configured]);

  async function loadViews(list: MyTripRef[]) {
    setLoading(true);
    try {
      const sb = getSupabase();
      const next: Record<string, TripView> = {};
      await Promise.all(
        list.map(async (ref) => {
          const [tripRes, memRes, expRes] = await Promise.all([
            sb.from('trips').select('*').eq('id', ref.id).maybeSingle(),
            sb.from('members').select('id').eq('trip_id', ref.id),
            sb.from('expenses').select('amount').eq('trip_id', ref.id),
          ]);
          if (!tripRes.data) {
            // 账本可能已被删除，从本地清理
            removeMyTrip(ref.id);
            return;
          }
          const trip = tripRes.data as Trip;
          const members = (memRes.data || []) as Member[];
          const expenses = (expRes.data || []) as Expense[];
          const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
          next[ref.id] = {
            trip,
            memberCount: members.length,
            totalAmount,
            expenseCount: expenses.length,
          };
        })
      );
      setViews(next);
      // 清理失效引用
      const validIds = new Set(Object.keys(next));
      setMyTrips((prev) => prev.filter((t) => validIds.has(t.id)));
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-24">
      {/* 顶部装饰 */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-desert-600">
          <span className="h-px w-8 bg-desert-500/50" />
          Postcards
          <span className="h-px flex-1 bg-desert-500/30" />
          <SettingsMenu />
        </div>
        <h1 className="font-hand mt-3 text-4xl text-ink-700">我的旅程</h1>
        <p className="mt-1 text-sm text-ink-700/60">
          和伙伴们一起记账，明信片寄回每一笔回忆
        </p>
      </div>

      {/* Supabase 未配置提示 */}
      {error && (
        <div className="mx-5 mb-4 rounded-card border border-stamp-500/30 bg-stamp-500/10 p-3 text-xs text-stamp-600">
          <div className="mb-1 flex items-center gap-1 font-semibold">
            <AlertTriangle size={14} /> 配置提示
          </div>
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {/* 账本列表 */}
      <section className="px-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="paper-card h-32 animate-pulse p-4"
                style={{ opacity: 0.5 }}
              />
            ))}
          </div>
        ) : myTrips.length === 0 ? (
          <EmptyState
            icon={<MapPinned size={36} />}
            title="开启第一段旅程"
            desc="创建账本后把加入码分享给同伴，大家一起记账、规划行程、打包行李、投票决策"
            action={
              <div className="flex flex-col items-center gap-3">
                <Link href="/trip/new" className="btn-primary inline-flex items-center gap-1">
                  <Plus size={18} /> 创建账本
                </Link>
                <Link href="/trip/join" className="text-sm text-desert-600 underline-offset-2 hover:underline">
                  已有加入码？点这里加入
                </Link>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {myTrips.map((ref) => {
              const v = views[ref.id];
              if (!v) return null;
              return (
                <TripCard
                  key={ref.id}
                  id={ref.id}
                  name={v.trip.name}
                  memberCount={v.memberCount}
                  totalAmount={v.totalAmount}
                  expenseCount={v.expenseCount}
                  createdAt={v.trip.created_at}
                  settled={v.trip.settled}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 底部操作按钮 */}
      {myTrips.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-between px-5">
          <Link
            href="/trip/join"
            className="btn-ghost inline-flex items-center gap-1 shadow-paper"
          >
            <LogIn size={18} /> 加入
          </Link>
          <Link
            href="/trip/new"
            className="btn-primary inline-flex items-center gap-1 shadow-lg shadow-desert-500/30"
          >
            <Plus size={20} /> 新建账本
          </Link>
        </div>
      )}
    </main>
  );
}
