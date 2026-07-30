'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'travel-split:pwa-dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天后可重新提示

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 已安装则不显示
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // 7 天内 dismiss 过则不显示
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    // 延迟 4 秒显示，等首页加载完
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  // 点击后跳转到设置中的安装指引
  function handleInstall() {
    // 触发全局事件，让 SettingsMenu 打开
    window.dispatchEvent(new CustomEvent('open-settings'));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-[400px] animate-slide-in-top">
      <div className="paper-card postcard-border flex items-center gap-3 p-3 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-desert-500/15 text-desert-600">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink-700">添加到主屏幕</div>
          <div className="text-[10px] text-ink-700/60">像 App 一样使用，离线也能打开</div>
        </div>
        <button
          onClick={handleInstall}
          className="btn-primary shrink-0 px-4 py-1.5 text-xs"
        >
          查看
        </button>
        <button
          onClick={handleDismiss}
          aria-label="关闭"
          className="shrink-0 p-1 text-ink-700/40"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
