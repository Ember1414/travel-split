'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, X, Plus, Trash2, Loader2 } from 'lucide-react';
import type { Trip, Member } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { pickColorByIndex } from '@/lib/constants';

type Props = {
  trip: Trip;
  members: Member[];
  onSaved: () => void;
};

export default function TripEditDialog({ trip, members, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [tripName, setTripName] = useState(trip.name);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [newMemberName, setNewMemberName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开时初始化
  useEffect(() => {
    if (open) {
      setTripName(trip.name);
      const names: Record<string, string> = {};
      members.forEach((m) => { names[m.id] = m.name; });
      setMemberNames(names);
      setNewMemberName('');
      setError(null);
    }
  }, [open, trip.name, members]);

  // Escape 键关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting]);

  async function handleSave() {
    const name = tripName.trim();
    if (!name) {
      setError('请输入账本名称');
      return;
    }
    // 检查成员名称
    for (const [id, n] of Object.entries(memberNames)) {
      if (!n.trim()) {
        setError('成员名称不能为空');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const sb = getSupabase();
      // 更新账本名称
      if (name !== trip.name) {
        const { error: tripErr } = await sb.from('trips').update({ name }).eq('id', trip.id);
        if (tripErr) throw tripErr;
      }
      // 更新成员名称
      for (const m of members) {
        const newName = memberNames[m.id]?.trim();
        if (newName && newName !== m.name) {
          const { error: memErr } = await sb.from('members').update({ name: newName }).eq('id', m.id);
          if (memErr) throw memErr;
        }
      }
      // 添加新成员
      if (newMemberName.trim()) {
        const { error: addErr } = await sb.from('members').insert({
          trip_id: trip.id,
          name: newMemberName.trim(),
          color: pickColorByIndex(members.length),
        });
        if (addErr) throw addErr;
      }
      setOpen(false);
      onSaved();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeMember(id: string) {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    if (!confirm(`确定移除成员「${m.name}」？\n\n该成员的历史消费记录会保留，但将不再参与分摊。`)) return;
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.from('members').delete().eq('id', id);
      if (error) throw error;
      // 从本地状态移除
      setMemberNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || '移除失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="账本设置"
        className="touch-target flex items-center justify-center rounded-full text-ink-700/50 hover:text-ink-700"
      >
        <Settings2 size={18} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-700/40" onClick={() => !submitting && setOpen(false)}>
          <div
            className="paper-card flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-card animate-slide-in-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 拖拽提示条 */}
            <div className="flex shrink-0 justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-ink-700/20" />
            </div>

            {/* 头部 */}
            <div className="flex shrink-0 items-center justify-between border-b border-dashed border-ink-700/10 p-4 pb-3">
              <h3 className="font-hand text-lg text-ink-700">账本设置</h3>
              <button
                onClick={() => !submitting && setOpen(false)}
                className="touch-target flex items-center gap-1 rounded-pill bg-sand-200/60 px-3 py-1 text-xs text-ink-700/70"
                disabled={submitting}
              >
                <X size={14} />
                <span>取消</span>
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 账本名称 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-700/70">账本名称</label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  maxLength={30}
                  className="paper-card w-full px-4 py-2.5 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
                />
              </div>

              {/* 成员管理 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-700/70">成员管理</label>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="paper-card flex items-center gap-2 p-2.5">
                      <input
                        type="text"
                        value={memberNames[m.id] || ''}
                        onChange={(e) => setMemberNames((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        maxLength={12}
                        className="flex-1 bg-transparent text-sm text-ink-700 focus:outline-none"
                      />
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={submitting}
                        aria-label="移除"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-700/30 hover:bg-stamp-500/10 hover:text-stamp-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {/* 添加新成员 */}
                  <div className="paper-card flex items-center gap-2 p-2.5">
                    <Plus size={16} className="text-ink-700/40" />
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="添加新成员"
                      maxLength={12}
                      className="flex-1 bg-transparent text-sm text-ink-700 placeholder:text-ink-700/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-pill bg-stamp-500/10 p-3 text-xs text-stamp-600">{error}</div>
              )}
            </div>

            {/* 底部 */}
            <div className="flex shrink-0 justify-end gap-2 border-t border-dashed border-ink-700/15 bg-sand-100/80 p-4 pt-3">
              <button
                onClick={() => !submitting && setOpen(false)}
                className="btn-ghost"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="btn-primary flex items-center gap-1"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                保存
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
