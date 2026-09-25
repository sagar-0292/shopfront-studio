// Plain-language names for the options used across the studio.

export const SITE_TYPES = [
  { key: 'informative', label: 'Informative' },
  { key: 'whatsapp_catalogue', label: 'WhatsApp catalogue' },
  { key: 'online_store', label: 'Online store' },
  { key: 'marketplace', label: 'Multi-seller marketplace' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'real_estate', label: 'Real estate' },
  { key: 'education', label: 'Education' },
  { key: 'events', label: 'Events & tickets' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'ngo', label: 'NGO & donations' },
] as const;
export type SiteType = (typeof SITE_TYPES)[number]['key'];

export const SITE_STATUSES = [
  { key: 'draft', label: 'Draft', tone: 'neutral' },
  { key: 'building', label: 'Building', tone: 'accent' },
  { key: 'in_review', label: 'With client for review', tone: 'warn' },
  { key: 'live', label: 'Live', tone: 'good' },
  { key: 'paused', label: 'Paused', tone: 'bad' },
  { key: 'archived', label: 'Archived', tone: 'neutral' },
] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number]['key'];

export const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'Hindi' },
  { key: 'mr', label: 'Marathi' },
  { key: 'gu', label: 'Gujarati' },
  { key: 'ta', label: 'Tamil' },
  { key: 'te', label: 'Telugu' },
  { key: 'kn', label: 'Kannada' },
  { key: 'ml', label: 'Malayalam' },
  { key: 'bn', label: 'Bengali' },
  { key: 'pa', label: 'Punjabi' },
  { key: 'or', label: 'Odia' },
  { key: 'ur', label: 'Urdu' },
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const label = <T extends { key: string; label: string }>(list: readonly T[], key: string) =>
  list.find((x) => x.key === key)?.label ?? key;

export const statusOf = (key: string) => SITE_STATUSES.find((s) => s.key === key) ?? SITE_STATUSES[0];

/** Indian dates: 25 Sep 2026, 4:05 pm */
export function formatDate(d: Date | string, withTime = false) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: 'Asia/Kolkata',
  }).format(new Date(d));
}
