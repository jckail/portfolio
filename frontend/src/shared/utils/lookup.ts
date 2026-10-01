/**
 * Safe access to the JSON dictionaries that are indexed by untrusted input
 * (?skill=, ?project=, ?company=, chat tool actions).
 *
 * On a plain object `data['constructor']` or `data['__proto__']` resolves
 * through Object.prototype to something truthy, which mounted an empty modal
 * or crashed the section (audit F-2). Every keyed read goes through here.
 */

/** Copy a JSON dictionary onto a null-prototype object. */
export function toLookup<T extends object>(data: T): T {
  return Object.assign(Object.create(null) as T, data);
}

/** The value stored under `key` as an own property, or undefined. */
export function getOwn<T>(
  map: Readonly<Record<string, T>> | null | undefined,
  key: string | null | undefined
): T | undefined {
  if (!map || key == null || !Object.hasOwn(map, key)) return undefined;
  return map[key];
}
