import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '旅游分账 · 明信片账本',
    short_name: '旅游分账',
    description: '多人旅游实时记账分账工具，自动算清谁给谁转多少',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    orientation: 'portrait',
    background_color: '#F5EFE3',
    theme_color: '#E07A3E',
    lang: 'zh-CN',
    dir: 'ltr',
    categories: ['finance', 'productivity', 'travel'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/screenshot-home.svg',
        sizes: '390x844',
        type: 'image/svg+xml',
        form_factor: 'narrow',
        label: '账本列表首页',
      },
      {
        src: '/screenshot-detail.svg',
        sizes: '390x844',
        type: 'image/svg+xml',
        form_factor: 'narrow',
        label: '账本详情与消费记录',
      },
    ],
    shortcuts: [
      {
        name: '创建新账本',
        short_name: '新建',
        description: '创建一个新的旅游账本',
        url: '/trip/new',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: '加入账本',
        short_name: '加入',
        description: '输入加入码加入已有账本',
        url: '/trip/join',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  } as unknown as MetadataRoute.Manifest;
}
