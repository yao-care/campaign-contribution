/** 第 19 條列舉扣除額的兩種身分。 */
import { DEDUCTION } from './elections';

export const DEDUCTION_ENTITIES = [
  {
    slug: 'individual', entity: '個人', d: DEDUCTION.individual,
    itemName: '列舉扣除額',
    unit: '每一申報戶',
  },
  {
    slug: 'business', entity: '營利事業', d: DEDUCTION.business,
    itemName: '當年度費用或損失',
    unit: '每一營利事業',
  },
] as const;
