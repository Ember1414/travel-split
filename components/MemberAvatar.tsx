import { cn, getInitial } from '@/lib/utils';
import { getColorByKey } from '@/lib/constants';

type Size = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  name: string;
  colorKey: string;
  size?: Size;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
};

const sizeMap: Record<Size, { box: string; text: string }> = {
  sm: { box: 'w-8 h-8', text: 'text-xs' },
  md: { box: 'w-11 h-11', text: 'text-sm' },
  lg: { box: 'w-14 h-14', text: 'text-base' },
  xl: { box: 'w-16 h-16', text: 'text-lg' },
};

export default function MemberAvatar({
  name,
  colorKey,
  size = 'md',
  selected,
  className,
  onClick,
}: Props) {
  const color = getColorByKey(colorKey);
  const sz = sizeMap[size];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-semibold transition-all',
        sz.box,
        sz.text,
        onClick && 'touch-target',
        selected && 'ring-2 ring-desert-500 ring-offset-2 ring-offset-sand-100',
        className
      )}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {getInitial(name)}
      {selected && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-desert-500 text-[10px] text-white">
          ✓
        </span>
      )}
    </Component>
  );
}
