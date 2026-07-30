'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { Member, Expense } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { formatYuan } from '@/lib/utils';

type RecognizedItem = {
  purpose: string;
  amount: number;
  note: string;
  date: string;
  payer_id: string; // 每项可单独指定付款人
  _selected: boolean;
  _duplicate?: boolean;
};

type Props = {
  tripId: string;
  members: Member[];
  expenses: Expense[];
  onImported: () => void;
};

const PURPOSES = ['餐饮', '住宿', '交通', '门票', '购物', '其他'] as const;
type Purpose = typeof PURPOSES[number];

export default function BillImport({ tripId, members, expenses, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RecognizedItem[]>([]);
  const [defaultPayerId, setDefaultPayerId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Escape 键关闭弹窗
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading]);

  // 检测重复：金额相同 ±0.01 且目的相同
  function isDuplicate(item: RecognizedItem): boolean {
    return expenses.some(
      (e) =>
        Math.abs(Number(e.amount) - item.amount) < 0.02 &&
        e.purpose === item.purpose
    );
  }

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      // 压缩图片
      const base64 = await compressImage(file);
      // 调用 API
      const res = await fetch('/api/bill-recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `识别失败 (${res.status})`);
      }
      const data = await res.json();
      const recognized: RecognizedItem[] = (data.items || []).map((item: any) => {
        // 尝试匹配 AI 识别的付款人名称到成员 ID
        let payerId = '';
        if (item.payer_name) {
          const matched = members.find(
            (m) => m.name === item.payer_name || m.name.includes(item.payer_name) || item.payer_name.includes(m.name)
          );
          if (matched) payerId = matched.id;
        }
        return {
          ...item,
          payer_id: payerId, // 空字符串表示未匹配，稍后用默认付款人填充
          _selected: true,
        };
      });
      // 用默认付款人填充未匹配的项
      if (defaultPayerId) {
        recognized.forEach((item) => {
          if (!item.payer_id) item.payer_id = defaultPayerId;
        });
      }
      // 标记重复
      recognized.forEach((item) => {
        item._duplicate = isDuplicate(item);
      });
      setItems(recognized);
      if (recognized.length === 0) {
        setError('未识别到消费记录，请换张图试试');
      }
    } catch (err: any) {
      setError(err.message || '识别失败');
    } finally {
      setLoading(false);
    }
  }

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1600;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height * maxDim) / width;
              width = maxDim;
            } else {
              width = (width * maxDim) / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas 不支持'));
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  function toggleItem(idx: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, _selected: !it._selected } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItemPurpose(idx: number, purpose: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, purpose } : it)));
  }

  function updateItemPayer(idx: number, payerId: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, payer_id: payerId } : it)));
  }

  // 修改默认付款人：同步更新所有使用旧默认值的项
  function changeDefaultPayer(payerId: string) {
    setDefaultPayerId(payerId);
    setItems((prev) => prev.map((it) => ({ ...it, payer_id: payerId })));
  }

  async function importSelected() {
    const selected = items.filter((it) => it._selected);
    if (selected.length === 0) return;
    // 检查每项都有付款人
    const missingPayer = selected.find((it) => !it.payer_id);
    if (missingPayer) {
      setError('请为每项消费选择付款人');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const allMemberIds = members.map((m) => m.id);
      const rows = selected.map((it) => ({
        trip_id: tripId,
        amount: it.amount,
        purpose: it.purpose as Purpose,
        note: it.note,
        payer_id: it.payer_id, // 使用每项自己的付款人
        split_between: allMemberIds,
        split_type: 'equal' as const,
      }));
      const { error: insertError } = await sb.from('expenses').insert(rows);
      if (insertError) throw insertError;
      const total = selected.reduce((s, it) => s + it.amount, 0);
      alert(`成功导入 ${selected.length} 笔消费，共 ¥${formatYuan(total)}`);
      setItems([]);
      setOpen(false);
      onImported();
    } catch (err: any) {
      setError(err.message || '导入失败');
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = items.filter((it) => it._selected).length;
  const selectedTotal = items
    .filter((it) => it._selected)
    .reduce((s, it) => s + it.amount, 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="touch-target flex items-center gap-1 rounded-pill bg-desert-500/10 px-3 py-1.5 text-sm text-desert-600"
      >
        <Upload size={16} /> 识别导入
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-700/40" onClick={() => !loading && setOpen(false)}>
          <div
            className="paper-card flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-card animate-slide-in-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 拖拽提示条 */}
            <div className="flex shrink-0 justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-ink-700/20" />
            </div>

            {/* 头部 - 固定 */}
            <div className="flex shrink-0 items-center justify-between border-b border-dashed border-ink-700/10 p-4 pb-3">
              <h3 className="font-hand text-lg text-ink-700">账单截图识别</h3>
              <button
                onClick={() => !loading && setOpen(false)}
                className="touch-target flex items-center gap-1 rounded-pill bg-sand-200/60 px-3 py-1 text-xs text-ink-700/70 transition-colors hover:bg-sand-200 disabled:opacity-40"
                disabled={loading}
                aria-label="关闭"
              >
                <X size={14} />
                <span>取消</span>
              </button>
            </div>

            {/* 内容区 - 可滚动 */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* 说明 */}
              {items.length === 0 && !loading && (
                <div className="mb-4 rounded-pill bg-sand-200/40 p-3 text-xs text-ink-700/60">
                  支持：记账 App 截图、Excel 表格截图、手写账单照片。识别后可勾选导入，重复的消费会自动标记。
                </div>
              )}

              {/* 上传区 */}
              {items.length === 0 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="paper-card flex w-full flex-col items-center justify-center gap-2 p-8 transition-colors hover:bg-sand-200/30 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={32} className="animate-spin text-desert-600" />
                      <div className="text-sm text-ink-700/60">正在识别...</div>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-desert-600" />
                      <div className="text-sm font-medium text-ink-700">点击上传账单截图</div>
                      <div className="text-[10px] text-ink-700/60">支持 JPG/PNG，最大 5MB</div>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />

              {/* 错误 */}
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-pill bg-stamp-500/10 p-3 text-sm text-stamp-600">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 识别结果 */}
              {items.length > 0 && (
                <div className="space-y-3">
                  {/* 默认付款人（批量设置） */}
                  <div className="paper-card p-3">
                    <div className="mb-2 text-xs font-medium text-ink-700/70">默认付款人（批量设置所有项）</div>
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => changeDefaultPayer(m.id)}
                          className={`rounded-pill px-3 py-1.5 text-xs transition-colors ${
                            defaultPayerId === m.id
                              ? 'bg-desert-500 text-white'
                              : 'bg-sand-200/50 text-ink-700/70'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 识别结果列表 */}
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        className={`paper-card p-3 transition-opacity ${
                          it._selected ? '' : 'opacity-40'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleItem(idx)}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              it._selected
                                ? 'border-desert-500 bg-desert-500 text-white'
                                : 'border-ink-700/30'
                            }`}
                          >
                            {it._selected && <CheckCircle2 size={12} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap gap-1">
                                {PURPOSES.map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => updateItemPurpose(idx, p)}
                                    className={`rounded-pill px-2 py-0.5 text-[10px] transition-colors ${
                                      it.purpose === p
                                        ? 'bg-desert-500 text-white'
                                        : 'bg-sand-200/50 text-ink-700/60'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                              <div className="shrink-0 font-hand text-lg text-desert-600">
                                ¥{formatYuan(it.amount)}
                              </div>
                            </div>
                            {it.note && (
                              <div className="mt-1 text-xs text-ink-700/60">{it.note}</div>
                            )}
                            {it.date && (
                              <div className="text-[10px] text-ink-700/40">{it.date}</div>
                            )}
                            {/* 付款人选择（每项独立） */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-ink-700/50">付款人：</span>
                              {members.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => updateItemPayer(idx, m.id)}
                                  className={`rounded-pill px-2 py-0.5 text-[10px] transition-colors ${
                                    it.payer_id === m.id
                                      ? 'bg-moss-600 text-white'
                                      : 'bg-sand-200/50 text-ink-700/60'
                                  }`}
                                >
                                  {m.name}
                                </button>
                              ))}
                            </div>
                            {it._duplicate && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                                <AlertCircle size={10} />
                                疑似重复，可能已存在
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(idx)}
                            className="shrink-0 p-1 text-ink-700/30 hover:text-stamp-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 底部汇总 - 固定 */}
            {items.length > 0 && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-dashed border-ink-700/15 bg-sand-100/80 p-4 pt-3 backdrop-blur">
                <div className="text-xs text-ink-700/60">
                  已选 <span className="font-bold text-desert-600">{selectedCount}</span> 笔
                  {selectedTotal > 0 && (
                    <span> · 合计 ¥{formatYuan(selectedTotal)}</span>
                  )}
                </div>
                <button
                  onClick={importSelected}
                  disabled={loading || selectedCount === 0}
                  className="btn-primary flex items-center gap-1 px-4 py-2 text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  导入
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
