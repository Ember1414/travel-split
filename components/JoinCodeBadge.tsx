'use client';

import { useState } from 'react';
import { Copy, Check, X, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  code: string;
  tripName: string;
  className?: string;
};

export default function JoinCodeBadge({ code, tripName, className }: Props) {
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 忽略
    }
  }

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `加入旅游分账账本「${tripName}」\n加入码：${code}\n打开 ${url} 点击「加入」输入加入码即可共同记账`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '旅游分账', text, url });
      } catch {
        // 用户取消
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowShare(true)}
        className={cn(
          'flex items-center gap-1.5 rounded-pill border border-desert-500/40 bg-desert-500/10 px-3 py-1.5 text-sm text-desert-700 transition-all hover:bg-desert-500/15',
          className
        )}
      >
        <Share2 size={14} />
        <span className="font-mono font-bold tracking-wider">{code}</span>
      </button>

      {/* 分享弹窗 */}
      {showShare && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-800/40 backdrop-blur-sm"
          onClick={() => setShowShare(false)}
        >
          <div
            className="paper-card w-full max-w-[480px] rounded-b-none p-5 pb-8 animate-slide-in-top"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-hand text-xl text-ink-700">分享账本</h3>
              <button
                onClick={() => setShowShare(false)}
                className="touch-target flex items-center justify-center rounded-full text-ink-700/40"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-3 text-sm text-ink-700/60">
              把加入码发给同伴，他们在 App 内输入即可加入账本：
            </p>

            <div className="mb-4 flex items-center justify-between rounded-card bg-sand-100 px-4 py-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-700/50">
                  加入码
                </div>
                <div className="font-hand text-3xl tracking-[0.2em] text-desert-600">
                  {code}
                </div>
              </div>
              <button
                onClick={copyCode}
                className="btn-ghost inline-flex items-center gap-1 text-sm"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>

            <button onClick={share} className="btn-primary w-full">
              <Share2 size={18} className="mr-1 inline" /> 系统分享
            </button>
          </div>
        </div>
      )}
    </>
  );
}
