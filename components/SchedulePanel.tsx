'use client';

import { useMemo, useState } from 'react';
import { Calendar, MapPin, Clock, Plus, Trash2, Navigation } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import type { Schedule, ScheduleCategory } from '@/types';

type Props = {
  tripId: string;
  schedules: Schedule[];
  refresh: () => Promise<void>;
};

const CATEGORIES: { value: ScheduleCategory; color: string }[] = [
  { value: '景点', color: '#E07A3E' },
  { value: '餐饮', color: '#2D5A4A' },
  { value: '交通', color: '#3B6E8F' },
  { value: '住宿', color: '#7A4A5C' },
  { value: '购物', color: '#C8442C' },
  { value: '其他', color: '#7A7A3E' },
];

function catColor(c: ScheduleCategory) {
  return CATEGORIES.find((x) => x.value === c)?.color || '#7A7A3E';
}

function formatDate(dateStr: string, index: number) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return { index: index + 1, label: `${month}月${day}日 ${week}` };
}

export default function SchedulePanel({ tripId, schedules, refresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ScheduleCategory>('景点');
  const [formLocation, setFormLocation] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  // 按天分组
  const grouped = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach((s) => {
      if (!map.has(s.day_date)) map.set(s.day_date, []);
      map.get(s.day_date)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [schedules]);

  async function addSchedule() {
    if (!formDate) {
      showToast('请选择日期');
      return;
    }
    if (!formTitle.trim()) {
      showToast('请输入标题');
      return;
    }
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.from('schedules').insert({
        trip_id: tripId,
        day_date: formDate,
        sort_order: grouped.find(([d]) => d === formDate)?.[1].length || 0,
        title: formTitle.trim(),
        category: formCategory,
        location: formLocation.trim(),
        start_time: formStart,
        end_time: formEnd,
        note: formNote.trim(),
      });
      if (error) throw error;
      resetForm();
      setShowForm(false);
      showToast('已添加行程');
      refresh();
    } catch (e: any) {
      showToast(e?.message || '添加失败');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFormDate('');
    setFormTitle('');
    setFormCategory('景点');
    setFormLocation('');
    setFormStart('');
    setFormEnd('');
    setFormNote('');
  }

  async function deleteSchedule(id: string) {
    if (!confirm('确定删除这条行程？')) return;
    try {
      const sb = getSupabase();
      const { error } = await sb.from('schedules').delete().eq('id', id);
      if (error) throw error;
      showToast('已删除');
      refresh();
    } catch (e: any) {
      showToast(e?.message || '删除失败');
    }
  }

  return (
    <div className="space-y-4">
      {/* 添加按钮 */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn-primary inline-flex w-full items-center justify-center gap-1"
      >
        <Plus size={18} /> 添加行程
      </button>

      {/* 添加表单 */}
      {showForm && (
        <div className="paper-card postcard-border space-y-3 p-4 animate-slide-in-top">
          <div>
            <label className="mb-1 block text-xs text-ink-700/60">日期</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full rounded-card bg-sand-100 px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-700/60">标题</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="如：故宫、晚餐、机场出发"
              className="w-full rounded-card bg-sand-100 px-3 py-2 text-sm text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-700/60">类别</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFormCategory(c.value)}
                  className="rounded-pill px-3 py-1 text-xs font-medium transition-all"
                  style={
                    formCategory === c.value
                      ? { backgroundColor: c.color, color: '#fff' }
                      : { backgroundColor: 'rgba(217,196,156,0.3)', color: '#3A2E1F' }
                  }
                >
                  {c.value}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-ink-700/60">开始时间</label>
              <input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full rounded-card bg-sand-100 px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-700/60">结束时间</label>
              <input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full rounded-card bg-sand-100 px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-700/60">地点</label>
            <input
              type="text"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="如：北京市东城区景山前街4号"
              className="w-full rounded-card bg-sand-100 px-3 py-2 text-sm text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-700/60">备注</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="如：提前买票、带身份证"
              rows={2}
              className="w-full rounded-card bg-sand-100 px-3 py-2 text-sm text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addSchedule}
              disabled={submitting}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="btn-ghost flex-1"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {grouped.length === 0 && !showForm && (
        <div className="paper-card postcard-border flex flex-col items-center gap-2 p-8 text-center">
          <Calendar size={36} className="text-ink-700/30" />
          <p className="text-sm text-ink-700/60">还没有行程安排</p>
          <p className="text-xs text-ink-700/40">点击上方添加行程，规划每天的景点、餐饮、交通</p>
        </div>
      )}

      {/* 按天分组展示 */}
      {grouped.map(([date, items], dayIdx) => {
        const { index, label } = formatDate(date, dayIdx);
        return (
          <div key={date} className="space-y-2">
            {/* 日期标题 */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-desert-500 text-xs font-bold text-white">
                D{index}
              </div>
              <div>
                <div className="font-hand text-lg text-ink-700">{label}</div>
                <div className="text-[10px] text-ink-700/40">{items.length} 项安排</div>
              </div>
            </div>

            {/* 时间线 */}
            <div className="relative space-y-2 border-l-2 border-dashed border-desert-500/30 pl-4">
              {items.map((s) => {
                const color = catColor(s.category);
                return (
                  <div key={s.id} className="group relative">
                    {/* 时间线圆点 */}
                    <div
                      className="absolute -left-[21px] top-3 h-3 w-3 rounded-full ring-2 ring-sand-100"
                      style={{ backgroundColor: color }}
                    />
                    <div className="paper-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="rounded-pill px-2 py-0.5 text-[10px] font-medium text-white"
                              style={{ backgroundColor: color }}
                            >
                              {s.category}
                            </span>
                            <span className="truncate font-medium text-ink-700">
                              {s.title}
                            </span>
                          </div>
                          {(s.start_time || s.end_time) && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-ink-700/60">
                              <Clock size={12} />
                              {s.start_time || '--:--'} - {s.end_time || '--:--'}
                            </div>
                          )}
                          {s.location && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/60">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">{s.location}</span>
                              <a
                                href={`https://uri.amap.com/navigation?to=${encodeURIComponent(s.location)}&mode=car&src=travel-split&coordinate=wgs84`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="导航"
                                className="touch-target flex shrink-0 items-center gap-0.5 rounded-pill bg-desert-500/10 px-2 py-0.5 text-[10px] text-desert-600 transition-colors hover:bg-desert-500/20"
                              >
                                <Navigation size={10} />
                                导航
                              </a>
                            </div>
                          )}
                          {s.note && (
                            <div className="mt-1 text-xs text-ink-700/70 whitespace-pre-wrap">
                              {s.note}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteSchedule(s.id)}
                          aria-label="删除"
                          className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-stamp-500/15 text-stamp-600 group-hover:flex"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-pill bg-ink-700/90 px-4 py-2 text-sm text-sand-100 animate-slide-in-top">
          {toast}
        </div>
      )}
    </div>
  );
}
