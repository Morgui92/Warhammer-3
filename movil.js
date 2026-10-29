// Versión móvil (pantallas de hasta 760 px): cabecera compacta que se esconde al bajar, fichas como hoja inferior
// (detalle de habilidad, ficha del ejército y de la pestaña Unidades), toque en el árbol = ver y otro toque = añadir,
// formación que cabe entera en la pantalla y huecos del ejército en 7 columnas.
// Va al final de index.html: usa S, renderTree, renderDetail y show del script principal.
"use strict";
(function () {
  const mq = window.matchMedia("(max-width:760px)"), EN = window.WH3LANG === "en";
  const T = (es, en) => EN ? en : es;
  const SHEETS = "#detail, #a-stats, #u-stats";

  // al final del body: va detrás del <style> de index.html y del que inyecta ejercito.js
  document.body.insertAdjacentHTML("beforeend", `<style>
@media (max-width:760px){
  main>section:not([hidden]){animation-fill-mode:backwards}  /* sin transform fijo: si no, las hojas fijas se colocan respecto a la sección */
  header.top{transition:transform .22s ease}
  header.top.mhide{transform:translateY(-100%)}
  header.top .wrap{gap:6px 8px;padding-block:6px}
  .brand{font-size:16px}.brand::before{width:15px;height:15px}
  .patch{font-size:9px}
  .langsw{margin-left:0}.langsw button{padding:5px 8px}
  .crumbs{font-size:12px}
  #gq{padding-block:7px}
  main.wrap{padding-inline:10px}
  /* árbol */
  .treescroll{max-height:calc(100dvh - 120px)}
  .tbar .zoom button{width:36px;height:32px;font-size:18px}
  .tbar .mhint{font-size:12px;color:var(--muted)}
  #detail:not(.mopen){display:none}
  .sheet .sgrid,.sheet .lstats .sgrid{grid-template-columns:repeat(3,minmax(0,1fr))}
  /* hojas inferiores */
  .mopen{position:fixed!important;left:0;right:0;bottom:0;top:auto!important;z-index:40;max-height:62dvh!important;overflow:auto!important;margin:0!important;
    border-radius:10px 10px 0 0;padding:26px 14px calc(14px + env(safe-area-inset-bottom,0px))!important;background:#1a1511!important;
    box-shadow:0 -10px 30px #000c,inset 0 1px 0 #c9a45c55!important;animation:msheet .2s ease-out;display:grid}
  .mopen::before{content:"";position:absolute;top:8px;left:50%;width:42px;height:4px;margin-left:-21px;border-radius:2px;background:#5a4a36}
  @keyframes msheet{from{transform:translateY(40px);opacity:.4}}
  #mclose{position:fixed;right:10px;z-index:41;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:#2a2116;color:var(--gold2);font-size:18px;line-height:1;cursor:pointer}
  #mback{position:fixed;inset:0;z-index:39;background:#0007}
  #a-stats:not(.mopen),#u-stats:not(.mopen){display:none}
  .utab{display:block}
  /* ejército */
  .roster{max-height:48dvh}
  .slots{grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
  .slot{min-height:0;padding:2px;gap:1px}
  .slot .ucard,.slot img.crest.full{width:100%;height:auto;aspect-ratio:56/121}
  .slot .crest:not(img){width:100%;height:auto;aspect-ratio:1}
  .slot.empty{aspect-ratio:46/100}
  .slot.empty.lord span{font-size:9px}
  .slot .sn{font-size:9px}
  .slot .sc{font-size:8px;top:2px;left:2px}
  .slot .rm{width:22px;height:22px;line-height:22px;top:0;right:0}
  .fieldwrap{--cw:calc((100vw - 58px) / 17);--ch:calc(var(--cw) * 2.17);overflow:visible}
  .front,.rear{font-size:11px}
  .tok{width:calc(var(--cw) - 2px);height:calc(var(--ch) - 4px);border-width:1px}
  .tok em{display:none}
  .tray .tok{width:30px;height:65px}
  .abox:has(#a-field) .fhd>.muted{display:none}
  .abox:has(#a-field) .fhd::after{content:"${T("Toca una carta de la reserva y luego una casilla, o arrástrala. Para quitarla del ejército, la ✕ de su carta.", "Tap a card in the reserve, then a square, or drag it. To remove it from the army, use the ✕ on its card.")}";font-size:13px;color:var(--muted);flex-basis:100%}
}
</style>`);

  // ---------- hojas inferiores ----------
  let open = null;
  const btn = document.createElement("button"); btn.id = "mclose"; btn.hidden = true; btn.textContent = "✕";
  btn.setAttribute("aria-label", T("Cerrar ficha", "Close"));
  const back = document.createElement("div"); back.id = "mback"; back.hidden = true;
  document.body.append(back, btn);
  function place() {  // la ✕ va sobre el borde de la hoja
    if (!open) return;
    btn.style.bottom = Math.max(0, open.getBoundingClientRect().height - 18) + "px";
  }
  function openSheet(el, dim) {
    if (!mq.matches || !el) return;
    if (open && open !== el) open.classList.remove("mopen");
    open = el; el.classList.add("mopen"); el.scrollTop = 0;
    btn.hidden = false; back.hidden = !dim;
    requestAnimationFrame(place);
  }
  function closeSheet() {
    if (open) open.classList.remove("mopen");
    open = null; btn.hidden = true; back.hidden = true;
  }
  btn.onclick = closeSheet; back.onclick = closeSheet;
  window.addEventListener("resize", () => { if (!mq.matches) closeSheet(); else place(); });
  new MutationObserver(() => {  // al repintar la ficha cambia su altura; si la quitan del documento, se cierra
    if (open && !open.isConnected) closeSheet(); else place();
  }).observe(document.body, {childList: true, subtree: true});
  if (typeof show === "function") { const sh = show; show = function (...a) { closeSheet(); return sh.apply(this, a); }; }
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

  // árbol: el primer toque en una habilidad la selecciona y abre su ficha; otro toque en la misma añade un punto
  const rows = document.getElementById("rows");
  rows.addEventListener("click", e => {
    if (!mq.matches) return;
    const b = e.target.closest("[data-j]"); if (!b) return;
    const j = +b.dataset.j, det = document.getElementById("detail");
    if (S.sel === j && open === det) return;  // segundo toque: lo atiende index.html (añadir punto)
    e.stopPropagation();
    S.sel = j; renderTree(); renderDetail(); openSheet(det, false);
  }, true);
  rows.addEventListener("contextmenu", e => { if (mq.matches && e.target.closest("[data-j]")) e.stopPropagation(); }, true);  // pulsación larga: sin quitar puntos a ciegas
  const tbar = document.querySelector(".tree .tbar");
  if (tbar) tbar.insertAdjacentHTML("afterbegin", `<span class="mhint">${T("Toca: ver · Otra vez: +1 punto", "Tap: details · Again: +1 point")}</span>`);
  // zoom inicial más pequeño en el móvil si no se ha elegido otro
  try { if (mq.matches && !localStorage.getItem("wh3-tree-zoom-m")) { const z = document.getElementById("zout"); z.click(); z.click(); localStorage.setItem("wh3-tree-zoom-m", "1"); } } catch (e) {}

  // ejército y pestaña Unidades: tocar una fila, una carta del ejército o una unidad abre su ficha abajo
  document.addEventListener("click", e => {
    if (!mq.matches || !e.target.closest) return;
    if (e.target.closest("button.add, [data-au], [data-ah], [data-al], [data-rm], [data-bedit], [data-tree]")) return;
    if (e.target.closest("#a-list [data-su], #a-list [data-sa], #a-slots .slot[data-sid]")) {
      setTimeout(() => openSheet(document.getElementById("a-stats"), true), 0);  // tras repintar la ficha
    } else if (e.target.closest("#chars [data-uk], #chars [data-uc]")) {
      openSheet(document.getElementById("u-stats"), true);
    }
  }, true);

  // cabecera: se esconde al bajar y vuelve al subir
  const hdr = document.querySelector("header.top"); let lastY = scrollY;
  window.addEventListener("scroll", () => {
    const y = scrollY, dy = y - lastY; lastY = y;
    if (!mq.matches || Math.abs(dy) < 4) return;
    const busy = document.activeElement && document.activeElement.id === "gq";
    hdr.classList.toggle("mhide", dy > 0 && y > 140 && !busy);
  }, {passive: true});
  document.addEventListener("focusin", e => { if (e.target.id === "gq") hdr.classList.remove("mhide"); });
})();
