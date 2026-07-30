'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  className?: string;
};

export default function Header({ title, showBack, right, className }: Props) {
  const router = useRouter();
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-ink-700/10 bg-sand-100/95 px-3',
        className
      )}
    >
      {showBack && (
        <button
          aria-label="返回"
          onClick={() => router.back()}
          className="touch-target flex items-center justify-center rounded-full hover:bg-ink-700/5"
        >
          <ArrowLeft size={22} className="text-ink-700" />
        </button>
      )}
      {title && (
        <h1 className="font-hand flex-1 truncate text-xl text-ink-700">{title}</h1>
      )}
      {right}
    </header>
  );
}
