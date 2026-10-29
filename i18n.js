// Idioma del simulador: español (textos oficiales de local_sp.pack, datos_es.js / ejercitos_es.js) o inglés
// (textos del volcado, datos.js / ejercitos.js). La interfaz está escrita en español en index.html y ejercito.js;
// en inglés este archivo traduce lo que se pinta (nodos de texto y atributos) con el diccionario de abajo.
// Va antes que el resto de scripts: elige qué archivos de datos cargar y pone el botón ES / EN en la cabecera.
"use strict";
(function () {
  const KEY = "wh3-lang";
  let lang = "es";
  try { lang = localStorage.getItem(KEY) || lang; } catch (e) {}
  const wn = /(?:^|;)wh3-lang=(es|en)/.exec(window.name || ""); if (wn) lang = wn[1];  // por si no hay localStorage
  const q = /[?&]lang=(es|en)/.exec(location.search); if (q) lang = q[1];
  if (lang !== "en") lang = "es";
  window.WH3LANG = lang;
  document.documentElement.lang = lang;
  const sfx = lang === "en" ? "" : "_es";
  document.write(`<script src="datos${sfx}.js"><\/script><script src="ejercitos${sfx}.js"><\/script>`);

  window.setLang = function (l) {
    if (l === lang) return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    try { window.name = (window.name || "").replace(/(?:^|;)wh3-lang=(es|en)/, "") + ";wh3-lang=" + l; } catch (e) {}
    location.reload();
  };

  // ---------- botón en la cabecera ----------
  document.addEventListener("DOMContentLoaded", () => {
    const host = document.querySelector("header.top .wrap"); if (!host) return;
    const b = document.createElement("div");
    b.className = "langsw"; b.setAttribute("role", "group"); b.setAttribute("aria-label", lang === "en" ? "Language" : "Idioma");
    b.innerHTML = `<button data-l="es" aria-pressed="${lang === "es"}" title="Español">ES</button><button data-l="en" aria-pressed="${lang === "en"}" title="English">EN</button>`;
    b.addEventListener("click", e => { const x = e.target.closest("[data-l]"); if (x) window.setLang(x.dataset.l); });
    host.appendChild(b);
  });
  document.head.insertAdjacentHTML("beforeend", `<style>
.langsw{display:flex;flex:none;border:1px solid var(--line,#5a4a36);border-radius:2px;overflow:hidden;margin-left:10px}
.langsw button{background:none;border:0;color:var(--muted,#a39580);font:600 12px/1 var(--body,inherit);letter-spacing:.06em;padding:6px 9px;cursor:pointer}
.langsw button[aria-pressed="true"]{background:#2a2116;color:var(--gold2,#e8cf8f)}
.langsw button+button{border-left:1px solid var(--line,#5a4a36)}
</style>`);

  if (lang !== "en") return;

  // ---------- interfaz en inglés ----------
  const W = {
    "Árbol de Habilidades WH3": "WH3 Skill Tree", "Árbol de Habilidades": "Skill Tree", "Navegación": "Navigation",
    "Elige facción": "Choose a faction", "Buscar facción, raza, señor o héroe…": "Search faction, race, lord or hero…",
    "Facciones": "Factions", "Señores": "Lords", "Héroes": "Heroes", "Unidades": "Units", "Ejército": "Army",
    "Clic: añadir punto": "Click: add point", "Clic derecho: quitar": "Right-click: remove", "Arrastrar: moverse": "Drag: pan", "Ctrl + rueda: zoom": "Ctrl + wheel: zoom",
    "Alejar": "Zoom out", "Acercar": "Zoom in", "Clic: añadir punto · Clic derecho: quitar": "Click: add point · Right-click: remove",
    "Las siguientes unidades recibirán bonificaciones de esta habilidad:": "The following units will receive bonuses from this skill:",
    "Puntos necesarios en este grupo": "Points needed in this group", "Edificios": "Buildings", "Formas de conseguirla": "Ways to obtain it",
    "Pasa el ratón por una habilidad para ver su ficha, como en el juego. Al hacer clic se invierte un punto y aquí aparecen todos los detalles: requisitos, unidades afectadas y la ficha completa de los hechizos.": "Hover a skill to see its tooltip, as in the game. Clicking spends a point and shows every detail here: requirements, affected units and the full spell cards.", "Arrastrar: moverse por el árbol": "Drag: pan the tree", "Clic derecho o botón −: quitar": "Right-click or − button: remove",
    "puntos necesarios en las anteriores": "points needed in the previous skills", "nivel necesario": "rank required",
    "Señor": "Lord", "Campeón": "Champion", "Dignatario": "Dignitary", "Ingeniero": "Engineer", "Espía": "Spy", "Hechicero": "Wizard", "Herrero rúnico": "Runesmith",
    "Personaje": "Character", "Batalla": "Battle", "Campaña": "Campaign", "Otras": "Other", "Hechizos": "Spells", "Combate": "Combat",
    "Pasiva": "Passive", "Curación": "Healing", "Ataques mágicos": "Magical attacks", "Ataques de fuego": "Flaming attacks",
    "Efectos de facción": "Faction effects", "El juego no lista efectos de facción para esta facción.": "The game lists no faction effects for this faction.",
    "Mecánicas": "Mechanics", "Legendario": "Legendary", "Mago": "Spellcaster", "Confederación": "Confederation", "Por confederación": "By confederation",
    "Señor legendario de la facción": "Faction legendary lord", "Señores genéricos": "Generic lords", "Héroes legendarios": "Legendary heroes", "Héroes genéricos": "Generic heroes", "Señores legendarios": "Legendary lords",
    "Señores legendarios de otras facciones que se consiguen al absorberlas (diplomacia, rituales o misiones, según la raza).": "Legendary lords of other factions, gained by absorbing them (diplomacy, rituals or missions, depending on the race).",
    "Esta facción no tiene señores con árbol de habilidades.": "This faction has no lords with a skill tree.",
    "Esta facción no tiene héroes con árbol de habilidades.": "This faction has no heroes with a skill tree.",
    "Bhashiva y Zhao Ming no pueden confederarse entre sí.": "Bhashiva and Zhao Ming cannot confederate each other.",
    "Con jugador de Altos Elfos, los señores legendarios solo se absorben con el Patronazgo de los reinos (rituales de unidad de la corte).": "When playing High Elves, legendary lords are only absorbed through kingdom Patronage (court unity rituals).",
    "Con jugador enano, los señores legendarios se absorben con los rituales del Libro de los Agravios.": "When playing Dwarfs, legendary lords are absorbed through the Book of Grudges rituals.",
    "Drycha y Durthu solo pueden confederarse entre ellos.": "Drycha and Durthu can only confederate each other.",
    "En los Guerreros del Caos solo Archaon y Be'lakor pueden confederar; esta facción no.": "Among the Warriors of Chaos only Archaon and Be'lakor can confederate; this faction cannot.",
    "Esta raza no puede confederar otras facciones.": "This race cannot confederate other factions.",
    "Nagash los consigue con los rituales de Mortarcas (aunque sean de otra raza).": "Nagash gets them through the Mortarch rituals (even from other races).",
    "Settra y Arkhan no se pueden confederar; Khalida y Khatep sí (derrotándolos o con el Culto Mortuorio).": "Settra and Arkhan cannot be confederated; Khalida and Khatep can (by defeating them or through the Mortuary Cult).",
    "Sin diplomacia: se absorben ocupando su asiento en la Torre de Zharr.": "No diplomacy: they are absorbed by taking their seat in the Tower of Zharr.",
    "Solo al tomar el último asentamiento de otra facción de los Guerreros del Caos (Imponer confederación).": "Only by taking the last settlement of another Warriors of Chaos faction (Force confederation).",
    "Rasgo de reclutamiento:": "Recruitment trait:", "Rasgo de reclutamiento": "Recruitment trait", "sin elegir": "none chosen", "Sin rasgo": "No trait",
    "Al reclutarlo eliges uno de estos rasgos; solo el elegido se suma a sus efectos.": "When recruited you pick one of these traits; only the chosen one adds to its effects.",
    "Evoluciona a": "Evolves into", "Efectos de facción y mecánicas": "Faction effects and mechanics", "Cargando datos del juego…": "Loading game data…", "Evoluciona de:": "Evolves from:", "Solo informativos": "For reference only", "Sin árbol": "No skill tree", "Señor inicial: sin coste": "Starting lord: no cost", "Inicial": "Starting", "Señor inicial de la facción: no se paga": "The faction's starting lord: not paid for", "Evolución": "Evolution",
    "Aparecen en el juego pero el juego no les da árbol de habilidades, así que solo se muestra su carta.": "They appear in the game, but the game gives them no skill tree, so only their card is shown.",
    "Dudosa: sin permiso de reclutamiento": "Doubtful: no recruitment permission", "· Al liderar un ejército": "· When leading an army",
    "Nivel del personaje": "Character rank", "Sube con cada punto que repartes": "Rises with every point you spend",
    "Copiar enlace": "Copy link", "Reiniciar": "Reset", "Guardar": "Save", "Buscar personaje, unidad, facción o habilidad…": "Search character, unit, faction or skill…", "Buscar en todo el simulador": "Search the whole simulator", "Resultados": "Results", "Facción": "Faction", "Unidad": "Unit", "Habilidad": "Skill", "Sin resultados.": "No results.", "Ir al árbol ↓": "Go to tree ↓", "Vaciar": "Clear", "Enlace de la build": "Build link", "Enlace del ejército": "Army link",
    "Mis builds (este navegador)": "My builds (this browser)", "Mis ejércitos (este navegador)": "My armies (this browser)",
    "Efectos del señor": "Lord effects", "Efectos del personaje": "Character effects", "Sin efectos listados.": "No effects listed.",
    "Gastados": "Spent", "Restantes": "Remaining", "Borrar": "Delete",
    "Enlace copiado. Ábrelo para cargar esta build.": "Link copied. Open it to load this build.", "Copia el enlace seleccionado.": "Copy the selected link.",
    "Build guardada en este navegador.": "Build saved in this browser.", "Aún no has guardado ninguna.": "You have not saved any yet.",
    "Nivel necesario": "Rank required", "Puntos necesarios en las habilidades anteriores": "Points needed in the previous skills", "Gratis": "Free",
    "Bombardeo": "Bombardment", "Vórtice": "Vortex", "Daño directo": "Direct damage", "Proyectiles mágicos": "Magic missiles", "Proyectil mágico": "Magic missile", "Viento": "Wind",
    "Potenciación de área": "Area of augments", "Potenciación": "Augment", "Maleficio de área": "Area of hexes", "Maleficio": "Hex", "Aliento": "Breath", "Regeneración": "Regeneration",
    "Invocación": "Summon", "Potenciación de los vientos": "Augment of the winds", "Regeneración de área": "Area of regeneration", "Daño directo de área": "Area of direct damage",
    "Resucita caídos": "Resurrects the fallen", "No puede moverse": "Cannot move", "Explosión:": "Explosion:", "Invoca:": "Summons:", "Objetivo:": "Target:", "Proyectil": "Projectile",
    "Vientos": "Winds", "Recarga": "Cooldown", "Duración": "Duration", "Alcance": "Range", "Radio de efecto": "Effect radius", "Usos": "Uses", "Prob. de fallo": "Miscast chance", "Preparación": "Wind-up",
    "Ver con": "Show with", "Ficha del hechizo": "Spell card",
    "Valores en verde o rojo: cambiados por los puntos invertidos en esta habilidad; tachado, el valor base.": "Values in green or red: changed by the points spent in this skill; struck through, the base value.",
    "Detalles de la habilidad": "Skill details",
    "Pasa el ratón o toca una habilidad para ver qué hace, sus requisitos y a qué unidades afecta. Haz clic para invertir un punto, como en el juego.": "Hover or tap a skill to see what it does, its requirements and which units it affects. Click to spend a point, as in the game.",
    "Necesita un objeto o misión para desbloquearse en campaña": "Needs an item or quest to unlock in the campaign",
    "+ Añadir punto": "+ Add point", "− Quitar punto": "− Remove point", "Sin efectos visibles": "No visible effects", "Unidades:": "Units:",
    "Efectos de la build": "Build effects", "Aún no hay puntos invertidos.": "No points spent yet.", "Unidades potenciadas": "Buffed units",
    "×N = número de habilidades y efectos que la mejoran (pasa el ratón para verlos).": "×N = number of skills and effects that improve it (hover to see them).",
    "Ni las habilidades elegidas ni los efectos del señor o de la facción mejoran unidades concretas.": "Neither the chosen skills nor the lord or faction effects improve specific units.", "Habilidades activas y pasivas": "Active and passive abilities",
    "Infantería cuerpo a cuerpo": "Melee infantry", "Infantería a distancia": "Missile infantry", "Infantería monstruosa": "Monstrous infantry",
    "Caballería cuerpo a cuerpo": "Melee cavalry", "Caballería a distancia": "Missile cavalry", "Caballería monstruosa": "Monstrous cavalry", "Carros": "Chariots",
    "Bestias de guerra": "War beasts", "Monstruos": "Monsters", "Máquinas de guerra": "War machines", "Héroe": "Hero",
    "Física": "Physical", "Proyectiles": "Missile", "Mágica": "Magic", "Fuego": "Fire", "Salvaguarda": "Ward save", "Mágico": "Magical",
    "Ejército guardado en este navegador.": "Army saved in this browser.", "Ejército actualizado en este navegador.": "Army updated in this browser.", "Guardar cambios": "Save changes", "Nuevo ejército": "New army", "Guardar como…": "Save as…", "Copia guardada como ejército nuevo.": "Copy saved as a new army.", "Guarda una copia como ejército nuevo; el original no cambia": "Saves a copy as a new army; the original stays as it is", "Lo añade a «Mis ejércitos»": "Adds it to «My armies»", "Ejército nuevo: al guardarlo se añadirá a «Mis ejércitos».": "New army: saving it will add it to «My armies».", "Aún no has guardado ningún ejército.": "You have not saved any army yet.",
    "Buscar…": "Search…", "Nombre del ejército": "Army name", "Formación": "Formation",
    "Arrastra al campo cualquier unidad del ejército, de la reserva de abajo o de la lista de la izquierda (o tócala y luego toca una casilla). Desde la lista de la izquierda también puedes soltarla en el ejército, o hacer doble clic, para añadirla sin colocarla. Arrastra las cartas del ejército entre sí para cambiar su orden. Arrastrarla fuera del campo o hacer clic derecho en ella la devuelve a la reserva; para quitarla del ejército, clic derecho en la reserva, en su carta o la ✕.": "Drag any unit from the army, the reserve below or the list on the left onto the field (or tap it, then tap a cell). From the list on the left you can also drop it on the army, or double-click it, to add it without placing it. Drag the army cards onto each other to reorder them. Dragging it off the field or right-clicking it sends it back to the reserve; to remove it from the army, right-click it in the reserve, right-click its card or use the ✕.",
    "▲ Frente · enemigo ▲": "▲ Front · enemy ▲", "Retaguardia": "Rear",
    "Enlace copiado. Ábrelo para cargar este ejército.": "Link copied. Open it to load this army.",
    "Todas": "All", "Renombre": "Renown", "Regimientos de Renombre": "Regiments of Renown", "Regimiento de Renombre": "Regiment of Renown",
    "Reserva de provincia": "Province pool", "Mejora de unidad": "Unit upgrade", "Encuentros con dragones": "Dragon encounters",
    "Se recluta por esta mecánica, no en edificios": "Recruited through this mechanic, not in buildings",
    "Regimiento de Renombre: solo uno": "Regiment of Renown: only one", "No cabe: el ejército ya tiene sus 20 huecos ocupados.": "No room: all 20 army slots are taken.", "No cabe.": "No room.", "El juego no le da árbol de habilidades": "The game gives it no skill tree", "Añadir": "Add", "Elige un señor": "Choose a lord",
    "Huecos": "Slots", "Reclutamiento": "Recruitment", "Mantenimiento": "Upkeep",
    "Ataques mágicos: su daño es mágico. La resistencia mágica del enemigo lo reduce y daña por completo a las unidades etéreas, que ignoran casi todo el daño no mágico.": "Magical attacks: its damage is magical. The enemy's magic resistance reduces it, and it fully damages ethereal units, which ignore almost all non-magical damage.",
    "Ataques de fuego: su daño es de fuego. La resistencia al fuego del enemigo lo reduce y las unidades vulnerables al fuego reciben más daño.": "Flaming attacks: its damage is fire damage. The enemy's fire resistance reduces it, and units vulnerable to fire take more damage.",
    "Sin estadísticas en la base de datos.": "No stats in the database.", "daño base + perforante": "base damage + armour-piercing",
    "Hombres": "Men", "Vida": "Health", "Armadura": "Armour", "Liderazgo": "Leadership", "Vel. (vuelo)": "Speed (flying)", "Velocidad": "Speed",
    "Ataque c/c": "Melee attack", "Defensa c/c": "Melee defence", "Carga": "Charge bonus", "Fuerza arma": "Weapon strength", "Bonus vs grandes": "Bonus vs large",
    "Bonus vs inf.": "Bonus vs infantry", "Escudo": "Shield", "Munición": "Ammunition", "Coste": "Cost", "Mantenim.": "Upkeep", "Turnos": "Turns",
    "Efectos de sus ataques": "Attack effects", "(pasa el ratón o toca para ver qué hacen)": "(hover or tap to see what they do)",
    "Cuerpo a cuerpo": "Melee", "A distancia": "Ranged", "Resistencias": "Resistances", "Atributos": "Attributes", "Habilidades": "Abilities", "Ficha": "Stats",
    "Toca una unidad, un señor o un héroe para ver sus estadísticas (tamaño Ultra, sin veteranía ni habilidades).": "Tap a unit, lord or hero to see its stats (Ultra size, no veterancy or skills).",
    "Toca un señor, un héroe o una unidad para ver sus estadísticas base (tamaño Ultra, sin veteranía ni habilidades).": "Tap a lord, hero or unit to see its base stats (Ultra size, no veterancy or skills).",
    "Ver árbol de habilidades": "View skill tree", "No he encontrado unidades reclutables para esta facción.": "No recruitable units found for this faction.",
    "Todas las unidades están en el campo.": "All units are on the field.", "Añade unidades al ejército para colocarlas.": "Add units to the army to place them.",
    "Nada coincide.": "Nothing matches.", "Esta facción no tiene señores reclutables.": "This faction has no recruitable lords.", "Esta facción no tiene héroes reclutables.": "This faction has no recruitable heroes.",
    "No cabe: el ejército ya tiene 20 huecos ocupados o esa unidad de renombre ya está.": "It does not fit: the army already has 20 slots filled, or that renowned unit is already in it.",
    "• (el juego no detalla más efectos para esta fase)": "• (the game gives no further effects for this phase)",
    "Hoja del personaje": "Character sheet", "Res. física": "Physical res.", "Res. proyectiles": "Missile res.", "Res. mágica": "Magic res.",
    "Res. fuego": "Fire res.", "Daño proyectil": "Missile damage", "Tiempo de recarga": "Reload time", "Montura:": "Mount:",
    "Tamaño Ultra. Suma lo que mejora al propio personaje (habilidades, rasgos y efectos); no cuenta objetos, veteranía ni mejoras al ejército. Pasa el ratón por una cifra para ver de dónde sale.": "Ultra size. Adds what improves the character itself (skills, traits and effects); items, veterancy and army buffs are not counted. Hover a value to see where it comes from.",
    "Language": "Language", "Idioma": "Language",
  };
  const TG = {"uno mismo": "self", "aliados": "allies", "enemigos": "enemies", "suelo": "ground", "todos": "all"};
  const tgList = s => s.split(", ").map(x => TG[x] || x).join(", ");
  const TGRE = "((?:uno mismo|aliados|enemigos|suelo|todos)(?:, (?:uno mismo|aliados|enemigos|suelo|todos))*)";
  const AG = "(Señor|Campeón|Dignatario|Ingeniero|Espía|Hechicero|Herrero rúnico)";
  const pl = (n, one, many) => +n === 1 ? one : many;
  // patrones con números o nombres dentro; se prueban en orden si la frase no está entera en W
  const R = [
    [/^Nivel (\d+)$/, "Rank $1"], [/^\(nivel (\d+)\)$/, "(rank $1)"],
    [/^Parche (.+)$/, (m, v) => "Patch " + v],
    [/^Simulador v(\S+) · Parche (.+)$/, (m, a, v) => `Simulator v${a} · Patch ${v}`],
    [/^(\d+) facciones$/, (m, n) => `${n} factions`],
    [/^(\d+) Señores · (\d+) Héroes$/, (m, a, b) => `${a} Lords · ${b} Heroes`],
    [/^Nada coincide con “(.*)”\.$/, (m, x) => `Nothing matches “${x}”.`],
    [new RegExp("^" + AG + " · "), (m, a) => W[a] + " · "],
    [/^Ejército · /, () => "Army · "],
    [/ · Solo unidades que esta facción puede reclutar en campaña \(Immortal Empires, un jugador\)$/, () => " · Only units this faction can recruit in the campaign (Immortal Empires, single-player)"],
    [/^Señores, héroes y las (\d+) unidades que (.+) puede reclutar en campaña \(un jugador\): edificios de la facción, sus reservas especiales y sus Regimientos de Renombre\. Toca cualquiera para ver sus estadísticas base\.$/,
      (m, n, f) => `Lords, heroes and the ${n} units that ${f} can recruit in the campaign (single-player): the faction's buildings, its special pools and its Regiments of Renown. Tap any of them to see its base stats.`],
    [/^Unidades de la raza que no he podido ubicar en ninguna facción \((\d+)\)$/, (m, n) => `Units of this race I could not place in any faction (${n})`],
    [/ \[solo batalla personalizada\]$/, () => " [custom battle only]"],
    [/ · nivel (\d+) · (\d+) pts$/, (m, r, p) => ` · rank ${r} · ${p} pts`],
    [/^Sin señor · (\d+) unidades$/, (m, n) => `No lord · ${n} units`],
    [/ · (\d+) unidades$/, (m, n) => ` · ${n} units`],
    [/^(✔|✘) Requiere: /, (m, s) => `${s} Requires: `],
    [/^(✔|✘) (\d+) puntos? en: (.*) \((\d+\/\d+)\)$/, (m, s, n, x, h) => `${s} ${n} ${pl(n, "point", "points")} in: ${x} (${h})`],
    [/^✘ Bloqueada por haber elegido /, () => "✘ Locked because you chose "],
    [/^Excluyente con: /, () => "Mutually exclusive with: "],
    [/^Se obtiene gratis al llegar al nivel (\d+)$/, (m, n) => `Granted for free at rank ${n}`],
    [/^(Activo|Al invertir) · Punto (\d+)(?: de (\d+))?/, (m, a, k, t) => `${a === "Activo" ? "Active" : "If spent"} · Point ${k}${t ? " of " + t : ""}`],
    [/^Requiere nivel (\d+)$/, (m, n) => `Requires rank ${n}`],
    [/^(✔|✘) Requiere nivel (\d+)$/, (m, s, n) => `${s} Requires rank ${n}`],
    [/^Hechizo: /, () => "Spell: "],
    [/^Gratis al llegar al nivel (\d+)$/, (m, n) => `Free at rank ${n}`],
    [/^(\S.*) · (\d+)\/(\d+) puntos$/, (m, c, a, b) => `${W[c] || c} · ${a}/${b} points`],
    [/^y (\d+) más$/, (m, n) => `and ${n} more`],
    [/^La sobrecarga se desbloquea con (\d+) puntos en esta habilidad\.$/, (m, n) => `Overcast unlocks with ${n} points in this skill.`],
    [/^(\d+) puntos?( ✓)?$/, (m, n, c) => `${n} ${pl(n, "point", "points")}${c || ""}`],
    [/^Sobrecarga · /, () => "Overcast · "],
    [/ · ligado$/, () => " · bound"],
    [/^Bombardeo \((\d+) proyectil(?:es)?, dispersión (.+) m\)(:?)$/, (m, n, r, c) => `Bombardment (${n} ${pl(n, "projectile", "projectiles")}, spread ${r} m)${c}`],
    [/^Vórtice( ×\d+)?:$/, (m, n) => `Vortex${n || ""}:`],
    [new RegExp("^Afecta a " + TGRE + "( · [\\d.]+ s)?:$"), (m, t, d) => `Affects ${tgList(t)}${d || ""}:`],
    [new RegExp("^([\\d.]+ s · )?" + TGRE + ":$"), (m, d, t) => `${d || ""}${tgList(t)}:`],
    [new RegExp("^" + TGRE + "$"), (m, t) => tgList(t)],
    [/^Daño ([\d.]+)( cada ([\d.]+) s)?( \(hasta (\d+) entidades\))?$/, (m, d, c, f, h, n) => `Damage ${d}${c ? ` every ${f} s` : ""}${h ? ` (up to ${n} entities)` : ""}`],
    [/^Curación ([\d.]+)% de la vida( cada ([\d.]+) s)?$/, (m, v, c, f) => `Heals ${v}% of health${c ? ` every ${f} s` : ""}`],
    [/^Recupera barrera /, () => "Restores barrier "],
    [/^Recarga de habilidades /, () => "Ability cooldowns "],
    [/(\d+) de daño por impacto \((\d+) base \+ (\d+) perforante\)/, (m, a, b, c) => `${a} damage per hit (${b} base + ${c} armour-piercing)`],
    [/(\d+) de daño \((\d+) \+ (\d+) perforante\), radio /, (m, a, b, c) => `${a} damage (${b} + ${c} armour-piercing), radius `],
    [/, velocidad /, () => ", speed "],
    [/ · mágico, de fuego/, () => " · magical, flaming"], [/ · mágico/, () => " · magical"], [/ · de fuego/, () => " · flaming"],
    [/ contra infantería/g, () => " vs infantry"], [/ contra grandes/g, () => " vs large"],
    // línea de una habilidad: «Pasiva · Recarga 30 s · Duración 10 s · Coste 5 vientos · 3 usos»
    [/^(?:Pasiva|Recarga [\d.]+ s|Duración [\d.]+ s|Coste [\d.]+ vientos|\d+ usos)(?: · (?:Recarga [\d.]+ s|Duración [\d.]+ s|Coste [\d.]+ vientos|\d+ usos))*$/,
      m => m.replace("Pasiva", "Passive").replace(/Recarga/, "Cooldown").replace(/Duración/, "Duration").replace(/Coste ([\d.]+) vientos/, "Cost $1 winds").replace(/(\d+) usos/, "$1 uses")],
    [/^No se han cargado (\d+) elementos que esta facción ya no puede reclutar\.$/, (m, n) => `${n} items were not loaded because this faction can no longer recruit them.`],
    [/^([\d.,]+) oro · ([\d.,]+)\/turno$/, (m, a, b) => `${a} gold · ${b}/turn`],
    [/^Añadir (.+)$/, (m, x) => "Add " + x], [/^Elegir (.+)$/, (m, x) => "Choose " + x], [/^Quitar (.+)$/, (m, x) => "Remove " + x],
    [/^(.+): el juego limita esta unidad a (\d+)$/, (m, u, n) => `${u}: the game limits this unit to ${n}`],
    [/^(.+) es un personaje legendario: solo puede haber uno\.$/, (m, x) => `${x} is a legendary character: only one allowed.`],
    [/^(.+) es un Regimiento de Renombre: solo puede haber uno\.$/, (m, x) => `${x} is a Regiment of Renown: only one allowed.`],
    [/^El juego limita (.+) a (\d+) en campaña\.$/, (m, x, n) => `The game limits ${x} to ${n} in campaign.`],
    [/^No se han cargado (\d+) elementos que superaban el límite del juego \(legendarios y renombre: uno; unidades con límite en campaña\)\.$/, (m, n) => `${n} items were not loaded because they exceeded the game's limits (legendary characters and Regiments of Renown: one; units with a campaign cap).`],
    [/^Límite en campaña: según edificios \(sin máximo fijo\)$/, () => "Campaign limit: depends on buildings (no fixed maximum)"],
    [/^Sobrescribe «(.+)»$/, (m, x) => `Overwrites «${x}»`],
    [/^(.+) \(copia\)$/, (m, x) => `${x} (copy)`],
    [/^Límite en campaña: /, () => "Campaign limit: "],
    [/^Se consigue con: (.+)$/, (m, x) => "Obtained through: " + (W[x] || x)],
    [/^(Física|Proyectiles|Mágica|Fuego|Salvaguarda) \d+%(?:, (?:Física|Proyectiles|Mágica|Fuego|Salvaguarda) \d+%)*$/, m => m.replace(/Física|Proyectiles|Mágica|Fuego|Salvaguarda/g, w => W[w])],
    [/^Esta facción no tiene (señores|héroes) (reclutables|con árbol de habilidades)\.$/, (m, a, b) => `This faction has no ${a === "señores" ? "lords" : "heroes"} ${b === "reclutables" ? "to recruit" : "with a skill tree"}.`],
  ];
  // descripción de una fase (data-tip de las fichas de unidad), varias líneas
  function tip(s) {
    return s.split("\n").map(l => W[l] || l
      .replace(/^(.+): el objetivo \(aliado\) sufre durante ([\d.]+) s:$/, "$1: the (allied) target is affected for $2 s:")
      .replace(/^(.+): el objetivo golpeado sufre durante ([\d.]+) s:$/, "$1: the target hit is affected for $2 s:")
      .replace(/^• Pierde ([\d.]+) de vida cada ([\d.]+) s$/, "• Loses $1 health every $2 s")
      .replace(/^• Cura /, "• Heals ")).join("\n");
  }
  function tr(s) {
    if (!s || !/[A-Za-zÁ-ú]/.test(s)) return s;
    const t = s.trim(); if (!t) return s;
    const pre = s.slice(0, s.indexOf(t)), post = s.slice(s.indexOf(t) + t.length);
    if (W[t] !== undefined) return pre + W[t] + post;
    let out = t, hit = false;
    for (const [re, f] of R) { re.lastIndex = 0; if (re.test(out)) { re.lastIndex = 0; out = out.replace(re, f); hit = true; } }
    return hit ? pre + out + post : s;
  }
  window.WH3T = tr;
  const ATTRS = ["placeholder", "title", "aria-label", "data-tip"];
  // «Recarga» es la recarga de un hechizo, salvo en la ficha de una unidad (recarga del arma)
  const trText = c => c.nodeValue.trim() === "Recarga" && c.parentElement && c.parentElement.closest(".ustats") ? c.nodeValue.replace("Recarga", "Reload") : tr(c.nodeValue);
  function fix(root) {
    if (root.nodeType === 3) { const v = trText(root); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 || root.tagName === "SCRIPT" || root.tagName === "STYLE") return;
    const els = [root, ...root.querySelectorAll("*")];
    for (const el of els) {
      for (const a of ATTRS) if (el.hasAttribute(a)) { const v = el.getAttribute(a), n = a === "data-tip" ? tip(v) : tr(v); if (n !== v) el.setAttribute(a, n); }
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
      for (const c of el.childNodes) if (c.nodeType === 3) { const v = trText(c); if (v !== c.nodeValue) c.nodeValue = v; }
    }
  }
  const obs = new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === "attributes") { const v = m.target.getAttribute(m.attributeName); if (v != null) { const n = m.attributeName === "data-tip" ? tip(v) : tr(v); if (n !== v) m.target.setAttribute(m.attributeName, n); } }
      else if (m.type === "characterData") { const v = trText(m.target); if (v !== m.target.nodeValue) m.target.nodeValue = v; }
      else for (const n of m.addedNodes) fix(n);
    }
    if (document.title !== tr(document.title)) document.title = tr(document.title);
  });
  obs.observe(document.documentElement, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS});
  document.addEventListener("DOMContentLoaded", () => { fix(document.body); document.title = tr(document.title); });
})();
