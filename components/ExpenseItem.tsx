'use client';

import MemberAvatar from './MemberAvatar';
import PurposeTag from './PurposeTag';
import { formatYuan, formatTime } from '@/lib/utils';
import type { Expense, Member, SplitType } from '@/types';

type Props = {
  expense: Expense;
  payer?: Member;
  splitMembers?: Member[];
};

const SPLIT_LABEL: Record<SplitType, string> = {
  equal: '平均',
  custom: '自定义',
  solo: '独担',
};

export default function ExpenseItem({ expense, payer, splitMembers }: Props) {
  const splitType = expense.split_type || 'equal';
  const splitCount = expense.split_between?.length || 0;
  const perHead =
    splitType === 'equal' && splitCount > 0
      ? expense.amount / splitCount
      : null;

  return (
    <div className="paper-card flex gap-3 p-3 animate-slide-in-top">
      {/* 付款人头像 */}
      <MemberAvatar
        name={payer?.name || '?'}
        colorKey={payer?.color || 'desert'}
        size="md"
      />

      <div className="min-w-0 flex-1">
        {/* 第一行：付款人 + 日期 + 金额 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-ink-700/60">
              <span className="truncate font-medium text-ink-700">
                {payer?.name || '?'}
              </span>
              <span>付款</span>
              <span className="text-ink-700/30">·</span>
              <span className="shrink-0 text-ink-700/40">
                {formatTime(expense.created_at)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <PurposeTag purpose={expense.purpose} />
              {expense.note && (
                <span className="truncate text-xs text-ink-700/70">· {expense.note}</span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-hand text-xl text-desert-600">
              ¥{formatYuan(expense.amount)}
            </div>
            {perHead !== null ? (
              <div className="text-[10px] text-ink-700/40">
                ¥{formatYuan(perHead)}/人
              </div>
            ) : (
              <div className="text-[10px] text-ink-700/40">
                {SPLIT_LABEL[splitType]}
              </div>
            )}
          </div>
        </div>

        {/* 第二行：分摊信息（放在付款人正下方） */}
        <div className="mt-2 flex items-center gap-1.5 border-t border-dashed border-ink-700/10 pt-2">
          {splitType !== 'solo' && (splitMembers || []).length > 0 && (
            <div className="flex shrink-0 -space-x-1.5">
              {(splitMembers || []).slice(0, 5).map((m) => (
                <div key={m.id} className="ring-2 ring-sand-100 rounded-full">
                  <MemberAvatar name={m.name} colorKey={m.color} size="sm" />
                </div>
              ))}
              {(splitMembers || []).length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700/10 text-[10px] text-ink-700/60 ring-2 ring-sand-100">
                  +{(splitMembers || []).length - 5}
                </div>
              )}
            </div>
          )}
          <span className="shrink-0 text-[10px] text-ink-700/40">
            {splitType === 'solo' ? '付款人独担' : `${splitCount}人分摊`}
          </span>
        </div>
      </div>
    </div>
  );
}
