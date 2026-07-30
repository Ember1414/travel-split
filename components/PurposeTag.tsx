import { cn } from '@/lib/utils';
import { getPurposeStyle } from '@/lib/constants';
import type { Purpose } from '@/types';

type Props = {
  purpose: Purpose;
  className?: string;
};

export default function PurposeTag({ purpose, className }: Props) {
  const style = getPurposeStyle(purpose);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium',
        className
      )}
      style={{
        backgroundColor: `${style.color}20`,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}
