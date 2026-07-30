import type {
  Expense,
  Member,
  MemberSummary,
  Settlement,
  MatrixCell,
} from '@/types';

// 计算某成员在一笔消费中的应付金额
// - equal: amount / split_between.length（仅 split_between 中的成员）
// - custom: split_details[memberId] || 0
// - solo: 只有付款人应付 amount，其他人 0
export function getMemberShare(expense: Expense, memberId: string): number {
  const type = expense.split_type || 'equal';
  if (type === 'solo') {
    return memberId === expense.payer_id ? expense.amount : 0;
  }
  if (type === 'custom' && expense.split_details) {
    return expense.split_details[memberId] || 0;
  }
  // equal（默认，兼容旧数据）：必须在该笔分摊人员名单里才需要付
  if (!expense.split_between || expense.split_between.length === 0) return 0;
  if (!expense.split_between.includes(memberId)) return 0;
  return expense.amount / expense.split_between.length;
}

// 净额计算：> 0 别人欠他；< 0 他欠别人
export function calculateNet(members: Member[], expenses: Expense[]): Record<string, number> {
  const net: Record<string, number> = {};
  members.forEach((m) => (net[m.id] = 0));

  expenses.forEach((e) => {
    if (net[e.payer_id] !== undefined) net[e.payer_id] += e.amount;
    members.forEach((m) => {
      const share = getMemberShare(e, m.id);
      if (share > 0 && net[m.id] !== undefined) net[m.id] -= share;
    });
  });

  // 修正浮点误差，四舍五入到 2 位
  Object.keys(net).forEach((k) => {
    net[k] = Math.round(net[k] * 100) / 100;
  });
  return net;
}

// 最少转账贪心算法
export function settleDebts(net: Record<string, number>): Settlement[] {
  const creditors: [string, number][] = [];
  const debtors: [string, number][] = [];

  Object.entries(net).forEach(([id, v]) => {
    if (v > 0.01) creditors.push([id, v]);
    else if (v < -0.01) debtors.push([id, -v]);
  });

  // 降序排列，加速收敛
  creditors.sort((a, b) => b[1] - a[1]);
  debtors.sort((a, b) => b[1] - a[1]);

  const result: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i][1], creditors[j][1]);
    const rounded = Math.round(pay * 100) / 100;
    if (rounded > 0.01) {
      result.push({
        from_member_id: debtors[i][0],
        to_member_id: creditors[j][0],
        amount: rounded,
      });
    }
    debtors[i][1] -= pay;
    creditors[j][1] -= pay;
    if (debtors[i][1] < 0.01) i++;
    if (creditors[j][1] < 0.01) j++;
  }
  return result;
}

// 每人汇总
export function buildMemberSummaries(
  members: Member[],
  expenses: Expense[]
): MemberSummary[] {
  const paid: Record<string, number> = {};
  const shouldPay: Record<string, number> = {};
  members.forEach((m) => {
    paid[m.id] = 0;
    shouldPay[m.id] = 0;
  });

  expenses.forEach((e) => {
    if (paid[e.payer_id] !== undefined) paid[e.payer_id] += e.amount;
    members.forEach((m) => {
      const share = getMemberShare(e, m.id);
      if (share > 0 && shouldPay[m.id] !== undefined) shouldPay[m.id] += share;
    });
  });

  return members.map((m) => {
    const p = Math.round(paid[m.id] * 100) / 100;
    const s = Math.round(shouldPay[m.id] * 100) / 100;
    return {
      member: m,
      paid: p,
      shouldPay: s,
      net: Math.round((p - s) * 100) / 100,
    };
  });
}

// 消费矩阵：行=付款人，列=分摊人
export function buildMatrix(members: Member[], expenses: Expense[]): MatrixCell[] {
  const cells: MatrixCell[] = [];
  expenses.forEach((e) => {
    members.forEach((m) => {
      const share = getMemberShare(e, m.id);
      if (share > 0) {
        cells.push({
          payerId: e.payer_id,
          splitId: m.id,
          amount: Math.round(share * 100) / 100,
        });
      }
    });
  });
  return cells;
}

// 矩阵聚合：[payerId][splitId] -> 总额
export function aggregateMatrix(
  members: Member[],
  cells: MatrixCell[]
): Record<string, Record<string, number>> {
  const m: Record<string, Record<string, number>> = {};
  members.forEach((p) => {
    m[p.id] = {};
    members.forEach((s) => {
      m[p.id][s.id] = 0;
    });
  });
  cells.forEach((c) => {
    if (m[c.payerId] && m[c.payerId][c.splitId] !== undefined) {
      m[c.payerId][c.splitId] += c.amount;
    }
  });
  // 修正浮点
  Object.keys(m).forEach((p) => {
    Object.keys(m[p]).forEach((s) => {
      m[p][s] = Math.round(m[p][s] * 100) / 100;
    });
  });
  return m;
}
