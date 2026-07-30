'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Sun, Moon, Smartphone, X, Share } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const THEME_KEY = 'travel-split:theme';

type BrowserType = 'wechat' | 'ios-safari' | 'android-chrome' | 'qq' | 'uc' | 'mi' | 'huawei' | 'oppo' | 'vivo' | 'baidu' | 'sogou' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  // 微信内置浏览器（必须先检测，因为 UA 包含 MQQBrowser）
  if (/MicroMessenger/i.test(ua)) return 'wechat';
  // QQ 浏览器
  if (/MQQBrowser/i.test(ua)) return 'qq';
  // UC 浏览器
  if (/UCBrowser|UCWEB/i.test(ua)) return 'uc';
  // 百度浏览器
  if (/baidubrowser|Baidu/i.test(ua)) return 'baidu';
  // 搜狗浏览器
  if (/SogouMobileBrowser|Sogou/i.test(ua)) return 'sogou';
  // 小米浏览器
  if (/MiuiBrowser/i.test(ua)) return 'mi';
  // 华为浏览器
  if (/HuaweiBrowser|HBPC/i.test(ua)) return 'huawei';
  // OPPO 浏览器
  if (/HeytapBrowser|OppoBrowser/i.test(ua)) return 'oppo';
  // vivo 浏览器
  if (/VivoBrowser/i.test(ua)) return 'vivo';
  // iOS Safari（所有 iOS 浏览器都用 Safari 的安装方式）
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  if (isIOS) return 'ios-safari';
  // Android Chrome（原版 Chrome 才会触发 beforeinstallprompt）
  if (/Android/i.test(ua) && /Chrome/.test(ua) && !/Edge|Edg|Samsung|Oppo|Vivo|Huawei|Miui|UC|QQ|Baidu|Sogou/i.test(ua)) return 'android-chrome';
  return 'other';
}

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [browser] = useState<BrowserType>(() => detectBrowser());

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    setTheme(saved || 'auto');

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // 监听 PWAInstallPrompt 的"查看"事件
  useEffect(() => {
    const handler = () => {
      setOpen(true);
    };
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  function applyTheme(next: 'light' | 'dark' | 'auto') {
    setTheme(next);
    if (next === 'auto') {
      localStorage.removeItem(THEME_KEY);
      const m = window.matchMedia('(prefers-color-scheme: dark)');
      document.documentElement.classList.toggle('dark', m.matches);
    } else {
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
  }

  async function handleInstall() {
    // 已安装
    if (isStandalone) {
      alert('已经添加到主屏幕了');
      return;
    }
    // 有原生事件（Android Chrome 会触发）
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setOpen(false);
      setDeferredPrompt(null);
      return;
    }
    // 没有原生事件，显示可视化安装指引
    setShowInstallGuide(true);
  }

  // 安装指引内容（根据浏览器）
  const guideSteps: Record<BrowserType, { title: string; steps: { icon?: 'share' | 'menu' | 'plus'; text: string }[]; note?: string }> = {
    'wechat': {
      title: '微信内无法直接安装',
      steps: [
        { text: '点击右上角「···」' },
        { text: '选择「在浏览器中打开」（iOS）或「在浏览器打开」（Android）' },
        { text: '在系统浏览器打开后，按对应浏览器的步骤添加到主屏幕' },
      ],
      note: '微信内置浏览器不支持 PWA 安装，必须先在外部浏览器打开。可点击下方"复制链接"在外部浏览器粘贴。',
    },
    'ios-safari': {
      title: 'iOS 安装步骤',
      steps: [
        { icon: 'share', text: '点击 Safari 底部/顶部的「分享」按钮（方框+向上箭头）' },
        { text: '在弹出菜单中下滑，找到并点击「添加到主屏幕」' },
        { text: '点击右上角「添加」，桌面会出现 App 图标' },
      ],
      note: 'iOS 只能用 Safari 添加。如果用 Chrome/UC 等其他 iOS 浏览器，请先复制链接到 Safari 打开。',
    },
    'android-chrome': {
      title: 'Chrome 安装步骤',
      steps: [
        { icon: 'menu', text: '点击浏览器右上角「⋮」菜单按钮' },
        { text: '选择「添加到主屏幕」或「安装应用」' },
        { text: '在弹窗中点击「添加」或「安装」' },
      ],
      note: 'Chrome 支持一键安装。如果没看到选项，请确保 Chrome 版本较新。',
    },
    'qq': {
      title: 'QQ 浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部中间的「☰」菜单按钮' },
        { text: '找到「添加书签」或「添加到桌面」' },
        { text: '选择「添加到主屏幕」或「添加到桌面」' },
      ],
      note: 'QQ 浏览器可能将 PWA 显示为书签，但功能相同。',
    },
    'uc': {
      title: 'UC 浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部中间的「☰」菜单按钮' },
        { text: '找到「添加书签」或「添加到主屏幕」' },
        { text: '选择「添加到主屏幕」' },
      ],
      note: 'UC 浏览器可能需要手动开启"桌面图标"权限。',
    },
    'mi': {
      title: '小米浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部「☰」菜单按钮' },
        { text: '选择「添加到主屏幕」或「添加书签」' },
        { text: '确认添加，桌面会出现图标' },
      ],
      note: '小米浏览器原生支持 PWA，添加后可像 App 一样使用。',
    },
    'huawei': {
      title: '华为浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部「☰」菜单按钮' },
        { text: '选择「添加到主屏幕」或「添加书签」' },
        { text: '确认添加即可' },
      ],
      note: '华为浏览器原生支持添加到桌面。',
    },
    'oppo': {
      title: 'OPPO 浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部「☰」菜单按钮' },
        { text: '选择「添加到主屏幕」或「添加书签」' },
        { text: '确认添加即可' },
      ],
      note: 'OPPO 浏览器支持添加到桌面。',
    },
    'vivo': {
      title: 'vivo 浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部「☰」菜单按钮' },
        { text: '选择「添加到主屏幕」或「添加书签」' },
        { text: '确认添加即可' },
      ],
      note: 'vivo 浏览器支持添加到桌面。',
    },
    'baidu': {
      title: '百度浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部「☰」菜单按钮' },
        { text: '找到「添加书签」或「添加到主屏幕」' },
        { text: '确认添加即可' },
      ],
      note: '建议使用手机自带浏览器或 Chrome 以获得最佳体验。',
    },
    'sogou': {
      title: '搜狗浏览器安装步骤',
      steps: [
        { text: '点击屏幕底部「☰」菜单按钮' },
        { text: '找到「添加书签」或「添加到主屏幕」' },
        { text: '确认添加即可' },
      ],
      note: '建议使用手机自带浏览器或 Chrome 以获得最佳体验。',
    },
    'other': {
      title: '安装到主屏幕',
      steps: [
        { text: '点击浏览器菜单按钮（通常是右上角「⋮」或底部「☰」）' },
        { text: '找到「添加到主屏幕」或「添加书签」选项' },
        { text: '确认添加，桌面会出现 App 图标' },
      ],
      note: '几乎所有手机浏览器都支持「添加到主屏幕」功能，只是菜单位置略有不同。',
    },
  };

  const guide = guideSteps[browser];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="设置"
        className="touch-target flex items-center justify-center rounded-full text-ink-700/60 hover:bg-ink-700/5 hover:text-ink-700"
      >
        <Settings size={20} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-700/40" onClick={() => setOpen(false)}>
          <div
            className="paper-card flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-card animate-slide-in-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-ink-700/20" />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-dashed border-ink-700/10 p-4 pb-3">
              <h3 className="font-hand text-lg text-ink-700">设置</h3>
              <button
                onClick={() => setOpen(false)}
                className="touch-target flex items-center gap-1 rounded-pill bg-sand-200/60 px-3 py-1 text-xs text-ink-700/70"
              >
                <X size={14} />
                <span>取消</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="paper-card p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-700/70">
                  {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                  外观
                </div>
                <div className="flex gap-2">
                  {([
                    { v: 'light', label: '浅色', icon: Sun },
                    { v: 'dark', label: '深色', icon: Moon },
                    { v: 'auto', label: '跟随系统', icon: Settings },
                  ] as const).map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.v}
                        onClick={() => applyTheme(opt.v)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-pill px-3 py-2 text-xs transition-colors ${
                          theme === opt.v
                            ? 'bg-desert-500 text-white'
                            : 'bg-sand-200/50 text-ink-700/70'
                        }`}
                      >
                        <Icon size={14} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isStandalone && (
                <button
                  onClick={handleInstall}
                  className="paper-card flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-sand-200/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-600/15 text-moss-600">
                    <Smartphone size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ink-700">添加到主屏幕</div>
                    <div className="text-[10px] text-ink-700/60">
                      {deferredPrompt ? '点击一键安装' : '点击查看安装方法'}
                    </div>
                  </div>
                </button>
              )}

              {isStandalone && (
                <div className="paper-card flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-600/15 text-moss-600">
                    <Smartphone size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-moss-600">已安装到主屏幕</div>
                    <div className="text-[10px] text-ink-700/60">当前以 App 模式运行</div>
                  </div>
                </div>
              )}

              <div className="px-2 pt-1 text-center text-[10px] text-ink-700/40">
                旅游分账 · 明信片账本 v1.0
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 安装指引弹窗 */}
      {showInstallGuide && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-700/40" onClick={() => setShowInstallGuide(false)}>
          <div
            className="paper-card flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-card animate-slide-in-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-ink-700/20" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-dashed border-ink-700/10 p-4 pb-3">
              <h3 className="font-hand text-lg text-ink-700">添加到主屏幕</h3>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="touch-target flex items-center gap-1 rounded-pill bg-sand-200/60 px-3 py-1 text-xs text-ink-700/70"
              >
                <X size={14} />
                <span>关闭</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 text-sm font-medium text-ink-700">{guide.title}</div>

              <ol className="space-y-3">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-desert-500 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="flex-1 pt-0.5 text-sm text-ink-700">
                      {step.icon === 'share' && (
                        <Share size={14} className="mr-1 inline text-desert-600" />
                      )}
                      {step.text}
                    </div>
                  </li>
                ))}
              </ol>

              {guide.note && (
                <div className="mt-4 rounded-pill bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-700">
                  {guide.note}
                </div>
              )}

              {/* 微信特殊提示 */}
              {browser === 'wechat' && (
                <button
                  onClick={() => {
                    // 复制链接到剪贴板
                    navigator.clipboard?.writeText(window.location.href).then(() => {
                      alert('链接已复制！请打开浏览器粘贴访问');
                    }).catch(() => {
                      alert('请手动复制地址栏链接，在外部浏览器打开');
                    });
                  }}
                  className="btn-primary mt-4 w-full"
                >
                  复制链接
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
