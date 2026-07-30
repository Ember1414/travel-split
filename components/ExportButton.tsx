'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Image, X } from 'lucide-react';
import type { Trip, Member, Expense } from '@/types';
import { formatYuan, formatTime } from '@/lib/utils';
import { getMemberShare } from '@/lib/settle';

type Props = {
  trip: Trip;
  members: Member[];
  expenses: Expense[];
};

export default function ExportButton({ trip, members, expenses }: Props) {
  const [open, setOpen] = useState(false);

  // Escape 键关闭弹窗
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  function exportText() {
    const lines: string[] = [];
    lines.push(`【${trip.name}】账单明细`);
    lines.push(`导出时间：${new Date().toLocaleString('zh-CN')}`);
    lines.push(`成员：${members.map((m) => m.name).join('、')}`);
    lines.push(`总消费：¥${formatYuan(totalAmount)}（共 ${expenses.length} 笔）`);
    lines.push('');
    lines.push('──── 消费明细 ────');
    expenses.forEach((e, i) => {
      const payer = memberMap.get(e.payer_id)?.name || '?';
      const type = e.split_type || 'equal';
      const splitNames = (e.split_between || [])
        .map((id) => memberMap.get(id)?.name || '?')
        .join('、');
      lines.push(
        `${i + 1}. ${formatTime(e.created_at)} | ${e.purpose} | ¥${formatYuan(e.amount)} | ${payer}付款 | ${type === 'solo' ? '独担' : `分摊给：${splitNames}`}${e.note ? ` | 备注：${e.note}` : ''}`
      );
    });
    lines.push('');
    lines.push('──── 每人净额 ────');
    members.forEach((m) => {
      let paid = 0;
      let shouldPay = 0;
      expenses.forEach((e) => {
        if (e.payer_id === m.id) paid += Number(e.amount);
        shouldPay += getMemberShare(e, m.id);
      });
      const net = Math.round((paid - shouldPay) * 100) / 100;
      const sign = net > 0 ? '应收' : net < 0 ? '应付' : '平';
      lines.push(`${m.name}：已付¥${formatYuan(paid)} 应付¥${formatYuan(shouldPay)} ${sign}¥${formatYuan(Math.abs(net))}`);
    });
    lines.push('');
    lines.push('—— 由旅游分账工具生成 ——');

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name}_账单.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  async function exportImage() {
    // 动态加载 html2canvas
    const html2canvas = (await import('html2canvas')).default;
    // 创建临时节点
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0; width: 400px;
      background: #F5EFE3; padding: 24px; font-family: 'Noto Sans SC', sans-serif;
      color: #3A2E1F;
    `;
    container.innerHTML = `
      <div style="text-align:center; margin-bottom: 16px;">
        <div style="font-size: 12px; letter-spacing: 0.3em; color: #E07A3E;">POSTCARDS</div>
        <div style="font-size: 24px; font-weight: 700; margin-top: 4px;">${trip.name}</div>
        <div style="font-size: 11px; color: #999; margin-top: 4px;">导出于 ${new Date().toLocaleDateString('zh-CN')}</div>
      </div>
      <div style="text-align:center; margin: 16px 0; padding: 12px; background: #FBF6EC; border-radius: 12px; border: 1.5px dashed rgba(58,46,31,0.25);">
        <div style="font-size: 10px; color: #999;">总消费</div>
        <div style="font-size: 32px; color: #E07A3E; font-weight: 700;">¥${formatYuan(totalAmount)}</div>
        <div style="font-size: 11px; color: #999; margin-top: 4px;">${expenses.length} 笔 · ${members.length} 人</div>
      </div>
      <div style="margin-top: 12px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">消费明细</div>
        ${expenses.map((e, i) => {
          const payer = memberMap.get(e.payer_id)?.name || '?';
          return `<div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px dashed rgba(58,46,31,0.1); font-size: 12px;">
            <span>${i + 1}. ${e.purpose} · ${payer}付款</span>
            <span style="color:#E07A3E; font-weight:600;">¥${formatYuan(e.amount)}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top: 16px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">每人净额</div>
        ${members.map((m) => {
          let paid = 0, shouldPay = 0;
          expenses.forEach((e) => {
            if (e.payer_id === m.id) paid += Number(e.amount);
            shouldPay += getMemberShare(e, m.id);
          });
          const net = Math.round((paid - shouldPay) * 100) / 100;
          const color = net > 0 ? '#2D5A4A' : net < 0 ? '#C8442C' : '#999';
          const sign = net > 0 ? '应收' : net < 0 ? '应付' : '平';
          return `<div style="display:flex; justify-content:space-between; padding: 4px 0; font-size: 12px;">
            <span>${m.name}</span>
            <span style="color:${color}; font-weight:600;">${sign} ¥${formatYuan(Math.abs(net))}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="text-align:center; margin-top: 16px; font-size: 10px; color: #999;">由旅游分账工具生成</div>
    `;
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#F5EFE3' });
      const link = document.createElement('a');
      link.download = `${trip.name}_账单.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      document.body.removeChild(container);
    }
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="导出"
        className="touch-target flex items-center gap-0.5 rounded-pill bg-moss-600/10 px-3 py-1.5 text-sm text-moss-600"
      >
        <Download size={16} /> 导出
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-700/40" onClick={() => setOpen(false)}>
          <div
            className="paper-card w-full max-w-[480px] rounded-t-card p-4 animate-slide-in-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 拖拽提示条 */}
            <div className="mb-2 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-ink-700/20" />
            </div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-hand text-lg text-ink-700">导出账单</h3>
              <button
                onClick={() => setOpen(false)}
                className="touch-target flex items-center gap-1 rounded-pill bg-sand-200/60 px-3 py-1 text-xs text-ink-700/70 transition-colors hover:bg-sand-200"
                aria-label="关闭"
              >
                <X size={14} />
                <span>取消</span>
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={exportImage}
                className="paper-card flex w-full items-center gap-3 p-3 transition-colors hover:bg-sand-200/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-desert-500/15 text-desert-600">
                  <Image size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-ink-700">导出图片</div>
                  <div className="text-[10px] text-ink-700/60">生成竖版账单图片，适合分享留存</div>
                </div>
              </button>
              <button
                onClick={exportText}
                className="paper-card flex w-full items-center gap-3 p-3 transition-colors hover:bg-sand-200/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-600/15 text-moss-600">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-ink-700">导出文本</div>
                  <div className="text-[10px] text-ink-700/60">纯文本格式，可复制粘贴到备忘录</div>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
