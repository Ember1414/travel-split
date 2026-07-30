'use client';

import { useMemo, useState } from 'react';
import { Vote, Plus, Trash2, Check, X, BarChart3 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { cn, formatTime } from '@/lib/utils';
import MemberAvatar from './MemberAvatar';
import EmptyState from './EmptyState';
import type { Poll, PollVote, Member } from '@/types';

type Props = {
  tripId: string;
  polls: Poll[];
  pollVotes: PollVote[];
  members: Member[];
  refresh: () => Promise<void>;
};

export default function PollPanel({ tripId, polls, pollVotes, members, refresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const currentMemberId = members[0]?.id || '';
  const memberMap = useMemo(
    () => new Map<string, Member>(members.map((m) => [m.id, m])),
    [members]
  );

  // 按 created_at 降序
  const sortedPolls = useMemo(() => {
    return [...polls].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [polls]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function getVotesForPoll(pollId: string): PollVote[] {
    return pollVotes.filter((v) => v.poll_id === pollId);
  }

  async function toggleVote(poll: Poll, idx: number) {
    if (poll.closed) {
      showToast('投票已关闭');
      return;
    }
    if (!currentMemberId) {
      showToast('请先添加成员');
      return;
    }
    if (votingPollId) return;
    setVotingPollId(poll.id);
    try {
      const sb = getSupabase();
      const myVotes = pollVotes.filter(
        (v) => v.poll_id === poll.id && v.member_id === currentMemberId
      );
      const alreadyVotedThis = myVotes.some((v) => v.option_index === idx);

      if (alreadyVotedThis) {
        // 取消该票
        const { error } = await sb
          .from('poll_votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('member_id', currentMemberId)
          .eq('option_index', idx);
        if (error) throw error;
      } else {
        // 单选模式：先删旧票
        if (!poll.allow_multiple) {
          const { error: delErr } = await sb
            .from('poll_votes')
            .delete()
            .eq('poll_id', poll.id)
            .eq('member_id', currentMemberId);
          if (delErr) throw delErr;
        }
        // 插入新票
        const { error: insErr } = await sb.from('poll_votes').insert({
          poll_id: poll.id,
          member_id: currentMemberId,
          option_index: idx,
        });
        if (insErr) throw insErr;
      }
      await refresh();
    } catch (e: any) {
      showToast(e?.message || '操作失败');
    } finally {
      setVotingPollId(null);
    }
  }

  async function closePoll(poll: Poll) {
    if (poll.closed) return;
    try {
      const sb = getSupabase();
      const { error } = await sb.from('polls').update({ closed: true }).eq('id', poll.id);
      if (error) throw error;
      showToast('投票已关闭');
      await refresh();
    } catch (e: any) {
      showToast(e?.message || '关闭失败');
    }
  }

  async function deletePoll(poll: Poll) {
    if (!confirm(`确定删除投票「${poll.question}」？`)) return;
    try {
      const sb = getSupabase();
      const { error } = await sb.from('polls').delete().eq('id', poll.id);
      if (error) throw error;
      showToast('已删除');
      await refresh();
    } catch (e: any) {
      showToast(e?.message || '删除失败');
    }
  }

  function resetForm() {
    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    setShowForm(false);
  }

  async function createPoll() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q) {
      showToast('请输入投票问题');
      return;
    }
    if (opts.length < 2) {
      showToast('至少需要 2 个选项');
      return;
    }
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.from('polls').insert({
        trip_id: tripId,
        question: q,
        options: opts,
        allow_multiple: allowMultiple,
        closed: false,
      });
      if (error) throw error;
      resetForm();
      showToast('投票已创建');
      await refresh();
    } catch (e: any) {
      showToast(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* 顶部标题 + 发起按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="font-hand text-lg text-ink-700">投票表决 · {polls.length}</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-pill bg-desert-500/10 px-3 py-1.5 text-sm text-desert-600"
          >
            <Plus size={16} /> 发起投票
          </button>
        )}
      </div>

      {/* 创建投票表单 */}
      {showForm && (
        <div className="paper-card postcard-border animate-slide-in-top p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-hand text-lg text-ink-700">发起投票</h3>
            <button
              onClick={resetForm}
              className="touch-target flex items-center justify-center rounded-full text-ink-700/40"
              aria-label="取消"
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="投票问题，如：今晚吃什么？"
            maxLength={80}
            autoFocus
            className="paper-card w-full px-4 py-2.5 text-base text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
          />

          <div className="mt-3 space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`选项 ${i + 1}`}
                  maxLength={40}
                  className="paper-card flex-1 px-3 py-2 text-sm text-ink-700 placeholder:text-ink-700/30 focus:outline-none focus:ring-2 focus:ring-desert-500/40"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="touch-target flex items-center justify-center rounded-full text-ink-700/40 hover:text-stamp-600"
                    aria-label="删除选项"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 6 && (
            <button
              onClick={() => setOptions([...options, ''])}
              className="mt-2 inline-flex items-center gap-1 text-sm text-desert-600"
            >
              <Plus size={14} /> 添加选项
            </button>
          )}

          <div className="mt-3 flex items-center justify-between rounded-card bg-sand-100 px-3 py-2">
            <span className="text-sm text-ink-700">允许多选</span>
            <button
              type="button"
              onClick={() => setAllowMultiple(!allowMultiple)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                allowMultiple ? 'bg-desert-500' : 'bg-ink-700/20'
              )}
              aria-pressed={allowMultiple}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  allowMultiple ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={createPoll} disabled={submitting} className="btn-primary flex-1">
              {submitting ? '创建中...' : '发起投票'}
            </button>
            <button onClick={resetForm} className="btn-ghost">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 投票列表 / 空状态 */}
      {sortedPolls.length === 0 && !showForm ? (
        <EmptyState
          icon={<Vote size={36} />}
          title="还没有投票"
          desc="发起投票，让群体决策更轻松"
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={18} className="mr-1 inline" /> 发起投票
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              votes={getVotesForPoll(poll.id)}
              totalMembers={members.length}
              memberMap={memberMap}
              currentMemberId={currentMemberId}
              voting={votingPollId === poll.id}
              onVote={(idx) => toggleVote(poll, idx)}
              onClose={() => closePoll(poll)}
              onDelete={() => deletePoll(poll)}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-pill bg-ink-700/90 px-4 py-2 text-sm text-sand-100 animate-slide-in-top">
          {toast}
        </div>
      )}
    </div>
  );
}

// ===== 子组件：单个投票卡片 =====
type PollCardProps = {
  poll: Poll;
  votes: PollVote[];
  totalMembers: number;
  memberMap: Map<string, Member>;
  currentMemberId: string;
  voting: boolean;
  onVote: (idx: number) => void;
  onClose: () => void;
  onDelete: () => void;
};

function PollCard({
  poll,
  votes,
  totalMembers,
  memberMap,
  currentMemberId,
  voting,
  onVote,
  onClose,
  onDelete,
}: PollCardProps) {
  const options = poll.options || [];
  const totalVoters = new Set(votes.map((v) => v.member_id)).size;
  const myVoteSet = new Set(
    votes.filter((v) => v.member_id === currentMemberId).map((v) => v.option_index)
  );

  return (
    <div className="paper-card postcard-border animate-slide-in-top p-4">
      {/* 顶部：问题 + 删除按钮 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Vote size={16} className="shrink-0 text-desert-500" />
            <h3 className="font-hand break-words text-lg text-ink-700">{poll.question}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ink-700/50">
            {poll.allow_multiple ? (
              <span className="rounded-pill bg-moss-500/10 px-2 py-0.5 text-moss-600">多选</span>
            ) : (
              <span className="rounded-pill bg-sand-200 px-2 py-0.5 text-ink-700/60">单选</span>
            )}
            {poll.closed && (
              <span className="rounded-pill bg-stamp-500/15 px-2 py-0.5 text-stamp-600">
                已关闭
              </span>
            )}
            <span>{formatTime(poll.created_at)}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="touch-target flex shrink-0 items-center justify-center rounded-full text-ink-700/40 hover:text-stamp-600"
          aria-label="删除投票"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* 选项列表 */}
      <div className="mt-3 space-y-2">
        {options.map((opt, idx) => {
          const optVotes = votes.filter((v) => v.option_index === idx);
          const count = optVotes.length;
          const percent = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
          const voted = myVoteSet.has(idx);
          const disabled = poll.closed || !currentMemberId || voting;
          return (
            <button
              key={idx}
              onClick={() => onVote(idx)}
              disabled={disabled}
              className={cn(
                'relative w-full overflow-hidden rounded-card border px-3 py-2 text-left transition-all',
                voted
                  ? 'border-desert-500 bg-desert-500/10'
                  : 'border-ink-700/10 bg-sand-100',
                !disabled && 'hover:border-desert-500/40',
                disabled && !poll.closed && 'opacity-60'
              )}
            >
              {/* 进度条填充 */}
              <div
                className="absolute inset-y-0 left-0 bg-desert-500/25 transition-all"
                style={{ width: `${percent}%` }}
              />
              {/* 内容 */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {voted && <Check size={14} className="shrink-0 text-desert-600" />}
                  <span className="truncate text-sm font-medium text-ink-700">{opt}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {optVotes.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {optVotes.slice(0, 5).map((v) => {
                        const m = memberMap.get(v.member_id);
                        if (!m) return null;
                        return (
                          <div key={v.id} className="rounded-full ring-2 ring-sand-100">
                            <MemberAvatar name={m.name} colorKey={m.color} size="sm" />
                          </div>
                        );
                      })}
                      {optVotes.length > 5 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700/10 text-[10px] text-ink-700/60 ring-2 ring-sand-100">
                          +{optVotes.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                  <span className="font-hand text-sm text-desert-600">
                    {count}
                    <span className="ml-0.5 text-[10px] text-ink-700/40">/{totalMembers}</span>
                  </span>
                </div>
              </div>
              {totalVoters > 0 && (
                <div className="relative z-10 mt-0.5 text-[10px] text-ink-700/50">
                  {percent}%
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 底部：参与统计 + 关闭按钮 */}
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-ink-700/10 pt-2">
        <span className="flex items-center gap-1 text-[10px] text-ink-700/50">
          <BarChart3 size={12} />
          {totalVoters} / {totalMembers} 人已投票
        </span>
        {!currentMemberId ? (
          <span className="text-[10px] text-stamp-600">需先添加成员</span>
        ) : poll.closed ? (
          <span className="text-[10px] text-ink-700/40">投票已结束</span>
        ) : (
          <button
            onClick={onClose}
            className="rounded-pill bg-ink-700/5 px-2.5 py-1 text-[10px] text-ink-700/60 hover:bg-ink-700/10"
          >
            关闭投票
          </button>
        )}
      </div>
    </div>
  );
}
