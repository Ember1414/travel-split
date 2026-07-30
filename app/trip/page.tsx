'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Receipt, Calculator, Trash2, AlertTriangle, Calendar, Luggage, Info, Vote, Copy, Pencil } from 'lucide-react';
import Header from '@/components/Header';
import MemberAvatar from '@/components/MemberAvatar';
import ExpenseItem from '@/components/ExpenseItem';
import EmptyState from '@/components/EmptyState';
import JoinCodeBadge from '@/components/JoinCodeBadge';
import AddMemberButton from '@/components/AddMemberButton';
import SchedulePanel from '@/components/SchedulePanel';
import PackingPanel from '@/components/PackingPanel';
import InfoPanel from '@/components/InfoPanel';
import PollPanel from '@/components/PollPanel';
import ExportButton from '@/components/ExportButton';
import BillImport from '@/components/BillImport';
import TripEditDialog from '@/components/TripEditDialog';
import { useTripData } from '@/hooks/useTripData';
import { getSupabase } from '@/lib/supabase';
import { removeMyTrip } from '@/lib/localTrips';
import { formatYuan } from '@/lib/utils';
import type { Expense, Member } from '@/types';

type Tab = 'expense' | 'schedule' | 'packing' | 'info' | 'poll';

const TABS: { key: Tab; label: string; icon: typeof Receipt }[] = [
  { key: 'expense', label: '消费', icon: Receipt },
  { key: 'schedule', label: '行程', icon: Calendar },
  { key: 'packing', label: '清单', icon: Luggage },
  { key: 'info', label: '信息', icon: Info },
  { key: 'poll', label: '投票', icon: Vote },
];

function TripDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get('id') || '';
  const { trip, members, expenses, schedules, packingItems, infoCards, polls, pollVotes, loading, error, refresh } = useTripData(tripId);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('expense');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function deleteExpense(e: Expense) {
    if (!confirm(`确定删除「${e.purpose} ¥${formatYuan(e.amount)}」？`)) return;
    try {
      const sb = getSupabase();
      const { error } = await sb.from('expenses').delete().eq('id', e.id);
      if (error) throw error;
      showToast('已删除');
      refresh();
    } catch (err: any) {
      showToast(err?.message || '删除失败');
    }
  }

  function duplicateExpense(e: Expense) {
    // 跳转到添加页，带上复制参数
    const params = new URLSearchParams({
      id: tripId,
      copy: e.id,
    });
    router.push(`/trip/add?${params.toString()}`);
  }

  function editExpense(e: Expense) {
    // 跳转到添加页，带上编辑参数
    const params = new URLSearchParams({
      id: tripId,
      edit: e.id,
    });
    router.push(`/trip/add?${params.toString()}`);
  }

  async function deleteTrip() {
    if (!trip) return;
    const ok = confirm(
      `确定删除账本「${trip.name}」？\n\n将永久删除该账本下的所有成员和消费记录，且无法恢复。其他成员也将无法访问此账本。`
    );
    if (!ok) return;
    try {
      const sb = getSupabase();
      const { error } = await sb.from('trips').delete().eq('id', tripId);
      if (error) throw error;
      removeMyTrip(tripId);
      showToast('账本已删除');
      router.push('/');
    } catch (err: any) {
      showToast(err?.message || '删除失败');
    }
  }

  if (!tripId) {
    return (
      <EmptyState
        icon={<AlertTriangle size={36} />}
        title="缺少账本 ID"
        desc="请从首页进入账本"
        action={<Link href="/" className="btn-primary">返回首页</Link>}
      />
    );
  }

  if (loading) {
    return (
      <>
        <Header title="加载中..." showBack />
        <div className="px-5 py-6">
          <div className="paper-card h-32 animate-pulse" />
        </div>
      </>
    );
  }

  if (error || !trip) {
    return (
      <>
        <Header showBack />
        <EmptyState
          icon={<AlertTriangle size={36} />}
          title="账本不可用"
          desc={error || '账本不存在或已被删除'}
          action={<Link href="/" className="btn-primary">返回首页</Link>}
        />
      </>
    );
  }

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const maxAmount = expenses.reduce((m, e) => Math.max(m, Number(e.amount)), 0);
  const memberMap = new Map<string, Member>(members.map((m) => [m.id, m]));

  return (
    <>
      <Header
        title={trip.name}
        showBack
        right={
          <div className="flex items-center gap-1">
            <BillImport tripId={tripId} members={members} expenses={expenses} onImported={refresh} />
            <ExportButton trip={trip} members={members} expenses={expenses} />
            <Link
              href={`/trip/settle?id=${trip.id}`}
              className="touch-target flex items-center gap-1 rounded-pill bg-moss-600/10 px-3 py-1.5 text-sm text-moss-600"
            >
              <Calculator size={16} /> 结算
            </Link>
          </div>
        }
      />

      {/* 顶部信息 */}
      <section className="px-5 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xs text-ink-700/50">
              {new Date(trip.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <TripEditDialog trip={trip} members={members} onSaved={refresh} />
            <button
              onClick={deleteTrip}
              aria-label="删除账本"
              className="touch-target flex items-center gap-0.5 text-[10px] text-ink-700/30 transition-colors hover:text-stamp-600"
            >
              <Trash2 size={12} />
              删除
            </button>
          </div>
          <JoinCodeBadge code={trip.join_code} tripName={trip.name} />
        </div>

        {/* 汇总卡片 */}
        <div className="paper-card postcard-border mt-3 p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-700/50">
                总消费
              </div>
              <div className="font-hand text-4xl text-desert-600">
                ¥{formatYuan(totalAmount)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-ink-700/50">
                笔数 · 最大单笔
              </div>
              <div className="font-hand text-lg text-ink-700">
                {expenses.length} · ¥{formatYuan(maxAmount)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 成员栏 */}
      <section className="mt-5 px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-hand text-lg text-ink-700">成员 · {members.length}</h2>
        </div>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
          {members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1">
              <MemberAvatar name={m.name} colorKey={m.color} size="lg" />
              <span className="max-w-[60px] truncate text-xs text-ink-700/70">
                {m.name}
              </span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <AddMemberButton
              tripId={trip.id}
              currentCount={members.length}
              onAdded={() => {
                refresh();
                showToast('已添加成员');
              }}
            />
            <span className="text-xs text-ink-700/40">添加</span>
          </div>
        </div>
      </section>

      {/* Tab 栏 */}
      <section className="sticky top-14 z-20 mt-5 border-b border-ink-700/10 bg-sand-100/95">
        <div className="no-scrollbar -mx-5 flex overflow-x-auto px-5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-1 border-b-2 px-4 py-3 text-sm transition-colors ${
                tab === key
                  ? 'border-desert-500 font-medium text-desert-600'
                  : 'border-transparent text-ink-700/60'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Tab 内容 */}
      <section className="mt-4 px-5">
        {tab === 'expense' && (
          <>
            {expenses.length === 0 ? (
              <EmptyState
                icon={<Receipt size={36} />}
                title="还没有消费记录"
                desc="点击右下角按钮添加第一笔消费"
              />
            ) : (
              <div className="space-y-2">
                {expenses.map((e) => (
                  <div key={e.id} className="group relative">
                    <ExpenseItem
                      expense={e}
                      payer={memberMap.get(e.payer_id)}
                      splitMembers={(e.split_between || [])
                        .map((id) => memberMap.get(id))
                        .filter(Boolean) as Member[]}
                    />
                    <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
                      <button
                        onClick={() => editExpense(e)}
                        aria-label="编辑"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-desert-500/15 text-desert-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => duplicateExpense(e)}
                        aria-label="复制"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-moss-600/15 text-moss-600"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => deleteExpense(e)}
                        aria-label="删除"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-stamp-500/15 text-stamp-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'schedule' && (
          <SchedulePanel tripId={tripId} schedules={schedules} refresh={refresh} />
        )}

        {tab === 'packing' && (
          <PackingPanel tripId={tripId} packingItems={packingItems} members={members} refresh={refresh} />
        )}

        {tab === 'info' && (
          <InfoPanel tripId={tripId} infoCards={infoCards} refresh={refresh} />
        )}

        {tab === 'poll' && (
          <PollPanel tripId={tripId} polls={polls} pollVotes={pollVotes} members={members} refresh={refresh} />
        )}
      </section>

      {/* FAB 添加消费（仅消费 Tab 显示） */}
      {tab === 'expense' && (
        <Link
          href={`/trip/add?id=${trip.id}`}
          className="fixed bottom-6 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-desert-500 text-white shadow-lg shadow-desert-500/40 transition-transform active:scale-90"
          aria-label="添加消费"
        >
          <Plus size={28} />
        </Link>
      )}

      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-pill bg-ink-700/90 px-4 py-2 text-sm text-sand-100 animate-slide-in-top">
          {toast}
        </div>
      )}
    </>
  );
}

export default function TripDetailPage() {
  return (
    <main className="min-h-screen pb-24">
      <Suspense
        fallback={
          <>
            <Header title="加载中..." showBack />
            <div className="px-5 py-6">
              <div className="paper-card h-32 animate-pulse" />
            </div>
          </>
        }
      >
        <TripDetailContent />
      </Suspense>
    </main>
  );
}
