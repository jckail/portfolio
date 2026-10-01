/**
 * Module-level stack of open modal dialogs.
 *
 * Every dialog's keyboard handlers listen on `document`, so without a shared
 * notion of "top" a single Escape closed whichever dialog registered first
 * (the one underneath), and two focus traps fought over Tab. Only the top
 * entry handles keys; the ones below are made `inert` so screen readers and
 * pointer/keyboard users only reach the dialog that is actually in front.
 */
interface DialogEntry {
  id: symbol;
  node: HTMLElement;
}

const stack: DialogEntry[] = [];

function syncInert() {
  stack.forEach((entry, index) => {
    entry.node.toggleAttribute('inert', index !== stack.length - 1);
  });
}

export function pushDialog(id: symbol, node: HTMLElement): void {
  removeDialog(id);
  stack.push({ id, node });
  syncInert();
}

export function removeDialog(id: symbol): void {
  const index = stack.findIndex(entry => entry.id === id);
  if (index === -1) return;
  const [entry] = stack.splice(index, 1);
  entry.node.removeAttribute('inert');
  syncInert();
}

export function isTopDialog(id: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1].id === id;
}

export function openDialogCount(): number {
  return stack.length;
}
