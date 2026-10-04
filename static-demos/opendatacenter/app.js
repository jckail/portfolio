// Independent offline fixtures. Never import, request or write atlas records.
export const STORAGE_KEY = "odc.synthetic-demo.saved.v1";
export const STATUS_LABELS = Object.freeze({ concept: "Concept", operating: "Operating (fictional)", review: "Under review" });
export const CATEGORY_LABELS = Object.freeze({ campus: "Campus", edge: "Edge site", lab: "Research lab" });
export const SITES = Object.freeze([
  { id: "demo-lantern", name: "Lantern Grove", region: "Fictional Amber Reach", category: "campus", status: "concept", description: "A fictional campus concept for exploring how incomplete records are presented." },
  { id: "demo-paper", name: "Paper Harbor", region: "Fictional Paper Coast", category: "edge", status: "operating", description: "An invented edge-site example. Its status is a demo label, not a claim of operation." },
  { id: "demo-morrow", name: "Morrow Workshop", region: "Fictional Morrow Vale", category: "lab", status: "review", description: "An imaginary research setting with no measured capacity or documented equipment." },
  { id: "demo-thread", name: "Silver Thread", region: "Fictional Amber Reach", category: "edge", status: "concept", description: "A second edge-site concept to try local search and shortlist filters." },
  { id: "demo-orchard", name: "Quiet Orchard", region: "Fictional Morrow Vale", category: "campus", status: "review", description: "A fictional campus record that keeps unknown measurements visible." },
  { id: "demo-fold", name: "Fold Studio", region: "Fictional Paper Coast", category: "lab", status: "operating", description: "An invented lab example, included only to illustrate interface behavior." },
].map(site => Object.freeze({ ...site, capacity_mw: null, latitude: null, longitude: null })));

export function filterSites(sites, { query = "", status = "all", category = "all", savedOnly = false, savedIds = [] } = {}) {
  const needle = String(query).trim().toLowerCase();
  const saved = new Set(savedIds);
  return sites.filter(site =>
    (!needle || [site.name, site.region, site.description, CATEGORY_LABELS[site.category], STATUS_LABELS[site.status]].join(" ").toLowerCase().includes(needle)) &&
    (status === "all" || site.status === status) &&
    (category === "all" || site.category === category) &&
    (!savedOnly || saved.has(site.id))
  );
}

export function formatCapacity(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? `${value} MW` : "Unknown";
}

export function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function cleanSaved(ids, allowedIds = SITES.map(site => site.id)) {
  if (!Array.isArray(ids)) return [];
  const allowed = new Set(allowedIds);
  return [...new Set(ids.filter(id => typeof id === "string" && allowed.has(id)))].slice(0, allowed.size);
}

export function toggleSaved(ids, id, allowedIds = SITES.map(site => site.id)) {
  const current = cleanSaved(ids, allowedIds);
  if (!allowedIds.includes(id)) return current;
  return current.includes(id) ? current.filter(value => value !== id) : [...current, id];
}

export function readSaved(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { ids: cleanSaved(raw === null ? [] : JSON.parse(raw)), persistent: true };
  } catch {
    return { ids: [], persistent: false };
  }
}

export function writeSaved(storage, ids) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(cleanSaved(ids)));
    return true;
  } catch {
    return false;
  }
}

export function siteCardMarkup(site, saved) {
  const id = escapeText(site.id);
  return `<li class="record"><div class="record-top"><span class="category">${escapeText(CATEGORY_LABELS[site.category] || "Example")}</span><span class="status">${escapeText(STATUS_LABELS[site.status] || "Unknown")}</span></div>
    <h3>${escapeText(site.name)}</h3><p class="region">${escapeText(site.region)}</p><p class="record-description">${escapeText(site.description)}</p>
    <dl class="record-facts"><div><dt>Capacity</dt><dd>${escapeText(formatCapacity(site.capacity_mw))}</dd></div><div><dt>Coordinates</dt><dd>Unknown</dd></div></dl>
    <div class="record-actions"><button id="evidence-${id}" type="button" class="evidence-button" data-action="evidence" data-id="${id}" aria-label="Inspect fictional record ${escapeText(site.name)}">Inspect record</button><button id="save-${id}" type="button" class="save-button" data-action="save" data-id="${id}" aria-pressed="${saved ? "true" : "false"}" aria-label="${saved ? "Unsave" : "Save"} fictional example ${escapeText(site.name)}">${saved ? "Saved" : "Save example"}</button></div></li>`;
}

export function startDemo(document, window) {
  const byId = id => document.getElementById(id);
  const dialog = byId("evidence-dialog");
  let storage;
  try { storage = window.localStorage; } catch { storage = undefined; }
  let { ids: savedIds, persistent } = readSaved(storage);
  let savedOnly = false;
  let activeSite = null;
  let openerId = null;

  function updateDialogSave() {
    if (!activeSite) return;
    const saved = savedIds.includes(activeSite.id);
    byId("dialog-save").textContent = saved ? "Unsave example" : "Save example";
    byId("dialog-save").setAttribute("aria-pressed", String(saved));
    byId("dialog-save-state").textContent = saved ? "In your demo shortlist." : "Not in your demo shortlist.";
  }

  function render() {
    const records = filterSites(SITES, { query: byId("query").value, status: byId("status").value, category: byId("category").value, savedOnly, savedIds });
    byId("records").innerHTML = records.map(site => siteCardMarkup(site, savedIds.includes(site.id))).join("");
    byId("results-title").textContent = savedOnly ? "Your demo shortlist" : "Fictional site directory";
    byId("result-count").textContent = `${records.length} of ${savedOnly ? savedIds.length : SITES.length} fictional examples shown`;
    byId("saved-count").textContent = String(savedIds.length);
    byId("explore-view").setAttribute("aria-pressed", String(!savedOnly));
    byId("saved-view").setAttribute("aria-pressed", String(savedOnly));
    byId("storage-note").textContent = persistent ? "Saved examples stay in this browser, separate from the atlas." : "Browser storage unavailable or unreadable. Saved examples last only for this page visit.";
    byId("empty").hidden = records.length !== 0;
    const noneSaved = savedOnly && savedIds.length === 0;
    byId("empty-title").textContent = noneSaved ? "Your demo shortlist is empty" : "No examples match";
    byId("empty-description").textContent = noneSaved ? "Browse the fictional directory and save an example to try a shortlist." : "Try another search or reset the filters.";
    byId("empty-reset").textContent = noneSaved ? "Browse all examples" : "Reset filters";
    updateDialogSave();
  }

  function save(id) {
    savedIds = toggleSaved(savedIds, id);
    persistent = writeSaved(storage, savedIds);
    render();
  }

  function inspect(site, trigger) {
    activeSite = site;
    openerId = trigger.id;
    byId("dialog-title").textContent = site.name;
    byId("dialog-description").textContent = site.description;
    const facts = [
      ["Region label", site.region], ["Category", CATEGORY_LABELS[site.category]],
      ["Fictional status", STATUS_LABELS[site.status]], ["Capacity", formatCapacity(site.capacity_mw)],
      ["Coordinates", "Unknown — no real location"], ["Provenance", "Authored fictional demo fixture"],
    ];
    byId("dialog-facts").replaceChildren(...facts.map(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      wrapper.append(term, detail);
      return wrapper;
    }));
    updateDialogSave();
    dialog.showModal();
    byId("dialog-title").focus();
  }

  byId("records").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || !byId("records").contains(button)) return;
    const site = SITES.find(item => item.id === button.dataset.id);
    if (!site) return;
    if (button.dataset.action === "evidence") inspect(site, button);
    if (button.dataset.action === "save") {
      const focusId = button.id;
      save(site.id);
      (byId(focusId) || byId("saved-view")).focus();
    }
  });
  byId("dialog-save").addEventListener("click", () => { if (activeSite) save(activeSite.id); });
  dialog.addEventListener("close", () => { (byId(openerId) || byId("saved-view")).focus(); activeSite = null; });
  byId("filters").addEventListener("submit", event => event.preventDefault());
  byId("query").addEventListener("input", render);
  for (const id of ["status", "category"]) byId(id).addEventListener("change", render);
  function reset() { byId("query").value = ""; byId("status").value = "all"; byId("category").value = "all"; render(); }
  byId("reset").addEventListener("click", () => { reset(); byId("query").focus(); });
  byId("empty-reset").addEventListener("click", () => { if (savedOnly && savedIds.length === 0) savedOnly = false; reset(); byId("query").focus(); });
  byId("explore-view").addEventListener("click", () => { savedOnly = false; render(); });
  byId("saved-view").addEventListener("click", () => { savedOnly = true; render(); });
  render();
}

// Node imports are inert: helpers do not access storage, network or DOM at load.
if (typeof document !== "undefined" && typeof window !== "undefined" && document.getElementById("records")) startDemo(document, window);
