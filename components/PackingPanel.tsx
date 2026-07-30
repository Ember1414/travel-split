'use client';

import { useState } from 'react';
import { Check, Plus, Trash2, Luggage } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { PackingCategory, PackingItem, Member } from '@/types';

type Props = {
  tripId: string;
  packingItems: PackingItem[];
  members: Member[];
  refresh: () => Promise<void>;
};

const CATEGORIES: PackingCategory[] = ['证件', '电子', '衣物', '洗护', '药品', '其他'];

const CATEGORY_COLORS: Record<PackingCategory, string> = {
  证件: '#C8442C',
  电子: '#3B6E8F',
  衣物: '#2D5A4A',
  洗护: '#7A4A5C',
  药品: '#E07A3E',
  其他: '#7A7A3E',
};

export default function PackingPanel({ tripId, packingItems, members, refresh }: Props) {
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<PackingCategory>('其他');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const currentMemberId = members[0]?.id || '';

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  const totalCount = packingItems.length;
  const checkedCount = packingItems.filter((i) => i.checked).length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && checkedCount === totalCount;

  function itemsOf(cat: PackingCategory) {
    return packingItems
      .filter((i) => i.category === cat)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  }

  async function toggle(item: PackingItem) {
    try {
      const sb = getSupabase();
      const { error } = await sb
        .from('packing_items')
        .update({
          checked: !item.checked,
          checked_by: item.checked ? null : currentMemberId,
        })
        .eq('id', item.id);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      showToast(e?.message || '更新失败');
    }
  }

  async function addItem() {
    const text = newText.trim();
    if (!text) {
      showToast('请输入物品名称');
      return;
    }
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.from('packing_items').insert({
        trip_id: tripId,
        text,
        category: newCategory,
        sort_order: 0,
      });
      if (error) throw error;
      setNewText('');
      await refresh();
    } catch (e: any) {
      showToast(e?.message || '添加失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id: string) {
    try {
      const sb = getSupabase();
      const { error } = await sb.from('packing_items').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      showToast(e?.message || '删除失败');
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  }

  return (
    <div className="space-y-4">
      {/* 顶部总进度 */}
      <div className="paper-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Luggage size={18} className="text-desert-500" />
            <h3 className="font-hand text-lg text-ink-700">行李清单</h3>
          </div>
          <span className="text-xs text-ink-700/60">
            {checkedCount} / {totalCount} 已打包
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-sand-200">
          <div
            className={cn(
              'h-full rounded-pill transition-all duration-300',
              allDone ? 'bg-emerald-600' : 'bg-moss-600'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 按类别分组 */}
      {totalCount === 0 && (
        <div className="paper-card px-6 py-10 text-center animate-fade-up">
          <Luggage size={32} className="mx-auto mb-2 text-ink-700/30" />
          <p className="text-sm text-ink-700/50">还没有行李物品，下方添加吧</p>
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const items = itemsOf(cat);
        if (items.length === 0) return null;
        const done = items.filter((i) => i.checked).length;
        const catColor = CATEGORY_COLORS[cat];
        const catAllDone = done === items.length;
        return (
          <div key={cat} className="paper-card p-4 animate-fade-up">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: catColor }}
                />
                <h4 className="font-hand text-base text-ink-700">{cat}</h4>
                {catAllDone && (
                  <span className="text-[10px] text-emerald-600">已完成</span>
                )}
              </div>
              <span className="text-xs text-ink-700/60">
                {done} / {items.length}
              </span>
            </div>
            <ul className="divide-y divide-dashed divide-ink-700/10">
              {items.map((item) => (
                <li key={item.id} className="group flex items-center gap-3 py-2">
                  <button
                    onClick={() => toggle(item)}
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition',
                      item.checked
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-ink-700/30 bg-transparent'
                    )}
                    aria-label={item.checked ? '取消勾选' : '勾选'}
                  >
                    {item.checked && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm text-ink-700',
                      item.checked && 'line-through opacity-50'
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-700/30 opacity-0 transition hover:text-stamp-600 group-hover:opacity-100"
                    aria-label="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* 添加物品 */}
      <div className="paper-card p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="添加物品…"
            maxLength={40}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-ink-700 placeholder:text-ink-700/30 focus:outline-none"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as PackingCategory)}
            className="rounded-pill border border-ink-700/15 bg-sand-100 px-3 py-1.5 text-xs text-ink-700 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={addItem}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-desert-500 text-white transition active:scale-95 disabled:opacity-50"
            aria-label="添加"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90%] rounded-pill bg-ink-800/90 px-4 py-2 text-sm text-sand-50 animate-fade-up">
          {toast}
        </div>
      )}
    </div>
  );
}
