'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, AlertTriangle, Scale, Grid3x3, ListOrdered } from 'lucide-react';
import Header from '@/components/Header';
import MemberAvatar from '@/components/MemberAvatar';
import EmptyState from '@/components/EmptyState';
import { useTripData } from '@/hooks/useTripData';
import {
  calculateNet,
  settleDebts,
  buildMemberSummaries,
  buildMatrix,
  aggregateMatrix,
} from '@/lib/settle';
import { formatYuan, cn } from '@/lib/utils';
import type { Member } from '@/types';

type Tab = 'summary' | 'transfers' | 'matrix';

function SettleContent() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get('id') || '';
  const { trip, members, expenses, loading, error } = useTripData(tripId);
  const [tab, setTab] = useState<Tab>('summary');
  const [done, setDone] = useState<Record<string, boolean>>({});

  const summaries = useMemo(
    () => (members.length ? buildMemberSummaries(members, expenses) : []),
    [members, expenses]
  );
  const settlements = useMemo(() => {
    if (!members.length) return [];
    const net = calculateNet(members, expenses);
    return settleDebts(net);
  }, [members, expenses]);

  const matrix = useMemo(() => {
    if (!members.length) return null;
    const cells = buildMatrix(members, expenses);
    return aggregateMatrix(members, cells);
  }, [members, expenses]);

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
        <Header title="结算" showBack />
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
          desc={error || '账本不存在'}
          action={<Link href="/" className="btn-primary">返回首页</Link>}
        />
      </>
    );
  }

  if (expenses.length === 0) {
    return (
      <>
        <Header title="结算" showBack />
        <EmptyState
          icon={<Scale size={36} />}
          title="暂无消费可结算"
          desc="先添加一些消费记录，再来这里算账吧"
          action={
            <Link href={`/trip/add?id=${trip.id}`} className="btn-primary">
              添加消费
            </Link>
          }
        />
      </>
    );
  }

  const memberMap = new Map<string, Member>(members.map((m) => [m.id, m]));

  return (
    <>
      <Header title="结算" showBack />

      <div className="px-5 pt-4">
        <div className="flex gap-1 rounded-pill bg-sand-200/50 p-1">
          {[
            { key: 'summary' as Tab, label: '净额', icon: <Scale size={14} /> },
            { key: 'transfers' as Tab, label: '转账', icon: <ListOrdered size={14} /> },
            { key: 'matrix' as Tab, label: '矩阵', icon: <Grid3x3 size={14} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-pill py-2 text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-desert-500 text-white shadow'
                  : 'text-ink-700/60'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 净额榜 */}
      {tab === 'summary' && (
        <section className="mt-4 space-y-2 px-5">
          <p className="mb-2 text-xs text-ink-700/50">
            <span className="text-moss-600">正数</span>=别人欠你 ·
            <span className="text-stamp-500"> 负数</span>=你欠别人
          </p>
          {summaries
            .slice()
            .sort((a, b) => b.net - a.net)
            .map((s) => (
              <div
                key={s.member.id}
                className="paper-card flex items-center gap-3 p-3 animate-fade-up"
              >
                <MemberAvatar
                  name={s.member.name}
                  colorKey={s.member.color}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-700">
                    {s.member.name}
                  </div>
                  <div className="text-[10px] text-ink-700/50">
                    已付 ¥{formatYuan(s.paid)} · 应付 ¥{formatYuan(s.shouldPay)}
                  </div>
                </div>
                <div
                  className={cn(
                    'font-hand text-xl',
                    s.net > 0.01
                      ? 'text-moss-600'
                      : s.net < -0.01
                        ? 'text-stamp-500'
                        : 'text-ink-700/40'
                  )}
                >
                  {s.net > 0.01 ? '+' : ''}
                  {formatYuan(s.net)}
                </div>
              </div>
            ))}
        </section>
      )}

      {/* 转账方案 */}
      {tab === 'transfers' && (
        <section className="mt-4 space-y-2 px-5">
          {settlements.length === 0 ? (
            <EmptyState
              icon={<Check size={36} />}
              title="已两清"
              desc="所有人的账目都结清啦"
            />
          ) : (
            <>
              <p className="mb-2 text-xs text-ink-700/50">
                共 {settlements.length} 笔转账 · 最少转账方案
              </p>
              {settlements.map((s, i) => {
                const from = memberMap.get(s.from_member_id);
                const to = memberMap.get(s.to_member_id);
                const key = `${s.from_member_id}-${s.to_member_id}-${i}`;
                return (
                  <div
                    key={key}
                    className="paper-card flex items-center gap-3 p-4 animate-fade-up"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <MemberAvatar
                          name={from?.name || '?'}
                          colorKey={from?.color || 'desert'}
                          size="md"
                        />
                        <span className="max-w-[60px] truncate text-[10px] text-ink-700/60">
                          {from?.name}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <ArrowRight size={16} className="text-ink-700/40" />
                        <span className="text-[10px] text-ink-700/40">付给</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <MemberAvatar
                          name={to?.name || '?'}
                          colorKey={to?.color || 'moss'}
                          size="md"
                        />
                        <span className="max-w-[60px] truncate text-[10px] text-ink-700/60">
                          {to?.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-hand text-xl text-desert-600">
                        ¥{formatYuan(s.amount)}
                      </div>
                      <button
                        onClick={() =>
                          setDone((p) => ({ ...p, [key]: !p[key] }))
                        }
                        className={cn(
                          'mt-1 flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px]',
                          done[key]
                            ? 'bg-moss-500/20 text-moss-600'
                            : 'bg-ink-700/5 text-ink-700/50'
                        )}
                      >
                        <Check size={10} />
                        {done[key] ? '已转账' : '标记'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      )}

      {/* 矩阵 */}
      {tab === 'matrix' && matrix && (
        <section className="mt-4 px-5">
          <p className="mb-2 text-xs text-ink-700/50">
            行=付款人，列=分摊人 · 单元格=该付款人为该分摊人垫付的金额
          </p>
          <div className="paper-card overflow-x-auto p-2">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-sand-50 p-2 text-left text-ink-700/50">
                    付款 / 分摊
                  </th>
                  {members.map((m) => (
                    <th key={m.id} className="p-2">
                      <div className="flex flex-col items-center gap-1">
                        <MemberAvatar
                          name={m.name}
                          colorKey={m.color}
                          size="sm"
                        />
                        <span className="max-w-[40px] truncate text-[10px] text-ink-700/60">
                          {m.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((payer) => (
                  <tr key={payer.id}>
                    <td className="sticky left-0 z-10 bg-sand-50 p-2">
                      <div className="flex items-center gap-1">
                        <MemberAvatar
                          name={payer.name}
                          colorKey={payer.color}
                          size="sm"
                        />
                        <span className="max-w-[60px] truncate text-[10px] text-ink-700/70">
                          {payer.name}
                        </span>
                      </div>
                    </td>
                    {members.map((split) => {
                      const v = matrix[payer.id]?.[split.id] || 0;
                      const isSelf = payer.id === split.id;
                      return (
                        <td
                          key={split.id}
                          className={cn(
                            'p-2 text-center',
                            isSelf ? 'bg-ink-700/5 text-ink-700/30' : 'text-ink-700/80'
                          )}
                        >
                          {isSelf ? '-' : v > 0 ? `¥${formatYuan(v)}` : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export default function SettlePage() {
  return (
    <main className="min-h-screen pb-12">
      <Suspense
        fallback={
          <>
            <Header title="结算" showBack />
            <div className="px-5 py-6">
              <div className="paper-card h-32 animate-pulse" />
            </div>
          </>
        }
      >
        <SettleContent />
      </Suspense>
    </main>
  );
}
