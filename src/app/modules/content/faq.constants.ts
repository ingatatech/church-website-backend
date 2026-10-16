export const FAQ_CATEGORIES = [
  'Church Services',
  'First Visit',
  'Ministries',
  'Prayer',
  'Sermons',
  'Events',
  'Bible Study',
  'Contact & Location',
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];
export const FAQ_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] as const;
export type FaqStatus = (typeof FAQ_STATUSES)[number];
