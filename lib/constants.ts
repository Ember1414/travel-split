import type { Purpose } from '@/types';

// 成员头像颜色调色板（复古旅行风）
export const MEMBER_COLORS = [
  { key: 'desert', bg: '#E07A3E', text: '#FFFFFF' },
  { key: 'moss', bg: '#2D5A4A', text: '#FFFFFF' },
  { key: 'stamp', bg: '#C8442C', text: '#FFFFFF' },
  { key: 'sand', bg: '#D9C49C', text: '#3A2E1F' },
  { key: 'ink', bg: '#3A2E1F', text: '#F5EFE3' },
  { key: 'ocean', bg: '#3B6E8F', text: '#FFFFFF' },
  { key: 'plum', bg: '#7A4A5C', text: '#FFFFFF' },
  { key: 'olive', bg: '#7A7A3E', text: '#FFFFFF' },
  { key: 'teal', bg: '#3E8E8E', text: '#FFFFFF' },
  { key: 'rust', bg: '#A04E25', text: '#FFFFFF' },
];

export function getColorByKey(key: string) {
  return MEMBER_COLORS.find((c) => c.key === key) || MEMBER_COLORS[0];
}

export function pickColorByIndex(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length].key;
}

// 消费目的标签
export const PURPOSES: { value: Purpose; label: string; color: string }[] = [
  { value: '餐饮', label: '餐饮', color: '#E07A3E' },
  { value: '住宿', label: '住宿', color: '#2D5A4A' },
  { value: '交通', label: '交通', color: '#3B6E8F' },
  { value: '门票', label: '门票', color: '#C8442C' },
  { value: '购物', label: '购物', color: '#7A4A5C' },
  { value: '其他', label: '其他', color: '#7A7A3E' },
];

export function getPurposeStyle(p: Purpose) {
  return PURPOSES.find((x) => x.value === p) || PURPOSES[PURPOSES.length - 1];
}

// 生成 6 位加入码（大写字母 + 数字，避免易混字符 O/0/I/1）
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateJoinCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}
