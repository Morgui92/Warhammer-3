// Creador de ejércitos: señor + héroes + unidades reclutables en campaña por la facción (datos en ejercitos.js,
// cartas de unidad en unidades_img.js). Usa D, S, $, esc, show, facCrest, agentCrest y AGENT_ES de index.html.
"use strict";
const EJ = window.WH3EJ || {u: [], f: {}, src: [], sin: {}, dk: []};
const UNIMG = window.WH3UNIMG || {img: [], u: {}};
const ukIdx = Object.fromEntries(EJ.u.map((u, i) => [u.k, i]));
const CASTE_ES = {melee_infantry: "Infantería cuerpo a cuerpo", missile_infantry: "Infantería a distancia", monstrous_infantry: "Infantería monstruosa",
  melee_cavalry: "Caballería cuerpo a cuerpo", missile_cavalry: "Caballería a distancia", monstrous_cavalry: "Caballería monstruosa", chariot: "Carros",
  war_beast: "Bestias de guerra", monster: "Monstruos", warmachine: "Máquinas de guerra", generic: "Otras", lord: "Señor", hero: "Héroe"};
const CASTE_ORDER = Object.keys(CASTE_ES);
const RES_ES = {fisico: "Física", proyectiles: "Proyectiles", magia: "Mágica", fuego: "Fuego", salvaguarda: "Salvaguarda"};
const ARMY_MAX = 20, GRID_W = 17, GRID_H = 6;  // casillas con la forma de la carta de unidad; ancho impar para que haya columna central
const LS_ARMY = "wh3-army-builds";

// ---------- imágenes ----------
function unitImgSrc(key) { const i = UNIMG.u[key]; return i === undefined ? null : UNIMG.img[i]; }
function unitCard(key, cls) {
  const src = unitImgSrc(key), u = EJ.u[ukIdx[key]];
  return src ? `<img class="ucard ${cls || ""}" src="${src}" alt="" loading="lazy">` : `<span class="ucard none ${cls || ""}">${esc(u ? initials(u.n) : "?")}</span>`;
}
// miniatura para una entrada de WH3DATA.units (árbol de habilidades): su carta, o la de una unidad de la misma raza y nombre
let thumbByName = null;
function unitThumb(ui) {
  const key = EJ.dk[ui]; if (!key) return "";
  let src = unitImgSrc(key);
  if (!src) {
    if (!thumbByName) {
      thumbByName = new Map();
      EJ.dk.forEach((k, i) => { const s = unitImgSrc(k), u = D.units[i]; if (s && u) for (const r of u[1]) if (!thumbByName.has(r + "|" + u[0])) thumbByName.set(r + "|" + u[0], s); });
    }
    const u = D.units[ui]; if (u) for (const r of u[1]) { src = thumbByName.get(r + "|" + u[0]); if (src) break; }
  }
  return src ? `<img class="uthumb" src="${src}" alt="" loading="lazy">` : "";
}
window.unitThumb = unitThumb;

// ---------- estado ----------
// builds: build de habilidades de cada personaje, por id («L» = señor): {lv, t} como en el árbol de esta facción
const A = {fac: null, lord: null, items: [], pos: {}, sel: null, tab: "lords", caste: "", q: "", pick: null, name: "", nid: 1, builds: {}};
const newId = () => "i" + (A.nid++);
function facUnits(fk) { return (EJ.f[fk] || []).map(([i, ...s]) => ({u: EJ.u[i], src: s.map(x => EJ.src[x])})); }
// orden de las listas: nivel y nombre, con cada Regimiento de Renombre justo detrás de su unidad base (u.b)
const byTierName = (a, b) => a.u.t - b.u.t || a.u.n.localeCompare(b.u.n);
function withRor(xs) {
  const here = new Set(xs.map(x => x.u.k)), kids = new Map();
  for (const x of xs) if (x.u.b && here.has(x.u.b) && x.u.b !== x.u.k) { if (!kids.has(x.u.b)) kids.set(x.u.b, []); kids.get(x.u.b).push(x); }
  const out = [];
  for (const x of xs) if (!(x.u.b && here.has(x.u.b) && x.u.b !== x.u.k)) out.push(x, ...(kids.get(x.u.k) || []));
  return out;
}
function charStats(agentKey) { const a = D.agents[agentKey]; return a && a.u in ukIdx ? EJ.u[ukIdx[a.u]] : null; }
function itemStats(it) { return it.t === "h" ? charStats(it.k) : EJ.u[ukIdx[it.k]]; }
function itemName(it) { return it.t === "h" ? D.agents[it.k].n : (EJ.u[ukIdx[it.k]] || {n: it.k}).n; }
const used = () => (A.lord ? 1 : 0) + A.items.length;
const free = () => ARMY_MAX - 1 - A.items.length;  // el hueco del señor está siempre reservado
function countOf(key) { return A.items.filter(it => it.k === key).length; }
// límites del juego: personajes legendarios una sola vez; Regimientos de Renombre uno; unidades con límite en campaña (main_units.campaign_cap)
// tope que el juego da por efectos a unidades sin campaign_cap (EJ.cap: p. ej. Lealtad con los caudillos de Tamurkhan)
const capOf = (u, fk = D.factions[A.fac].k) => u.cap > 0 ? u.cap : ((EJ.cap || {})[fk] || {})[u.k]?.[0] || 0;
const unitMax = u => u.rr ? 1 : capOf(u) > 0 ? capOf(u) : Infinity;
// texto del límite para la ficha
function capText(u, fk) {
  const c = ((EJ.cap || {})[fk] || {})[u.k];
  if (u.cap > 0) return `Límite en campaña: ${u.cap}`;
  if (c) return `Límite en campaña: ${c[0]} (${c[1].map(([v, t, t2]) => (t2 ? `${t}: ${t2}` : t) + (c[1].length > 1 ? ` +${v}` : "")).join(", ")})`;
  if (((EJ.capv || {})[fk] || []).includes(u.k)) return "Límite en campaña: según edificios (sin máximo fijo)";
  return "";
}
function canAddUnit(u) { return free() > 0 && countOf(u.k) < unitMax(u); }
const charIn = k => A.lord === k || A.items.some(it => it.k === k);
function canAddHero(k) { return free() > 0 && !(D.agents[k].leg && charIn(k)); }
// por qué no se puede añadir (texto para el aviso y el botón)
function whyNot(add) {
  if (add.t === "L") return "";
  if (add.t === "h" && D.agents[add.k].leg && charIn(add.k)) return `${D.agents[add.k].n} es un personaje legendario: solo puede haber uno.`;
  const u = add.t === "u" && EJ.u[ukIdx[add.k]];
  if (u && countOf(u.k) >= unitMax(u)) return u.rr ? `${u.n} es un Regimiento de Renombre: solo puede haber uno.` : `El juego limita ${u.n} a ${capOf(u)} en campaña.`;
  return free() > 0 ? "" : "No cabe: el ejército ya tiene sus 20 huecos ocupados.";
}
// personajes elegibles: los del árbol de habilidades más los que el juego tiene sin árbol (infoL / infoH)
// y sus formas evolucionadas (factions[i].evo: Heraldo → Gran Demonio Exaltado, Senda de la Gloria...), cada una justo detrás de su base
function withEvo(f, ks) {
  const out = [], seen = new Set(), ev = f.evo || {};
  const add = k => { if (seen.has(k) || !D.agents[k]) return; seen.add(k); out.push(k); for (const e of ev[k] || []) add(e.to); };
  ks.forEach(add);
  return out;
}
const facLords = f => withEvo(f, [...f.lords, ...(f.infoL || [])]), facHeroes = f => withEvo(f, [...f.heroes, ...(f.infoH || [])]);
// de qué forma base sale una evolución y con qué requisito (para la etiqueta)
function evoFrom(k) {
  const f = D.factions[$("#v-army") && !$("#v-army").hidden ? A.fac : S.fac] || {};
  const from = [];
  for (const [b, l] of Object.entries(f.evo || {})) for (const e of l) if (e.to === k) from.push({b, e});
  return from.length ? from : null;
}
const charTags = (a, k) => { const ev = k && evoFrom(k);
  return (a.leg ? `<span class="tag leg">Legendario</span> ` : "") + (a.sa ? `<span class="tag" title="El juego no le da árbol de habilidades">Sin árbol</span> ` : "")
    + (ev ? `<span class="tag" title="${esc(ev.map(({b, e}) => `${D.agents[b].n} → ${e.n}: ${e.d}`).join("\n"))}">Evolución</span> ` : ""); };

// ---------- enlace ----------
// e2.<facción>.<señor|_>.<elementos separados por ~ (héroes con prefijo h-)>.<casilla de cada uno en base 36, 2 cifras, -- si no está colocada>
// e1 = lo mismo con la cuadrícula antigua de 16 columnas: se lee pasando cada casilla a la misma fila y columna
// .b<builds> opcional al final: por personaje con build, <posición en base 36 (0 = señor, n = elemento n)>_<puntos>[_<rasgo>], con ~
function armyToken() {
  const items = A.items.map(it => (it.t === "h" ? "h-" : "") + it.k).join("~");
  const ids = ["L", ...A.items.map(it => it.id)];
  const pos = ids.map(id => A.pos[id] === undefined ? "--" : A.pos[id].toString(36).padStart(2, "0")).join("");
  const bs = ids.map((id, j) => { const b = A.builds[id]; return b && (id !== "L" || A.lord) ? `${j.toString(36)}_${b.lv}${b.t >= 0 ? "_" + b.t : ""}` : ""; }).filter(Boolean).join("~");
  return ["e2", D.factions[A.fac].k, A.lord || "_", items || "_", pos.replace(/(--)+$/, "") || "_"].join(".") + (bs ? ".b" + bs : "");
}
function armyFromToken(t) {
  const m = /^e([12])\.([a-z0-9_]+)\.([a-z0-9_]+)\.([a-z0-9_~-]+)\.([0-9a-z-_]+)(?:\.b([0-9a-z_~]+))?$/i.exec(t || ""); if (!m) return false;
  const old = m[1] === "1"; m.splice(1, 1);  // m[1] facción, m[2] señor, m[3] elementos, m[4] casillas, m[5] builds
  const fi = facIdx[m[1]]; if (fi === undefined) return false;
  const f = D.factions[fi], ok = new Set((EJ.f[f.k] || []).map(([i]) => EJ.u[i].k));
  A.fac = fi; A.lord = facLords(f).includes(m[2]) ? m[2] : null; A.items = []; A.pos = {}; A.sel = null; A.pick = null; A.builds = {};
  const skipped = [], over = [];
  const raw = m[3] === "_" ? [] : m[3].split("~");
  const keep = [];  // índice en raw de cada elemento aceptado (para leer su casilla)
  raw.forEach((x, j) => {
    const h = x.startsWith("h-"), k = h ? x.slice(2) : x;
    if (A.items.length >= ARMY_MAX - 1) return;
    if (h ? !facHeroes(f).includes(k) : !ok.has(k)) { skipped.push(k); return; }
    if (h ? !canAddHero(k) : !canAddUnit(EJ.u[ukIdx[k]])) { over.push(k); return; }
    A.items.push({t: h ? "h" : "u", k, id: newId()}); keep.push(j + 1);
  });
  const p = m[4] === "_" ? "" : m[4], cell = j => { const s = p.substr(j * 2, 2); if (s.length !== 2 || s === "--") return undefined;
    const c = parseInt(s, 36); return old ? Math.floor(c / 16) * GRID_W + c % 16 : c; };
  const taken = new Set();
  const put = (id, c) => { if (c !== undefined && c < GRID_W * GRID_H && !taken.has(c)) { A.pos[id] = c; taken.add(c); } };
  if (A.lord) put("L", cell(0));
  A.items.forEach((it, x) => put(it.id, cell(keep[x])));
  for (const e of (m[5] || "").split("~")) {
    const [p, lv, tr] = e.split("_"); if (!p || !lv) continue;
    const j = parseInt(p, 36), id = j === 0 ? (A.lord ? "L" : null) : (A.items[keep.indexOf(j)] || {}).id;
    const it = id && armyEntries().find(x => x.id === id);
    if (it && it.t === "h" && hasTree(it.k)) A.builds[id] = {lv, t: tr != null ? +tr : -1};
  }
  renderArmyAll(); show("v-army");
  if (skipped.length || over.length) armyMsg([skipped.length ? `No se han cargado ${skipped.length} elementos que esta facción ya no puede reclutar.` : "",
    over.length ? `No se han cargado ${over.length} elementos que superaban el límite del juego (legendarios y renombre: uno; unidades con límite en campaña).` : ""].filter(Boolean).join(" "));
  return true;
}
function armyLink() { return ARTIFACT_URL + "#" + armyToken(); }
function syncHash() { try { history.replaceState(null, "", "#" + armyToken()); } catch (e) {} }
function armyMsg(t) { const m = $("#a-msg"); if (m) m.textContent = t; }

// ---------- guardados ----------
// cada ejército guardado lleva un id; A.saveId es el que está abierto, y «Guardar» lo sobrescribe
const newSaveId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function loadArmies() {
  let l; try { l = JSON.parse(localStorage.getItem(LS_ARMY) || "[]"); } catch (e) { l = []; }
  if (!Array.isArray(l)) l = [];
  if (l.some(b => !b.id)) { l.forEach(b => { if (!b.id) b.id = newSaveId(); }); storeArmies(l); }  // guardados de antes, sin id
  return l;
}
function storeArmies(l) { try { localStorage.setItem(LS_ARMY, JSON.stringify(l)); } catch (e) {} }
function saveArmy(asNew) {
  const t = armyToken(), f = D.factions[A.fac], l = loadArmies();
  const name = (A.name || "").trim() || `${A.lord ? D.agents[A.lord].n : "Sin señor"} · ${used()} unidades`;
  const b = {name, fac: f.n, t, when: new Date().toISOString().slice(0, 10)};
  const cur = l.find(x => x.id === A.saveId);
  if (asNew && cur && name === cur.name) { A.name = `${name} (copia)`; return saveArmy(true); }  // la copia no se llama igual que el original
  const i = asNew ? -1 : l.indexOf(cur);
  if (i >= 0) { l[i] = {...l[i], ...b}; storeArmies(l); armyMsg("Ejército actualizado en este navegador."); }
  else if (asNew) { A.saveId = newSaveId(); storeArmies([{id: A.saveId, ...b}, ...l].slice(0, 60)); const inp = $("#a-name"); if (inp) inp.value = name; armyMsg("Copia guardada como ejército nuevo."); }
  else { A.saveId = newSaveId(); storeArmies([{id: A.saveId, ...b}, ...l].slice(0, 60)); armyMsg("Ejército guardado en este navegador."); }
  renderSaveButtons(); renderSavedArmies();
}
function openSaved(i) {
  const b = loadArmies()[i]; if (!b || !armyFromToken(b.t)) return;
  A.saveId = b.id; A.name = b.name; const inp = $("#a-name"); if (inp) inp.value = b.name;
  renderSaveButtons(); renderSavedArmies();
}
function renderSaveButtons() {
  const cur = loadArmies().find(x => x.id === A.saveId), s = $("#a-save");
  if (s) { s.textContent = cur ? "Guardar cambios" : "Guardar"; s.title = cur ? `Sobrescribe «${cur.name}»` : "Lo añade a «Mis ejércitos»"; }
  const n = $("#a-saveas"); if (n) { n.hidden = !cur; n.title = "Guarda una copia como ejército nuevo; el original no cambia"; }
}
function renderSavedArmies() {
  const l = loadArmies(), el = $("#a-saved"); if (!el) return;
  el.innerHTML = l.length ? l.map((b, i) => `<div${b.id === A.saveId ? ` class="on"` : ""}><button class="l" data-aopen="${i}" title="${esc(b.name)}">${esc(b.name)}</button><span class="muted">${esc(b.fac)} · ${esc(b.when)}</span><button class="x" data-adel="${i}" aria-label="Borrar">✕</button></div>`).join("")
    : `<span class="empty">Aún no has guardado ningún ejército.</span>`;
}

// ---------- abrir ----------
function openArmy(fi) {
  if (A.fac !== fi) { A.fac = fi; A.lord = null; A.items = []; A.pos = {}; A.sel = null; A.pick = null; A.name = ""; A.caste = ""; A.q = ""; A.saveId = null; A.builds = {}; }
  renderArmyAll(); show("v-army");
}
window.openArmy = openArmy; window.armyFromToken = armyFromToken;
// vuelta desde el árbol («Guardar y usar en el ejército»): asigna la build guardada b al personaje id
window.useArmyBuild = (id, b) => {
  const e = armyEntries().find(x => x.id === id), fi = A.fac;
  if (e && b) { const c = buildForFaction(b.t, fi); if (c) A.builds[id] = c; }
  return window.openArmy(fi).then(() => { armyChanged(); const el = $("#a-buffs"); if (el) el.scrollIntoView({behavior: "smooth", block: "start"}); });
};

function renderArmyAll() {
  const f = D.factions[A.fac];
  $("#v-army").innerHTML = `
    <div class="fhead frame ahead">${facCrest(f)}<div style="min-width:0"><h1>Ejército · ${esc(f.n)}</h1>
      <div class="muted">${esc(f.race)} · Solo unidades que esta facción puede reclutar en campaña (Immortal Empires, un jugador)</div></div></div>
    <div class="army">
      <aside class="roster frame">
        <div class="tabs" role="tablist">${[["lords", "Señores"], ["heroes", "Héroes"], ["units", "Unidades"]].map(([k, n]) => `<button role="tab" data-rt="${k}" aria-selected="${A.tab === k}">${n}</button>`).join("")}</div>
        <input id="a-q" type="search" placeholder="Buscar…" value="${esc(A.q)}" autocomplete="off">
        <div id="a-castes" class="chips"></div>
        <div id="a-list" class="rlist"></div>
      </aside>
      <div class="amain">
        <div class="frame abox">
          <div class="atop"><input id="a-name" placeholder="Nombre del ejército" value="${esc(A.name)}" aria-label="Nombre del ejército"><div id="a-totals" class="atotals"></div></div>
          <div id="a-slots" class="slots"></div>
          <div class="btns"><button class="btn" id="a-copy">Copiar enlace</button><button class="btn ghost" id="a-save">Guardar</button><button class="btn ghost" id="a-saveas" hidden>Guardar como…</button><button class="btn ghost" id="a-new">Nuevo ejército</button><button class="btn ghost" id="a-clear">Vaciar</button></div>
          <div id="a-msg" class="copied" aria-live="polite"></div>
          <input class="linkbox" id="a-link" readonly aria-label="Enlace del ejército" hidden>
          <div><div class="lbl">Mis ejércitos (este navegador)</div><div class="saved" id="a-saved"></div></div>
        </div>
        <div class="frame abox"><div class="fhd"><h3>Formación</h3><span class="muted">Arrastra al campo cualquier unidad del ejército, de la reserva de abajo o de la lista de la izquierda (o tócala y luego toca una casilla). Desde la lista de la izquierda también puedes soltarla en el ejército, o hacer doble clic, para añadirla sin colocarla. Arrastra las cartas del ejército entre sí para cambiar su orden. Arrastrarla fuera del campo o hacer clic derecho en ella la devuelve a la reserva; para quitarla del ejército, clic derecho en la reserva, en su carta o la ✕.</span></div>
          <div id="a-tray" class="tray"></div>
          <div class="fieldwrap"><div class="fieldin"><div class="front">▲ Frente · enemigo ▲</div><div id="a-field" class="field" style="grid-template-columns:repeat(${GRID_W},var(--cw))"></div><div class="rear">Retaguardia</div></div></div>
        </div>
        <div class="frame abox" id="a-buffs"></div>
      </div>
      <aside class="ustats frame" id="a-stats"></aside>
    </div>`;
  $("#a-q").oninput = e => { A.q = e.target.value; renderRoster(); };
  $("#a-name").oninput = e => { A.name = e.target.value; };
  $("#v-army").querySelectorAll("[data-rt]").forEach(b => b.onclick = () => { A.tab = b.dataset.rt; A.caste = ""; renderArmyAll(); });
  $("#a-copy").onclick = async () => {
    const link = armyLink(), box = $("#a-link"); box.hidden = false; box.value = link;
    try { await navigator.clipboard.writeText(link); armyMsg("Enlace copiado. Ábrelo para cargar este ejército."); } catch (e) { box.select(); armyMsg("Copia el enlace seleccionado."); }
  };
  $("#a-save").onclick = () => saveArmy();
  $("#a-saveas").onclick = () => saveArmy(true);
  // «Nuevo ejército» empieza uno en blanco que se guardará aparte; «Vaciar» solo quita las unidades del que estás editando
  $("#a-new").onclick = () => { A.lord = null; A.items = []; A.pos = {}; A.sel = null; A.pick = null; A.name = ""; A.saveId = null; A.builds = {}; $("#a-name").value = ""; armyChanged(); renderSaveButtons(); renderSavedArmies(); armyMsg("Ejército nuevo: al guardarlo se añadirá a «Mis ejércitos»."); };
  $("#a-clear").onclick = () => { A.lord = null; A.items = []; A.pos = {}; A.sel = null; A.pick = null; A.builds = {}; armyChanged(); };
  renderRoster(); renderArmy(); renderSaveButtons(); renderSavedArmies();
}
function armyChanged() { renderArmy(); renderRoster(); syncHash(); }
function renderArmy() { renderBuffs(); renderSlots(); renderTotals(); renderField(); renderStats(); }

// ---------- lista para elegir ----------
function renderRoster() {
  const f = D.factions[A.fac], q = A.q.trim().toLowerCase();
  let rows = [];
  if (A.tab === "units") {
    const all = facUnits(f.k);
    const castes = CASTE_ORDER.filter(c => all.some(x => x.u.c === c));
    $("#a-castes").innerHTML = [["", "Todas"], ...castes.map(c => [c, CASTE_ES[c]])].map(([c, n]) => `<button data-c="${c}" aria-pressed="${A.caste === c}">${n}</button>`).join("");
    $("#a-castes").querySelectorAll("[data-c]").forEach(b => b.onclick = () => { A.caste = b.dataset.c; renderRoster(); });
    const list = all.filter(x => (!A.caste || x.u.c === A.caste) && (!q || x.u.n.toLowerCase().includes(q)));
    const groups = CASTE_ORDER.map(c => [c, withRor(list.filter(x => x.u.c === c).sort(byTierName))]).filter(g => g[1].length);
    const sin = EJ.sin[f.sc] || [];
    $("#a-list").innerHTML = groups.map(([c, xs]) => `<h4>${CASTE_ES[c]} <span class="muted">(${xs.length})</span></h4>` + xs.map(({u, src}) => {
      const tags = (u.rr ? `<span class="tag leg">Renombre</span> ` : "") + src.filter(s => s !== "Regimientos de Renombre").map(s => `<span class="tag" title="Formas de conseguirla">${esc(s)}</span> `).join("");
      const can = canAddUnit(u);
      return `<div class="rrow${A.sel && A.sel.k === u.k ? " on" : ""}" data-su="${u.k}">${unitCard(u.k, "mini")}<span class="t"><b>${esc(u.n)}</b><br><span class="muted">${u.cost} oro · ${u.up}/turno</span> ${tags}</span>
        <button class="add" data-au="${u.k}" ${can ? "" : "disabled"} aria-label="Añadir ${esc(u.n)}" title="${esc(can ? "Añadir" : whyNot({t: "u", k: u.k}))}">+</button></div>`;
    }).join("")).join("") + (sin.length ? `<details class="sin"><summary class="muted">Unidades de la raza que no he podido ubicar en ninguna facción (${sin.length})</summary><ul>${sin.map(s => `<li>${esc(s)}</li>`).join("")}</ul></details>` : "")
      || `<p class="empty">Nada coincide.</p>`;
    return;
  }
  $("#a-castes").innerHTML = "";
  const keys = A.tab === "lords" ? facLords(f) : facHeroes(f), confed = new Set(f.confed || []);
  rows = keys.filter(k => !q || D.agents[k].n.toLowerCase().includes(q));
  $("#a-list").innerHTML = rows.map(k => {
    const a = D.agents[k], st = charStats(k), isL = A.tab === "lords", on = isL ? A.lord === k : false;
    const tags = charTags(a, k) + (confed.has(k) ? `<span class="tag conf">Confederación</span> ` : "") + `<span class="tag">${esc(a.rol || AGENT_ES[a.t] || a.t)}</span>`;
    const can = isL ? true : canAddHero(k);
    return `<div class="rrow${on ? " on" : ""}${A.sel && A.sel.k === k ? " on" : ""}" data-sa="${k}">${agentCrest(k)}<span class="t"><b>${esc(a.n)}</b><br>${st ? `<span class="muted">${st.cost} oro · ${st.up}/turno</span> ` : ""}${tags}</span>
      <button class="add" data-${isL ? "al" : "ah"}="${k}" ${can ? "" : "disabled"} aria-label="${isL ? "Elegir" : "Añadir"} ${esc(a.n)}"${can || isL ? "" : ` title="${esc(whyNot({t: "h", k}))}"`}>${isL ? (on ? "✓" : "★") : "+"}</button></div>`;
  }).join("") || `<p class="empty">Esta facción no tiene ${A.tab === "lords" ? "señores" : "héroes"} reclutables.</p>`;
}

// ---------- ejército ----------
function slotHtml(it, id, isLord) {
  const st = itemStats(it), name = itemName(it);
  const img = it.t === "u" ? unitCard(it.k) : agentCrest(it.k, true);
  const nb = it.t === "u" ? BUFFED.get(it.k) || 0 : 0, bb = it.t === "h" && A.builds[id];
  const badge = nb ? `<span class="bf" title="Mejorada por ${nb} ${nb === 1 ? "efecto" : "efectos"} de las builds">▲${nb}</span>` : bb ? `<span class="bf b" title="Build: ${esc(buildName(it.k, bb))}">✦</span>` : "";
  return `<div class="slot${isLord ? " lord" : ""}${nb ? " buffed" : ""}${A.sel && A.sel.id === id ? " on" : ""}" data-sid="${id}" tabindex="0" role="button" aria-label="${esc(name)}">${img}${badge}
    <span class="sn">${esc(name)}</span>${st && st.cost ? (isLord && startLord(it.k) ? `<span class="sc" title="Señor inicial de la facción: no se paga">Inicial</span>` : `<span class="sc">${st.cost}</span>`) : ""}<button class="rm" data-rm="${id}" aria-label="Quitar ${esc(name)}">✕</button></div>`;
}
function renderSlots() {
  const html = [A.lord ? slotHtml({t: "h", k: A.lord}, "L", true) : `<div class="slot empty lord"><span>Elige un señor</span></div>`];
  A.items.forEach(it => html.push(slotHtml(it, it.id)));
  for (let i = used() + (A.lord ? 0 : 1); i < ARMY_MAX; i++) html.push(`<div class="slot empty"></div>`);
  $("#a-slots").innerHTML = html.join("");
}
// el señor legendario con el que empieza la facción (factions[i].ll) no se recluta: no suma coste, sí mantenimiento
const startLord = k => (D.factions[A.fac].ll || []).includes(k);
function renderTotals() {
  const all = [...(A.lord ? [{t: "h", k: A.lord}] : []), ...A.items].map(itemStats).filter(Boolean);
  const free0 = A.lord && startLord(A.lord) ? (charStats(A.lord) || {}).cost || 0 : 0;
  const cost = all.reduce((t, u) => t + (u.cost || 0), 0) - free0, up = all.reduce((t, u) => t + (u.up || 0), 0);
  const warn = [];
  for (const k of new Set(A.items.filter(it => it.t === "u").map(it => it.k))) {
    const u = EJ.u[ukIdx[k]], n = countOf(k);
    if (capOf(u) > 0 && n > capOf(u)) warn.push(`${u.n}: el juego limita esta unidad a ${capOf(u)}`);
  }
  $("#a-totals").innerHTML = `<div><span class="lbl">Huecos</span><b>${used()} / ${ARMY_MAX}</b></div><div><span class="lbl">Reclutamiento</span><b>${cost.toLocaleString("es")}</b>${free0 ? `<small class="muted">Señor inicial: sin coste</small>` : ""}</div><div><span class="lbl">Mantenimiento</span><b>${up.toLocaleString("es")}</b></div>`
    + (warn.length ? `<div class="warn">${warn.map(esc).join("<br>")}</div>` : "");
}

// ---------- ficha ----------
// iconos oficiales del juego (iconos.js); sin icono si no se ha cargado
const SICON = window.WH3ICONS || {};
const ico = k => SICON[k] ? `<img class="sico" src="${SICON[k]}" alt="">` : "";
// efectos al golpear: mágico, fuego y los del arma (veneno, congelación...), con lo que hacen según las tablas del juego
const FX_MAG = "Ataques mágicos: su daño es mágico. La resistencia mágica del enemigo lo reduce y daña por completo a las unidades etéreas, que ignoran casi todo el daño no mágico.";
const FX_FIRE = "Ataques de fuego: su daño es de fuego. La resistencia al fuego del enemigo lo reduce y las unidades vulnerables al fuego reciben más daño.";
const fxChip = (src, n, tip) => `<span class="fxc" tabindex="0" data-tip="${esc(tip)}">${src ? `<img class="sico" src="${src}" alt="">` : ""}${esc(n)}</span>`;
function phTip(p) {
  const L = [`${p.n.replace(/!$/, "")}: el objetivo ${p.tgt === "A" ? "(aliado)" : "golpeado"} sufre durante ${fmtNum(p.dur)} s:`];
  for (const [st, v, how] of p.st) L.push(`• ${statName(st)} ${how === "mult" ? `${v >= 1 ? "+" : "−"}${Math.abs(Math.round((v - 1) * 100))}%` : `${v >= 0 ? "+" : "−"}${fmtNum(Math.abs(v))}`}`);
  if (p.dmg) L.push(`• Pierde ${fmtNum(p.dmg)} de vida cada ${fmtNum(p.freq || 1)} s`);
  if (p.heal) L.push(`• Cura ${fmtNum(p.heal)}`);
  for (const a of p.at || []) L.push(`• ${a}`);
  if (L.length === 1) L.push("• (el juego no detalla más efectos para esta fase)");
  return L.join("\n");
}
const phChip = i => { const p = EJ.ph && EJ.ph[i]; return p ? fxChip(SICON[p.ico], p.n.replace(/!$/, ""), phTip(p)) : ""; };
function statsHtml(u, head) {
  if (!u) return `<p class="empty">Sin estadísticas en la base de datos.</p>`;
  const box = (k, l, v) => `<div><span>${ico(k)}${l}</span><b>${v}</b></div>`;
  const dmg = (bk, b, ak, ap) => `<small class="brk" title="daño base + perforante">${ico(bk)}${b} ${ico(ak)}${ap} AP</small>`;
  const r = u.rng;
  const res = Object.entries(u.res || {}).map(([k, v]) => `${RES_ES[k] || k} ${v}%`).join(", ");
  const fxRow = (l, mag, fire, fx) => {
    const c = [mag && fxChip(SICON.mag, "Mágico", FX_MAG), fire && fxChip(SICON.fire, "Fuego", FX_FIRE), ...(fx || []).map(phChip)].filter(Boolean);
    return c.length ? `<div class="fxrow"><span class="lbl">${l}</span>${c.join("")}</div>` : "";
  };
  const fxh = fxRow("Cuerpo a cuerpo", u.mag, u.fire, u.fx) + (r ? fxRow("A distancia", r.mag, r.fire, u.rfx) : "");
  return `${head}
    <div class="sgrid">${box("men", "Hombres", u.men)}${box("hp", "Vida", (u.hpa ? "~" : "") + u.hp.toLocaleString("es"))}${box("arm", "Armadura", u.arm)}${box("ld", "Liderazgo", u.ld)}
      ${box("sp", u.fly ? "Vel. (vuelo)" : "Velocidad", u.sp)}${box("ma", "Ataque c/c", u.ma)}${box("md", "Defensa c/c", u.md)}${box("ch", "Carga", u.ch)}
      ${box("ws", "Fuerza arma", `${u.ws} ${dmg("wb", u.wb, "ap", u.wap)}`)}${u.bvl ? box("bvl", "Bonus vs grandes", u.bvl) : ""}${u.bvi ? box("bvi", "Bonus vs inf.", u.bvi) : ""}${u.sh ? box("sh", "Escudo", u.sh + "%") : ""}
      ${r ? box("rng", "Alcance", r.r) + box("rs", "Proyectil", `${r.s}${r.np > 1 ? " ×" + r.np : ""} ${dmg("rb", r.b, "rap", r.ap)}`) + box("am", "Munición", r.am) + (r.rl ? box("rl", "Recarga", r.rl + " s") : "") : ""}
      ${u.cost ? box("cost", "Coste", u.cost) : ""}${u.up ? box("up", "Mantenim.", u.up) : ""}${u.turn ? box("turn", "Turnos", u.turn) : ""}</div>
    ${fxh ? `<div class="fx"><div class="lbl">Efectos de sus ataques <small>(pasa el ratón o toca para ver qué hacen)</small></div>${fxh}</div>` : ""}
    ${res ? `<div><span class="lbl">Resistencias</span> ${esc(res)}</div>` : ""}
    ${u.at && u.at.length ? `<div><span class="lbl">Atributos</span> ${esc(u.at.join(", "))}</div>` : ""}
    ${u.ab && u.ab.length ? `<div><span class="lbl">Habilidades</span> ${esc(u.ab.join(", "))}</div>` : ""}
    ${u.lim ? `<div class="muted">${esc(u.lim)}</div>` : ""}
    ${u.dlc && u.dlc.length ? `<div class="muted">DLC: ${esc(u.dlc.join(", "))}</div>` : ""}
    ${u.d ? `<p class="flav">${esc(u.d)}</p>` : ""}`;
}
function renderStats() {
  const el = $("#a-stats"), s = A.sel;
  if (!s) { el.innerHTML = `<h3>Ficha</h3><p class="empty">Toca una unidad, un señor o un héroe para ver sus estadísticas (tamaño Ultra, sin veteranía ni habilidades).</p>`; return; }
  if (s.t === "u") {
    el.innerHTML = unitStatsBlock(s.k, D.factions[A.fac].k);
  } else {
    el.innerHTML = charStatsBlock(s.k);
  }
}

function unitStatsBlock(k, fk) {
  const u = EJ.u[ukIdx[k]], src = (facUnits(fk).find(x => x.u.k === k) || {src: []}).src;
  return statsHtml({...u, lim: capText(u, fk)}, `<div class="shd">${unitCard(k, "big")}<div><h3>${esc(u.n)}</h3><div class="muted">${CASTE_ES[u.c] || u.c}</div>${u.rr ? `<span class="tag leg">Regimiento de Renombre</span>` : ""}${src.filter(x => x !== "Regimientos de Renombre").map(x => `<div class="muted">Se consigue con: ${esc(x)}</div>`).join("")}</div></div>`);
}

function charStatsBlock(k) {
  const a = D.agents[k];
  return statsHtml(charStats(k), `<div class="shd">${agentCrest(k, true)}<div><h3>${esc(a.n)}</h3><div class="muted">${esc(a.rol || AGENT_ES[a.t] || a.t)}</div>${charTags(a, k)}
    ${a.sa ? "" : `<button class="btn ghost" data-tree="${k}" style="margin-top:6px">Ver árbol de habilidades</button>`}</div></div>`);
}

// ---------- pestaña «Unidades» de la facción: todas las que puede reclutar en campaña ----------
let uTabSel = null;
function renderUnitsTab(fi) {
  const f = D.factions[fi], all = facUnits(f.k);
  const isChar = uTabSel && (facLords(f).includes(uTabSel) || facHeroes(f).includes(uTabSel));
  if (!isChar && !all.some(x => x.u.k === uTabSel)) uTabSel = null;
  const groups = CASTE_ORDER.map(c => [c, withRor(all.filter(x => x.u.c === c).sort(byTierName))]).filter(g => g[1].length);
  const sin = EJ.sin[f.sc] || [];
  $("#chars").innerHTML = `<div class="utab"><div>
    <p class="muted note" style="margin:0 0 12px">Señores, héroes y las ${all.length} unidades que ${esc(f.n)} puede reclutar en campaña (un jugador): edificios de la facción, sus reservas especiales y sus Regimientos de Renombre. Toca cualquiera para ver sus estadísticas base.</p>
    ${charGroups(f).map(([title, ks]) => `<div class="grp"><h3>${title} <span class="muted">(${ks.length})</span></h3><div class="grid">${ks.map(k => {
      const a = D.agents[k];
      return `<button class="card ucb${k === uTabSel ? " on" : ""}" data-uc="${k}">${agentCrest(k)}<span class="t"><span class="n">${esc(a.n)}</span><br>${charTags(a, k)}<span class="tag">${esc(a.rol || AGENT_ES[a.t] || a.t)}</span></span></button>`;
    }).join("")}</div></div>`).join("")}
    ${groups.map(([c, xs]) => `<div class="grp"><h3>${CASTE_ES[c]} <span class="muted">(${xs.length})</span></h3><div class="grid">${xs.map(({u, src}) =>
      `<button class="card ucb${u.k === uTabSel ? " on" : ""}" data-uk="${u.k}">${unitCard(u.k, "mid")}<span class="t"><span class="n">${esc(u.n)}</span><br>${u.rr ? `<span class="tag leg">Renombre</span> ` : ""}${src.filter(x => x !== "Regimientos de Renombre").map(x => `<span class="tag" title="Formas de conseguirla">${esc(x)}</span> `).join("")}</span></button>`).join("")}</div></div>`).join("")
      || `<p class="empty">No he encontrado unidades reclutables para esta facción.</p>`}
    ${sin.length ? `<details class="sin"><summary class="muted">Unidades de la raza que no he podido ubicar en ninguna facción (${sin.length})</summary><ul>${sin.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
  </div><aside class="ustats frame" id="u-stats">${uTabSel ? (isChar ? charStatsBlock(uTabSel) : unitStatsBlock(uTabSel, f.k)) : `<h3>Ficha</h3><p class="empty">Toca un señor, un héroe o una unidad para ver sus estadísticas base (tamaño Ultra, sin veteranía ni habilidades).</p>`}</aside></div>`;
}
function charGroups(f) {
  const leg = ks => ks.filter(k => D.agents[k].leg), gen = ks => ks.filter(k => !D.agents[k].leg);
  return [["Señores legendarios", leg(facLords(f))], ["Señores genéricos", gen(facLords(f))], ["Héroes legendarios", leg(facHeroes(f))], ["Héroes genéricos", gen(facHeroes(f))]].filter(g => g[1].length);
}
window.renderUnitsTab = renderUnitsTab;
document.addEventListener("click", e => {
  const tr = e.target.closest && e.target.closest("#chars [data-tree]"); if (tr) { openTree(S.fac, tr.dataset.tree, null, null); return; }
  const b = e.target.closest && e.target.closest("#chars [data-uk], #chars [data-uc]"); if (!b) return;
  uTabSel = b.dataset.uk || b.dataset.uc;
  document.querySelectorAll("#chars .ucb.on").forEach(x => x.classList.remove("on")); b.classList.add("on");
  $("#u-stats").innerHTML = b.dataset.uk ? unitStatsBlock(uTabSel, D.factions[S.fac].k) : charStatsBlock(uTabSel);
  if (window.matchMedia("(max-width:1180px)").matches) $("#u-stats").scrollIntoView({behavior: "smooth", block: "start"});
});

// ---------- builds de habilidades en el ejército ----------
// Cada señor o héroe puede llevar una build guardada en el árbol («Mis builds»). Se suman los efectos que el juego aplica
// al ejército (ámbitos «ejército del señor», «ejército del héroe», todo el ejército...), no los del propio personaje
// ni los de provincia, región o enemigos. Los que nombran unidades (conjuntos de unidades del juego) se cruzan con las
// unidades del ejército; los que no, valen para todo el ejército.
const hasTree = k => D.agents[k] && !D.agents[k].sa;
const ARMY_SC = /^(general_to_force_own|agent_to_parent_army_own|character_to_force_own|character_when_commanding_to_force_own|force_to_force_own|army_to_army_own|faction_to_force_own|faction_to_army_own|region_to_force_own|character_to_faction_leader_force)/;
const NOT_ARMY = /enemy|ally/;
const dkIdx = Object.fromEntries(EJ.dk.map((k, i) => [k, i]));
const hitCache = new Map();
// unidades (índices de D.units) del conjunto de unidades del efecto, con las mismas reglas que unitsFor de index.html
function effectUnits(ei) {
  if (hitCache.has(ei)) return hitCache.get(ei);
  const e = D.effects[ei], out = new Set();
  for (const si of e.us || []) {
    const inc = new Set(), exc = new Set();
    for (const [c, cat, cl, rec, ex] of D.unit_sets[si] || []) {
      const tgt = ex ? exc : inc;
      if (rec >= 0) { tgt.add(rec); continue; }
      if (rec === -2 || (!c && !cat && !cl)) continue;
      D.units.forEach((u, ui) => { if ((c || (u[2] !== "lord" && u[2] !== "hero")) && (!c || u[2] === c) && (!cat || u[3] === cat) && (!cl || u[4] === cl)) tgt.add(ui); });
    }
    for (const ui of inc) if (!exc.has(ui)) out.add(ui);
  }
  for (const ui of e.ur || []) out.add(ui);
  out.names = new Set([...out].map(ui => D.units[ui] && D.units[ui][1].join(",") + "|" + D.units[ui][0]));
  hitCache.set(ei, out); return out;
}
// ¿mejora el efecto a la unidad key? por su entrada en D.units, o por nombre y raza (unidades fusionadas en ejercitos.py)
function unitHit(ei, key, ri) {
  const set = effectUnits(ei), ui = dkIdx[key];
  if (ui !== undefined && set.has(ui)) return true;
  const u = EJ.u[ukIdx[key]]; if (!u) return false;
  for (const x of set) { const d = D.units[x]; if (d && d[0] === u.n && d[1].includes(ri)) return true; }
  return false;
}
// builds guardadas pasadas a esta facción (caché por token)
const convCache = new Map();
function savedFor(k) {
  return loadSaved().map((b, i) => ({b, i})).filter(({b}) => { const p = parseToken(b.t); return p && p.agent === k; }).map(x => {
    const ck = x.b.t + "|" + A.fac; if (!convCache.has(ck)) convCache.set(ck, buildForFaction(x.b.t, A.fac));
    return {...x, c: convCache.get(ck)};
  }).filter(x => x.c);
}
const sameBuild = (a, b) => a && b && a.lv.replace(/0+$/, "") === b.lv.replace(/0+$/, "") && (a.t ?? -1) === (b.t ?? -1);
function buildName(k, b) { const s = savedFor(k).find(x => sameBuild(x.c, b)); return s ? s.b.name : "Build del enlace"; }
let BUFFED = new Map();  // unidad -> nº de efectos de las builds que la mejoran (resalta cartas y fichas)
function armyBuffs() {
  const ri = raceIdx[D.factions[A.fac].sc];
  const troops = [...new Set(A.items.filter(it => it.t === "u").map(it => it.k))];
  const all = new Map(), per = new Map();
  const add = (m, ei, si, v, src) => { const k = ei + ":" + si, x = m.get(k) || {ei, si, v: 0, src: []}; x.v += v; if (!x.src.includes(src)) x.src.push(src); m.set(k, x); };
  for (const e of armyEntries()) {
    const b = A.builds[e.id]; if (e.t !== "h" || !b) continue;
    const r = buildSources(A.fac, e.k, b.lv, b.t); if (!r) continue;
    const who = D.agents[e.k].n;
    for (const [label, effs] of r.src) for (const [ei, si, v] of effs) {
      const ef = D.effects[ei]; if (!ef || si < 0 || !ef.t || !ef.t.trim()) continue;
      const sk = D.scope_keys[si]; if (!ARMY_SC.test(sk) || NOT_ARMY.test(sk)) continue;
      const src = `${label} (${who})`;
      // si alcanza a todas las unidades del ejército se lista con los de todo el ejército (no hay nada que resaltar)
      const hit = ef.us || ef.ur ? troops.filter(k => unitHit(ei, k, ri)) : null;
      if (hit && hit.length < troops.length) for (const k of hit) { if (!per.has(k)) per.set(k, new Map()); add(per.get(k), ei, si, v, src); }
      else if (!hit || hit.length) add(all, ei, si, v, src);
    }
  }
  return {all, per, troops};
}
function buffLi(x) {
  const f = fmtEffect(x.ei, x.si, x.v); if (!f) return "";
  return `<li><span class="${f.good ? "pos" : "neg"}">${esc(f.t)}</span><div class="bsrc">${esc(x.src.join(" · "))}</div></li>`;
}
function renderBuffs() {
  const el = $("#a-buffs"); if (!el) return;
  const R = armyBuffs(); BUFFED = new Map([...R.per].map(([k, m]) => [k, m.size]));
  const chars = armyEntries().filter(e => e.t === "h");
  const rows = chars.map(e => {
    const a = D.agents[e.k], b = A.builds[e.id], role = e.id === "L" ? "Señor" : "Héroe";
    if (!hasTree(e.k)) return `<div class="bchar">${agentCrest(e.k)}<div class="t"><b>${esc(a.n)}</b> · <span class="muted">${role}</span><br><span class="muted">El juego no le da árbol de habilidades.</span></div></div>`;
    const sv = savedFor(e.k), cur = b ? sv.find(x => sameBuild(x.c, b)) : null, r = b && buildSources(A.fac, e.k, b.lv, b.t);
    const opts = `<option value="">Sin build</option>` + sv.map(x => `<option value="${x.i}"${cur && cur.i === x.i ? " selected" : ""}>${esc(x.b.name)}</option>`).join("")
      + (b && !cur ? `<option value="cur" selected>Build del enlace</option>` : "");
    return `<div class="bchar${b ? " on" : ""}">${agentCrest(e.k)}<div class="t"><b>${esc(a.n)}</b> · <span class="muted">${role}</span>
      <div class="brow"><select data-bsel="${e.id}" aria-label="Build de ${esc(a.n)}">${opts}</select><button class="btn ghost sm" data-bedit="${e.id}">${b ? "Editar en el árbol" : "Crear en el árbol"}</button></div>
      ${r ? `<div class="muted">Nivel ${r.rank} · ${r.spent} puntos</div>` : sv.length ? "" : `<div class="muted">Aún no tienes builds guardadas de este personaje.</div>`}</div></div>`;
  }).join("");
  const nb = chars.filter(e => A.builds[e.id]).length;
  const allFx = [...R.all.values()].map(buffLi).join("");
  const units = R.troops.filter(k => R.per.has(k)), rest = R.troops.filter(k => !R.per.has(k));
  el.innerHTML = `<div class="fhd"><h3>Builds de habilidades</h3><span class="muted">Asigna a tu señor y a tus héroes una build guardada en el árbol de habilidades («Guardar» en su ficha) o créala desde aquí. Se suman solo los efectos que el juego aplica a su ejército; los del propio personaje están en su hoja del árbol.</span></div>
    ${rows ? `<div class="bchars">${rows}</div>` : `<p class="empty">Elige un señor o añade héroes para asignarles una build.</p>`}
    ${nb ? `<div class="bres">
      <div><h4>Todo el ejército</h4>${allFx ? `<ul class="fx">${allFx}</ul>` : `<p class="empty">Ningún efecto de las builds afecta a todo el ejército.</p>`}</div>
      <div><h4>Unidades mejoradas <span class="muted">(${units.length} de ${R.troops.length})</span></h4>${units.length ? `<p class="muted" style="font-size:12px;margin:0 0 6px">Resaltadas en verde en el ejército y en el campo; ▲N = efectos que la mejoran. Toca una para ver los efectos.</p>` : ""}${units.length ? `<div class="bunits">${units.map(k => {
        const u = EJ.u[ukIdx[k]], m = R.per.get(k);
        const sk = [...new Set([...m.values()].flatMap(x => x.src))];
        return `<details class="bunit" data-bu="${k}"><summary>${unitCard(k, "mini")}<div class="t"><b>${esc(u.n)}</b> <small class="muted">×${m.size}</small><div class="bsrc">${esc(sk.join(" · "))}</div></div></summary><ul class="fx">${[...m.values()].map(buffLi).join("")}</ul></details>`;
      }).join("")}</div>` : `<p class="empty">${R.troops.length ? "Ninguna habilidad de las builds nombra a las unidades de este ejército." : "Añade unidades al ejército para ver cuáles mejoran."}</p>`}
      ${rest.length && units.length ? `<p class="muted" style="font-size:12px">Sin mejoras concretas: ${rest.map(k => esc(EJ.u[ukIdx[k]].n)).join(", ")}.</p>` : ""}</div>
    </div>` : ""}`;
}
document.addEventListener("change", e => {
  const s = e.target.closest && e.target.closest("[data-bsel]"); if (!s) return;
  const id = s.dataset.bsel, v = s.value;
  if (v === "") delete A.builds[id];
  else if (v !== "cur") { const b = loadSaved()[+v], c = b && buildForFaction(b.t, A.fac); if (c) A.builds[id] = c; }
  armyChanged();
});

// ---------- formación ----------
function armyEntries() { return [...(A.lord ? [{id: "L", t: "h", k: A.lord}] : []), ...A.items]; }
function tokHtml(e) {
  const img = e.t === "u" ? unitImgSrc(e.k) : (RETRATOS.a[e.k] !== undefined ? RETRATOS.img[RETRATOS.a[e.k]] : null);
  const name = itemName(e);
  return `<div class="tok${e.id === "L" ? " lord" : e.t === "h" ? " hero" : ""}${e.t === "u" && BUFFED.get(e.k) ? " buffed" : ""}${A.pick === e.id ? " pick" : ""}" data-tok="${e.id}" title="${esc(name)}">${img ? `<img src="${img}" alt="" draggable="false">` : `<span>${esc(initials(name))}</span>`}<em>${esc(name)}</em></div>`;
}
function renderField() {
  const ents = armyEntries(), byCell = new Map();
  for (const e of ents) if (A.pos[e.id] !== undefined) byCell.set(A.pos[e.id], e);
  const tray = ents.filter(e => A.pos[e.id] === undefined);
  $("#a-tray").innerHTML = tray.length ? tray.map(tokHtml).join("") : `<span class="empty">${ents.length ? "Todas las unidades están en el campo." : "Añade unidades al ejército para colocarlas."}</span>`;
  let h = "";
  for (let c = 0; c < GRID_W * GRID_H; c++) { const e = byCell.get(c); h += `<div class="cell" data-cell="${c}">${e ? tokHtml(e) : ""}</div>`; }
  $("#a-field").innerHTML = h;
}
function placeAt(id, cell) {
  if (cell === undefined) { delete A.pos[id]; }
  else {
    const other = Object.keys(A.pos).find(k => A.pos[k] === cell && k !== id);
    if (other) { if (A.pos[id] !== undefined) A.pos[other] = A.pos[id]; else delete A.pos[other]; }  // intercambia
    A.pos[id] = cell;
  }
  A.pick = null; renderField(); syncHash();
}
// arrastre con puntero (ratón y táctil) desde una ficha, una carta del ejército o una fila de la lista de reclutamiento;
// sin mover = tocar una ficha para elegirla y tocar una casilla para colocarla
let adrag = null, swallowClick = false;
// recluta {t: "L"|"h"|"u", k}; devuelve el id en el ejército o null si no cabe
function recruit(add) {
  if (add.t === "L") { if (A.lord !== add.k) delete A.builds.L; A.lord = add.k; return "L"; }
  if (add.t === "h") { if (!canAddHero(add.k)) return null; const it = {t: "h", k: add.k, id: newId()}; A.items.push(it); return it.id; }
  const u = EJ.u[ukIdx[add.k]]; if (!u || !canAddUnit(u)) return null;
  const it = {t: "u", k: u.k, id: newId()}; A.items.push(it); return it.id;
}
// mueve la carta id al lugar de la carta destino (o al final si cae en un hueco vacío); el señor no se mueve
function reorder(id, before) {
  const from = A.items.findIndex(it => it.id === id); if (from < 0 || id === before) return false;
  const [it] = A.items.splice(from, 1);
  const to = before ? A.items.findIndex(x => x.id === before) : -1;
  if (to < 0) A.items.push(it); else A.items.splice(to + (from <= to ? 1 : 0), 0, it);
  return true;
}
function dragSource(t) {
  const tok = t.closest("#v-army .tok"); if (tok) return {id: tok.dataset.tok, el: tok, tok: true};
  if (t.closest("button")) return null;
  const sl = t.closest("#a-slots .slot[data-sid]"); if (sl) { const e = armyEntries().find(x => x.id === sl.dataset.sid); return e && {id: e.id, el: sl, ent: e}; }
  const ru = t.closest("#a-list [data-su]"); if (ru) return {add: {t: "u", k: ru.dataset.su}, el: ru};
  const ra = t.closest("#a-list [data-sa]"); if (ra) return {add: {t: A.tab === "lords" ? "L" : "h", k: ra.dataset.sa}, el: ra};
  return null;
}
document.addEventListener("pointerdown", e => {
  if (e.button > 0) return;
  const s = dragSource(e.target); if (!s) return;
  adrag = {...s, x: e.clientX, y: e.clientY, ghost: null};
  if (s.tok) e.preventDefault();
});
document.addEventListener("pointermove", e => {
  if (!adrag) return;
  if (!adrag.ghost && Math.hypot(e.clientX - adrag.x, e.clientY - adrag.y) > 6) {
    const ent = adrag.ent || (adrag.add ? {id: "_", t: adrag.add.t === "u" ? "u" : "h", k: adrag.add.k} : null);
    const host = document.createElement("div"); host.innerHTML = adrag.tok ? adrag.el.outerHTML : tokHtml(ent);
    adrag.ghost = host.firstElementChild; adrag.ghost.classList.add("ghost"); document.body.appendChild(adrag.ghost);
    if (adrag.tok) adrag.el.classList.add("dragging");
  }
  if (adrag.ghost) {
    adrag.ghost.style.left = e.clientX + "px"; adrag.ghost.style.top = e.clientY + "px";
    const u = document.elementFromPoint(e.clientX, e.clientY);
    if (adrag.add) $("#a-slots").classList.toggle("drop", !!(u && u.closest("#a-slots")));
    if (adrag.ent && adrag.id !== "L") {  // reordenar: marca la carta sobre la que caería
      const over = u && u.closest("#a-slots .slot");
      document.querySelectorAll("#a-slots .slot.over").forEach(x => x !== over && x.classList.remove("over"));
      if (over && over !== adrag.el && !over.classList.contains("lord")) over.classList.add("over");
    }
  }
});
document.addEventListener("pointerup", e => {
  if (!adrag) return;
  const d = adrag; adrag = null;
  if (!d.ghost) {
    if (!d.tok) return;  // un clic normal en la carta o la fila: lo atiende el manejador de clics
    A.pick = A.pick === d.id ? null : d.id; const ent = armyEntries().find(x => x.id === d.id); if (ent) A.sel = ent; renderField(); renderSlots(); renderStats(); return;
  }
  d.ghost.remove(); swallowClick = true; setTimeout(() => { swallowClick = false; }, 0);
  const under = document.elementFromPoint(e.clientX, e.clientY), cell = under && under.closest("#a-field .cell");
  const slots = under && under.closest("#a-slots");
  $("#a-slots").classList.remove("drop");
  document.querySelectorAll("#a-slots .slot.over").forEach(x => x.classList.remove("over"));
  if (d.ent && slots) {  // carta soltada en el ejército: cambia el orden, no toca el campo
    const tgt = under.closest(".slot");
    if (d.id !== "L" && tgt && !tgt.classList.contains("lord") && reorder(d.id, tgt.dataset.sid || null)) armyChanged();
    else renderSlots();
    return;
  }
  if (d.add) {  // desde la lista: se recluta y, si cae en el campo, se coloca; si cae en el ejército, solo se recluta
    if (!cell && !slots) return;
    const id = recruit(d.add);
    if (!id) { armyMsg(whyNot(d.add) || "No cabe."); renderField(); return; }
    A.sel = armyEntries().find(x => x.id === id); if (cell) placeAt(id, +cell.dataset.cell); armyChanged(); return;
  }
  placeAt(d.id, cell ? +cell.dataset.cell : undefined);  // fuera del campo: vuelve a la reserva, sigue en el ejército
});
// las imágenes se arrastran de forma nativa y eso cancela el puntero
document.addEventListener("dragstart", e => { if (e.target.closest && e.target.closest("#v-army")) e.preventDefault(); });
document.addEventListener("pointercancel", () => { if (adrag && adrag.ghost) adrag.ghost.remove(); adrag = null; renderField(); });
document.addEventListener("click", e => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);

// ---------- clics ----------
function removeItem(id) {
  delete A.pos[id]; delete A.builds[id];
  if (id === "L") A.lord = null; else A.items = A.items.filter(it => it.id !== id);
  if (A.sel && A.sel.id === id) A.sel = null; armyChanged();
}
// doble clic hecho a mano: el primer clic vuelve a pintar la lista y el dblclick nativo se pierde
let lastClick = {k: null, t: 0};
function isDouble(k) {
  const now = Date.now(), dbl = lastClick.k === k && now - lastClick.t < 400;
  lastClick = dbl ? {k: null, t: 0} : {k, t: now}; return dbl;
}
// clic derecho en una carta del ejército: la quita del ejército
// clic derecho en el campo: vuelve a la reserva; en la reserva: se quita del ejército
document.addEventListener("contextmenu", e => {
  if (!e.target.closest) return;
  const ft = e.target.closest("#a-field .tok[data-tok]"); if (ft) { e.preventDefault(); placeAt(ft.dataset.tok, undefined); return; }
  const tt = e.target.closest("#a-tray .tok[data-tok]"); if (tt) { e.preventDefault(); removeItem(tt.dataset.tok); return; }
  const sl = e.target.closest("#a-slots .slot[data-sid]"); if (!sl) return;
  e.preventDefault(); removeItem(sl.dataset.sid);
});
document.addEventListener("click", e => {
  if (!e.target.closest("#v-army")) return;
  const g = (sel) => e.target.closest(sel);
  let b;
  if ((b = g("[data-au]"))) { const u = EJ.u[ukIdx[b.dataset.au]]; if (canAddUnit(u)) { const it = {t: "u", k: u.k, id: newId()}; A.items.push(it); A.sel = it; armyChanged(); } return; }
  if ((b = g("[data-ah]"))) { if (canAddHero(b.dataset.ah)) { const it = {t: "h", k: b.dataset.ah, id: newId()}; A.items.push(it); A.sel = it; armyChanged(); } return; }
  if ((b = g("[data-al]"))) { if (A.lord !== b.dataset.al) delete A.builds.L; A.lord = b.dataset.al; A.sel = {id: "L", t: "h", k: A.lord}; armyChanged(); return; }
  if ((b = g("[data-rm]"))) { removeItem(b.dataset.rm); return; }
  if ((b = g("[data-bedit]"))) {
    const id = b.dataset.bedit, e = armyEntries().find(x => x.id === id); if (!e) return;
    const cur = A.builds[id];
    window.ARMY_EDIT = {fi: A.fac, id, k: e.k, n: cur ? buildName(e.k, cur).replace(/^Build del enlace$/, "") : ""};
    openTree(A.fac, e.k, null, cur ? cur.lv : null, cur && cur.t >= 0 ? cur.t : null); return;
  }
  if ((b = g("[data-tree]"))) { openTree(A.fac, b.dataset.tree, null, null); return; }
  if ((b = g("[data-aopen]"))) { openSaved(+b.dataset.aopen); return; }
  if ((b = g("[data-adel]"))) { const l = loadArmies(), [d] = l.splice(+b.dataset.adel, 1); storeArmies(l); if (d && d.id === A.saveId) A.saveId = null; renderSaveButtons(); renderSavedArmies(); return; }
  if ((b = g("[data-sid]"))) { const id = b.dataset.sid; A.sel = armyEntries().find(x => x.id === id) || null; renderSlots(); renderStats(); return; }
  if ((b = g("[data-su]")) || (b = g("[data-sa]"))) {
    const add = b.dataset.su ? {t: "u", k: b.dataset.su} : {t: A.tab === "lords" ? "L" : "h", k: b.dataset.sa};
    if (isDouble(add.k)) {  // doble clic en la lista: lo añade al ejército
      const id = recruit(add);
      if (!id) { armyMsg(whyNot(add) || "No cabe."); return; }
      A.sel = armyEntries().find(x => x.id === id); armyChanged(); return;
    }
    A.sel = {t: add.t === "u" ? "u" : "h", k: add.k}; renderRoster(); renderStats(); return;
  }
  if ((b = g("#a-field .cell")) && A.pick) { placeAt(A.pick, +b.dataset.cell); return; }
});

// ---------- estilos ----------
document.head.insertAdjacentHTML("beforeend", `<style>
#a-slots .slot.over{outline:2px dashed var(--gold2);outline-offset:-2px}
.slot .bf{position:absolute;top:20px;left:3px;z-index:2;background:#1d3b1c;color:#bfe7a6;border:1px solid #6fae5a;border-radius:2px;font:600 11px/1 var(--body,inherit);padding:2px 4px;pointer-events:auto}
.slot .bf.b{background:#3a2c14;color:var(--gold2);border-color:var(--gold)}
#a-slots .slot.buffed{border-color:#6fae5a;box-shadow:0 0 8px -1px #6fae5a99}
.tok.buffed{box-shadow:0 0 0 2px #6fae5a,0 0 10px #6fae5a99}
.bchars{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;margin:8px 0}
.bchar{display:flex;gap:8px;align-items:flex-start;padding:6px;border:1px solid var(--line);border-radius:2px;background:#0d0b0966;font-size:13px}
.bchar.on{border-color:var(--gold)}
.bchar .crest{width:34px;height:34px;flex:none}.bchar img.crest.face{width:30px;height:65px}
.bchar .t{min-width:0;flex:1}
.brow{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0}
.brow select{flex:1;min-width:0;max-width:100%;background:#0d0b09;border:1px solid var(--line);color:var(--text);padding:5px 6px;border-radius:2px;font:inherit}
.btn.sm{padding:4px 8px;font-size:12px}
.bres{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:14px}
.bres h4{margin:6px 0;font:15px var(--display);color:var(--gold)}
.bunits{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.bunit{padding:6px;border:1px solid #6fae5a66;border-radius:2px;background:#0d0b0966;font-size:13px;align-self:start}
.bunit summary{display:flex;gap:8px;align-items:flex-start;cursor:pointer;list-style:none}.bunit summary::-webkit-details-marker{display:none}
.bunit[open]{border-color:#6fae5a}.bunit .t{min-width:0}.bunit ul.fx{margin:6px 0 0}
.bsrc{font-size:11px;color:var(--muted)}
@media (max-width:900px){.bres{grid-template-columns:1fr}}
.saved div.on button.l{color:var(--gold2);font-weight:600}
.army{display:grid;grid-template-columns:330px minmax(0,1fr) 300px;gap:14px;align-items:start}
.roster,.ustats{padding:12px;position:sticky;top:70px;max-height:calc(100vh - 90px);overflow:auto;display:grid;gap:8px;align-content:start}
.roster .tabs{margin:0}
.roster input,.atop input{width:100%;min-width:0;background:#0d0b09;border:1px solid var(--line);color:var(--text);padding:8px 10px;border-radius:2px;font:inherit}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.chips button{background:none;border:1px solid var(--line);color:var(--muted);padding:2px 8px;border-radius:2px;cursor:pointer;font-size:12px}
.chips button[aria-pressed="true"]{border-color:var(--gold);color:var(--gold2);background:#2a2116}
.rlist{display:grid;gap:4px}
.rlist h4{margin:8px 0 2px;font:15px var(--display);color:var(--gold)}
.rrow{display:flex;gap:8px;align-items:center;padding:4px 6px;border:1px solid var(--line);border-radius:2px;background:#0d0b0966;cursor:pointer}
.rrow:hover,.rrow.on{border-color:var(--gold)}
.rrow .t{flex:1;min-width:0;font-size:13px;line-height:1.3}
.rrow .t b{font-weight:500;color:var(--text)}
.rrow img.crest.face{width:30px;height:65px}
.rrow .crest{width:34px;height:34px;font-size:15px}
.rrow .add{flex:none;width:30px;height:30px;border:1px solid var(--gold);background:linear-gradient(#4a3a26,#2d2318);color:var(--gold2);border-radius:2px;cursor:pointer;font-size:18px;line-height:1}
.rrow .add:disabled{opacity:.35;cursor:not-allowed}
.ucard{display:block;flex:none;width:60px;height:130px;object-fit:cover;border:1px solid var(--silver);border-radius:2px;background:#000}
.ucard.mini{width:30px;height:65px}
.ucard.big{width:72px;height:156px;border-width:2px}
.ucard.none{display:grid;place-items:center;font:20px var(--display);color:var(--muted);background:#1c1814}
.sico{width:18px;height:18px;vertical-align:-4px;margin-right:3px}
.fx{position:relative;margin:8px 0}.fx>.lbl small{font-weight:400;opacity:.7}
.fxrow{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin-top:4px}.fxrow>.lbl{min-width:108px}
.fxc{display:inline-flex;align-items:center;padding:2px 7px 2px 4px;border:1px solid var(--line,#8884);border-radius:12px;font-size:12.5px;cursor:help;outline:none}
.fxc .sico{width:18px;height:18px;margin-right:4px}
.fxc:hover::after,.fxc:focus::after{content:attr(data-tip);position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:30;white-space:pre-line;
  background:var(--panel,#222);color:var(--text,#eee);border:1px solid var(--line,#8886);border-radius:6px;padding:6px 8px;font-size:12px;line-height:1.35;box-shadow:0 4px 14px #0006}
.sgrid .brk{font-size:12px;color:var(--muted);font-weight:400;margin-left:2px}
.sgrid .brk .sico{width:14px;height:14px;vertical-align:-3px;margin:0 1px 0 4px}
.card .s .sico{width:15px;height:15px;vertical-align:-3px;margin:0 1px 0 4px}
.utab{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px;align-items:start}
.ucb .ucard.mid{width:42px;height:91px}
.ucb.on{border-color:var(--gold2);box-shadow:0 0 8px #c9a45c66}
@media (max-width:1180px){.utab{grid-template-columns:minmax(0,1fr)}.utab .ustats{order:-1;position:static;max-height:none}}
.sin{font-size:12px} .sin ul{margin:4px 0 0;padding-left:16px}
.amain{display:grid;gap:14px;min-width:0}
.abox{padding:14px;display:grid;gap:10px;min-width:0}
.atop{display:grid;gap:8px}
.atotals{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.atotals div{background:#0d0b09;border:1px solid var(--line);padding:6px 8px;border-radius:2px}
.atotals b{display:block;font:20px var(--display);color:var(--gold2);font-variant-numeric:tabular-nums}
.atotals .warn{grid-column:1/-1;color:var(--bad);font-size:13px}
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:6px}
.slot{position:relative;display:grid;justify-items:center;gap:2px;padding:3px;border:1px solid var(--line);border-radius:2px;background:#0d0b0999;cursor:pointer;min-height:162px}
.slot.on{border-color:var(--gold2);box-shadow:0 0 8px #c9a45c88}
.slot.lord{border-color:var(--gold)}
.slot.empty{cursor:default;border-style:dashed;place-items:center;color:var(--muted);font-size:12px;text-align:center}
.slot .ucard,.slot img.crest.full{width:56px;height:121px;object-fit:cover;border:1px solid var(--silver);border-radius:2px;filter:none;background:#000}
.slot .crest:not(img){width:56px;height:56px}
.slot .sn{font-size:11px;line-height:1.1;text-align:center;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.slot .sc{position:absolute;top:4px;left:4px;font-size:10px;background:#000c;padding:0 3px;border-radius:2px;color:var(--gold2)}
.slot .rm{position:absolute;top:2px;right:2px;width:20px;height:20px;border:0;border-radius:2px;background:#3a1512;color:#f3c5b5;cursor:pointer;font-size:11px;line-height:20px;padding:0}
.fhd{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.fhd .muted{font-size:13px}
.tray{display:flex;flex-wrap:wrap;gap:4px;min-height:52px;padding:6px;border:1px dashed var(--line);border-radius:2px}
.fieldwrap{overflow-x:auto;--cw:46px;--ch:100px}
.fieldin{width:max-content;margin:0 auto}
.front,.rear{font:13px var(--display);letter-spacing:.1em;text-transform:uppercase;color:var(--bad);text-align:center;padding:2px 0 4px}
.rear{color:var(--muted);padding:4px 0 0}
.field{display:grid;gap:0;width:max-content;background:repeating-linear-gradient(0deg,#1d2a17 0 var(--ch),#1a2615 var(--ch) calc(var(--ch) * 2));border:1px solid var(--line)}
.cell{width:var(--cw);height:var(--ch);border:1px solid #ffffff10;display:grid;place-items:center}
.tok{position:relative;width:42px;height:91px;border:2px solid var(--silver);border-radius:3px;overflow:hidden;background:#000;cursor:grab;touch-action:none;user-select:none}
.tok img{width:100%;height:100%;object-fit:cover;object-position:50% 50%;pointer-events:none}
.tok span{display:grid;place-items:center;height:100%;font:18px var(--display);color:var(--muted)}
.tok em{position:absolute;left:0;right:0;bottom:0;font:9px/1.1 var(--body);font-style:normal;background:#000b;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 1px;pointer-events:none}
.tok.lord{border-color:var(--gold2)} .tok.hero{border-color:#7fa6c4}
.tok.pick{outline:2px solid var(--gold2);outline-offset:1px}
.tok.dragging{opacity:.35}
.slot,.rrow{user-select:none;-webkit-user-select:none}
.slots.drop{outline:2px dashed var(--gold2);outline-offset:4px;background:#c9a45c14}
.tok.ghost{position:fixed;z-index:50;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 4px 12px #000}
.ustats .shd{display:flex;gap:10px;align-items:flex-start}
.ustats .sgrid{grid-template-columns:repeat(2,1fr)}
.ustats .sgrid span{display:block}
.ustats img.crest.full{width:72px;height:156px;border:2px solid var(--silver);border-radius:3px;object-fit:cover;filter:none;background:#000}
.uthumb{width:22px;height:48px;object-fit:cover;object-position:50% 10%;border:1px solid var(--line);border-radius:2px;vertical-align:middle;margin-right:3px;background:#000}
.uitem{display:inline-flex;align-items:center;gap:2px;margin:2px 6px 2px 0;font-size:12px}
@media (max-width:1180px){.army{grid-template-columns:300px minmax(0,1fr)}.ustats{grid-column:1/-1;position:static;max-height:none}}
@media (max-width:760px){.army{grid-template-columns:minmax(0,1fr)}.roster{position:static;max-height:60vh}.fieldwrap{--cw:38px;--ch:83px}.tok{width:34px;height:74px}}
</style>`);
