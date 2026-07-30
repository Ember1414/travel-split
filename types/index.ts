// 旅游分账 — 类型定义

export type Trip = {
  id: string;
  name: string;
  join_code: string; // 6 位加入码
  created_by: string | null;
  created_at: string;
  settled: boolean;
};

export type Member = {
  id: string;
  trip_id: string;
  name: string;
  color: string; // 头像颜色键名（参考 constants.MEMBER_COLORS）
  created_at: string;
};

export type Purpose = '餐饮' | '住宿' | '交通' | '门票' | '购物' | '其他';

// 分摊方式：equal=平均 custom=按金额自定义 solo=付款人独担
export type SplitType = 'equal' | 'custom' | 'solo';

export type Expense = {
  id: string;
  trip_id: string;
  amount: number; // 元，保留 2 位
  purpose: Purpose;
  note: string;
  payer_id: string;
  split_between: string[]; // member_id 数组
  split_type: SplitType; // 分摊方式，默认 'equal'
  split_details: Record<string, number> | null; // custom 时存 {member_id: amount}
  created_by: string | null;
  created_at: string;
};

export type Settlement = {
  from_member_id: string;
  to_member_id: string;
  amount: number;
};

// 每人汇总
export type MemberSummary = {
  member: Member;
  paid: number; // 已付总额
  shouldPay: number; // 应付总额
  net: number; // 净额 = paid - shouldPay，> 0 别人欠他
};

// 行=付款人，列=分摊人，单元格=该付款人为该分摊人垫付的金额
export type MatrixCell = {
  payerId: string;
  splitId: string;
  amount: number;
};

export type ExpenseRow = Expense & {
  payer?: Member;
  splitMembers?: Member[];
};

// ===== 行程规划 =====
export type ScheduleCategory = '景点' | '餐饮' | '交通' | '住宿' | '购物' | '其他';

export type Schedule = {
  id: string;
  trip_id: string;
  day_date: string; // YYYY-MM-DD
  sort_order: number;
  title: string;
  category: ScheduleCategory;
  location: string;
  start_time: string; // HH:mm
  end_time: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

// ===== 行李清单 =====
export type PackingCategory = '证件' | '电子' | '衣物' | '洗护' | '药品' | '其他';

export type PackingItem = {
  id: string;
  trip_id: string;
  text: string;
  category: PackingCategory;
  checked: boolean;
  checked_by: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

// ===== 共享信息板 =====
export type InfoCardType = 'flight' | 'hotel' | 'contact' | 'transport' | 'emergency' | 'note';

export type InfoCard = {
  id: string;
  trip_id: string;
  type: InfoCardType;
  title: string;
  content: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

// ===== 投票 =====
export type Poll = {
  id: string;
  trip_id: string;
  question: string;
  options: string[]; // 选项文本数组
  allow_multiple: boolean;
  closed: boolean;
  created_by: string | null;
  created_at: string;
};

export type PollVote = {
  id: string;
  poll_id: string;
  member_id: string;
  option_index: number;
  voted_at: string;
};
