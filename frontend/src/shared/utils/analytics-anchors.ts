// Section anchors that may be reported to analytics. URL fragments are
// attacker-controlled (anyone can craft a link), so anything else, such as an
// email address pasted after the #, is dropped rather than landing in reports.
export const TRACKABLE_ANCHORS: ReadonlySet<string> = new Set([
  'about',
  'experience',
  'projects',
  'skills',
  'resume',
  'doodle',
]);
