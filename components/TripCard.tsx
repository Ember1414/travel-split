import Link from 'next/link';
import { Users, Receipt, Calendar } from 'lucide-react';
import { formatYuan } from '@/lib/utils';

type Props = {
  id: string;
  name: string;
  memberCount: number;
  totalAmount: number;
  expenseCount: number;
  createdAt: string;
  settled?: boolean;
};

export default function TripCard({
  id,
  name,
  memberCount,
  totalAmount,
  expenseCount,
  createdAt,
  settled,
}: Props) {
  const d = new Date(createdAt);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  // 距今天数
  const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
  const daysLabel = daysAgo === 0 ? '今天创建' : daysAgo === 1 ? '昨天创建' : `${daysAgo} 天前创建`;

  return (
    <Link
      href={`/trip?id=${id}`}
      className="paper-card postcard-border group block p-4 transition-all hover:translate-y-[-2px] hover:shadow-lg animate-fade-up"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-hand truncate text-xl text-ink-700">{name}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-ink-700/60">
            <span className="flex items-center gap-1">
              <Users size={12} /> {memberCount} 人
            </span>
            <span className="flex items-center gap-1">
              <Receipt size={12} /> {expenseCount} 笔
            </span>
          </div>
        </div>
        <div className="stamp-badge text-stamp-500">
          {mm}/{dd}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-dashed border-ink-700/15 pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-700/50">
            总消费
          </div>
          <div className="font-hand text-2xl text-desert-600">
            ¥{formatYuan(totalAmount)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {settled ? (
            <span className="rounded-pill bg-moss-500/15 px-3 py-1 text-xs font-medium text-moss-600">
              已结算
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-ink-700/40">
              <Calendar size={10} />
              {daysLabel}
            </span>
          )}
          {expenseCount > 0 && (
            <span className="text-[10px] text-ink-700/40">点击进入 →</span>
          )}
        </div>
      </div>
    </Link>
  );
}
