// Sincronización entre dispositivos de las builds de habilidades (wh3-skill-builds) y los ejércitos guardados
// (wh3-army-builds). localStorage sigue siendo la copia de trabajo; este archivo la mezcla con:
//  · el artefacto de claude.ai: base de datos privada de cada usuario (capacidad db, data/users/<id>/sync), automática;
//  · GitHub (la web de GitHub Pages y, si el navegador lo deja, también el artefacto): un gist privado de la cuenta
//    de quien pegue un token con permiso «gist». El token solo se guarda en este navegador.
// Mezcla: cada elemento lleva «u» (ms de su último guardado) y gana el más reciente; los borrados dejan una marca en
// «del» (clave → ms) para que no reaparezcan desde otro dispositivo. index.html y ejercito.js llaman a
// WH3SYNC.changed() al guardar y WH3SYNC.removed() al borrar.
"use strict";
(function () {
  const KS = "wh3-skill-builds", KA = "wh3-army-builds", KD = "wh3-sync-del", KG = "wh3-sync-github";
  const FILE = "wh3-simulador-sync.json", API = "https://api.github.com";
  // el artefacto no puede conectar con GitHub: entre los dos se pasan los guardados con un enlace (#sync=…)
  const WEB = "https://morgui92.github.io/Warhammer-3/", ARTI = "https://claude.ai/artifact/FjNXHMKQF3wmkcwZYGygRd";
  const ON_WEB = /github\.io$/.test(location.hostname);
  const MAXS = 80, MAXA = 60, DEL_DAYS = 180;
  const EN = window.WH3LANG === "en";
  const T = (es, en) => EN ? en : es;

  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const keyS = b => "s:" + b.t, keyA = b => "a:" + b.id;

  // estado local; a lo guardado antes de la v2.9 (sin «u») le da un «u» antiguo que respeta su orden
  function readLocal() {
    let s = rd(KS, []), a = rd(KA, []), del = rd(KD, {}), fix = false;
    if (!Array.isArray(s)) s = []; if (!Array.isArray(a)) a = []; if (!del || typeof del !== "object") del = {};
    s.forEach((b, i) => { if (!b.u) { b.u = 1000 + s.length - i; fix = true; } });
    a.forEach((b, i) => { if (!b.id) { b.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); fix = true; } if (!b.u) { b.u = 1000 + a.length - i; fix = true; } });
    if (fix) { wr(KS, s); wr(KA, a); }
    return {skill: s, army: a, del};
  }
  function writeLocal(m) { wr(KS, m.skill); wr(KA, m.army); wr(KD, m.del); }

  function merge(x, y) {
    y = y && typeof y === "object" ? y : {};
    const del = {}, old = Date.now() - DEL_DAYS * 864e5;
    for (const d of [x.del, y.del]) for (const [k, v] of Object.entries(d || {})) if (v > old && !(del[k] >= v)) del[k] = v;
    const one = (la, lb, key, max) => {
      const by = new Map();
      for (const b of [...(la || []), ...(lb || [])]) {
        if (!b || typeof b.t !== "string") continue;
        const k = key(b), cur = by.get(k);
        if (!cur || (b.u || 0) > (cur.u || 0)) by.set(k, b);
      }
      return [...by.values()].filter(b => !(del[key(b)] >= (b.u || 0)))
        .sort((p, q) => (q.u || 0) - (p.u || 0) || (key(p) < key(q) ? -1 : 1)).slice(0, max);
    };
    return {skill: one(x.skill, y.skill, keyS, MAXS), army: one(x.army, y.army, keyA, MAXA), del};
  }
  const canon = m => JSON.stringify({skill: m.skill || [], army: m.army || [], del: Object.keys(m.del || {}).sort().map(k => [k, m.del[k]])});

  // ---------- destinos ----------
  const backends = [];   // {id, label, pull() → objeto|null, push(m)}
  const state = {};      // id → {ok, err, at}

  // artefacto de claude.ai: cada usuario tiene su documento privado
  async function setupArtifact() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    let db, user, uid;
    try { [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); uid = user && await user.id(); } catch (e) { return; }
    if (!db || !uid) return;
    const ref = db.doc("data/users/" + uid + "/sync");
    const be = {id: "claude", label: T("Tu cuenta de Claude", "Your Claude account"),
      pull: async () => { const s = await ref.get(); return s.exists ? s.data() : null; },
      push: m => ref.set({...m, at: Date.now()})};
    backends.push(be);
    ref.onSnapshot(s => { if (!s.metadata.hasPendingWrites && s.exists) sync(); }, () => {});
    sync();
  }

  // GitHub: gist privado
  const gh = () => rd(KG, null);
  async function ghFetch(path, opt = {}) {
    const g = gh(); if (!g || !g.token) throw new Error("sin token");
    const r = await fetch(API + path, {...opt, cache: "no-store",
      headers: {Authorization: "Bearer " + g.token, Accept: "application/vnd.github+json", ...(opt.body ? {"Content-Type": "application/json"} : {})}});
    if (r.status === 401) throw new Error(T("el token no es válido o ha caducado", "the token is invalid or expired"));
    if (r.status === 403 || r.status === 404) throw new Error(T("el token no tiene permiso «gist»", "the token lacks the “gist” scope"));
    if (!r.ok) throw new Error("GitHub " + r.status);
    return r.json();
  }
  async function ghGist() {
    const g = gh();
    if (g.gist) return g.gist;
    for (let page = 1; page <= 5; page++) {
      const l = await ghFetch("/gists?per_page=100&page=" + page);
      const f = l.find(x => x.files && x.files[FILE]); if (f) { wr(KG, {...g, gist: f.id}); return f.id; }
      if (l.length < 100) break;
    }
    const c = await ghFetch("/gists", {method: "POST", body: JSON.stringify({description: "Simulador WH3 · builds y ejércitos guardados (sincronización)", public: false, files: {[FILE]: {content: "{}"}}})});
    wr(KG, {...g, gist: c.id}); return c.id;
  }
  const ghBackend = {id: "github", label: "GitHub",
    pull: async () => {
      const id = await ghGist(); let g;
      try { g = await ghFetch("/gists/" + id); } catch (e) { const x = gh(); if (x) wr(KG, {token: x.token}); throw e; }  // gist borrado: se busca o crea de nuevo
      const f = g.files && g.files[FILE]; if (!f) return null;
      const txt = f.truncated ? await (await fetch(f.raw_url, {cache: "no-store"})).text() : f.content;
      try { return JSON.parse(txt || "{}"); } catch (e) { return null; }
    },
    push: async m => { const id = await ghGist(); await ghFetch("/gists/" + id, {method: "PATCH", body: JSON.stringify({files: {[FILE]: {content: JSON.stringify({...m, at: Date.now()})}}})}); }};
  const IN_ARTI = !ON_WEB && !!window.claude;  // dentro de claude.ai GitHub está bloqueado («Failed to fetch»)
  function setupGithub() { if (!IN_ARTI && gh() && gh().token && !backends.includes(ghBackend)) backends.push(ghBackend); }

  // ---------- sincronizar ----------
  let chain = Promise.resolve(), busy = 0;
  function sync() {
    if (!backends.length) return chain;
    busy++; paint();
    chain = chain.then(async () => {
      let local = readLocal(); const before = canon(local);
      for (const be of [...backends]) {
        try {
          const remote = await be.pull();
          const m = merge(local, remote || {});
          if (!remote || canon(m) !== canon(remote)) await be.push(m);
          local = m; state[be.id] = {ok: true, at: Date.now()};
        } catch (e) { state[be.id] = {ok: false, err: String(e && e.message || e), at: Date.now()}; }
      }
      if (canon(local) !== before) { writeLocal(local); refresh(); }
    }).finally(() => { busy--; paint(); });
    return chain;
  }
  let timer = 0;
  const later = () => { clearTimeout(timer); timer = setTimeout(sync, 1500); };

  function refresh() {
    const call = n => { try { if (typeof window[n] === "function") window[n](); } catch (e) {} };
    if (document.getElementById("saved")) call("renderSaved");
    if (document.getElementById("a-saved")) { call("renderSavedArmies"); call("renderSaveButtons"); }
    if (document.getElementById("a-buffs")) call("renderBuffs");
  }

  window.WH3SYNC = {
    changed() { later(); },
    removed(kind, key) { const d = rd(KD, {}); d[(kind === "army" ? "a:" : "s:") + key] = Date.now(); wr(KD, d); later(); },
    now: sync, merge, pack: m => pack(m),
  };

  // ---------- botón y panel ----------
  let btn, panel;
  function paint() {
    if (!btn) return;
    const errs = backends.filter(b => state[b.id] && !state[b.id].ok);
    btn.dataset.st = busy ? "busy" : !backends.length ? "off" : errs.length ? "err" : "ok";
    btn.title = !backends.length ? T("Sincronización desactivada: lo guardado solo está en este navegador", "Sync off: saved items live only in this browser")
      : busy ? T("Sincronizando…", "Syncing…") : errs.length ? T("Error al sincronizar", "Sync error") : T("Sincronizado", "Synced");
    if (panel && !panel.hidden) fillPanel();
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const hhmm = t => new Date(t).toLocaleTimeString(EN ? "en-GB" : "es-ES", {hour: "2-digit", minute: "2-digit"});
  function line(be) {
    const s = state[be.id];
    const st = !s ? T("pendiente", "pending") : s.ok ? T("al día", "up to date") + " · " + hhmm(s.at) : T("error: ", "error: ") + s.err;
    return `<div class="sy-row"><span class="sy-dot" data-ok="${s ? s.ok : ""}"></span><b>${esc(be.label)}</b><span class="muted">${esc(st)}</span></div>`;
  }
  function fillPanel() {
    const l = readLocal(), g = gh();
    const tokUrl = "https://github.com/settings/tokens/new?scopes=gist&description=Simulador%20WH3%20sync";
    panel.innerHTML = `<h3>${T("Sincronizar entre dispositivos", "Sync across devices")}</h3>
      <p class="muted">${T(`En este navegador: ${l.skill.length} builds y ${l.army.length} ejércitos.`, `In this browser: ${l.skill.length} builds and ${l.army.length} armies.`)}</p>
      ${backends.map(line).join("") || `<p>${T("Ahora mismo lo guardado solo está en este navegador.", "Right now your saves live only in this browser.")}</p>`}
      <div class="sy-gh">
        <h4>${ON_WEB ? T("Pasar al artefacto de Claude", "Send to the Claude artifact") : T("Pasar a la web", "Send to the website")}</h4>
        <p class="muted">${ON_WEB ? T("Abre el artefacto con tus builds y ejércitos de aquí ya mezclados con los suyos.", "Opens the artifact with your builds and armies from here merged into its own.")
          : T("El artefacto no puede conectar con GitHub. Este botón abre la web con tus builds y ejércitos de aquí, y la web los mezcla y los sube a tu GitHub.", "The artifact cannot reach GitHub. This button opens the website with your builds and armies from here; it merges them and uploads them to your GitHub.")}</p>
        <div class="sy-btns"><button data-sy="send">${ON_WEB ? T("Enviar al artefacto ↗", "Send to the artifact ↗") : T("Enviar a la web ↗", "Send to the website ↗")}</button></div>
      </div>
      ${IN_ARTI ? "" : `<div class="sy-gh">
        <h4>${T("Con GitHub (también la web y el móvil)", "With GitHub (website and phone too)")}</h4>
        ${g && g.token ? `<p>${T("Conectado. Usa el mismo token en el móvil y en el PC y se mezclarán solos.", "Connected. Use the same token on your phone and PC and they merge on their own.")}</p>
          <div class="sy-btns"><button data-sy="now">${T("Sincronizar ahora", "Sync now")}</button><button data-sy="off">${T("Desconectar este navegador", "Disconnect this browser")}</button></div>`
        : `<p class="muted">${T(`Para tener las mismas builds en la web y en todos tus dispositivos: <a href="${tokUrl}" target="_blank" rel="noopener">crea un token de GitHub</a> (solo con permiso «gist», caducidad la que quieras), cópialo y pégalo aquí en cada dispositivo. Se guarda en un gist privado de tu cuenta.`,
            `To have the same builds on the website and all your devices: <a href="${tokUrl}" target="_blank" rel="noopener">create a GitHub token</a> (only the “gist” scope), copy it and paste it here on each device. It is stored in a private gist on your account.`)}</p>
          <div class="sy-btns"><input id="sy-tok" type="password" autocomplete="off" placeholder="ghp_…" aria-label="Token"><button data-sy="on">${T("Conectar", "Connect")}</button></div>`}
      </div>`}`;
  }
  document.addEventListener("DOMContentLoaded", () => {
    const host = document.querySelector("header.top .wrap"); if (!host) return;
    btn = document.createElement("button");
    btn.className = "sybtn"; btn.type = "button"; btn.setAttribute("aria-label", T("Sincronización", "Sync"));
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.1 4.5 4.5 0 0 0 7 18z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
    panel = document.createElement("div"); panel.className = "sypanel frame"; panel.hidden = true;
    host.appendChild(btn); document.body.appendChild(panel);
    btn.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) fillPanel(); };
    document.addEventListener("click", async e => {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) panel.hidden = true;
      const b = e.target.closest("[data-sy]"); if (!b) return;
      if (b.dataset.sy === "now") sync();
      if (b.dataset.sy === "send") {
        const url = (ON_WEB ? ARTI : WEB) + "#sync=" + await pack(readLocal());
        const w = window.open(url, "_blank", "noopener"); if (!w) location.href = url;
      }
      if (b.dataset.sy === "off") { try { localStorage.removeItem(KG); } catch (x) {} backends.splice(backends.indexOf(ghBackend), 1); delete state.github; paint(); fillPanel(); }
      if (b.dataset.sy === "on") {
        const v = (document.getElementById("sy-tok").value || "").trim(); if (!v) return;
        wr(KG, {token: v}); setupGithub(); fillPanel(); await sync(); fillPanel();
      }
    });
    paint();
  });
  document.head.insertAdjacentHTML("beforeend", `<style>
.sybtn{flex:none;margin-left:10px;background:none;border:1px solid var(--line,#5a4a36);border-radius:2px;color:var(--muted,#a39580);padding:4px 7px;cursor:pointer;position:relative;line-height:0}
.sybtn::after{content:"";position:absolute;right:3px;bottom:3px;width:7px;height:7px;border-radius:50%;background:#6b6255}
.sybtn[data-st="ok"]{color:var(--gold2,#e8cf8f)}.sybtn[data-st="ok"]::after{background:var(--good,#8fd16a)}
.sybtn[data-st="err"]::after{background:var(--bad,#e2665a)}.sybtn[data-st="busy"]::after{background:var(--gold,#c9a45c)}
.sypanel{position:fixed;z-index:60;top:58px;right:12px;width:min(380px,calc(100vw - 32px));padding:14px 16px;font-size:14px}
.sypanel h3{font-size:18px;margin-bottom:6px}.sypanel h4{margin:12px 0 4px;color:var(--gold2,#e8cf8f);font-weight:600}
.sypanel p{margin:6px 0}.sypanel a{color:var(--gold2,#e8cf8f)}
.sy-row{display:flex;gap:8px;align-items:center;margin:4px 0;flex-wrap:wrap}
.sy-dot{width:8px;height:8px;border-radius:50%;background:#6b6255}.sy-dot[data-ok="true"]{background:var(--good,#8fd16a)}.sy-dot[data-ok="false"]{background:var(--bad,#e2665a)}
.sy-ok{color:var(--good,#8fd16a);margin:0 0 6px}
.sy-btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.sy-btns input{flex:1;min-width:0;background:#0e0c0a;border:1px solid var(--line,#5a4a36);color:var(--text,#e6dccb);padding:6px 8px;font:inherit}
.sy-btns button{background:#2a2116;border:1px solid var(--line,#5a4a36);color:var(--gold2,#e8cf8f);padding:6px 10px;cursor:pointer;font:inherit}
</style>`);

  // al volver a la pestaña y cada minuto mientras está visible (GitHub no avisa de cambios)
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
  setInterval(() => { if (document.visibilityState === "visible" && backends.includes(ghBackend)) sync(); }, 60000);

  // ---------- enlace #sync=… (JSON comprimido con deflate-raw, base64url) ----------
  async function pack(m) {
    const bytes = new TextEncoder().encode(JSON.stringify(m));
    let out = bytes;
    if (window.CompressionStream) out = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
    let bin = ""; for (let i = 0; i < out.length; i += 8192) bin += String.fromCharCode.apply(null, out.subarray(i, i + 8192));
    return (window.CompressionStream ? "z" : "j") + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function unpack(s) {
    const bin = atob(s.slice(1).replace(/-/g, "+").replace(/_/g, "/")), bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const raw = s[0] === "z" ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer() : bytes;
    return JSON.parse(new TextDecoder().decode(raw));
  }
  const incoming = /^#sync=([A-Za-z0-9_-]+)$/.exec(location.hash || "");
  if (incoming) {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}  // que no lo lea el enrutado de builds
    unpack(incoming[1]).then(r => {
      const l = readLocal(), m = merge(l, r), n = (r.skill || []).length + (r.army || []).length;
      writeLocal(m); refresh(); sync();
      const tell = () => { if (btn) { panel.hidden = false; fillPanel(); panel.insertAdjacentHTML("afterbegin", `<p class="sy-ok">${T(`Recibidos ${n} guardados y mezclados con los de aquí.`, `Received ${n} saved items and merged them with these.`)}</p>`); } };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(tell, 300)); else setTimeout(tell, 300);
    }).catch(() => {});
  }

  readLocal();
  setupGithub(); if (backends.length) sync();
  setupArtifact();
})();
