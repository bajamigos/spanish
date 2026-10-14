// Las páginas de Pelagos. Todo se arma en el navegador: no hay servidor propio.
import * as N from "./nucleo.js?v=91e21214e9";
import * as A from "./almacen.js?v=91e21214e9";
import { abrirRecorrido } from "./recorrido.js?v=91e21214e9";
import * as V from "./videos.js?v=91e21214e9";
import * as NB from "./nube.js?v=91e21214e9";
import * as CL from "./clases.js?v=91e21214e9";

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
const TIPOS_KWIZ = { lista: "Pelagos Quiz", general: "Quiz general", cuaderno: "Quiz del cuaderno", tema: "Quiz de un tema" };
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
let videosFondo = null;
let fotosGan = new Map();     // panorama del Recorrido de Ganímedes (modo Expanse)
let fotosTour = new Map();    // panorama del Recorrido por nombre
let recorridoVivo = null;     // el visor 360 abierto, si lo hay
// El Recorrido está escondido por ahora (lo pidió el 13-Oct-2026): sin pestaña, sin lucecitas de misión, y #/recorrido lleva al Tablero.
// El código sigue aquí; para que vuelva, pon true y regresa su botón a index.html.
const CON_RECORRIDO = false;
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
  fotosTour = new Map((P.fotosTour || []).map((f) => [f.nombre, f]));
  fotosGan = new Map((P.fotosGanimedes || []).map((f) => [f.nombre, f]));
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
const plano = (texto) => String(texto ?? "").replace(/==(.+?)==/g, "$1");

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
  const [nombre, lista] = SECCIONES[seccion];
  return `<nav class="jump ${lista.length === 3 ? "tres" : "dos"} sec" aria-label="${nombre}">${lista.map(([clave, href, texto]) =>
    `<a href="${href}"${clave === actual ? ' aria-current="page"' : ""}>${texto}</a>`).join("")}</nav>`;
}

/** Un tema como botón de dos líneas. Con lección, lleva a ella; sin lección, sube la vista previa. */
function botonTema(t, { nivel = true, sub = "", anchoNombre = false, ingles = false } = {}) {
  const i = info(t.id);
  const abre = t.slug && t.leccion ? `<a class="tb" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tb" data-l="${t.id}">`;
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
  if (!tu || !tieneVoz(t)) return html;
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
  if (recorridoVivo) { recorridoVivo.cerrar(); recorridoVivo = null; }       // otra página: el visor 360 se cierra
  const arriba = window.scrollY;
  const conFoco = conserva && document.activeElement && vista.contains(document.activeElement) ? document.activeElement.id : "";
  turnoDePintar++;
  armando = false;
  delete vista.dataset.leccion;
  enPregunta = false;
  teclas = null;
  toque = null;
  vista.innerHTML = html;
  $("pie").innerHTML = pie;
  document.title = t;
  $("nav").hidden = !A.hayLlave() || !P;
  $("ajustesLink").hidden = !A.hayLlave() || !P;
  for (const a of document.querySelectorAll("[data-nav]")) {
    if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
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
  [/^\/gramatica\/nodos$/, () => ir("/gramatica/atlas", true)],     // los Nodos ahora se llaman Atlas
  [/^\/gramatica\/([a-z0-9]+)(\/bajo|\/mision)?$/, verNivel],
  [/^\/bitacora$/, verCalor],
  [/^\/clases$/, verClases],
  [/^\/lectura$/, (o) => verLectura(o)],
  [/^\/lectura\/ejemplo$/, (o) => verLectura(o, true)],
  [/^\/leccion\/([a-z0-9-]+)$/, verLeccion],
  [/^\/tutoras$/, verTutoras],
  [/^\/tutoras\/(\d+)$/, verTutora],
  [/^\/vocabulario$/, verTarjetas],
  [/^\/vocabulario\/acervo$/, verLista],
  [/^\/vocabulario\/agregar$/, verAgregar],
  [/^\/ajustes$/, verAjustes],
  [/^\/recorrido(?:\/([a-z0-9-]+))?$/, (o, id) => (CON_RECORRIDO ? verRecorrido(o, id) : ir("/", true))],
  // Las direcciones de antes siguen llevando a su página.
  [/^\/kwiz((?:\/[A-Za-z0-9_-]+){0,2})$/, (o, resto) => ir(QUIZ + (resto || ""), true)],
  [/^\/tarjetas$/, () => ir("/vocabulario", true)],
  [/^\/(mapa|red)$/, () => ir("/gramatica/atlas", true)],          // el Atlas vive en Gramática
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

// ---------------------------------------------------------------- El Recorrido (Tour of Cyberpunk TJ)

const CLAVE_RECORRIDO = "pelagos.recorrido";       // el último lugar donde estuviste, en este aparato

/** Las palabras de tu vocabulario, las que más fallas primero (o las más nuevas), para los carteles de las escenas. */
function palabrasParaTour(n, orden) {
  const vivas = palabras().filter((x) => !x.s.quitada);
  if (orden === "nuevas") vivas.sort(ORDENAR.nueva);
  else vivas.sort(ORDENAR.fallo);
  return vivas.slice(0, n);
}

/** La hoja de misión de un lugar: lo que Andrea te pone a hacer, sacado de tus datos de verdad. */
function hojaMision(lugar) {
  const acciones = lugar.acciones || [];
  if (!acciones.length) return "";
  const partes = acciones.map((a) => {
    const id = `data-accion="${esc(a.id)}"`;
    if (a.tipo === "quiz") {
      return `<section class="rec-sec" ${id}><h3>${esc(a.texto)}</h3><div class="go"><button type="button" class="ub grande" data-kwiz='{"tipo":"lista"}'>Pelagos Quiz</button></div></section>`;
    }
    if (a.tipo === "enlace") {
      return `<section class="rec-sec" ${id}><h3>${esc(a.texto)}</h3><div class="go"><a class="ub grande" href="${esc(a.href)}">Abrir</a></div></section>`;
    }
    if (a.tipo === "temas") {
      let patron;
      try { patron = new RegExp(a.buscar, "i"); } catch { return ""; }
      const temas = P.temas.filter((t) => patron.test(t.titulo_kwiziq || "") || patron.test(t.titulo || ""))
        .sort((x, y) => (info(x.id).pct ?? 50) - (info(y.id).pct ?? 50) || x.id - y.id)
        .slice(0, a.n || 6);
      if (!temas.length) return "";
      return `<section class="rec-sec" ${id}><h3>${esc(a.texto)}</h3>
        <p class="small">Tus temas de esto, del que menos dominas al que más.</p>
        <div class="links">${temas.map((t) => botonTema(t)).join("")}</div>
        <div class="go"><button type="button" class="ub grande" data-kwiz='${esc(JSON.stringify({ tipo: "tema", tema: temas[0].id }))}'>Quiz del primero</button></div></section>`;
    }
    if (a.tipo === "palabras") {
      const lista = palabrasParaTour(a.n || 6, a.orden);
      if (!lista.length) return "";
      return `<section class="rec-sec" ${id}><h3>${esc(a.texto)}</h3>
        <p class="small">${a.orden === "nuevas" ? "Las que agregaste más recién." : "Las que más fallas."} Toca una para ver su ficha.</p>
        <div class="links">${lista.map((x) => `<button type="button" class="tb" data-v="${esc(x.id)}"><span class="nm">${esc(x.c.reverso)}</span><span class="pc${esBajo(x.pct) ? " bajo" : ""}">${pct(x.pct)}</span>${barra(x.pct)}</button>`).join("")}</div>
        <div class="go"><a class="ub grande" href="#/vocabulario">Quiz de vocabulario</a></div></section>`;
    }
    return "";
  }).filter(Boolean);
  return `<h2>${esc(lugar.titulo)}</h2>${lugar.andrea ? `<p class="rec-voz"><b>Andrea:</b> «${esc(lugar.andrea)}»</p>` : ""}${partes.join("")}`;
}

function verRecorrido(o, id) {
  // Modo Expanse → Ganímedes; modo Reef → Tijuana cyberpunk. Si no hay Ganímedes en el contenido, se queda en Tijuana.
  const gan = ambiente() === "expanse" && P.tourGanimedes && P.tourGanimedes.lugares && P.tourGanimedes.lugares.length;
  const TOUR = gan ? P.tourGanimedes : P.tour, FOTOS = gan ? fotosGan : fotosTour, CARPETA = gan ? "ganimedes" : "tour";
  const CLAVE = gan ? CLAVE_RECORRIDO + ".gan" : CLAVE_RECORRIDO;
  if (!TOUR || !TOUR.lugares || !TOUR.lugares.length) { verNoExiste("El recorrido todavía no está en tu contenido."); return; }
  if (o.conserva && recorridoVivo) { enPregunta = true; return; }        // un aviso de guardado no reinicia el visor
  const lugares = TOUR.lugares;
  const nivel = new Map(resumenNiveles().map((n) => [n.nivel, n.promedio]));
  const tinte = (l) => (l.nivel && nivel.has(l.nivel) ? N.franja(nivel.get(l.nivel)) : null);
  const ultimo = guardado(CLAVE);
  const desde = id && lugares.some((l) => l.id === id) ? id : lugares.some((l) => l.id === ultimo) ? ultimo : TOUR.inicio;
  poner('<div id="recRaiz"></div>', { titulo: "Recorrido · Pelagos", nav: "recorrido" });
  enPregunta = true;
  recorridoVivo = abrirRecorrido($("recRaiz"), {
    tour: TOUR,
    desde,
    bajarFoto: (nombre) => A.foto(FOTOS.get(nombre), CARPETA),
    hojaMision,
    tinte,
    misiones: { lista: P.misiones || [], estado: estadoMisiones, hecha: (mision, lugar, aciertos) => apuntarMision(mision, "hecha", { lugar, aciertos }) },
    escenas: { listar: (sala) => A.escenasDe(sala), subir: (sala, f, d) => A.escenaSubir(sala, f, d), quitar: (sala, a) => A.escenaQuitar(sala, a), ordenar: (sala, l) => A.escenaOrdenar(sala, l), url: (sala, x) => A.escenaUrl(sala, x), gif: (sala, x) => A.escenaGif(sala, x) },
    esDeNoche: () => { const h = new Date().getHours(); return h >= 19 || h < 6; },
    escenaVista: (id) => (guardado("pelagos.escenas") || "").split(",").includes(id),
    escenaMarcar: (id) => { const v = (guardado("pelagos.escenas") || "").split(",").filter(Boolean); if (!v.includes(id)) guardar("pelagos.escenas", [...v, id].join(",")); },
    alMover: (l) => {
      guardar(CLAVE, l.id);
      try { window.history.replaceState(null, "", "#/recorrido/" + l.id); } catch { /* sin historia: no pasa nada */ }
    },
  });
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
    ${corto || !conLecciones ? "" : `<span class="sm listos">Listos: ${n.lecciones} con lección · ${n.tutoras} con tutora · ${n.videos} con video completo · ${n.loops} con loop · ${n.preguntas} con preguntas</span>`}
    ${barra(n.promedio)}</a>`;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ICONO_SI = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.4 3.4L17 9" class="tic" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_NO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/></svg>';

/** «viernes 9 de octubre», del día de este aparato. */
function diaLargo(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]}`;
}
/** Una hora -> «1:27 pm», en la hora de este aparato. */
function horaCorta(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
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
/** Un dibujito de premio. Ganado y con GIF: se puede tocar para poner su GIF de fondo (y otra vez para quitarlo). */
function selloHtml(x, grande = false) {
  const ic = iconoDe(x), k = PREMIO_DE[ic];
  const gif = x.va && k ? ultimaEscena(salaPremio(k)) : null;
  const clase = `sello${grande ? " grande" : ""} ${esc(ic)} ${x.va ? "ok" : "no"}`;
  if (!gif) return `<span class="${clase}">${SELLOS[ic]}</span><span class="sr">${esc(x.nombre)}: ${x.va ? "ganado" : "falta"}. </span>`;
  const on = premioFondo === k;
  return `<span class="${clase} toca${on ? " activo" : ""}" role="button" tabindex="0" data-premio="${k}" aria-pressed="${on}" aria-label="${esc(x.nombre)}: ganado. ${on ? "Quitar su GIF del fondo" : "Poner su GIF de fondo"}">${SELLOS[ic]}</span>`;
}
const SELLOS = {
  puno: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect class="s1" x="10" y="22.5" width="12" height="7" rx="1.6"/><rect class="s1" x="6.5" y="5.4" width="4.7" height="11" rx="2.35"/><rect class="s1" x="11.3" y="4" width="4.7" height="12" rx="2.35"/><rect class="s1" x="16.1" y="4" width="4.7" height="12" rx="2.35"/><rect class="s1" x="20.9" y="5.4" width="4.7" height="11" rx="2.35"/><rect class="s1" x="6.5" y="11.5" width="19.1" height="12.6" rx="4.6"/><path class="s2" d="M5.6 15.2c2.4-1.5 8-1.9 11-.8 1.9.7 2.1 3.3.3 4.2-2.9 1.4-7.9 1.5-10.9.5-1.9-.7-2.100-2.800-.4-3.900z"/></svg>',
  labios: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M2.5 15.200C6.500 8.800 11.800 7.300 16 10.800c4.200-3.500 9.500-2 13.500 4.400-4.600-1-9-.2-13.500-.200s-8.900-.8-13.500.2z"/><path class="s1" d="M3.200 16.700c4.300.9 8.500.3 12.800.3s8.500.6 12.800-.3C25.600 23.200 20.900 26 16 26s-9.600-2.800-12.800-9.300z"/><path class="s3" d="M9.500 19.600c2 1.700 4.200 2.500 6.500 2.500s4.500-.8 6.500-2.500"/></svg>',
  papaya: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 2.600c5.800 0 10.200 7.200 10.200 15.200 0 7.100-4.400 11.800-10.200 11.800S5.800 24.900 5.800 17.800C5.800 9.800 10.200 2.600 16 2.600z"/><path class="s2" d="M16 9.800c2.900 0 4.800 4.200 4.800 8.800 0 4-1.900 6.600-4.800 6.600s-4.800-2.600-4.800-6.600c0-4.600 1.900-8.800 4.800-8.800z"/><g class="s3"><circle cx="15" cy="13.600" r="1"/><circle cx="17.400" cy="15.800" r="1"/><circle cx="14.600" cy="17.400" r="1"/><circle cx="17.200" cy="19.600" r="1"/><circle cx="14.800" cy="21.400" r="1"/><circle cx="17" cy="22.900" r=".9"/></g></svg>',
  // La manzana: el Ánimo, lo que se gana con todas juntas.
  manzana: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 9.500C13 7.500 5.500 7.800 5.500 16.500 5.500 23.500 10 29.500 13.500 29.500c1.300 0 1.700-.7 2.500-.7s1.200.7 2.500.7c3.500 0 8-6 8-13 0-8.700-7.500-9-10.500-7z"/><path class="s3" d="M16 9.500c0-2.500.6-4.500 1.800-6"/><path class="s2" d="M17.200 6.600c1.500-2.800 4.600-3.800 7.600-3-1 2.800-4.200 4-7.600 3z"/></svg>',
  durazno: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 8.200C9.200 5.800 3.600 10.800 4 18c.4 7 5.800 11.600 12 11.600S27.600 25 28 18c.4-7.200-5.200-12.200-12-9.800z"/><path class="s3" d="M16.400 8.600c-3.600 4.800-4 12.800-1.200 19.800"/><path class="s2" d="M16 8.200c.8-4 4.400-6 8.600-4.800-.8 3.800-4.200 5.600-8.600 4.800z"/></svg>',
};

/** Una medida del día como cuadro: nombre, número grande, barra y si ya se cumplió. «sello» es lo que se gana con ella. */
function cuadro(nombre, valor, de, unidad, estado, hecho, enlace = "", sello = null) {
  const aCero = de === 0;       // medidas que se cumplen al llegar a cero, como las tarjetas pendientes
  const [abre, cierra] = enlace ? [`a href="${enlace}"`, "a"] : ["div", "div"];
  return `<${abre} class="cuadro${hecho ? " hecho" : ""}${sello ? " consello" : ""}" role="listitem">
    ${sello ? selloHtml(sello) : ""}
    <span class="cn">${esc(nombre)}</span>
    <span class="cv">${esc(valor)}${aCero ? "" : `<small> de ${esc(de)}${unidad ? " " + esc(unidad) : ""}</small>`}</span>
    ${aCero ? '<span class="bar vacia"></span>' : barra(de ? (valor / de) * 100 : 0)}
    ${hecho ? `<span class="ce">${ICONO_SI}${esc(estado)}</span>` : ""}
  </${cierra}>`;
}

/**
 * El fondo de las páginas de arriba (Tablero, Gramática, Vocabulario): el mismo en todas, para que combinen.
 * Reef: el retrato de Andrea del día (el que dice el tablero), o la portada del día si no hay. Expanse: la portada Expanse del día.
 * Devuelve { html, hay }: el <div class="fondo"> y si hay foto (para la clase «confoto»).
 */
// El logo de Pelagos (la medusa cerebro) va encima del fondo, en la esquina de abajo a la derecha: tapa la marca que traen algunos loops.
const LOGO = `<img class="logoFondo" src="logo.png" alt="Pelagos" width="760" height="519">`;
function fondoDelDia(respaldo = true) {
  if (ambiente() === "limpio") return { hay: false, html: "" };
  // Mientras suena el repaso en audio, arriba va el loop de la tutora que está hablando.
  const lt = repaso && repaso.sonando != null && !sinMovimiento() ? loopDeTutora(repaso.sonando) : null;
  if (lt) return { hay: true, html: `<div class="fondo">${etiquetaEscena("tutora-" + repaso.sonando, lt)}${LOGO}</div>` };
  // Si subiste un GIF o video de fondo (Ajustes), va en todas las páginas de arriba, en lugar de la foto.
  cargarVideosFondo();
  const cosa = etiquetaMovimiento();
  if (cosa) return { hay: true, html: `<div class="fondo">${cosa}${LOGO}</div>` };
  const T = N.leerTablero(A.tablero());
  if (ambiente() !== "expanse" && T && T.foto && retratos.has(T.foto)) {
    return { hay: true, html: `<div class="fondo"><img data-retrato="${esc(T.foto)}" alt="${esc(T.atuendo ? "Andrea hoy: " + T.atuendo : "Andrea hoy")}">${LOGO}</div>` };
  }
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
  const v = videoFondo();
  if (!v || ambiente() === "limpio" || sinMovimiento()) return "";
  return v.tipo === "image/gif" ? `<img data-videofondo="${esc(v.archivo)}" alt="">` : `<video data-videofondo="${esc(v.archivo)}" muted loop autoplay playsinline preload="auto" aria-hidden="true"></video>`;
}
/** Si él lo prendió en Ajustes: en lecciones, quizzes y tarjetas va el GIF de fondo en lugar de la foto. */
const movimientoEnTodo = () => guardado("pelagos.movimientoEnTodo") === "si";
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
    if (videoFondo() && (vista.querySelector(".hoy") || (movimientoEnTodo() && vista.querySelector(".hero")))) pintar({ conserva: true });
  }).catch(() => {});
}
function verInicio(o) {
  const niveles = resumenNiveles();
  const hoy = N.fechaLocal(new Date());
  const T = N.leerTablero(A.tablero());
  const deHoy = !!T && T.dia === hoy;
  // Al fondo, el video que subiste; si no hay, el retrato de Andrea del día (en Expanse, la portada Expanse del día; ver fondoDelDia).
  // Si tocaste un premio ganado, su GIF va de fondo hasta que lo vuelvas a tocar (o te vayas del Tablero).
  if (!o.conserva) premioFondo = null;
  const gifPremio = premioFondo ? ultimaEscena(salaPremio(premioFondo)) : null;
  const fondo = gifPremio ? { hay: true, html: `<div class="fondo">${etiquetaEscena(salaPremio(premioFondo), gifPremio)}${LOGO}</div>` } : fondoDelDia(false);
  const cuadernos = (P.cuadernos || []).map((c) => `
  <section class="card">
    <h2>${esc(c.nombre)}</h2>
    <div class="links">${c.temas.map((id) => porId.get(id)).filter(Boolean).map((t) => botonTema(t)).join("")}</div>
  </section>`).join("");

  // ---- Lo que cuenta Pelagos solo: los quizzes de gramática de hoy y las palabras que tocan hoy y siguen pendientes (la meta es cero).
  const kw = N.kwizzesDelDia(E, hoy), metaKw = N.KWIZZES_AL_DIA;
  const tj = tarjetas.size ? N.tarjetasDelDia(P, E, hoy).pendientes.length : null;

  // ---- Las partes: lo que llevas ganado hoy. Las que dicen con qué se ganan se prenden aquí mismo, al momento;
  // las demás valen lo que diga el tablero.
  const c = T && T.checkin;
  const cumplida = (nombre) => { const m = T.medidas.find((x) => x.nombre === nombre); return m ? (m.de === 0 ? m.valor === 0 : m.valor >= m.de) : null; };
  const sola = (x) => (x.con === "siempre" ? true : x.con === "tarjetas" ? tj === 0 : x.con === "kwizzes" ? kw >= metaKw
    : x.con && x.con.startsWith("medida:") ? (deHoy ? cumplida(x.con.slice(7)) ?? x.va : false) : x.va);
  const partes = !c ? [] : c.partes.map((x) => ({ ...x, va: x.con === "todas" ? null : sola(x) }));
  const ganables = partes.filter((x) => x.con && x.con !== "siempre" && x.con !== "todas" && !x.extra);      // las partes de más no cuentan para el Ánimo
  for (const x of partes) if (x.va === null) x.va = ganables.length > 0 && ganables.every((y) => y.va);
  // Una parte con dibujito va en la esquina del cuadro de su medida, en lugar de ocupar un renglón aparte.
  const sello = (con) => partes.find((x) => x.con === con && SELLOS[iconoDe(x)]) || null;
  const premio = sello("todas");        // lo que se gana con todas juntas no tiene cuadro propio: va en la esquina de la tarjeta del check-in
  const conSellos = partes.some((x) => SELLOS[iconoDe(x)]);

  // ---- Las medidas del día. Los kwizzes y las tarjetas los cuenta Pelagos; lo demás viene del tablero.
  const cuadros = [cuadro("Gramática", kw, metaKw, "quizzes", kw >= metaKw ? "Cumplido" : `Faltan ${metaKw - kw}`, kw >= metaKw, "#" + QUIZ, sello("kwizzes"))];
  if (tj !== null) cuadros.push(cuadro("Vocabulario", tj, 0, "", tj === 0 ? "Cumplido" : "Por repasar", tj === 0, "#/vocabulario", sello("tarjetas")));
  for (const m of T ? T.medidas : []) {
    if (tarjetas.size && /anki/i.test(m.nombre)) continue;        // con tarjetas propias, las de fuera ya no se enseñan
    const hecho = m.de === 0 ? m.valor === 0 : m.valor >= m.de;
    const falta = Math.round((m.de - m.valor) * 10) / 10;
    cuadros.push(cuadro(m.nombre, m.valor, m.de, m.unidad, hecho ? "Cumplido" : m.de === 0 ? "Meta: cero" : `Faltan ${falta}`, hecho, /^clase/i.test(m.nombre) ? "#/clases" : /elevenreader/i.test(m.nombre) ? "#/lectura" : "", sello("medida:" + m.nombre)));
  }
  // Solo se dice de cuándo son los números de fuera si no son de hoy.
  const medidas = `
  <section class="card" id="medidas">
    <h2 class="sr">Tus medidas de hoy</h2>
    <div class="cuadros" role="list">${cuadros.join("")}</div>
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
  const checkin = !c ? "" : `
  <section class="card${premio ? " consello" : ""}" id="checkin">
    ${premio ? selloHtml(premio, true) : ""}
    <h2 class="sr">Check-in</h2>
    <p class="ciLinea">${enlaceCi ? `<a href="${esc(enlaceCi)}" target="_blank" rel="noopener">${esc(textoCi)}</a>` : esc(textoCi)}</p>
    ${c.estado === "ninguno" ? "" : `<p class="ciOido ${c.estado === "oido" ? "si" : "no"}">${c.estado === "oido" ? ICONO_SI + "Escuchado" : ICONO_NO + "Sin escuchar"}</p>`}
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
      <section class="card" id="niveles">
        <h2>Promedio por nivel</h2>
        <div class="links">${niveles.map((n) => botonNivel(n, false, true)).join("")}</div>
      </section>${cuadernos}
    </div>
  </div>`,
  { titulo: "Tablero · Pelagos", nav: "inicio", conserva: o.conserva });
}

// ---------------------------------------------------------------- Misiones del Recorrido de Ganímedes
// Cada misión va ligada a sus temas de gramática. Se prende o se apaga con la lucecita de la lista de temas;
// cuando está prendida, sus personajes salen en el Recorrido. Todo es un suceso «mision», así sale en todos tus aparatos.

/** id de misión -> { activa, hechas: { lugar: true }, aciertos } */
function estadoMisiones() {
  const st = new Map((P.misiones || []).map((m) => [m.id, { activa: false, hechas: {}, aciertos: 0 }]));
  const vistos = new Set();
  const ev = A.sucesos().filter((e) => e.t === "mision" && st.has(e.mision) && !vistos.has(e.id) && vistos.add(e.id))
    .sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));
  for (const e of ev) {
    const s = st.get(e.mision);
    if (e.accion === "prender") s.activa = true;
    else if (e.accion === "apagar") s.activa = false;
    else if (e.accion === "hecha" && e.lugar) { if (!s.hechas[e.lugar]) s.aciertos += Number(e.aciertos) || 0; s.hechas[e.lugar] = true; }
    else if (e.accion === "reiniciar") { s.hechas = {}; s.aciertos = 0; }
  }
  return st;
}
const misionesDeTema = (id) => (P.misiones || []).filter((m) => (m.temas || []).includes(id));
function apuntarMision(mision, accion, extra = {}) {
  A.apuntar({ t: "mision", id: N.nuevoId("m"), mision, accion, cuando: new Date().toISOString(), ...extra });
}
/** La lucecita junto a un tema: prendida si alguna de sus misiones corre en el juego. Tocarla la prende o la apaga. */
function luzMision(t, st) {
  const ms = misionesDeTema(t.id);
  if (!ms.length) return "";
  const m = ms[0], on = st.get(m.id).activa;
  return `<button type="button" class="luz-mision" data-mision="${esc(m.id)}" aria-pressed="${on}" ` +
    `aria-label="Misión «${esc(m.titulo)}»: ${on ? "prendida" : "apagada"}. Toca para ${on ? "apagarla" : "prenderla"}." ` +
    `title="Misión «${esc(m.titulo)}» · ${on ? "prendida" : "apagada"}"><span aria-hidden="true"></span></button>`;
}
vista.addEventListener("click", (ev) => {
  const b = ev.target instanceof Element ? ev.target.closest(".luz-mision") : null;
  if (!b) return;
  const id = b.dataset.mision, on = b.getAttribute("aria-pressed") === "true";
  // Prender una misión que ya terminaste la empieza de nuevo
  const m = (P.misiones || []).find((x) => x.id === id), s0 = estadoMisiones().get(id);
  if (!on && m && s0 && (m.paradas || []).length && m.paradas.every((p) => s0.hechas[p.lugar])) apuntarMision(id, "reiniciar");
  apuntarMision(id, on ? "apagar" : "prender");
  pintar({ conserva: true });
});

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
  ${(P.tutoras || []).length ? `<section class="card">
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
  const soloBajo = filtro === "/bajo", soloMision = CON_RECORRIDO && filtro === "/mision";
  const cola = filtro || "";
  const st = estadoMisiones();
  const conMision = (t) => misionesDeTema(t.id).some((m) => st.get(m.id).activa);
  const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
  const bajo = suyos.filter((t) => esBajo(info(t.id).pct)).length;
  const categorias = [];
  const banco = bancoPorTema();
  revisarVideos();
  for (const t of suyos) {
    const i = info(t.id);
    if (soloBajo && !esBajo(i.pct)) continue;
    if (soloMision && !conMision(t)) continue;
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
    <p class="small">Listos: ${suyos.filter((t) => t.leccion).length} con lección · ${suyos.filter((t) => tutoraDe(t.id)).length} con tutora · ${suyos.filter(tieneVideo).length} con video completo · ${suyos.filter(tieneLoop).length} con loop · ${suyos.filter(tieneVoz).length} con voz · ${suyos.filter((t) => banco.get(t.id)).length} con preguntas.</p>
    <nav class="jump ${CON_RECORRIDO ? "tres" : "dos"}" aria-label="Qué temas mostrar">
      <a href="#/gramatica/${clave}"${soloBajo || soloMision ? "" : ' aria-current="page"'}>Todos</a>
      <a href="#/gramatica/${clave}/bajo"${soloBajo ? ' aria-current="page"' : ""}>Bajo ${meta()}%</a>
      ${CON_RECORRIDO ? `<a href="#/gramatica/${clave}/mision"${soloMision ? ' aria-current="page"' : ""}>Misión activa</a>` : ""}
    </nav>
  </header>
  ${categorias.length ? categorias.map((c) => `
  <details class="card cat"${filtro || (o.conserva && abiertas.has(c.nombre)) ? " open" : ""}>
    <summary><span class="cn">${esc(c.nombre)}</span><span class="cc">${plural(c.temas.length, "tema", "temas")}${filtro ? "" : ` · ${c.bajo} bajo ${meta()}%`}</span></summary>
    <div class="links">${c.temas.map((t) => {
      const i = info(t.id);
      const sub = marcas(t, banco) + (i.n ? ` <span class="resp">${plural(i.n, "respuesta", "respuestas")}</span>` : "");
      const luz = CON_RECORRIDO ? luzMision(t, st) : "";
      const boton = botonTema(t, { nivel: false, anchoNombre: true, ingles: true, sub });
      return luz ? `<div class="tb-mision">${boton}${luz}</div>` : boton;
    }).join("")}</div>
  </details>`).join("") : `<section class="card"><p>${soloMision ? `Ningún tema de ${nivel} tiene una misión prendida. Prende una con la lucecita que sale junto a sus temas.` : `Ningún tema de ${nivel} está bajo ${meta()}%.`}</p></section>`}`),
  {
    titulo: nivel + " · Lecciones de gramática · Pelagos", nav: "gramatica", conserva: o.conserva,
    pie: (CON_RECORRIDO ? "<p>La lucecita junto a un tema prende o apaga su misión en el Recorrido de Ganímedes.</p>" : "") + "<p>Toca una categoría para abrirla. Los temas en inglés todavía no tienen lección propia: llevan el nombre que les da Kwiziq.</p><p>Un porcentaje sin número de respuestas es tu arranque de Kwiziq.</p><p>Cada tema lleva seis marcas: lección, tutora (con su nombre), video completo, loop, voz y preguntas. La marca llena es que ya está lista; la punteada, que falta. El video completo cuenta lo que hay en este aparato (tu carpeta «Pelagos videos» o los importados); el loop y la voz, lo que ya está subido. Se llenan solas conforme llegan.</p>",
  });
}

// ---------------------------------------------------------------- El mapa de árbol

let anchoDelMapa = 0;         // el ancho con el que se dibujó, para volver a dibujarlo si la pantalla cambia

/** Todos los temas en un mapa: una tarjeta por nivel, de C1 a A0; dentro, una caja por tipo de palabra y un cuadro de color por tema. */
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
      const modo = c.cw >= 78 && c.ch >= 38 ? 2 : c.cw >= 15 && c.ch >= 12 ? 1 : 0;      // 2: número y título; 1: solo el número; 0: solo el color
      const renglones = Math.max(1, Math.min(4, Math.floor((c.ch - 24) / 13)));
      const nombre = CATEGORIAS[categoria] || categoria;
      const filas = [];
      for (let i = 0; i < temas.length; i += c.columnas) {
        const fila = temas.slice(i, i + c.columnas).map((t) => {
          const v = info(t.id).pct, f = N.colorDe(info(t.id));
          const numero = v === null ? "–" : String(Math.round(v));
          const dentro = modo === 2 ? `<b>${numero}</b><span class="mt r${renglones}"${t.titulo ? "" : ' lang="en"'}>${esc(titulo(t))}</span>` : modo === 1 ? `<b>${numero}</b>` : "";
          return `<button type="button" class="mc m${modo} ${f === null ? "kx" : "k" + f}${c.cw >= 40 && c.ch >= 22 ? " g" : c.cw < 26 ? " ch" : ""}" data-l="${t.id}" aria-label="${esc(titulo(t))}: ${esc(pct(v))}">${dentro}</button>`;
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
const SEMANAS = 28;           // columnas de cada medio año: alcanzan para 184 días más el arranque de la primera semana

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
    // Cuándo vuelve a tocar algo, para que «en cero» no parezca que se acabaron para siempre.
    const fechas = mazo().map((c) => E.tarjetas.get(c.id)).filter((x) => x && !x.quitada && x.toca && x.toca > hoy).map((x) => x.toca).sort();
    return poner(conFondo(`
    ${entradas("vocabulario", "quiz")}
    <section class="card" id="tjCero">
      <h1 class="h">${dia.total ? "Vocabulario en cero" : "Todavía no hay vocabulario"}</h1>
      ${dia.total ? `<p>Hoy repasaste ${dia.hechasHoy} de tus ${plural(dia.total, "palabra", "palabras")}.${fechas.length ? ` Las siguientes tocan el ${fecha(fechas[0])}.` : ""}</p>` : "<p>Cuando haya palabras en el contenido, aquí salen las de cada día.</p>"}
      <div class="go">${masTarde.length ? `<button type="button" class="ub grande" id="tjAdelantar">Adelantar ${masTarde.length}</button>` : ""}<a class="ub${masTarde.length ? "" : " grande"}" href="#/">Tablero</a></div>
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
        <p class="lead"><span id="tjFaltan">${faltan}</span><span id="tjAviso">Dilo en español</span></p>
        <div class="score"><div class="track" role="img" aria-label="Llevas ${hechas} de ${total}"><i data-w="${100 * hechas / total}"></i></div></div>
        ${htmlNivel(nivelDe(antes))}
        <h1 class="cue" id="cue" lang="en">${esc(c.frente)}</h1>
      </div>
      <div class="rule tjResp" id="tjResp" tabindex="-1" aria-live="polite" hidden>
        <ul class="exs"><li class="ex"><span class="es" id="vResp">${esc(c.reverso)}</span></li></ul>
      </div>
    </header>
    <div class="tjZona">
      <p class="tjToca" id="tjToca">Toca para ver la respuesta</p>
      <div class="tjBotones" id="tjBotones" role="group" aria-label="¿La supiste?" hidden><button type="button" class="ub" id="jMal">Mal</button><button type="button" class="ub" id="jBien">Bien</button></div>
    </div>
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
  $("jBien").addEventListener("click", () => calificar(true));
  $("jMal").addEventListener("click", () => calificar(false));
}

/** El peldaño de una tarjeta en la escalera (1 a 6, uno por escalón de N.ESCALONES); 0 si nunca la has acertado. */
function nivelDe(s) { return s && s.toca ? s.escalon + 1 : 0; }
/** Seis puntitos, uno por peldaño, con los mismos seis colores del Atlas. */
function htmlNivel(n) {
  return `<div class="tjNivel" id="tjNivel" role="img" aria-label="${n ? `Peldaño ${n} de ${N.ESCALONES.length}` : "Tarjeta nueva"}">${N.ESCALONES.map((_, i) =>
    `<i class="k${i}${i < n ? " on" : ""}"></i>`).join("")}</div>`;
}
/** Llena o vacía los puntitos, uno tras otro, para que se vea la subida o la caída. */
function moverNivel(de, a) {
  const caja = $("tjNivel");
  if (!caja) return;
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
  poner(`<div class="hoy clases${foto ? " confoto" : ""}">${fondo}<div class="sobre">${entradas("tablero", "clases")}${CL.htmlClases(A.clases(), new Date(), CL.pedidosDe(A.sucesos()))}</div></div>`,
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
  const T = N.leerTablero(A.tablero()), er = T && T.dia === hoy ? T.medidas.find((m) => /elevenreader/i.test(m.nombre)) : null;
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
  const er = T && T.dia === hoy ? T.medidas.find((m) => /elevenreader/i.test(m.nombre)) : null;
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

  const porHora = new Map();
  for (const d of ultimos) for (const [h, v] of (L && L.horas.get(d)) || []) porHora.set(h, (porHora.get(h) || 0) + v);
  let grafHoras = "";
  if (porHora.size) {
    const hs = [...porHora.keys()], desde = Math.min(7, ...hs), hasta = Math.max(22, ...hs);
    const hora = (h) => (h % 12 || 12) + (h < 12 ? " am" : " pm");
    const barras = [];
    for (let h = desde; h <= hasta; h++) barras.push({ corto: h % 2 === 0 ? String(h % 12 || 12) : "", sub: h % 6 === 0 || h === desde ? (h < 12 ? "am" : "pm") : "",
      valor: porHora.get(h) || 0, detalle: `De ${hora(h)} a ${hora(h + 1)}: ${horasMin(porHora.get(h) || 0)} en 14 días.` });
    const fuerte = [...porHora].sort((a, b) => b[1] - a[1])[0];
    grafHoras = graficaBarras({ id: "grafHoras", titulo: "A qué hora escuchas", barras,
      resumen: `Tu hora fuerte: de ${hora(fuerte[0])} a ${hora(fuerte[0] + 1)}, con ${horasMin(fuerte[1])} en 14 días.` });
  }

  const porLibro = new Map();
  for (const [d, id] of L ? L.libroDia : []) if (tituloDe.has(id)) porLibro.set(id, (porLibro.get(id) || 0) + (dias.get(d) || 0));
  const maxLibro = Math.max(1, ...porLibro.values());
  const grafLibros = porLibro.size ? `
    <section class="card" id="grafLibros">
      <h2>Por libro</h2>
      <ul class="porLibro">${[...porLibro].sort((a, b) => b[1] - a[1]).map(([id, m]) => `<li><span class="plNombre">${esc(tituloDe.get(id))}</span><span class="plValor">${horasMin(m)}</span><span class="bar gorda lecBarra"><i data-w="${(100 * m) / maxLibro}"></i></span></li>`).join("")}</ul>
    </section>` : "";

  // ---- Biblioteca (su «sí» del 14-Oct): tres botones arriba, Libros · Series · Podcasts, como los de la Bitácora.
  // Los libros son lo de siempre; las series y los podcasts vienen de su hoja de Excel, con sus carteles y portadas.
  if (!bibModo) bibModo = ["libros", "series", "podcasts"].includes(guardado("pelagos.biblioteca")) ? guardado("pelagos.biblioteca") : "libros";
  const modo = ejemplo ? "libros" : bibModo;
  const unDecimal = (h) => (Math.round(h * 10) / 10).toLocaleString("es-MX");
  const cartel = (x, clase) => x.portada
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
    const S = L ? L.series : [];
    const fichaS = (x) => `<li><div class="libro">${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span>` +
      `<span class="small">${esc(x.tipo)}${x.horas !== null ? " · " + unDecimal(x.horas) + " h" : ""}</span>${estrellas(x.nota)}${x.genero ? `<span class="small">${esc(x.genero)}</span>` : ""}</div></li>`;
    const vistas = S.filter((x) => x.estado === "terminado").map((x, i) => [x, i]).sort((a, b) => (b[0].nota || 0) - (a[0].nota || 0) || a[1] - b[1]).map((x) => x[0]);
    const total = L && L.seriesHoras !== null ? L.seriesHoras : vistas.reduce((t, x) => t + (x.horas || 0), 0);
    cabeza = `<p class="lecturaHoy">${unDecimal(total)} horas de series y películas.</p><p class="small">${plural(vistas.length, "vista", "vistas")}, de la mejor a la peor.</p>`;
    cuerpo = repisa("serViendo", "Viendo", S.filter((x) => x.estado === "viendo"), fichaS) + repisa("serVistas", "Vistas", vistas, fichaS) +
      repisa("serPorVer", "Por ver", S.filter((x) => x.estado === "pendiente"), fichaS) + repisa("serDejadas", "Las que dejaste", S.filter((x) => x.estado === "abandonado"), fichaS);
  } else if (modo === "podcasts") {
    const Pd = L ? L.podcasts : [];
    const fichaP = (x) => `<li><div class="libro">${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span></div></li>`;
    cabeza = `<p class="lecturaHoy">${L && L.podcastsHoras !== null ? L.podcastsHoras.toLocaleString("es-MX") + " horas de podcasts." : "Tus podcasts."}</p><p class="small">${plural(Pd.length, "podcast", "podcasts")}, por tus estrellas.</p>`;
    cuerpo = [3, 2, 1].map((n) => repisa("pod" + n, `${"★".repeat(n)} <span class="sr">${plural(n, "estrella", "estrellas")}</span>`, Pd.filter((x) => x.nota === n), fichaP)).join("") +
      repisa("podSin", "Sin estrellas", Pd.filter((x) => !x.nota), fichaP);
  } else {
    cabeza = `<p class="lecturaHoy">${esc(lineaHoy)}</p><p class="small">${esc(lineaSemana)}</p>`;
    cuerpo = tarjetaAhora + grafDias + grafHoras + grafLibros + estante;
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
      ${ejemplo || modo !== "libros" ? "" : `<p class="small lecturaVerEjemplo"><a href="#/lectura/ejemplo">Ver con datos de ejemplo</a></p>`}
    </div>
  </div>`, { titulo: "Biblioteca · Pelagos", nav: "inicio", conserva: o.conserva });
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

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
let bibModo = null;      // qué enseña la Biblioteca: libros, series o podcasts (se recuerda en este aparato)

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
  for (const x of vivas) { const k = N.colorDe({ ...x.s, pct: x.pct }); if (k === null) sinVer++; else cuenta[k]++; }
  const tocan = N.tarjetasDelDia(P, E, hoy).pendientes.length;
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
    const salen = (q ? vivas.filter((x) => [x.c.reverso, x.c.frente].some((t) => paraBuscar(t).includes(q))) : vivas.slice()).sort(ORDENAR[lvOrden] || alfabeto);
    $("lvCeldas").innerHTML = salen.slice(0, lvCuantas).map((x) => {
      const f = N.colorDe({ ...x.s, pct: x.pct });
      return `<button type="button" class="vc ${f === null ? "kx" : "k" + f}" data-v="${esc(x.id)}" lang="es-MX" aria-label="${esc(x.c.reverso)}: ${f === null ? "sin ver" : `peldaño ${f + 1}, ${x.pct === null ? "sin aciertos todavía" : pct(x.pct) + " de aciertos"}`}">${esc(x.c.reverso)}</button>`;
    }).join("");
    $("lvCuenta").textContent = !vivas.length ? "Todavía no hay palabras en tu vocabulario."
      : q ? (salen.length ? `${salen.length} de ${vivas.length} con «${lvBusca.trim()}».` : `Ninguna palabra con «${lvBusca.trim()}».`)
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
    <ul class="exs"><li class="ex"><h2 class="es" id="hvT" lang="es-MX" tabindex="-1">${esc(c.reverso)}</h2><span class="en" lang="en">${esc(c.frente)}</span></li></ul>
    <div class="sc"><span>Aciertos: ${v === null ? "todavía sin datos" : `${pct(v)} · ${bien} de ${n}`}</span>${v === null ? "" : barra(v)}</div>
    ${grafica}
    <div class="hvLinea">${htmlGrafica(serieV, "gV", c.reverso, false)}</div>
    <dl class="hvDatos">${datos.map(([k, t]) => `<div><dt>${k}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl>
    <div class="acts" id="hvActos">
      <button type="button" class="ub" id="hvEditar">Editar</button>
      ${s.quitada ? '<button type="button" class="ub" id="hvDevolver">Devolver</button>' : '<button type="button" class="ub" id="hvQuitar">Quitar</button>'}
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>
    <p id="hvSeguro" hidden>¿La quito de tu vocabulario? Ya no sale en tu quiz. <button type="button" class="lk" id="hvSi">Sí, quítala</button> · <button type="button" class="lk" id="hvNo">No</button></p>
    ${formaPalabra(c, true)}`;
  ponerFondoPalabra(id, s, hoy);
  vestir(hojaV);
  activarGrafica(serieV, "gV");
  const editar = (si) => { $("hvForma").hidden = !si; $("hvActos").hidden = si; $("hvSeguro").hidden = true; if (si) $("hvEs").focus(); };
  $("hvEditar").addEventListener("click", () => editar(true));
  $("hvCancelar").addEventListener("click", () => editar(false));
  if ($("hvQuitar")) $("hvQuitar").addEventListener("click", () => { $("hvSeguro").hidden = false; $("hvNo").focus(); });
  if ($("hvDevolver")) $("hvDevolver").addEventListener("click", () => quitarPalabra(id, false));
  $("hvNo").addEventListener("click", () => { $("hvSeguro").hidden = true; });
  $("hvSi").addEventListener("click", () => quitarPalabra(id, true));
  $("hvForma").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = leerForma();
    if (!f) return;
    const { reverso, frente } = f;
    // Solo se apunta lo que cambió.
    const cambio = {};
    if (reverso !== c.reverso) cambio.reverso = reverso;
    if (frente !== c.frente) cambio.frente = frente;
    if (Object.keys(cambio).length) {
      A.apuntar({ t: "tje", id: N.nuevoId("e"), tarjeta: id, cuando: new Date().toISOString(), ...cambio });
      recalcular();
      pintar({ conserva: true });
    }
    abrirPalabra(id);
  });
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
  const grupos = GRUPOS.map(([clave, nombre]) => ({ nombre, temas: ((lec.enlaces || {})[clave] || []).map((id) => porId.get(id)).filter(Boolean) })).filter((g) => g.temas.length);
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
      <p class="lead"><span>${esc(tema.nivel)} · ${esc(NIVELES[tema.nivel] || "")}</span><span>${i.n === 0 ? "de Kwiziq" : plural(i.n, "respuesta", "respuestas")}</span></p>
      <h1>${esc(lec.titulo)}</h1>
      ${lec.subtitulo ? `<p class="sub">${esc(lec.subtitulo)}</p>` : ""}
      <button type="button" class="score" data-graftema="${tema.id}" aria-label="Tu porcentaje: ${pct(i.pct)}, meta ${meta()}%. Ver tu porcentaje día por día">
        <span>Tu porcentaje: ${pct(i.pct)} · meta ${meta()}% <span class="vergraf" aria-hidden="true">· ver gráfica</span></span>
        <div class="track" role="img" aria-label="${pct(i.pct)} de 100, meta en ${meta()}"><i data-w="${ancho(i.pct)}"></i><b data-x="${meta()}"></b></div>
      </button>
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
  ${tutoraDe(tema.id) ? `
  <section class="card" id="tutora">
    <h2>Tu tutora</h2>
    <p>${esc(tutoraDe(tema.id).tutora)} te enseña esta regla a su manera.</p>
    <div class="go"><a class="ub grande" href="#/tutoras/${tema.id}">Ir con ella</a></div>
    ${botonEscena(tema.id)}
  </section>` : ""}
  <section class="card" id="enlaces">
    <h2>Esta lección en la red</h2>
    <p>Cada lección apunta a otras. Toca una y ves su regla sin salir de aquí.</p>
    ${grupos.map((g) => `<h3>${g.nombre}</h3><div class="links">${g.temas.map((t) => `
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

// La escena completa de una tutora: el video vive solo en el aparato (ver web/videos.js).
// «Escuchar a <tutora>»: su episodio grabado (MP3) en la rama avance, en escenas/voz-<lección>/ (como los loops).
// El botón sale solo si ya hay grabación. El audio se baja con la llave y se toca aquí mismo, con el reproductor del aparato.
const nombreCorto = (t) => t.tutora.split(",")[0];
const salaVoz = (id) => "voz-" + id;
const botonEscena = (id) => {
  const t = tutoraDe(id);
  const oir = t ? `<button type="button" class="ub grande" data-escuchar="${id}" hidden>Escuchar a ${esc(nombreCorto(t))}</button>` : "";
  return `<div class="go"><button type="button" class="ub grande" data-escena="${id}">Ver la escena completa</button>${oir}</div><div class="voz" data-voz="${id}"></div><p class="small" data-escenaaviso="${id}" role="status"></p>`;
};
function conectarEscenas(raiz) {
  for (const b of raiz.querySelectorAll("[data-escena]")) b.addEventListener("click", () => verEscena(Number(b.dataset.escena)));
  for (const b of raiz.querySelectorAll("[data-escuchar]")) {
    const id = Number(b.dataset.escuchar);
    A.escenasDe(salaVoz(id)).then((l) => {
      const v = l.filter((x) => /^audio\//.test(x.tipo || "")).slice(-1)[0];
      if (!v || !b.isConnected) return;
      b.hidden = false;
      b.addEventListener("click", () => escuchar(b, id, v));
    }).catch(() => {});
  }
}
async function escuchar(b, id, v) {
  const caja = vista.querySelector(`[data-voz="${id}"]`), t = tutoraDe(id);
  const aviso = vista.querySelector(`[data-escenaaviso="${id}"]`);
  if (!caja) return;
  if (repaso) pararRepaso("");
  let audio = caja.querySelector("audio");
  if (!audio) {
    b.disabled = true;
    if (aviso) aviso.textContent = "Bajando su voz…";
    try {
      const url = await A.escenaUrl(salaVoz(id), v);
      audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "auto";
      audio.src = url;
      audio.setAttribute("aria-label", "Episodio de " + t.tutora);
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
    audio.addEventListener("pause", () => { b.textContent = "Escuchar a " + nombreCorto(t); });
  }
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}
function callar() { for (const a of document.querySelectorAll(".voz audio")) a.pause(); }

// ---------------------------------------------------------------- Repaso en audio
// Toca, una tras otra, las voces grabadas de las tutoras (escenas/voz-<lección>/). Mientras habla cada una,
// arriba va su loop (escenas/tutora-<lección>/); cuando entra la siguiente, cambia el loop.
let repaso = null;      // { origen, cola: [{ id, v }], i, audio, faltan: [ids], sonando, aviso }
/** El loop (GIF o video) de la tutora de un tema, si ya se sabe; si no, null. */
function loopDeTutora(id) { const l = escenasPorSala.get("tutora-" + id); return l ? l.filter(esMovimiento).slice(-1)[0] || null : null; }
const nombreDe = (id) => { const t = tutoraDe(id); return t ? nombreCorto(t) : "la tutora"; };
function botonesRepaso() {
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
function planActual() { return N.listaDeEstudio(P, E).temas.filter((id) => porId.has(id)); }
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
async function empezarRepaso(ids, origen, etiqueta = "") {
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
  repaso = { origen, cola, i: -1, audio, faltan, sonando: null, etiqueta };
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
  const aviso = vista.querySelector(`[data-escenaaviso="${id}"]`);
  const decir = (t) => { if (aviso) aviso.textContent = t; };
  decir("Buscando el video…");
  // 1. Tu almacén de Cloudflare: se ve en streaming, en cualquier aparato.
  const nube = await enlaceNube(id);
  if (nube) {
    decir("");
    const d = abrirReproductor(nube, () => verEscenaLocal(id, decir, "No lo encontré en tu almacén de Cloudflare. "));
    ponerSubtitulos(id, d);
    return;
  }
  return verEscenaLocal(id, decir, "");
}
/** El video desde este aparato (tu carpeta o los importados) y, si no está, el botón para verlo desde su sitio. */
async function verEscenaLocal(id, decir, antes) {
  let f = await V.video(id, true);
  if (!f && V.puedeCarpeta() && !(await V.nombreCarpeta())) {
    try { await V.elegirCarpeta(); f = await V.video(id, true); } catch { /* no eligió */ }
  }
  if (!f) {
    decir(antes + (V.puedeCarpeta()
      ? "No encuentro su video en tu carpeta. Revisa que se llame con el número de la lección al principio, por ejemplo «" + id + " - Nombre.mp4». La carpeta se cambia en Ajustes, «Videos de las tutoras»."
      : "Este aparato todavía no tiene su video. Pásalo por USB y luego, en Ajustes, «Videos de las tutoras», toca «Importar videos»."));
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
    <p class="small">${esc(tema ? tema.nivel + " · " + titulo(tema) : "Lección " + id)} · lección ${id}${t.estado ? " · " + esc(t.estado) : ""}</p>
    <div class="rule"><span class="k">La regla en una línea</span><p>${esc(t.regla)}</p></div>
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
  return marcas(t, banco) + (i.n ? ` <span class="resp">${plural(i.n, "respuesta", "respuestas")}</span>` : "") +
    (motivo ? `<span class="motivo">${esc(motivo)}</span>` : "");
}

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
  const hechosHoy = N.kwizzesHechos(E).filter((k) => N.fechaLocal(k.terminado) === hoy).length;
  poner(conFondo(`
  ${entradas("gramatica", "quiz")}
  ${abierto ? `
  <section class="card">
    <h1 class="h">Tienes un quiz a medias</h1>
    <p>Lo que ya contestaste está guardado.</p>
    <div class="go"><a class="ub grande" href="#${QUIZ}/${esc(abierto.id)}">Seguir el quiz</a><button type="button" class="ub" id="dejarKwiz">Dejarlo así</button></div>
    <p class="small">Si lo dejas, se cierra con lo que ya contestaste. Tus respuestas siguen contando.</p>
  </section>` : ""}
  <section class="card" id="lista">
    ${abierto ? "<h2>Tu plan de estudio Pelagos</h2>" : '<h1 class="h">Tu plan de estudio Pelagos</h1>'}
    <h3 id="enfoqueT">Enfoque</h3>
    <div class="enfoque" role="group" aria-labelledby="enfoqueT">
      <button type="button" class="nv ancho" data-enfoque="" aria-pressed="${E.enfoque ? "false" : "true"}">Guiado: todos los niveles</button>
      ${Object.keys(NIVELES).map((n) => `<button type="button" class="nv" data-enfoque="${n}" aria-pressed="${E.enfoque === n ? "true" : "false"}"${porNivel[n] ? "" : " disabled"} aria-label="${n}, ${porNivel[n] ? plural(porNivel[n], "tema con preguntas", "temas con preguntas") : "todavía sin preguntas"}">${n}<span>${porNivel[n] || 0}</span></button>`).join("")}
    </div>
    <p class="small">${E.enfoque ? `Tu plan solo trae temas de ${esc(E.enfoque)}.` : "Tu plan toma temas de todos los niveles."} El número es cuántos temas tienen preguntas.${lista.abierto ? " El cambio se ve al terminar el quiz que está a medias." : ""}</p>
    ${deLista.length ? `
    <h3>${plural(deLista.length, "tema", "temas")} en tu plan</h3>
    <div class="links">${deLista.map((t) => botonTema(t, { sub: lineaDelPlan(t, lista, bancoPlan) })).join("")}</div>
    <div class="go">${lista.abierto ? "" : `<button type="button" class="ub grande" data-kwiz='{"tipo":"lista"}'>Pelagos Quiz</button>`}${botonesRepaso()}</div>
    <p class="small" id="repasoAviso" role="status">${esc(avisoRepaso())}</p>
    <p class="small">Una pregunta de cada tema. El que aciertas sale del plan y entra otro. El que fallas se queda hasta que lo aciertes dos veces seguidas.</p>
    ${deLista.length < N.LISTA ? `<p class="small">${E.enfoque ? `En ${esc(E.enfoque)} solo hay` : "Solo hay"} ${plural(deLista.length, "tema", "temas")} con preguntas. El plan se llena cuando se escriban más.</p>` : ""}
    <p class="small">Hoy llevas ${plural(hechosHoy, "quiz", "quizzes")}.</p>`
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
  if (abierto) {
    $("dejarKwiz").addEventListener("click", () => {
      A.apuntar({ t: "dejar", id: N.nuevoId("d"), kwiz: abierto.id, cuando: new Date().toISOString() });
      recalcular();
      pintar();
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

function verPregunta(o, kid) {
  if (o.conserva && enPreguntaDe === kid) { enPregunta = true; return; }
  const k = E.kwizzes.get(kid);
  if (!k) return verNoExiste();
  const sig = N.siguiente(E, kid);
  if (!sig) return k.terminado ? ir(QUIZ + "/" + kid + "/resultado", true) : verNoExiste(k.dejado ? "Ese quiz lo dejaste sin contestar nada." : "Ese quiz se quedó sin preguntas.");
  const q = preguntas.get(sig.p);
  const tema = porId.get(q.tema);
  const escribir = q.tipo === "escribir";
  const opciones = escribir ? [] : N.barajar(q.opciones, N.azarDe(kid + "-" + q.id));
  const juego = juegoDeFotos();
  const foto = juego.length ? juego[Math.floor(N.azarDe(kid + "#" + sig.orden)() * juego.length)] : null;

  poner(`
  <section class="kw">
    <header class="hero kwh">
      <div class="ratio"></div>
      ${imagenDeArriba(foto && foto.nombre)}
      <div class="over">
        <p class="lead"><span>Pregunta ${sig.orden} de ${sig.total}</span><span>${escribir ? "Dilo en español" : "Toca la respuesta"}</span></p>
        <div class="score"><div class="track" role="img" aria-label="Vas en la ${sig.orden} de ${sig.total}"><i data-w="${100 * (sig.orden - 1) / sig.total}"></i></div></div>
        <h1 class="cue" id="cue"${escribir ? ' lang="en"' : ""}>${hueco(q.frase)}</h1>
        ${q.glosa ? `<p class="sub">(${esc(q.glosa)})</p>` : ""}
        ${q.pista ? `<div class="hrow"><button type="button" class="chip" id="pistaBtn">Pista</button><span class="sub" id="pista" hidden>${esc(q.pista)}</span></div>` : ""}
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
      <div class="mala" id="vMala" hidden>
        <button type="button" class="lk" id="malaBtn">Pregunta mala</button>
        <span id="malaSeguro" hidden>¿La retiro? Ya no sale y esta respuesta deja de contar. <button type="button" class="lk" id="malaSi">Sí, retírala</button> · <button type="button" class="lk" id="malaNo">No</button></span>
        <span id="malaHecho" hidden></span>
      </div>
    </div>
  </section>`,
  {
    titulo: `Pregunta ${sig.orden} de ${sig.total} · Pelagos`, nav: "gramatica",
    pie: "<p>Si aciertas, pasa sola a la siguiente." + (escribir ? "" : " Si fallas, toca la respuesta correcta para seguir.") + "</p>" +
      "<p>Lo que contestas se guarda al momento; puedes cerrar y seguir después, en este aparato o en otro.</p>",
  });
  enPregunta = true;
  enPreguntaDe = kid;

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
    const antes = info(q.tema).pct;
    A.apuntar({
      t: "r", id: N.nuevoId("r"), kwiz: kid, p: q.id, tema: q.tema, cuando: new Date().toISOString(),
      bien: bien ? 1 : 0, modo: escribir ? modo : "tocar", escrito: (escribir ? ultimoEscrito : extra.elegido) || null, pista: pista ? 1 : 0,
    });
    recalcular();
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
  const filas = k.preguntas.filter((p) => k.resp.has(p)).map((p) => ({ r: k.resp.get(p), q: preguntas.get(p) }));
  const temas = [...new Set(filas.map((f) => f.r.tema))].map((id) => porId.get(id)).filter(Boolean);
  const fallas = [...new Set(filas.filter((f) => !f.r.bien).map((f) => f.r.tema))].filter((id) => porId.has(id));
  const igual = JSON.stringify({ tipo: k.tipo, cuaderno: k.cuaderno, tema: k.tema });
  const cambios = N.cambiosDeLista(P, E, kid);
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
  poner(conFondo(`
  <section class="card">
    <h1 class="h">${k.bien} de ${k.total}</h1>
    <p>${TIPOS_KWIZ[k.tipo] || "Quiz"} · ${cuando(k.terminado)}</p>
    ${barra(k.total ? 100 * k.bien / k.total : 0, " gorda")}
    <div class="go"><button type="button" class="ub grande" data-kwiz='${esc(igual)}'>${k.tipo === "lista" ? "Otro quiz de tu plan" : "Otro quiz igual"}</button>${fallas.length ? `<button type="button" class="ub" id="estudiarFallas">Estudiar las fallas</button>` : ""}</div>
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
    <div class="links">${temas.map((t) => {
      const c = N.cambioDeTema(E, kid, t.id), i = info(t.id);
      const abre = t.slug && t.leccion ? `<a class="tb" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tb" data-l="${t.id}">`;
      return `${abre}<span class="lv">${esc(t.nivel)}</span><span class="nm">${esc(titulo(t))}</span>
        <span class="pc${esBajo(c.despues) ? " bajo" : ""}">${pct(c.despues)}${movio(c.antes, c.despues)}</span>
        ${c.de || i.toca ? `<span class="sm">${[c.de ? `${c.bien} de ${c.de} bien` : "", i.toca ? `toca el ${fecha(i.toca)}` : ""].filter(Boolean).join(" · ")}</span>` : ""}
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
  // Estudiar las fallas: vuelve a tu plan y toca solo las voces de las tutoras de los temas que fallaste (se quedan en tu plan).
  const ef = $("estudiarFallas");
  if (ef) ef.addEventListener("click", () => {
    empezarRepaso(fallas, "plan", fallas.length === 1 ? "Tu falla." : "Tus fallas.");
    ir(QUIZ);
  });
}

// ---------------------------------------------------------------- Ajustes

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

function verAjustes(o) {
  const s = A.estadoSinc();
  const esIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const archivos = A.archivosDeSucesos();
  const aparatos = [...new Set(archivos.map((a) => a.aparato))];
  poner(`
  <section class="card">
    <h1 class="h">Ajustes</h1>
    <h3>Este aparato</h3>
    <p>Se llama <b>${esc(A.aparato())}</b>. Con ese nombre guarda tus respuestas en tu repositorio.</p>
    <h3>Guardado</h3>
    <p id="ajSinc">${esc(textoSinc(s) || "Todo guardado.")}</p>
    <div class="go"><button type="button" class="ub" id="ajAlDia">Poner al día ahora</button></div>
    <p class="small" id="ajAviso" role="status" hidden></p>
  </section>
  <section class="card" id="ajTema">
    <h2>Colores</h2>
    <nav class="jump dos" aria-label="Modo de color">
      <button type="button" data-tema-ir="claro">Claro</button><button type="button" data-tema-ir="oscuro">Oscuro</button>
    </nav>
    <p class="small">Cambia todas las páginas de una vez. Se guarda en este aparato.</p>
  </section>
  <section class="card" id="ajAmbiente">
    <h2>Ambiente</h2>
    <nav class="jump dos" aria-label="Ambiente de las fotos">
      <button type="button" data-ambiente-ir="reef">Reef</button><button type="button" data-ambiente-ir="limpio">Limpio</button>
    </nav>
    <p class="small">Cambia las fotos de todas las páginas: las portadas Reef, el mundo de The Expanse, o Limpio, sin fotos ni dibujos, solo negro o blanco según tu modo de color. Se guarda en este aparato.</p>
  </section>
  <section class="card" id="ajVideo">
    <h2>Fondo con movimiento</h2>
    <p id="ajVideoHay">${videoFondo() ? "Ya tienes un fondo con movimiento." : "Ahora se usa la foto del día."}</p>
    <div class="go"><label class="ub">Subir un GIF o video<input type="file" id="ajVideoArch" accept=".gif,.mp4,.webm,image/gif,video/mp4,video/webm" hidden></label>
      <button type="button" class="ub" id="ajVideoTodo" aria-pressed="${movimientoEnTodo()}">${movimientoEnTodo() ? "También en lecciones y tarjetas: Sí" : "También en lecciones y tarjetas: No"}</button>
      <button type="button" class="ub" id="ajVideoQuitar"${videoFondo() ? "" : " hidden"}>Quitar el GIF o video</button></div>
    <p class="small" id="ajVideoAviso" role="status">Un GIF o un video (MP4 o WebM) que se repite sin sonido detrás del Tablero, Gramática y Vocabulario, en lugar de la foto. Mejor de menos de 10 MB. Con «También en lecciones y tarjetas» sale también arriba de cada lección, pregunta y tarjeta de vocabulario, y en las lecciones con tutora sale su clip. Sale en todos tus aparatos. En Limpio, o si tu aparato pide reducir el movimiento, se queda la foto.</p>
  </section>
  <section class="card" id="ajEscenas">
    <h2>Videos de las tutoras</h2>
    <p id="ajEscenasHay">Revisando…</p>
    <div class="go">${V.puedeCarpeta() ? '<button type="button" class="ub" id="ajEscenasCarpeta">Elegir carpeta</button>' : ""}
      <label class="ub">Importar videos<input type="file" id="ajEscenasArch" accept="video/*,.mp4,.webm,.m4v,.mov" multiple hidden></label></div>
    <p class="small" id="ajEscenasAviso" role="status">El video completo de cada tutora vive solo en tus aparatos, nunca en GitHub. Cada archivo empieza con el número de su lección, por ejemplo «6010 - Esperanza.mp4». En la computadora eliges tu carpeta «Pelagos videos» una vez. En el celular, pásala por USB y toca «Importar videos».</p>
    <h3>Tu almacén de Cloudflare</h3>
    <p id="ajNubeHay">Revisando…</p>
    <div class="campos">
      <label>Access Key ID<input class="campo" type="text" id="ajNubeId" autocomplete="off" spellcheck="false"></label>
      <label>Secret Access Key<input class="campo" type="password" id="ajNubeSecreto" autocomplete="off" spellcheck="false"></label>
      <label>Enlace S3 API<input class="campo" type="url" id="ajNubeUrl" autocomplete="off" spellcheck="false" placeholder="https://….r2.cloudflarestorage.com"></label>
    </div>
    <div class="go"><button type="button" class="ub" id="ajNubeGuardar">Guardar</button><button type="button" class="ub" id="ajNubeProbar">Probar</button><button type="button" class="ub" id="ajNubeQuitar" hidden>Quitar</button></div>
    <p class="small" id="ajNubeAviso" role="status">Con tu almacén, «Ver la escena completa» toma el video de Cloudflare en cualquier aparato, sin pasarlo por USB. Usa una llave de R2 de solo lectura («Object Read only») para la cubeta «pelagos-videos». Se guarda en tu repositorio privado: la pones una vez y tus otros aparatos la toman de ahí.</p>
  </section>
  <section class="card" id="ajPremios">
    <h2>GIFs de los premios</h2>
    <p class="small">Cuando ganas un premio, tocas su dibujito en el Tablero y su GIF pasa al fondo. Lo vuelves a tocar y regresa el fondo de siempre.</p>
    <div class="premiosGif">${PREMIOS.map(([k, nombre, ic]) => `<label class="ub premioSube"><span class="sello ${ic} ok">${SELLOS[ic]}</span><span>${nombre}</span><span class="small" data-premiohay="${k}">${ultimaEscena(salaPremio(k)) ? "✓ Tiene GIF" : "Sin GIF"}</span><input type="file" data-premiosube="${k}" accept=".gif,.mp4,.webm,image/gif,video/mp4,video/webm" hidden></label>`).join("")}</div>
    <p class="small" id="ajPremiosAviso" role="status"></p>
  </section>
  <section class="card" id="ajApp">
    <h2>Pelagos como app</h2>
    ${yaEsApp()
      ? "<p>Ya la estás usando como app, en su propia ventana.</p>"
      : `<p>Con su propio ícono y su propia ventana, sin las barras del navegador.</p>
         <div class="go"><button type="button" class="ub grande" id="ajInstalar"${ofertaDeInstalar ? "" : " hidden"}>Instalar Pelagos</button></div>
         <p class="small">${esIphone
           ? "En iPhone: abre esta página en Safari, toca Compartir y luego «Agregar a inicio». Ahí dentro vas a poner tu llave otra vez, una sola vez."
           : "Si no ves el botón: en el menú de tu navegador busca «Instalar Pelagos» o «Agregar a la pantalla principal»."}</p>`}
    <div class="go"><button type="button" class="ub" id="ajRecargar">Recargar Pelagos</button></div>
  </section>
  <section class="card">
    <h2>Lo que hay</h2>
    <p>${P.temas.length} temas, ${P.temas.filter((t) => t.leccion).length} con lección, ${plural(P.preguntas.length, "pregunta", "preguntas")}, ${plural(tarjetas.size, "palabra de vocabulario", "palabras de vocabulario")}.</p>
    <p>${plural(E.respuestas, "respuesta tuya", "respuestas tuyas")} en ${plural(E.kwizzes.size, "quiz", "quizzes")}${aparatos.length ? `, desde ${plural(aparatos.length, "aparato", "aparatos")}: ${aparatos.map(esc).join(", ")}` : ""}.</p>
    <p class="small">Contenido: versión ${esc(P.huella || "sin número")}.</p>
  </section>
  <section class="card">
    <h2>La llave</h2>
    <p>Quitarla cierra Pelagos en este aparato y borra de aquí las copias de tus lecciones. Tu avance sigue en tu repositorio.</p>
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
      if (b.dataset.ambienteIr === "limpio") document.documentElement.dataset.ambiente = "limpio"; else delete document.documentElement.dataset.ambiente;
      marcarAmbiente();
    });
  }
  marcarAmbiente();
  // El video de fondo: subirlo o quitarlo.
  cargarVideosFondo();
  const avisoVideo = (t) => { $("ajVideoAviso").textContent = t; };
  const listoVideo = (l) => {
    videosFondo = l;
    $("ajVideoHay").textContent = videoFondo() ? "Ya tienes un fondo con movimiento." : "Ahora se usa la foto del día.";
    $("ajVideoQuitar").hidden = !videoFondo();
  };
  $("ajVideoArch").addEventListener("change", async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    avisoVideo("Subiendo el video…");
    try { listoVideo(await A.escenaSubir("inicio", f, "Fondo del Tablero")); avisoVideo("¡Listo! Ve al Tablero para verlo."); }
    catch (e) { avisoVideo(e && e.message ? e.message : "No se pudo subir el video."); }
  });
  // Los GIFs de los premios: uno por premio; el nuevo reemplaza al anterior.
  for (const inp of vista.querySelectorAll("[data-premiosube]")) {
    inp.addEventListener("change", async () => {
      const f = inp.files && inp.files[0], k = inp.dataset.premiosube, nombre = PREMIOS.find((x) => x[0] === k)[1];
      inp.value = "";
      if (!f) return;
      const aviso = $("ajPremiosAviso");
      aviso.textContent = "Subiendo el GIF de " + nombre + "…";
      try {
        let l = await A.escenaSubir(salaPremio(k), f, "Premio: " + nombre);
        const nuevo = l.filter(esMovimiento).slice(-1)[0];
        for (const x of l.filter((y) => esMovimiento(y) && y !== nuevo)) l = await A.escenaQuitar(salaPremio(k), x.archivo);
        escenasPorSala.set(salaPremio(k), l);
        vista.querySelector(`[data-premiohay="${k}"]`).textContent = "✓ Tiene GIF";
        aviso.textContent = "¡Listo! Ya está el GIF de " + nombre + ".";
      } catch (e) { aviso.textContent = e && e.message ? e.message : "No se pudo subir el GIF."; }
    });
  }
  const escenasHay = async () => {
    const c = await V.nombreCarpeta(), n = await V.cuantosImportados();
    if ($("ajEscenasHay")) $("ajEscenasHay").textContent = [c ? "Carpeta: «" + c + "»." : "", n ? plural(n, "video guardado", "videos guardados") + " en este aparato." : ""].filter(Boolean).join(" ") || "Todavía no hay videos en este aparato.";
  };
  const nubeHay = async (fresco) => {
    const d = await datosNube(fresco);
    if ($("ajNubeHay")) $("ajNubeHay").textContent = d ? "Conectado al almacén «" + d.cubeta + "» (llave " + d.id.slice(0, 6) + "…)." : "Todavía no conectas tu almacén.";
    if ($("ajNubeQuitar")) $("ajNubeQuitar").hidden = !d;
  };
  nubeHay(true);
  const nubeAviso = (t) => { if ($("ajNubeAviso")) $("ajNubeAviso").textContent = t; };
  $("ajNubeGuardar").addEventListener("click", async () => {
    const d = NB.limpiar({ id: $("ajNubeId").value, secreto: $("ajNubeSecreto").value, url: $("ajNubeUrl").value });
    if (!d.url) return nubeAviso("El enlace S3 API tiene que empezar con https:// y terminar en r2.cloudflarestorage.com.");
    if (!d.id || !d.secreto) return nubeAviso("Faltan el Access Key ID o la Secret Access Key.");
    nubeAviso("Guardando…");
    try {
      await A.nubeGuardar(d);
      nubeDatos = d;
      $("ajNubeId").value = $("ajNubeSecreto").value = $("ajNubeUrl").value = "";
      nubeAviso("Listo. Ahora toca «Probar».");
    } catch (e) { nubeAviso(e && e.message ? e.message : "No se pudo guardar."); }
    nubeHay(false);
  });
  $("ajNubeProbar").addEventListener("click", async () => {
    const d = await datosNube();
    if (!d) return nubeAviso("Primero guarda los datos de tu almacén.");
    const tu = (P.tutoras || []).find((t) => t.archivo);
    if (!tu) return nubeAviso("No hay ninguna tutora con video anotado para probar.");
    nubeAviso("Probando con «" + tu.archivo + "»…");
    const v = document.createElement("video");
    v.preload = "metadata"; v.muted = true;
    const fin = (ok) => { v.onloadedmetadata = v.onerror = null; v.removeAttribute("src"); v.load();
      nubeAviso(ok ? "¡Funciona! Cloudflare entregó «" + tu.archivo + "»." : "Cloudflare no entregó «" + tu.archivo + "». Puede que todavía no termine de subirse, o que la llave o el enlace estén mal."); };
    v.onloadedmetadata = () => fin(true);
    v.onerror = () => fin(false);
    v.src = await NB.enlace(d, tu.archivo, 300);
  });
  $("ajNubeQuitar").addEventListener("click", async () => {
    nubeAviso("Quitando…");
    try { await A.nubeGuardar(null); nubeDatos = null; nubeAviso("Listo. Pelagos ya no usa tu almacén."); } catch (e) { nubeAviso(e && e.message ? e.message : "No se pudo quitar."); }
    nubeHay(false);
  });
  escenasHay();
  if ($("ajEscenasCarpeta")) $("ajEscenasCarpeta").addEventListener("click", async () => {
    try { await V.elegirCarpeta(); $("ajEscenasAviso").textContent = "Listo. Pelagos ya sabe dónde están tus videos."; } catch { /* no eligió */ }
    escenasHay();
  });
  $("ajEscenasArch").addEventListener("change", async (ev) => {
    const archivos = [...(ev.target.files || [])];
    if (!archivos.length) return;
    $("ajEscenasAviso").textContent = "Guardando " + plural(archivos.length, "video", "videos") + "…";
    try {
      const n = await V.importar(archivos);
      $("ajEscenasAviso").textContent = n ? "Listo: " + plural(n, "video guardado", "videos guardados") + "." : "Ninguno empezaba con el número de su lección. Ejemplo: «6010 - Esperanza.mp4».";
    } catch { $("ajEscenasAviso").textContent = "Este aparato no dejó guardar los videos. Puede que no tenga espacio."; }
    ev.target.value = "";
    escenasHay();
  });
  $("ajVideoTodo").addEventListener("click", () => {
    const si = !movimientoEnTodo();
    guardar("pelagos.movimientoEnTodo", si ? "si" : "no");
    $("ajVideoTodo").setAttribute("aria-pressed", String(si));
    $("ajVideoTodo").textContent = "También en lecciones y tarjetas: " + (si ? "Sí" : "No");
    avisoVideo(si ? "Listo: las lecciones, los quizzes y las tarjetas llevan tu GIF en lugar de la foto." : "Listo: las lecciones, los quizzes y las tarjetas vuelven a sus fotos.");
  });
  $("ajVideoQuitar").addEventListener("click", async () => {
    avisoVideo("Quitando el video…");
    try {
      let l = videosFondo || [];
      for (const x of l.filter(esMovimiento)) l = await A.escenaQuitar("inicio", x.archivo);
      listoVideo(l); avisoVideo("Listo: vuelve la foto del día.");
    } catch (e) { avisoVideo(e && e.message ? e.message : "No se pudo quitar el video."); }
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

// ---------------------------------------------------------------- Vista previa de un tema enlazado

const hoja = $("sheet");
function abrirHoja(id) {
  const t = porId.get(Number(id));
  if (!t || !E) return;
  const i = info(t.id);
  $("shK").textContent = "Vista previa · " + t.nivel + " · " + (CATEGORIAS[t.categoria] || t.categoria);
  $("shT").textContent = titulo(t);
  $("shR").textContent = t.regla || "Este tema todavía no tiene lección ni resumen propio.";
  $("shP").textContent = "Tu porcentaje: " + pct(i.pct) + (i.n === 0 ? " · de Kwiziq" : " · " + plural(i.n, "respuesta", "respuestas"));
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

window.addEventListener("hashchange", () => { callar(); cerrarHoja(); enPreguntaDe = null; enTarjetaDe = null; pintar(); });

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
