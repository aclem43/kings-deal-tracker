"use strict";

const PAGE = 60;
const RECENT_DAYS = 14;
const DAY = 86400000;
const $ = (id) => document.getElementById(id);
const money = (v) => "$" + v.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => Math.round(v * 100) + "%";
const today = new Date(new Date().toISOString().slice(0, 10));
const daysAgo = (iso) => Math.round((today - new Date(iso)) / DAY);
const shortName = (n) => n.split("|")[0].trim();

const data = { products: [], bundles: [] };
const bySku = new Map();
let view = "products";
let has = "";        // bundles view: only bundles containing this SKU
let filtered = [];
let shown = 0;
const known = new Set();   // every SKU in the data, products and bundles
const WATCH_KEY = "kings-watch";
let watched = loadWatch();

const FIELDS = ["q", "dept", "sub", "sort", "instock", "viabundle", "antideal", "atl", "dropped", "watchonly"];
const DEFAULTS = { sort: "deal", instock: true };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function enrich(p) {
  p.recentDrop = p.pv != null && p.p < p.pv && p.pd && daysAgo(p.pd) <= RECENT_DAYS;
  p.dropPct = p.pv != null && p.p < p.pv ? (p.pv - p.p) / p.pv : 0;
  p.belowTypical = p.ty ? (p.ty - p.p) / p.ty : null;
  p.atLow = p.hi > p.lo && p.p <= p.lo;
  p.hay = (p.n + " " + p.s + " " + p.c.join(" ")).toLowerCase();
  return p;
}

/* ---------- watch list (kept in this browser only) ---------- */

function loadWatch() {
  try {
    return new Set(JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"));
  } catch (e) {
    return new Set();
  }
}

function saveWatch() {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify([...watched]));
  } catch (e) {
    // Storage unavailable: the list still works until the page is closed.
  }
}

function watchCount() {
  return [...watched].filter((s) => known.has(s)).length;
}

function paintWatch(btn) {
  const on = watched.has(btn.dataset.sku);
  btn.classList.toggle("on", on);
  btn.setAttribute("aria-pressed", String(on));
  btn.textContent = on ? "★" : "☆";
  btn.title = on ? "Remove from watch list" : "Add to watch list";
  btn.setAttribute("aria-label", btn.title);
}

function syncWatchUI() {
  const n = watchCount();
  $("watchcount").textContent = n ? `(${n})` : "";
}

function toggleWatch(sku) {
  if (watched.has(sku)) watched.delete(sku);
  else watched.add(sku);
  saveWatch();
  document.querySelectorAll(".watch").forEach((b) => { if (b.dataset.sku === sku) paintWatch(b); });
  syncWatchUI();
  if ($("watchonly").checked && !watched.has(sku)) dropCard(sku);
}

// Remove an un-starred card in place, keeping the pages already loaded and the scroll position.
function dropCard(sku) {
  const before = filtered.length;
  filtered = filtered.filter((p) => p.s !== sku);
  if (filtered.length === before) return;
  const card = $("grid").querySelector(`.watch[data-sku="${CSS.escape(sku)}"]`)?.closest(".card");
  if (card) { card.remove(); shown--; }
  showCount();
  $("more").hidden = shown >= filtered.length;
}

// Another tab changed the watch list: pick up its version so we don't overwrite it.
function reloadWatch() {
  watched = loadWatch();
  document.querySelectorAll(".watch").forEach(paintWatch);
  syncWatchUI();
  if ($("watchonly").checked) apply();
}

/* ---------- URL state ---------- */

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  view = h.get("view") === "bundles" ? "bundles" : "products";
  has = h.get("has") || "";
  for (const id of FIELDS) {
    const el = $(id);
    if (el.type === "checkbox") el.checked = h.has(id) ? h.get(id) === "1" : !!DEFAULTS[id];
    else el.value = h.has(id) ? h.get(id) : (DEFAULTS[id] || "");
  }
  if (!$("sort").value) $("sort").value = "deal";
}

function writeHash() {
  const h = new URLSearchParams();
  if (view !== "products") h.set("view", view);
  if (has && view === "bundles") h.set("has", has);
  for (const id of FIELDS) {
    const el = $(id);
    const v = el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value;
    const d = el.type === "checkbox" ? (DEFAULTS[id] ? "1" : "0") : (DEFAULTS[id] || "");
    if (v !== d) h.set(id, v);
  }
  const s = h.toString();
  history.replaceState(null, "", s ? "#" + s : location.pathname + location.search);
}

/* ---------- filters ---------- */

function fillSelect(sel, values, keep) {
  sel.replaceChildren(sel.options[0], ...values.map((v) => new Option(v, v)));
  sel.value = values.includes(keep) ? keep : "";
}

function refreshDepts(keepDept, keepSub) {
  const list = data[view];
  const depts = new Set();
  list.forEach((p) => p.d.forEach((d) => depts.add(d)));
  fillSelect($("dept"), [...depts].sort(), keepDept);
  const subs = new Set();
  for (const p of list) if (!$("dept").value || p.d.includes($("dept").value)) p.c.forEach((c) => subs.add(c));
  fillSelect($("sub"), [...subs].sort(), keepSub);
}

function syncViewUI() {
  for (const b of document.querySelectorAll(".tabs button")) b.setAttribute("aria-pressed", String(b.dataset.view === view));
  for (const el of document.querySelectorAll("[data-for]")) el.hidden = el.dataset.for !== view;
  const chip = $("haschip");
  const base = has && bySku.get(has);
  chip.hidden = !(view === "bundles" && base);
  if (!chip.hidden) {
    chip.innerHTML = `Bundles containing <strong>${esc(shortName(base.n))}</strong> <button type="button" aria-label="Clear">✕</button>`;
    chip.querySelector("button").onclick = () => { has = ""; syncViewUI(); apply(); };
  }
}

const dealScore = (p) =>
  view === "products"
    ? (p.belowTypical ?? 0) * 10 + p.sv + p.dropPct  // usual-price comparison dominates once it exists
    : (p.belowTypical ?? 0) * 10 + p.sv;

const sorters = {
  deal: (a, b) => dealScore(b) - dealScore(a) || a.p - b.p,
  save: (a, b) => b.sv - a.sv || a.p - b.p,
  drop: (a, b) => b.dropPct - a.dropPct || a.p - b.p,
  "price-asc": (a, b) => a.p - b.p,
  "price-desc": (a, b) => b.p - a.p,
  new: (a, b) => (b.f || "").localeCompare(a.f || "") || a.n.localeCompare(b.n),
  name: (a, b) => a.n.localeCompare(b.n),
};

function apply() {
  const words = $("q").value.toLowerCase().split(/\s+/).filter(Boolean);
  const dept = $("dept").value, sub = $("sub").value;
  const f = Object.fromEntries(["instock", "viabundle", "antideal", "atl", "dropped", "watchonly"].map((id) => [id, $(id).checked]));
  const list = data[view];

  filtered = list.filter((p) =>
    (!f.watchonly || watched.has(p.s)) &&
    (!f.instock || p.st) &&
    (!f.atl || p.atLow) &&
    (!f.dropped || p.recentDrop) &&
    (view !== "products" || !f.viabundle || p.via) &&
    (view !== "bundles" || !f.antideal || p.sv < -0.005) &&
    (view !== "bundles" || !has || p.k.includes(has)) &&
    (!dept || p.d.includes(dept)) &&
    (!sub || p.c.includes(sub)) &&
    words.every((w) => p.hay.includes(w))
  );
  filtered.sort(sorters[$("sort").value] || sorters.deal);
  showCount();
  $("grid").replaceChildren();
  shown = 0;
  renderMore();
  writeHash();
}

function showCount() {
  const noun = view === "products" ? "products" : "bundles";
  $("count").textContent = `${filtered.length.toLocaleString()} of ${data[view].length.toLocaleString()} ${noun}`;
}

/* ---------- rendering ---------- */

function sparkline(p) {
  if (p.h.length === 1 && daysAgo(p.h[0][0]) < 1) return ""; // nothing to draw on day one
  const pts = p.h.map(([d, v]) => [new Date(d).getTime(), v]);
  const end = Math.max(today.getTime(), pts[pts.length - 1][0]);
  const start = Math.min(pts[0][0], end - DAY);
  const lo = Math.min(...pts.map((x) => x[1])), hi = Math.max(...pts.map((x) => x[1]));
  const W = 200, H = 34, pad = 3;
  const x = (t) => ((t - start) / (end - start)) * W;
  const y = (v) => (hi === lo ? H / 2 : pad + (1 - (v - lo) / (hi - lo)) * (H - 2 * pad));
  let d = `M${x(pts[0][0]).toFixed(1)},${y(pts[0][1]).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += `H${x(pts[i][0]).toFixed(1)}V${y(pts[i][1]).toFixed(1)}`;
  d += `H${W}`;
  const label = p.h.map(([dd, v]) => `${dd}: ${money(v)}`).join("\n");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Price history">` +
    `<title>${esc(label)}</title><path d="${d}" vector-effect="non-scaling-stroke"/>` +
    `<circle cx="${W - 2}" cy="${y(p.p).toFixed(1)}" r="2.5"/></svg>`;
}

function historyBadges(p) {
  const out = [];
  if (p.belowTypical != null && p.belowTypical >= 0.02) out.push(`<span class="badge good">${pct(p.belowTypical)} below usual</span>`);
  if (p.atLow) out.push(`<span class="badge good">All-time low</span>`);
  if (p.recentDrop && p.belowTypical == null) out.push(`<span class="badge good">Down ${pct(p.dropPct)}</span>`);
  if (p.belowTypical != null && p.belowTypical <= -0.02) out.push(`<span class="badge warn">${pct(-p.belowTypical)} above usual</span>`);
  if (!p.st) out.push(`<span class="badge warn">Out of stock</span>`);
  return out;
}

function stats(p) {
  return [
    p.hi > p.lo ? `Low ${money(p.lo)} · High ${money(p.hi)}` : "No price change seen yet",
    p.ty ? `Usual ${money(p.ty)}` : "",
  ].filter(Boolean).join(" · ");
}

function shell(p, inner) {
  const img = p.i ? `<img src="${esc(p.i)}?width=320&height=240&fit=bounds&quality=75" alt="" loading="lazy">` : "";
  const on = watched.has(p.s);
  const title = on ? "Remove from watch list" : "Add to watch list";
  const watchBtn = `<button type="button" class="watch${on ? " on" : ""}" data-sku="${esc(p.s)}" aria-pressed="${on}" ` +
    `title="${title}" aria-label="${title}">${on ? "★" : "☆"}</button>`;
  return `<li class="card">
    ${watchBtn}
    <a class="img" href="${esc(p.u)}" target="_blank" rel="noopener" tabindex="-1">${img}</a>
    <div class="body">
      <a class="name" href="${esc(p.u)}" target="_blank" rel="noopener">${esc(p.n)}</a>
      ${inner}
      ${sparkline(p)}
      <div class="stats">${stats(p)}</div>
    </div>
  </li>`;
}

function extrasText(x) {
  return x.length ? "+ " + x.map(esc).join(", ") : "";
}

function productCard(p) {
  const badges = historyBadges(p);
  if (p.via) {
    badges.unshift(p.sv >= 0.01
      ? `<span class="badge good">${pct(p.sv)} less than alone</span>`
      : `<span class="badge good">Extras free</span>`);
  }
  const was = p.recentDrop ? `<span class="was">${money(p.pv)}</span>` : "";
  const how = p.via
    ? `<div class="how">Cheapest in a bundle · alone ${money(p.sp)}${p.sst ? "" : " (out of stock)"}</div>`
    : p.nb ? `<div class="how">Cheapest on its own</div>` : "";

  let opts = "";
  if (p.b.length) {
    const rows = p.b.map((o) => {
      const cls = ["opt"];
      if (o.s === p.via) cls.push("best");
      if (!o.st) cls.push("oos");
      const qty = o.q > 1 ? `${o.q}× this ` : "";
      return `<li class="${cls.join(" ")}"><a href="${esc(o.u)}" target="_blank" rel="noopener">
        <span class="op">${money(o.p)}</span><span class="ox">${qty}${extrasText(o.x)}${o.st ? "" : " · out of stock"}</span></a></li>`;
    }).join("");
    const more = p.nb > p.b.length
      ? `<a class="allb" href="#view=bundles&has=${encodeURIComponent(p.s)}&sort=price-asc">All ${p.nb} bundles with this →</a>` : "";
    opts = `<details class="opts"${p.via ? " open" : ""}><summary>In ${p.nb} bundle${p.nb === 1 ? "" : "s"}</summary><ul>${rows}</ul>${more}</details>`;
  }

  return shell(p, `
    <div class="price"><span class="now">${money(p.p)}</span>${was}</div>
    ${how}
    <div class="badges">${badges.join("")}</div>
    ${opts}`);
}

function bundleCard(p) {
  const badges = historyBadges(p);
  let vs = "";
  if (p.ps) {
    if (p.sv < -0.005) {
      badges.unshift(`<span class="badge bad">${money(p.p - p.ps)} more than parts</span>`);
      vs = `<div class="how">Parts separately ${money(p.ps)}</div>`;
    } else if (p.sv > 0.005) {
      badges.unshift(`<span class="badge good">${pct(p.sv)} off the parts</span>`);
      vs = `<div class="how">Parts separately ${money(p.ps)}</div>`;
    }
  }
  return shell(p, `
    <div class="price"><span class="now">${money(p.p)}</span>${p.recentDrop ? `<span class="was">${money(p.pv)}</span>` : ""}</div>
    ${vs}
    <div class="badges">${badges.join("")}</div>
    <div class="contains">${esc(p.x.join(" + "))}</div>`);
}

function renderMore() {
  const slice = filtered.slice(shown, shown + PAGE);
  $("grid").insertAdjacentHTML("beforeend", slice.map(view === "products" ? productCard : bundleCard).join(""));
  shown += slice.length;
  $("more").hidden = shown >= filtered.length;
}

/* ---------- start ---------- */

function loadFromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  readHash();
  refreshDepts(h.get("dept") || "", h.get("sub") || "");
  syncViewUI();
  apply();
}

async function init() {
  let payload;
  try {
    const res = await fetch("data.json", { cache: "no-cache" });
    payload = await res.json();
  } catch (e) {
    $("status").textContent = "Could not load price data.";
    return;
  }
  data.products = payload.products.map(enrich);
  data.bundles = payload.bundles.map(enrich);
  data.products.forEach((p) => bySku.set(p.s, p));
  [...data.products, ...data.bundles].forEach((p) => known.add(p.s));

  const days = daysAgo(payload.trackedSince) + 1;
  const updated = new Date(payload.generated).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
  const cheaper = data.products.filter((p) => p.via).length;
  let status = `Updated ${esc(updated)} · tracking since ${esc(payload.trackedSince)} (${days} day${days === 1 ? "" : "s"}) · ` +
    `${cheaper} of ${data.products.length} products are cheapest inside a bundle`;
  if (days < payload.minDaysForTypical) {
    status += `<br><span class="note">History is still building. A "usual price" appears after ${payload.minDaysForTypical} days of data; until then "best deal" ranks by bundle savings and recent drops.</span>`;
  }
  $("status").innerHTML = status;

  let t;
  $("q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(apply, 150); });
  $("dept").addEventListener("change", () => { refreshDepts($("dept").value, ""); apply(); });
  for (const id of ["sub", "sort", "instock", "viabundle", "antideal", "atl", "dropped", "watchonly"]) $(id).addEventListener("change", apply);
  $("more").addEventListener("click", renderMore);
  $("grid").addEventListener("click", (e) => {
    const b = e.target.closest(".watch");
    if (b) toggleWatch(b.dataset.sku);
  });
  window.addEventListener("storage", (e) => { if (e.key === WATCH_KEY || e.key === null) reloadWatch(); });
  for (const b of document.querySelectorAll(".tabs button")) {
    b.addEventListener("click", () => {
      if (view === b.dataset.view) return;
      view = b.dataset.view;
      has = "";
      refreshDepts("", "");
      syncViewUI();
      apply();
    });
  }
  window.addEventListener("hashchange", () => { loadFromHash(); window.scrollTo(0, 0); });
  syncWatchUI();
  loadFromHash();
}

init();
