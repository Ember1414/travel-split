import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export const metadata: Metadata = {
  title: '旅游分账 · 明信片账本',
  description: '多人旅游实时记账分账工具，自动算清谁给谁转多少',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '旅游分账',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E07A3E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=window.matchMedia('(prefers-color-scheme: dark)');var d=localStorage.getItem('travel-split:theme');if(d==='dark'||(!d&&m.matches))document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
        {/* 注册 Service Worker（PWA 离线支持） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(function(reg){if(reg.waiting){reg.waiting.postMessage('SKIP_WAITING');}}).catch(function(){});});}`,
          }}
        />
      </head>
      <body>
        <div className="mx-auto min-h-screen w-full max-w-[480px] bg-sand-100/60 dark:bg-ink-800/60">
          {children}
          <PWAInstallPrompt />
        </div>
      </body>
    </html>
  );
}
