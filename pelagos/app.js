// Las páginas de Pelagos. Todo se arma en el navegador: no hay servidor propio.
import * as N from "./nucleo.js?v=ef1382e339";
import * as A from "./almacen.js?v=ef1382e339";
import * as V from "./videos.js?v=ef1382e339";
import * as NB from "./nube.js?v=ef1382e339";
import * as CL from "./clases.js?v=ef1382e339";
import { abrirPractica } from "./practica.js?v=ef1382e339";
import * as F from "./fondo.js?v=ef1382e339";

const $ = (id) => document.getElementById(id);
const vista = $("vista");

const KWIZIQ = "https://spanish.kwiziq.com/revision/grammar/";
const NIVELES = {
  A0: "Inicial", A1: "Principiante", A2: "Intermedio bajo",
  B1: "Intermedio", B2: "Intermedio alto", C1: "Avanzado",
};
const CATEGORIAS = {
  "Idioms, Idiomatic Usage, and Structures": "Estructuras y modismos",
  "Verbs Tenses & Conjugation": "Verbos: tiempos y conjugación",
  "Prepositions & Conjunctions": "Preposiciones y conjunciones",
  "Adjectives & Adverbs": "Adjetivos y adverbios",
  "Pronouns": "Pronombres",
  "Nouns & Articles": "Sustantivos y artículos",
  "Questions & Interrogatives": "Preguntas",
  "Numbers, Time & Date": "Números, hora y fecha",
  "Negative Words & Constructions": "Negación",
};
// Los mismos tipos de palabra, en corto, para los rótulos del mapa.
const CATEGORIAS_CORTAS = {
  "Idioms, Idiomatic Usage, and Structures": "Estructuras",
  "Verbs Tenses & Conjugation": "Verbos",
  "Prepositions & Conjunctions": "Preposiciones",
  "Adjectives & Adverbs": "Adjetivos",
  "Pronouns": "Pronombres",
  "Nouns & Articles": "Sustantivos",
  "Questions & Interrogatives": "Preguntas",
  "Numbers, Time & Date": "Números",
  "Negative Words & Constructions": "Negación",
};
const GRUPOS = [["antes", "Antes de esta"], ["confunde", "Se confunde con"], ["sigue", "Sigue con"]];
const TIPOS_KWIZ = { lista: "Pelagos Quiz", general: "Quiz general", cuaderno: "Quiz del cuaderno", tema: "Quiz de un tema", tutora: "Práctica con la tutora" };
const QUIZ = "/gramatica/quiz";       // dónde vive el quiz de gramática
// Cada sección trae dos entradas, que van como dos botones arriba de sus páginas.
// Regla del acomodo: cada materia trae cómo se estudia y cómo se ve; lo que es de todo va en el Tablero.
const SECCIONES = {
  tablero: ["Tablero", [["hoy", "#/", "Hoy"], ["clases", "#/clases", "Clases"], ["bitacora", "#/bitacora", "Bitácora"]]],
  gramatica: ["Gramática", [["quiz", "#" + QUIZ, "Quiz"], ["lecciones", "#/gramatica", "Lecciones"], ["atlas", "#/gramatica/atlas", "Atlas"]]],
  vocabulario: ["Vocabulario", [["quiz", "#/vocabulario", "Quiz"], ["agregar", "#/vocabulario/agregar", "Agregar"], ["lista", "#/vocabulario/acervo", "Acervo"]]],
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre"];

// ---------------------------------------------------------------- Lo que la página sabe

let P = null;                 // el paquete de contenido
let E = null;                 // el estado calculado de los sucesos
let porId = new Map();        // tema por número
let porSlug = new Map();      // tema por nombre de lección
let preguntas = new Map();    // pregunta por id
let fotos = new Map();        // portada por nombre (Reef)
let fotosExpanse = new Map(); // portada por nombre (ambiente Expanse; ya no se ofrece en Ajustes, pero las lecciones viejas pueden nombrarlas)
let fotosVocab = new Map();   // fotos de las tarjetas de vocabulario (contenido/img/vocab), prestadas una por tarjeta
let retratos = new Map();     // retrato de Andrea por nombre
// El video de fondo del Tablero (Andrea bailando, por ejemplo): vive en escenas/inicio/ de la rama de avance. null = todavía no se sabe.
let videosFondo = null, videosFondoListos = false;
let tarjetas = new Map();     // tarjeta por id
let enPregunta = false;       // hay una pregunta en pantalla: no se repinta debajo de ti
let turnoDePintar = 0;        // para que una lección que llega tarde no pise otra página
let teclas = null;            // qué hacen las teclas B y M en la pantalla de ahora
let toque = null;             // qué hace un toque en cualquier parte de la pantalla de ahora (destapar una tarjeta)

function ponerPaquete(paquete) {
  P = { ...paquete, enlaces: paquete.enlaces || [], cuadernos: paquete.cuadernos || [], fotos: paquete.fotos || [], tarjetas: paquete.tarjetas || [] };
  porId = new Map(P.temas.map((t) => [t.id, t]));
  porSlug = new Map(P.temas.filter((t) => t.slug && t.leccion).map((t) => [t.slug, t]));
  preguntas = new Map(P.preguntas.map((q) => [q.id, q]));
  fotos = new Map((P.fotos || []).map((f) => [f.nombre, f]));
  fotosExpanse = new Map((P.fotosExpanse || []).map((f) => [f.nombre, f]));
  fotosVocab = new Map((P.fotosVocab || []).map((f) => [f.nombre, f]));
  retratos = new Map((P.retratos || []).map((f) => [f.nombre, f]));
  tarjetas = new Map(P.tarjetas.map((c) => [c.id, c]));
}
function recalcular() {
  if (!P) return;
  E = N.calcular(P, A.sucesos());
  tarjetas = new Map(mazo().map((c) => [c.id, c]));       // con las que agregaste a mano
}
const mazo = () => N.mazo(P, E);                          // todo tu vocabulario: el del contenido y el hecho a mano
const meta = () => (E ? E.parametros.meta : N.META);
const info = (id) => E.temas.get(id) || { pct: null, n: 0, toca: null };

// ---------------------------------------------------------------- Texto

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = N.textoPct;
const titulo = (t) => t.titulo || t.titulo_kwiziq;
const ancho = (v) => Math.max(0, Math.min(100, Number(v) || 0));
/** El color de una barra: verde de 90 para arriba, amarillo de 70 para arriba, rojo abajo de 70. */
const tono = (v) => (v === null || v === undefined ? "" : ancho(v) >= 90 ? " verde" : ancho(v) >= 70 ? " ambar" : " rojo");
const barra = (v, clase = "") => `<span class="bar${clase}${tono(v)}"><i data-w="${ancho(v)}"></i></span>`;
const esBajo = (v) => v !== null && v !== undefined && v < meta();
const plural = (n, uno, muchos) => n + " " + (n === 1 ? uno : muchos);

/** Texto de una lección -> HTML: **negrita**, ==resaltado==, _inglés_ y [[número|enlace a otro tema]]. */
function marca(texto) {
  let s = esc(texto);
  s = s.replace(/\[\[(\d+)\|([^\]]+)\]\]/g, (_, id, dentro) => {
    const t = porId.get(Number(id));
    return `<button type="button" class="lk" data-l="${id}">${dentro}${t ? `<span class="lv">${esc(t.nivel)}</span>` : ""}</button>`;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  s = s.replace(/==(.+?)==/g, "<mark>$1</mark>");
  s = s.replace(/(^|[^\p{L}\p{N}_])_(.+?)_(?![\p{L}\p{N}_])/gu, '$1<span lang="en">$2</span>');
  return s;
}

/** La frase de una pregunta, con el ___ convertido en un hueco visible. */
function hueco(frase) {
  return String(frase ?? "").split(/_{3,}/).map(esc).join('<span class="hole" aria-label="hueco">?</span>');
}

/** 2026-10-09 -> «9 de octubre de 2026». */
function fecha(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !MESES[m - 1] || !d) return "";
  return `${d} de ${MESES[m - 1]} de ${a}`;
}
/** Como «fecha», pero sin el año cuando es de este año: «12 de octubre». */
function fechaCorta(iso) {
  const larga = fecha(iso);
  return iso && iso.slice(0, 4) === String(new Date().getFullYear()) ? larga.replace(/ de \d{4}$/, "") : larga;
}
/** Un momento -> la hora de este aparato: «9 de octubre, 9:41». */
function cuando(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Las dos entradas de una sección, con la de ahora marcada. */
function entradas(seccion, actual) {
  if (seccion === "tablero") return "";      // 22-Oct-2026: sin Hoy · Clases · Bitácora; se llega tocando los cuadros
  const [nombre, lista] = SECCIONES[seccion];
  // Arriba de los botones va el nombre de la materia (su pedido del 22-Oct-2026): Gramática o Vocabulario.
  return `<p class="secTitulo" role="heading" aria-level="2">${esc(nombre)}</p><nav class="jump ${lista.length === 3 ? "tres" : "dos"} sec" aria-label="${nombre}">${lista.map(([clave, href, texto]) =>
    `<a href="${href}"${clave === actual ? ' aria-current="page"' : ""}>${texto}</a>`).join("")}</nav>`;
}

/** Los grupos de contraste (temas que se confunden) en los que está un tema. */
const contrastesDe = (id) => (P.contrastes || []).filter((c) => c.temas.includes(id));

/** Un tema como botón de dos líneas. Con lección, lleva a ella; sin lección, sube la vista previa. */
/** Los temas atascados de ahora, una vez por cálculo (botonTema los pide muchas veces). */
const memoAtascados = new WeakMap();
function temasAtascadosAhora() {
  if (!E) return new Map();
  if (!memoAtascados.has(E)) memoAtascados.set(E, N.temasAtascados(E));
  return memoAtascados.get(E);
}
function botonTema(t, { nivel = true, sub = "", anchoNombre = false, ingles = false } = {}) {
  const i = info(t.id);
  const tb = temasAtascadosAhora().has(t.id) ? "tb atas" : "tb";
  const abre = t.slug && t.leccion ? `<a class="${tb}" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="${tb}" data-l="${t.id}">`;
  const cierra = t.slug && t.leccion ? "</a>" : "</button>";
  const html = abre +
    (nivel ? `<span class="lv">${esc(t.nivel)}</span>` : "") +
    `<span class="nm${anchoNombre ? " ancho" : ""}"${ingles && !t.titulo ? ' lang="en"' : ""}>${esc(titulo(t))}</span>` +
    `<span class="pc${esBajo(i.pct) ? " bajo" : ""}">${pct(i.pct)}</span>` +
    (sub ? `<span class="sm${anchoNombre ? " ancho" : ""}">${sub}</span>` : "") +
    barra(i.pct) + cierra;
  return conBocina(t, html);
}
/** Si la tutora del tema ya tiene voz grabada, el botón del tema lleva junto una bocina que toca su MP3 (nunca la voz del aparato). */
function conBocina(t, html) {
  const tu = tutoraDe(t.id);
  if (!tu || !tieneVoz(t) || mudo()) return html;
  const suena = !!repaso && repaso.sonando === t.id && !repaso.audio.paused;
  return `<div class="tb-voz">${html}<button type="button" class="bocinaVoz" data-repasar="${t.id}" aria-pressed="${suena}" ` +
    `aria-label="${suena ? "Pausa" : "Escuchar a " + esc(nombreCorto(tu))}" title="${suena ? "Pausa" : "Escuchar a " + esc(nombreCorto(tu))}">${ICONO_BOCINA}</button></div>`;
}

// Video completo y loop de la tutora: se revisan solos y las marcas se llenan conforme llegan.
let videosAqui = new Set(), videosRevisados = 0;
/** Si la tutora del tema ya tiene su video completo: en este aparato, o anotado en su ficha (campo `archivo`). */
function tieneVideo(t) { const tu = tutoraDe(t.id); return videosAqui.has(t.id) || !!(tu && tu.archivo); }
/** Si la tutora del tema ya tiene loop subido (escenas/tutora-<tema>/). */
function tieneLoop(t) { return A.leccionesConLoop().has(t.id); }
/** Si la tutora del tema ya tiene su voz grabada (escenas/voz-<tema>/). */
function tieneVoz(t) { return A.leccionesConVoz().has(t.id); }
/** Busca otra vez qué videos hay en este aparato (cada medio minuto como mucho). Si cambió algo, vuelve a pintar la página. */
function revisarVideos() {
  if (Date.now() - videosRevisados < 30000) return;
  videosRevisados = Date.now();
  const donde = window.location.hash;
  V.cuales().then((s) => {
    const cambio = s.size !== videosAqui.size || [...s].some((id) => !videosAqui.has(id));
    videosAqui = s;
    if (cambio && window.location.hash === donde) pintar({ conserva: true });
  }).catch(() => {});
}

/** Cuántas preguntas revisadas (y no retiradas) tiene cada tema. */
function bancoPorTema() {
  const m = new Map();
  for (const q of P.preguntas) if (q.estado === "revisada" && !E.retiradas.has(q.id)) m.set(q.tema, (m.get(q.tema) || 0) + 1);
  return m;
}

/** Las seis marcas de un tema: lección, tutora (con su nombre), video completo, loop, voz y preguntas. Se leen igual con lector de pantalla. */
function marcas(t, banco) {
  const n = banco.get(t.id) || 0;
  const tu = tutoraDe(t.id), nombre = tu ? tu.tutora.split(",")[0] : "";
  const video = tieneVideo(t), loop = tieneLoop(t), voz = tieneVoz(t);
  const una = (si, texto) => `<span class="marca${si ? " si" : ""}">${si ? ICONO_SI : ICONO_NO}${esc(texto)}</span>`;
  const dicho = `Lección: ${t.leccion ? "sí" : "no"}. Tutora: ${nombre || "todavía no"}. Video completo: ${video ? "sí" : "no"}. Loop: ${loop ? "sí" : "no"}. Voz: ${voz ? "sí" : "no"}. Preguntas: ${n ? n : "ninguna"}.`;
  return `<span class="marcas" role="img" aria-label="${esc(dicho)}">${una(!!t.leccion, "Lección")}${una(!!tu, nombre || "Tutora")}${una(video, "Video completo")}${una(loop, "Loop")}${una(voz, "Voz")}${una(n > 0, n ? plural(n, "pregunta", "preguntas") : "Preguntas")}</span>`;
}

// ---------------------------------------------------------------- Poner una página

function ir(camino, reemplazar = false) {
  if (reemplazar) window.location.replace("#" + camino);
  else window.location.hash = camino;
}

function poner(html, { titulo: t = "Pelagos", pie = "", nav = "", conserva = false } = {}) {
  const arriba = window.scrollY;
  const conFoco = conserva && document.activeElement && vista.contains(document.activeElement) ? document.activeElement.id : "";
  turnoDePintar++;
  armando = false;
  F.ocultar();       // el fondo del Kwiz con la tutora; la pregunta lo vuelve a prender
  delete vista.dataset.leccion;
  enPregunta = false;
  teclas = null;
  toque = null;
  vista.innerHTML = html;
  $("pie").innerHTML = pie;
  document.title = t;
  const enTablero = /^#?\/?$/.test(window.location.hash);
  $("nav").hidden = !A.hayLlave() || !P || enTablero;      // ‹ regresa al Tablero; en el Tablero no hace falta
  $("ajustesLink").hidden = !A.hayLlave() || !P;
  for (const a of document.querySelectorAll("[data-nav]")) {
    if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
  ponerSignoAyuda();
  vestir(vista);
  document.body.classList.toggle("conandrea", !!vista.querySelector(".hoy.confoto"));      // con el retrato al fondo, la página entera se oscurece
  if (conserva) {
    window.scrollTo(0, arriba);
    if (conFoco && $(conFoco)) $(conFoco).focus({ preventScroll: true });
  } else {
    window.scrollTo(0, 0);
    const h = vista.querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
}

/** Lo que el HTML no puede traer escrito: anchos de barras, portadas privadas y videos de fondo. */
function vestir(raiz) {
  for (const e of raiz.querySelectorAll("[data-w]")) e.style.width = e.dataset.w + "%";
  for (const e of raiz.querySelectorAll("[data-letra]")) e.style.fontSize = e.dataset.letra + "px";      // la letra de cada cuadro del Atlas
  for (const e of raiz.querySelectorAll("[data-x]")) e.style.left = e.dataset.x + "%";
  for (const img of raiz.querySelectorAll("img[data-foto]")) {
    const n = img.dataset.foto;
    (img.dataset.vocab ? A.foto(fotosVocab.get(n), "vocab") : fotosExpanse.has(n) ? A.foto(fotosExpanse.get(n), "expanse") : A.foto(fotos.get(n))).then((u) => {
      if (!img.isConnected) return;
      if (u) img.src = u;
      else if (img.closest(".fondo")) { img.closest(".hoy").classList.remove("confoto"); document.body.classList.remove("conandrea"); }     // sin foto de fondo, la página se acomoda sin ella
    });
  }
  // Las cajas del mapa: su lugar y su tamaño no pueden venir escritos en el HTML.
  for (const e of raiz.querySelectorAll("[data-caja]")) {
    const [x, y, w, h] = e.dataset.caja.split(",");
    e.style.left = x + "%"; e.style.top = y + "px"; e.style.width = w + "%"; e.style.height = h + "px";
  }
  for (const e of raiz.querySelectorAll("[data-alto]")) e.style.height = e.dataset.alto + "px";
  for (const e of raiz.querySelectorAll("[data-col]")) e.style.gridColumnStart = e.dataset.col;        // los meses del mapa de calor
  for (const img of raiz.querySelectorAll("img[data-retrato]")) {
    // Sin retrato (no llegó, o no hay conexión) la página de Hoy se acomoda como si no hubiera foto.
    A.foto(retratos.get(img.dataset.retrato), "andrea").then((u) => {
      if (!img.isConnected) return;
      if (u) img.src = u; else { const h = img.closest(".hoy"); if (h) h.classList.remove("confoto"); document.body.classList.remove("conandrea"); }
    });
  }
  for (const v of raiz.querySelectorAll("video[data-vestida]")) {
    v.src = v.dataset.vestida;
    if (v.play) v.play().catch(() => {});
  }
  for (const v of raiz.querySelectorAll("[data-videofondo]")) {
    const sala = v.dataset.sala || "inicio";
    const lista = () => (sala === "inicio" ? videosFondo : escenasPorSala.get(sala)) || [];
    const item = lista().find((x) => x.archivo === v.dataset.videofondo);
    // Si el video no llega, el Tablero se queda con la foto del día.
    const sinVideo = () => {
      if (!v.isConnected) return;
      if (sala === "inicio") videosFondo = lista().filter((x) => x !== item); else { escenasPorSala.set(sala, lista().filter((x) => x !== item)); premioFondo = null; }
      pintar({ conserva: true });
    };
    if (!item) { sinVideo(); continue; }
    A.escenaUrl(sala, item).then((u) => {
      if (!v.isConnected || !u) return;
      v.src = u;
      if (v.play) v.play().catch(() => {});
    }).catch(sinVideo);
  }
}

const ICONO_BOCINA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
const RUTAS = [
  [/^\/$/, verInicio],
  [/^\/gramatica$/, verBiblioteca],
  [/^\/gramatica\/quiz$/, verKwiz],
  [/^\/gramatica\/quiz\/([A-Za-z0-9_-]+)$/, verPregunta],
  [/^\/gramatica\/quiz\/([A-Za-z0-9_-]+)\/resultado$/, verResultado],
  [/^\/gramatica\/atlas$/, verMapa],
  [/^\/gramatica\/([a-z0-9]+)(\/bajo|\/atascados)?$/, verNivel],
  [/^\/gramatica\/([a-z0-9]+)\/mision$/, (o, clave) => ir("/gramatica/" + clave, true)],   // el filtro «Misión activa» se quitó con el Recorrido
  [/^\/bitacora$/, verCalor],
  [/^\/clases$/, verClases],
  [/^\/lectura$/, (o) => verLectura(o)],
  [/^\/lectura\/ejemplo$/, (o) => verLectura(o, true)],
  [/^\/leccion\/([a-z0-9-]+)$/, verLeccion],
  [/^\/tutoras$/, (o) => (mudo() ? ir("/gramatica", true) : verTutoras(o))],      // en Limpio no hay tutoras
  [/^\/tutoras\/(\d+)$/, (o, id) => (mudo() ? ir("/gramatica", true) : verTutora(o, id))],
  [/^\/vocabulario$/, verTarjetas],
  [/^\/vocabulario\/acervo$/, verLista],
  [/^\/vocabulario\/agregar$/, verAgregar],
  [/^\/ajustes$/, verAjustes],
  [/^\/ayuda$/, verAyuda],
  [/^\/ayuda\/([a-z0-9-]+)$/, verPaginaAyuda],
  [/^\/recorrido(?:\/[a-z0-9-]+)?$/, () => ir("/", true)],          // el Recorrido se quitó el 17-Oct-2026; su dirección vieja lleva al Tablero
  // Las direcciones de antes siguen llevando a su página.
  [/^\/kwiz((?:\/[A-Za-z0-9_-]+){0,2})$/, (o, resto) => ir(QUIZ + (resto || ""), true)],
  [/^\/tarjetas$/, () => ir("/vocabulario", true)],
  [/^\/(mapa\/calor|red\/bitacora)$/, () => ir("/bitacora", true)],    // la Bitácora vive en el Tablero
  [/^\/vocabulario\/lista$/, () => ir("/vocabulario/acervo", true)],      // la Lista de vocabulario ahora es el Acervo
];

function pintar(opciones = {}) {
  if (!A.hayLlave()) return verLlave();
  if (!P || !E) return poner('<section class="card"><h1 class="h">Pelagos</h1><p>Abriendo tu español…</p></section>');
  const camino = window.location.hash.replace(/^#/, "") || "/";
  for (const [patron, ver] of RUTAS) {
    const m = patron.exec(camino);
    if (m) return ver(opciones, ...m.slice(1));
  }
  return verNoExiste();
}

function verNoExiste(mensaje) {
  poner(mensaje
    ? `<section class="card"><h1 class="h">No se pudo</h1><p>${esc(mensaje)} Vuelve al <a href="#/">tablero</a>.</p></section>`
    : `<section class="card"><h1 class="h">Esa página no existe</h1><p>Puede que la lección todavía no esté escrita. Vuelve a las <a href="#/gramatica">lecciones de gramática</a>.</p></section>`,
  { titulo: "No existe · Pelagos" });
}

// ---------------------------------------------------------------- La llave

/** El nombre que se le propone a GitHub para la llave. GitHub no deja repetir nombres: lleva el aparato, el día y la hora. */
function nombreDeLlave() {
  const d = new Date(), dos = (n) => String(n).padStart(2, "0");
  return "Pelagos " + A.aparato() + " " + dos(d.getMonth() + 1) + "-" + dos(d.getDate()) + " " + dos(d.getHours()) + dos(d.getMinutes());
}

function verLlave(aviso = "") {
  const crear = "https://github.com/settings/personal-access-tokens/new?name=" + encodeURIComponent(nombreDeLlave()) +
    "&description=" + encodeURIComponent("Abre Pelagos en este aparato") + "&expires_in=366&contents=write";
  poner(`
  <section class="card">
    <h1 class="h">Pon tu llave</h1>
    ${aviso ? `<p class="err">${esc(aviso)}</p>` : ""}
    <p>Tus lecciones y tu avance viven en tu repositorio privado de GitHub. La llave lo abre desde este aparato. Se pega una sola vez.</p>
    <form id="llaveForma" class="forma" autocomplete="off">
      <label class="small" for="llaveCampo">Tu llave</label>
      <input id="llaveCampo" class="campo" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
      <div class="go"><button type="submit" class="ub grande" id="llaveEntrar">Entrar</button></div>
    </form>
    <p class="err" id="llaveError" role="alert" hidden></p>
  </section>
  <section class="card">
    <h2>Cómo se saca la llave</h2>
    <ol class="pasos">
      <li>Toca el botón de abajo. Se abre GitHub con casi todo ya lleno.</li>
      <li>En <b lang="en">Repository access</b> elige <b lang="en">Only select repositories</b> y marca <b>Pelagos</b>.</li>
      <li>Hasta abajo, toca <b lang="en">Generate token</b>.</li>
      <li>Copia la llave que te da, vuelve aquí y pégala arriba.</li>
    </ol>
    <div class="go"><a class="ub grande" href="${esc(crear)}" target="_blank" rel="noopener noreferrer">Abrir GitHub</a></div>
    <p class="small">La llave solo abre ese repositorio. Se queda en este navegador y solo viaja a GitHub. Dura un año. Haz una en cada aparato.</p>
  </section>`, { titulo: "Tu llave · Pelagos" });

  const forma = $("llaveForma"), campo = $("llaveCampo"), boton = $("llaveEntrar"), error = $("llaveError");
  forma.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (boton.disabled) return;
    boton.disabled = true;
    boton.textContent = "Probando…";
    error.hidden = true;
    try {
      ponerPaquete(await A.entrar(campo.value));
      campo.value = "";
      // La prueba de que la llave también deja guardar: apuntar este aparato.
      A.apuntar({ t: "aparato", id: N.nuevoId("a"), cuando: new Date().toISOString() });
      await A.subir();
      const s = A.estadoSinc();
      if (s.error && (s.error.tipo === "permiso" || s.error.tipo === "falta")) {
        const porque = s.error.tipo === "falta" ? s.error.message
          : "Esa llave deja leer pero no guardar. Hazla otra vez con el botón de abajo, que ya trae el permiso de escribir.";
        await A.salir();
        P = null; E = null;
        throw new A.Fallo("permiso", porque);
      }
      try { await A.sincronizar(); } catch { /* ya hay paquete: los sucesos llegan en la próxima puesta al día */ }
      recalcular();
      if (!window.location.hash) ir("/", true);
      pintar();
    } catch (e) {
      boton.disabled = false;
      boton.textContent = "Entrar";
      error.hidden = false;
      error.textContent = e instanceof A.Fallo ? e.message : "No se pudo. Intenta otra vez.";
      campo.focus();
    }
  });
}

// ---------------------------------------------------------------- Inicio y biblioteca

function resumenNiveles() {
  const filas = new Map(Object.keys(NIVELES).map((n) => [n, { nivel: n, temas: 0, bajo: 0, suma: 0, con: 0, lecciones: 0, tutoras: 0, videos: 0, loops: 0, preguntas: 0 }]));
  const banco = bancoPorTema();
  for (const t of P.temas) {
    const f = filas.get(t.nivel);
    if (!f) continue;
    const i = info(t.id);
    f.temas++;
    if (i.pct !== null) { f.suma += i.pct; f.con++; }
    if (esBajo(i.pct)) f.bajo++;
    if (t.leccion) f.lecciones++;
    if (tutoraDe(t.id)) f.tutoras++;
    if (tieneVideo(t)) f.videos++;
    if (tieneLoop(t)) f.loops++;
    if (banco.get(t.id)) f.preguntas++;
  }
  return [...filas.values()].filter((f) => f.temas).map((f) => ({ ...f, promedio: f.con ? f.suma / f.con : null }));
}

function botonNivel(n, conLecciones, corto = false) {
  return `<a class="tb" href="#/gramatica/${n.nivel.toLowerCase()}">
    <span class="lv">${n.nivel}</span><span class="nm">${NIVELES[n.nivel]}</span><span class="pc">${pct(n.promedio)}</span>
    ${corto ? "" : `<span class="sm">${plural(n.temas, "tema", "temas")} · ${n.bajo} bajo ${meta()}%</span>`}
    ${barra(n.promedio)}</a>`;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ICONO_SI = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.4 3.4L17 9" class="tic" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// El del check-in: el mismo círculo punteado siempre; se rellena de verde mientras falta escucharlo (ver .ciOido en el CSS).
const ICONO_OIDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" class="relleno" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/></svg>';
const ICONO_NO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/></svg>';

/** «viernes 9 de octubre», del día de este aparato. */
function diaLargo(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]}`;
}
// Los dibujitos que van en la esquina de un cuadro: lo que se gana con esa medida. El tablero dice cuál va en cuál.
// Ganado se ve a color e iluminado; por ganar, solo el contorno punteado. Los colores los pone la hoja de estilo.
// El durazno es de la Amiga (antes eran dos besos); el Ánimo es la manzana, diga lo que diga el tablero.
const iconoDe = (x) => (!x ? null : x.con === "todas" && x.icono ? "manzana" : x.icono === "besos" ? "durazno" : x.icono);
// Cada premio ganado puede traer su GIF (lo subes en Ajustes). Al tocar el dibujito, el GIF pasa al fondo del Tablero.
const PREMIOS = [["animo", "Ánimo", "manzana"], ["boca", "Boca", "labios"], ["mano", "Mano", "puno"], ["papaya", "Papaya", "papaya"], ["durazno", "Durazno", "durazno"]];
const PREMIO_DE = Object.fromEntries(PREMIOS.map(([k, , ic]) => [ic, k]));
const salaPremio = (k) => "premio-" + k;
let premioFondo = null;      // el premio cuyo GIF está ahorita de fondo en el Tablero
/**
 * El clip de un premio: la parte de la escena de la tutora del día que le toca (mano, boca, papaya, durazno; la manzana, su final).
 * { id, tramos } o null si hoy no hay tutora con clips (o estás en Limpio).
 */
function clipDelDia(k) {
  if (!k || ambiente() === "limpio") return null;
  const id = tutoraDelDiaId();
  if (id === null) return null;
  const tramos = N.tramosDe(escaladaDatos.tutoras[String(id)], N.ESCENA_DE_PREMIO[k]);
  return tramos.length ? { id, tramos } : null;
}
/**
 * Un dibujito de premio. Ganado, con la tutora del día: se toca y su clip pasa al fondo del Tablero (y otra vez para quitarlo).
 * Sin tutora del día pero con GIF: el GIF va de fondo, como antes.
 */
function selloHtml(x, grande = false) {
  const ic = iconoDe(x), k = PREMIO_DE[ic];
  const clip = x.va && k && !x.estatico ? clipDelDia(k) : null;
  const gif = x.va && k && !clip && !x.estatico ? ultimaEscena(salaPremio(k)) : null;
  const clase = `sello${grande ? " grande" : ""} ${esc(ic)} ${x.va ? "ok" : "no"}`;
  if (clip) {
    const on = premioFondo === k, quien = nombreTutora(clip.id);
    return `<span class="${clase} toca${on ? " activo" : ""}" role="button" tabindex="0" data-premio="${k}" aria-pressed="${on}" aria-label="${esc(x.nombre)}: ganado. ${on ? "Quitar su clip del fondo" : "Ver el clip de " + esc(quien) + " de fondo"}">${candado(x.va)}</span>`;
  }
  if (!gif) return `<span class="${clase}">${candado(x.va)}</span><span class="sr">${esc(x.nombre)}: ${x.va ? "ganado" : "falta"}. </span>`;
  const on = premioFondo === k;
  return `<span class="${clase} toca${on ? " activo" : ""}" role="button" tabindex="0" data-premio="${k}" aria-pressed="${on}" aria-label="${esc(x.nombre)}: ganado. ${on ? "Quitar su GIF del fondo" : "Poner su GIF de fondo"}">${candado(x.va)}</span>`;
}
/** El sello del premio (17-Oct-2026): un candadito. Cerrado y gris si falta; abierto y dorado si ya lo ganaste. */
const candado = (abierto) => abierto
  ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="cdCuerpo" x="5" y="11" width="14" height="10" rx="2"/><path class="cdArco" d="M8 11V7a4 4 0 0 1 7.6-1.7"/></svg>'
  : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="cdCuerpo" x="5" y="11" width="14" height="10" rx="2"/><path class="cdArco" d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
// Los dibujos de antes (puño, labios, papaya, durazno, manzana) ya no se pintan; sus nombres siguen diciendo qué premio es cuál.
const SELLOS = {
  puno: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect class="s1" x="10" y="22.5" width="12" height="7" rx="1.6"/><rect class="s1" x="6.5" y="5.4" width="4.7" height="11" rx="2.35"/><rect class="s1" x="11.3" y="4" width="4.7" height="12" rx="2.35"/><rect class="s1" x="16.1" y="4" width="4.7" height="12" rx="2.35"/><rect class="s1" x="20.9" y="5.4" width="4.7" height="11" rx="2.35"/><rect class="s1" x="6.5" y="11.5" width="19.1" height="12.6" rx="4.6"/><path class="s2" d="M5.6 15.2c2.4-1.5 8-1.9 11-.8 1.9.7 2.1 3.3.3 4.2-2.9 1.4-7.9 1.5-10.9.5-1.9-.7-2.100-2.800-.4-3.900z"/></svg>',
  labios: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M2.5 15.200C6.500 8.800 11.800 7.300 16 10.800c4.200-3.500 9.500-2 13.500 4.400-4.600-1-9-.2-13.500-.200s-8.900-.8-13.500.2z"/><path class="s1" d="M3.200 16.700c4.300.9 8.500.3 12.800.3s8.500.6 12.800-.3C25.600 23.200 20.900 26 16 26s-9.600-2.800-12.800-9.300z"/><path class="s3" d="M9.500 19.600c2 1.700 4.200 2.500 6.500 2.500s4.500-.8 6.500-2.500"/></svg>',
  papaya: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 2.600c5.800 0 10.200 7.200 10.200 15.200 0 7.100-4.400 11.800-10.200 11.800S5.800 24.900 5.800 17.800C5.800 9.800 10.200 2.600 16 2.600z"/><path class="s2" d="M16 9.800c2.900 0 4.800 4.200 4.800 8.800 0 4-1.900 6.600-4.800 6.600s-4.800-2.600-4.800-6.600c0-4.600 1.900-8.800 4.800-8.800z"/><g class="s3"><circle cx="15" cy="13.600" r="1"/><circle cx="17.400" cy="15.800" r="1"/><circle cx="14.600" cy="17.400" r="1"/><circle cx="17.200" cy="19.600" r="1"/><circle cx="14.800" cy="21.400" r="1"/><circle cx="17" cy="22.900" r=".9"/></g></svg>',
  // La manzana: el Ánimo, lo que se gana con todas juntas.
  manzana: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 9.500C13 7.500 5.500 7.800 5.500 16.500 5.500 23.500 10 29.500 13.500 29.500c1.300 0 1.700-.7 2.500-.7s1.200.7 2.500.7c3.500 0 8-6 8-13 0-8.700-7.500-9-10.500-7z"/><path class="s3" d="M16 9.500c0-2.500.6-4.500 1.800-6"/><path class="s2" d="M17.200 6.600c1.500-2.800 4.600-3.800 7.600-3-1 2.800-4.200 4-7.600 3z"/></svg>',
  durazno: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 8.200C9.200 5.800 3.600 10.800 4 18c.4 7 5.800 11.600 12 11.600S27.600 25 28 18c.4-7.200-5.200-12.200-12-9.800z"/><path class="s3" d="M16.400 8.600c-3.600 4.800-4 12.800-1.200 19.800"/><path class="s2" d="M16 8.200c.8-4 4.400-6 8.600-4.800-.8 3.800-4.200 5.600-8.600 4.800z"/></svg>',
};

/** La medida de escuchar (antes «ElevenReader»; desde el 22-Oct-2026 «Escucha»: audiolibros y podcasts en español). */
const ESCUCHA = /^(elevenreader|escucha)$/i;
/** Una medida del día como cuadro: nombre, número grande, barra y si ya se cumplió. «sello» es lo que se gana con ella. */
function cuadro(nombre, valor, de, unidad, estado, hecho, enlace = "", sello = null, sub = "", extra = "") {
  const aCero = de === 0;       // medidas que se cumplen al llegar a cero, como las tarjetas pendientes
  const [abre, cierra] = enlace ? [`a href="${enlace}"`, "a"] : ["div", "div"];
  return `<${abre} class="cuadro${hecho ? " hecho" : ""}${sello ? " consello" : ""}" role="listitem">
    ${sello ? selloHtml(sello) : ""}
    <span class="cn">${esc(nombre)}${sub ? `<small class="csub">${esc(sub)}</small>` : ""}</span>
    <span class="cv">${esc(valor)}${aCero ? "" : `<small>/${esc(de)}${unidad ? " " + esc(unidad) : ""}</small>`}</span>
    ${extra}
  </${cierra}>`;
}

/**
 * El fondo de las páginas de arriba (Tablero, Gramática, Vocabulario): el mismo en todas, para que combinen.
 * Reef: el retrato de Andrea del día (el que dice el tablero), o la portada del día si no hay. Expanse: la portada Expanse del día.
 * Devuelve { html, hay }: el <div class="fondo"> y si hay foto (para la clase «confoto»).
 */
// El logo de Pelagos (la medusa cerebro) va encima del fondo, en la esquina de abajo a la derecha: tapa la marca que traen algunos loops.
const LOGO = `<img class="logoFondo" src="logo.png" alt="Pelagos" width="760" height="519">`;
/**
 * En Limpio el fondo es el logo de Pelagos, siempre el mismo (no cambia por pestaña ni por tema): ocupa el lugar de la foto
 * de la tutora para que la página se acomode igual que en Reef. Blanco en modo claro y negro en modo oscuro.
 */
const FONDO_LIMPIO = `<div class="fondo fondoLogo"><img class="logoClaro" src="logo-claro.png" alt=""><img class="logoOscuro" src="logo-oscuro.png" alt=""></div>`;
function fondoDelDia(respaldo = true) {
  if (ambiente() === "limpio") return { hay: true, html: FONDO_LIMPIO };
  // Mientras suena el repaso en audio, arriba va el loop de la tutora que está hablando.
  // Solo en la página donde empezó el repaso: en las demás, el fondo de siempre (la voz sigue sonando).
  const lt = repaso && repaso.sonando != null && repaso.ruta === window.location.hash && !sinMovimiento() ? loopDeTutora(repaso.sonando) : null;
  if (lt) return { hay: true, html: `<div class="fondo">${etiquetaEscena("tutora-" + repaso.sonando, lt)}${LOGO}</div>` };
  // Si subiste un GIF o video de fondo (Ajustes), va en todas las páginas de arriba, en lugar de la foto.
  cargarVideosFondo();
  // El loop de la tutora del día lleva, discreto arriba, el nombre de su lección.
  const vest = vestidaDelDia();
  if (vest && vest.cargando) return { hay: true, html: FONDO_CARGANDO };      // nunca se asoma la de siempre antes que la vestida
  const bajo = ambiente() !== "limpio" && !sinMovimiento() ? loopDelDia() : null;
  if (bajo) {
    const tema = porId.get(Number(bajo.sala.slice("tutora-".length)));
    // El rótulo lleva a su lección (o a su ficha, si todavía no tiene lección escrita) y dice su nivel.
    const dentroRotulo = tema ? `<b class="lv">${esc(tema.nivel)}</b> ${esc(titulo(tema))}` : "";
    const rotulo = !tema ? "" : tema.slug && tema.leccion
      ? `<a class="fondoTema" href="#/leccion/${esc(tema.slug)}" aria-label="Lección de la tutora del día: ${esc(tema.nivel)}, ${esc(titulo(tema))}">${dentroRotulo}</a>`
      : `<button type="button" class="fondoTema" data-l="${tema.id}">${dentroRotulo}</button>`;
    return { hay: true, html: `<div class="fondo">${vest ? etiquetaVestida(vest.url) : etiquetaEscena(bajo.sala, bajo.v)}${rotulo}${LOGO}</div>` };
  }
  const cosa = etiquetaMovimiento();
  if (cosa) return { hay: true, html: `<div class="fondo">${cosa}${LOGO}</div>` };
  if (fondoEnCamino()) return { hay: true, html: FONDO_CARGANDO };
  // Si ninguna tutora tiene todavía sus clips cortados, el retrato de Andrea del día (el que dice el tablero).
  const T = N.leerTablero(A.tablero());
  if (T && T.foto && retratos.has(T.foto)) return { hay: true, html: `<div class="fondo"><img data-retrato="${esc(T.foto)}" alt="">${LOGO}</div>` };
  const foto = ambiente() === "expanse" || respaldo ? portadaDelDia() : null;      // el Tablero sin retrato se queda sin foto
  return foto ? { hay: true, html: `<div class="fondo"><img data-foto="${esc(foto)}" alt="">${LOGO}</div>` } : { hay: false, html: "" };
}
/** Una página de arriba con el fondo del día y sus tarjetas de vidrio encima. */
function conFondo(html, clases = "") {
  const f = fondoDelDia();
  return `<div class="hoy${clases ? " " + clases : ""}${f.hay ? " confoto" : ""}">${f.html}<div class="sobre">${html}</div></div>`;
}

/** Lo que se mueve: un video o un GIF. */
const esMovimiento = (x) => /^video\//.test(x.tipo || "") || x.tipo === "image/gif";
/** El último video o GIF subido para el fondo del Tablero, o null. */
const videoFondo = () => (videosFondo || []).filter((x) => esMovimiento(x)).slice(-1)[0] || null;
const sinMovimiento = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Pregunta una sola vez qué video de fondo hay; cuando llega la respuesta, vuelve a pintar el Tablero si está a la vista. */
/** El GIF o video de fondo como etiqueta (o "" si no hay, o si el aparato pide menos movimiento). */
function etiquetaMovimiento() {
  if (ambiente() === "limpio" || sinMovimiento()) return "";
  // Primero: el loop de la tutora del día. Si todavía no llega, el GIF o video que subiste.
  const vest = vestidaDelDia();
  if (vest && vest.url) return etiquetaVestida(vest.url);
  const bajo = vest && vest.cargando ? null : loopDelDia();
  if (bajo) return etiquetaEscena(bajo.sala, bajo.v);
  const v = videoFondo();
  if (!v) return "";
  return v.tipo === "image/gif" ? `<img data-videofondo="${esc(v.archivo)}" alt="">` : `<video data-videofondo="${esc(v.archivo)}" muted loop autoplay playsinline preload="auto" aria-hidden="true"></video>`;
}
/**
 * La tutora del día: una distinta cada día, por turno (N.tutoraDelDia), entre las que ya tienen su loop subido
 * y su escena cortada en partes (mano, boca, papaya, durazno y final, en contenido/tutoras/escalada.json).
 * Va de fondo en todas las páginas fuera de las lecciones y los quizzes, que llevan la tutora de su propio tema.
 * Sus partes son los clips de los premios del Tablero. Mientras llega escalada.json, null.
 */
function tutoraDelDiaId() {
  const con = A.leccionesConLoop();
  if (!con || !con.size || !P) return null;
  const todas = escaladaYa();
  if (!todas) return null;
  const listas = [...con].filter((id) => porId.has(id) && tutoraDe(id) && N.tieneClips(todas[String(id)]));
  const hoy = N.fechaLocal(new Date());
  return N.tutoraDelDia(listas, hoy, saltosDeHoy(hoy));
}
/** Cuántas veces tocaste hoy «Siguiente tutora» en Ajustes (en cualquier aparato). */
function saltosDeHoy(hoy) {
  try { return A.sucesos().filter((e) => e && e.t === "saltotutora" && e.dia === hoy).length; } catch { return 0; }
}
/** El nombre de la tutora del día, para Ajustes. */
function nombreTutoraDelDia() {
  const id = tutoraDelDiaId(), t = id && tutoraDe(id);
  return t ? "Hoy: " + t.tutora + "." : "Todavía no hay tutora del día.";
}
/** Las escenas de todas las tutoras, si ya llegaron. Si no, las pide una vez y vuelve a pintar cuando llegan. */
let escaladaPedida = false;
function escaladaYa() {
  if (escaladaDatos === undefined) {
    if (!escaladaPedida) {
      escaladaPedida = true;
      escenasDeTutora(0).then(() => { if (vista.querySelector(".hoy, .fondo.cargando")) pintar({ conserva: true }); });
    }
    return null;
  }
  return (escaladaDatos && escaladaDatos.tutoras) || null;
}
/** { sala, v } del loop de la tutora del día; si no ha llegado, lo pide y vuelve a pintar cuando llega. */
function loopDelDia() {
  const id = tutoraDelDiaId();
  if (id === null) return null;
  const sala = "tutora-" + id;
  if (!escenasPorSala.has(sala)) {
    escenasPorSala.set(sala, []);
    A.escenasDe(sala).then((l) => {
      escenasPorSala.set(sala, l);
      salasListas.add(sala);
      if (tutoraDelDiaId() === id && (vista.querySelector(".hoy") || (movimientoEnTodo() && vista.querySelector(".hero")))) pintar({ conserva: true });
    }).catch(() => { salasListas.add(sala); });
  }
  const v = (escenasPorSala.get(sala) || []).filter(esMovimiento).slice(-1)[0];
  return v ? { sala, v } : null;
}
// ---- La tutora del día vestida (su pedido del 20-Oct-2026): mientras no ganes ningún premio del día, de fondo va
// su loop vestido (el tramo vestido más largo de su video, en tu almacén de Cloudflare: vestidas/<video>.mp4).
// En cuanto ganas el primero (Boca, Mano, Papaya, Durazno o el Ánimo), cambia a su loop de siempre.
let vestidasDatos;                    // { videos: { "<lección del video>": segundos } } o null
let vestidasPedidas = false;
const vestidasUrl = new Map();        // lección del video -> { url } (blob) | { falla: true } | { cargando: true }
/** La lección del video de una tutora (las que reusan video comparten loop vestido). */
const videoDe = (id) => { const t = tutoraDe(id); return t && t.archivo ? String(t.archivo).split(" ")[0] : null; };
/**
 * El loop vestido de la tutora del día: { url } si ya llegó, { cargando: true } mientras baja, o null si no toca
 * (ya ganaste un premio hoy, no tiene versión vestida, no hay almacén, o falló).
 */
function vestidaDelDia() {
  if (ambiente() === "limpio" || sinMovimiento()) return null;
  const id = tutoraDelDiaId();
  if (id === null || algunPremioHoy()) return null;
  if (vestidasDatos === undefined) {
    if (!vestidasPedidas) {
      vestidasPedidas = true;
      A.vestidas().then((d) => { vestidasDatos = d || null; repintarFondo(); }).catch(() => { vestidasDatos = null; repintarFondo(); });
    }
    return { cargando: true };
  }
  const v = videoDe(id);
  if (!vestidasDatos || !vestidasDatos.videos || !v || !(v in vestidasDatos.videos)) return null;
  const ya = vestidasUrl.get(v);
  if (ya) return ya.falla ? null : ya;
  vestidasUrl.set(v, { cargando: true });
  (async () => {
    const d = await datosNube();
    if (!d) throw new Error("sin almacén");
    return NB.bajarVideo(await NB.enlace(d, "vestidas/" + v + ".mp4"));
  })().then((url) => { vestidasUrl.set(v, { url }); repintarFondo(); })
    .catch(() => { vestidasUrl.set(v, { falla: true }); repintarFondo(); });
  return { cargando: true };
}
/** Vuelve a pintar si en la página hay un fondo de tutora del día (o el logo de carga). */
function repintarFondo() {
  if (vista.querySelector(".hoy, .fondo.cargando") || (movimientoEnTodo() && vista.querySelector(".hero"))) pintar({ conserva: true });
}
/** La etiqueta del loop vestido (ya bajado, como blob). */
const etiquetaVestida = (url) => `<video data-vestida="${esc(url)}" muted loop autoplay playsinline preload="auto" aria-hidden="true"></video>`;
const salasListas = new Set();     // salas cuya lista de escenas ya llegó (aunque venga vacía)
/** Si el fondo en movimiento todavía está por llegar (la lista del loop o la de tus videos de fondo). */
function fondoEnCamino() {
  if (ambiente() === "limpio" || sinMovimiento()) return false;
  if (escaladaDatos === undefined && A.leccionesConLoop().size) return true;      // todavía no se sabe quién es la tutora del día
  const id = tutoraDelDiaId();
  if (id !== null && !salasListas.has("tutora-" + id)) return true;
  return videosFondo !== null && !videosFondoListos;
}
// Mientras llega el fondo, el logo de Pelagos ocupa su lugar (nunca una foto vieja).
const FONDO_CARGANDO = `<div class="fondo cargando"><img class="logoCarga" src="logo.png" alt="Pelagos"></div>`;
/** Si él lo prendió en Ajustes: en lecciones, quizzes y tarjetas va el GIF de fondo en lugar de la foto. */
const movimientoEnTodo = () => guardado("pelagos.movimientoEnTodo") !== "no";      // prendido siempre, salvo que este aparato lo haya apagado antes
/** La imagen de arriba de una lección, pregunta o tarjeta: el GIF de fondo si está prendido, si no, la foto. */
function imagenDeArriba(foto) {
  const m = movimientoEnTodo() ? (cargarVideosFondo(), etiquetaMovimiento()) : "";
  return m || (foto ? `<img data-foto="${esc(foto)}" alt="">` : "");
}
const escenasPorSala = new Map();     // sala -> lista de escenas (vacía mientras llega)
/** El último GIF o video de una sala (los premios). Pregunta una vez; cuando llega, vuelve a pintar el Tablero. */
function ultimaEscena(sala) {
  if (!escenasPorSala.has(sala)) {
    escenasPorSala.set(sala, []);
    A.escenasDe(sala).then((l) => {
      escenasPorSala.set(sala, l);
      const k = sala.replace(/^premio-/, ""), rotulo = vista.querySelector(`[data-premiohay="${k}"]`);
      if (rotulo) rotulo.textContent = l.some(esMovimiento) ? "✓ Tiene GIF" : "Sin GIF";
      else if (l.some(esMovimiento) && vista.querySelector("#medidas, #checkin")) pintar({ conserva: true });
    }).catch(() => {});
  }
  return escenasPorSala.get(sala).filter(esMovimiento).slice(-1)[0] || null;
}
/** Un GIF o video de cualquier sala como etiqueta que se repite sola. */
function etiquetaEscena(sala, v) {
  const d = `data-videofondo="${esc(v.archivo)}" data-sala="${esc(sala)}"`;
  return v.tipo === "image/gif" ? `<img ${d} alt="">` : `<video ${d} muted loop autoplay playsinline preload="auto" aria-hidden="true"></video>`;
}
function cargarVideosFondo() {
  if (videosFondo) return;
  videosFondo = [];
  A.escenasDe("inicio").then((l) => {
    videosFondo = l;
    videosFondoListos = true;
    if ((videoFondo() && (vista.querySelector(".hoy") || (movimientoEnTodo() && vista.querySelector(".hero")))) || vista.querySelector(".fondo.cargando")) pintar({ conserva: true });
  }).catch(() => { videosFondoListos = true; if (vista.querySelector(".fondo.cargando")) pintar({ conserva: true }); });
}
/**
 * Lo que llevas ganado hoy: las partes del check-in (los premios), con «va» prendido si ya se ganó.
 * La usan el Tablero (los candaditos) y el fondo de la tutora del día (vestida hasta que ganas el primero).
 */
function partesDelDia(hoy = N.fechaLocal(new Date()), T = N.leerTablero(A.tablero()), deHoy = !!T && T.dia === hoy) {
  // ---- Lo que cuenta Pelagos solo: los quizzes de gramática de hoy y las palabras que tocan hoy y siguen pendientes (la meta es cero).
  const kw = N.kwizzesDelDia(E, hoy), metaKw = N.KWIZZES_AL_DIA;
  const diaTj = tarjetas.size ? N.tarjetasDelDia(P, E, hoy) : null;
  const tj = diaTj ? diaTj.pendientes.length : null;
  const tjHechas = diaTj ? diaTj.hechasHoy : 0;

  // ---- Las partes: lo que llevas ganado hoy. Las que dicen con qué se ganan se prenden aquí mismo, al momento;
  // las demás valen lo que diga el tablero.
  const c = T && T.checkin;
  const cumplida = (nombre) => { const m = T.medidas.find((x) => x.nombre === nombre); return m ? (m.de === 0 ? m.valor === 0 : m.valor >= m.de) : null; };
  const sola = (x) => (x.con === "siempre" ? true : x.con === "tarjetas" ? tj === 0 : x.con === "kwizzes" ? kw >= metaKw
    : x.con && x.con.startsWith("medida:") ? (deHoy ? cumplida(x.con.slice(7)) ?? x.va : false) : x.va);
  const partes = !c ? [] : c.partes.map((x) => ({ ...x, va: x.con === "todas" ? null : sola(x) }));
  const ganables = partes.filter((x) => x.con && x.con !== "siempre" && x.con !== "todas" && !x.extra);      // las partes de más no cuentan para el Ánimo
  for (const x of partes) if (x.va === null) x.va = ganables.length > 0 && ganables.every((y) => y.va);
  return { kw, metaKw, diaTj, tj, tjHechas, c, partes, deHoy };
}
/** Si hoy ya ganaste algún premio de verdad (Boca, Mano, Papaya, Durazno o el Ánimo; no cuenta lo que se da «siempre»). */
function algunPremioHoy() {
  try {
    const { partes, deHoy } = partesDelDia();
    // Con un tablero de otro día solo valen las que cuenta Pelagos al momento (quizzes y tarjetas).
    return partes.some((x) => x.va && x.con !== "siempre" && SELLOS[iconoDe(x)] && (deHoy || x.con === "kwizzes" || x.con === "tarjetas"));
  } catch { return false; }
}
function verInicio(o) {
  const hoy = N.fechaLocal(new Date());
  const T = N.leerTablero(A.tablero());
  const deHoy = !!T && T.dia === hoy;
  // Al fondo, el video que subiste; si no hay, el retrato de Andrea del día (en Expanse, la portada Expanse del día; ver fondoDelDia).
  // Si tocaste un premio ganado, su GIF va de fondo hasta que lo vuelvas a tocar (o te vayas del Tablero).
  if (!o.conserva) premioFondo = null;
  // Con la tutora del día, el premio tocado se ve como su clip, arriba del Tablero, sin sonido; si no, su GIF de fondo.
  const clip = premioFondo ? clipDelDia(premioFondo) : null;
  const gifPremio = !clip && premioFondo && ambiente() !== "limpio" ? ultimaEscena(salaPremio(premioFondo)) : null;      // en Limpio, ni los premios
  // El premio tocado reemplaza al fondo mientras esté prendido: su clip de la tutora del día o, si no hay, su GIF.
  const fondo = clip ? { hay: true, html: `<div class="fondo conPremio"><div class="premioTutora" id="tutoraPremio"></div>${LOGO}</div>` }
    : gifPremio ? { hay: true, html: `<div class="fondo">${etiquetaEscena(salaPremio(premioFondo), gifPremio)}${LOGO}</div>` } : fondoDelDia(false);
  const cuadernos = (P.cuadernos || []).map((c) => `
  <section class="card">
    <h2>${esc(c.nombre)}</h2>
    <div class="links">${c.temas.map((id) => porId.get(id)).filter(Boolean).map((t) => botonTema(t)).join("")}</div>
  </section>`).join("");

  const { kw, metaKw, diaTj, tj, tjHechas, c, partes } = partesDelDia(hoy, T, deHoy);
  // Una parte con dibujito va en la esquina del cuadro de su medida, en lugar de ocupar un renglón aparte.
  const sello = (con) => partes.find((x) => x.con === con && SELLOS[iconoDe(x)]) || null;
  const premio = sello("todas");        // lo que se gana con todas juntas no tiene cuadro propio: va en la esquina de la tarjeta del check-in
  const conSellos = partes.some((x) => SELLOS[iconoDe(x)]);

  // ---- Las medidas del día. Los kwizzes y las tarjetas los cuenta Pelagos; lo demás viene del tablero.
  const cuadros = [cuadro("Gramática", kw, metaKw, "quizzes", kw >= metaKw ? "Cumplido" : `Faltan ${metaKw - kw}`, kw >= metaKw, "#" + QUIZ, sello("kwizzes"), "", circulosDeHoy("chico"))];
  // Vocabulario como los demás (su pedido del 18-Oct): las que ya repasaste hoy de las que te tocan hoy.
  // Con sus tres círculos de hoy, igual que Gramática (su pedido del 23-Oct-2026): nuevas, vencidas y falladas que te faltan.
  const gv = tj !== null ? N.tarjetasDelDia(P, E, hoy).grupos : null;
  if (tj !== null) cuadros.push(cuadro("Vocabulario", tjHechas, tjHechas + tj, "cards", tj === 0 ? "Cumplido" : "Por repasar", tj === 0, "#/vocabulario", sello("tarjetas"), "",
    circulosDeHoy("chico", [gv.nuevas.length, gv.vencidas.length, gv.falladas.length], "vhoy")));
  for (const m of T ? T.medidas : []) {
    if (tarjetas.size && /anki/i.test(m.nombre)) continue;        // con tarjetas propias, las de fuera ya no se enseñan
    const hecho = m.de === 0 ? m.valor === 0 : m.valor >= m.de;
    const falta = Math.round((m.de - m.valor) * 10) / 10;
    const escucha = ESCUCHA.test(m.nombre);      // se enseña como «Escucha», venga como venga del tablero
    cuadros.push(cuadro(escucha ? "Escucha" : m.nombre, m.valor, m.de, m.unidad, hecho ? "Cumplido" : m.de === 0 ? "Meta: cero" : `Faltan ${falta}`, hecho,
      /^clase/i.test(m.nombre) ? "#/clases" : escucha ? "#/lectura" : "", sello("medida:" + m.nombre)));
  }
  // Solo se dice de cuándo son los números de fuera si no son de hoy.
  const medidas = `
  <section class="card" id="medidas">
    <h2 class="sr">Tus medidas de hoy</h2>
    <div data-explicas><div class="cuadros" role="list">${cuadros.join("")}</div>${panelExplica()}</div>
    ${T && !deHoy ? `<p class="small viejo">No es de hoy: es del ${diaLargo(T.dia)}.</p>` : ""}
  </section>`;

  // ---- El check-in: si hay episodio esperándote.
  // Un renglón de texto, no un botón: «Check-in nuevo: 07 · Viernes 9-Oct · 2pm», y abajo si ya lo escuchaste.
  const nombreCi = c && c.titulo ? c.titulo.replace(/^check-?in\s*/i, "") : "";
  const rotuloCi = !c ? "" : c.estado === "ninguno" ? "Sin check-in hoy"
    : (!deHoy ? "Check-in anterior" : c.estado === "nuevo" ? "Check-in nuevo" : "Check-in") + (nombreCi ? ": " + nombreCi : "");
  // Tocar el renglón abre en ElevenReader el episodio de Andrea más nuevo de hoy (check-in o Mamada), si la tarea del Tablero dejó su dirección.
  const ep = c && c.ultimo;
  const esMamada = !!ep && /mamada/i.test(ep.titulo || "") && ep.titulo !== c.titulo;
  const textoCi = esMamada ? "Mamada nueva: " + (ep.titulo || "").replace(/^.*?mamadas? mañaneras?\s*/i, "") : rotuloCi;
  const enlaceCi = !c ? null : (ep && ep.url) || c.url;
  const checkin = !c || mudo() ? "" : `
  <section class="card${premio ? " consello" : ""}" id="checkin">
    ${premio ? selloHtml(premio, true) : ""}
    <h2 class="sr">Check-in</h2>
    <p class="ciLinea">${enlaceCi ? `<a href="${esc(enlaceCi)}" target="_blank" rel="noopener">${esc(textoCi)}</a>` : esc(textoCi)}</p>
    ${c.estado === "ninguno" ? "" : `<p class="ciOido ${c.estado === "oido" ? "si" : "no"}">${c.estado === "oido" ? ICONO_OIDO + "Escuchado" : ICONO_OIDO + "Sin escuchar"}</p>`}
    ${partes.length && !conSellos ? `<ul class="partes" data-n="${partes.length}">${partes.map((x) => `<li class="${x.va ? "va" : "nova"}"><span>${esc(x.nombre)}</span><span class="sr">${x.va ? ": ganado" : ": falta"}</span></li>`).join("")}</ul>` : ""}
  </section>`;

  poner(`
  <div class="hoy${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("tablero", "hoy")}
      <h1 class="sr">Tablero</h1>
      ${checkin}
      ${medidas}
      ${tarjetaBitacora()}
      ${seccionTendencias()}${cuadernos}
    </div>
  </div>`,
  { titulo: "Tablero · Pelagos", nav: "inicio", conserva: o.conserva });
  prepararTendencias();
  if (clip) mostrarClipPremio(clip);
}
/** El color de una tarjeta en el Acervo: su caja. Después del reinicio, una que no has vuelto a ver es «sin ver», aunque traiga aciertos viejos. */
const colorTarjeta = (x) => (E.reinicioTj && x.s && !x.s.nr ? null : N.colorDe({ ...x.s, pct: x.pct }));

// ---------------------------------------------------------------- Tus tendencias (Tablero, 16-Oct-2026)
// En lugar del promedio por nivel, que casi no se mueve: lo que subió y bajó en los últimos 7 días,
// contando solo los temas que has practicado aquí, y tus cajas grandes de tarjetas.
// 17-Oct-2026: arriba, tu avance (gramática por nivel y vocabulario, como la gráfica de Kwiziq); abajo, los últimos 7 días.
let tendCache = null;
const tendDias = 7;
const tendAbiertas = new Set();      // «Se te quedaron» y «Se te olvidaron»: cerradas hasta que las abras (con la flecha)
function tendenciasHoy() {
  const hoy = N.fechaLocal(new Date()), suc = A.sucesos();
  const clave = hoy + "|" + suc.length;
  if (!tendCache || tendCache.clave !== clave) tendCache = { clave, t: N.tendencias(P, suc, hoy, tendDias) };
  return tendCache.t;
}
function prepararTendencias() {
  const sec = $("tendencias");
  if (!sec || sec.dataset.listo) return;
  sec.dataset.listo = "1";
  sec.addEventListener("toggle", (ev) => {
    const d = ev.target;
    if (d instanceof HTMLDetailsElement && d.dataset.tdet) { if (d.open) tendAbiertas.add(d.dataset.tdet); else tendAbiertas.delete(d.dataset.tdet); }
  }, true);
}
// El selector de nivel (en el Tablero y en el Quiz de gramática) solo cambia su gráfica.
vista.addEventListener("click", (ev) => {
  const nv = ev.target instanceof Element ? ev.target.closest("[data-tnivel]") : null;
  const caja = nv && nv.closest(".avNivel");
  if (!caja || nv.dataset.tnivel === tendNivel) return;
  tendNivel = nv.dataset.tnivel;
  for (const b of caja.querySelectorAll("[data-tnivel]")) b.setAttribute("aria-pressed", String(b.dataset.tnivel === tendNivel));
  caja.querySelector(".grafNivel").innerHTML = graficaNivel(tendNivel);
});
/** El selector de nivel con su gráfica de avance. id: el de la caja de la gráfica (opcional). */
function avanceNivel(id = "") {
  const R = progresoHoy(), conPreg = N.nivelesConPreguntas(P, E);
  const nivs = Object.keys(NIVELES).filter((n) => R.niveles[n] && conPreg[n]);
  if (!nivs.length) return "";
  if (!tendNivel || !nivs.includes(tendNivel)) tendNivel = E.enfoque && nivs.includes(E.enfoque) ? E.enfoque
    : nivs.slice().sort((a, b) => R.niveles[b].n[R.niveles[b].n.length - 1] - R.niveles[a].n[R.niveles[a].n.length - 1])[0];
  return `<div class="avNivel">
    <div class="tdSeg" role="group" aria-label="Nivel">${nivs.map((n) => `<button type="button" data-tnivel="${n}" aria-pressed="${n === tendNivel}">${n}</button>`).join("")}</div>
    <div class="grafNivel"${id ? ` id="${id}"` : ""}>${graficaNivel(tendNivel)}</div>
  </div>`;
}
const DIAS_CORTOS = ["D", "L", "M", "M", "J", "V", "S"];
const diaTend = (d, hoy) => (d === hoy ? "Hoy" : DIAS_CORTOS[new Date(d + "T12:00:00").getDay()]);
/** Una línea chiquita de 7 puntos. serie: números; etiqueta: lo que dice el lector de pantalla. */
function lineaTend(serie, dias, clase, etiqueta, alto = 80) {
  if (serie.length < 2) return "";
  const hoy = dias[dias.length - 1];
  const lo = Math.min(...serie), hi = Math.max(...serie), rango = hi - lo || 1;
  const x = (i) => 20 + i * (300 / Math.max(1, serie.length - 1));
  const y = (v) => Math.round((alto - 14 - ((v - lo) / rango) * (alto - 36)) * 10) / 10;
  const ult = serie.length - 1;
  return `<svg class="tdLinea ${clase}" viewBox="0 0 340 ${alto}" width="100%" role="img" aria-label="${esc(etiqueta)}">
    <polyline points="${serie.map((v, i) => x(i) + "," + y(v)).join(" ")}" fill="none" stroke-width="3" stroke-linejoin="round"/>
    ${serie.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === ult ? 6 : 3.5}"/>`).join("")}
    <text class="tdIni" x="${x(0)}" y="${y(serie[0]) - 10}" text-anchor="middle">${serie[0]}</text>
    <text class="tdFin" x="${x(ult)}" y="${y(serie[ult]) - 12}" text-anchor="middle">${serie[ult]}</text>
    ${dias.map((d, i) => `<text class="tdDia" x="${x(i)}" y="${alto - 1}" text-anchor="middle">${diaTend(d, hoy)}</text>`).join("")}
  </svg>`;
}
/** Un tema que se movió: su nombre y una pista de 0 a 100 con el aro (antes), el punto (ahora) y la raya de tu meta. */
function pistaTema(x, meta) {
  const t = porId.get(x.tema);
  if (!t) return "";
  const a = Math.round(x.antes), b = Math.round(x.ahora), lo = Math.min(a, b), hi = Math.max(a, b), sube = b > a;
  const abre = t.slug && t.leccion ? `<a class="tdTema" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tdTema" data-l="${t.id}">`;
  const cierra = t.slug && t.leccion ? "</a>" : "</button>";
  return `${abre}<span class="tdFila"><span>${esc(titulo(t))} <span class="tdNv">(${esc(t.nivel)})</span></span><b>${a} → ${b}%</b></span>
    <span class="tdPista ${sube ? "sube" : "baja"}" role="img" aria-label="De ${a} a ${b} por ciento. Tu meta: ${meta}.">
      <i class="tdRiel"></i><i class="tdTramo" data-x="${lo}" data-w="${hi - lo}"></i>
      <i class="tdAro" data-x="${a}"></i><i class="tdPunto" data-x="${b}"></i><i class="tdMeta" data-x="${meta}"></i>
    </span>${cierra}`;
}
const CAJA_DIAS = ["1 día", "2 días", "5 días", "12 días", "30 días", "75 días"];
// ---- Tu avance por nivel, como la gráfica de Kwiziq: temas cubiertos (línea) y tu puntaje (área).
let progCache = null, tendNivel = null;
function progresoHoy() {
  const hoy = N.fechaLocal(new Date()), suc = A.sucesos();
  const clave = hoy + "|" + suc.length;
  if (!progCache || progCache.clave !== clave) progCache = { clave, r: N.progresoNiveles(P, suc, hoy) };
  return progCache.r;
}
const MESES_CHICOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaChica = (d) => `${Number(d.slice(8, 10))} ${MESES_CHICOS[Number(d.slice(5, 7)) - 1]}`;
/** La gráfica de avance (como la de Kwiziq): rejilla de 0 a 100%, el área verde de tu puntaje y la línea de lo cubierto.
 *  d: { dias, linea: [%], area: [%] }, rotulos: { linea, area }, etiqueta: lo que dice el lector de pantalla, nums: el pie. */
function graficaAvance(d, rotulos, etiqueta, nums) {
  const n = d.dias.length, W = 340, H = 200, iz = 34, de = 330, ar = 12, ab = 170;
  if (!n) return "";
  const x = (i) => Math.round((n < 2 ? de : iz + (i * (de - iz)) / (n - 1)) * 10) / 10;
  const y = (v) => Math.round((ab - (Math.min(100, v) / 100) * (ab - ar)) * 10) / 10;
  const ult = n - 1;
  const area = `${x(0)},${ab} ${d.area.map((v, i) => x(i) + "," + y(v)).join(" ")} ${x(ult)},${ab}`;
  const rejilla = [0, 25, 50, 75, 100].map((v) => `<line class="pgRej" x1="${iz}" y1="${y(v)}" x2="${de}" y2="${y(v)}"/><text class="pgEje" x="${iz - 4}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("");
  return `<figure class="pg">
    <div class="pgLey"><span><i class="pgLLinea" aria-hidden="true"></i>${rotulos.linea}</span><span><i class="pgLArea" aria-hidden="true"></i>${rotulos.area}</span></div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(etiqueta)}">
      ${rejilla}
      <polygon class="pgArea" points="${area}"/>
      <polyline class="pgLinea" points="${d.linea.map((v, i) => x(i) + "," + y(v)).join(" ")}"/>
      ${d.linea.map((v, i) => `<circle class="pgPunto" cx="${x(i)}" cy="${y(v)}" r="${i === ult ? 5 : 3}"/>`).join("")}
      ${n > 1 ? `<text class="pgEje" x="${x(0)}" y="${H - 8}" text-anchor="start">${fechaChica(d.dias[0])}</text>` : ""}
      <text class="pgEje" x="${x(ult)}" y="${H - 8}" text-anchor="end">Hoy</text>
    </svg>
    <figcaption class="pgNums">${nums}</figcaption>
  </figure>`;
}
/** La gráfica de un nivel de gramática: temas cubiertos y tu puntaje del nivel. */
function graficaNivel(nivel) {
  const R = progresoHoy(), X = R.niveles[nivel];
  if (!X) return "";
  const u = R.dias.length - 1, c = X.cubiertos[u], p = X.puntaje[u];
  return graficaAvance({ dias: R.dias, linea: X.cubiertos, area: X.puntaje }, { linea: "Temas cubiertos", area: "Tu puntaje" },
    `${nivel}: has cubierto ${X.n[u]} de ${X.total} temas (${c}%). Tu puntaje del nivel: ${p}%. Desde el ${fechaChica(R.dias[0])}: cubiertos de ${X.cubiertos[0]}% a ${c}%, puntaje de ${X.puntaje[0]}% a ${p}%.`,
    `<p><span class="tdGrande">${c}%</span><span class="small">cubiertos · ${X.n[u]} de ${X.total} temas</span></p><p><span class="tdGrande si">${p}%</span><span class="small">tu puntaje del nivel</span></p>`);
}
let vocCache = null;
function progresoVocabHoy() {
  const hoy = N.fechaLocal(new Date()), suc = A.sucesos();
  const clave = hoy + "|" + suc.length;
  if (!vocCache || vocCache.clave !== clave) vocCache = { clave, r: N.progresoVocab(P, suc, hoy) };
  return vocCache.r;
}
const semanaMemo = {};
const LETRAS_DIA = ["D", "L", "M", "M", "J", "V", "S"];
/**
 * La curva del quiz de vocabulario (su elección del 22-Oct-2026, boceto 3 con un punto por día): tu puntaje de hoy
 * en grande, cuánto subió desde ayer y los últimos 7 días, uno por punto. Se vuelve a pintar con cada palabra.
 */
function curvaVocab() {
  if (!P || !E) return "";
  const hoy = N.fechaLocal(new Date());
  const S = N.semanaVocab(P, A.sucesos(), hoy, E, semanaMemo);
  const v = S.puntaje, hoyV = v[6], dif = Math.round((hoyV - v[5]) * 10) / 10;
  const W = 280, H = 52, X0 = 10, X1 = W - 12, Y0 = 8, Y1 = 34;
  let lo = Math.min(...v), hi = Math.max(...v);
  if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
  const xs = v.map((_, i) => X0 + (i * (X1 - X0)) / 6), ys = v.map((y) => Y1 - ((y - lo) / (hi - lo)) * (Y1 - Y0));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
  const num = (x) => String(x);
  const letras = S.dias.map((d, i) => (i === 6 ? "Hoy" : LETRAS_DIA[new Date(d + "T12:00:00").getDay()]));
  const nombres = S.dias.map((d, i) => (i === 6 ? "hoy" : DIAS_LARGOS_V[new Date(d + "T12:00:00").getDay()]));
  const dicho = `Tu dominio del vocabulario: ${num(hoyV)} por ciento, ${dif >= 0 ? "subió " + num(dif) : "bajó " + num(-dif)} desde ayer. Los últimos siete días: ${v.map((y, i) => nombres[i] + " " + num(y)).join(", ")}.`;
  return `<aside class="tjCurva" aria-label="Tu curva de dominio">
    <p class="tjCurvaNum"><b>${esc(num(hoyV))}%</b><span>dominio</span><span class="${dif > 0 ? "si" : dif < 0 ? "no" : ""}">${dif > 0 ? "+" : dif < 0 ? "−" : "±"}${esc(num(Math.abs(dif)))} hoy</span></p>
    <svg class="tjCurvaSvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(dicho)}">
      <path class="tjCurvaArea" d="M${pts.join(" L")} L${X1},${Y1 + 4} L${X0},${Y1 + 4} Z"></path>
      <path class="tjCurvaLinea" d="M${pts.join(" L")}"></path>
      ${xs.map((x, i) => `<circle class="${i === 6 ? "tjCurvaHoy" : "tjCurvaDia"}" cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${i === 6 ? 6.5 : 4}"></circle>`).join("")}
      ${xs.map((x, i) => `<text class="${i === 6 ? "tjCurvaLetraHoy" : "tjCurvaLetra"}" x="${x.toFixed(1)}" y="${H - 2}" text-anchor="middle">${letras[i]}</text>`).join("")}
    </svg>
  </aside>`;
}
const DIAS_LARGOS_V = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** La gráfica del vocabulario: qué parte del mazo ya viste y qué tan arriba van tus tarjetas. */
function graficaVocab() {
  const V = progresoVocabHoy();
  if (!V.dias.length) return "";
  const u = V.dias.length - 1, c = V.vistas[u], p = V.puntaje[u];
  return graficaAvance({ dias: V.dias, linea: V.vistas, area: V.puntaje }, { linea: "Tarjetas vistas", area: "Tu puntaje" },
    `Vocabulario: has visto ${V.n[u]} de tus ${V.total} tarjetas (${c}%). Tu puntaje: ${p}%. Desde el ${fechaChica(V.dias[0])}: vistas de ${V.vistas[0]}% a ${c}%, puntaje de ${V.puntaje[0]}% a ${p}%.`,
    `<p><span class="tdGrande">${c}%</span><span class="small">vistas · ${V.n[u]} de ${V.total} tarjetas</span></p><p><span class="tdGrande si">${p}%</span><span class="small">tu puntaje</span></p>`);
}
function seccionTendencias() {
  if (!P || !E) return "";
  // ---- Los últimos 7 días.
  const T = tendenciasHoy();
  const dif = (a, b) => { const d = b - a; return d > 0 ? "+" + d : d < 0 ? "−" + Math.abs(d) : "±0"; };
  const temas = (l, vacio) => (l.length ? `<div class="tdTemas">${l.map((x) => pistaTema(x, T.metaPct)).join("")}</div>` : `<p class="small">${vacio}</p>`);
  const caja = (k, nombre) => {
    const s = T.cajas[k], a = T.cajasBase[k], b = s[s.length - 1];
    return `<div class="tdCaja"><p class="tdFila"><b>Caja de ${nombre}</b><b>${a} → ${b} <span class="tdGris">(${dif(a, b)})</span></b></p>
      ${lineaTend(s, T.dias, "c" + k, `Tarjetas en la caja de ${nombre} cada día: ${s.join(", ")}.`)}</div>`;
  };
  const palabra = (x, texto) => {
    const c = tarjetas.get(x.id), sv = E.tarjetas.get(x.id);
    if (!c) return "";
    const v = N.tarjetaVista(c, sv);
    return `<button type="button" class="tdPalabra" data-v="${esc(x.id)}"><span lang="es-MX">${esc(v.reverso)}</span><span class="tdGris">${texto(x)}</span></button>`;
  };
  const cajaDe = (e) => (e < 0 ? "nueva" : CAJA_DIAS[e]);
  return `<section class="card tend" id="tendencias" aria-labelledby="tendT">
    <h2 id="tendT">Tu avance</h2>
    <h3 class="tdSub">Gramática por nivel</h3>
    ${avanceNivel("tdGrafNivel")}
    <h3 class="tdSub">Vocabulario</h3>
    ${graficaVocab()}
    <p class="small">La línea es qué parte de tu mazo ya viste${E.reinicioTj ? " desde el reinicio" : ""}; lo verde, qué tan arriba van tus tarjetas en la escalera (la caja de 75 días es 100%; las que no has visto cuentan 0).</p>
    <details class="tdDet" data-tdet="subieron"${tendAbiertas.has("subieron") ? " open" : ""}>
      <summary><h3 class="tdSub">Los que más subieron <span class="tdGris">· ${T.subieron.length} en 7 días</span></h3></summary>
      <p class="small">Aro: hace 7 días. Punto: hoy. Raya: tu meta, ${T.metaPct}%.</p>
      ${temas(T.subieron, "Ninguno subió esta semana.")}
    </details>
    <details class="tdDet" data-tdet="bajaron"${tendAbiertas.has("bajaron") ? " open" : ""}>
      <summary><h3 class="tdSub">Los que más bajaron <span class="tdGris">· ${T.bajaron.length} en 7 días</span></h3></summary>
      ${temas(T.bajaron, "Ninguno bajó esta semana.")}
    </details>
    <h3 class="tdSub">Vocabulario: tus cajas grandes</h3>
    ${caja(5, "75 días")}${caja(4, "30 días")}
    <p class="small">Las que suben a la de 75 vienen de la de 30: si la de 30 baja mientras la de 75 sube, vas bien.</p>
    <details class="tdDet" data-tdet="quedaron"${tendAbiertas.has("quedaron") ? " open" : ""}>
      <summary><h3 class="tdSub">Se te quedaron <span class="tdGris">· ${T.subieronCaja} subieron de caja</span></h3></summary>
      ${T.quedaron.length ? `<div class="tdPalabras">${T.quedaron.map((x) => palabra(x, (y) => "ya va a " + cajaDe(y.ahora))).join("")}</div>` : `<p class="small">Ninguna esta semana.</p>`}
    </details>
    <details class="tdDet" data-tdet="olvidadas"${tendAbiertas.has("olvidadas") ? " open" : ""}>
      <summary><h3 class="tdSub">Se te olvidaron <span class="tdGris">· ${T.olvidadasN}</span></h3></summary>
      ${T.olvidadas.length ? `<div class="tdPalabras">${T.olvidadas.map((x) => palabra(x, (y) => `de ${cajaDe(y.antes)} a ${cajaDe(y.ahora)}`)).join("")}</div>` : `<p class="small">Ninguna. ¡Así se hace!</p>`}
    </details>
  </section>`;
}

/** Pone el clip del premio en el fondo del Tablero. Si su video no está en este aparato ni en tu almacén, lo dice. */
function mostrarClipPremio(c) {
  const lugar = $("tutoraPremio");
  if (!lugar) return;
  F.mostrar(c.id, c.tramos, () => videoDeTutora(c.id), lugar);
  videoDeTutora(c.id).then((f) => {
    if (f || !lugar.isConnected || lugar.querySelector(".sinClip")) return;
    lugar.insertAdjacentHTML("beforeend", `<p class="small sinClip">No encuentro el video de ${esc(nombreTutora(c.id))} en este aparato ni en tu almacén de Cloudflare.</p>`);
  });
}

/** Busca un tema por lo que escribas: palabras del título (en inglés o en español), el número de la lección o su slug. En el orden de Kwiziq. */
function buscarTemas(texto) {
  const q = paraBuscar(texto).trim();
  if (!q) return [];
  const niveles = Object.keys(NIVELES);
  const palabras = q.split(/\s+/).filter(Boolean);
  const encaja = (t) => {
    if (/^\d+$/.test(q)) return String(t.id) === q || String(t.id).startsWith(q);
    const tu = tutoraDe(t.id);      // también por la tutora: su nombre y su oficio («Esperanza», «aeromoza»)
    const pajar = paraBuscar([t.titulo, t.titulo_kwiziq, t.slug, t.slug_kwiziq, t.regla, tu && tu.tutora].filter(Boolean).join(" "));
    return palabras.every((w) => pajar.includes(w));
  };
  return P.temas.filter(encaja).sort((a, b) => niveles.indexOf(a.nivel) - niveles.indexOf(b.nivel) || a.orden - b.orden).slice(0, 40);
}

function pintarBusqueda(texto) {
  const caja = $("bzRes");
  if (!caja) return;
  const q = texto.trim();
  if (!q) { caja.innerHTML = ""; $("bzNota").textContent = ""; return; }
  const temas = buscarTemas(q);
  $("bzNota").textContent = temas.length ? (temas.length === 40 ? "Los primeros 40. Escribe más para afinar." : plural(temas.length, "tema", "temas") + ", en el orden de Kwiziq.") : "Nada con eso. Prueba otra palabra, o el número de la lección.";
  const banco = bancoPorTema();
  caja.innerHTML = temas.map((t) => botonTema(t, { ingles: true, sub: `<span class="donde">${esc(t.nivel)} · #${t.orden} · lección ${t.id}</span>` + marcas(t, banco) })).join("");
}

function verBiblioteca(o) {
  revisarVideos();
  const antes = o.conserva && $("bzBusca") ? $("bzBusca").value : "";
  poner(conFondo(`
  ${entradas("gramatica", "lecciones")}
  <section class="card">
    <h1 class="h">Lecciones de gramática</h1>
    <form id="bzForma" class="forma" role="search" autocomplete="off">
      <label class="small" for="bzBusca">Buscar una lección</label>
      <input id="bzBusca" class="campo" type="search" value="${esc(antes)}" placeholder="Palabra del título, número de lección o tutora" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
    </form>
    <p class="small" id="bzNota" aria-live="polite"></p>
    <div class="links" id="bzRes"></div>
    <p>Todos los temas, por nivel. Elige uno.</p>
    <div class="links">${resumenNiveles().map((n) => botonNivel(n, true)).join("")}</div>
  </section>
  ${(P.tutoras || []).length && !mudo() ? `<section class="card">
    <h2>Tutoras</h2>
    <p>Una tutora por regla: su episodio y tus notas para cambiarlo. ${plural(P.tutoras.length, "tutora escrita", "tutoras escritas")}.</p>
    <div class="go"><a class="ub grande" href="#/tutoras">Ver las tutoras</a></div>
  </section>` : ""}`), { titulo: "Lecciones de gramática · Pelagos", nav: "gramatica", conserva: o.conserva });
  $("bzBusca").addEventListener("input", () => pintarBusqueda($("bzBusca").value));
  $("bzForma").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const temas = buscarTemas($("bzBusca").value);
    if (temas.length === 1 && temas[0].slug && temas[0].leccion) ir("/leccion/" + temas[0].slug);    // una sola: ve directo
    else pintarBusqueda($("bzBusca").value);
  });
  if (antes) pintarBusqueda(antes);
}

function verNivel(o, clave, filtro) {
  const nivel = clave.toUpperCase();
  if (!NIVELES[nivel]) return verNoExiste();
  const soloBajo = filtro === "/bajo", soloAtas = filtro === "/atascados";
  const atasT = temasAtascadosAhora();
  const cola = filtro || "";
  const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
  const bajo = suyos.filter((t) => esBajo(info(t.id).pct)).length;
  const categorias = [];
  const banco = bancoPorTema();
  revisarVideos();
  for (const t of suyos) {
    const i = info(t.id);
    if (soloBajo && !esBajo(i.pct)) continue;
    if (soloAtas && !atasT.has(t.id)) continue;
    const nombre = CATEGORIAS[t.categoria] || t.categoria;
    if (!categorias.length || categorias[categorias.length - 1].nombre !== nombre) categorias.push({ nombre, temas: [], bajo: 0 });
    categorias[categorias.length - 1].temas.push(t);
    if (esBajo(i.pct)) categorias[categorias.length - 1].bajo++;
  }
  const abiertas = new Set([...vista.querySelectorAll("details.cat[open] .cn")].map((e) => e.textContent));
  poner(conFondo(`
  <p class="crumb"><a href="#/gramatica">Gramática</a> · ${nivel}</p>
  <nav class="jump niveles" aria-label="Niveles">
    ${Object.keys(NIVELES).map((n) => `<a href="#/gramatica/${n.toLowerCase()}${cola}"${n === nivel ? ' aria-current="page"' : ""}>${n}</a>`).join("")}
  </nav>
  <header class="card">
    <h1 class="h">${nivel} · ${NIVELES[nivel]}</h1>
    <p>${suyos.length} temas. ${bajo} bajo ${meta()}%.</p>
    ${graficaNivel(nivel)}
    <nav class="jump tres" aria-label="Qué temas mostrar">
      <a href="#/gramatica/${clave}"${soloBajo || soloAtas ? "" : ' aria-current="page"'}>Todos</a>
      <a href="#/gramatica/${clave}/bajo"${soloBajo ? ' aria-current="page"' : ""}>Bajo ${meta()}%</a>
      <a href="#/gramatica/${clave}/atascados"${soloAtas ? ' aria-current="page"' : ""}>Atascados${(() => { const n = suyos.filter((t) => atasT.has(t.id)).length; return n ? " " + n : ""; })()}</a>
    </nav>
  </header>
  ${categorias.length ? categorias.map((c) => `
  <details class="card cat"${filtro || (o.conserva && abiertas.has(c.nombre)) ? " open" : ""}>
    <summary><span class="cn">${esc(c.nombre)}</span><span class="cc">${plural(c.temas.length, "tema", "temas")}${filtro ? "" : ` · ${c.bajo} bajo ${meta()}%`}</span></summary>
    <div class="links">${c.temas.map((t) => {
      const i = info(t.id);
      const sub = marcas(t, banco) + (i.n ? ` <span class="resp">${plural(i.n, "respuesta", "respuestas")}</span>` : "");
      return botonTema(t, { nivel: false, anchoNombre: true, ingles: true, sub });
    }).join("")}</div>
  </details>`).join("") : `<section class="card"><p>${soloAtas ? `Ningún tema de ${nivel} está atascado. Bien.` : `Ningún tema de ${nivel} está bajo ${meta()}%.`}</p></section>`}`),
  {
    titulo: nivel + " · Lecciones de gramática · Pelagos", nav: "gramatica", conserva: o.conserva,
    pie: "<p>Toca una categoría para abrirla. Los temas en inglés todavía no tienen lección propia: llevan el nombre que les da Kwiziq.</p>" + (E.sinArranque ? "<p>Un tema sin porcentaje (–) todavía no lo contestas aquí.</p>" : "<p>Un porcentaje sin número de respuestas es tu arranque de Kwiziq.</p>") + "<p>Cada tema lleva seis marcas: lección, tutora (con su nombre), video completo, loop, voz y preguntas. La marca llena es que ya está lista; la punteada, que falta. El video completo cuenta lo que hay en este aparato (tu carpeta «Pelagos videos» o los importados); el loop y la voz, lo que ya está subido. Se llenan solas conforme llegan.</p>",
  });
}

// ---------------------------------------------------------------- El mapa de árbol

let anchoDelMapa = 0;         // el ancho con el que se dibujó, para volver a dibujarlo si la pantalla cambia

/** Todos los temas en un mapa: una tarjeta por nivel, de C1 a A0; dentro, una caja por tipo de palabra y un cuadro de color por tema. */
/** El nombre de una regla, abreviado para que quepa en su cuadro del Atlas: «Ver in the preterite» → «Ver · pret.». */
const ABREVIAS = [[/^the /i, ""], [/ in the /gi, " · "], [/ with the /gi, " + "], [/\bpreterite\b/gi, "pret."], [/\bimperfect\b/gi, "imperf."],
  [/\bpresent\b/gi, "pres."], [/\bsubjunctive\b/gi, "subj."], [/\bconditional\b/gi, "cond."], [/\bfuture\b/gi, "fut."], [/\bperfect\b/gi, "perf."],
  [/\bindicative\b/gi, "ind."], [/\bimperative\b/gi, "imper."], [/\bverbs\b/gi, "vbs"], [/\bverb\b/gi, "vb"], [/\bpronouns?\b/gi, "pron."],
  [/\bexpressions?\b/gi, "expr."], [/\birregular\b/gi, "irreg."], [/\bregular\b/gi, "reg."], [/\badjectives?\b/gi, "adj."], [/\bstem-changing\b/gi, "stem-ch."],
  [/\s+and\s+/gi, " & "], [/\s{2,}/g, " "]];
function abreviarRegla(nom) {
  let x = String(nom || "");
  for (const [re, por] of ABREVIAS) x = x.replace(re, por);
  return x.trim();
}

function verMapa(o) {
  const W = Math.max(240, vista.clientWidth - 18);       // lo que queda dentro de la tarjeta
  anchoDelMapa = vista.clientWidth;
  const cuenta = [0, 0, 0, 0, 0, 0];
  let sinVer = 0;
  const tarjetas = Object.keys(NIVELES).reverse().map((nivel) => {
    const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
    if (!suyos.length) return "";
    const porTipo = new Map();
    let suma = 0, con = 0;
    for (const t of suyos) {
      if (!porTipo.has(t.categoria)) porTipo.set(t.categoria, []);
      porTipo.get(t.categoria).push(t);
      const v = info(t.id).pct, k = N.colorDe(info(t.id));
      if (v !== null) { suma += v; con++; }
      if (k !== null) cuenta[k]++; else sinVer++;
    }
    const tipos = [...porTipo.entries()].sort((a, b) => b[1].length - a[1].length);
    const area = Math.max(1300, Math.min(5200, W * 720 / suyos.length));      // cada nivel ocupa más o menos una pantalla
    const lugar = N.acomodarMapa(tipos.map(([, temas]) => temas.length), W, area);
    const cajas = tipos.map(([categoria, temas], k) => {
      const c = lugar.cajas[k];
      const nombre = CATEGORIAS[categoria] || categoria;
      const filas = [];
      for (let i = 0; i < temas.length; i += c.columnas) {
        const fila = temas.slice(i, i + c.columnas).map((t) => {
          const v = info(t.id).pct, f = N.colorDe(info(t.id));
          // Su pedido del 18-Oct: en cada cuadro, el nombre de la regla (aunque sea letra diminuta: en el teléfono se agranda
          // con dos dedos). El porcentaje ya no va en el cuadro: sale al tocarlo. La letra es la más grande que quepa.
          const nom = titulo(t), corto = abreviarRegla(nom);
          const largaPalabra = Math.max(4, ...corto.split(/\s+/).map((w) => w.length));
          const letra = Math.max(1.5, Math.min(9, 0.8 * Math.sqrt((c.cw - 4) * (c.ch - 3) / (0.6 * 1.25 * Math.max(6, corto.length + 4))), (c.cw - 4) / (0.62 * largaPalabra)));
          return `<button type="button" class="mc mn ${f === null ? "kx" : "k" + f}" data-l="${t.id}" aria-label="${esc(nom)}: ${esc(pct(v))}"><span class="mt"${t.titulo ? "" : ' lang="en"'} data-letra="${letra.toFixed(1)}">${esc(corto)}</span></button>`;
        });
        while (fila.length < c.columnas) fila.push('<span class="mc vacio"></span>');
        filas.push(`<div class="mfila">${fila.join("")}</div>`);
      }
      return `<div class="mcaja" role="group" aria-label="${esc(nombre)}: ${plural(temas.length, "tema", "temas")}" data-caja="${(c.x / W * 100).toFixed(3)},${c.y.toFixed(1)},${(c.w / W * 100).toFixed(3)},${c.h.toFixed(1)}">
        ${c.rotulo ? `<div class="mrot" aria-hidden="true">${esc(CATEGORIAS_CORTAS[categoria] || nombre)}${c.w >= 120 ? ` <span>${temas.length}</span>` : ""}</div>` : ""}
        <div class="mcuerpo">${filas.join("")}</div>
      </div>`;
    });
    return `
    <section class="card nivelMapa" id="mapa${nivel}">
      <h2><button type="button" class="mgraf" data-grafnivel="${nivel}" aria-label="${nivel}, ${NIVELES[nivel]}: ${pct(con ? suma / con : null)}. Ver tu porcentaje día por día"><span class="lv">${nivel}</span> ${NIVELES[nivel]} <span class="mpc">${pct(con ? suma / con : null)}</span></button></h2>
      <div class="mmapa" data-alto="${lugar.alto}">${cajas.join("")}</div>
    </section>`;
  }).join("");

  // El fondo del día va fijo al fondo, el mismo que en el Tablero.
  const fondo = fondoDelDia();
  poner(`
  <div class="hoy mapa${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("gramatica", "atlas")}
      <h1 class="sr">Atlas</h1>
      ${tarjetas}
      <section class="card" id="clave">
        <h2 class="sr">Qué significa cada color</h2>
        <p class="small">El color es el peldaño del tema: cada cuánto te toca repasarlo. El número es tu porcentaje.</p>
        <ul class="clave">${N.PELDANOS.map((nombre, i) => `<li><i class="mc k${i}"></i><span>${nombre}</span><b>${cuenta[i]}</b></li>`).join("")}${sinVer ? `<li><i class="mc kx"></i><span>Sin ver</span><b>${sinVer}</b></li>` : ""}</ul>
      </section>
    </div>
  </div>`,
  { titulo: "Atlas · Pelagos", nav: "gramatica", conserva: o.conserva });
}

window.addEventListener("resize", () => {
  // Si la pantalla cambia de ancho (o el teléfono se voltea), el mapa se vuelve a dibujar a la medida.
  if (vista.querySelector(".nivelMapa") && Math.abs(vista.clientWidth - anchoDelMapa) > 8) pintar({ conserva: true });
});

// ---------------------------------------------------------------- El mapa de calor

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const miles = (n) => Number(n).toLocaleString("es-MX");

/**
 * Medio año como tira de calor: cada columna es una semana (de lunes a domingo, de arriba abajo) y cada cuadro un día.
 * Los días que todavía no llegan no se dibujan.
 */
/** El color de un día en la Bitácora: «jv» vocabulario (amarillo), «jg» gramática (azul), «ja» los dos (verde), más su escalón. */
function colorDelDia(dia, modo) {
  const v = E.actividadVoc.get(dia) || 0, g = E.actividadGram.get(dia) || 0;
  const nv = N.nivelDeCalor(v), ng = N.nivelDeCalor(g, N.CALOR_GRAM);
  if (modo === "vocabulario") return nv ? `jv c${nv}` : "c0";
  if (modo === "gramatica") return ng ? `jg c${ng}` : "c0";
  const n = E.actividad.get(dia) || 0;
  if (v && g) return `ja c${Math.max(nv, ng)}`;
  if (g) return `jg c${ng}`;
  if (n) return `jv c${N.nivelDeCalor(n)}`;           // repasos de vocabulario (o respuestas sueltas de gramática sin quiz terminado)
  return "c0";
}
let calorModo = null;         // «juntos», «vocabulario» o «gramatica»: lo que enseña la Bitácora (se guarda en el aparato)

function tiraDeCalor(anio, mesInicial, hoy, modo = "juntos") {
  const dos = (n) => String(n).padStart(2, "0");
  const cuadros = [], meses = [];
  const primero = new Date(anio, mesInicial, 1);
  const hueco = (primero.getDay() + 6) % 7;                 // lunes = 0
  for (let k = 0; k < hueco; k++) cuadros.push('<i class="hc vacio"></i>');
  for (let d = new Date(primero); d.getMonth() < mesInicial + 6 && d.getFullYear() === anio; d.setDate(d.getDate() + 1)) {
    const dia = `${anio}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    if (dia > hoy) break;
    if (d.getDate() === 1) meses.push(`<span data-col="${Math.floor(cuadros.length / 7) + 1}">${MESES_CORTOS[d.getMonth()]}</span>`);
    const n = E.actividad.get(dia) || 0;
    cuadros.push(`<i class="hc ${colorDelDia(dia, modo)}${dia === hoy ? " hoy" : ""}" data-dia="${dia}" data-n="${n}" data-v="${E.actividadVoc.get(dia) || 0}" data-g="${E.actividadGram.get(dia) || 0}"></i>`);
  }
  if (cuadros.length === hueco) return "";
  return `<div class="hmeses" aria-hidden="true">${meses.join("")}</div><div class="htira">${cuadros.join("")}</div>`;
}

/** Las últimas semanas, de lunes a domingo, en una sola tira (la Bitácora del Tablero). */
function tiraReciente(hoy, modo, semanas = 26) {
  const dos = (n) => String(n).padStart(2, "0");
  const fin = new Date(hoy + "T12:00:00");
  const ini = new Date(fin); ini.setDate(ini.getDate() - ((fin.getDay() + 6) % 7) - 7 * (semanas - 1));
  const cuadros = [], meses = [];
  for (const d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
    const dia = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    if (d.getDate() === 1) meses.push(`<span data-col="${Math.floor(cuadros.length / 7) + 1}">${MESES_CORTOS[d.getMonth()]}</span>`);
    cuadros.push(`<i class="hc ${colorDelDia(dia, modo)}${dia === hoy ? " hoy" : ""}" data-dia="${dia}"></i>`);
  }
  return `<div class="hmeses" aria-hidden="true">${meses.join("")}</div><div class="htira">${cuadros.join("")}</div>`;
}
/** La tarjeta de la Bitácora en el Tablero (22-Oct-2026): solo el mapa de calor, con Juntos · Vocabulario · Gramática. */
function tarjetaBitacora() {
  if (!calorModo) calorModo = ["juntos", "vocabulario", "gramatica"].includes(guardado("pelagos.bitacora")) ? guardado("pelagos.bitacora") : "juntos";
  const hoy = N.fechaLocal(new Date());
  return `<section class="card bitT" id="bitacora" aria-labelledby="bitTT">
    <h2 id="bitTT">Bitácora</h2>
    <div class="tdSeg" role="group" aria-label="Qué enseña la Bitácora">${[["juntos", "Juntos"], ["vocabulario", "Vocabulario"], ["gramatica", "Gramática"]].map(([clave, nombre]) => `<button type="button" data-bmodo="${clave}" aria-pressed="${clave === calorModo}">${nombre}</button>`).join("")}</div>
    <div class="hanio" id="bitTira" role="img" aria-label="Tus últimas 26 semanas de estudio">${tiraReciente(hoy, calorModo)}</div>
  </section>`;
}
vista.addEventListener("click", (ev) => {
  const b = ev.target instanceof Element ? ev.target.closest("[data-bmodo]") : null;
  if (!b) return;
  calorModo = b.dataset.bmodo; guardar("pelagos.bitacora", calorModo);
  const caja = b.closest(".bitT");
  for (const x of caja.querySelectorAll("[data-bmodo]")) x.setAttribute("aria-pressed", String(x.dataset.bmodo === calorModo));
  caja.querySelector("#bitTira").innerHTML = tiraReciente(N.fechaLocal(new Date()), calorModo);
  for (const e of caja.querySelectorAll("[data-col]")) e.style.gridColumnStart = e.dataset.col;      // los meses, otra vez en su lugar
});

/** Tu historia de estudio, día por día: entre más repasos, más caliente el color. Un año por tarjeta, el más nuevo arriba. */
function verCalor(o) {
  const hoy = N.fechaLocal(new Date());
  if (!calorModo) calorModo = ["juntos", "vocabulario", "gramatica"].includes(guardado("pelagos.bitacora")) ? guardado("pelagos.bitacora") : "juntos";
  const modo = calorModo;
  const mapa = modo === "vocabulario" ? E.actividadVoc : modo === "gramatica" ? E.actividadGram : E.actividad;
  const unidad = modo === "gramatica" ? ["quiz", "quizzes"] : ["repaso", "repasos"];
  const R = N.rachas(mapa, hoy);
  const ambos = [...E.actividadGram.keys()].filter((d) => E.actividadVoc.get(d) > 0).length;
  const porAnio = new Map();
  for (const [dia, n] of mapa) {
    const a = Number(dia.slice(0, 4));
    if (!porAnio.has(a)) porAnio.set(a, { dias: 0, total: 0 });
    porAnio.get(a).dias++; porAnio.get(a).total += n;
  }
  const esteAnio = Number(hoy.slice(0, 4));
  const primerAnio = porAnio.size ? Math.min(...porAnio.keys()) : esteAnio;
  const anios = [];
  for (let a = esteAnio; a >= primerAnio; a--) anios.push(a);
  const fondo = fondoDelDia();
  const dias = (n) => plural(n, "día", "días");
  poner(`
  <div class="hoy mapa calor${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("tablero", "bitacora")}
      <section class="card" id="calorCabeza">
        <h1 class="h">Bitácora</h1>
        <div class="jump tres" role="group" aria-label="Qué enseña la Bitácora" id="calorModo">
          ${[["juntos", "Juntos"], ["vocabulario", "Vocabulario"], ["gramatica", "Gramática"]].map(([clave, nombre]) => `<button type="button" data-modo="${clave}" aria-pressed="${clave === modo}">${nombre}</button>`).join("")}
        </div>
        <p class="small" id="calorDia" role="status">Toca un cuadro para ver ese día.</p>
      </section>
      ${anios.map((a) => {
        const x = porAnio.get(a) || { dias: 0, total: 0 };
        return `
      <section class="card anioCalor" id="calor${a}">
        <h2>${a} <span class="mpc">${x.dias ? `${dias(x.dias)} · ${miles(x.total)}` : "sin estudio"}</span></h2>
        <div class="hanio" role="img" aria-label="${a}: ${x.dias ? `${dias(x.dias)} de estudio y ${miles(x.total)} ${unidad[1]}` : "sin estudio"}">${tiraDeCalor(a, 0, hoy, modo)}${tiraDeCalor(a, 6, hoy, modo)}</div>
      </section>`;
      }).join("")}
      <section class="card" id="calorClave">
        ${(() => { const g = granTotal(); return g ? `<p class="granTotal"><b>${Math.floor(g.horas).toLocaleString("es-MX")} horas</b>de español desde ${g.desde ? g.desde.slice(0, 4) : "siempre"}.</p>` : ""; })()}
        <div class="extras">
          <div><b>${dias(R.actual)}</b>racha de ahora</div>
          <div><b>${dias(R.larga)}</b>tu racha más larga</div>
          <div><b>${miles(R.dias)}</b>días estudiados</div>
        </div>
        ${R.mejor.dia ? `<p class="small">${miles(R.total)} ${unidad[1]} en total. Tu mejor día fue el ${fecha(R.mejor.dia)}, con ${miles(R.mejor.n)}.${R.largaFin ? ` Tu racha más larga terminó el ${fecha(R.largaFin)}.` : ""}${modo === "juntos" ? ` ${ambos === 1 ? "1 día" : miles(ambos) + " días"} con los dos.` : ""}</p>` : `<p>Todavía no hay días${modo === "gramatica" ? " con quizzes" : " de estudio"}. Aquí se van a ir prendiendo.</p>`}
        <ul class="hclave" aria-label="Qué significa cada color">
          <li><i class="hc c0"></i>Nada</li>${modo === "juntos"
            ? '<li><i class="hc jv c3"></i>Vocabulario</li><li><i class="hc jg c3"></i>Gramática</li><li><i class="hc ja c3"></i>Los dos</li>'
            : (modo === "gramatica" ? N.CALOR_GRAM : N.CALOR).map((desde, i, esc_) => `<li><i class="hc ${modo === "gramatica" ? "jg" : "jv"} c${i + 1}"></i>${desde}${i === esc_.length - 1 ? " o más" : esc_[i + 1] - 1 === desde ? "" : " a " + (esc_[i + 1] - 1)}</li>`).join("")}
        </ul>
      </section>
    </div>
  </div>`,
  { titulo: "Bitácora · Pelagos", nav: "inicio", conserva: o.conserva });
  // Un toque en un cuadro dice qué día es y cuánto estudiaste.
  let marcado = null;
  vista.querySelector(".sobre").addEventListener("click", (ev) => {
    const b = ev.target instanceof Element ? ev.target.closest("[data-modo]") : null;
    if (b) { calorModo = b.dataset.modo; guardar("pelagos.bitacora", calorModo); return pintar({ conserva: true }); }
    const c = ev.target instanceof Element ? ev.target.closest(".hc[data-dia]") : null;
    if (!c) return;
    if (marcado) marcado.classList.remove("sel");
    marcado = c; c.classList.add("sel");
    const n = Number(c.dataset.n), v = Number(c.dataset.v), g = Number(c.dataset.g);
    const que = modo === "vocabulario" ? (v ? plural(v, "repaso de vocabulario", "repasos de vocabulario") : "sin vocabulario")
      : modo === "gramatica" ? (g ? plural(g, "quiz de gramática", "quizzes de gramática") : "sin quizzes")
        : n ? plural(n, "repaso", "repasos") + (g ? ` y ${plural(g, "quiz de gramática", "quizzes de gramática")}` : "") : "sin estudio";
    $("calorDia").textContent = `${diaLargo(c.dataset.dia)} de ${c.dataset.dia.slice(0, 4)}: ${que}.`;
  });
}

// ---------------------------------------------------------------- El quiz de vocabulario

let enTarjetaDe = null;       // la tarjeta que está en pantalla: no se repinta debajo de ti

/**
 * Tu vocabulario. Las tarjetas son sencillas a propósito: inglés al frente, español atrás, y nada más. Te la sabes o no.
 * Sale una tarjeta a la vez: el frente en inglés. Lo dices en español, tocas en cualquier parte para ver
 * la respuesta y te calificas con «Mal» o «Bien», que están siempre en el mismo lugar. Al calificar sale la siguiente.
 */
function verTarjetas(o) {
  if (o.conserva && enTarjetaDe) { enPregunta = true; return; }
  const hoy = N.fechaLocal(new Date());
  const dia = N.tarjetasDelDia(P, E, hoy);
  // Adelanto: cuando ya estás en cero, «Adelantar» trae una tanda de las que tocan pronto. Vive solo en esta página;
  // cada calificación es un suceso «tj» con «adelanto». Una tarjeta sale de la tanda en cuanto la calificas.
  if (adelanto && adelanto.dia !== hoy) adelanto = null;                                  // la tanda es de hoy nada más
  const restan = adelanto ? adelanto.ids.filter((id) => { const s = E.tarjetas.get(id); return s && !s.quitada && !(s.ultima && s.ultima >= adelanto.desde); }) : [];
  if (adelanto && !restan.length) adelanto = null;
  if (!dia.pendientes.length && !restan.length) {
    const masTarde = N.tarjetasAdelante(P, E, hoy);
    // El letrero «Vocabulario en cero · Hoy repasaste…» se quitó el 22-Oct-2026 (su pedido): el cuadro ya lo dice.
    return poner(conFondo(`
    ${entradas("vocabulario", "quiz")}
    <section class="card" id="tjCero">
      ${dia.total ? `<h1 class="sr">Vocabulario en cero</h1>` : `<h1 class="h">Todavía no hay vocabulario</h1><p>Cuando haya palabras en el contenido, aquí salen las de cada día.</p>`}
      <div class="conCuadro">${masTarde.length ? `<button type="button" class="ub grande" id="tjAdelantar">Adelantar ${masTarde.length}</button>` : "<span></span>"}<div class="unCuadro" role="list" aria-label="Tu vocabulario de hoy">${cuadroVocabulario(hoy)}</div></div>
      ${curvaVocab().replace('class="tjCurva"', 'class="tjCurva enCero"')}
      ${masTarde.length ? `<p class="small">Estudia ahora ${plural(masTarde.length, "palabra que toca", "palabras que tocan")} más adelante. La que aciertes sube su escalón desde hoy; la que falles vuelve a salir hoy.</p>` : ""}
    </section>`), { titulo: "Quiz de vocabulario · Pelagos", nav: "vocabulario", conserva: o.conserva });
    return;
  }
  // Primero se termina la tanda; las que falles en ella quedan para hoy y salen después, como cualquier fallada.
  const enAdelanto = restan.length > 0;
  const cola = enAdelanto ? restan : dia.pendientes;
  const antes = E.tarjetas.get(cola[0]);
  const c = N.tarjetaVista(tarjetas.get(cola[0]), antes);
  const foto = fotoDeLaTarjeta(c.id, hoy, antes);
  const hechas = enAdelanto ? adelanto.ids.length - restan.length : dia.hechasHoy;
  const total = enAdelanto ? adelanto.ids.length : dia.hechasHoy + dia.pendientes.length;
  const faltan = (enAdelanto ? "Adelanto: " : "") + (cola.length === 1 ? (enAdelanto ? "falta 1" : "Falta 1") : (enAdelanto ? "faltan " : "Faltan ") + cola.length);

  poner(`
  ${entradas("vocabulario", "quiz")}
  <section class="kw tj">
    <header class="hero kwh tjh">
      <div class="ratio"></div>
      ${foto ? `<img data-foto="${esc(foto.nombre)}"${foto.vocab ? ' data-vocab="1"' : ""} alt="">` : ""}
      <div class="over">
        <p class="lead sr"><span id="tjFaltan">${enAdelanto ? faltan : (cola.length === 1 ? "Falta 1" : "Faltan " + cola.length)}</span><span id="tjAviso">Dilo en español</span></p>
        <div data-explicas>${lineaDeVocabulario(dia, c.id, antes)}${panelExplica()}</div>
        ${renglonConLapiz("frente", c.frente, "h1", "cue", ' id="cue"')}
        ${(() => { const at = N.tarjetasAtascadas(E).get(c.id); return at ? `<p class="tjAtas">Atascada · fallada en ${at.fallos} quizzes esta semana · <button type="button" class="lk" data-v="${esc(c.id)}">Ver su ficha</button></p>` : ""; })()}
      </div>
      <div class="rule tjResp" id="tjResp" tabindex="-1" aria-live="polite" hidden>
        <ul class="exs"><li class="ex">${renglonConLapiz("reverso", c.reverso, "span", "es", ' id="vResp"')}</li></ul>
      </div>
    </header>
    <div class="tjZona">
      <p class="tjToca" id="tjToca">Toca para ver la respuesta</p>
      <div class="tjBotones" id="tjBotones" role="group" aria-label="¿La supiste?" hidden><button type="button" class="ub" id="jMal">Mal</button><button type="button" class="ub" id="jBien">Bien</button></div>
    </div>
    ${curvaVocab()}
  </section>`,
  { titulo: "Quiz de vocabulario · Pelagos", nav: "vocabulario" });
  enPregunta = true;
  enTarjetaDe = c.id;

  // Dos toques seguidos no deben contar dos veces: el segundo toque de «Bien» no destapa la tarjeta nueva,
  // y el toque que destapa no califica si cae justo donde aparecen los botones.
  const ESPERA = 350;
  const pintadaEn = Date.now();
  let destapadaEn = 0, calificada = false;

  function destapar(conTecla = false) {
    if (destapadaEn || (!conTecla && Date.now() - pintadaEn < ESPERA)) return;
    destapadaEn = Date.now();
    toque = null;
    $("tjResp").hidden = false;
    $("tjToca").hidden = true;
    $("tjBotones").hidden = false;
    $("tjAviso").textContent = "¿La supiste?";
    vista.querySelector('.tjh [data-lapiz="frente"]').hidden = false;
    $("tjResp").focus({ preventScroll: true });
    teclas = { b: () => calificar(true, true), m: () => calificar(false, true) };
  }
  function calificar(bien, conTecla = false) {
    if (calificada || !destapadaEn || (!conTecla && Date.now() - destapadaEn < ESPERA)) return;
    calificada = true;
    A.apuntar({ t: "tj", id: N.nuevoId("t"), tarjeta: c.id, cuando: new Date().toISOString(), bien: bien ? 1 : 0, modo: "tocar", ...(enAdelanto ? { adelanto: 1 } : {}) });
    recalcular();
    enTarjetaDe = null;
    // Los puntitos enseñan si la tarjeta subió o se cayó, y luego sale la siguiente (o «Vocabulario en cero»).
    const de = nivelDe(antes), a = nivelDe(E.tarjetas.get(c.id));
    moverNivel(de, a);
    $("tjAviso").textContent = a > de ? `Sube al peldaño ${a}` : a < de ? `Se cae al peldaño ${a}` : `Se queda en el peldaño ${a}`;
    $("tjBotones").hidden = true;
    setTimeout(() => pintar(), a === de ? 450 : 900);
  }
  toque = () => destapar();
  teclas = { " ": () => destapar(true), enter: () => destapar(true) };
  // Los lápices: el del inglés sale hasta que destapas, para no tocarlo sin querer antes de pensar la respuesta.
  vista.querySelector('.tjh [data-lapiz="frente"]').hidden = true;
  activarLapices(vista.querySelector(".tjh"), c.id, () => {});
  $("jBien").addEventListener("click", () => calificar(true));
  $("jMal").addEventListener("click", () => calificar(false));
}

/** La «Línea C» del quiz de vocabulario: lo que queda HOY por grupo, los puntitos de esta tarjeta y tus cajas. */
function lineaDeVocabulario(dia, id, antes) {
  const g = dia.grupos;
  const cuenta = [g.nuevas.length, g.vencidas.length, g.falladas.length];
  const actual = g.nuevas.includes(id) ? 0 : g.vencidas.includes(id) ? 1 : g.falladas.includes(id) ? 2 : -1;
  const cajas = [0, 0, 0, 0, 0, 0];
  for (const c of mazo()) {
    const s = E.tarjetas.get(c.id);
    if (s && s.toca && !s.quitada) cajas[Math.max(0, Math.min(5, s.escalon | 0))]++;
  }
  return lineaLeitner({ cuenta, actual, nivel: nivelDe(antes), cajas, que: "palabras" });
}
/** El peldaño de una tarjeta en la escalera (1 a 6, uno por escalón de N.ESCALONES); 0 si nunca la has acertado. */
function nivelDe(s) { return s && s.toca ? s.escalon + 1 : 0; }
/** Seis puntitos, uno por peldaño, con los mismos seis colores del Atlas. */
function htmlNivel(n) {
  return `<div class="tjNivel" id="tjNivel" role="img" aria-label="${n ? `Peldaño ${n} de ${N.ESCALONES.length}` : "Tarjeta nueva"}">${N.ESCALONES.map((_, i) =>
    `<i class="k${i}${i < n ? " on" : ""}"></i>`).join("")}</div>`;
}
/**
 * La línea de arriba de los quizzes (15-Oct-2026, «Línea C»): el contador de colores (nuevos - vencidos - fallados,
 * con una rayita bajo el grupo de la pregunta de ahora), los seis puntitos de esta pregunta y las seis cajas
 * (cuántos hay en cada una, arriba, y sus días, abajo; la de esta pregunta en blanco).
 *   cuenta [nuevos, vencidos, fallados] · actual 0, 1, 2 o -1 · nivel 0 a 6 · cajas [6 números] · que "temas" | "palabras"
 */
function lineaLeitner({ cuenta, actual, nivel, cajas, que }) {
  const nombres = [["nuevo", "nuevos"], ["vencido", "vencidos"], ["fallado", "fallados"]];
  const dice = cuenta.map((n, i) => n + " " + nombres[i][n === 1 ? 0 : 1]).join(", ");
  // Cada número es un botón: al tocarlo se explica abajo (su idea del 22-Oct-2026). Solo en gramática por ahora.
  const num = (n, i) => que === "temas" ? `<button type="button" class="lnN g${i}${i === actual ? " cur" : ""}" data-explica="quiz:${i}:${n}" aria-pressed="false">${n}</button>`
    : `<b class="lnN g${i}${i === actual ? " cur" : ""}">${n}</b>`;
  const caja = (n, i) => `<span class="lnC${nivel && i === nivel - 1 ? " cur" : ""}${n ? "" : " cero"}"><b>${n}</b><small>${N.ESCALONES[i]}d</small></span>`;
  const enCajas = cajas.map((n, i) => `${N.PELDANOS[i]}, ${n}`).join("; ");
  if (que === "temas" || que === "palabras") return `<div class="lineaG">
    <div class="gFila">${que === "temas" ? `<span class="lnCuenta" role="img" aria-label="Este quiz: ${dice}">${cuenta.map(num).join('<i aria-hidden="true">-</i>')}</span>` : "<span></span>"}<span class="hoyFila"><span>Hoy</span>${que === "temas" ? circulosDeHoy("medio") : circulosDeHoy("medio", cuenta, "vhoy")}</span></div>
    <span class="lnCajas grandes" role="img" aria-label="Tus ${que} por caja: ${enCajas}${nivel ? `. Este tema va en la de ${N.PELDANOS[nivel - 1]}` : ". Este tema todavía no tiene caja"}">${cajas.map(caja).join("")}</span>
  </div>`;
  return `<div class="linea">
    <span class="lnCuenta" role="img" aria-label="Quedan: ${dice}">${cuenta.map(num).join('<i aria-hidden="true">-</i>')}</span>
    ${htmlNivel(nivel)}
    <span class="lnCajas" role="img" aria-label="Tus ${que} por caja: ${enCajas}">${cajas.map(caja).join("")}</span>
  </div>`;
}
// ---------------------------------------------------------------- Lo que te queda hoy (su idea del 22-Oct-2026)
// Su regla: rayitas para «este quiz» (la línea de arriba del quiz) y círculos para «hoy».
const GRUPOS_HOY = [["nuevo", "nuevos"], ["vencido", "vencidos"], ["fallado", "fallados"]];
/** Los tres círculos de hoy. tam: "chico" (Tablero), "medio" (durante el quiz) o "grande" (página del Quiz, con su palabra). */
function circulosDeHoy(tam, cuentas = null, donde = "hoy") {
  const c = cuentas ? null : N.cuentaDelDia(P, E, N.fechaLocal(new Date()));
  const ns = cuentas || [c.nuevos, c.vencidos, c.fallados];
  const G = donde === "vhoy" ? GRUPOS_VOC : GRUPOS_HOY;
  const dice = ns.map((n, i) => n + " " + G[i][n === 1 ? 0 : 1]).join(", ");
  return `<span class="hoyC ${tam}" role="group" aria-label="Hoy: ${dice}">${ns.map((n, i) =>
    `<button type="button" class="circ g${i}" data-explica="${donde}:${i}:${n}" aria-pressed="false" aria-label="${n} ${G[i][n === 1 ? 0 : 1]} hoy"><b>${n}</b>${tam === "grande" ? `<span>${G[i][n === 1 ? 0 : 1]}</span>` : ""}</button>`).join("")}</span>`;
}
const GRUPOS_VOC = [["nueva", "nuevas"], ["vencida", "vencidas"], ["fallada", "falladas"]];
const panelExplica = () => `<div class="explica" role="status" hidden></div>`;
function textoExplica(donde, i, n) {
  const g = (donde === "vhoy" ? GRUPOS_VOC : GRUPOS_HOY)[i][n === 1 ? 0 : 1], titulo = `${donde === "quiz" ? "Este quiz" : "Hoy"} · ${n} ${g}:`;
  const T = donde === "vhoy" ? [
    "palabras que todavía no has aprendido y que entran hoy.",
    "palabras que ya aprendiste y que hoy te toca repasar.",
    "palabras que fallaste hoy; vuelven a salir hasta que las aciertes.",
  ] : donde === "hoy" ? [
    "lo que te queda de tus cinco temas nuevos de hoy. Si ya no te queda ningún repaso, entran más.",
    "temas que ya aprendiste y que hoy te toca repasar, contando los que todavía no entran a tu quiz. Entran primero, el más atrasado antes.",
    "temas que todavía te deben aciertos, de cualquier día. Necesitan dos aciertos seguidos para salir de tu plan.",
  ] : [
    "de las preguntas que te quedan en este quiz, estas son de temas que nunca has acertado.",
    "de las preguntas que te quedan en este quiz, estas son de temas que ya te tocaba repasar.",
    "de las preguntas que te quedan en este quiz, estas son de temas que todavía te deben aciertos.",
  ];
  return `<b class="g${i}">${esc(titulo)}</b> ${esc(T[i])}`;
}
// Tocar un número lo explica abajo; tocarlo otra vez, o tocar otro, cambia o cierra. Dentro del cuadro del Tablero no abre el quiz.
document.addEventListener("click", (ev) => {
  const b = ev.target.closest && ev.target.closest("[data-explica]");
  if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const caja = b.closest("[data-explicas]"), panel = caja && caja.querySelector(".explica");
  if (!panel) return;
  const abierto = b.getAttribute("aria-pressed") === "true";
  caja.querySelectorAll("[data-explica]").forEach((x) => x.setAttribute("aria-pressed", "false"));
  if (abierto) { panel.hidden = true; return; }
  const [donde, i, n] = b.dataset.explica.split(":");
  b.setAttribute("aria-pressed", "true");
  panel.className = "explica g" + i;
  panel.innerHTML = textoExplica(donde, Number(i), Number(n));
  panel.hidden = false;
}, true);

/** Llena o vacía los puntitos, uno tras otro, para que se vea la subida o la caída. */
function moverNivel(de, a) {
  const caja = $("tjNivel");
  if (!caja) {
    // Sin puntitos (23-Oct-2026): se resalta la caja a la que llegó la tarjeta o el tema.
    const cs = [...document.querySelectorAll(".lnCajas.grandes .lnC")];
    cs.forEach((c, i) => { c.classList.toggle("cur", i === a - 1); c.classList.remove("salta", "cae"); });
    if (a > 0 && cs[a - 1]) { void cs[a - 1].offsetWidth; cs[a - 1].classList.add(a > de ? "salta" : a < de ? "cae" : "salta"); }
    return;
  }
  caja.classList.add(a > de ? "sube" : a < de ? "baja" : "igual");
  caja.setAttribute("aria-label", `Peldaño ${a} de ${N.ESCALONES.length}`);
  [...caja.children].forEach((p, i) => {
    const paso = a < de ? de - 1 - i : i - de;      // al caer se vacían de derecha a izquierda
    p.style.transitionDelay = Math.max(0, paso) * 70 + "ms";
    p.classList.toggle("on", i < a);
  });
}

// ---------------------------------------------------------------- La lista de vocabulario

let adelanto = null;          // la tanda de «Adelantar»: { dia, desde, ids }. Solo en esta página.
// El botón se escucha desde el documento: la página se puede volver a pintar sola (al guardar) y el botón cambia.
document.addEventListener("click", (ev) => {
  if (!ev.target.closest || !ev.target.closest("#tjAdelantar")) return;
  const hoy = N.fechaLocal(new Date()), ids = N.tarjetasAdelante(P, E, hoy);
  if (!ids.length) return;
  adelanto = { dia: hoy, desde: new Date().toISOString(), ids };
  pintar();
});

const TANDA = 300;            // cuántas palabras se pintan de un jalón
const ORDENES = [["fallo", "Falladas"], ["az", "A–Z"], ["toca", "Próximas"], ["nueva", "Nuevas"]];
let lvBusca = "";             // lo que escribiste en el buscador
let lvOrden = "fallo";
let lvAtascadas = false;      // el filtro «Atascadas» del Acervo
let lvCuantas = TANDA;
let lvAviso = null;           // la palabra que acabas de quitar, para poder deshacerlo

const paraBuscar = (texto) => N.sinAcentos(N.normalizar(texto));
const sinArticulo = (texto) => paraBuscar(texto).replace(/^(el|la|los|las|un|una|unos|unas)\s+/, "");
const alfabeto = (a, b) => sinArticulo(a.c.reverso).localeCompare(sinArticulo(b.c.reverso), "es");
const ORDENAR = {
  fallo: (a, b) => (a.pct === null) - (b.pct === null) || a.pct - b.pct || alfabeto(a, b),                    // las que más fallas primero; las que no has visto, al final
  az: alfabeto,
  toca: (a, b) => (!a.s.toca) - (!b.s.toca) || (a.s.toca < b.s.toca ? -1 : a.s.toca > b.s.toca ? 1 : 0) || alfabeto(a, b),
  // Por fecha de alta: las que agregaste más recién primero; las que no traen fecha, al final.
  nueva: (a, b) => (!a.c.agregada) - (!b.c.agregada) || (a.c.agregada > b.c.agregada ? -1 : a.c.agregada < b.c.agregada ? 1 : 0) || alfabeto(a, b),
};

/** Todas tus palabras, cada una con lo que le hayas corregido, su avance y su porcentaje de aciertos. */
function palabras() {
  return mazo().map((c) => { const s = E.tarjetas.get(c.id); return { id: c.id, c: N.tarjetaVista(c, s), s, pct: N.aciertoDeTarjeta(s) }; });
}

/** El ambiente de las fotos (Ajustes): «reef» o «limpio». Se guarda en este aparato. Expanse se juntó con Reef
 *  (pedido del 13-Oct-2026): quien lo tenía guardado ve Reef. */
function ambiente() {
  return guardado("pelagos.ambiente") === "limpio" ? "limpio" : "reef";
}
/** En Limpio, Pelagos no suena: ni tutoras, ni repasos, ni check-ins. Lo único con sonido es tu libro, que se abre en ElevenReader. */
const mudo = () => ambiente() === "limpio";
// El candado del silencio: en Limpio, ningún audio ni video de la página puede sonar, venga de donde venga.
{
  const tocar = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!mudo()) return tocar.call(this);
    this.muted = true;
    if (this instanceof HTMLAudioElement) { this.pause(); return Promise.reject(new DOMException("Pelagos está en Limpio: sin sonido.", "NotAllowedError")); }
    return tocar.call(this);
  };
}
/** Calla todo lo que esté sonando (al pasar a Limpio). */
function callarTodo() {
  if (repaso) pararRepaso("");
  for (const m of document.querySelectorAll("audio, video")) { m.muted = true; if (m instanceof HTMLAudioElement) m.pause(); }
}
/** Las portadas del ambiente de este aparato. */
function juegoDeFotos() { const a = ambiente(); return a === "limpio" ? [] : a === "expanse" ? (P.fotosExpanse || []) : (P.fotos || []); }
/** La portada fija de una lección (es Reef); en Expanse, su pareja: la que ocupa el mismo lugar en el otro juego. */
function fotoDeLeccion(nombre) {
  if (ambiente() === "limpio") return null;
  if (!nombre || ambiente() !== "expanse") return nombre;
  const i = Math.max(0, (P.fotos || []).findIndex((f) => f.nombre === nombre)), lista = P.fotosExpanse;
  return lista[i % lista.length].nombre;
}

/**
 * La foto de una tarjeta de vocabulario: en Reef, la que tiene prestada (siempre la misma mientras la tarjeta toque
 * en los próximos 30 días; ver N.fotoDeTarjeta). Sin fotos de vocabulario, una portada Reef al azar. En Limpio, ninguna.
 * Las tarjetas llevan siempre foto fija, aunque el fondo en movimiento esté prendido.
 */
function fotoDeLaTarjeta(id, hoy, antes) {
  if (ambiente() === "limpio") return null;
  if (fotosVocab.size) {
    const r = N.fotoDeTarjeta(E, id, [...fotosVocab.keys()], hoy);
    if (!r.foto) return null;
    if (r.nueva) { A.apuntar({ t: "ftj", id: N.nuevoId("ft"), tarjeta: id, foto: r.foto, cuando: new Date().toISOString() }); recalcular(); }
    return { nombre: r.foto, vocab: true };
  }
  const juego = juegoDeFotos();
  return juego.length ? juego[Math.floor(N.azarDe(id + "#" + hoy + "#" + antes.n)() * juego.length)] : null;
}

/** Tus clases de Worldsacross, tres días a la vez (ver web/clases.js). Al fondo, una chica Reef distinta cada día. */
function verClases(o) {
  if (!o.conserva) CL.aHoy();
  // La lección que se sugiere al pedir una clase: tu tema B2 más bajo (regla del 13-Oct-2026: por ahora, B2).
  const b2 = (P.temas || []).filter((t) => t.nivel === "B2" && t.slug_kwiziq).map((t) => ({ t, pct: info(t.id).pct }))
    .filter((x) => x.pct !== null && x.pct !== undefined).sort((a, b) => a.pct - b.pct)[0];
  CL.ponerSugerencia(b2 ? { tema: b2.t.id, titulo: b2.t.titulo || b2.t.titulo_kwiziq, pct: b2.pct, url: "https://spanish.kwiziq.com/revision/grammar/" + b2.t.slug_kwiziq } : null);
  // De las fotos Reef de vocabulario (cientos), una por día; sin ellas, las portadas Reef.
  const vocab = fotosVocab.size > 0, lista = ambiente() === "limpio" ? [] : vocab ? [...fotosVocab.keys()] : (P.fotos || []).map((f) => f.nombre), hoy = new Date();
  const foto = lista.length ? lista[(Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 86400000) * 37 + 3) % lista.length] : null;
  const fondo = foto ? `<div class="fondo"><img data-foto="${esc(foto)}"${vocab ? ' data-vocab="1"' : ""} alt="">${LOGO}</div>` : "";
  poner(`<div class="hoy clases${foto ? " confoto" : ""}">${fondo}<div class="sobre">${entradas("tablero", "clases")}${CL.htmlClases(A.clases(), new Date(), CL.pedidosDe(A.sucesos()), CL.pedidosHuecosDe(A.sucesos()))}</div></div>`,
    { titulo: "Clases · Pelagos", nav: "inicio", conserva: o.conserva });
  CL.montar(vista, () => pintar({ conserva: true }));
}

/**
 * Tu gran total de horas de español (su «sí» del 14-Oct): lo de su hoja de Excel hasta el corte, más lo que Pelagos
 * cuenta solo desde el día siguiente: minutos de ElevenReader, clases de Worldsacross ya dadas, quizzes (10 min cada uno,
 * como en su hoja) y repasos de tarjetas (unos 4 segundos cada uno). Devuelve { horas, desde } o null.
 */
function granTotal() {
  const L = N.leerLectura(A.lectura());
  if (!L || !L.granTotal) return null;
  const corte = L.granTotal.corte, hoy = N.fechaLocal(new Date());
  const dias = new Map(L.dias);
  const T = N.leerTablero(A.tablero()), er = T && T.dia === hoy ? T.medidas.find((m) => ESCUCHA.test(m.nombre)) : null;
  if (er) dias.set(hoy, Math.max(dias.get(hoy) || 0, er.valor));
  let min = 0;
  for (const [d, m] of dias) if (d > corte) min += m;
  for (const [d, n] of E.actividadGram) if (d > corte) min += n * 10;
  for (const [d, n] of E.actividadVoc) if (d > corte) min += n * 0.06;
  const C = CL.leerClases(A.clases()), ahora = Date.now();
  if (C) for (const c of C.clases) if (N.fechaLocal(c.ini) > corte && (c.estado === "hecha" || c.ini.getTime() + c.min * 60000 <= ahora)) min += c.min;
  return { horas: L.granTotal.horas + min / 60, desde: L.granTotal.desde };
}

/** Minutos como «48 min» o «5 h 12 min». */
const horasMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? " " + (m % 60) + " min" : ""}` : m + " min");

/**
 * Lectura: tu registro de ElevenReader (su idea del 13-Oct-2026). Se llega tocando el cuadro ElevenReader del Tablero.
 * Arriba el libro que estás escuchando, con su portada; abajo tu estante. Cada libro abre ElevenReader en ese libro
 * (en el iPhone, la app). Los datos llegan en tablero/lectura.json, que escribe la tarea del Tablero; los minutos de hoy
 * los trae también el tablero del día, que se lee más seguido, y gana el número más alto.
 */
function verLectura(o, ejemplo = false) {
  const hoy = N.fechaLocal(new Date());
  const L = N.leerLectura(ejemplo ? lecturaDeEjemplo(hoy) : A.lectura()), T = ejemplo ? null : N.leerTablero(A.tablero());
  const meta = L ? L.meta : 60;
  const dias = new Map(L ? L.dias : []);
  const er = T && T.dia === hoy ? T.medidas.find((m) => ESCUCHA.test(m.nombre)) : null;
  if (er) dias.set(hoy, Math.max(dias.get(hoy) || 0, Math.round(er.valor)));
  const libros = L ? L.libros : [];
  // «Leyendo ahora» es el de ElevenReader (se abre con un toque); los demás van a sus estantes.
  const ahora = libros.find((b) => b.estado === "leyendo" && b.url) || libros.find((b) => b.estado === "leyendo") || null;
  const resto = libros.filter((b) => b !== ahora);
  const portada = (b, clase) => b.portada
    ? `<img class="${clase}" src="${esc(b.portada)}" alt="Portada de ${esc(b.titulo)}" referrerpolicy="no-referrer">`
    : `<span class="${clase} sinPortada" aria-hidden="true">${esc(b.titulo)}</span>`;
  const abre = (b) => `href="${esc(b.url)}" target="_blank" rel="noopener"`;

  // Los últimos 14 días, del más viejo al de hoy.
  const d0 = new Date(), ultimos = [];
  for (let i = 13; i >= 0; i--) ultimos.push(N.fechaLocal(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - i)));
  const minHoy = dias.get(hoy) || 0;
  // Los podcasts en español de hoy (Pocket Casts), que ya vienen sumados en la Escucha.
  const pods = T && T.dia === hoy ? T.podcasts : [];
  const podMin = pods.reduce((a, x) => a + x.min, 0);
  const podHoy = pods.length ? `<p class="lecturaHoy">Hoy escuchaste</p><ul class="podHoy">${pods.map((x) => `<li>${esc(x.programa)}: ${esc(horasMin(x.min))}</li>`).join("")}</ul>` : "";
  const lineaHoy = minHoy >= meta ? `Hoy: ${minHoy} de ${meta} min. Meta cumplida.` : `Hoy: ${minHoy} de ${meta} min. Te faltan ${meta - minHoy}.`;
  const semana = ultimos.slice(-7).map((d) => dias.get(d) || 0);
  const lineaSemana = `Últimos 7 días: ${semana.filter((m) => m >= meta).length} de 7 con la hora cumplida, ${horasMin(semana.reduce((a, b) => a + b, 0))} en total.`;

  const tarjetaAhora = ahora ? `
    <section class="card" id="leyendoAhora">
      <a class="libroAhora" ${abre(ahora)}>
        ${portada(ahora, "portadaGrande")}
        <span class="libroDatos">
          <span class="small">Leyendo ahora</span>
          <span class="libroTitulo">${esc(ahora.titulo)}</span>
          ${ahora.autor ? `<span class="small">${esc(ahora.autor)}</span>` : ""}
          ${ahora.falta ? `<span class="libroFalta">Te faltan ${esc(ahora.falta)}</span>` : ""}
          <span class="small">Tócalo para abrirlo en ElevenReader.</span>
        </span>
      </a>
    </section>` : "";
  // Los estantes (su pedido del 14-Oct: sus libros de antes, de su hoja de Excel, también con portada).
  const estrellas = (n) => (n ? `<span class="estrellas" aria-label="${n} de 5 estrellas">${"★".repeat(n)}</span>` : "");
  const pie = (b) => {
    const partes = [];
    if (b.estado === "terminado") partes.push("Terminado" + (b.terminado ? " el " + diaLargo(b.terminado) + (b.terminado.slice(0, 4) !== hoy.slice(0, 4) ? " de " + b.terminado.slice(0, 4) : "") : "") + (b.veces > 1 ? ` (${b.veces} veces)` : ""));
    else if (b.estado === "leyendo") partes.push(b.avance !== null ? `Vas en ${Math.round(b.avance * 100)} %` : b.falta ? "Faltan " + b.falta : "Leyendo");
    else if (b.estado === "abandonado") partes.push("Lo dejaste" + (b.avance ? ` en ${Math.round(b.avance * 100)} %` : ""));
    if (b.medio) partes.push(b.medio);
    return esc(partes.join(" · "));
  };
  const ficha = (b) => {
    const [ab, ci] = b.url ? [`<a class="libro" ${abre(b)}>`, "</a>"] : ['<div class="libro">', "</div>"];
    return `<li>${ab}${portada(b, "portadaChica")}<span class="libroTitulo">${esc(b.titulo)}</span>${b.autor ? `<span class="small">${esc(b.autor)}</span>` : ""}${estrellas(b.nota)}<span class="small">${pie(b)}</span>${ci}</li>`;
  };
  const leidos = resto.filter((b) => b.estado === "terminado")
    .map((b, i) => [b, i]).sort((x, y) => (y[0].terminado || "").localeCompare(x[0].terminado || "") || x[1] - y[1]).map((x) => x[0]);
  const paginas = leidos.reduce((t, b) => t + (b.paginas || 0) * b.veces, 0);
  const estanteDe = (id, titulo, lista, resumen = "") => lista.length ? `
    <section class="card estanteCard" id="${id}">
      <h2>${titulo}</h2>
      ${resumen ? `<p class="small">${esc(resumen)}</p>` : ""}
      <ul class="estante">${lista.map(ficha).join("")}</ul>
    </section>` : "";
  const estante =
    estanteDe("estLeyendo", "También leyendo", resto.filter((b) => b.estado === "leyendo")) +
    estanteDe("estante", "Leídos", leidos, `${plural(leidos.length, "libro terminado", "libros terminados")}${paginas ? ", " + paginas.toLocaleString("es-MX") + " páginas" : ""}.`) +
    estanteDe("estPendientes", "Por leer", resto.filter((b) => b.estado === "pendiente")) +
    estanteDe("estDejados", "Los que dejaste", resto.filter((b) => b.estado === "abandonado"));

  // ---- Las gráficas (su idea del 13-Oct): minutos por día, a qué hora escuchas y cuánto va de cada libro.
  // Cada una trae una frase que la resume y, al tocar una barra, el detalle en palabras.
  const tituloDe = new Map(libros.map((b) => [b.id, b.titulo]));
  const INI = ["D", "L", "M", "M", "J", "V", "S"];
  const porDia = ultimos.map((d) => {
    const [a, m, dd] = d.split("-").map(Number), v = dias.get(d) || 0, lib = L && L.libroDia.get(d);
    return { dia: d, corto: INI[new Date(a, m - 1, dd).getDay()], sub: String(dd), valor: v, hoy: d === hoy,
      detalle: `${mayuscula(diaLargo(d))}: ${v ? horasMin(v) : "nada"}${v && lib && tituloDe.has(lib) ? " (" + tituloDe.get(lib) + ")" : ""}${v >= meta ? ". Hora cumplida." : "."}` };
  });
  const total14 = porDia.reduce((a, b) => a + b.valor, 0);
  const mejor = porDia.reduce((a, b) => (b.valor > a.valor ? b : a), porDia[0]);
  const grafDias = graficaBarras({ id: "grafDias", titulo: "Minutos por día", barras: porDia, meta,
    resumen: total14 ? `En 14 días: ${horasMin(total14)}, ${plural(porDia.filter((b) => b.valor >= meta).length, "día", "días")} con la hora cumplida. Tu mejor día: ${diaLargo(mejor.dia)}, con ${horasMin(mejor.valor)}.` : "En 14 días todavía no hay minutos." });

  // «A qué hora escuchas» y «Por libro» se quitaron el 18-Oct-2026, a pedido suyo: queda solo «Minutos por día».

  // ---- Biblioteca (su «sí» del 14-Oct): tres botones arriba, Libros · Series · Podcasts, como los de la Bitácora.
  // Los libros son lo de siempre; las series y los podcasts vienen de su hoja de Excel, con sus carteles y portadas.
  if (!bibModo) bibModo = ["libros", "series", "podcasts"].includes(guardado("pelagos.biblioteca")) ? guardado("pelagos.biblioteca") : "libros";
  const modo = ejemplo ? "libros" : bibModo;
  const unDecimal = (h) => (Math.round(h * 10) / 10).toLocaleString("es-MX");
  // Una portada que no está en internet vive en la rama de avance (tablero/portadas/…) y se pone al terminar de pintar.
  const cartel = (x, clase) => /^portadas\/[a-z0-9-]+\.(jpg|png|webp)$/.test(x.portada || "")
    ? `<img class="${clase}" data-portadapriv="${esc(x.portada.slice(9))}" data-titulo="${esc(x.titulo)}" alt="${esc(x.titulo)}">`
    : x.portada
    ? `<img class="${clase}" src="${esc(x.portada)}" alt="${esc(x.titulo)}" referrerpolicy="no-referrer">`
    : `<span class="${clase} sinPortada" aria-hidden="true">${esc(x.titulo)}</span>`;
  const repisa = (id, titulo, lista, fichaDe, resumen = "") => lista.length ? `
    <section class="card estanteCard" id="${id}">
      <h2>${titulo}</h2>
      ${resumen ? `<p class="small">${esc(resumen)}</p>` : ""}
      <ul class="estante${id.startsWith("pod") ? " cuadrado" : ""}">${lista.map(fichaDe).join("")}</ul>
    </section>` : "";
  let cuerpo = "", cabeza = "";
  if (modo === "series") {
    // Tres pestañas (su pedido del 14-Oct): Por ver · Estrenos · Vistas. Tocar un estreno lo pasa a Por ver (y en Por ver, tocarlo lo regresa).
    if (!serModo) serModo = ["porver", "estrenos", "vistas"].includes(guardado("pelagos.series")) ? guardado("pelagos.series") : "estrenos";
    const S = L ? L.series : [], ES = L ? L.estrenos : [];
    const fichaS = (x) => `<li><div class="libro">${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span>` +
      `<span class="small">${esc(x.tipo)}${x.horas !== null ? " · " + unDecimal(x.horas) + " h" : ""}</span>${estrellas(x.nota)}${x.genero ? `<span class="small">${esc(x.genero)}</span>` : ""}</div></li>`;
    const fechaCorta = (d) => { const [, m, dd] = d.split("-").map(Number); return `${dd} de ${MESES[m - 1]}`; };
    // Tocar un cartel abre su ficha (sinopsis y botones); desde ahí se agrega o se quita de Por ver (su cambio del 14-Oct).
    const fichaE = (x, enPorVer) => `<li><button type="button" class="libro estreno" data-obra="${esc(x.obra)}" aria-haspopup="dialog" ` +
      `aria-label="${esc(x.titulo)}, ${esc(x.tipo.toLowerCase())}${x.fecha ? ", estreno del " + fechaCorta(x.fecha) : ""}${enPorVer ? ", en Por ver" : ""}. Ver ficha">` +
      `${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span><span class="small">${esc(x.tipo)}${x.fecha ? " · " + fechaCorta(x.fecha) : ""}</span></button></li>`;
    const vistas = S.filter((x) => x.estado === "terminado").map((x, i) => [x, i]).sort((a, b) => (b[0].nota || 0) - (a[0].nota || 0) || a[1] - b[1]).map((x) => x[0]);
    const elegidos = ES.filter((x) => E.porVer.has(x.obra)).sort((a, b) => (E.porVer.get(b.obra) || "").localeCompare(E.porVer.get(a.obra) || ""));
    const nuevos = ES.filter((x) => !E.porVer.has(x.obra));
    const porVerHoja = S.filter((x) => x.estado === "pendiente");
    const total = L && L.seriesHoras !== null ? L.seriesHoras : vistas.reduce((t, x) => t + (x.horas || 0), 0);
    const pestanas = `<div class="jump tres" role="group" aria-label="Qué series enseña" id="serModo">${[["porver", "Por ver"], ["estrenos", "Estrenos"], ["vistas", "Vistas"]]
      .map(([k, n]) => `<button type="button" data-ser="${k}" aria-pressed="${k === serModo}">${n}</button>`).join("")}</div>`;
    if (serModo === "estrenos") {
      cabeza = `${pestanas}<p class="small">Lo nuevo en español en Netflix México${L && L.estrenosDia ? ", al " + fechaCorta(L.estrenosDia) : ""}. Toca un cartel para ver de qué trata.</p>`;
      cuerpo = nuevos.length ? repisa("serEstrenos", "Estrenos", nuevos, (x) => fichaE(x, false)) : `<section class="card"><p class="small">${ES.length ? "Ya pasaste todos los estrenos a Por ver." : "Todavía no llegan los estrenos. La tarea del Tablero los trae una vez al día."}</p></section>`;
    } else if (serModo === "porver") {
      cabeza = `${pestanas}<p class="small">${plural(elegidos.length + porVerHoja.length, "pendiente", "pendientes")}.</p>`;
      cuerpo = repisa("serElegidos", "De los estrenos", elegidos, (x) => fichaE(x, true)) + repisa("serPorVer", "De tu lista", porVerHoja, fichaS) +
        (elegidos.length + porVerHoja.length ? "" : `<section class="card"><p class="small">Nada por ver. Abre un estreno y agrégalo desde su ficha.</p></section>`);
    } else {
      cabeza = `${pestanas}<p class="lecturaHoy">${unDecimal(total)} horas de series y películas.</p><p class="small">${plural(vistas.length, "vista", "vistas")}, de la mejor a la peor.</p>`;
      cuerpo = repisa("serViendo", "Viendo", S.filter((x) => x.estado === "viendo"), fichaS) + repisa("serVistas", "Vistas", vistas, fichaS) +
        repisa("serDejadas", "Las que dejaste", S.filter((x) => x.estado === "abandonado"), fichaS);
    }
  } else if (modo === "podcasts") {
    const Pd = L ? L.podcasts : [];
    const fichaP = (x) => `<li><div class="libro">${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span></div></li>`;
    cabeza = `${podHoy}<p class="lecturaHoy">${L && L.podcastsHoras !== null ? L.podcastsHoras.toLocaleString("es-MX") + " horas de podcasts." : "Tus podcasts."}</p><p class="small">${plural(Pd.length, "podcast", "podcasts")}, por tus estrellas.</p>`;
    cuerpo = [3, 2, 1].map((n) => repisa("pod" + n, `${"★".repeat(n)} <span class="sr">${plural(n, "estrella", "estrellas")}</span>`, Pd.filter((x) => x.nota === n), fichaP)).join("") +
      repisa("podSin", "Sin estrellas", Pd.filter((x) => !x.nota), fichaP);
  } else {
    cabeza = `<p class="lecturaHoy">${esc(lineaHoy)}</p>${podMin ? `<p class="small">De eso, ${esc(horasMin(podMin))} de podcasts en español.</p>` : ""}<p class="small">${esc(lineaSemana)}</p>`;
    cuerpo = tarjetaAhora + grafDias + estante;
  }
  const fondo = fondoDelDia();
  poner(`
  <div class="hoy lectura${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("tablero", "")}
      <section class="card" id="lecturaCabeza">
        <h1 class="h">Biblioteca</h1>
        ${ejemplo ? "" : `<div class="jump tres" role="group" aria-label="Qué enseña la Biblioteca" id="bibModo">
          ${[["libros", "Libros"], ["series", "Series"], ["podcasts", "Podcasts"]].map(([clave, nombre]) => `<button type="button" data-bib="${clave}" aria-pressed="${clave === modo}">${nombre}</button>`).join("")}
        </div>`}
        ${ejemplo ? `<p class="lecturaEjemplo">Datos inventados, solo para ver cómo se ve. <a href="#/lectura">Volver a tus datos</a></p>` : ""}
        ${cabeza}
      </section>
      ${L ? cuerpo : `<section class="card"><p class="small">Todavía no llega tu registro de lectura. La tarea del Tablero lo trae en su próxima pasada.</p></section>`}
    </div>
  </div>`, { titulo: "Biblioteca · Pelagos", nav: "inicio", conserva: o.conserva });
  vista.querySelector("#serModo")?.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-ser]");
    if (!b || b.dataset.ser === serModo) return;
    serModo = b.dataset.ser; guardar("pelagos.series", serModo);
    verLectura({ conserva: true });
    vista.querySelector(`[data-ser="${serModo}"]`)?.focus();
  });
  for (const b of vista.querySelectorAll("[data-obra]")) b.addEventListener("click", () => abrirObra(b.dataset.obra));
  for (const img of vista.querySelectorAll("img[data-portadapriv]")) A.fotoPortada(img.dataset.portadapriv).then((u) => {
    if (!img.isConnected) return;
    if (u) img.src = u;
    else img.replaceWith(Object.assign(document.createElement("span"), { className: img.className + " sinPortada", textContent: img.dataset.titulo || "" }));
  });
  const botones = vista.querySelector("#bibModo");
  if (botones) botones.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-bib]");
    if (!b || b.dataset.bib === bibModo) return;
    bibModo = b.dataset.bib; guardar("pelagos.biblioteca", bibModo);
    verLectura({ conserva: true });
    vista.querySelector(`[data-bib="${bibModo}"]`)?.focus();
  });
  // Tocar (o enfocar) una barra dice su detalle en el renglón de abajo de la gráfica.
  for (const g of vista.querySelectorAll(".grafica")) {
    const decir = (ev) => {
      const b = ev.target.closest && ev.target.closest(".hit");
      if (!b) return;
      for (const x of g.querySelectorAll(".hit.activa")) x.classList.remove("activa");
      b.classList.add("activa");
      g.querySelector(".grafDetalle").textContent = b.getAttribute("aria-label");
    };
    g.addEventListener("click", decir);
    g.addEventListener("focusin", decir);
  }
}

/** La ficha de un estreno: su cartel, de qué trata y los botones para pasarlo a Por ver (o quitarlo) y buscarlo en Netflix. */
function abrirObra(obra, aviso = "") {
  const L = N.leerLectura(A.lectura()), x = L && L.estrenos.find((e) => e.obra === obra);
  if (!x) return;
  const enPorVer = E.porVer.has(obra);
  const [, m, d] = (x.fecha || "--").split("-").map(Number);
  hojaV.querySelectorAll(".hvFondo").forEach((n) => n.remove());
  hojaV.classList.remove("conFoto");
  $("hvIn").innerHTML = `
    <div class="obraFicha">
      ${x.portada ? `<img class="obraCartel" src="${esc(x.portada)}" alt="Cartel de ${esc(x.titulo)}" referrerpolicy="no-referrer">` : ""}
      <h2 id="hvT" tabindex="-1">${esc(x.titulo)}</h2>
      <p class="small">${[x.tipo, x.generos, x.duracion, x.fecha ? "estreno del " + d + " de " + MESES[m - 1] : ""].filter(Boolean).map(esc).join(" · ")}</p>
      ${x.sinopsis ? `<p class="obraSinopsis">${esc(x.sinopsis)}</p>` : ""}
      <p class="small" id="obraAviso" role="status">${esc(aviso)}</p>
    </div>
    <div class="acts">
      <button type="button" class="ub grande" data-porver aria-pressed="${enPorVer}">${enPorVer ? "Quitar de Por ver" : "Agregar a Por ver"}</button>
      <a class="ub" href="https://www.netflix.com/search?q=${encodeURIComponent(x.titulo)}" target="_blank" rel="noopener noreferrer">Buscar en Netflix</a>
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>`;
  hojaV.querySelector("[data-porver]").addEventListener("click", () => {
    A.apuntar({ t: "porver", id: N.nuevoId("pv"), obra, ...(enPorVer ? { quitar: 1 } : {}), cuando: new Date().toISOString() });
    recalcular();
    verLectura({ conserva: true });
    abrirObra(obra, enPorVer ? "Lo quitaste de Por ver." : "Listo: está en Por ver.");
    hojaV.querySelector("[data-porver]").focus();
  });
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  if (!aviso) $("hvT").focus({ preventScroll: true });
}

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
let bibModo = null, serModo = null;      // qué enseña la Biblioteca: libros, series o podcasts (se recuerda en este aparato)

/**
 * Una gráfica de barras sencilla en SVG: una sola serie, sin colores que digan nada más que «minutos».
 * La línea punteada es la meta. Cada barra se puede tocar o enfocar (su detalle se dice abajo) y hay una tabla para lectores de pantalla.
 */
function graficaBarras({ id, titulo, resumen, barras, meta = null }) {
  const W = 340, H = 180, izq = 30, der = 4, arriba = 14, abajo = 30;
  const n = barras.length, paso = (W - izq - der) / n, ancho = Math.max(3, paso - 2);
  const maxV = Math.max(meta || 0, ...barras.map((b) => b.valor), 1);
  const div = maxV > 180 ? 60 : maxV > 60 ? 30 : 10, tope = Math.ceil(maxV / div) * div;
  const y = (v) => arriba + (H - arriba - abajo) * (1 - v / tope), base = y(0);
  const r1 = (v) => Math.round(v * 10) / 10;
  const marcas = barras.map((b, i) => {
    const x = izq + i * paso + (paso - ancho) / 2, top = y(b.valor), alto = base - top, r = Math.min(4, ancho / 2, alto);
    const forma = b.valor > 0 ? `<path class="barraG" d="M${r1(x)} ${r1(base)}V${r1(top + r)}Q${r1(x)} ${r1(top)} ${r1(x + r)} ${r1(top)}H${r1(x + ancho - r)}Q${r1(x + ancho)} ${r1(top)} ${r1(x + ancho)} ${r1(top + r)}V${r1(base)}Z"/>` : "";
    const cx = r1(izq + i * paso + paso / 2);
    return `${forma}<text class="ejeG${b.hoy ? " hoyG" : ""}" x="${cx}" y="${H - abajo + 13}" text-anchor="middle">${esc(b.corto)}</text>${b.sub ? `<text class="ejeG sub${b.hoy ? " hoyG" : ""}" x="${cx}" y="${H - abajo + 25}" text-anchor="middle">${esc(b.sub)}</text>` : ""}` +
      `<rect class="hit" x="${r1(izq + i * paso)}" y="${arriba}" width="${r1(paso)}" height="${r1(base - arriba)}" tabindex="0" role="button" aria-label="${esc(b.detalle)}"/>`;
  }).join("");
  const lineaMeta = meta ? `<line class="metaG" x1="${izq}" x2="${W - der}" y1="${r1(y(meta))}" y2="${r1(y(meta))}"/><text class="ejeG" x="${izq - 4}" y="${r1(y(meta)) + 4}" text-anchor="end">${meta}</text>` : "";
  const ejes = `<line class="baseG" x1="${izq}" x2="${W - der}" y1="${r1(base)}" y2="${r1(base)}"/><text class="ejeG" x="${izq - 4}" y="${r1(base) + 4}" text-anchor="end">0</text>` +
    (tope !== meta ? `<text class="ejeG" x="${izq - 4}" y="${arriba + 4}" text-anchor="end">${tope}</text><line class="guiaG" x1="${izq}" x2="${W - der}" y1="${arriba}" y2="${arriba}"/>` : "");
  return `
    <section class="card grafica" id="${id}">
      <h2>${esc(titulo)}</h2>
      <p class="small">${esc(resumen)}</p>
      <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(titulo)}, en minutos">${ejes}${lineaMeta}${marcas}</svg>
      <p class="small grafDetalle" role="status">Toca una barra para ver el detalle.</p>
    </section>`;
}

/**
 * Datos inventados para ver la página Lectura llena (su pedido del 14-Oct-2026). Cuentan su semana como él la contó:
 * la semana pasada, de lunes a viernes, El despertar del Leviatán de 8 a 4, a ratos (y lo terminó el domingo);
 * esta semana, el lunes empezó La guerra de Calibán. Las fechas se acomodan a la semana de hoy.
 */
function lecturaDeEjemplo(hoy) {
  const [a, m, d] = hoy.split("-").map(Number), h0 = new Date(a, m - 1, d);
  const lunes = new Date(a, m - 1, d - ((h0.getDay() + 6) % 7));
  const dia = (k) => N.fechaLocal(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + k));
  const LEV = "u:BiCFwSqEjKjg0tXUxqkr", CAL = "u:a8e4UoY51nZ8QwhXlIt9";
  const P = (id, v) => `https://storage.googleapis.com/eleven-public-cdn/database/reader_customers/ljEp3KNMeuTpAGEeIxGpXpPOJfs2/read/u%3A${id.slice(2)}/thumbnail.webp?v=${v}`;
  // A ratos de 8 a 4: minutos por hora, de lunes a viernes de la semana pasada; el fin de semana, de noche.
  const ratos = [
    { 8: 25, 9: 40, 10: 15, 11: 35, 12: 10, 13: 30, 14: 20, 15: 35 },
    { 8: 10, 9: 30, 10: 45, 12: 20, 13: 25, 14: 40, 15: 15 },
    { 8: 35, 9: 45, 10: 50, 11: 25, 12: 15, 13: 20, 14: 30, 15: 20 },
    { 8: 20, 9: 15, 10: 40, 11: 30, 13: 35, 15: 25 },
    { 8: 30, 9: 40, 10: 35, 11: 20, 12: 25, 13: 30, 14: 30, 15: 20 },
    { 19: 30, 20: 40 },
    { 18: 15, 19: 35, 20: 25 },
  ];
  const horas = {}, dias = {}, libroDia = {};
  ratos.forEach((hs, k) => { const f = dia(k - 7); horas[f] = hs; dias[f] = Object.values(hs).reduce((x, y) => x + y, 0); libroDia[f] = LEV; });
  // Esta semana: el lunes empezó Calibán (16 min en la noche); el martes, 46 en la mañana y 14 en la noche.
  const esta = [{ 21: 16 }, { 9: 46, 20: 14 }];
  esta.forEach((hs, k) => { const f = dia(k); if (f > hoy) return; horas[f] = hs; dias[f] = Object.values(hs).reduce((x, y) => x + y, 0); libroDia[f] = CAL; });
  return { version: 1, meta: 60, dias, horas, libroDia, libros: [
    { titulo: "La guerra de Calibán (Chingón)", autor: "James S. A. Corey", url: "https://elevenreader.io/reader/library/" + CAL, portada: P(CAL, "1791158807"), falta: "19 h 14 min", estado: "leyendo" },
    { titulo: "Amos Illustrated El despertar del Leviatán", autor: "James S. A. Corey", url: "https://elevenreader.io/reader/library/" + LEV, portada: P(LEV, "1791158815"), estado: "terminado", terminado: dia(-1) },
  ] };
}

/** La portada del día: cambia cada día. */
function portadaDelDia() {
  const hoy = new Date(), lista = juegoDeFotos();
  return lista.length ? lista[Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 86400000) % lista.length].nombre : null;
}

/** Cuándo toca una palabra, en pocas palabras. */
/** En qué escalón va un tema de gramática (el repaso tipo Leitner) y cuándo vuelve a tocar. */
function escalonDeTema(i) {
  if (!i || !i.toca) return "";
  const e = Math.max(0, Math.min(N.ESCALONES.length - 1, i.escalon | 0)), dias = N.ESCALONES[e];
  return `Escalón ${e + 1} de ${N.ESCALONES.length} (cada ${plural(dias, "día", "días")}) · ${cuandoToca(i, N.fechaLocal(new Date()))}`;
}
function cuandoToca(s, hoy) {
  if (s.quitada) return "Quitada";
  if (!s.toca) return "Sin ver";
  if (s.toca < hoy) return "Tocaba el " + fechaCorta(s.toca);
  if (s.toca === hoy) return "Toca hoy";
  return s.toca === N.sumarDias(hoy, 1) ? "Toca mañana" : "Toca el " + fechaCorta(s.toca);
}

/**
 * Todo tu vocabulario a la vista, como el mapa: un cuadro por palabra, solo en español, y el color dice qué tan
 * seguido la aciertas. Se puede buscar y ordenar. Al tocar una palabra sube su ficha.
 */
function verLista(o) {
  if (!o.conserva) { lvBusca = ""; lvCuantas = TANDA; lvAviso = null; }
  const hoy = N.fechaLocal(new Date());
  const todas = palabras();
  const vivas = todas.filter((x) => !x.s.quitada), quitadas = todas.filter((x) => x.s.quitada).sort(alfabeto);
  const cuenta = [0, 0, 0, 0, 0, 0];
  let sinVer = 0;
  for (const x of vivas) { const k = colorTarjeta(x); if (k === null) sinVer++; else cuenta[k]++; }
  const tocan = N.tarjetasDelDia(P, E, hoy).pendientes.length;
  const atasTj = N.tarjetasAtascadas(E, hoy);
  const nAtas = vivas.filter((x) => atasTj.has(x.id)).length;
  if (!nAtas) lvAtascadas = false;
  const fondo = fondoDelDia();
  const abiertas = !!vista.querySelector("#lvQuitadas[open]");
  poner(`
  <div class="hoy mapa lista${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("vocabulario", "lista")}
      <section class="card" id="lvCabeza">
        <h1 class="h">Acervo</h1>
        <p>${plural(vivas.length, "palabra", "palabras")}. ${tocan === 0 ? "Hoy no queda ninguna por repasar." : tocan === 1 ? "Hoy queda 1 por repasar." : `Hoy quedan ${tocan} por repasar.`}</p>
        <label class="sr" for="lvBusca">Buscar una palabra</label>
        <input id="lvBusca" class="campo" type="search" placeholder="Buscar una palabra" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
        <div class="jump cuatro" role="group" aria-label="En qué orden salen">${ORDENES.map(([clave, nombre]) => `<button type="button" data-orden="${clave}" aria-pressed="${clave === lvOrden}">${nombre}</button>`).join("")}</div>
        <div class="jump uno"><button type="button" id="lvAtas" aria-pressed="${lvAtascadas}"${nAtas ? "" : " disabled"}>Atascadas (${nAtas})</button></div>
        ${!lvAviso || lvAviso.nueva ? "" : `<p class="small" id="lvAviso" role="status">Quitaste «${esc(lvAviso.texto)}». <button type="button" class="lk" id="lvDeshacer">Deshacer</button></p>`}
      </section>
      <section class="card" id="lvLista">
        <h2 class="sr">Tus palabras</h2>
        <p class="small" id="lvCuenta" role="status"></p>
        <div class="lvCeldas" id="lvCeldas"></div>
        <div class="go"><button type="button" class="ub" id="lvMas" hidden></button></div>
      </section>
      <section class="card" id="clave">
        <h2 class="sr">Qué significa cada color</h2>
        <p class="small">El color es el peldaño de la palabra: cada cuánto te toca repasarla. Son los mismos puntitos del quiz.</p>
        <ul class="clave">${N.PELDANOS.map((nombre, i) => `<li><i class="mc k${i}"></i><span>${nombre}</span><b>${cuenta[i]}</b></li>`).join("")}<li><i class="mc kx"></i><span>Sin ver</span><b>${sinVer}</b></li></ul>
      </section>
      ${quitadas.length ? `
      <details class="card cat" id="lvQuitadas"${abiertas ? " open" : ""}>
        <summary><span class="cn">Quitadas</span><span class="cc">${plural(quitadas.length, "palabra", "palabras")}. Ya no salen en tu quiz.</span></summary>
        <div class="links">${quitadas.map((x) => `<button type="button" class="tb" data-devolver="${esc(x.id)}"><span class="nm ancho" lang="es-MX">${esc(x.c.reverso)}</span><span class="pc">Devolver</span><span class="sm ancho" lang="en">${esc(x.c.frente)}</span></button>`).join("")}</div>
      </details>` : ""}
    </div>
  </div>`,
  { titulo: "Acervo · Pelagos", nav: "vocabulario", conserva: o.conserva });

  const campo = $("lvBusca");
  campo.value = lvBusca;
  function celdas() {
    const q = paraBuscar(lvBusca);
    const base = lvAtascadas ? vivas.filter((x) => atasTj.has(x.id)) : vivas;
    const salen = (q ? base.filter((x) => [x.c.reverso, x.c.frente].some((t) => paraBuscar(t).includes(q))) : base.slice()).sort(ORDENAR[lvOrden] || alfabeto);
    $("lvCeldas").innerHTML = salen.slice(0, lvCuantas).map((x) => {
      const f = colorTarjeta(x);
      const atas = atasTj.has(x.id);
      return `<button type="button" class="vc ${f === null ? "kx" : "k" + f}${atas ? " atas" : ""}" data-v="${esc(x.id)}" lang="es-MX" aria-label="${esc(x.c.reverso)}: ${f === null ? "sin ver" : `peldaño ${f + 1}, ${x.pct === null ? "sin aciertos todavía" : pct(x.pct) + " de aciertos"}`}${atas ? ", atascada" : ""}">${esc(x.c.reverso)}</button>`;
    }).join("");
    $("lvCuenta").textContent = !vivas.length ? "Todavía no hay palabras en tu vocabulario."
      : q ? (salen.length ? `${salen.length} de ${vivas.length} con «${lvBusca.trim()}».` : `Ninguna palabra con «${lvBusca.trim()}».`)
        : lvAtascadas ? `${plural(salen.length, "palabra atascada", "palabras atascadas")}: las fallaste en ${N.ATASCADO_FALLOS} quizzes distintos en ${N.ATASCADO_DIAS} días. Toca una para editarla, seguir así o quitarla.`
        : "Toca una palabra para ver su traducción y cómo te ha ido con ella.";
    $("lvMas").hidden = salen.length <= lvCuantas;
    $("lvMas").textContent = `Ver más (faltan ${salen.length - lvCuantas})`;
  }
  celdas();
  campo.addEventListener("input", () => { lvBusca = campo.value; lvCuantas = TANDA; celdas(); });
  campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") campo.blur(); });       // en el teléfono, «Buscar» guarda el teclado
  $("lvMas").addEventListener("click", () => { lvCuantas += TANDA; celdas(); });
  for (const b of vista.querySelectorAll("[data-orden]")) {
    b.addEventListener("click", () => {
      lvOrden = b.dataset.orden; lvCuantas = TANDA;
      for (const otro of vista.querySelectorAll("[data-orden]")) otro.setAttribute("aria-pressed", String(otro === b));
      celdas();
    });
  }
  $("lvAtas").addEventListener("click", () => { lvAtascadas = !lvAtascadas; lvCuantas = TANDA; $("lvAtas").setAttribute("aria-pressed", String(lvAtascadas)); celdas(); });
  for (const b of vista.querySelectorAll("[data-devolver]")) b.addEventListener("click", () => quitarPalabra(b.dataset.devolver, false));
  if ($("lvDeshacer")) $("lvDeshacer").addEventListener("click", () => quitarPalabra(lvAviso.id, false));
}

/** Quita una palabra de tu vocabulario, o la devuelve. No se borra nada: tu historial con ella se queda guardado. */
function quitarPalabra(id, quitar) {
  const c = tarjetas.get(id);
  if (!c) return;
  A.apuntar({ t: "tjq", id: N.nuevoId("q"), tarjeta: id, cuando: new Date().toISOString(), quitar: quitar ? 1 : 0 });
  recalcular();
  lvAviso = quitar ? { id, texto: N.tarjetaVista(c, E.tarjetas.get(id)).reverso } : null;
  cerrarHoja();
  pintar({ conserva: true });
}

/** Los dos renglones de una palabra (español e inglés), para corregirla o para agregar una nueva. */
// Editar una tarjeta (opción 3, 15-Oct-2026): un lápiz junto a cada renglón. Tocas el lápiz del español o del inglés,
// ese renglón se vuelve una caja, y «Listo» guarda solo ese renglón (un suceso «tje»). El porcentaje y el peldaño no cambian.
const ICONO_LAPIZ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const NOMBRE_CAMPO = { reverso: "el español", frente: "el inglés" };
/** Un renglón de la tarjeta con su lápiz. «etiqueta» es el elemento del texto (h1, h2, span); «otros», sus atributos. */
function renglonConLapiz(campo, texto, etiqueta, clase, otros = "") {
  const lang = campo === "reverso" ? "es-MX" : "en";
  return `<div class="conLapiz" data-campo="${campo}"><${etiqueta} class="${clase}" lang="${lang}"${otros}>${esc(texto)}</${etiqueta}><button type="button" class="lapiz" data-lapiz="${campo}" aria-label="Editar ${NOMBRE_CAMPO[campo]}">${ICONO_LAPIZ}</button></div>`;
}
/** Conecta los lápices de «raiz». Al guardar llama a «listo(campo, texto)» después de apuntar el cambio. */
function activarLapices(raiz, id, listo) {
  for (const b of raiz.querySelectorAll("[data-lapiz]")) b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const fila = b.closest(".conLapiz"), campo = b.dataset.lapiz, texto = fila.firstElementChild;
    if (fila.querySelector("form")) return;
    const antes = texto.textContent;
    const forma = document.createElement("form");
    forma.className = "lapizForma"; forma.autocomplete = "off";
    forma.innerHTML = `<label class="sr" for="lz-${campo}">Corrige ${NOMBRE_CAMPO[campo]}</label>
      <input id="lz-${campo}" class="campo" type="text" lang="${campo === "reverso" ? "es" : "en"}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <div class="lapizBotones"><button type="submit" class="ub">Listo</button><button type="button" class="ub" data-x aria-label="Cancelar">${ICONO_X}</button></div>
      <p class="err" role="alert" hidden></p>`;
    const caja = forma.querySelector("input");
    caja.value = antes;
    texto.hidden = true; b.hidden = true;
    fila.append(forma);
    caja.focus(); caja.select();
    const cerrar = () => { forma.remove(); texto.hidden = false; b.hidden = false; b.focus({ preventScroll: true }); };
    forma.querySelector("[data-x]").addEventListener("click", (e) => { e.stopPropagation(); cerrar(); });
    caja.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } });
    forma.addEventListener("click", (e) => e.stopPropagation());
    forma.addEventListener("submit", (e) => {
      e.preventDefault();
      const nuevo = caja.value.replace(/\s+/g, " ").trim();
      if (!nuevo) { const err = forma.querySelector(".err"); err.hidden = false; err.textContent = "Escribe algo o toca la equis."; return; }
      if (nuevo !== antes) {
        A.apuntar({ t: "tje", id: N.nuevoId("e"), tarjeta: id, cuando: new Date().toISOString(), [campo]: nuevo });
        recalcular();
        texto.textContent = nuevo;
      }
      cerrar();
      listo(campo, nuevo);
    });
  });
}

function formaPalabra(c, escondida) {
  return `
    <form id="hvForma" class="forma" autocomplete="off"${escondida ? " hidden" : ""}>
      <label class="small" for="hvEs">En español</label>
      <input id="hvEs" class="campo" type="text" lang="es" value="${esc(c.reverso || "")}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <label class="small" for="hvEn">En inglés</label>
      <input id="hvEn" class="campo" type="text" lang="en" value="${esc(c.frente || "")}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <p class="err" id="hvError" role="alert" hidden></p>
      <div class="go"><button type="button" class="ub" id="hvCancelar">Cancelar</button><button type="submit" class="ub grande">Guardar</button></div>
    </form>`;
}
/** Lo que hay escrito en la forma, ya limpio; null (y un aviso) si le falta el español o el inglés. */
function leerForma() {
  const limpio = (t) => t.replace(/\s+/g, " ").trim();
  const reverso = limpio($("hvEs").value), frente = limpio($("hvEn").value);
  if (!reverso || !frente) { $("hvError").hidden = false; $("hvError").textContent = "Le falta el español o el inglés."; return null; }
  return { reverso, frente };
}

let agAviso = null;            // la palabra que acabas de agregar, para decirlo en la página

// El acordeón de una clase (clases.js) agrega sus palabras clave a tu acervo con «+», igual que Agregar.
CL.conAcervo({
  tiene: (es) => palabras().some((x) => !x.s.quitada && paraBuscar(x.c.reverso) === paraBuscar(es)),
  agregar: (es, en) => {
    if (palabras().some((x) => !x.s.quitada && paraBuscar(x.c.reverso) === paraBuscar(es))) return false;
    A.apuntar({ t: "tjn", id: N.nuevoId("n"), tarjeta: N.nuevoId("tm"), cuando: new Date().toISOString(), frente: String(en).slice(0, 160), reverso: String(es).slice(0, 160) });
    recalcular();
    return true;
  },
});

/** Agregar (Vocabulario): una palabra a mano. Es un renglón más de tu avance, y entra a tu quiz como palabra nueva. */
function verAgregar(o) {
  if (!o.conserva) agAviso = null;
  poner(conFondo(`
  ${entradas("vocabulario", "agregar")}
  <section class="card" id="agCard">
    <h1 class="h">Agregar una palabra</h1>
    <p>En español y en inglés. Entra a tu quiz como palabra nueva y se queda en tu acervo.</p>
    ${formaPalabra({}, false)}
    ${agAviso ? `<p class="small" id="agAviso" role="status">Agregaste «${esc(agAviso)}». Va a salir en tu quiz como palabra nueva.</p>` : ""}
  </section>`), { titulo: "Agregar · Pelagos", nav: "vocabulario", conserva: o.conserva });
  $("hvCancelar").textContent = "Borrar";
  $("hvCancelar").addEventListener("click", () => { $("hvEs").value = ""; $("hvEn").value = ""; $("hvError").hidden = true; $("hvEs").focus(); });
  $("hvForma").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = leerForma();
    if (!f) return;
    if (palabras().some((x) => !x.s.quitada && paraBuscar(x.c.reverso) === paraBuscar(f.reverso))) { $("hvError").hidden = false; $("hvError").textContent = "Esa palabra ya está en tu vocabulario."; return; }
    A.apuntar({ t: "tjn", id: N.nuevoId("n"), tarjeta: N.nuevoId("tm"), cuando: new Date().toISOString(), frente: f.frente, reverso: f.reverso });
    recalcular();
    agAviso = f.reverso;
    lvAviso = null;
    pintar({ conserva: true });
    if ($("hvEs")) $("hvEs").focus();         // lista para la siguiente
  });
}

// La ficha de una palabra: sube desde abajo, como la vista previa de un tema.
const hojaV = $("hojaV");
const REPASOS_A_LA_VISTA = 26;

// La hoja de una palabra lleva de fondo la foto de Reef de esa tarjeta (la misma del quiz).
// Una tarjeta quitada solo enseña la foto que ya tenía; no se le presta una nueva.
function ponerFondoPalabra(id, s, hoy) {
  hojaV.querySelectorAll(".hvFondo").forEach((x) => x.remove());
  hojaV.classList.remove("conFoto");
  if (ambiente() === "limpio") return;
  let foto = null;
  if (s.quitada) {
    const p = E.fotosTarjeta && E.fotosTarjeta.get(id);
    if (p && fotosVocab.has(p.foto)) foto = { nombre: p.foto, vocab: true };
  } else foto = fotoDeLaTarjeta(id, hoy, { n: 0 });
  if (!foto) return;
  const capa = document.createElement("div");
  capa.className = "hvFondo";
  capa.setAttribute("aria-hidden", "true");
  capa.innerHTML = `<img data-foto="${esc(foto.nombre)}"${foto.vocab ? ' data-vocab="1"' : ""} alt="">`;
  hojaV.prepend(capa);
  hojaV.classList.add("conFoto");
}

function abrirPalabra(id) {
  const cruda = tarjetas.get(id), s = E && E.tarjetas.get(id);
  if (!cruda || !s) return;
  const c = N.tarjetaVista(cruda, s), v = N.aciertoDeTarjeta(s), hoy = N.fechaLocal(new Date());
  const atasF = N.tarjetasAtascadas(E, hoy).get(id);
  const n = s.baseN + s.n, bien = s.baseBien + s.bien;
  const ultimos = s.historia.slice(-REPASOS_A_LA_VISTA);
  const buenos = ultimos.filter((h) => h.bien).length;
  // Cada repaso es una barrita, del más viejo al más nuevo: alta si la supiste, bajita si no.
  const grafica = !ultimos.length ? "" : `
    <figure class="hvG">
      <svg width="${ultimos.length * 11 - 3}" height="40" viewBox="0 0 ${ultimos.length * 11 - 3} 40" role="img" aria-label="${ultimos.length === 1 ? "Tu último repaso" : `Tus últimos ${ultimos.length} repasos`}: ${buenos} bien y ${ultimos.length - buenos} mal">${ultimos.map((h, i) =>
        h.bien ? `<rect class="gb" x="${i * 11}" y="2" width="8" height="38" rx="2"/>` : `<rect class="gm" x="${i * 11}" y="27" width="8" height="13" rx="2"/>`).join("")}</svg>
      <figcaption class="small">${ultimos.length === 1 ? "Tu último repaso" : `Tus últimos ${ultimos.length} repasos, del más viejo al más nuevo`}. Barra alta: bien. Barra bajita: mal.</figcaption>
    </figure>`;
  const serieV = N.historiaTarjeta(s, hoy);
  const datos = [
    ["Próximo repaso", s.quitada ? "Ninguno: la quitaste" : !s.toca ? "Todavía no la has visto" : s.toca < hoy ? "Atrasado: tocaba el " + fechaCorta(s.toca)
      : s.toca === hoy ? "Hoy" : s.toca === N.sumarDias(hoy, 1) ? "Mañana" : "El " + fechaCorta(s.toca)],
    s.toca && !s.quitada ? ["La ves cada", plural(N.ESCALONES[s.escalon], "día", "días")] : null,
    s.ultima ? ["Última vez", cuando(s.ultima)] : null,
    c.agregada ? ["Agregada", "El " + fechaCorta(c.agregada)] : null,
    s.n ? ["En Pelagos", `${plural(s.n, "repaso", "repasos")}, ${s.bien} bien`] : null,
    s.baseN ? ["Antes de Pelagos", `${plural(s.baseN, "repaso", "repasos")}, ${s.baseBien} bien`] : null,
  ].filter(Boolean);
  $("hvIn").innerHTML = `
    <span class="k">Vocabulario · ${esc(cuandoToca(s, hoy))}</span>
    ${atasF ? `<div class="atasAviso" role="note"><p>Atascada: la fallaste en ${atasF.fallos} quizzes distintos en los últimos ${atasF.dias} días. Corrígela con el lápiz, pártela en dos o quítala. Se destraba al editarla, al acertarla ${N.ACIERTOS_PARA_SALIR} veces seguidas en días distintos o con «Seguir así».</p><div class="go"><button type="button" class="ub" id="hvSeguir">Seguir así</button></div></div>` : ""}
    <ul class="exs"><li class="ex">${renglonConLapiz("reverso", c.reverso, "h2", "es", ' id="hvT" tabindex="-1"')}${renglonConLapiz("frente", c.frente, "span", "en")}</li></ul>
    <div class="sc"><span>Aciertos: ${v === null ? "todavía sin datos" : `${pct(v)} · ${bien} de ${n}`}</span>${v === null ? "" : barra(v)}</div>
    ${grafica}
    <div class="hvLinea">${htmlGrafica(serieV, "gV", c.reverso, false)}</div>
    <dl class="hvDatos">${datos.map(([k, t]) => `<div><dt>${k}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl>
    <div class="acts" id="hvActos">
      ${s.quitada ? '<button type="button" class="ub" id="hvDevolver">Devolver</button>' : '<button type="button" class="ub" id="hvQuitar">Quitar</button>'}
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>
    <p id="hvSeguro" hidden>¿La quito de tu vocabulario? Ya no sale en tu quiz. <button type="button" class="lk" id="hvSi">Sí, quítala</button> · <button type="button" class="lk" id="hvNo">No</button></p>`;
  ponerFondoPalabra(id, s, hoy);
  vestir(hojaV);
  activarGrafica(serieV, "gV");
  activarLapices($("hvIn"), id, () => pintar({ conserva: true }));
  if ($("hvQuitar")) $("hvQuitar").addEventListener("click", () => { $("hvSeguro").hidden = false; $("hvNo").focus(); });
  if ($("hvDevolver")) $("hvDevolver").addEventListener("click", () => quitarPalabra(id, false));
  $("hvNo").addEventListener("click", () => { $("hvSeguro").hidden = true; });
  if ($("hvSeguir")) $("hvSeguir").addEventListener("click", () => {
    A.apuntar({ t: "destrabar", id: N.nuevoId("b"), tarjeta: id, como: "seguir", cuando: new Date().toISOString() });
    recalcular();
    pintar({ conserva: true });
    abrirPalabra(id);
  });
  $("hvSi").addEventListener("click", () => quitarPalabra(id, true));
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}

// Las gráficas de porcentaje por día (nivel, tema y palabra): una línea con un marcador que se mueve con el dedo o las flechas.
const diaCorto = (d) => `${Number(d.slice(8, 10))} ${MESES_CORTOS[Number(d.slice(5, 7)) - 1]}`;
const GW = 320, GH = 210, GIZ = 36, GDE = 14, GAR = 14, GAB = 30, GAN = GW - GIZ - GDE, GAL = GH - GAR - GAB;
/** El HTML de la gráfica. «pre» distingue las piezas de cada gráfica (pueden estar dos hojas abiertas). */
function htmlGrafica(serie, pre, nombre, conMeta = true) {
  if (serie.every((p) => p.pct === null)) return `<p class="small">La gráfica de tu porcentaje por día aparece cuando haya datos.</p>`;
  const xs = (i) => serie.length === 1 ? GIZ + GAN / 2 : GIZ + (i * GAN) / (serie.length - 1);
  const ys = (v) => GAR + GAL - (Math.max(0, Math.min(100, v)) / 100) * GAL;
  const puntos = serie.map((p, i) => (p.pct === null ? null : [xs(i), ys(p.pct)]));
  let trazo = "", abierta = false;       // la línea se corta donde no hay dato
  for (const p of puntos) { if (!p) { abierta = false; continue; } trazo += `${abierta ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; abierta = true; }
  const paso = Math.max(1, Math.ceil(serie.length / 6)), ult = serie.length - 1;
  const etiquetas = serie.map((p, i) => (i % paso === 0 || i === ult) && !(i !== ult && ult - i < paso)
    ? `<text class="gx" x="${xs(i).toFixed(1)}" y="${GH - 10}" text-anchor="${serie.length > 1 && i === ult ? "end" : serie.length > 1 && i === 0 ? "start" : "middle"}">${diaCorto(p.dia)}</text>` : "").join("");
  const rejilla = [0, 25, 50, 75, 100].map((v) => `<line class="gr" x1="${GIZ}" x2="${GW - GDE}" y1="${ys(v)}" y2="${ys(v)}"/><text class="gy" x="${GIZ - 6}" y="${ys(v) + 4}" text-anchor="end">${v}</text>`).join("");
  const m = meta();
  return `
    <p class="gLee" id="${pre}Lee" aria-live="polite"></p>
    <svg class="ggraf" id="${pre}Svg" viewBox="0 0 ${GW} ${GH}" role="img" tabindex="0" aria-label="Gráfica de línea: ${esc(nombre)}, porcentaje por día. Usa las flechas para moverte de día.">
      ${rejilla}
      ${conMeta ? `<line class="gmeta" x1="${GIZ}" x2="${GW - GDE}" y1="${ys(m)}" y2="${ys(m)}"/><text class="gmt" x="${GW - GDE}" y="${ys(m) - 5}" text-anchor="end">meta ${m}%</text>` : ""}
      ${etiquetas}
      <path class="gl" d="${trazo}"/>
      ${puntos.map((p) => (p ? `<circle class="gp" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2"/>` : "")).join("")}
      <line class="gt" id="${pre}Tv" y1="${GAR}" y2="${GAR + GAL}"/>
      <circle class="gtp" id="${pre}Tp" r="6"/>
    </svg>
    <p class="small">${serie.length === 1 ? "La gráfica empieza hoy: cada día que pase se agrega un punto. " : ""}Toca la línea para ver el porcentaje exacto de cada día.${conMeta ? " La raya punteada es tu meta." : ""}</p>
    <ul class="sr">${serie.map((p) => `<li>${esc(fechaCorta(p.dia))}: ${esc(pct(p.pct))}</li>`).join("")}</ul>`;
}
/** Le da vida a una gráfica ya puesta: el marcador empieza en hoy. */
function activarGrafica(serie, pre) {
  const svg = $(pre + "Svg");
  if (!svg) return;
  const hoy = N.fechaLocal(new Date());
  const xs = (i) => serie.length === 1 ? GIZ + GAN / 2 : GIZ + (i * GAN) / (serie.length - 1);
  const ys = (v) => GAR + GAL - (Math.max(0, Math.min(100, v)) / 100) * GAL;
  let actual = serie.length - 1;
  const marcar = (i) => {
    actual = Math.max(0, Math.min(serie.length - 1, i));
    const p = serie[actual], x = xs(actual);
    $(pre + "Tv").setAttribute("x1", x); $(pre + "Tv").setAttribute("x2", x);
    const tp = $(pre + "Tp");
    if (p.pct === null) tp.setAttribute("visibility", "hidden");
    else { tp.setAttribute("visibility", "visible"); tp.setAttribute("cx", x); tp.setAttribute("cy", ys(p.pct)); }
    $(pre + "Lee").textContent = `${p.dia === hoy ? "Hoy" : fecha(p.dia).replace(/ de \d{4}$/, "")}: ${pct(p.pct)}`;
  };
  const tocar = (ev) => {
    const r = svg.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * GW;
    marcar(serie.length === 1 ? 0 : Math.round(((x - GIZ) / GAN) * (serie.length - 1)));
  };
  svg.addEventListener("pointerdown", (ev) => { tocar(ev); svg.setPointerCapture?.(ev.pointerId); });
  svg.addEventListener("pointermove", (ev) => { if (ev.buttons || ev.pointerType === "mouse") tocar(ev); });
  svg.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowLeft") { marcar(actual - 1); ev.preventDefault(); }
    else if (ev.key === "ArrowRight") { marcar(actual + 1); ev.preventDefault(); }
  });
  marcar(serie.length - 1);
}

// La gráfica de un tema, desde su lección.
function abrirGraficaTema(id) {
  const t = porId.get(Number(id));
  if (!t) return;
  const serie = N.historiaTemas(P, A.sucesos(), [t.id], N.fechaLocal(new Date()));
  $("hvIn").innerHTML = `
    <span class="k">Lección · ${esc(t.nivel)}</span>
    <h2 id="hvT" tabindex="-1">${esc(titulo(t))}</h2>
    ${htmlGrafica(serie, "gL", titulo(t))}
    <div class="acts"><button type="button" class="ub" data-cerrar>Cerrar</button></div>`;
  activarGrafica(serie, "gL");
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}

// La gráfica de un nivel: su promedio al cierre de cada día, desde el día en que la pidió.
function abrirGrafica(nivel) {
  const serie = N.historiaNivel(P, A.sucesos(), nivel, N.fechaLocal(new Date()));
  $("hvIn").innerHTML = `
    <span class="k">Atlas · ${esc(NIVELES[nivel])}</span>
    <h2 id="hvT" tabindex="-1"><span class="lv">${nivel}</span> Tu porcentaje, día por día</h2>
    ${htmlGrafica(serie, "gN", "nivel " + nivel)}
    <div class="acts"><button type="button" class="ub" data-cerrar>Cerrar</button></div>`;
  activarGrafica(serie, "gN");
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}

// ---------------------------------------------------------------- La lección

function bloque(b) {
  switch (b.tipo) {
    case "texto": return `<p>${marca(b.texto)}</p>`;
    case "formula": return `<div class="formula" aria-label="${esc((b.partes || []).join(", más "))}">${(b.partes || []).map((p, i) => (i ? "<i>+</i>" : "") + `<span>${esc(p)}</span>`).join("")}</div>`;
    case "tabla": return `<div class="scroll"><table class="conj">
      <thead><tr>${(b.encabezados || []).map((e) => `<th scope="col">${esc(e)}</th>`).join("")}</tr></thead>
      <tbody>${(b.filas || []).map((f) => `<tr><th scope="row">${esc(f[0])}</th>${f.slice(1).map((c, i) => `<td${i ? "" : ' class="f"'}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
    case "nota_andrea": return `<p class="pen">${esc(b.texto)}<span>Nota de Andrea, al margen</span></p>`;
    case "ejemplos": return `<ul class="exs">${(b.lista || []).map((e) => `<li class="ex"><span class="es" lang="es-MX">${marca(e.es)}</span><span class="en" lang="en">${esc(e.en)}</span></li>`).join("")}</ul>`;
    case "pares": return `<div class="pairs">${(b.lista || []).map((par) => `<div class="pair">
      ${(par.filas || []).map((f) => `<div class="row ${f.v === "bien" ? "bien" : "mal"}"><span class="tag">${f.v === "bien" ? "Bien" : "Mal"}</span><span class="t">${esc(f.t)}</span></div>`).join("")}
      ${par.nota ? `<p class="why">${esc(par.nota)}</p>` : ""}</div>`).join("")}</div>`;
    case "usos": return `<dl class="uses">${(b.lista || []).map((u) => `<div class="use"><dt>${esc(u.forma)}${u.aqui ? ' <span class="here">esta lección</span>' : ""}</dt><dd>${marca(u.texto)}</dd></div>`).join("")}</dl>`;
    case "mini_kwiz": return (b.lista || []).map((q) => `<details class="q"><summary>${marca(q.p)}</summary><div class="a"><b>${esc(q.r)}</b>${q.nota ? `<span>${esc(q.nota)}</span>` : ""}</div></details>`).join("");
    default: return "";
  }
}

function verLeccion(o, slug) {
  const tema = porSlug.get(slug);
  if (!tema) return verNoExiste();
  if (o.conserva && vista.dataset.leccion === slug) return;      // ya está en pantalla: no se mueve mientras lees
  // Abrir la lección de un tema atascado lo destraba: la cuenta de fallas empieza de cero.
  if (N.temasAtascados(E).has(tema.id)) { A.apuntar({ t: "destrabar", id: N.nuevoId("b"), tema: tema.id, como: "leccion", cuando: new Date().toISOString() }); recalcular(); }
  poner(`<section class="card"><h1 class="h">${esc(tema.titulo)}</h1><p>Abriendo la lección…</p></section>`,
    { titulo: tema.titulo + " · Pelagos", nav: "gramatica" });
  const turno = turnoDePintar;
  vista.dataset.leccion = slug;
  A.leccion(tema.leccion).then((lec) => {
    if (turno !== turnoDePintar) return;
    pintarLeccion(tema, lec);
  }).catch((e) => {
    if (turno !== turnoDePintar) return;
    if (e instanceof A.Fallo && e.tipo === "llave") return verLlave("Tu llave ya no sirve. Pon una nueva.");
    verNoExiste("No se pudo abrir la lección: " + (e instanceof A.Fallo ? e.message : "algo falló") + ".");
  });
}

// El clip de la tutora (escenas/tutora-<tema>/). Ver README.
function clipDeTutora(tema) {
  if (!movimientoEnTodo() || ambiente() === "limpio" || sinMovimiento()) return "";
  const sala = "tutora-" + tema.id;
  if (!escenasPorSala.has(sala)) {
    escenasPorSala.set(sala, []);
    A.escenasDe(sala).then((l) => {
      escenasPorSala.set(sala, l);
      const v = l.filter(esMovimiento).slice(-1)[0];
      // Llegó después de pintar: se vuelve a pintar la lección, ahora con el clip de fondo.
      if (v && movimientoEnTodo() && vista.dataset.leccion === tema.slug && leccionPintada && leccionPintada.tema === tema) pintarLeccion(tema, leccionPintada.lec, true);
    }).catch(() => {});
  }
  const v = escenasPorSala.get(sala).filter(esMovimiento).slice(-1)[0];
  return v ? etiquetaEscena(sala, v) : "";
}

let leccionPintada = null;
// Con clip de tutora, la lección va como el Tablero: el clip fijo al fondo y todo lo demás pasa por encima.
const conClipDeFondo = (clip, html) => clip ? `<div class="hoy confoto contutora"><div class="fondo">${clip}${LOGO}</div><div class="sobre">${html}</div></div>` : html;

function pintarLeccion(tema, lec, conserva = false) {
  leccionPintada = { tema, lec };
  const tutora = clipDeTutora(tema);
  const i = info(tema.id);
  const kwiziq = tema.slug_kwiziq ? KWIZIQ + tema.slug_kwiziq : null;
  // «Se confunde con»: lo que diga la lección más sus parejas de contrastes.json (16-Oct-2026).
  const susPares = contrastesDe(tema.id);
  const grupos = GRUPOS.map(([clave, nombre]) => {
    let ids = (lec.enlaces || {})[clave] || [];
    if (clave === "confunde") ids = [...new Set([...ids, ...susPares.flatMap((c) => c.temas.filter((x) => x !== tema.id))])];
    return { clave, nombre, temas: ids.map((id) => porId.get(id)).filter(Boolean) };
  }).filter((g) => g.temas.length);
  const traen = [...new Set(P.enlaces.filter((x) => x[1] === tema.id).map((x) => x[0]))].map((id) => porId.get(id)).filter(Boolean)
    .sort((a, b) => (a.nivel < b.nivel ? -1 : a.nivel > b.nivel ? 1 : a.orden - b.orden));
  const banco = P.preguntas.filter((q) => q.tema === tema.id && q.estado === "revisada" && !E.retiradas.has(q.id)).length;
  const secciones = lec.secciones || [];
  const saltos = [["regla", "Regla"], ["ejemplos", "Ejemplos"], ["kwiz", "Quiz"], ["enlaces", "Enlaces"]]
    .filter(([id]) => id === "enlaces" || secciones.some((s) => s.id === id));
  poner(conClipDeFondo(tutora, `
  <p class="crumb"><a href="#/gramatica">Gramática</a> · <a href="#/gramatica/${esc(tema.nivel.toLowerCase())}">${esc(tema.nivel)}</a> · ${esc(CATEGORIAS[tema.categoria] || tema.categoria)}</p>
  <header class="hero${tutora ? " contutora" : ""}">
    <div class="ratio"></div>
    ${tutora ? "" : imagenDeArriba(lec.foto && fotoDeLeccion(lec.foto))}
    <div class="over">
      <p class="lead"><span>${esc(tema.nivel)} · ${esc(NIVELES[tema.nivel] || "")}</span><span>${i.n === 0 ? "" : plural(i.n, "respuesta", "respuestas")}</span></p>
      <h1>${esc(lec.titulo)}</h1>
      ${lec.subtitulo ? `<p class="sub">${esc(lec.subtitulo)}</p>` : ""}
      <button type="button" class="score" data-graftema="${tema.id}" aria-label="Tu porcentaje: ${pct(i.pct)}, meta ${meta()}%. Ver tu porcentaje día por día">
        <span>Tu porcentaje: ${pct(i.pct)} · meta ${meta()}% <span class="vergraf" aria-hidden="true">· ver gráfica</span></span>
        <div class="track" role="img" aria-label="${pct(i.pct)} de 100, meta en ${meta()}"><i data-w="${ancho(i.pct)}"></i><b data-x="${meta()}"></b></div>
      </button>
      ${escalonDeTema(i) ? `<p class="sub escalonTema">${escalonDeTema(i)}</p>` : ""}
    </div>
    ${lec.regla ? `
    <div class="rule" id="rule"><span class="k">La regla en una línea</span><p>${esc(lec.regla)}</p><button type="button" id="ruleOff">Ya me la sé</button></div>
    <button type="button" class="back" id="ruleOn" hidden>Ver la regla</button>` : ""}
  </header>
  <nav class="jump" aria-label="Partes de la lección">${saltos.map(([id, nombre]) => `<button type="button" data-ir="${id}">${nombre}</button>`).join("")}</nav>
  ${secciones.map((s) => `<section class="card" id="${esc(s.id)}"><h2>${esc(s.titulo)}</h2>${(s.bloques || []).map(bloque).join("")}</section>`).join("")}
  ${banco ? `
  <section class="card" id="practica">
    <h2>Quiz de este tema</h2>
    <p>Cinco preguntas solo de esta regla. Cada respuesta mueve tu porcentaje.</p>
    <div class="go"><button type="button" class="ub grande" data-kwiz='{"tipo":"tema","tema":${tema.id}}'>Empezar</button></div>
    <p class="small">Hay ${plural(banco, "pregunta revisada", "preguntas revisadas")} de este tema.</p>
  </section>` : ""}
  ${tutoraDe(tema.id) && !mudo() ? `
  <section class="card" id="tutora">
    <h2>Tu tutora</h2>
    <p>${esc(tutoraDe(tema.id).tutora)} te enseña esta regla a su manera.</p>
    ${botonEscena(tema.id)}
  </section>` : ""}
  <section class="card" id="enlaces">
    <h2>Esta lección en la red</h2>
    <p>Cada lección apunta a otras. Toca una y ves su regla sin salir de aquí.</p>
    ${grupos.map((g) => `<h3>${g.nombre}</h3>${g.clave === "confunde" && susPares.length ? susPares.map((c) => `<p class="small"><b>${esc(c.nombre)}</b>: ${esc(c.porque)}</p>`).join("") : ""}<div class="links">${g.temas.map((t) => `
      <button type="button" class="tb" data-l="${t.id}"><span class="lv">${esc(t.nivel)}</span><span class="nm">${esc(titulo(t))}</span><span class="pc">${pct(info(t.id).pct)}</span>${barra(info(t.id).pct)}</button>`).join("")}</div>`).join("")}
    <h3>Te traen aquí</h3>
    ${traen.length
      ? `<p class="backs">${traen.map((t) => `<button type="button" class="lk" data-l="${t.id}">${esc(titulo(t))}</button>`).join(" · ")}</p>`
      : '<p class="small">Todavía ninguna otra lección menciona esta. La lista se arma sola conforme se escriben.</p>'}
    ${(lec.biblioteca || []).length ? `<h3>En tu biblioteca</h3><ul class="lib">${lec.biblioteca.map((x) => `<li><span class="kind">${esc(x.tipo)}</span>${
      x.kwiziq && kwiziq ? `<a href="${esc(kwiziq)}" rel="noopener noreferrer" target="_blank">${esc(x.texto)}</a>`
        : x.url && /^https:\/\//.test(x.url) ? `<a href="${esc(x.url)}" rel="noopener noreferrer" target="_blank">${esc(x.texto)}</a>`
          : `<span>${esc(x.texto)}</span>`}${x.donde ? `<span class="where">${esc(x.donde)}</span>` : ""}</li>`).join("")}</ul>` : ""}
  </section>`),
  {
    titulo: lec.titulo + " · Pelagos", nav: "gramatica", conserva,
    pie: (tema.leccion.comparada_kwiziq ? `<p>Comparada punto por punto con la lección de Kwiziq el ${fecha(tema.leccion.comparada_kwiziq)}.</p>` : "") +
      (i.n === 0 && tema.arranque_fuente ? `<p>Tu porcentaje es el arranque: viene del ${esc(tema.arranque_fuente)}, leído el ${fecha(tema.arranque_leido)}.</p>` : ""),
  });
  vista.dataset.leccion = tema.slug;
  conectarEscenas(vista);
}

// ---------------------------------------------------------------- Las tutoras

/** La tutora de un tema, si ya está escrita. */
const tutoraDe = (id) => (P.tutoras || []).find((t) => t.leccion === id) || null;
/** El nombre corto de la tutora de una lección («Udela»), o «la tutora». */
const nombreTutora = (id) => { const t = tutoraDe(id); return t && t.tutora ? t.tutora.split(",")[0].trim() : "la tutora"; };

// La escena completa de una tutora: el video vive solo en el aparato (ver web/videos.js).
// «Escuchar a <tutora>»: su episodio grabado (MP3) en la rama avance, en escenas/voz-<lección>/ (como los loops).
// El botón sale solo si ya hay grabación. El audio se baja con la llave y se toca aquí mismo, con el reproductor del aparato.
const nombreCorto = (t) => t.tutora.split(",")[0];
const salaVoz = (id) => "voz-" + id;
// «Conoce a <tutora>»: su presentación corta (su regla, sus trampas y su frase), en escenas/presenta-<lección>/.
const salaPresenta = (id) => "presenta-" + id;
const botonEscena = (id) => {
  const t = tutoraDe(id);
  const conoce = t ? `<button type="button" class="ub grande" data-presenta="${id}" hidden>Estudiar con ${esc(nombreCorto(t))}</button>` : "";
  const oir = t ? `<button type="button" class="ub grande" data-escuchar="${id}" hidden>Escuchar a ${esc(nombreCorto(t))}</button>` : "";
  // «Kwiz con la tutora»: sus preguntas, de 5 en 5 aciertos, con su escena de fondo que avanza con cada acierto.
  const prac = t && (bancoPorTema().get(id) || 0) >= N.ACIERTOS_TUTORA ? `<button type="button" class="ub grande" data-kwiz='{"tipo":"tutora","tema":${id}}'>Practicar con ${esc(nombreCorto(t))}</button>` : "";
  // «Llamar a <tutora>»: abre un chat nuevo de Claude con la llamada ya escrita; ahí se toca el botón de voz.
  const llama = t ? `<a class="ub grande" href="${esc(enlaceLlamada(t))}" target="_blank" rel="noopener">Llamar a ${esc(nombreCorto(t))}</a>` : "";
  // En Limpio no hay ninguna imagen de la tutora: tampoco el botón de su escena completa.
  const escena = ambiente() === "limpio" ? "" : `<button type="button" class="ub grande" data-escena="${id}">Ver la escena completa</button>`;
  return `<div class="go">${escena}${conoce}${oir}${prac}${llama}</div><div class="voz" data-voz="${id}"></div><p class="small" data-escenaaviso="${id}" role="status"></p>`;
};

/**
 * La llamada de voz con una tutora: las instrucciones para Claude, armadas con su regla y su personaje.
 * Ella enseña la regla al principio y luego le pone una misión de su mundo. Sin nada explícito: el modo de voz no lo hace.
 * Si su personaje trae «escenas_llamada», se escoge una al azar; si no, ella inventa una con su escenario.
 */
function textoLlamada(t, azar = Math.random) {
  const p = t.personaje || {};
  const nombre = nombreCorto(t);
  // Del «set» solo se toman los lugares y objetos (lo que va antes de cada «=»).
  const escenario = String(t.set || "").split(";").map((s) => s.split("=")[0].trim()).filter(Boolean).join(", ");
  const rasgos = [
    p.edad && `${p.edad} años`, p.generacion, p.acento && `acento: ${p.acento}`, p.registro && `estilo: ${p.registro}`,
    p.energia && `energía: ${p.energia}`, p.rasgo,
    p.muletillas && p.muletillas.length && `muletillas: ${p.muletillas.join(", ")}`,
  ].filter(Boolean).map((x) => String(x).trim().replace(/[.\s]+$/, "")).join("; ");
  const escenas = Array.isArray(p.escenas_llamada) ? p.escenas_llamada : [];
  const mision = escenas.length
    ? `La misión de hoy: ${escenas[Math.floor(azar() * escenas.length) % escenas.length]}`
    : `Inventa una misión de tu mundo${escenario ? ` (${escenario})` : ""}: un problema que solo se resuelve si uso la regla.`;
  return [
    `Vamos a hacer una llamada de práctica de español por voz. Tú eres ${t.tutora}, una de las tutoras de Pelagos, mi app de estudio. Yo soy Grifo, tu estudiante. Quédate en personaje toda la llamada.`,
    `Quién eres: ${t.tutora}.${rasgos ? " " + rasgos + "." : ""}${escenario ? ` Tu mundo: ${escenario}.` : ""}`,
    `Tu regla, la única que practicamos hoy: ${t.regla}`,
    `Cómo va la llamada:`,
    `1. Abres tú, en personaje y con tu energía, ya dentro de tu mundo. Nunca me preguntes de qué quiero hablar.`,
    `2. Clase relámpago, menos de un minuto: me explicas la regla a tu manera, con un truco para acordarme y dos o tres ejemplos. Luego me pides que repita una forma.`,
    `3. ${mision} Hazme preguntas que me obliguen a usar la regla. Si me trabo, dame una pista con tus palabras.`,
    `4. Turnos cortos: una o dos frases y me pasas la palabra. Yo hablo más que tú.`,
    `5. Una vez en la llamada, equivócate a propósito con la regla, como si nada. Si te cacho, lo celebras y gano un punto.`,
    `6. No me corrijas a media plática: si me equivoco, repite la forma correcta de pasada y sigue.`,
    `7. Después de unos ocho intercambios, unos tres minutos, cierras tú: mi marcador (cuántas veces usé bien la regla), mis dos o tres errores con la forma correcta, uno por línea, y un pendiente para la próxima llamada. Luego te despides.`,
    `8. Si digo «paso» o «ahorita no», te despides en una frase.`,
    `Estilo: español mexicano natural y sencillo, con tus muletillas. Coqueta, juguetona y con humor, sin lenguaje explícito; el coqueteo nunca depende de que conteste bien. Es para el modo de voz: frases cortas, sin listas, sin emojis, sin asteriscos ni acotaciones.`,
    `Empieza ya, en personaje.`,
  ].join("\n");
}
/** El enlace que abre la llamada en Claude (chat nuevo con el texto ya puesto). */
const enlaceLlamada = (t, azar) => "https://claude.ai/new?q=" + encodeURIComponent(textoLlamada(t, azar));
function conectarEscenas(raiz) {
  for (const b of raiz.querySelectorAll("[data-escena]")) b.addEventListener("click", () => verEscena(Number(b.dataset.escena)));
  for (const b of raiz.querySelectorAll("[data-practica]")) b.addEventListener("click", async () => {
    const id = Number(b.dataset.practica), aviso = vista.querySelector(`[data-escenaaviso="${id}"]`);
    if (aviso) aviso.textContent = "Preparando la práctica…";
    // Primero un video que este aparato ya tenga (sin pedir permiso ni carpeta); si no, tu almacén de Cloudflare.
    let f = await V.video(id, false);
    if (!f) f = (await enlaceNube(id)) || null;
    try { await abrirPractica(id, f, A, NB); if (aviso) aviso.textContent = ""; } catch (e) { if (aviso) aviso.textContent = e.message || "No se pudo abrir la práctica."; }
  });
  for (const [attr, sala, etiqueta] of [["escuchar", salaVoz, "Escuchar a "], ["presenta", salaPresenta, "Estudiar con "]]) {
    for (const b of raiz.querySelectorAll(`[data-${attr}]`)) {
      const id = Number(b.dataset[attr]);
      A.escenasDe(sala(id)).then((l) => {
        const v = l.filter((x) => /^audio\//.test(x.tipo || "")).slice(-1)[0];
        if (!v || !b.isConnected) return;
        b.hidden = false;
        b.addEventListener("click", () => escuchar(b, id, v, sala(id), etiqueta));
      }).catch(() => {});
    }
  }
}
async function escuchar(b, id, v, sala = salaVoz(id), etiqueta = "Escuchar a ") {
  const caja = vista.querySelector(`[data-voz="${id}"]`), t = tutoraDe(id);
  const aviso = vista.querySelector(`[data-escenaaviso="${id}"]`);
  if (!caja) return;
  if (repaso) pararRepaso("");
  for (const otro of caja.querySelectorAll("audio")) if (otro.dataset.sala !== sala) { otro.pause(); otro.remove(); }
  let audio = caja.querySelector("audio");
  if (!audio) {
    b.disabled = true;
    if (aviso) aviso.textContent = "Bajando su voz…";
    try {
      const url = await A.escenaUrl(sala, v);
      audio = document.createElement("audio");
      audio.dataset.sala = sala;
      audio.controls = true;
      audio.preload = "auto";
      audio.src = url;
      audio.setAttribute("aria-label", (sala === salaVoz(id) ? "Episodio de " : "Presentación de ") + t.tutora);
      caja.append(audio);
      if (aviso) aviso.textContent = "";
    } catch (e) {
      if (aviso) aviso.textContent = "No se pudo bajar su voz. Revisa la conexión y vuelve a tocar.";
      b.disabled = false;
      return;
    }
    b.disabled = false;
    // En la pantalla bloqueada del teléfono sale su nombre.
    if ("mediaSession" in navigator && window.MediaMetadata) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.tutora, artist: "Tutoras de Pelagos", album: "Pelagos" }); } catch { /* sin pantalla bloqueada, no pasa nada */ }
    }
    audio.addEventListener("play", () => { b.textContent = "Pausa"; });
    audio.addEventListener("pause", () => { b.textContent = etiqueta + nombreCorto(t); });
  }
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}
function callar() { for (const a of document.querySelectorAll(".voz audio")) a.pause(); }
/** Cierra todo lo que reproduce video con sonido (la escena completa, la escena desde su sitio y la práctica). Al cambiar de página. */
function cerrarVideos() {
  const h = $("escenaHoja"); if (h && h.open && h.cerrar) h.cerrar();
  const w = $("escenaWeb"); if (w && w.open) { const f = w.querySelector("iframe"); if (f) f.removeAttribute("src"); w.close(); }
  const pr = $("prX"); if (pr) pr.click();
}

// ---------------------------------------------------------------- Repaso en audio
// Toca, una tras otra, las voces grabadas de las tutoras (escenas/voz-<lección>/). Mientras habla cada una,
// arriba va su loop (escenas/tutora-<lección>/); cuando entra la siguiente, cambia el loop.
let repaso = null;      // { origen, cola: [{ id, v }], i, audio, faltan: [ids], sonando, aviso }
/** El loop (GIF o video) de la tutora de un tema, si ya se sabe; si no, null. */
function loopDeTutora(id) { const l = escenasPorSala.get("tutora-" + id); return l ? l.filter(esMovimiento).slice(-1)[0] || null : null; }
const nombreDe = (id) => { const t = tutoraDe(id); return t ? nombreCorto(t) : "la tutora"; };
function botonesRepaso() {
  if (mudo()) return "";
  const del = repaso && repaso.origen === "plan";
  return `<button type="button" class="ub grande" id="repasoAudio" aria-pressed="${del && !repaso.audio.paused}">${!del ? "Repasar en audio" : repaso.audio.paused ? "Seguir repasando" : "Pausa"}</button>` +
    (del ? `<button type="button" class="ub" id="repasoSig">Siguiente</button><button type="button" class="ub" id="repasoFin">Terminar</button>` : "");
}
function avisoRepaso() {
  if (!repaso) return ultimoAvisoRepaso;
  const n = repaso.cola.length, ahora = (repaso.etiqueta ? repaso.etiqueta + " " : "") + (repaso.sonando != null ? `Ahora: ${nombreDe(repaso.sonando)} (${repaso.i + 1} de ${n}).` : "Bajando las voces…");
  const f = repaso.faltan.length ? ` Sin voz todavía: ${repaso.faltan.map(nombreDe).join(", ")}.` : "";
  return ahora + f;
}
let ultimoAvisoRepaso = "";
/** Pone al día los botones, el aviso y las bocinas. Si cambia qué botones van, vuelve a pintar. */
function refrescarRepaso() {
  const b = $("repasoAudio"), del = !!repaso && repaso.origen === "plan";
  if (b && !!$("repasoSig") !== del) { pintar({ conserva: true }); return; }
  if (b) { b.textContent = !del ? "Repasar en audio" : repaso.audio.paused ? "Seguir repasando" : "Pausa"; b.setAttribute("aria-pressed", String(del && !repaso.audio.paused)); }
  const a = $("repasoAviso"); if (a) a.textContent = avisoRepaso();
  for (const x of vista.querySelectorAll("[data-repasar]")) {
    const suena = !!repaso && repaso.sonando === Number(x.dataset.repasar) && !repaso.audio.paused;
    const dice = suena ? "Pausa" : "Escuchar a " + nombreDe(Number(x.dataset.repasar));
    x.setAttribute("aria-pressed", String(suena)); x.setAttribute("aria-label", dice); x.title = dice;
  }
}
/** Los temas del plan, en orden. */
/** Un instante de silencio: se toca en el mismo toque del botón para que el teléfono deje sonar lo que sigue. */
let silencio = null;
function SILENCIO_URL() {
  if (silencio) return silencio;
  const n = 800, b = new DataView(new ArrayBuffer(44 + n)), txt = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
  txt(0, "RIFF"); b.setUint32(4, 36 + n, true); txt(8, "WAVEfmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 8000, true); b.setUint16(32, 1, true); b.setUint16(34, 8, true); txt(36, "data"); b.setUint32(40, n, true);
  for (let i = 0; i < n; i++) b.setUint8(44 + i, 128);
  silencio = URL.createObjectURL(new Blob([b.buffer], { type: "audio/wav" }));
  return silencio;
}
async function empezarRepaso(ids, origen, etiqueta = "", rutaDada = null) {
  const ruta = rutaDada || window.location.hash;      // la página donde va su loop
  pararRepaso("");
  callar();
  const audio = new Audio(SILENCIO_URL());        // en el mismo toque: así el navegador no bloquea el audio que llega después
  audio.play().catch(() => {});
  const avisa = (t) => { ultimoAvisoRepaso = t; const a = $("repasoAviso"); if (a && origen === "plan") a.textContent = t; };
  avisa("Buscando las voces…");
  const items = await Promise.all(ids.map(async (id) => {
    try { const v = (await A.escenasDe(salaVoz(id))).filter((x) => /^audio\//.test(x.tipo || "")).slice(-1)[0]; return v ? { id, v } : null; }
    catch { return null; }
  }));
  const cola = items.filter(Boolean), faltan = ids.filter((id) => !cola.some((c) => c.id === id));
  if (!cola.length) { audio.pause(); avisa(etiqueta ? "Ninguna de tus fallas tiene voz todavía." : ids.length > 1 ? "Todavía ninguna tutora de tu plan tiene voz." : "Esta tutora todavía no tiene voz."); return; }
  // Los loops de cada una, para cambiar el fondo cuando empiece a hablar.
  await Promise.all(cola.map(async (c) => {
    const sala = "tutora-" + c.id;
    if (!(escenasPorSala.get(sala) || []).length) { try { escenasPorSala.set(sala, await A.escenasDe(sala)); } catch { escenasPorSala.set(sala, []); } }
  }));
  audio.preload = "auto";
  repaso = { origen, cola, i: -1, audio, faltan, sonando: null, etiqueta, ruta };
  audio.addEventListener("ended", () => { if (repaso && repaso.audio === audio) tocarRepaso(repaso.i + 1); });
  audio.addEventListener("play", refrescarRepaso);
  audio.addEventListener("pause", refrescarRepaso);
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession, h = (a, f) => { try { ms.setActionHandler(a, f); } catch { /* no todos los aparatos */ } };
    h("play", () => repaso && repaso.audio.play().catch(() => {}));
    h("pause", () => repaso && repaso.audio.pause());
    h("nexttrack", () => repaso && tocarRepaso(repaso.i + 1));
    h("previoustrack", () => repaso && tocarRepaso(Math.max(0, repaso.i - 1)));
    h("stop", () => pararRepaso("Repaso terminado."));
  }
  tocarRepaso(0);
}
async function tocarRepaso(i) {
  if (!repaso) return;
  if (i >= repaso.cola.length) { pararRepaso(repaso.cola.length > 1 ? "Listo: ya repasaste tu plan completo." : ""); return; }
  const r = repaso, { id, v } = r.cola[i];
  r.i = i;
  r.audio.pause();
  try {
    const u = await A.escenaUrl(salaVoz(id), v);
    if (repaso !== r || r.i !== i) return;
    r.audio.src = u;
  } catch { if (repaso === r) tocarRepaso(i + 1); return; }
  r.sonando = id;
  const t = tutoraDe(id), tema = porId.get(id);
  if ("mediaSession" in navigator && window.MediaMetadata) {
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: t ? t.tutora : "Tutora", artist: tema ? titulo(tema) : "Repasar en audio", album: "Repasar en audio · Pelagos" }); } catch { /* sin pantalla bloqueada */ }
  }
  pintar({ conserva: true });          // cambia el loop de arriba
  r.audio.play().catch(() => refrescarRepaso());
}
/** Para el repaso y regresa el fondo de siempre. */
function pararRepaso(aviso) {
  if (!repaso) return;
  const r = repaso;
  repaso = null;
  r.audio.pause();
  r.audio.removeAttribute("src");
  ultimoAvisoRepaso = aviso || "";
  pintar({ conserva: true });
}
vista.addEventListener("click", (ev) => {
  const b = ev.target instanceof Element ? ev.target.closest("[data-repasar]") : null;
  if (!b) return;
  ev.preventDefault();
  const id = Number(b.dataset.repasar);
  if (repaso && repaso.sonando === id) { if (repaso.audio.paused) repaso.audio.play().catch(() => {}); else repaso.audio.pause(); return; }
  empezarRepaso([id], "tema");
});
// Respaldo: si este aparato no tiene el video, se ve el original desde su sitio (campo `enlace` de la tutora),
// dentro de Pelagos con el reproductor «embed» del sitio. Abajo, un enlace por si el sitio no deja verlo aquí.
// El original arranca en 1:05, igual que los recortes de tu carpeta.
function embedDe(enlace) {
  const m = /[?&]viewkey=([a-z0-9]+)/i.exec(String(enlace || ""));
  return m ? "https://www.pornhub.com/embed/" + m[1] : "";
}
function verEnElSitio(web, enlace) {
  let d = $("escenaWeb");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "escenaWeb"; d.className = "sheet escena";
    d.setAttribute("aria-label", "La escena completa, desde su sitio");
    d.innerHTML = '<div class="in"><div class="marco"><iframe title="La escena completa" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="origin"></iframe></div>' +
      '<p class="small">Este aparato no tiene el video: se ve desde su sitio, con sus anuncios. Empieza en 1:05. <a target="_blank" rel="noopener noreferrer">Abrir en otra pestaña</a></p>' +
      '<div class="acts"><button type="button" class="ub grande" id="escenaWebX">Cerrar</button></div></div>';
    document.body.appendChild(d);
    const cerrar = () => { d.querySelector("iframe").removeAttribute("src"); if (d.open) d.close(); };
    $("escenaWebX").addEventListener("click", cerrar);
    d.addEventListener("cancel", (ev) => { ev.preventDefault(); cerrar(); });
  }
  d.querySelector("iframe").src = web + "?t=65";
  d.querySelector("a").href = enlace + "&t=65";
  if (d.showModal) d.showModal(); else d.setAttribute("open", "");
}
// Tu almacén de Cloudflare R2: los datos se leen una vez del repositorio privado y se recuerdan aquí.
let nubeDatos;
async function datosNube(fresco = false) {
  if (fresco || nubeDatos === undefined) { try { nubeDatos = await A.nubeLeer(); } catch { nubeDatos = null; } }
  return NB.lista(nubeDatos) ? nubeDatos : null;
}
/** El video de la tutora desde tu almacén de Cloudflare: un enlace firmado que caduca, o "" si no hay almacén. */
async function enlaceNube(id) {
  const tu = tutoraDe(id), d = tu && tu.archivo ? await datosNube() : null;
  return d ? NB.enlace(d, tu.archivo) : "";
}
async function verEscena(id) {
  // Se busca el aviso cada vez: si la página se vuelve a pintar mientras baja el video, el mensaje no se pierde.
  const decir = (t) => { const aviso = vista.querySelector(`[data-escenaaviso="${id}"]`); if (aviso) aviso.textContent = t; };
  decir("Buscando el video…");
  // 1. Tu almacén de Cloudflare: se ve en streaming, en cualquier aparato.
  const nube = await enlaceNube(id);
  if (nube) {
    decir("");
    // Si el reproductor no acepta el enlace firmado (el iPhone), se baja el video entero y se ve desde el aparato.
    const d = abrirReproductor(nube, async () => {
      decir("Bajando el video de Cloudflare…");
      try {
        const b = await NB.bajarVideo(nube, (p) => decir("Bajando el video de Cloudflare… " + Math.round(p * 100) + "%"));
        decir("");
        ponerSubtitulos(id, abrirReproductor(b, () => verEscenaLocal(id, decir, "No se pudo ver desde Cloudflare. ")));
      } catch (e) { verEscenaLocal(id, decir, e.message + " "); }
    });
    ponerSubtitulos(id, d);
    return;
  }
  return verEscenaLocal(id, decir, false);
}
/** El video desde este aparato (tu carpeta o los importados) y, si no está, el botón para verlo desde su sitio. */
async function verEscenaLocal(id, decir, antes) {
  // Sin preguntar nada: solo si este aparato ya tenía permiso de tu carpeta o videos importados de antes.
  const f = await V.video(id, false);
  if (!f) {
    decir(antes ? "No pude traer su video de Cloudflare." : "Todavía no conectas tu almacén de Cloudflare. Se pone en Ajustes, «Videos de las tutoras».");
    // El respaldo nunca se abre solo: es un botón aparte, para que nada pida el sitio sin que tú lo toques.
    const aviso = vista.querySelector(`[data-escenaaviso="${id}"]`);
    const tu = tutoraDe(id), web = tu && embedDe(tu.enlace);
    if (web && aviso) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ub"; b.textContent = "Verla desde su sitio";
      b.addEventListener("click", () => verEnElSitio(web, tu.enlace));
      aviso.append(" ", b);
    }
    return;
  }
  decir("");
  const d = abrirReproductor(URL.createObjectURL(f), null);
  ponerSubtitulos(id, d);
}
/** Abre la hoja del reproductor con `src`. Si el video no carga, la cierra y llama a `siFalla`. */
function abrirReproductor(src, siFalla) {
  let d = $("escenaHoja");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "escenaHoja"; d.className = "sheet escena";
    d.setAttribute("aria-label", "La escena completa");
    d.innerHTML = '<div class="in"><video controls autoplay playsinline preload="metadata"></video><div class="acts"><button type="button" class="ub grande" id="escenaCC" aria-pressed="false" hidden>CC</button><button type="button" class="ub grande" id="escenaX">Cerrar</button></div></div>';
    document.body.appendChild(d);
    $("escenaCC").addEventListener("click", () => {
      const pista = d.querySelector("video track");
      if (!pista) return;
      const prender = pista.track.mode !== "showing";
      guardar("pelagos.cc", prender ? "1" : "0");
      pintarCC(d, prender);
    });
    d.cerrar = () => {
      const v = d.querySelector("video"); v.onerror = null; v.pause(); if (v.src.startsWith("blob:")) URL.revokeObjectURL(v.src); v.removeAttribute("src");
      for (const t of v.querySelectorAll("track")) { if (t.src) URL.revokeObjectURL(t.src); t.remove(); }
      $("escenaCC").hidden = true; v.load(); if (d.open) d.close();
    };
    $("escenaX").addEventListener("click", () => d.cerrar());
    d.addEventListener("cancel", (ev) => { ev.preventDefault(); d.cerrar(); });
  }
  const v = d.querySelector("video");
  v.onerror = siFalla ? () => { d.cerrar(); siFalla(); } : null;
  v.src = src;
  if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  v.play().catch(() => {});
  return d;
}
function ponerSubtitulos(id, d) {
  const v = d.querySelector("video");
  // Subtítulos: si la tutora tiene su .vtt, sale el botón CC. Se acuerda de si los dejaste prendidos.
  A.subtitulos(id).then((texto) => {
    if (!texto || !d.open || v.querySelector("track")) return;
    const t = document.createElement("track");
    t.kind = "subtitles"; t.srclang = "es"; t.label = "Español";
    t.src = URL.createObjectURL(new Blob([texto], { type: "text/vtt" }));
    v.appendChild(t);
    $("escenaCC").hidden = false;
    pintarCC(d, guardado("pelagos.cc") === "1");
  }).catch(() => {});
}
/** Prende o apaga los subtítulos de la escena y deja el botón CC como corresponde. */
function pintarCC(d, prender) {
  const pista = d.querySelector("video track"), b = $("escenaCC");
  if (pista) pista.track.mode = prender ? "showing" : "hidden";
  if (b) { b.setAttribute("aria-pressed", prender ? "true" : "false"); b.textContent = prender ? "CC: sí" : "CC: no"; b.classList.toggle("prendido", prender); }
}

function verTutoras(o) {
  const lista = (P.tutoras || []).slice().sort((a, b) => {
    const ta = porId.get(a.leccion), tb = porId.get(b.leccion);
    return (ta ? Object.keys(NIVELES).indexOf(ta.nivel) : 9) - (tb ? Object.keys(NIVELES).indexOf(tb.nivel) : 9) || ((ta && ta.orden) || 0) - ((tb && tb.orden) || 0);
  });
  poner(conFondo(`
  ${entradas("gramatica", "lecciones")}
  <section class="card">
    <h1 class="h">Tutoras</h1>
    <p>Una tutora por regla. Abre una, lee su episodio y, abajo, apunta lo que quieres que le cambie. Yo leo tus notas desde el repositorio.</p>
    <div class="links">${lista.map((t) => {
      const tema = porId.get(t.leccion), i = info(t.leccion), notas = N.notasSobre(E, "tutora:" + t.leccion).length;
      return `<a class="tb" href="#/tutoras/${t.leccion}"><span class="lv">${esc(tema ? tema.nivel : "")}</span><span class="nm">${esc(t.tutora)}</span><span class="pc${esBajo(i.pct) ? " bajo" : ""}">${pct(i.pct)}</span><span class="sm">${esc(tema ? titulo(tema) : "Lección " + t.leccion)}${notas ? " · " + plural(notas, "nota", "notas") : ""}</span>${barra(i.pct)}</a>`;
    }).join("")}</div>
    ${lista.length ? "" : '<p class="small">Todavía no hay ninguna.</p>'}
  </section>`), { titulo: "Tutoras · Pelagos", nav: "gramatica", conserva: o.conserva });
}

function verTutora(o, idTexto) {
  const id = Number(idTexto);
  const t = tutoraDe(id);
  if (!t) return verNoExiste("Esa tutora todavía no está escrita.");
  const tema = porId.get(id);
  const sobre = "tutora:" + id;
  const notas = N.notasSobre(E, sobre);
  const borrador = o.conserva && $("ntTexto") ? $("ntTexto").value : "";
  poner(`
  <p class="crumb"><a href="#/gramatica">Gramática</a> · <a href="#/tutoras">Tutoras</a>${tema && tema.slug && tema.leccion ? ` · <a href="#/leccion/${esc(tema.slug)}">${esc(titulo(tema))}</a>` : ""}</p>
  <section class="card">
    <h1 class="h">${esc(t.tutora)}</h1>
    <p class="small">${esc(tema ? tema.nivel + " · " + titulo(tema) : "Lección " + id)} · lección ${id}</p>
    <div class="rule fija"><span class="k">La regla en una línea</span><p>${esc(t.regla)}</p></div>
    ${botonEscena(id)}
  </section>
  <section class="card" id="episodio">
    <h2>El episodio</h2>
    <div class="episodio" lang="es-MX">${esc(t.episodio).split(/\n\s*\n/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}</div>
    <h3>Ficha</h3>
    <dl class="hvDatos">
      ${t.frase ? `<div><dt>Frase clave</dt><dd>${esc(t.frase)}</dd></div>` : ""}
      ${t.movimiento ? `<div><dt>Movimiento</dt><dd>${esc(t.movimiento)}</dd></div>` : ""}
      ${t.set ? `<div><dt>Set</dt><dd>${esc(t.set)}</dd></div>` : ""}
      ${t.arquetipo ? `<div><dt>Arquetipo</dt><dd lang="en">${esc(t.arquetipo)}</dd></div>` : ""}
    </dl>
  </section>
  <section class="card" id="notas">
    <h2>Tus notas</h2>
    <p class="small">Lo que quieres que le cambie a este episodio. Cada nota se guarda en tu repositorio y yo la leo desde ahí.</p>
    ${notas.length ? `<ul class="notas">${notas.map((n) => `<li><p>${esc(n.texto).replace(/\n/g, "<br>")}</p><p class="small">${esc(cuando(n.cuando))} · <button type="button" class="lk" data-notaq="${esc(n.id)}">Quitar</button></p></li>`).join("")}</ul>` : '<p class="small">Todavía no hay notas.</p>'}
    <form id="ntForma" class="forma" autocomplete="off">
      <label class="small" for="ntTexto">Nota nueva</label>
      <textarea id="ntTexto" class="campo" rows="4" lang="es" maxlength="${N.NOTA_MAX}" placeholder="Por ejemplo: quita el chiste de las palmeras; di el nombre una vez más al final.">${esc(borrador)}</textarea>
      <div class="go"><button type="submit" class="ub grande">Guardar la nota</button></div>
    </form>
  </section>`, { titulo: t.tutora + " · Tutoras · Pelagos", nav: "gramatica", conserva: o.conserva });
  conectarEscenas(vista);
  $("ntForma").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const texto = $("ntTexto").value.replace(/\r/g, "").trim();
    if (!texto) { $("ntTexto").focus(); return; }
    A.apuntar({ t: "nota", id: N.nuevoId("nt"), sobre, texto: texto.slice(0, N.NOTA_MAX), cuando: new Date().toISOString() });
    $("ntTexto").value = "";
    recalcular();
    pintar();
  });
  for (const b of vista.querySelectorAll("[data-notaq]")) b.addEventListener("click", () => {
    A.apuntar({ t: "notaq", id: N.nuevoId("nq"), nota: b.dataset.notaq, cuando: new Date().toISOString() });
    recalcular();
    pintar();
  });
}

// ---------------------------------------------------------------- El kwiz

/** Por qué está un tema en la lista, en una línea. */
function motivoEnLista(t, lista) {
  const debe = E.debe.get(t.id) || 0;
  if (debe >= N.ACIERTOS_PARA_SALIR) return "Se queda: la fallaste. Sale con dos aciertos seguidos";
  if (debe === 1) return "Se queda: le falta un acierto más";
  if (lista.quedan.includes(t.id)) return "Se queda: no la contestaste";
  const i = info(t.id);
  if (i.toca) return "Toca repasarlo";
  return "";
}

/** La línea de un tema del plan: las mismas marcas que en Lecciones y, si se queda o toca repasarlo, el motivo. */
function lineaDelPlan(t, lista, banco) {
  const i = info(t.id), motivo = motivoEnLista(t, lista);
  const tu = tutoraDe(t.id), n = banco.get(t.id) || 0;
  const corto = [tu ? tu.tutora.split(",")[0] : "", n ? plural(n, "pregunta", "preguntas") : ""].filter(Boolean).join(" · ");
  const at = N.temasAtascados(E).get(t.id);
  return (at ? `<span class="motivo atorado">Atascado: fallado en ${at.fallos} quizzes esta semana</span>` : "") +
    (corto ? `<span class="resp">${esc(corto)}</span>` : "") + (motivo ? `<span class="motivo">${esc(motivo)}</span>` : "");
}

/** Los temas atascados, arriba del plan: por qué, y tres salidas. No bloquea nada; es una sugerencia. */
function tarjetaAtorados() {
  const at = [...N.temasAtascados(E)].map(([id, x]) => ({ t: porId.get(id), x })).filter((a) => a.t);
  if (!at.length) return "";
  return `<section class="card atorados" id="atorados" aria-labelledby="atoradosT">
    <h2 id="atoradosT">${at.length === 1 ? "Se te atascó un tema" : `Se te atascaron ${at.length} temas`}</h2>
    ${at.map(({ t, x }) => {
      const tu = tutoraDe(t.id), kw = !mudo() && tu && (bancoPorTema().get(t.id) || 0) >= N.ACIERTOS_TUTORA;
      return `<div class="atorado">
        <p><b>${esc(titulo(t))}</b> (${esc(t.nivel)}): lo fallaste en ${x.fallos} quizzes distintos en los últimos ${x.dias} días. Antes de seguir, repasa la regla.</p>
        <div class="go">${t.slug && t.leccion ? `<a class="ub grande" href="#/leccion/${esc(t.slug)}">Leer la lección</a>` : ""}${kw ? `<button type="button" class="ub" data-kwiz='{"tipo":"tutora","tema":${t.id}}'>Practicar con ${esc(nombreCorto(tu))}</button>` : ""}<button type="button" class="ub" data-seguir="${t.id}" aria-label="Seguir así con ${esc(titulo(t))}">Seguir así</button></div>
      </div>`;
    }).join("")}
    <p class="small">Un tema se atasca si lo fallas en ${N.ATASCADO_FALLOS} quizzes distintos en ${N.ATASCADO_DIAS} días, igual que una tarjeta. No se bloquea: sigue saliendo. Se destraba al abrir su lección, al terminar su práctica con la tutora, al acertarlo ${N.ACIERTOS_PARA_SALIR} veces seguidas en días distintos o con «Seguir así». <a href="#/ayuda/atascadas">Cómo funciona</a></p>
  </section>`;
}

/**
 * El cuadro «Gramática» del Tablero (quizzes de hoy, de 5), igual que allá: el mismo número, la misma barra y el mismo sello.
 * En el quiz va sin enlace y con el sello quieto (solo se toca en el Tablero).
 */
function cuadroGramatica(hoy = N.fechaLocal(new Date())) {
  const kw = N.kwizzesDelDia(E, hoy), meta = N.KWIZZES_AL_DIA, hecho = kw >= meta;
  const T = N.leerTablero(A.tablero());
  const parte = T && T.checkin ? T.checkin.partes.find((x) => x.con === "kwizzes" && SELLOS[iconoDe(x)]) : null;
  const sello = parte ? { ...parte, va: hecho, estatico: true } : null;
  return cuadro("Gramática", kw, meta, "quizzes", hecho ? "Cumplido" : `Faltan ${meta - kw}`, hecho, "", sello);
}

/** El cuadro «Vocabulario» del Tablero (las palabras de hoy que ya repasaste, de las que te tocan), igual que allá, con el sello quieto. */
function cuadroVocabulario(hoy = N.fechaLocal(new Date())) {
  const dia = N.tarjetasDelDia(P, E, hoy), tj = dia.pendientes.length, hecho = tj === 0;
  const T = N.leerTablero(A.tablero());
  const parte = T && T.checkin ? T.checkin.partes.find((x) => x.con === "tarjetas" && SELLOS[iconoDe(x)]) : null;
  return cuadro("Vocabulario", dia.hechasHoy, dia.hechasHoy + tj, "cards", hecho ? "Cumplido" : "Por repasar", hecho, "", parte ? { ...parte, va: hecho, estatico: true } : null);
}
/** El cuadro de los quizzes de hoy, para ir junto a un botón (en un renglón «conCuadro»). */
const conCuadro = (hoy) => `<div class="unCuadro" role="list" aria-label="Tus quizzes de hoy">${cuadroGramatica(hoy)}</div>`;

function verKwiz(o) {
  revisarVideos();
  const abierto = N.kwizAbierto(E);
  const banco = P.preguntas.filter((q) => q.estado === "revisada" && !E.retiradas.has(q.id));
  const temasBanco = new Set(banco.map((q) => q.tema));
  const cuadernos = (P.cuadernos || []).map((c) => ({ ...c, con: c.temas.filter((t) => temasBanco.has(t)).length })).filter((c) => c.con);
  const lista = N.listaDeEstudio(P, E);
  const deLista = lista.temas.map((id) => porId.get(id)).filter(Boolean);
  const bancoPlan = bancoPorTema();
  const porNivel = N.nivelesConPreguntas(P, E);
  const hoy = N.fechaLocal(new Date());
  poner(conFondo(`
  ${entradas("gramatica", "quiz")}
  ${tarjetaAtorados()}
  <section class="card" id="lista">
    <h1 class="h">Tu plan de estudio Pelagos</h1>
    <div class="hoyGrande" data-explicas><p class="small">Te queda hoy</p>${circulosDeHoy("grande")}${panelExplica()}</div>
    <div class="conCuadro">${deLista.length && !lista.abierto ? `<button type="button" class="ub grande" data-kwiz='{"tipo":"lista"}'>Empezar quiz</button>`
      : abierto ? `<a class="ub grande" href="#${QUIZ}/${esc(abierto.id)}">Seguir el quiz</a>` : "<span></span>"}${conCuadro(hoy)}</div>
    ${abierto ? `<p class="small">Tienes un quiz a medias. Lo que ya contestaste está guardado.${deLista.length && !lista.abierto ? ` <a href="#${QUIZ}/${esc(abierto.id)}">Seguirlo</a>` : ""}</p>` : ""}
    <h3 id="enfoqueT">Enfoque</h3>
    <div class="enfoque" role="group" aria-labelledby="enfoqueT">
      <button type="button" class="nv ancho" data-enfoque="" aria-pressed="${E.enfoque ? "false" : "true"}">Guiado: todos los niveles</button>
      <div class="tdSeg enfSeg">${Object.keys(NIVELES).map((n) => `<button type="button" class="nv" data-enfoque="${n}" aria-pressed="${E.enfoque === n ? "true" : "false"}"${porNivel[n] ? "" : " disabled"} aria-label="${n}, ${porNivel[n] ? plural(porNivel[n], "tema con preguntas", "temas con preguntas") : "todavía sin preguntas"}">${n}<span>${porNivel[n] || 0}</span></button>`).join("")}</div>
    </div>
    <p class="small">${E.enfoque ? `Tu plan solo trae temas de ${esc(E.enfoque)}.` : "Tu plan toma temas de todos los niveles."} El número es cuántos temas tienen preguntas.${lista.abierto ? " El cambio se ve al terminar el quiz que está a medias." : ""}</p>
    ${(() => { if (E.enfoque) tendNivel = E.enfoque; const h = avanceNivel(); return h ? `<div id="avanceQuiz"><h3>Tu avance por nivel</h3>${h}</div>` : ""; })()}
    ${deLista.length ? `
    <h3>${plural(deLista.length, "tema", "temas")} en tu plan</h3>
    <div class="links">${deLista.map((t) => botonTema(t, { sub: lineaDelPlan(t, lista, bancoPlan) })).join("")}</div>
    ${mudo() ? "" : `<div class="go">${botonesRepaso()}</div>`}
    ${mudo() ? "" : `<p class="small" id="repasoAviso" role="status">${esc(avisoRepaso())}</p>`}
    <p class="small">Una pregunta de cada tema. El que aciertas sale del plan y vuelve en unos días. El que fallas se queda hasta que lo aciertes dos veces seguidas. Primero entran tus repasos del día y luego cinco temas nuevos; si ya no te queda ningún repaso, entran más nuevos.</p>
    ${deLista.length < N.LISTA ? `<p class="small">${E.enfoque ? `En ${esc(E.enfoque)} solo hay` : "Solo hay"} ${plural(deLista.length, "tema", "temas")} con preguntas. El plan se llena cuando se escriban más.</p>` : ""}`
    : `<p>${E.enfoque ? `Todavía no hay preguntas de ${esc(E.enfoque)}. Elige otro enfoque.` : "Todavía no hay preguntas revisadas."}</p>`}
  </section>
  ${cuadernos.length ? `
  <section class="card">
    <h2>Otros quizzes</h2>
    <div class="links">
      ${cuadernos.map((c) => `<button type="button" class="tb" data-kwiz='{"tipo":"cuaderno","cuaderno":${c.id}}'>
        <span class="nm ancho">${esc(c.nombre)}</span><span class="pc">${N.TOTAL}</span><span class="sm ancho">Solo sus temas: ${c.con} con preguntas</span></button>`).join("")}
    </div>
    <p class="small">Hay ${plural(banco.length, "pregunta revisada", "preguntas revisadas")} de ${plural(temasBanco.size, "tema", "temas")}.</p>
  </section>` : ""}`), { titulo: "Quiz de gramática · Pelagos", nav: "gramatica", conserva: o.conserva });
  const ats = $("atorados");
  if (ats) ats.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-seguir]");
    if (!b) return;
    A.apuntar({ t: "destrabar", id: N.nuevoId("b"), tema: Number(b.dataset.seguir), como: "seguir", cuando: new Date().toISOString() });
    recalcular();
    verKwiz({ conserva: true });
    const h = vista.querySelector("#atorados h2, #lista .h, #lista h2");
    if (h) { h.tabIndex = -1; h.focus(); }
  });
  const rb = $("repasoAudio");
  if (rb) rb.addEventListener("click", () => {
    if (repaso && repaso.origen === "plan") { if (repaso.audio.paused) repaso.audio.play().catch(() => {}); else repaso.audio.pause(); }
    else empezarRepaso(deLista.map((t) => t.id), "plan");
  });
  const rs = $("repasoSig"); if (rs) rs.addEventListener("click", () => repaso && tocarRepaso(repaso.i + 1));
  const rf = $("repasoFin"); if (rf) rf.addEventListener("click", () => pararRepaso("Repaso terminado."));
  for (const b of vista.querySelectorAll("[data-enfoque]")) {
    b.addEventListener("click", () => {
      const nivel = b.dataset.enfoque || null;
      if (nivel === E.enfoque) return;
      A.apuntar({ t: "enfoque", id: N.nuevoId("f"), nivel, cuando: new Date().toISOString() });
      recalcular();
      pintar({ conserva: true });
    });
  }
}

let armando = false;
function empezarKwiz({ tipo = "general", cuaderno = null, tema = null }) {
  if (armando) return;          // dos toques seguidos no arman dos quizzes: el seguro se quita al pintar la página que sigue
  armando = true;
  if (tipo === "lista") {
    const lista = N.listaDeEstudio(P, E);
    if (lista.abierto) return ir(QUIZ + "/" + lista.abierto.id);       // la lista no cambia hasta terminar el que está a medias
  }
  const ids = tipo === "lista" ? N.armarLista(P, E) : N.armar(P, E, { tipo, cuaderno, tema });
  if (!ids.length) return verNoExiste("Todavía no hay preguntas revisadas para ese quiz.");
  const k = { t: "kwiz", id: N.nuevoId("k"), tipo, cuaderno, tema, cuando: new Date().toISOString(), preguntas: ids };
  A.apuntar(k);
  recalcular();
  ir(QUIZ + "/" + k.id);
}

const guardado = (clave) => { try { return window.localStorage.getItem(clave); } catch { return null; } };
const guardar = (clave, valor) => { try { window.localStorage.setItem(clave, valor); } catch { /* sin memoria: no pasa nada */ } };

// ---- En el quiz de gramática, arriba de cada pregunta va el loop de la tutora de esa lección (como recordatorio).
/** La etiqueta del loop de la tutora del tema, si ya llegó; "" si no hay o si estás en Limpio. */
function loopDePregunta(tema) {
  if (ambiente() === "limpio" || sinMovimiento() || !A.leccionesConLoop().has(tema)) return "";
  const v = (escenasPorSala.get("tutora-" + tema) || []).filter(esMovimiento).slice(-1)[0];
  return v ? etiquetaEscena("tutora-" + tema, v) : "";
}
const loopsPedidos = new Map();     // sala -> promesa de su lista, para esperar la que ya va en camino
/** Pide la lista del loop (y la de las preguntas que siguen); si llega mientras sigues en esa pregunta, lo pone arriba. */
function esperarLoopDePregunta(kid, lugar, tema, k) {
  if (ambiente() === "limpio" || sinMovimiento()) return;
  const pedir = (t) => {
    const sala = "tutora-" + t;
    if (!A.leccionesConLoop().has(t)) return null;
    if (loopsPedidos.has(sala)) return loopsPedidos.get(sala);      // ya va en camino (lo pidió la pregunta anterior)
    if (escenasPorSala.has(sala)) return null;
    escenasPorSala.set(sala, []);
    const pr = A.escenasDe(sala).then((l) => { escenasPorSala.set(sala, l); }).catch(() => {});
    loopsPedidos.set(sala, pr);
    return pr;
  };
  const p = pedir(tema);
  // Las que siguen en este quiz: así su loop ya está cuando llegues.
  for (const otra of (k.pendientes || []).slice(1, 4)) { const q2 = preguntas.get(N.preguntaDe(otra)); if (q2) pedir(q2.tema); }
  if (!p) return;
  p.then(() => {
    const sig = N.siguiente(E, kid);
    const fondo = vista.querySelector(".kwFondo > .fondo");
    if (!fondo || enPreguntaDe !== kid || !sig || sig.p !== lugar) return;
    // Si no trae loop, el de la tutora del día (o el logo, si tampoco hay).
    const etiqueta = loopDePregunta(tema) || (cargarVideosFondo(), etiquetaMovimiento());
    if (!etiqueta) return;
    fondo.classList.remove("cargando");
    fondo.innerHTML = etiqueta + LOGO;
    vestir(fondo);
  });
}

// ---- El fondo del Kwiz con la tutora
let escaladaDatos;
async function escenasDeTutora(id) {
  if (escaladaDatos === undefined) { try { escaladaDatos = await A.escalada(); } catch { escaladaDatos = null; } }
  return (escaladaDatos && escaladaDatos.tutoras && escaladaDatos.tutoras[String(id)]) || null;
}
const videosTutora = new Map();      // lección -> promesa del video (archivo de tu carpeta o blob bajado de Cloudflare)
function videoDeTutora(id) {
  if (!videosTutora.has(id)) {
    videosTutora.set(id, (async () => {
      const f = await V.video(id, false);
      if (f) return f;
      const nube = await enlaceNube(id);
      return nube ? NB.bajarVideo(nube) : null;
    })().catch(() => { videosTutora.delete(id); return null; }));
  }
  return videosTutora.get(id);
}
/** Pone el fondo de la tutora en la etapa de este kwiz (cuántas buenas lleva, hasta 5). */
async function fondoDelKwiz(k) {
  if (!k || k.tipo !== "tutora" || ambiente() === "limpio") return;      // en Limpio no sale ninguna imagen de la tutora
  const lugar = $("tutoraVideo");
  const escenas = await escenasDeTutora(k.tema);
  if (!escenas) return;
  const et = F.etapas(escenas, N.ACIERTOS_TUTORA);
  const e = Math.min(k.bien || 0, N.ACIERTOS_TUTORA);
  F.mostrar(k.tema, et[e], () => videoDeTutora(k.tema), lugar, e < N.ACIERTOS_TUTORA ? et[e + 1] : null);
}

/** El peldaño de un tema (1 a 6), como los de las tarjetas; 0 si todavía no tiene caja. */
function nivelDeTema(t) { const i = info(t); return i && i.toca ? i.escalon + 1 : 0; }
/** La «Línea C» del quiz de gramática: lo que queda de ESTE quiz por grupo, los puntitos del tema y tus cajas. */
function lineaDeGramatica(k, temaActual) {
  const hoy = N.fechaLocal(new Date());
  const grupo = (t) => {
    const i = info(t);
    if ((E.debe.get(t) || 0) > 0) return 2;          // lo fallaste: todavía debe aciertos
    if (!i || !i.toca) return 0;                     // nuevo
    if (i.toca <= hoy) return 1;                     // vencido
    return -1;                                       // práctica extra: no le toca (no entra al contador)
  };
  const cuenta = [0, 0, 0];
  const temas = k.pendientes.map((x) => (preguntas.get(N.preguntaDe(x)) || {}).tema).filter((t) => t !== undefined);
  for (const t of temas) { const g = grupo(t); if (g >= 0) cuenta[g]++; }
  const cajas = [0, 0, 0, 0, 0, 0];
  for (const [t, i] of E.temas) {
    if (!i.toca) continue;
    if (E.enfoque && (porId.get(t) || {}).nivel !== E.enfoque) continue;
    cajas[Math.max(0, Math.min(5, i.escalon | 0))]++;
  }
  return lineaLeitner({ cuenta, actual: grupo(temaActual), nivel: nivelDeTema(temaActual), cajas, que: "temas" });
}

function verPregunta(o, kid) {
  if (o.conserva && enPreguntaDe === kid) { enPregunta = true; return; }
  const k = E.kwizzes.get(kid);
  if (!k) return verNoExiste();
  const sig = N.siguiente(E, kid);
  if (!sig) return k.terminado ? ir(QUIZ + "/" + kid + "/resultado", true) : verNoExiste(k.dejado ? "Ese quiz lo dejaste sin contestar nada." : "Ese quiz se quedó sin preguntas.");
  const q = preguntas.get(N.preguntaDe(sig.p));
  const tema = porId.get(q.tema);
  // Escalera de formatos: según la caja del tema, la de opciones se contesta escribiendo lo que falta,
  // y la de escribir sale sin pista en las cajas de 30 y 75 días. El Kwiz con la tutora se queda como está.
  const nivelF = k.tipo === "tutora" ? 0 : N.formatoDelTema(E, q.tema);
  const enHueco = q.tipo === "opcion" && nivelF >= 1;
  const escribir = q.tipo === "escribir" || enHueco;
  const conPista = !!q.pista && !(q.tipo === "escribir" && nivelF === 2);
  const opciones = escribir ? [] : N.barajar(q.opciones, N.azarDe(kid + "-" + sig.p));
  const deTutora = k.tipo === "tutora";
  const juego = deTutora ? [] : juegoDeFotos();
  const foto = juego.length ? juego[Math.floor(N.azarDe(kid + "#" + sig.orden)() * juego.length)] : null;

  // Como el Tablero: el loop fijo arriba y la pregunta en tarjetas de vidrio encima. De pregunta en pregunta solo cambia
  // el loop (la tutora de cada tema); si el tema no tiene loop, el de la tutora del día. Al terminar, el resultado
  // vuelve al fondo del día.
  const conLoop = !deTutora && ambiente() !== "limpio" && !sinMovimiento();
  const propio = conLoop ? loopDePregunta(q.tema) : "";
  const viene = conLoop && !propio && A.leccionesConLoop().has(q.tema);      // su loop está por llegar: el logo mientras tanto
  const delDia = conLoop && !propio && !viene ? (cargarVideosFondo(), etiquetaMovimiento()) : "";
  const clip = propio || delDia;
  const arriba = conLoop && (clip || viene);
  const envolver = (h) => arriba
    ? `<div class="hoy confoto contutora kwFondo"><div class="fondo${clip ? "" : " cargando"}">${clip ? clip + LOGO : '<img class="logoCarga" src="logo.png" alt="Pelagos">'}</div><div class="sobre">${h}</div></div>`
    : h;      // en Limpio la pregunta va sin logo, como la tarjeta de vocabulario: más pantalla para la pregunta (18-Oct)
  poner(envolver(`
  <section class="kw${deTutora ? " kwTutora" : ""}">
    <header class="hero kwh${arriba ? " contutora" : ""}">
      <div class="ratio"></div>
      ${deTutora ? (ambiente() === "limpio" ? "" : '<div class="tutoraVideo" id="tutoraVideo"></div>') : arriba ? "" : imagenDeArriba(foto && foto.nombre)}
      <div class="over">
        <p class="lead${deTutora ? "" : " sr"}"><span>${deTutora ? `Aciertos: ${k.bien || 0} de ${N.ACIERTOS_TUTORA}` : `Pregunta ${sig.orden} de ${sig.total}`}</span><span>${enHueco ? "Escribe lo que falta" : escribir ? "Dilo en español" : "Toca la respuesta"}</span></p>
        ${deTutora ? `<div class="score"><div class="track" role="img" aria-label="Llevas ${k.bien || 0} de ${N.ACIERTOS_TUTORA} aciertos"><i data-w="${100 * (k.bien || 0) / N.ACIERTOS_TUTORA}"></i></div></div>` : ""}
        ${deTutora ? "" : `<div data-explicas>${lineaDeGramatica(k, q.tema)}${panelExplica()}</div>`}
        <h1 class="cue" id="cue"${q.tipo === "escribir" ? ' lang="en"' : ""}>${hueco(q.frase)}</h1>
        ${(() => { const at = deTutora ? null : N.temasAtascados(E).get(q.tema); return at && tema ? `<p class="tjAtas">Atascado · fallado en ${at.fallos} quizzes esta semana${tema.slug && tema.leccion ? ` · <a class="lk" href="#/leccion/${esc(tema.slug)}">Ver la lección</a>` : ""}</p>` : ""; })()}
        ${q.glosa ? `<p class="sub">(${esc(q.glosa)})</p>` : ""}
        ${conPista ? `<div class="hrow"><button type="button" class="chip" id="pistaBtn">Pista</button><span class="sub" id="pista" hidden>${esc(q.pista)}</span></div>` : ""}
      </div>
    </header>
    <div class="card" id="controles">
      ${escribir ? `
      <nav class="jump dos" aria-label="Cómo contestas">
        <button type="button" id="modoEscribir">Escribir</button><button type="button" id="modoDecir">Decir en voz alta</button>
      </nav>
      <div id="zonaEscribir">
        <label class="small" for="campo">Tu respuesta</label>
        <input id="campo" class="campo" type="text" lang="es" aria-describedby="cue" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send">
        <div class="teclas" role="group" aria-label="Letras con acento">${["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"].map((c) => `<button type="button" class="tecla" data-c="${c}">${c}</button>`).join("")}</div>
        <div class="go"><button type="button" class="ub" id="noSe1">No sé</button><button type="button" class="ub grande" id="revisar">Revisar</button></div>
      </div>
      <div id="zonaDecir" hidden>
        <p>Dilo en voz alta. Luego mira la respuesta y califícate.</p>
        <div class="go"><button type="button" class="ub" id="noSe2">No sé</button><button type="button" class="ub grande" id="ver">Ver la respuesta</button></div>
      </div>` : `
      <div class="ops" role="group" aria-label="Opciones" aria-describedby="cue">${opciones.map((op) => `<button type="button" class="ub op" data-op="${esc(op)}">${esc(op)}<span class="nota"></span></button>`).join("")}</div>`}
    </div>
    <div class="card" id="veredicto" tabindex="-1" hidden>
      <p><span class="pill" id="vPill"></span></p>
      <div class="go arriba" id="vJuicio" hidden><button type="button" class="ub grande" id="jMal">Mal</button><button type="button" class="ub grande" id="jBien">Bien</button></div>
      <div class="go arriba" id="vSeguir" hidden><button type="button" class="ub grande" id="siguiente">Siguiente</button></div>
      <p class="vtuya" id="vTuya" hidden></p>
      <p class="vresp" id="vResp"></p>
      <p class="small" id="vTambien" hidden></p>
      <p id="vExp" hidden></p>
      <p class="small" id="vNota" hidden></p>
      <p class="small" id="vTema" hidden></p>
      <p class="small" id="vPct" hidden></p>
      <p class="small sosp" id="vSosp" role="status" hidden></p>
      <div class="mala" id="vMala" hidden>
        <button type="button" class="lk" id="malaBtn">Pregunta mala</button>
        <span id="malaSeguro" hidden>¿La retiro? Ya no sale y esta respuesta deja de contar. <button type="button" class="lk" id="malaSi">Sí, retírala</button> · <button type="button" class="lk" id="malaNo">No</button></span>
        <span id="malaHecho" hidden></span>
      </div>
    </div>
  </section>`),
  {
    titulo: `Pregunta ${sig.orden} de ${sig.total} · Pelagos`, nav: "gramatica",
    pie: "<p>Si aciertas, pasa sola a la siguiente." + (escribir ? "" : " Si fallas, toca la respuesta correcta para seguir.") + "</p>" +
      "<p>Lo que contestas se guarda al momento; puedes cerrar y seguir después, en este aparato o en otro.</p>",
  });
  enPregunta = true;
  enPreguntaDe = kid;
  if (deTutora) fondoDelKwiz(k);
  else esperarLoopDePregunta(kid, sig.p, q.tema, k);

  let pista = false, contestada = false, ultimoEscrito = null, modo = "escribir";
  const texto = (id, valor) => { const e = $(id); e.hidden = !valor; e.textContent = valor || ""; };

  function veredicto(d) {
    $("veredicto").hidden = false;
    const pill = $("vPill");
    pill.className = "pill " + (d.juicio ? "duda" : d.bien ? "bien" : "mal");
    pill.textContent = d.juicio ? "Tú decides" : d.bien ? (d.casi ? "Bien, pero revisa los acentos" : "Bien") : "Mal";
    const tuya = escribir ? ultimoEscrito : (d.bien ? null : d.elegido);
    texto("vTuya", tuya && !(d.bien && !d.casi) ? "Tu respuesta: " + tuya : "");
    $("vTuya").classList.toggle("mal", !d.juicio && !d.bien);
    $("vResp").textContent = "Respuesta: " + q.respuesta;
    texto("vTambien", q.tambien_vale && q.tambien_vale.length ? "También vale: " + q.tambien_vale.join(" · ") : "");
    texto("vExp", q.explicacion);
    texto("vNota", d.juicio || !d.bien ? q.nota_juicio : "");
    const vt = $("vTema");
    vt.hidden = !!d.juicio;
    vt.textContent = "";
    if (!d.juicio && tema) {
      vt.append("Tema: ");
      let enlace;
      if (tema.slug && tema.leccion) { enlace = document.createElement("a"); enlace.href = "#/leccion/" + tema.slug; }
      else { enlace = document.createElement("button"); enlace.type = "button"; enlace.className = "lk"; enlace.dataset.l = tema.id; }
      enlace.textContent = titulo(tema);
      vt.append(enlace);
    }
    texto("vPct", !d.juicio ? "Tu porcentaje en este tema: " + pct(d.antes) + " → " + pct(d.despues) : "");
    // Sospechosa: la fallaste otra vez, pero el resto del tema lo llevas bien. Quizá la mala es la pregunta.
    const sx = !d.juicio && !d.bien ? (E.sospechosas || []).find((x) => x.p === q.id) : null;
    texto("vSosp", sx ? `Esta pregunta ya te salió mal ${sx.fallas} veces, pero el resto del tema lo llevas ${sx.restoBien} de ${sx.restoDe}. Quedó en tus preguntas sospechosas (en Ajustes). Si crees que está mal, retírala aquí abajo.` : "");
    $("vJuicio").hidden = !d.juicio;
    $("vSeguir").hidden = !!d.juicio;
    $("vMala").hidden = !!d.juicio;
    $("controles").hidden = escribir || !!d.juicio;
    if (escribir) {
      // El foco va a la tarjeta, no a un botón: así un segundo Enter no te califica «Bien» sin querer,
      // y quien usa lector de pantalla oye el veredicto completo.
      $("veredicto").focus({ preventScroll: true });
      $("veredicto").scrollIntoView({ block: "nearest" });
    }
    if (d.juicio) { teclas = { b: () => juzgar(true), m: () => juzgar(false) }; return; }
    $("siguiente").textContent = d.ultima ? "Ver el resultado" : "Siguiente";
    teclas = { enter: avanzar };
  }

  // Si aciertas, pasa sola a la siguiente después de un respiro para ver «Bien». Si fallas, se queda para que leas.
  let solo = 0;
  function avanzar() {
    clearTimeout(solo);
    enPreguntaDe = null;
    if (N.siguiente(E, kid)) pintar(); else ir(QUIZ + "/" + kid + "/resultado");
  }

  function apuntarRespuesta(bien, extra = {}) {
    if (contestada) return;
    contestada = true;
    const antes = info(q.tema).pct, nivelAntes = nivelDeTema(q.tema);
    A.apuntar({
      t: "r", id: N.nuevoId("r"), kwiz: kid, p: q.id, ...(sig.p !== q.id ? { s: sig.p } : {}), tema: q.tema, cuando: new Date().toISOString(),
      bien: bien ? 1 : 0, modo: escribir ? modo : "tocar", escrito: (escribir ? ultimoEscrito : extra.elegido) || null, pista: pista ? 1 : 0,
    });
    recalcular();
    if (!deTutora) moverNivel(nivelAntes, nivelDeTema(q.tema));
    if (deTutora) {
      const kk = E.kwizzes.get(kid);
      // Con 5 buenas la ronda se cierra sola (las que sobran no cuentan) y el fondo llega al final.
      if (kk && kk.bien >= N.ACIERTOS_TUTORA && N.siguiente(E, kid)) { A.apuntar({ t: "dejar", id: N.nuevoId("d"), kwiz: kid, cuando: new Date().toISOString() }); recalcular(); }
      // La que fallas vuelve 3 preguntas después (una sola vez por pregunta).
      else if (kk && !bien && sig.p === q.id) {
        A.apuntar({ t: "otra", id: N.nuevoId("o"), kwiz: kid, slot: q.id + "~2", antes: kk.pendientes[2] || null, cuando: new Date().toISOString() });
        recalcular();
      }
      fondoDelKwiz(E.kwizzes.get(kid));
    }
    veredicto({ bien, casi: !!extra.casi, elegido: extra.elegido, antes, despues: info(q.tema).pct, ultima: !N.siguiente(E, kid) });
    if (bien && !extra.casi) {
      const aqui = window.location.hash;
      solo = setTimeout(() => { if (enPreguntaDe === kid && window.location.hash === aqui) { saltoPorOpcion = Date.now(); avanzar(); } }, PAUSA_ACIERTO);
    }
  }
  const juzgar = (bien) => apuntarRespuesta(bien);

  if (escribir) {
    const campo = $("campo");
    const ponerModo = (m) => {
      modo = m;
      guardar("pelagos.modo", m);
      $("zonaEscribir").hidden = m !== "escribir";
      $("zonaDecir").hidden = m !== "decir";
      $("modoEscribir").setAttribute("aria-current", m === "escribir" ? "page" : "false");
      $("modoDecir").setAttribute("aria-current", m === "decir" ? "page" : "false");
      if (m === "escribir") campo.focus({ preventScroll: true }); else $("ver").focus({ preventScroll: true });
    };
    $("modoEscribir").addEventListener("click", () => ponerModo("escribir"));
    $("modoDecir").addEventListener("click", () => ponerModo("decir"));
    ponerModo(guardado("pelagos.modo") === "decir" ? "decir" : "escribir");

    const revisar = () => {
      ultimoEscrito = campo.value.trim();
      if (!ultimoEscrito) { campo.focus(); return; }
      const nota = N.calificarEscrito(ultimoEscrito, q.respuesta, q.tambien_vale);
      if (nota === null) veredicto({ juicio: true });
      else apuntarRespuesta(true, { casi: nota === "casi" });
    };
    $("revisar").addEventListener("click", revisar);
    campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); revisar(); } });
    for (const t of vista.querySelectorAll(".tecla")) {
      t.addEventListener("click", () => {
        const a = campo.selectionStart, b = campo.selectionEnd;
        campo.value = campo.value.slice(0, a) + t.dataset.c + campo.value.slice(b);
        campo.focus();
        campo.setSelectionRange(a + 1, a + 1);
      });
    }
    $("ver").addEventListener("click", () => { ultimoEscrito = null; veredicto({ juicio: true }); });
    const noSe = () => { ultimoEscrito = null; apuntarRespuesta(false); };
    $("noSe1").addEventListener("click", noSe);
    $("noSe2").addEventListener("click", noSe);
    $("jBien").addEventListener("click", () => juzgar(true));
    $("jMal").addEventListener("click", () => juzgar(false));
  } else {
    // Tocas una opción y ahí mismo ves Bien o Mal. La respuesta correcta se vuelve el botón para seguir:
    // si acertaste pasa sola; si fallaste, la tocas y pasa la siguiente pregunta, sin buscar otro botón.
    let contestadaEn = 0;
    const nota = (boton, texto) => { boton.querySelector(".nota").textContent = texto; };      // el renglón ya tiene su lugar: nada se mueve
    for (const b of vista.querySelectorAll(".op")) {
      b.addEventListener("click", () => {
        if (contestada) {
          if (b.dataset.op === q.respuesta && Date.now() - contestadaEn > 600) { saltoPorOpcion = Date.now(); avanzar(); }
          return;
        }
        if (Date.now() - saltoPorOpcion < 500) return;       // el segundo toque de un doble toque no contesta la pregunta nueva
        const bien = b.dataset.op === q.respuesta;
        contestadaEn = Date.now();
        apuntarRespuesta(bien, { elegido: b.dataset.op });
        let correcta = null;
        for (const otra of vista.querySelectorAll(".op")) {
          if (otra.dataset.op === q.respuesta) {
            correcta = otra;
            otra.classList.add("es");
            nota(otra, bien ? "Bien." : "Era esta. Tócala para seguir.");
          } else {
            otra.disabled = true;
            if (otra === b) { otra.classList.add("no"); nota(otra, "Mal. Tocaste esta."); }
          }
        }
        const aviso = vista.querySelector(".lead span:last-child");
        if (aviso) { aviso.textContent = bien ? "Bien" : "Mal"; aviso.className = "fallo " + (bien ? "bien" : "mal"); }
        if (correcta) correcta.focus({ preventScroll: true });
      });
    }
  }

  if ($("pistaBtn")) $("pistaBtn").addEventListener("click", () => { pista = true; $("pista").hidden = false; $("pistaBtn").hidden = true; });

  $("siguiente").addEventListener("click", avanzar);

  // «Pregunta mala»: la retira y su respuesta deja de contar.
  $("malaBtn").addEventListener("click", () => { $("malaBtn").hidden = true; $("malaSeguro").hidden = false; $("malaSi").focus(); });
  $("malaNo").addEventListener("click", () => { $("malaBtn").hidden = false; $("malaSeguro").hidden = true; });
  $("malaSi").addEventListener("click", () => {
    A.apuntar({ t: "retirar", id: N.nuevoId("x"), p: q.id, cuando: new Date().toISOString() });
    recalcular();
    $("malaSeguro").hidden = true;
    $("malaHecho").hidden = false;
    $("malaHecho").textContent = "Retirada. El tema quedó en " + pct(info(q.tema).pct) + ".";
    $("vPct").hidden = true;
    $("siguiente").textContent = N.siguiente(E, kid) ? "Siguiente" : "Ver el resultado";
  });
}
let enPreguntaDe = null;
let saltoPorOpcion = 0;
/** Cuánto se queda a la vista el «Bien» antes de pasar sola a la siguiente pregunta. */
const PAUSA_ACIERTO = 900;

function verResultado(o, kid) {
  const k = E.kwizzes.get(kid);
  if (!k) return verNoExiste();
  if (!k.terminado) return k.pendientes.length ? ir(QUIZ + "/" + kid, true) : verNoExiste("Ese quiz se quedó sin preguntas.");
  const filas = k.preguntas.filter((p) => k.resp.has(p)).map((p) => ({ r: k.resp.get(p), q: preguntas.get(N.preguntaDe(p)) }));
  const temas = [...new Set(filas.map((f) => f.r.tema))].map((id) => porId.get(id)).filter(Boolean);
  const fallas = [...new Set(filas.filter((f) => !f.r.bien).map((f) => f.r.tema))].filter((id) => porId.has(id));
  const igual = JSON.stringify({ tipo: k.tipo, cuaderno: k.cuaderno, tema: k.tema });
  const cambios = N.cambiosDeLista(P, E, kid);
  const atr = N.temasAtascados(E);
  // Parejas de contraste con dos o más temas en este quiz: esos temas se ponen juntos, primero.
  const enQuiz = new Set(temas.map((t) => t.id));
  const parejasDelQuiz = (P.contrastes || []).filter((c) => c.temas.filter((x) => enQuiz.has(x)).length >= 2);
  const orden = [...new Set([...parejasDelQuiz.flatMap((c) => c.temas.filter((x) => enQuiz.has(x))), ...temas.map((t) => t.id)])];
  temas.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
  const nombres = (ids) => ids.map((id) => porId.get(id)).filter(Boolean).map((t) => {
    const tu = tutoraDe(t.id);
    return `<li>${esc(titulo(t))}${tu ? ` <span class="tutoraDe">· ${esc(tu.tutora.split(",")[0])}</span>` : ""}</li>`;
  }).join("");
  /** Cuánto se movió el tema en este quiz, junto a su porcentaje: «+2.6» o «−16.7». */
  const movio = (antes, despues) => {
    if (antes === null || antes === undefined || despues === null || despues === undefined) return "";
    const d = Math.round((despues - antes) * 10) / 10;
    if (!d) return ` <span class="delta">±0</span>`;
    return ` <span class="delta ${d > 0 ? "sube" : "baja"}">${d > 0 ? "+" : "−"}${Math.abs(d)}</span>`;
  };
  const renglon = (rotulo, ids, vacio) => `<h3>${rotulo}</h3>${ids.length ? `<ul class="rota">${nombres(ids)}</ul>` : `<p class="small">${vacio}</p>`}`;
  poner((k.tipo === "tutora" ? (h) => `<div class="hoy"><div class="sobre">${h}</div></div>` : conFondo)(`${k.tipo === "tutora" && ambiente() !== "limpio" ? '<div class="kwTutora"><div class="hero"><div class="tutoraVideo" id="tutoraVideo"></div></div></div>' : ""}
  <section class="card">
    <h1 class="h">${k.tipo === "tutora" ? (k.bien >= N.ACIERTOS_TUTORA ? `¡${N.ACIERTOS_TUTORA} de ${N.ACIERTOS_TUTORA}! Llegaste al final` : `${k.bien} buenas: te faltaron ${N.ACIERTOS_TUTORA - k.bien}`) : `${k.bien} de ${k.total}`}</h1>
    <p>${TIPOS_KWIZ[k.tipo] || "Quiz"} · ${cuando(k.terminado)}</p>
    ${barra(k.total ? 100 * k.bien / k.total : 0, " gorda")}
    ${k.tipo === "tutora" ? "" : `<div class="hoyGrande" data-explicas><p class="small">Te queda hoy</p>${circulosDeHoy("grande")}${panelExplica()}</div>`}
    <div class="conCuadro"><button type="button" class="ub grande" data-kwiz='${esc(igual)}'>${k.tipo === "lista" ? "Otro quiz de tu plan" : "Otro quiz igual"}</button>${conCuadro()}</div>
    <div class="go"><a class="ub" href="${(() => { const t = k.tipo === "tutora" ? porId.get(k.tema) : null; return t && t.slug && t.leccion ? "#/leccion/" + esc(t.slug) : "#" + QUIZ; })()}">Cerrar</a>${fallas.length ? `<button type="button" class="ub" id="estudiarFallas">Estudiar las fallas</button>` : ""}</div>
  </section>
  <section class="card">
    <h2>Pregunta por pregunta</h2>
    <div class="pairs">${filas.map(({ r, q }) => {
      const t = porId.get(r.tema);
      const enlace = !t ? "" : t.slug && t.leccion ? `<a href="#/leccion/${esc(t.slug)}">${esc(titulo(t))}</a>` : `<button type="button" class="lk" data-l="${t.id}">${esc(titulo(t))}</button>`;
      return `<div class="pair rq">
        <div class="row ${r.bien ? "bien" : "mal"}"><span class="tag">${r.bien ? "Bien" : "Mal"}</span><span class="fq"${q && q.tipo === "escribir" ? ' lang="en"' : ""}>${q ? hueco(q.frase) : "Esta pregunta ya no está en el contenido."}</span></div>
        ${!r.bien && r.escrito ? `<p class="why">Tu respuesta: <span class="tach">${esc(r.escrito)}</span></p>` : ""}
        ${q ? `<p class="why">Respuesta: <b>${esc(q.respuesta)}</b></p>` : ""}
        ${q && q.explicacion ? `<p class="why">${esc(q.explicacion)}</p>` : ""}
        <p class="why">${enlace}${E.retiradas.has(r.p) ? " · pregunta retirada, ya no cuenta" : ""}</p>
      </div>`;
    }).join("")}</div>
  </section>
  <section class="card">
    <h2>Cómo se movieron tus temas</h2>
    ${parejasDelQuiz.map((c) => `<p class="small pareja">Se confunden: <b>${esc(c.nombre)}</b>. Aquí salen juntos para que compares.</p>`).join("")}
    <div class="links">${temas.map((t) => {
      const c = N.cambioDeTema(E, kid, t.id), i = info(t.id);
      const abre = t.slug && t.leccion ? `<a class="tb" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tb" data-l="${t.id}">`;
      return `${abre}<span class="lv">${esc(t.nivel)}</span><span class="nm">${esc(titulo(t))}</span>
        <span class="pc${esBajo(c.despues) ? " bajo" : ""}">${pct(c.despues)}${movio(c.antes, c.despues)}</span>
        ${c.de || i.toca ? `<span class="sm">${[atr.has(t.id) ? "Atascado" : "", (() => { const pj = parejasDelQuiz.find((x) => x.temas.includes(t.id)); return pj ? "Pareja: " + esc(pj.nombre) : ""; })(), c.de ? `${c.bien} de ${c.de} bien` : "", i.toca ? `toca el ${fecha(i.toca)}` : ""].filter(Boolean).join(" · ")}</span>` : ""}
        ${barra(c.despues)}${t.slug && t.leccion ? "</a>" : "</button>"}`;
    }).join("")}</div>
  </section>
  ${cambios ? `
  <section class="card" id="rota">
    <h2>Tu plan de estudio Pelagos</h2>
    ${renglon("Salen", cambios.salen, "Ninguno salió esta vez.")}
    ${renglon("Entran", cambios.entran, cambios.salen.length ? "Ninguno nuevo." : "Ninguno: no hubo lugar.")}
    ${renglon("Se quedan", cambios.quedan, "Ninguno.")}
    <p class="small">Sale el tema que aciertas. El que fallas se queda hasta que lo aciertes dos veces seguidas.</p>
  </section>` : ""}`),
  { titulo: "Resultado del quiz · Pelagos", nav: "gramatica", conserva: o.conserva, pie: "<p>El número junto al porcentaje es cuánto se movió el tema en este quiz.</p>" });
  fondoDelKwiz(k);     // en el Kwiz con la tutora, el resultado se queda con la escena donde llegaste
  // Estudiar las fallas: vuelve a tu plan y toca solo las voces de las tutoras de los temas que fallaste (se quedan en tu plan).
  const ef = $("estudiarFallas");
  if (ef) ef.addEventListener("click", () => {
    empezarRepaso(fallas, "plan", fallas.length === 1 ? "Tu falla." : "Tus fallas.", "#" + QUIZ);
    ir(QUIZ);
  });
}

// ---------------------------------------------------------------- Ajustes

// Estado de las lecciones: cuántos temas de cada nivel tienen cada pieza. Se cuenta cada vez que abres Ajustes,
// con el contenido y la última sincronización, así que siempre está al día.
const PIEZAS = [
  ["leccion", "Lección"], ["guion", "Guion"], ["video", "Video completo"],
  ["voz", "Voz"], ["loop", "Loop HD"],
];
// Las compilaciones de Andrea sin toma limpia (todo es acto después del anuncio) no llevan loop: no cuentan en el total de esa fila.
// Las que sí tienen loop (47 desde el 17-Oct-2026) cuentan como cualquier tema.
const esCompilacion = (tu) => !!(tu && /^Andrea\b/.test(tu.tutora || ""));
const totalDe = (f, k) => (k === "loop" ? f.temas - f.compilaciones : f.temas);
function estadoPiezas() {
  const filas = new Map(Object.keys(NIVELES).map((n) => [n, { nivel: n, temas: 0, leccion: 0, guion: 0, video: 0, voz: 0, loop: 0, compilaciones: 0 }]));
  const voz = A.leccionesConPresenta(), loop = A.leccionesConLoop();
  for (const t of P.temas) {
    const f = filas.get(t.nivel);
    if (!f) continue;
    const tu = tutoraDe(t.id);
    f.temas++;
    if (t.leccion) f.leccion++;
    if (tu) f.guion++;
    if (tu && tu.archivo) f.video++;
    if (voz.has(t.id)) f.voz++;
    if (loop.has(t.id)) f.loop++;
    if (esCompilacion(tu) && !loop.has(t.id)) f.compilaciones++;
  }
  return [...filas.values()].filter((f) => f.temas);
}
function graficaPiezas() {
  const filas = estadoPiezas();
  const tot = Object.fromEntries(["temas", ...PIEZAS.map(([k]) => k)].map((k) => [k, filas.reduce((a, f) => a + f[k], 0)]));
  const nivel = (f) => `<div class="pzNivel">
    <h3><span class="lv">${f.nivel}</span> ${NIVELES[f.nivel]} <span class="small">· ${plural(f.temas, "tema", "temas")}</span></h3>
    ${PIEZAS.map(([k, nombre]) => {
      const n = totalDe(f, k), v = f[k], p = n ? Math.round((100 * v) / n) : 0;
      return `<div class="pzFila${n && v >= n ? " lleno" : v ? "" : " cero"}"><span class="pzNom">${nombre}</span>
        <span class="pzBarra" role="img" aria-label="${nombre}: ${v} de ${n}"><i data-w="${p}"></i></span>
        <span class="pzNum">${v}/${n}${n && v >= n ? " ✓" : ""}</span></div>`;
    }).join("")}
    ${f.compilaciones ? `<p class="small">${plural(f.compilaciones, "compilación de Andrea no tiene", "compilaciones de Andrea no tienen")} toma limpia para loop.</p>` : ""}
  </div>`;
  return `<p class="small">Total: ${tot.temas} temas · ${PIEZAS.map(([k, n]) => `${tot[k]} con ${n.toLowerCase().replace("hd", "HD")}`).join(" · ")}.</p>
    <div class="pzGrafica">${filas.map(nivel).join("")}</div>
    <p class="small">Se cuenta al abrir esta página, con tu contenido y la última vez que Pelagos se puso al día con GitHub.</p>`;
}

function textoSinc(s) {
  if (s.guardando || (s.pendientes && !s.error)) return "Guardando…";
  if (s.pendientes) {
    const porque = s.error.tipo === "red" ? "No hay conexión." : s.error.message;
    if (s.fragil) return `Falta subir tu avance (${s.pendientes}). ${porque} Este navegador no deja guardar copias: no cierres la página hasta que diga «Todo guardado».`;
    return `Falta subir tu avance (${s.pendientes}). ${porque} Está guardado en este aparato y sube solo.`;
  }
  if (s.leyendo) return "Poniendo al día…";
  if (s.guardado) return "Todo guardado.";
  return "";
}

// ---- Pelagos como app: su propio ícono y su propia ventana. El navegador avisa cuando se puede instalar.
let ofertaDeInstalar = null;
const yaEsApp = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
window.addEventListener("beforeinstallprompt", (ev) => {
  ev.preventDefault();
  ofertaDeInstalar = ev;
  if ($("ajInstalar")) $("ajInstalar").hidden = false;
});
window.addEventListener("appinstalled", () => { ofertaDeInstalar = null; if ($("ajInstalar")) $("ajInstalar").hidden = true; });

/** La tarjeta de Ajustes con las preguntas sospechosas: cada una con su motivo, en números. */
function tarjetaSospechosas(aviso = "") {
  const lista = (E.sospechosas || []).filter((x) => preguntas.has(x.p));
  const una = (x) => {
    const q = preguntas.get(x.p), t = porId.get(x.tema);
    const tuyas = [...new Set(x.escritos)].slice(-3);
    return `<div class="pair rq">
      <p class="fq"${q.tipo === "escribir" ? ' lang="en"' : ""}>${hueco(q.frase)}</p>
      ${tuyas.length ? `<p class="why">Contestaste: <span class="tach">${tuyas.map(esc).join(" · ")}</span></p>` : ""}
      <p class="why">Respuesta: <b>${esc(q.respuesta)}</b></p>
      <p class="why">Por qué es sospechosa: la fallaste ${x.fallas} de ${x.fallas} veces, y el resto de ${t ? esc(titulo(t)) : "su tema"} lo llevas ${x.restoBien} de ${x.restoDe} (${Math.round(100 * x.restoBien / x.restoDe)}%).</p>
      <div class="go"><button type="button" class="ub" data-sosp="retirar|${esc(x.p)}" aria-label="Retirar la pregunta ${esc(x.p)}">Retirarla</button><button type="button" class="ub" data-sosp="absolver|${esc(x.p)}" aria-label="La pregunta ${esc(x.p)} está bien: la fallé yo">Está bien, la fallé yo</button></div>
    </div>`;
  };
  return `<h2>Preguntas sospechosas${lista.length ? ` (${lista.length})` : ""}</h2>
    <p class="small" id="ajSospAviso" tabindex="-1" role="status">${esc(aviso)}</p>
    ${lista.length ? `<div class="pairs">${lista.map(una).join("")}</div>` : `<p>Ninguna por ahora.</p>`}
    <p class="small">Una pregunta queda aquí si la fallaste ${N.SOSPECHA_FALLAS} veces o más, nunca la has acertado, y el resto de su tema lo llevas en ${N.SOSPECHA_PCT}% o más (con ${N.SOSPECHA_MIN} respuestas o más). Mientras decides, sigue contando. Si me dices «revisa las sospechosas», Andrea las corrige en el contenido.</p>`;
}

function verAjustes(o) {
  const s = A.estadoSinc();
  const esIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  poner(`
  <section class="card">
    <h1 class="h">Ajustes</h1>
    <h3>Guardado</h3>
    <p id="ajSinc">${esc(textoSinc(s) || "Todo guardado.")}</p>
    <div class="go"><button type="button" class="ub" id="ajAlDia">Poner al día ahora</button><button type="button" class="ub" id="ajRecargar">Recargar Pelagos</button></div>
    <p class="small" id="ajAviso" role="status" hidden></p>
  </section>
  ${ayudaLista().length ? `<section class="card" id="ajAyuda">
    <h2>Cómo funciona</h2>
    <p class="small">El método y las reglas de Pelagos: la escalera, el plan de cinco temas, el porcentaje, las tutoras y los premios.</p>
    <div class="go"><a class="ub" href="#/ayuda">Abrir «Cómo funciona»</a></div>
  </section>` : ""}
  <section class="card" id="ajSosp">${tarjetaSospechosas()}</section>
  <section class="card" id="ajTema">
    <h2>Colores</h2>
    <nav class="jump dos" aria-label="Modo de color">
      <button type="button" data-tema-ir="claro">Claro</button><button type="button" data-tema-ir="oscuro">Oscuro</button>
    </nav>
    <p class="small">Para todas las páginas, en este aparato.</p>
  </section>
  <section class="card" id="ajAmbiente">
    <h2>Ambiente</h2>
    <nav class="jump dos" aria-label="Ambiente de las fotos">
      <button type="button" data-ambiente-ir="reef">Reef</button><button type="button" data-ambiente-ir="limpio">Limpio</button>
    </nav>
    <p class="small">Reef, con sus fotos, o Limpio, sin fotos ni sonido: sin tutoras, repasos en audio ni check-ins. Solo suena tu libro en ElevenReader. En este aparato.</p>
  </section>
  <section class="card" id="ajTutoraDia">
    <h2>Tutora del día</h2>
    <p id="ajTutoraHoy">${esc(nombreTutoraDelDia())}</p>
    <div class="go"><button type="button" class="ub" id="ajTutoraSigue">Siguiente tutora</button></div>
    <p class="small" id="ajTutoraAviso" role="status">Cambia el fondo y los premios de hoy a la que sigue en la fila.</p>
  </section>
  ${yaEsApp() ? "" : `<section class="card" id="ajApp">
    <h2>Pelagos como app</h2>
    <div class="go"><button type="button" class="ub grande" id="ajInstalar"${ofertaDeInstalar ? "" : " hidden"}>Instalar Pelagos</button></div>
    <p class="small">${esIphone ? "En Safari: Compartir, «Agregar a inicio»." : "Si no ves el botón: menú del navegador, «Instalar Pelagos»."}</p>
  </section>`}
  <section class="card" id="ajPiezas">
    <h2>Estado de las lecciones</h2>
    ${graficaPiezas()}
  </section>
  <section class="card">
    <h2>La llave</h2>
    <p class="small">Cierra Pelagos en este aparato. Tu avance sigue en tu repositorio.</p>
    <div class="go"><button type="button" class="ub" id="ajQuitar">Quitar la llave de este aparato</button></div>
    <p id="ajSeguro" hidden>${s.pendientes ? `Ojo: falta subir tu avance (${s.pendientes}). Se queda guardado aquí y sube cuando pongas la llave otra vez. ` : ""}¿La quito? <button type="button" class="lk" id="ajSi">Sí, quítala</button> · <button type="button" class="lk" id="ajNo">No</button></p>
  </section>`, { titulo: "Ajustes · Pelagos", conserva: o.conserva });
  $("ajAlDia").addEventListener("click", async () => {
    const aviso = $("ajAviso");
    aviso.hidden = false;
    aviso.textContent = "Poniendo al día…";
    const bien = await ponerAlDia(true);
    if ($("ajAviso")) { $("ajAviso").hidden = false; $("ajAviso").textContent = bien ? "Listo, al día." : "No se pudo. Revisa la conexión."; }
  });
  $("ajRecargar").addEventListener("click", () => { ir("/", true); window.location.reload(); });
  // Sospechosas: «Retirarla» o «Está bien, la fallé yo». La tarjeta se vuelve a pintar y el foco se queda en ella.
  $("ajSosp").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-sosp]");
    if (!b) return;
    const [que, id] = b.dataset.sosp.split("|");
    A.apuntar(que === "retirar"
      ? { t: "retirar", id: N.nuevoId("x"), p: id, cuando: new Date().toISOString() }
      : { t: "absolver", id: N.nuevoId("a"), p: id, cuando: new Date().toISOString() });
    recalcular();
    $("ajSosp").innerHTML = tarjetaSospechosas(que === "retirar" ? `Retirada: ${id}. Ya no sale y sus respuestas dejan de contar.` : `Listo: ${id} ya no es sospechosa. Vuelve a marcarse solo si la fallas ${N.SOSPECHA_FALLAS} veces más.`);
    $("ajSospAviso").focus();
  });
  // Claro u oscuro: cambia todas las páginas de una vez. Solo cambian los colores.
  const marcarTema = () => { for (const b of vista.querySelectorAll("[data-tema-ir]")) b.setAttribute("aria-current", b.dataset.temaIr === document.documentElement.dataset.tema ? "page" : "false"); };
  for (const b of vista.querySelectorAll("[data-tema-ir]")) {
    b.addEventListener("click", () => { document.documentElement.dataset.tema = b.dataset.temaIr; guardar("pelagos.tema", b.dataset.temaIr); marcarTema(); });
  }
  marcarTema();
  // Reef o Expanse: solo cambian las fotos.
  const marcarAmbiente = () => { for (const b of vista.querySelectorAll("[data-ambiente-ir]")) b.setAttribute("aria-current", b.dataset.ambienteIr === ambiente() ? "page" : "false"); };
  for (const b of vista.querySelectorAll("[data-ambiente-ir]")) {
    b.addEventListener("click", () => {
      guardar("pelagos.ambiente", b.dataset.ambienteIr);
      if (b.dataset.ambienteIr === "limpio") { document.documentElement.dataset.ambiente = "limpio"; callarTodo(); } else delete document.documentElement.dataset.ambiente;
      marcarAmbiente();
    });
  }
  marcarAmbiente();
  // La tutora del día: «Siguiente» la cambia por la que sigue en la fila, hoy y en todos tus aparatos.
  $("ajTutoraSigue").addEventListener("click", () => {
    if (!tutoraDelDiaId()) { $("ajTutoraAviso").textContent = "Todavía no hay tutoras listas para el fondo."; return; }
    A.apuntar({ t: "saltotutora", id: N.nuevoId("st"), dia: N.fechaLocal(new Date()), cuando: new Date().toISOString() });
    $("ajTutoraHoy").textContent = nombreTutoraDelDia();
    $("ajTutoraAviso").textContent = "Listo. Ve al Tablero para verla.";
  });
  if ($("ajInstalar")) $("ajInstalar").addEventListener("click", async () => {
    if (!ofertaDeInstalar) return;
    const oferta = ofertaDeInstalar;
    ofertaDeInstalar = null;
    $("ajInstalar").hidden = true;
    try { await oferta.prompt(); } catch { /* el navegador ya no la ofrece: queda el menú */ }
  });
  $("ajQuitar").addEventListener("click", () => { $("ajSeguro").hidden = false; $("ajNo").focus(); });
  $("ajNo").addEventListener("click", () => { $("ajSeguro").hidden = true; });
  $("ajSi").addEventListener("click", async () => {
    await A.salir();
    P = null; E = null;
    ir("/", true);
    pintar();
  });
}

// ---------------------------------------------------------------- Cómo funciona (la ayuda, 16-Oct-2026)
//
// Las páginas viven en el contenido (contenido/ayuda.json), no aquí: la página pública no dice nada del método.
// Sus números van entre llaves y se toman del motor al pintar, así que nunca se quedan viejos.

/** Qué página de ayuda abre el «?» de arriba, según dónde estás. */
const AYUDA_DE = [
  [/^\/gramatica\/quiz/, "quiz"],
  [/^\/kwiz/, "quiz"],
  [/^\/gramatica\/atlas$/, "porcentaje"],
  [/^\/gramatica\/[a-z0-9]+\/atascados$/, "atascadas"],
  [/^\/gramatica(\/[a-z0-9]+)?(\/bajo)?$/, "porcentaje"],
  [/^\/(leccion|tutoras)(\/|$)/, "tutoras"],
  [/^\/vocabulario/, "tarjetas"],
  [/^\/(clases|bitacora|lectura)?$/, "tablero"],
];

function ayudaLista() { return (P && P.ayuda && P.ayuda.paginas) || []; }
function ayudaPagina(slug) { return ayudaLista().find((p) => p.slug === slug) || null; }

/** «Cómo funciona», abajo de Ajustes (17-Oct-2026; antes era un «?» arriba): lleva a la página que explica donde estás (o al índice). */
function ponerSignoAyuda() {
  const q = $("ayudaLink");
  if (!q) return;
  const camino = window.location.hash.replace(/^#/, "") || "/";
  q.hidden = !ayudaLista().length || !A.hayLlave() || !P;
  q.removeAttribute("aria-current");
  if (camino.startsWith("/ayuda")) { q.href = "#/ayuda"; q.setAttribute("aria-current", "page"); q.textContent = "Cómo funciona"; return; }
  const fila = AYUDA_DE.find(([re]) => re.test(camino));
  const pag = fila && ayudaPagina(fila[1]);
  q.href = pag ? "#/ayuda/" + pag.slug : "#/ayuda";
  q.textContent = "Cómo funciona";
  q.setAttribute("aria-label", pag ? "Cómo funciona: " + pag.titulo : "Cómo funciona");
}

/** Los números del motor que la ayuda nombra entre llaves. */
function numerosAyuda() {
  const dias = (d) => (d === 1 ? "1 día" : d + " días");
  const e = N.ESCALONES;
  const n = {
    ESCALONES: e.slice(0, -1).join(", ") + " y " + e[e.length - 1] + " días", N_ESCALONES: e.length,
    NUEVAS_AL_DIA: N.NUEVAS_AL_DIA, KWIZZES_AL_DIA: N.KWIZZES_AL_DIA, LISTA: N.LISTA, NUEVOS_TEMAS_AL_DIA: N.NUEVOS_TEMAS_AL_DIA, ACIERTOS_PARA_SALIR: N.ACIERTOS_PARA_SALIR,
    META: meta(), DECAIMIENTO: E ? E.parametros.decaimiento : N.DECAIMIENTO, PESO_ARRANQUE: E ? E.parametros.pesoArranque : N.PESO_ARRANQUE,
    TOTAL_TEMA: N.TOTAL_TEMA, TOTAL_TUTORA: N.TOTAL_TUTORA, ACIERTOS_TUTORA: N.ACIERTOS_TUTORA,
    SOSPECHA_FALLAS: N.SOSPECHA_FALLAS, SOSPECHA_PCT: N.SOSPECHA_PCT, SOSPECHA_MIN: N.SOSPECHA_MIN,
    ATASCADO_FALLOS: N.ATASCADO_FALLOS, ATASCADO_DIAS: N.ATASCADO_DIAS,
  };
  e.forEach((d, i) => { n["E" + i] = dias(d); });
  return n;
}
const conNumeros = (texto, n = numerosAyuda()) => String(texto ?? "").replace(/\{([A-Z0-9_]+)\}/g, (todo, k) => (k in n ? String(n[k]) : todo));

/** Texto de la ayuda -> HTML: los números del motor, **negrita** y los enlaces [[ayuda:slug|…]] y [[g:clave|…]]. */
function marcaAyuda(texto, n) {
  let s = esc(conNumeros(texto, n));
  s = s.replace(/\[\[ayuda:([a-z0-9-]+)\|([^\]]+)\]\]/g, (_, slug, dentro) => `<a href="#/ayuda/${slug}">${dentro}</a>`);
  s = s.replace(/\[\[g:([a-z0-9-]+)\|([^\]]+)\]\]/g, (_, clave, dentro) => `<button type="button" class="lk" data-glosa="${clave}">${dentro}</button>`);
  s = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  return s;
}
function verAyuda(o) {
  const lista = ayudaLista();
  if (!lista.length) return verNoExiste("Todavía no hay páginas de ayuda en tu contenido.");
  poner(`
  <section class="card">
    <h1 class="h">Cómo funciona</h1>
    <p>El método y las reglas de Pelagos, una página por tema.</p>
    <ul class="ayudaIdx">${lista.map((p) => `<li><a href="#/ayuda/${p.slug}"><b>${esc(p.titulo)}</b><span>${esc(p.resumen)}</span></a></li>`).join("")}</ul>
  </section>`, { titulo: "Cómo funciona · Pelagos", nav: "ayuda", conserva: o.conserva });
}

function verPaginaAyuda(o, slug) {
  const p = ayudaPagina(slug);
  if (!p) return verNoExiste("Esa página de ayuda no existe.");
  const n = numerosAyuda(), G = (P.ayuda && P.ayuda.glosario) || {};
  const lista = ayudaLista(), i = lista.indexOf(p), sigue = lista[i + 1];
  const secciones = p.secciones.map((s) => `
    <section class="card ayudaPag">
      ${s.h ? `<h2>${esc(conNumeros(s.h, n))}</h2>` : ""}
      ${(s.p || []).map((x) => `<p${/^P = /.test(x) ? ' class="formula"' : ""}>${marcaAyuda(x, n)}</p>`).join("")}
      ${s.lista ? `<ul>${s.lista.map((x) => `<li>${marcaAyuda(x, n)}</li>`).join("")}</ul>` : ""}
    </section>`).join("");
  const terminos = Object.entries(G).sort((a, b) => a[1].termino.localeCompare(b[1].termino, "es"));
  const glosa = p.glosario ? `<section class="card ayudaPag"><dl class="glosa">${terminos.map(([k, g]) => `<dt id="g-${k}">${esc(g.termino)}</dt><dd>${marcaAyuda(g.def, n)}</dd>`).join("")}</dl></section>` : "";
  poner(`
  <section class="card">
    <p class="small"><a href="#/ayuda">Cómo funciona</a></p>
    <h1 class="h">${esc(p.titulo)}</h1>
    ${p.resumen ? `<p>${esc(p.resumen)}</p>` : ""}
  </section>
  ${secciones}${glosa}
  <section class="card">
    <p>${sigue ? `Sigue: <a href="#/ayuda/${sigue.slug}">${esc(sigue.titulo)}</a> · ` : ""}<a href="#/ayuda">Todas las páginas</a></p>
  </section>`, { titulo: p.titulo + " · Pelagos", nav: "ayuda", conserva: o.conserva });
}

/** La definición de una palabra del glosario, en la hoja de abajo, sin salir de la página. */
function abrirGlosa(clave) {
  const g = P && P.ayuda && P.ayuda.glosario && P.ayuda.glosario[clave];
  if (!g) return;
  const n = numerosAyuda();
  hojaV.querySelectorAll(".hvFondo").forEach((x) => x.remove());
  hojaV.classList.remove("conFoto");
  $("hvIn").innerHTML = `
    <span class="k">Glosario</span>
    <h2 id="hvT" tabindex="-1">${esc(g.termino)}</h2>
    <p class="r">${marcaAyuda(g.def, n)}</p>
    <div class="acts">
      <a class="ub" href="#/ayuda/glosario" data-cerrar>Ver el glosario</a>
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>`;
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}

// ---------------------------------------------------------------- Vista previa de un tema enlazado

const hoja = $("sheet");
function abrirHoja(id) {
  const t = porId.get(Number(id));
  if (!t || !E) return;
  const i = info(t.id);
  $("shK").textContent = "Vista previa · " + t.nivel + " · " + (CATEGORIAS[t.categoria] || t.categoria);
  $("shT").textContent = titulo(t);
  $("shR").textContent = t.regla || "Este tema todavía no tiene lección ni resumen propio.";
  $("shP").textContent = "Tu porcentaje: " + pct(i.pct) + (i.n === 0 ? "" : " · " + plural(i.n, "respuesta", "respuestas"));
  $("shB").style.width = ancho(i.pct) + "%";
  $("shB").parentElement.className = "bar" + tono(i.pct);
  const serieT = N.historiaTemas(P, A.sucesos(), [t.id], N.fechaLocal(new Date()));
  $("shG").innerHTML = htmlGrafica(serieT, "gT", titulo(t));
  activarGrafica(serieT, "gT");
  const conLeccion = !!(t.slug && t.leccion);
  $("shL").hidden = !conLeccion;
  if (conLeccion) $("shL").href = "#/leccion/" + t.slug;
  $("shKw").hidden = !t.slug_kwiziq;
  if (t.slug_kwiziq) $("shKw").href = KWIZIQ + t.slug_kwiziq;
  if (hoja.showModal) hoja.showModal(); else hoja.setAttribute("open", "");
}
function cerrarHoja() {
  for (const h of [hoja, hojaV]) {
    if (!h.hasAttribute("open")) continue;
    if (h.close) h.close(); else h.removeAttribute("open");
  }
}

// ---------------------------------------------------------------- Toques y teclas de toda la página

document.addEventListener("click", (ev) => {
  const objetivo = ev.target instanceof Element ? ev.target : null;
  if (!objetivo) return;
  if (objetivo === hoja || objetivo === hojaV || objetivo.closest("#shX") || objetivo.closest("#shL") || objetivo.closest("[data-cerrar]")) { cerrarHoja(); return; }
  const glosa = objetivo.closest("[data-glosa]");
  if (glosa) { abrirGlosa(glosa.dataset.glosa); return; }
  const palabra = objetivo.closest("[data-v]");
  if (palabra && P && E) { abrirPalabra(palabra.dataset.v); return; }
  if (toque && !hoja.hasAttribute("open") && !objetivo.closest("a, button, summary, input, label, dialog")) { toque(); return; }
  const prem = objetivo.closest("[data-premio]");
  if (prem) {
    ev.preventDefault();
    premioFondo = premioFondo === prem.dataset.premio ? null : prem.dataset.premio;
    pintar({ conserva: true });
    const otra = vista.querySelector(`[data-premio="${prem.dataset.premio}"]`);
    if (otra) otra.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: sinMovimiento() ? "auto" : "smooth" });
    return;
  }
  const graf = objetivo.closest("[data-grafnivel]");
  if (graf && P && E) { abrirGrafica(graf.dataset.grafnivel); return; }
  const grafT = objetivo.closest("[data-graftema]");
  if (grafT && P && E) { abrirGraficaTema(grafT.dataset.graftema); return; }
  const previa = objetivo.closest("[data-l]");
  if (previa) { abrirHoja(previa.dataset.l); return; }
  const kwiz = objetivo.closest("[data-kwiz]");
  if (kwiz && P && E) { try { empezarKwiz(JSON.parse(kwiz.dataset.kwiz)); } catch { verNoExiste("No se pudo armar ese quiz."); } return; }
  const salto = objetivo.closest("[data-ir]");
  if (salto) { const e = document.getElementById(salto.dataset.ir); if (e) e.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (objetivo.closest("#ruleOff")) { $("rule").hidden = true; $("ruleOn").hidden = false; $("ruleOn").focus(); return; }
  if (objetivo.closest("#ruleOn")) { $("rule").hidden = false; $("ruleOn").hidden = true; $("ruleOff").focus(); }
});

// Los premios son dibujitos que se pueden tocar: con el teclado, Enter o espacio.
document.addEventListener("keydown", (ev) => {
  if ((ev.key === "Enter" || ev.key === " ") && ev.target instanceof Element && ev.target.matches("[data-premio]")) { ev.preventDefault(); ev.target.click(); }
});
document.addEventListener("keydown", (ev) => {
  if (!teclas || ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
  const tecla = ev.key.toLowerCase();
  if (tecla === "enter" && ev.target instanceof Element && ev.target.closest("button, a, summary")) return;    // ese Enter ya es del botón
  if (teclas[tecla]) { ev.preventDefault(); teclas[tecla](); }
});

/** La lección que sigue en la misma serie (categoría) y nivel, por su orden; null si es la última. */
function siguienteEnSerie(tema) {
  const misma = P.temas.filter((t) => t.slug && t.leccion && t.nivel === tema.nivel && t.categoria === tema.categoria)
    .sort((a, b) => a.orden - b.orden || a.id - b.id);
  const i = misma.indexOf(tema);
  return i >= 0 && i < misma.length - 1 ? misma[i + 1] : null;
}

// Deslizar en una lección (con el dedo): a la derecha, la siguiente lección de la serie; a la izquierda, atrás.
// No cuenta si empieza pegado a la orilla (ahí vive el gesto de atrás del teléfono) ni sobre algo que se arrastra.
(() => {
  let x0 = null, y0 = null;
  document.addEventListener("pointerdown", (ev) => {
    x0 = null;
    if (ev.pointerType === "mouse" || !leccionPintada || !window.location.hash.startsWith("#/leccion/")) return;
    if (ev.clientX < 28 || ev.clientX > window.innerWidth - 28) return;
    const t = ev.target instanceof Element ? ev.target : null;
    if (t && t.closest("input, textarea, select, svg, canvas, .track, [data-noswipe]")) return;
    for (let e = t; e && e !== document.body; e = e.parentElement) if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== "visible") return;   // una tabla que se corre de lado
    x0 = ev.clientX; y0 = ev.clientY;
  }, { passive: true });
  document.addEventListener("pointercancel", () => { x0 = null; });
  document.addEventListener("pointerup", (ev) => {
    if (x0 === null) return;
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5 || !leccionPintada) return;
    if (dx < 0) { history.back(); return; }
    const sig = siguienteEnSerie(leccionPintada.tema);
    if (sig) ir("/leccion/" + sig.slug);
  });
})();

// Deslizar a la derecha (de izquierda a derecha) en cualquier página regresa al Tablero (su pedido del 22-Oct-2026).
// No en el Tablero, ni en las lecciones (ahí el deslizar ya cambia de lección), ni sobre el calendario de Clases.
(() => {
  let x0 = null, y0 = null;
  document.addEventListener("pointerdown", (ev) => {
    x0 = null;
    const h = window.location.hash;
    if (ev.pointerType === "mouse" || /^#?\/?$/.test(h) || h.startsWith("#/leccion/")) return;
    if (ev.clientX < 28) return;      // la orilla es del gesto de atrás del teléfono
    const t = ev.target instanceof Element ? ev.target : null;
    if (t && t.closest("input, textarea, select, svg, canvas, .track, #clCal, [data-noswipe]")) return;
    for (let e = t; e && e !== document.body; e = e.parentElement) if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== "visible") return;
    x0 = ev.clientX; y0 = ev.clientY;
  }, { passive: true });
  document.addEventListener("pointercancel", () => { x0 = null; });
  document.addEventListener("pointerup", (ev) => {
    if (x0 === null) return;
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    x0 = null;
    if (dx > 90 && dx > Math.abs(dy) * 1.8) ir("/");
  });
})();

window.addEventListener("hashchange", () => { callar(); cerrarVideos(); cerrarHoja(); enPreguntaDe = null; enTarjetaDe = null; pintar(); });

// ---------------------------------------------------------------- Guardado: el renglón de abajo

let cambiosVistos = 0;
A.alCambiar((s) => {
  if (s.cambios !== cambiosVistos) {        // otra pestaña de este navegador guardó algo
    cambiosVistos = s.cambios;
    if (P) { recalcular(); if (!enPregunta) pintar({ conserva: true }); }
  }
  const e = $("sinc");
  const t = A.hayLlave() ? textoSinc(s) : "";
  e.hidden = !t;
  e.textContent = t;
  e.classList.toggle("err", !!(s.pendientes && s.error));
  if ($("ajSinc")) $("ajSinc").textContent = t || "Todo guardado.";
  if (s.error && s.error.tipo === "llave" && A.hayLlave()) {
    A.salir().then(() => { P = null; E = null; verLlave("Tu llave ya no sirve: se venció o la borraste en GitHub. Pon una nueva. Tu avance sin subir sigue guardado aquí."); });
  }
});

// ---------------------------------------------------------------- Arranque y puesta al día

let ultimaPuesta = 0;
async function ponerAlDia(repinta) {
  try {
    const antes = P ? P.huella + "|" + A.sucesos().length + "|" + A.huellaTablero() : "";
    const paquete = await A.sincronizar();
    ultimaPuesta = Date.now();
    ponerPaquete(paquete);
    recalcular();
    const cambio = antes !== P.huella + "|" + A.sucesos().length + "|" + A.huellaTablero();
    if (repinta && (cambio || !antes)) pintar({ conserva: !!antes });
    A.subir();
    return true;
  } catch (e) {
    if (e instanceof A.Fallo && (e.tipo === "llave" || e.tipo === "falta")) {
      await A.salir();
      P = null; E = null;
      verLlave(e.tipo === "llave" ? "Tu llave ya no sirve: se venció o la borraste en GitHub. Pon una nueva." : e.message);
    } else if (!P) {
      poner(`<section class="card"><h1 class="h">No se pudo abrir</h1><p>${esc(e instanceof A.Fallo ? e.message : "Algo falló.")}</p>
        <div class="go"><button type="button" class="ub grande" id="otraVez">Intentar otra vez</button></div></section>`);
      $("otraVez").addEventListener("click", () => { pintar(); ponerAlDia(true); });
    }
    return false;
  }
}

async function arrancar() {
  if (!A.hayLlave()) { pintar(); return; }
  const local = await A.cargarLocal();
  if (local) { ponerPaquete(local); recalcular(); }
  pintar();
  await ponerAlDia(true);
}

document.addEventListener("visibilitychange", () => {
  // Si sales de Pelagos (otra app, otra pestaña, pantalla apagada), los videos se callan solos. El repaso en audio sigue.
  if (document.visibilityState === "hidden") {
    callar();
    const h = $("escenaHoja"); if (h && h.open) { const v = h.querySelector("video"); if (v) v.pause(); }
    const w = $("escenaWeb"); if (w && w.open) { const f = w.querySelector("iframe"); if (f) f.removeAttribute("src"); w.close(); }
    for (const v of document.querySelectorAll("video")) v.pause();
  } else {
    // Al volver: los fondos en bucle (sin sonido) siguen solos; la escena completa se queda en pausa hasta que la toques.
    for (const v of document.querySelectorAll("video[autoplay], #fondoTutora:not([hidden]) video:not([hidden])")) v.play().catch(() => {});
  }
  // Al volver a la página después de un rato, trae lo que hiciste en otro aparato.
  if (document.visibilityState === "visible" && A.hayLlave() && P && Date.now() - ultimaPuesta > 5 * 60 * 1000) ponerAlDia(true);
});
if (window.top !== window.self) {
  // Dentro de un marco ajeno no se pide la llave ni se muestra nada: se ofrece abrirla sola.
  vista.innerHTML = '<section class="card"><h1 class="h">Pelagos</h1><p>Ábrela en su propia pestaña.</p><div class="go"><a class="ub grande" id="sola" target="_top" rel="noopener">Abrir Pelagos</a></div></section>';
  $("sola").href = window.location.href;
} else {
  arrancar();
}
