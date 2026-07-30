'use client';

import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Trip,
  Member,
  Expense,
  Schedule,
  PackingItem,
  InfoCard,
  Poll,
  PollVote,
} from '@/types';

type State = {
  trip: Trip | null;
  members: Member[];
  expenses: Expense[];
  schedules: Schedule[];
  packingItems: PackingItem[];
  infoCards: InfoCard[];
  polls: Poll[];
  pollVotes: PollVote[];
  loading: boolean;
  error: string | null;
};

const EMPTY: Omit<State, 'loading' | 'error'> = {
  trip: null,
  members: [],
  expenses: [],
  schedules: [],
  packingItems: [],
  infoCards: [],
  polls: [],
  pollVotes: [],
};

export function useTripData(tripId: string): State & { refresh: () => Promise<void> } {
  const [state, setState] = useState<State>({
    ...EMPTY,
    loading: true,
    error: null,
  });
  const configured = isSupabaseConfigured();

  async function fetchAll() {
    if (!tripId) {
      setState({ ...EMPTY, loading: false, error: '缺少账本 ID' });
      return;
    }
    if (!configured) {
      setState({
        ...EMPTY,
        loading: false,
        error: 'Supabase 未配置，请先在 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY',
      });
      return;
    }
    try {
      const sb = getSupabase();
      const [
        tripRes, memRes, expRes,
        schRes, packRes, infoRes,
        pollRes, voteRes,
      ] = await Promise.all([
        sb.from('trips').select('*').eq('id', tripId).maybeSingle(),
        sb.from('members').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
        sb.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        sb.from('schedules').select('*').eq('trip_id', tripId).order('day_date, sort_order', { ascending: true }),
        sb.from('packing_items').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true }),
        sb.from('info_cards').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true }),
        sb.from('polls').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        sb.from('poll_votes').select('*').in('poll_id', (
          await sb.from('polls').select('id').eq('trip_id', tripId)
        ).data?.map((p: any) => p.id) || ['00000000-0000-0000-0000-000000000000']),
      ]);
      if (tripRes.error) throw tripRes.error;
      if (!tripRes.data) {
        setState({ ...EMPTY, loading: false, error: '账本不存在或已被删除' });
        return;
      }
      setState({
        trip: tripRes.data as Trip,
        members: (memRes.data || []) as Member[],
        expenses: (expRes.data || []) as Expense[],
        schedules: (schRes.data || []) as Schedule[],
        packingItems: (packRes.data || []) as PackingItem[],
        infoCards: (infoRes.data || []) as InfoCard[],
        polls: (pollRes.data || []) as Poll[],
        pollVotes: (voteRes.data || []) as PollVote[],
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message || '加载失败' }));
    }
  }

  useEffect(() => {
    fetchAll();
    if (!configured || !tripId) return;

    const sb = getSupabase();
    const channel = sb
      .channel(`trip:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `trip_id=eq.${tripId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `trip_id=eq.${tripId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packing_items', filter: `trip_id=eq.${tripId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'info_cards', filter: `trip_id=eq.${tripId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `trip_id=eq.${tripId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchAll())
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, configured]);

  return { ...state, refresh: fetchAll };
}
