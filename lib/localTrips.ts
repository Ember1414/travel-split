// 本地存储：用户参与过的账本 id 列表（Supabase 无用户体系，靠 localStorage 记住）
const STORAGE_KEY = 'travel-split:my-trips';

export type MyTripRef = {
  id: string;
  name: string;
  joinedAt: string;
};

export function getMyTrips(): MyTripRef[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as MyTripRef[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addMyTrip(trip: MyTripRef) {
  if (typeof window === 'undefined') return;
  const list = getMyTrips().filter((t) => t.id !== trip.id);
  list.unshift(trip);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}

export function removeMyTrip(id: string) {
  if (typeof window === 'undefined') return;
  const list = getMyTrips().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
