-- ============================================================
-- 旅游分账 — Supabase 数据库初始化脚本
-- 使用方法：登录 Supabase → 项目 → SQL Editor → New query
-- 粘贴本文件全部内容 → Run
-- ============================================================

-- 1. 账本表
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled BOOLEAN NOT NULL DEFAULT false
);

-- 2. 成员表
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_members_trip ON members(trip_id);

-- 3. 消费记录表
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL DEFAULT '其他',
  note TEXT DEFAULT '',
  payer_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  split_between TEXT[] NOT NULL DEFAULT '{}', -- equal/custom: 分摊人数组；solo: 空数组
  split_type TEXT NOT NULL DEFAULT 'equal', -- equal=平均 custom=按金额自定义 solo=付款人独担
  split_details JSONB, -- custom 时存 {member_id: amount}
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON expenses(payer_id);

-- 4. 启用 Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略（公开读写，通过 6 位加入码控制访问，适合 MVP）
-- 如需更严格的安全策略，可在 Supabase 后台自行修改
DROP POLICY IF EXISTS "public_read_trips" ON trips;
DROP POLICY IF EXISTS "public_write_trips" ON trips;
DROP POLICY IF EXISTS "public_read_members" ON members;
DROP POLICY IF EXISTS "public_write_members" ON members;
DROP POLICY IF EXISTS "public_read_expenses" ON expenses;
DROP POLICY IF EXISTS "public_write_expenses" ON expenses;

CREATE POLICY "public_read_trips" ON trips FOR SELECT USING (true);
CREATE POLICY "public_write_trips" ON trips FOR ALL USING (true);
CREATE POLICY "public_read_members" ON members FOR SELECT USING (true);
CREATE POLICY "public_write_members" ON members FOR ALL USING (true);
CREATE POLICY "public_read_expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "public_write_expenses" ON expenses FOR ALL USING (true);

-- 6. 启用 Realtime（让客户端能订阅数据变更）
-- 用 DO 块做幂等检查：如果表已在 publication 中就跳过，避免 42710 错误
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trips'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
END $$;

-- 7. 行程安排表
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '其他', -- 景点/餐饮/交通/住宿/购物/其他
  location TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedules_trip ON schedules(trip_id, day_date, sort_order);

-- 8. 行李清单表
CREATE TABLE IF NOT EXISTS packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '其他', -- 证件/电子/衣物/洗护/药品/其他
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_by UUID REFERENCES members(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_packing_trip ON packing_items(trip_id, sort_order);

-- 9. 共享信息板表
CREATE TABLE IF NOT EXISTS info_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note', -- flight/hotel/contact/transport/emergency/note
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_info_cards_trip ON info_cards(trip_id, sort_order);

-- 10. 投票表
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- ["选项A","选项B","选项C"]
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  closed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_polls_trip ON polls(trip_id, created_at);

-- 11. 投票记录表
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, member_id, option_index)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

-- 12. 新表启用 RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE info_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- 13. 新表 RLS 策略（公开读写，同 MVP 策略）
DROP POLICY IF EXISTS "public_rw_schedules" ON schedules;
CREATE POLICY "public_rw_schedules" ON schedules FOR ALL USING (true);

DROP POLICY IF EXISTS "public_rw_packing" ON packing_items;
CREATE POLICY "public_rw_packing" ON packing_items FOR ALL USING (true);

DROP POLICY IF EXISTS "public_rw_info_cards" ON info_cards;
CREATE POLICY "public_rw_info_cards" ON info_cards FOR ALL USING (true);

DROP POLICY IF EXISTS "public_rw_polls" ON polls;
CREATE POLICY "public_rw_polls" ON polls FOR ALL USING (true);

DROP POLICY IF EXISTS "public_rw_poll_votes" ON poll_votes;
CREATE POLICY "public_rw_poll_votes" ON poll_votes FOR ALL USING (true);

-- 14. 新表启用 Realtime（幂等检查）
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['schedules','packing_items','info_cards','polls','poll_votes'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- 完成！现在可以去 Settings → API 拿 Project URL 和 anon key 填到 .env.local
