'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Delete, Check } from 'lucide-react';
import Header from '@/components/Header';
import MemberAvatar from '@/components/MemberAvatar';
import { useTripData } from '@/hooks/useTripData';
import { getSupabase } from '@/lib/supabase';
import { PURPOSES } from '@/lib/constants';
import { formatYuan } from '@/lib/utils';
import type { Purpose, SplitType } from '@/types';

function AddExpenseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get('id') || '';
  const copyId = searchParams.get('copy') || '';
  const editId = searchParams.get('edit') || '';
  const isEdit = !!editId;
  const { trip, members, expenses, loading, error: tripError } = useTripData(tripId);

  const [amountStr, setAmountStr] = useState('');
  const [payerId, setPayerId] = useState('');
  const [splitIds, setSplitIds] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [purpose, setPurpose] = useState<Purpose>('餐饮');
  const [note, setNote] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (members.length > 0 && !payerId) {
      setPayerId(members[0].id);
      setSplitIds(members.map((m) => m.id));
    }
  }, [members, payerId]);

  // 预填：编辑或复制
  useEffect(() => {
    const srcId = editId || copyId;
    if (!srcId || !expenses.length || !members.length) return;
    const src = expenses.find((e) => e.id === srcId);
    if (!src) return;
    setAmountStr(String(src.amount));
    setPayerId(src.payer_id);
    setSplitIds(src.split_between || members.map((m) => m.id));
    setSplitType(src.split_type || 'equal');
    if (src.split_type === 'custom' && src.split_details) {
      const shares: Record<string, string> = {};
      Object.entries(src.split_details).forEach(([id, val]) => {
        shares[id] = String(val);
      });
      setCustomShares(shares);
    }
    setPurpose(src.purpose);
    setNote(src.note || '');
  }, [editId, copyId, expenses, members]);

  function pressKey(k: string) {
    if (k === 'del') {
      setAmountStr((s) => s.slice(0, -1));
      return;
    }
    if (k === '.') {
      if (amountStr.includes('.')) return;
      if (amountStr === '') {
        setAmountStr('0.');
        return;
      }
      setAmountStr((s) => s + '.');
      return;
    }
    if (amountStr.includes('.') && amountStr.split('.')[1]?.length >= 2) return;
    if (amountStr === '0') {
      setAmountStr(k);
      return;
    }
    if (amountStr.length >= 8) return;
    setAmountStr((s) => s + k);
  }

  function toggleSplit(id: string) {
    setSplitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSplitIds(members.map((m) => m.id));
  }

  function invert() {
    setSplitIds((prev) =>
      members.filter((m) => !prev.includes(m.id)).map((m) => m.id)
    );
  }

  const amount = parseFloat(amountStr) || 0;
  const perHead = splitIds.length > 0 ? amount / splitIds.length : 0;

  // custom 模式：已分配总额
  const allocatedTotal = Object.values(customShares).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );
  const allocatedDiff = Math.round((amount - allocatedTotal) * 100) / 100;

  async function handleSubmit() {
    setError(null);
    if (amount <= 0) {
      setError('请输入金额');
      return;
    }
    if (!payerId) {
      setError('请选择付款人');
      return;
    }
    let split_between: string[] = [];
    let split_details: Record<string, number> | null = null;
    if (splitType === 'equal') {
      if (splitIds.length === 0) {
        setError('至少选择一位分摊人员');
        return;
      }
      split_between = splitIds;
    } else if (splitType === 'custom') {
      const details: Record<string, number> = {};
      let total = 0;
      members.forEach((m) => {
        const v = parseFloat(customShares[m.id] || '0') || 0;
        if (v > 0) {
          details[m.id] = Math.round(v * 100) / 100;
          total += v;
        }
      });
      total = Math.round(total * 100) / 100;
      if (Math.abs(total - amount) > 0.01) {
        setError(`自定义金额合计 ¥${total.toFixed(2)}，与消费金额 ¥${amount.toFixed(2)} 不符`);
        return;
      }
      if (Object.keys(details).length === 0) {
        setError('请至少为一位成员填写金额');
        return;
      }
      split_between = Object.keys(details);
      split_details = details;
    }
    // solo 模式：split_between 留空，split_details 留 null

    setSubmitting(true);
    try {
      const sb = getSupabase();
      const payload = {
        trip_id: tripId,
        amount: Math.round(amount * 100) / 100,
        purpose,
        note: note.trim(),
        payer_id: payerId,
        split_between,
        split_type: splitType,
        split_details,
      };
      let error;
      if (isEdit) {
        // 编辑模式：更新已有记录
        const res = await sb.from('expenses').update(payload).eq('id', editId);
        error = res.error;
      } else {
        // 新增模式
        const res = await sb.from('expenses').insert(payload);
        error = res.error;
      }
      if (error) throw error;
      router.push(`/trip?id=${tripId}`);
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !trip) {
    return (
      <>
        <Header title={isEdit ? '编辑消费' : '添加消费'} showBack />
        <div className="px-5 py-6">
          {tripError ? (
            <div className="paper-card postcard-border p-4 text-center">
              <p className="font-hand mb-2 text-lg text-ink-700">账本不可用</p>
              <p className="mb-4 text-xs text-ink-700/60">{tripError}</p>
              <a href="/" className="btn-primary inline-block">返回首页</a>
            </div>
          ) : (
            <div className="paper-card h-64 animate-pulse" />
          )}
        </div>
      </>
    );
  }

  if (members.length < 2) {
    return (
      <>
        <Header title={isEdit ? '编辑消费' : '添加消费'} showBack />
        <div className="px-5 py-12 text-center">
          <p className="text-ink-700/70">需要至少 2 位成员才能记账</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={isEdit ? '编辑消费' : '添加消费'} showBack />

      {/* 金额输入区 */}
      <section className="px-5 pt-6">
        <div className="paper-card postcard-border p-6 text-center">
          <div className="text-[10px] uppercase tracking-wider text-ink-700/50">
            消费金额
          </div>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <span className="font-hand text-3xl text-ink-700/60">¥</span>
            <span className="font-hand text-5xl text-desert-600">
              {amountStr || '0'}
            </span>
          </div>
          {splitType === 'equal' && splitIds.length > 0 && (
            <div className="mt-2 text-xs text-ink-700/50">
              {splitIds.length} 人分摊 · 每人 ¥{formatYuan(perHead)}
            </div>
          )}
          {splitType === 'custom' && amount > 0 && (
            <div className={`mt-2 text-xs ${Math.abs(allocatedDiff) < 0.01 ? 'text-emerald-600' : 'text-stamp-600'}`}>
              已分配 ¥{formatYuan(allocatedTotal)} / ¥{formatYuan(amount)}
              {Math.abs(allocatedDiff) >= 0.01 && ` · 差 ¥${formatYuan(Math.abs(allocatedDiff))}`}
            </div>
          )}
          {splitType === 'solo' && (
            <div className="mt-2 text-xs text-ink-700/50">
              付款人独担 · 不分摊
            </div>
          )}
        </div>
      </section>

      {/* 备注（放在顶部避免被数字键盘遮挡） */}
      <section className="mt-4 px-5">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="备注（可选）：如机场晚餐、酒店押金"
          maxLength={30}
          className="paper-card w-full px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-700/40 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
        />
      </section>

      {/* 付款人 */}
      <section className="mt-5 px-5">
        <h3 className="font-hand mb-2 text-lg text-ink-700">谁付的款</h3>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setPayerId(m.id)}
              className="flex flex-col items-center gap-1"
            >
              <MemberAvatar
                name={m.name}
                colorKey={m.color}
                size="lg"
                selected={payerId === m.id}
              />
              <span
                className={`max-w-[60px] truncate text-xs ${
                  payerId === m.id ? 'font-semibold text-desert-600' : 'text-ink-700/60'
                }`}
              >
                {m.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 分摊方式 + 分摊人员 */}
      <section className="mt-5 px-5">
        <h3 className="font-hand mb-2 text-lg text-ink-700">分摊方式</h3>
        <div className="mb-3 flex gap-2">
          {([
            { v: 'equal', label: '平均' },
            { v: 'custom', label: '自定义' },
            { v: 'solo', label: '付款人独担' },
          ] as { v: SplitType; label: string }[]).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setSplitType(opt.v)}
              className={`flex-1 rounded-pill px-3 py-2 text-sm font-medium transition-all ${
                splitType === opt.v
                  ? 'bg-desert-500 text-white shadow-md'
                  : 'bg-sand-200/50 text-ink-700/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* equal 模式：成员网格选择 */}
        {splitType === 'equal' && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm text-ink-700/70">分摊给谁</h4>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={selectAll}
                  className="rounded-pill bg-desert-500/10 px-2.5 py-1 text-desert-600"
                >
                  全选
                </button>
                <button
                  onClick={invert}
                  className="rounded-pill bg-ink-700/10 px-2.5 py-1 text-ink-700/70"
                >
                  反选
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {members.map((m) => {
                const sel = splitIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleSplit(m.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <MemberAvatar
                      name={m.name}
                      colorKey={m.color}
                      size="lg"
                      selected={sel}
                    />
                    <span
                      className={`max-w-[60px] truncate text-xs ${
                        sel ? 'font-semibold text-desert-600' : 'text-ink-700/60'
                      }`}
                    >
                      {m.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* custom 模式：每人金额输入 */}
        {splitType === 'custom' && (
          <div className="space-y-2">
            <p className="text-xs text-ink-700/60">
              为每位成员填写应付金额，合计需等于消费金额
            </p>
            {members.map((m) => (
              <div
                key={m.id}
                className="paper-card flex items-center gap-3 p-2.5"
              >
                <MemberAvatar name={m.name} colorKey={m.color} size="md" />
                <span className="flex-1 truncate text-sm text-ink-700">
                  {m.name}
                  {m.id === payerId && (
                    <span className="ml-1 text-[10px] text-desert-600">付款人</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-ink-700/40">¥</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customShares[m.id] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.]/g, '');
                      setCustomShares((prev) => ({ ...prev, [m.id]: val }));
                    }}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="0"
                    className="w-20 rounded-card bg-sand-100 px-2 py-1 text-right text-sm text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* solo 模式：提示 */}
        {splitType === 'solo' && (
          <div className="paper-card p-4 text-center text-sm text-ink-700/70">
            全额由付款人承担，其他人无需分摊。
            <br />
            <span className="text-xs text-ink-700/50">
              适用于买个人物品、请客等场景
            </span>
          </div>
        )}
      </section>

      {/* 消费目的 */}
      <section className="mt-5 px-5">
        <h3 className="font-hand mb-2 text-lg text-ink-700">消费目的</h3>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {PURPOSES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPurpose(p.value)}
              className={`shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-all ${
                purpose === p.value
                  ? 'text-white shadow-md'
                  : 'bg-sand-200/50 text-ink-700/70'
              }`}
              style={purpose === p.value ? { backgroundColor: p.color } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="mx-5 mt-4 rounded-card border border-stamp-500/30 bg-stamp-500/10 p-3 text-xs text-stamp-600">
          {error}
        </div>
      )}

      {/* 数字键盘（任意输入框聚焦时隐藏，让系统软键盘接管） */}
      {!inputFocused && (
        <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 bg-sand-100/95 px-3 pb-3 pt-2 backdrop-blur">
          <div className="mb-2 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button key={n} onClick={() => pressKey(n)} className="num-key">
                {n}
              </button>
            ))}
            <button onClick={() => pressKey('.')} className="num-key">
              .
            </button>
            <button onClick={() => pressKey('0')} className="num-key">
              0
          </button>
          <button onClick={() => pressKey('del')} className="num-key">
            <Delete size={20} />
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || amount <= 0}
          className="btn-primary w-full"
        >
          {submitting ? (
            '保存中...'
          ) : (
            <>
              <Check size={18} className="mr-1 inline" /> 保存 · ¥{formatYuan(amount)}
            </>
          )}
        </button>
      </div>
      )}
    </>
  );
}

export default function AddExpensePage() {
  return (
    <main className="min-h-screen pb-80">
      <Suspense
        fallback={
          <>
            <Header title="添加消费" showBack />
            <div className="px-5 py-6">
              <div className="paper-card h-64 animate-pulse" />
            </div>
          </>
        }
      >
        <AddExpenseContent />
      </Suspense>
    </main>
  );
}
