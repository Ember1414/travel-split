'use client';

import { useState } from 'react';
import {
  Plane,
  BedDouble,
  Contact,
  Bus,
  AlertTriangle,
  StickyNote,
  Plus,
  X,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import type { InfoCard, InfoCardType } from '@/types';

type Props = {
  tripId: string;
  infoCards: InfoCard[];
  refresh: () => Promise<void>;
};

type TypeConfig = {
  label: string;
  icon: LucideIcon;
  color: string;
  hint: string;
};

const TYPE_CONFIG: Record<InfoCardType, TypeConfig> = {
  flight: { label: '航班', icon: Plane, color: '#3B6E8F', hint: '航班号、起降时间' },
  hotel: { label: '酒店', icon: BedDouble, color: '#2D5A4A', hint: '酒店地址、入住信息' },
  contact: { label: '联系人', icon: Contact, color: '#E07A3E', hint: '导游、司机、地接电话' },
  transport: { label: '交通指南', icon: Bus, color: '#7A7A3E', hint: '机场到市区、市内交通、打车' },
  emergency: { label: '紧急信息', icon: AlertTriangle, color: '#C8442C', hint: '报警、急救、使馆电话' },
  note: { label: '备注', icon: StickyNote, color: '#7A4A5C', hint: '其他重要事项' },
};

// 显示顺序：出行 -> 住宿 -> 交通 -> 联系 -> 紧急 -> 备注
const TYPE_ORDER: InfoCardType[] = [
  'flight',
  'hotel',
  'transport',
  'contact',
  'emergency',
  'note',
];

export default function InfoPanel({ tripId, infoCards, refresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<InfoCardType>('flight');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: 'error' | 'success' } | null>(null);

  function showToast(msg: string, kind: 'error' | 'success' = 'error') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  }

  function resetForm() {
    setType('flight');
    setTitle('');
    setContent('');
    setShowForm(false);
  }

  async function submit() {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      showToast('请输入标题');
      return;
    }
    if (!c) {
      showToast('请输入内容');
      return;
    }
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.from('info_cards').insert({
        trip_id: tripId,
        type,
        title: t,
        content: c,
        sort_order: 0,
      });
      if (error) throw error;
      resetForm();
      await refresh();
      showToast('已添加', 'success');
    } catch (e: any) {
      showToast(e?.message || '添加失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const sb = getSupabase();
      const { error } = await sb.from('info_cards').delete().eq('id', id);
      if (error) throw error;
      await refresh();
      showToast('已删除', 'success');
    } catch (e: any) {
      showToast(e?.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  // 按 type 分组并按 sort_order 排序
  const groups = TYPE_ORDER.map((t) => ({
    type: t,
    cards: infoCards
      .filter((c) => c.type === t)
      .sort((a, b) => a.sort_order - b.sort_order),
  })).filter((g) => g.cards.length > 0);

  const isEmpty = infoCards.length === 0;

  return (
    <div className="relative">
      {/* 顶部标题 + 添加按钮 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-hand text-2xl text-ink-700">共享信息板</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            <Plus size={16} /> 添加信息
          </button>
        )}
      </div>

      {/* 添加表单 */}
      {showForm && (
        <div className="paper-card mb-4 p-4 animate-slide-in-top">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-hand text-lg text-ink-700">添加信息</h3>
            <button
              onClick={resetForm}
              className="touch-target flex items-center justify-center rounded-full text-ink-700/40"
              aria-label="取消"
            >
              <X size={20} />
            </button>
          </div>

          {/* 类型选择 */}
          <div className="mb-3">
            <div className="mb-1.5 text-xs text-ink-700/60">类型</div>
            <div className="flex flex-wrap gap-2">
              {TYPE_ORDER.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const Icon = cfg.icon;
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="inline-flex items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: active ? cfg.color : `${cfg.color}1A`,
                      color: active ? '#FFFFFF' : cfg.color,
                      border: `1px solid ${active ? cfg.color : `${cfg.color}40`}`,
                    }}
                  >
                    <Icon size={14} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 标题 */}
          <div className="mb-3">
            <div className="mb-1.5 text-xs text-ink-700/60">标题</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`例如：${TYPE_CONFIG[type].hint}`}
              maxLength={50}
              autoFocus
              className="paper-card w-full px-4 py-2.5 text-base text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
            />
          </div>

          {/* 内容 */}
          <div className="mb-4">
            <div className="mb-1.5 text-xs text-ink-700/60">内容</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                '多行文本，例如：\n机场到市区：地铁XX线\n市内交通：办交通卡\n打车：滴滴/高德'
              }
              rows={4}
              maxLength={1000}
              className="paper-card w-full resize-none px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? '添加中...' : '添加'}
            </button>
            <button
              onClick={resetForm}
              className="btn-ghost"
              disabled={submitting}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {isEmpty && !showForm && (
        <div className="paper-card postcard-border flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-up">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sand-200/60 text-ink-700/40">
            <StickyNote size={28} />
          </div>
          <h3 className="font-hand mb-1 text-lg text-ink-700">还没有共享信息</h3>
          <p className="mb-4 max-w-xs text-sm text-ink-700/60">
            添加航班、酒店、交通指南等重要信息，全员共享
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-1.5 px-5 py-2 text-sm"
          >
            <Plus size={16} /> 添加信息
          </button>
        </div>
      )}

      {/* 分组列表 */}
      {!isEmpty && (
        <div className="space-y-5">
          {groups.map((g) => {
            const cfg = TYPE_CONFIG[g.type];
            const Icon = cfg.icon;
            return (
              <div key={g.type}>
                <div className="mb-2 flex items-center gap-1.5">
                  <Icon size={16} style={{ color: cfg.color }} />
                  <h3
                    className="font-hand text-lg"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </h3>
                  <span className="text-xs text-ink-700/40">
                    · {g.cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.cards.map((card) => (
                    <div
                      key={card.id}
                      className="paper-card group relative p-3 pl-4 animate-slide-in-top"
                      style={{ borderLeft: `4px solid ${cfg.color}` }}
                    >
                      <button
                        onClick={() => remove(card.id)}
                        disabled={deletingId === card.id}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-sand-100/80 text-ink-700/40 opacity-0 transition-all hover:text-stamp-600 group-hover:opacity-100 disabled:opacity-30"
                        aria-label="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                      <h4 className="font-hand mb-1 pr-8 text-base text-ink-700">
                        {card.title}
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-ink-700/80">
                        {card.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-slide-in-top">
          <div
            className="paper-card px-4 py-2 text-sm font-medium shadow-lg"
            style={{
              color: toast.kind === 'error' ? '#C8442C' : '#2D5A4A',
            }}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
