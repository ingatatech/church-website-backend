export const ANNOUNCEMENT_CATEGORIES = [
  'CHURCH_NEWS',
  'WORSHIP_SERVICES',
  'EVENTS',
  'MINISTRIES',
  'COMMUNITY_OUTREACH',
  'YOUTH_CHILDREN',
  'NOTICES',
  'OTHER',
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'UNPUBLISHED',
  'EXPIRED',
  'ARCHIVED',
] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<
  AnnouncementCategory,
  string
> = {
  CHURCH_NEWS: 'Church News',
  WORSHIP_SERVICES: 'Worship & Services',
  EVENTS: 'Events',
  MINISTRIES: 'Ministries',
  COMMUNITY_OUTREACH: 'Community & Outreach',
  YOUTH_CHILDREN: 'Youth & Children',
  NOTICES: 'Announcements & Notices',
  OTHER: 'Other',
};
