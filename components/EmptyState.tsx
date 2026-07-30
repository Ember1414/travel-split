import type { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
};

export default function EmptyState({ icon, title, desc, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-up">
      {icon && (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sand-200/60 text-ink-700/40">
          {icon}
        </div>
      )}
      <h3 className="font-hand mb-2 text-xl text-ink-700">{title}</h3>
      {desc && <p className="mb-6 max-w-xs text-sm text-ink-700/60">{desc}</p>}
      {action}
    </div>
  );
}
