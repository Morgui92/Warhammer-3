// Carga por partes: las imágenes (retratos, cartas de unidad e iconos de habilidad) van en img/<subcultura>.js
// (herramientas/trocear.py) y se piden al abrir una facción, en vez de cargar los ~9 MB al entrar.
// Usa <script> en vez de fetch para que siga funcionando al abrir index.html desde el disco (file://).
window.WH3RETRATOS = {img: [], a: {}};
window.WH3UNIMG = {img: [], u: {}};
window.WH3SKICONS = {img: [], a: {}};
(() => {
  const add = (store, map, c, part) => { for (const [k, i] of Object.entries(c[part] || {})) if (map[k] === undefined) map[k] = store.img.push(c.img[i]) - 1; };
  window.WH3ADD = c => {
    add(WH3RETRATOS, WH3RETRATOS.a, c, "p");
    add(WH3UNIMG, WH3UNIMG.u, c, "u");
    add(WH3SKICONS, WH3SKICONS.a, c, "s");
  };
  const got = {}, pending = {};
  window.WH3HAS = sc => !!got[sc];
  window.WH3NEED = sc => {
    if (!sc || got[sc]) return Promise.resolve();
    return pending[sc] || (pending[sc] = new Promise(res => {
      const s = document.createElement("script");
      s.src = "img/" + sc + ".js";
      s.onload = () => { got[sc] = true; res(); };
      s.onerror = () => { got[sc] = true; res(); };  // sin imágenes la página sigue funcionando
      document.head.appendChild(s);
    }));
  };
})();
