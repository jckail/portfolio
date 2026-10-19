// Company slug (the shareable ?company= value) <-> experience data key.
// Maps, not object literals: the slug comes from the URL, and a plain object
// would answer `constructor`/`__proto__` from Object.prototype.
export const SLUG_TO_KEY = new Map<string, string>([
  ['together-ai', 'together_ai'],
  ['prove-identity', 'prove'],
  ['sabbatical', 'sabbatical'],
  ['meta-facebook', 'meta'],
  ['deloitte', 'deloitte'],
  ['wide-open-west', 'wide_open_west'],
  ['common-spirit-health', 'common_spirit_health'],
  ['acustream-r1', 'acustream'],
]);
export const KEY_TO_SLUG = new Map(Array.from(SLUG_TO_KEY, ([slug, key]) => [key, slug]));


export const experienceAnchor = (key: string) => `experience-${KEY_TO_SLUG.get(key) ?? key.replaceAll('_', '-')}`;
