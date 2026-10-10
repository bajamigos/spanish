// Las páginas de Pelagos. Todo se arma en el navegador: no hay servidor propio.
import * as N from "./nucleo.js?v=2737c61ba6";
import * as A from "./almacen.js?v=2737c61ba6";

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
const SECCIONES = {
  gramatica: ["Gramática", [["lecciones", "#/gramatica", "Lecciones de gramática"], ["quiz", "#" + QUIZ, "Quiz de gramática"]]],
  vocabulario: ["Vocabulario", [["quiz", "#/vocabulario", "Quiz de vocabulario"], ["lista", "#/vocabulario/lista", "Lista de vocabulario"]]],
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre"];

// ---------------------------------------------------------------- Lo que la página sabe

let P = null;                 // el paquete de contenido
let E = null;                 // el estado calculado de los sucesos
let porId = new Map();        // tema por número
let porSlug = new Map();      // tema por nombre de lección
let preguntas = new Map();    // pregunta por id
let fotos = new Map();        // portada por nombre
let retratos = new Map();     // retrato de Andrea por nombre
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
  return `<nav class="jump dos sec" aria-label="${nombre}">${lista.map(([clave, href, texto]) =>
    `<a href="${href}"${clave === actual ? ' aria-current="page"' : ""}>${texto}</a>`).join("")}</nav>`;
}

/** Un tema como botón de dos líneas. Con lección, lleva a ella; sin lección, sube la vista previa. */
function botonTema(t, { nivel = true, sub = "", anchoNombre = false, ingles = false } = {}) {
  const i = info(t.id);
  const abre = t.slug && t.leccion ? `<a class="tb" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tb" data-l="${t.id}">`;
  const cierra = t.slug && t.leccion ? "</a>" : "</button>";
  return abre +
    (nivel ? `<span class="lv">${esc(t.nivel)}</span>` : "") +
    `<span class="nm${anchoNombre ? " ancho" : ""}"${ingles && !t.titulo ? ' lang="en"' : ""}>${esc(titulo(t))}</span>` +
    `<span class="pc${esBajo(i.pct) ? " bajo" : ""}">${pct(i.pct)}</span>` +
    (sub ? `<span class="sm${anchoNombre ? " ancho" : ""}">${sub}</span>` : "") +
    barra(i.pct) + cierra;
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

/** Lo que el HTML no puede traer escrito: anchos de barras, portadas privadas y bocinas. */
function vestir(raiz) {
  for (const e of raiz.querySelectorAll("[data-w]")) e.style.width = e.dataset.w + "%";
  for (const e of raiz.querySelectorAll("[data-x]")) e.style.left = e.dataset.x + "%";
  for (const img of raiz.querySelectorAll("img[data-foto]")) {
    A.foto(fotos.get(img.dataset.foto)).then((u) => {
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
  for (const img of raiz.querySelectorAll("img[data-retrato]")) {
    // Sin retrato (no llegó, o no hay conexión) la página de Hoy se acomoda como si no hubiera foto.
    A.foto(retratos.get(img.dataset.retrato), "andrea").then((u) => {
      if (!img.isConnected) return;
      if (u) img.src = u; else { const h = img.closest(".hoy"); if (h) h.classList.remove("confoto"); document.body.classList.remove("conandrea"); }
    });
  }
  bocinas(raiz);
}

const ICONO_BOCINA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
/** Botones de bocina en los ejemplos, solo donde el navegador sabe hablar. */
function bocinas(raiz) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  for (const li of raiz.querySelectorAll(".ex[data-di]")) {
    const texto = li.dataset.di;
    const b = document.createElement("button");
    b.type = "button"; b.className = "say"; b.innerHTML = ICONO_BOCINA; b.setAttribute("aria-label", "Escuchar: " + texto);
    b.addEventListener("click", () => {
      try {
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "es-MX"; u.rate = 0.8;
        const voces = window.speechSynthesis.getVoices();
        const v = voces.find((x) => x.lang === "es-MX") || voces.find((x) => /^es/i.test(x.lang));
        if (v) u.voice = v;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch { /* sin voz: el botón no hace nada */ }
    });
    li.appendChild(b);
  }
}

const RUTAS = [
  [/^\/$/, verInicio],
  [/^\/gramatica$/, verBiblioteca],
  [/^\/gramatica\/quiz$/, verKwiz],
  [/^\/gramatica\/quiz\/([A-Za-z0-9_-]+)$/, verPregunta],
  [/^\/gramatica\/quiz\/([A-Za-z0-9_-]+)\/resultado$/, verResultado],
  [/^\/gramatica\/([a-z0-9]+)(\/bajo)?$/, verNivel],
  [/^\/mapa$/, verMapa],
  [/^\/leccion\/([a-z0-9-]+)$/, verLeccion],
  [/^\/vocabulario$/, verTarjetas],
  [/^\/vocabulario\/lista$/, verLista],
  [/^\/ajustes$/, verAjustes],
  // Las direcciones de antes siguen llevando a su página.
  [/^\/kwiz((?:\/[A-Za-z0-9_-]+){0,2})$/, (o, resto) => ir(QUIZ + (resto || ""), true)],
  [/^\/tarjetas$/, () => ir("/vocabulario", true)],
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
  const filas = new Map(Object.keys(NIVELES).map((n) => [n, { nivel: n, temas: 0, bajo: 0, suma: 0, con: 0, lecciones: 0 }]));
  for (const t of P.temas) {
    const f = filas.get(t.nivel);
    if (!f) continue;
    const i = info(t.id);
    f.temas++;
    if (i.pct !== null) { f.suma += i.pct; f.con++; }
    if (esBajo(i.pct)) f.bajo++;
    if (t.leccion) f.lecciones++;
  }
  return [...filas.values()].filter((f) => f.temas).map((f) => ({ ...f, promedio: f.con ? f.suma / f.con : null }));
}

function botonNivel(n, conLecciones, corto = false) {
  return `<a class="tb" href="#/gramatica/${n.nivel.toLowerCase()}">
    <span class="lv">${n.nivel}</span><span class="nm">${NIVELES[n.nivel]}</span><span class="pc">${pct(n.promedio)}</span>
    ${corto ? "" : `<span class="sm">${plural(n.temas, "tema", "temas")} · ${n.bajo} bajo ${meta()}%${conLecciones ? ` · ${n.lecciones} con lección` : ""}</span>`}
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
const SELLOS = {
  puno: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect class="s1" x="10" y="22.5" width="12" height="7" rx="1.6"/><rect class="s1" x="6.5" y="5.4" width="4.7" height="11" rx="2.35"/><rect class="s1" x="11.3" y="4" width="4.7" height="12" rx="2.35"/><rect class="s1" x="16.1" y="4" width="4.7" height="12" rx="2.35"/><rect class="s1" x="20.9" y="5.4" width="4.7" height="11" rx="2.35"/><rect class="s1" x="6.5" y="11.5" width="19.1" height="12.6" rx="4.6"/><path class="s2" d="M5.6 15.2c2.4-1.5 8-1.9 11-.8 1.9.7 2.1 3.3.3 4.2-2.9 1.4-7.9 1.5-10.9.5-1.9-.7-2.100-2.800-.4-3.900z"/></svg>',
  labios: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M2.5 15.200C6.500 8.800 11.800 7.300 16 10.800c4.200-3.500 9.500-2 13.500 4.400-4.600-1-9-.2-13.500-.200s-8.900-.8-13.500.2z"/><path class="s1" d="M3.200 16.700c4.300.9 8.500.3 12.800.3s8.500.6 12.800-.3C25.600 23.200 20.900 26 16 26s-9.600-2.800-12.800-9.300z"/><path class="s3" d="M9.500 19.600c2 1.700 4.200 2.500 6.500 2.500s4.500-.8 6.500-2.500"/></svg>',
  papaya: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 2.600c5.800 0 10.200 7.200 10.200 15.200 0 7.100-4.400 11.800-10.200 11.800S5.800 24.900 5.800 17.800C5.800 9.800 10.200 2.600 16 2.600z"/><path class="s2" d="M16 9.800c2.900 0 4.800 4.200 4.800 8.800 0 4-1.900 6.600-4.800 6.600s-4.800-2.600-4.800-6.600c0-4.600 1.900-8.800 4.800-8.800z"/><g class="s3"><circle cx="15" cy="13.600" r="1"/><circle cx="17.400" cy="15.800" r="1"/><circle cx="14.600" cy="17.400" r="1"/><circle cx="17.200" cy="19.600" r="1"/><circle cx="14.800" cy="21.400" r="1"/><circle cx="17" cy="22.900" r=".9"/></g></svg>',
  durazno: '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="s1" d="M16 8.200C9.200 5.800 3.600 10.800 4 18c.4 7 5.800 11.600 12 11.600S27.600 25 28 18c.4-7.200-5.200-12.200-12-9.800z"/><path class="s3" d="M16.400 8.600c-3.600 4.800-4 12.800-1.200 19.800"/><path class="s2" d="M16 8.200c.8-4 4.400-6 8.600-4.800-.8 3.800-4.200 5.600-8.600 4.800z"/></svg>',
};

/** Una medida del día como cuadro: nombre, número grande, barra y si ya se cumplió. «sello» es lo que se gana con ella. */
function cuadro(nombre, valor, de, unidad, estado, hecho, enlace = "", sello = null) {
  const aCero = de === 0;       // medidas que se cumplen al llegar a cero, como las tarjetas pendientes
  const [abre, cierra] = enlace ? [`a href="${enlace}"`, "a"] : ["div", "div"];
  return `<${abre} class="cuadro${hecho ? " hecho" : ""}${sello ? " consello" : ""}" role="listitem">
    ${sello ? `<span class="sello ${esc(sello.icono)} ${sello.va ? "ok" : "no"}">${SELLOS[sello.icono]}</span><span class="sr">${esc(sello.nombre)}: ${sello.va ? "ganado" : "falta"}. </span>` : ""}
    <span class="cn">${esc(nombre)}</span>
    <span class="cv">${esc(valor)}${aCero ? "" : `<small> de ${esc(de)}${unidad ? " " + esc(unidad) : ""}</small>`}</span>
    ${aCero ? '<span class="bar vacia"></span>' : barra(de ? (valor / de) * 100 : 0)}
    <span class="ce">${hecho ? ICONO_SI : ICONO_NO}${esc(estado)}</span>
  </${cierra}>`;
}

function verInicio(o) {
  const niveles = resumenNiveles();
  const abierto = N.kwizAbierto(E);
  const hoy = N.fechaLocal(new Date());
  const T = N.leerTablero(A.tablero());
  const deHoy = !!T && T.dia === hoy;
  const retrato = T && T.foto && retratos.has(T.foto) ? T.foto : null;
  const cuadernos = (P.cuadernos || []).map((c) => `
  <section class="card">
    <h2>${esc(c.nombre)}</h2>
    <div class="links">${c.temas.map((id) => porId.get(id)).filter(Boolean).map((t) => botonTema(t)).join("")}</div>
  </section>`).join("");
  const lista = N.listaDeEstudio(P, E);

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
  const ganables = partes.filter((x) => x.con && x.con !== "siempre" && x.con !== "todas");
  for (const x of partes) if (x.va === null) x.va = ganables.length > 0 && ganables.every((y) => y.va);
  // Una parte con dibujito va en la esquina del cuadro de su medida, en lugar de ocupar un renglón aparte.
  const sello = (con) => partes.find((x) => x.con === con && x.icono && SELLOS[x.icono]) || null;
  const premio = sello("todas");        // lo que se gana con todas juntas no tiene cuadro propio: va en la esquina de la tarjeta del check-in
  const conSellos = partes.some((x) => x.icono && SELLOS[x.icono]);

  // ---- Las medidas del día. Los kwizzes y las tarjetas los cuenta Pelagos; lo demás viene del tablero.
  const cuadros = [cuadro("Gramática", kw, metaKw, "quizzes", kw >= metaKw ? "Cumplido" : `Faltan ${metaKw - kw}`, kw >= metaKw, "#" + QUIZ, sello("kwizzes"))];
  if (tj !== null) cuadros.push(cuadro("Vocabulario", tj, 0, "", tj === 0 ? "Cumplido" : "Por repasar", tj === 0, "#/vocabulario", sello("tarjetas")));
  for (const m of T ? T.medidas : []) {
    if (tarjetas.size && /anki/i.test(m.nombre)) continue;        // con tarjetas propias, las de fuera ya no se enseñan
    const hecho = m.de === 0 ? m.valor === 0 : m.valor >= m.de;
    const falta = Math.round((m.de - m.valor) * 10) / 10;
    cuadros.push(cuadro(m.nombre, m.valor, m.de, m.unidad, hecho ? "Cumplido" : m.de === 0 ? "Meta: cero" : `Faltan ${falta}`, hecho, "", sello("medida:" + m.nombre)));
  }
  // Solo se dice de cuándo son los números de fuera si no son de hoy.
  const medidas = `
  <section class="card" id="medidas">
    <h2 class="sr">Tus medidas de hoy</h2>
    <div class="cuadros" role="list">${cuadros.join("")}</div>
    ${T && T.extras.length ? `<div class="extras">${T.extras.map((x) => `<div><b>${esc(x.valor)}</b>${esc(x.nombre)}</div>`).join("")}</div>` : ""}
    ${T && !deHoy ? `<p class="small viejo">No es de hoy: es del ${diaLargo(T.dia)}.</p>` : ""}
  </section>`;

  // ---- El check-in: si hay episodio esperándote.
  // Un renglón de texto, no un botón: «Check-in nuevo: 07 · Viernes 9-Oct · 2pm», y abajo si ya lo escuchaste.
  const nombreCi = c && c.titulo ? c.titulo.replace(/^check-?in\s*/i, "") : "";
  const rotuloCi = !c ? "" : c.estado === "ninguno" ? "Sin check-in hoy"
    : (!deHoy ? "Check-in anterior" : c.estado === "nuevo" ? "Check-in nuevo" : "Check-in") + (nombreCi ? ": " + nombreCi : "");
  const checkin = !c ? "" : `
  <section class="card${premio ? " consello" : ""}" id="checkin">
    ${premio ? `<span class="sello grande ${esc(premio.icono)} ${premio.va ? "ok" : "no"}">${SELLOS[premio.icono]}</span><span class="sr">${esc(premio.nombre)}: ${premio.va ? "ganado" : "falta"}. </span>` : ""}
    <h2 class="sr">Check-in</h2>
    <p class="ciLinea">${esc(rotuloCi)}</p>
    ${c.estado === "ninguno" ? "" : `<p class="ciOido ${c.estado === "oido" ? "si" : "no"}">${c.estado === "oido" ? ICONO_SI + "Escuchado" : ICONO_NO + "Sin escuchar"}</p>`}
    ${partes.length && !conSellos ? `<ul class="partes" data-n="${partes.length}">${partes.map((x) => `<li class="${x.va ? "va" : "nova"}"><span>${esc(x.nombre)}</span><span class="sr">${x.va ? ": ganado" : ": falta"}</span></li>`).join("")}</ul>` : ""}
  </section>`;

  poner(`
  <div class="hoy${retrato ? " confoto" : ""}">
    ${retrato ? `<div class="fondo"><img data-retrato="${esc(retrato)}" alt="${esc(T.atuendo ? "Andrea hoy: " + T.atuendo : "Andrea hoy")}"></div>` : ""}
    <div class="sobre">
      <section class="card" id="arranque">
        <h1 class="sr">Tablero</h1>
        <p class="fechaHoy">${esc(diaLargo(hoy))}</p>
        <button type="button" class="ub redondo" id="hoyRecargar" aria-label="Recargar Pelagos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.500 12a7.500 7.500 0 1 1-2.300-5.400" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/><path d="M18.500 2.800v4.700h-4.700" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="go">${abierto
          ? `<a class="ub grande" href="#${QUIZ}/${esc(abierto.id)}">Seguir el quiz</a>`
          : lista.temas.length
            ? `<button type="button" class="ub grande" data-kwiz='{"tipo":"lista"}'>Pelagos Quiz</button>`
            : `<a class="ub grande" href="#${QUIZ}">Ver los quizzes</a>`}</div>
      </section>
      ${checkin}
      ${medidas}
      <section class="card" id="niveles">
        <h2>Promedio por nivel</h2>
        <div class="links">${niveles.map((n) => botonNivel(n, false, true)).join("")}</div>
      </section>${cuadernos}
    </div>
  </div>`,
  { titulo: "Tablero · Pelagos", nav: "inicio", conserva: o.conserva });
  // Recargar trae lo último de todo: tu avance, el tablero y la página misma. En la app instalada no hay otro botón para eso.
  $("hoyRecargar").addEventListener("click", () => window.location.reload());
}

function verBiblioteca(o) {
  poner(`
  ${entradas("gramatica", "lecciones")}
  <section class="card">
    <h1 class="h">Lecciones de gramática</h1>
    <p>Todos los temas, por nivel. Elige uno.</p>
    <div class="links">${resumenNiveles().map((n) => botonNivel(n, true)).join("")}</div>
  </section>`, { titulo: "Lecciones de gramática · Pelagos", nav: "gramatica", conserva: o.conserva });
}

function verNivel(o, clave, soloBajo) {
  const nivel = clave.toUpperCase();
  if (!NIVELES[nivel]) return verNoExiste();
  const cola = soloBajo ? "/bajo" : "";
  const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
  const bajo = suyos.filter((t) => esBajo(info(t.id).pct)).length;
  const categorias = [];
  for (const t of suyos) {
    const i = info(t.id);
    if (soloBajo && !esBajo(i.pct)) continue;
    const nombre = CATEGORIAS[t.categoria] || t.categoria;
    if (!categorias.length || categorias[categorias.length - 1].nombre !== nombre) categorias.push({ nombre, temas: [], bajo: 0 });
    categorias[categorias.length - 1].temas.push(t);
    if (esBajo(i.pct)) categorias[categorias.length - 1].bajo++;
  }
  const abiertas = new Set([...vista.querySelectorAll("details.cat[open] .cn")].map((e) => e.textContent));
  poner(`
  <p class="crumb"><a href="#/gramatica">Gramática</a> · ${nivel}</p>
  <nav class="jump niveles" aria-label="Niveles">
    ${Object.keys(NIVELES).map((n) => `<a href="#/gramatica/${n.toLowerCase()}${cola}"${n === nivel ? ' aria-current="page"' : ""}>${n}</a>`).join("")}
  </nav>
  <header class="card">
    <h1 class="h">${nivel} · ${NIVELES[nivel]}</h1>
    <p>${suyos.length} temas. ${bajo} bajo ${meta()}%.</p>
    <nav class="jump dos" aria-label="Qué temas mostrar">
      <a href="#/gramatica/${clave}"${soloBajo ? "" : ' aria-current="page"'}>Todos</a>
      <a href="#/gramatica/${clave}/bajo"${soloBajo ? ' aria-current="page"' : ""}>Bajo ${meta()}%</a>
    </nav>
  </header>
  ${categorias.length ? categorias.map((c) => `
  <details class="card cat"${soloBajo || (o.conserva && abiertas.has(c.nombre)) ? " open" : ""}>
    <summary><span class="cn">${esc(c.nombre)}</span><span class="cc">${plural(c.temas.length, "tema", "temas")}${soloBajo ? "" : ` · ${c.bajo} bajo ${meta()}%`}</span></summary>
    <div class="links">${c.temas.map((t) => {
      const i = info(t.id);
      const sub = [t.leccion ? "Con lección" : "", i.n ? plural(i.n, "respuesta", "respuestas") : ""].filter(Boolean).join(" · ");
      return botonTema(t, { nivel: false, anchoNombre: true, ingles: true, sub });
    }).join("")}</div>
  </details>`).join("") : `<section class="card"><p>Ningún tema de ${nivel} está bajo ${meta()}%.</p></section>`}`,
  {
    titulo: nivel + " · Lecciones de gramática · Pelagos", nav: "gramatica", conserva: o.conserva,
    pie: "<p>Toca una categoría para abrirla. Los temas en inglés todavía no tienen lección propia: llevan el nombre que les da Kwiziq.</p><p>Un porcentaje sin número de respuestas es tu arranque de Kwiziq.</p>",
  });
}

// ---------------------------------------------------------------- El mapa de árbol

let anchoDelMapa = 0;         // el ancho con el que se dibujó, para volver a dibujarlo si la pantalla cambia

/** Todos los temas en un mapa: una tarjeta por nivel, de C1 a A0; dentro, una caja por tipo de palabra y un cuadro de color por tema. */
function verMapa(o) {
  const W = Math.max(240, vista.clientWidth - 18);       // lo que queda dentro de la tarjeta
  anchoDelMapa = vista.clientWidth;
  const cuenta = [0, 0, 0, 0, 0, 0];
  const tarjetas = Object.keys(NIVELES).reverse().map((nivel) => {
    const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
    if (!suyos.length) return "";
    const porTipo = new Map();
    let suma = 0, con = 0;
    for (const t of suyos) {
      if (!porTipo.has(t.categoria)) porTipo.set(t.categoria, []);
      porTipo.get(t.categoria).push(t);
      const v = info(t.id).pct;
      if (v !== null) { suma += v; con++; cuenta[N.franja(v)]++; }
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
          const v = info(t.id).pct, f = N.franja(v);
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
      <h2><span class="lv">${nivel}</span> ${NIVELES[nivel]} <span class="mpc">${pct(con ? suma / con : null)}</span></h2>
      <div class="mmapa" data-alto="${lugar.alto}">${cajas.join("")}</div>
    </section>`;
  }).join("");

  // La portada Reef del día va fija al fondo.
  const foto = portadaDelDia();
  poner(`
  <div class="hoy mapa${foto ? " confoto" : ""}">
    ${foto ? `<div class="fondo"><img data-foto="${esc(foto)}" alt=""></div>` : ""}
    <div class="sobre">
      <h1 class="sr">Mapa de tus temas</h1>
      ${tarjetas}
      <section class="card" id="clave">
        <h2 class="sr">Qué significa cada color</h2>
        <ul class="clave">${N.FRANJAS.map((nombre, i) => `<li><i class="mc k${i}"></i><span>${nombre}</span><b>${cuenta[i]}</b></li>`).join("")}</ul>
      </section>
    </div>
  </div>`,
  { titulo: "Mapa · Pelagos", nav: "mapa", conserva: o.conserva });
}

window.addEventListener("resize", () => {
  // Si la pantalla cambia de ancho (o el teléfono se voltea), el mapa se vuelve a dibujar a la medida.
  if (vista.querySelector(".nivelMapa") && Math.abs(vista.clientWidth - anchoDelMapa) > 8) pintar({ conserva: true });
});

// ---------------------------------------------------------------- El quiz de vocabulario

let enTarjetaDe = null;       // la tarjeta que está en pantalla: no se repinta debajo de ti

/**
 * Tu vocabulario. Sale una tarjeta a la vez: el frente en inglés. Lo dices en español, tocas en cualquier parte para ver
 * la respuesta y te calificas con «Mal» o «Bien», que están siempre en el mismo lugar. Al calificar sale la siguiente.
 */
function verTarjetas(o) {
  if (o.conserva && enTarjetaDe) { enPregunta = true; return; }
  const hoy = N.fechaLocal(new Date());
  const dia = N.tarjetasDelDia(P, E, hoy);
  if (!dia.pendientes.length) {
    // Cuándo vuelve a tocar algo, para que «en cero» no parezca que se acabaron para siempre.
    const fechas = mazo().map((c) => E.tarjetas.get(c.id)).filter((x) => x && !x.quitada && x.toca && x.toca > hoy).map((x) => x.toca).sort();
    return poner(`
    ${entradas("vocabulario", "quiz")}
    <section class="card" id="tjCero">
      <h1 class="h">${dia.total ? "Vocabulario en cero" : "Todavía no hay vocabulario"}</h1>
      ${dia.total ? `<p>Hoy repasaste ${dia.hechasHoy} de tus ${plural(dia.total, "palabra", "palabras")}.${fechas.length ? ` Las siguientes tocan el ${fecha(fechas[0])}.` : ""}</p>` : "<p>Cuando haya palabras en el contenido, aquí salen las de cada día.</p>"}
      <div class="go"><a class="ub grande" href="#/">Tablero</a></div>
    </section>`, { titulo: "Quiz de vocabulario · Pelagos", nav: "vocabulario", conserva: o.conserva });
  }
  const antes = E.tarjetas.get(dia.pendientes[0]);
  const c = N.tarjetaVista(tarjetas.get(dia.pendientes[0]), antes);
  const foto = P.fotos.length ? P.fotos[Math.floor(N.azarDe(c.id + "#" + hoy + "#" + antes.n)() * P.fotos.length)] : null;
  const total = dia.hechasHoy + dia.pendientes.length;

  poner(`
  ${entradas("vocabulario", "quiz")}
  <section class="kw tj">
    <header class="hero kwh tjh">
      <div class="ratio"></div>
      ${foto ? `<img data-foto="${esc(foto.nombre)}" alt="">` : ""}
      <div class="over">
        <p class="lead"><span id="tjFaltan">${dia.pendientes.length === 1 ? "Falta 1" : "Faltan " + dia.pendientes.length}</span><span id="tjAviso">Dilo en español</span></p>
        <div class="score"><div class="track" role="img" aria-label="Llevas ${dia.hechasHoy} de ${total}"><i data-w="${100 * dia.hechasHoy / total}"></i></div></div>
        <h1 class="cue" id="cue" lang="en">${esc(c.frente)}</h1>
      </div>
      <div class="rule tjResp" id="tjResp" tabindex="-1" aria-live="polite" hidden>
        <ul class="exs"><li class="ex" data-di="${esc(c.reverso)}"><span class="es" id="vResp">${esc(c.reverso)}</span>${c.nota ? `<span class="en" lang="es">${esc(c.nota)}</span>` : ""}</li></ul>
        ${c.tambien_vale && c.tambien_vale.length ? `<p class="small">También vale: ${esc(c.tambien_vale.join(" · "))}</p>` : ""}
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
    A.apuntar({ t: "tj", id: N.nuevoId("t"), tarjeta: c.id, cuando: new Date().toISOString(), bien: bien ? 1 : 0, modo: "tocar" });
    recalcular();
    enTarjetaDe = null;
    pintar();        // sin paso intermedio: sale la siguiente, o «Vocabulario en cero»
  }
  toque = () => destapar();
  teclas = { " ": () => destapar(true), enter: () => destapar(true) };
  $("jBien").addEventListener("click", () => calificar(true));
  $("jMal").addEventListener("click", () => calificar(false));
}

// ---------------------------------------------------------------- La lista de vocabulario

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

/** La portada Reef del día: cambia cada día. */
function portadaDelDia() {
  const hoy = new Date(), lista = P.fotos || [];
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
  for (const x of vivas) { if (x.pct === null) sinVer++; else cuenta[N.franja(x.pct)]++; }
  const tocan = N.tarjetasDelDia(P, E, hoy).pendientes.length;
  const foto = portadaDelDia();
  const abiertas = !!vista.querySelector("#lvQuitadas[open]");
  poner(`
  <div class="hoy mapa lista${foto ? " confoto" : ""}">
    ${foto ? `<div class="fondo"><img data-foto="${esc(foto)}" alt=""></div>` : ""}
    <div class="sobre">
      ${entradas("vocabulario", "lista")}
      <section class="card" id="lvCabeza">
        <h1 class="h">Lista de vocabulario</h1>
        <p>${plural(vivas.length, "palabra", "palabras")}. ${tocan === 0 ? "Hoy no queda ninguna por repasar." : tocan === 1 ? "Hoy queda 1 por repasar." : `Hoy quedan ${tocan} por repasar.`}</p>
        <label class="sr" for="lvBusca">Buscar una palabra</label>
        <input id="lvBusca" class="campo" type="search" placeholder="Buscar una palabra" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
        <div class="jump cuatro" role="group" aria-label="En qué orden salen">${ORDENES.map(([clave, nombre]) => `<button type="button" data-orden="${clave}" aria-pressed="${clave === lvOrden}">${nombre}</button>`).join("")}</div>
        <div class="go"><button type="button" class="ub" id="lvAgregar">Agregar una palabra</button></div>
        ${!lvAviso ? "" : lvAviso.nueva
          ? `<p class="small" id="lvAviso" role="status">Agregaste «${esc(lvAviso.texto)}». Va a salir en tu quiz como palabra nueva.</p>`
          : `<p class="small" id="lvAviso" role="status">Quitaste «${esc(lvAviso.texto)}». <button type="button" class="lk" id="lvDeshacer">Deshacer</button></p>`}
      </section>
      <section class="card" id="lvLista">
        <h2 class="sr">Tus palabras</h2>
        <p class="small" id="lvCuenta" role="status"></p>
        <div class="lvCeldas" id="lvCeldas"></div>
        <div class="go"><button type="button" class="ub" id="lvMas" hidden></button></div>
      </section>
      <section class="card" id="clave">
        <h2 class="sr">Qué significa cada color</h2>
        <p class="small">El color es tu porcentaje de aciertos.</p>
        <ul class="clave">${N.FRANJAS.map((nombre, i) => `<li><i class="mc k${i}"></i><span>${nombre}</span><b>${cuenta[i]}</b></li>`).join("")}<li><i class="mc kx"></i><span>Sin ver</span><b>${sinVer}</b></li></ul>
      </section>
      ${quitadas.length ? `
      <details class="card cat" id="lvQuitadas"${abiertas ? " open" : ""}>
        <summary><span class="cn">Quitadas</span><span class="cc">${plural(quitadas.length, "palabra", "palabras")}. Ya no salen en tu quiz.</span></summary>
        <div class="links">${quitadas.map((x) => `<button type="button" class="tb" data-devolver="${esc(x.id)}"><span class="nm ancho" lang="es-MX">${esc(x.c.reverso)}</span><span class="pc">Devolver</span><span class="sm ancho" lang="en">${esc(x.c.frente)}</span></button>`).join("")}</div>
      </details>` : ""}
    </div>
  </div>`,
  { titulo: "Lista de vocabulario · Pelagos", nav: "vocabulario", conserva: o.conserva });

  const campo = $("lvBusca");
  campo.value = lvBusca;
  function celdas() {
    const q = paraBuscar(lvBusca);
    const salen = (q ? vivas.filter((x) => [x.c.reverso, x.c.frente, ...(x.c.tambien_vale || [])].some((t) => paraBuscar(t).includes(q))) : vivas.slice()).sort(ORDENAR[lvOrden] || alfabeto);
    $("lvCeldas").innerHTML = salen.slice(0, lvCuantas).map((x) => {
      const f = N.franja(x.pct);
      return `<button type="button" class="vc ${f === null ? "kx" : "k" + f}" data-v="${esc(x.id)}" lang="es-MX" aria-label="${esc(x.c.reverso)}: ${x.pct === null ? "sin ver" : pct(x.pct) + " de aciertos"}">${esc(x.c.reverso)}</button>`;
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
  $("lvAgregar").addEventListener("click", nuevaPalabra);
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

/** Los cuatro renglones de una palabra, para corregirla o para agregar una nueva. */
function formaPalabra(c, escondida) {
  return `
    <form id="hvForma" class="forma" autocomplete="off"${escondida ? " hidden" : ""}>
      <label class="small" for="hvEs">En español</label>
      <input id="hvEs" class="campo" type="text" lang="es" value="${esc(c.reverso || "")}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <label class="small" for="hvEn">En inglés</label>
      <input id="hvEn" class="campo" type="text" lang="en" value="${esc(c.frente || "")}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <label class="small" for="hvTv">También vale (separadas con punto y coma)</label>
      <input id="hvTv" class="campo" type="text" lang="es" value="${esc((c.tambien_vale || []).join("; "))}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <label class="small" for="hvNt">Nota</label>
      <textarea id="hvNt" class="campo" rows="2" lang="es">${esc(c.nota || "")}</textarea>
      <p class="err" id="hvError" role="alert" hidden></p>
      <div class="go"><button type="button" class="ub" id="hvCancelar">Cancelar</button><button type="submit" class="ub grande">Guardar</button></div>
    </form>`;
}
/** Lo que hay escrito en la forma, ya limpio; null (y un aviso) si le falta el español o el inglés. */
function leerForma() {
  const limpio = (t) => t.replace(/\s+/g, " ").trim();
  const reverso = limpio($("hvEs").value), frente = limpio($("hvEn").value), nota = limpio($("hvNt").value);
  const tambienVale = $("hvTv").value.split(";").map(limpio).filter(Boolean);
  if (!reverso || !frente) { $("hvError").hidden = false; $("hvError").textContent = "Le falta el español o el inglés."; return null; }
  return { reverso, frente, nota, tambienVale };
}

/** Agregar una palabra a mano: es un renglón más de tu avance, y entra a tu quiz como palabra nueva. */
function nuevaPalabra() {
  $("hvIn").innerHTML = `
    <span class="k">Vocabulario · Palabra nueva</span>
    <h2 id="hvT" tabindex="-1">Agregar una palabra</h2>
    ${formaPalabra({}, false)}`;
  $("hvCancelar").addEventListener("click", cerrarHoja);
  $("hvForma").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = leerForma();
    if (!f) return;
    if (palabras().some((x) => !x.s.quitada && paraBuscar(x.c.reverso) === paraBuscar(f.reverso))) { $("hvError").hidden = false; $("hvError").textContent = "Esa palabra ya está en tu vocabulario."; return; }
    A.apuntar({ t: "tjn", id: N.nuevoId("n"), tarjeta: N.nuevoId("tm"), cuando: new Date().toISOString(), frente: f.frente, reverso: f.reverso, tambien_vale: f.tambienVale, nota: f.nota });
    recalcular();
    lvAviso = { nueva: true, texto: f.reverso };
    lvBusca = "";
    cerrarHoja();
    pintar({ conserva: true });
  });
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvEs").focus();
}

// La ficha de una palabra: sube desde abajo, como la vista previa de un tema.
const hojaV = $("hojaV");
const REPASOS_A_LA_VISTA = 26;

function abrirPalabra(id) {
  const cruda = tarjetas.get(id), s = E && E.tarjetas.get(id);
  if (!cruda || !s) return;
  const c = N.tarjetaVista(cruda, s), v = N.aciertoDeTarjeta(s), hoy = N.fechaLocal(new Date());
  const n = s.baseN + s.n, bien = s.baseBien + s.bien;
  const ultimos = s.historia.slice(-REPASOS_A_LA_VISTA);
  const buenos = ultimos.filter((h) => h.bien).length;
  const tambien = (c.tambien_vale || []).join(" · ");
  // Cada repaso es una barrita, del más viejo al más nuevo: alta si la supiste, bajita si no.
  const grafica = !ultimos.length ? "" : `
    <figure class="hvG">
      <svg width="${ultimos.length * 11 - 3}" height="40" viewBox="0 0 ${ultimos.length * 11 - 3} 40" role="img" aria-label="${ultimos.length === 1 ? "Tu último repaso" : `Tus últimos ${ultimos.length} repasos`}: ${buenos} bien y ${ultimos.length - buenos} mal">${ultimos.map((h, i) =>
        h.bien ? `<rect class="gb" x="${i * 11}" y="2" width="8" height="38" rx="2"/>` : `<rect class="gm" x="${i * 11}" y="27" width="8" height="13" rx="2"/>`).join("")}</svg>
      <figcaption class="small">${ultimos.length === 1 ? "Tu último repaso" : `Tus últimos ${ultimos.length} repasos, del más viejo al más nuevo`}. Barra alta: bien. Barra bajita: mal.</figcaption>
    </figure>`;
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
    <ul class="exs"><li class="ex" data-di="${esc(c.reverso)}"><h2 class="es" id="hvT" lang="es-MX" tabindex="-1">${esc(c.reverso)}</h2><span class="en" lang="en">${esc(c.frente)}</span></li></ul>
    ${tambien ? `<p class="small">También vale: ${esc(tambien)}</p>` : ""}
    ${c.nota ? `<p class="hvNota">${esc(c.nota)}</p>` : ""}
    <div class="sc"><span>Aciertos: ${v === null ? "todavía sin datos" : `${pct(v)} · ${bien} de ${n}`}</span>${v === null ? "" : barra(v)}</div>
    ${grafica}
    <dl class="hvDatos">${datos.map(([k, t]) => `<div><dt>${k}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl>
    <div class="acts" id="hvActos">
      <button type="button" class="ub" id="hvEditar">Editar</button>
      ${s.quitada ? '<button type="button" class="ub" id="hvDevolver">Devolver</button>' : '<button type="button" class="ub" id="hvQuitar">Quitar</button>'}
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>
    <p id="hvSeguro" hidden>¿La quito de tu vocabulario? Ya no sale en tu quiz. <button type="button" class="lk" id="hvSi">Sí, quítala</button> · <button type="button" class="lk" id="hvNo">No</button></p>
    ${formaPalabra(c, true)}`;
  vestir(hojaV);
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
    const { reverso, frente, nota, tambienVale } = f;
    // Solo se apunta lo que cambió.
    const cambio = {};
    if (reverso !== c.reverso) cambio.reverso = reverso;
    if (frente !== c.frente) cambio.frente = frente;
    if (nota !== (c.nota || "")) cambio.nota = nota;
    if (tambienVale.join(";") !== (c.tambien_vale || []).join(";")) cambio.tambien_vale = tambienVale;
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
    case "ejemplos": return `<ul class="exs">${(b.lista || []).map((e) => `<li class="ex" data-di="${esc(plano(e.es))}"><span class="es" lang="es-MX">${marca(e.es)}</span><span class="en" lang="en">${esc(e.en)}</span></li>`).join("")}</ul>`;
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

function pintarLeccion(tema, lec) {
  const i = info(tema.id);
  const kwiziq = tema.slug_kwiziq ? KWIZIQ + tema.slug_kwiziq : null;
  const grupos = GRUPOS.map(([clave, nombre]) => ({ nombre, temas: ((lec.enlaces || {})[clave] || []).map((id) => porId.get(id)).filter(Boolean) })).filter((g) => g.temas.length);
  const traen = [...new Set(P.enlaces.filter((x) => x[1] === tema.id).map((x) => x[0]))].map((id) => porId.get(id)).filter(Boolean)
    .sort((a, b) => (a.nivel < b.nivel ? -1 : a.nivel > b.nivel ? 1 : a.orden - b.orden));
  const banco = P.preguntas.filter((q) => q.tema === tema.id && q.estado === "revisada" && !E.retiradas.has(q.id)).length;
  const secciones = lec.secciones || [];
  const saltos = [["regla", "Regla"], ["ejemplos", "Ejemplos"], ["kwiz", "Quiz"], ["enlaces", "Enlaces"]]
    .filter(([id]) => id === "enlaces" || secciones.some((s) => s.id === id));
  poner(`
  <p class="crumb"><a href="#/gramatica">Gramática</a> · <a href="#/gramatica/${esc(tema.nivel.toLowerCase())}">${esc(tema.nivel)}</a> · ${esc(CATEGORIAS[tema.categoria] || tema.categoria)}</p>
  <header class="hero">
    <div class="ratio"></div>
    ${lec.foto ? `<img data-foto="${esc(lec.foto)}" alt="">` : ""}
    <div class="over">
      <p class="lead"><span>${esc(tema.nivel)} · ${esc(NIVELES[tema.nivel] || "")}</span><span>${i.n === 0 ? "de Kwiziq" : plural(i.n, "respuesta", "respuestas")}</span></p>
      <h1>${esc(lec.titulo)}</h1>
      ${lec.subtitulo ? `<p class="sub">${esc(lec.subtitulo)}</p>` : ""}
      <div class="score">
        <span>Tu porcentaje: ${pct(i.pct)} · meta ${meta()}%</span>
        <div class="track" role="img" aria-label="${pct(i.pct)} de 100, meta en ${meta()}"><i data-w="${ancho(i.pct)}"></i><b data-x="${meta()}"></b></div>
      </div>
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
  </section>`,
  {
    titulo: lec.titulo + " · Pelagos", nav: "gramatica",
    pie: (tema.leccion.comparada_kwiziq ? `<p>Comparada punto por punto con la lección de Kwiziq el ${fecha(tema.leccion.comparada_kwiziq)}.</p>` : "") +
      (i.n === 0 && tema.arranque_fuente ? `<p>Tu porcentaje es el arranque: viene del ${esc(tema.arranque_fuente)}, leído el ${fecha(tema.arranque_leido)}.</p>` : ""),
  });
  vista.dataset.leccion = tema.slug;
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
  return i.n === 0 ? "Nuevo aquí · de Kwiziq" : "Vuelve al plan";
}

function verKwiz(o) {
  const abierto = N.kwizAbierto(E);
  const banco = P.preguntas.filter((q) => q.estado === "revisada" && !E.retiradas.has(q.id));
  const temasBanco = new Set(banco.map((q) => q.tema));
  const cuadernos = (P.cuadernos || []).map((c) => ({ ...c, con: c.temas.filter((t) => temasBanco.has(t)).length })).filter((c) => c.con);
  const hechos = N.kwizzesHechos(E).slice(0, 10);
  const lista = N.listaDeEstudio(P, E);
  const deLista = lista.temas.map((id) => porId.get(id)).filter(Boolean);
  const porNivel = N.nivelesConPreguntas(P, E);
  const hoy = N.fechaLocal(new Date());
  const hechosHoy = N.kwizzesHechos(E).filter((k) => N.fechaLocal(k.terminado) === hoy).length;
  poner(`
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
    <div class="links">${deLista.map((t) => botonTema(t, { sub: motivoEnLista(t, lista) })).join("")}</div>
    ${lista.abierto ? "" : `<div class="go"><button type="button" class="ub grande" data-kwiz='{"tipo":"lista"}'>Pelagos Quiz</button></div>`}
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
  </section>` : ""}
  ${hechos.length ? `
  <section class="card">
    <h2>Tus últimos quizzes</h2>
    <div class="links">${hechos.map((h) => `<a class="tb" href="#${QUIZ}/${esc(h.id)}/resultado">
      <span class="nm ancho">${cuando(h.terminado)}</span><span class="pc">${h.bien} de ${h.total}</span>
      <span class="sm ancho">${TIPOS_KWIZ[h.tipo] || "Quiz"}</span>${barra(h.total ? 100 * h.bien / h.total : 0)}</a>`).join("")}</div>
  </section>` : ""}`, { titulo: "Quiz de gramática · Pelagos", nav: "gramatica", conserva: o.conserva });
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
  const foto = P.fotos.length ? P.fotos[Math.floor(N.azarDe(kid + "#" + sig.orden)() * P.fotos.length)] : null;

  poner(`
  <section class="kw">
    <header class="hero kwh">
      <div class="ratio"></div>
      ${foto ? `<img data-foto="${esc(foto.nombre)}" alt="">` : ""}
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
    pie: (escribir ? "" : "<p>Para seguir, toca otra vez la respuesta correcta.</p>") +
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

  function avanzar() {
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
    // la tocas otra vez y pasa la siguiente pregunta, sin buscar otro botón.
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
            nota(otra, bien ? "Bien. Tócala otra vez." : "Era esta. Tócala.");
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

function verResultado(o, kid) {
  const k = E.kwizzes.get(kid);
  if (!k) return verNoExiste();
  if (!k.terminado) return k.pendientes.length ? ir(QUIZ + "/" + kid, true) : verNoExiste("Ese quiz se quedó sin preguntas.");
  const filas = k.preguntas.filter((p) => k.resp.has(p)).map((p) => ({ r: k.resp.get(p), q: preguntas.get(p) }));
  const temas = [...new Set(filas.map((f) => f.r.tema))].map((id) => porId.get(id)).filter(Boolean);
  const igual = JSON.stringify({ tipo: k.tipo, cuaderno: k.cuaderno, tema: k.tema });
  const cambios = N.cambiosDeLista(P, E, kid);
  const nombres = (ids) => ids.map((id) => porId.get(id)).filter(Boolean).map((t) => `<li>${esc(titulo(t))}</li>`).join("");
  const renglon = (rotulo, ids, vacio) => `<h3>${rotulo}</h3>${ids.length ? `<ul class="rota">${nombres(ids)}</ul>` : `<p class="small">${vacio}</p>`}`;
  poner(`
  <section class="card">
    <h1 class="h">${k.bien} de ${k.total}</h1>
    <p>${TIPOS_KWIZ[k.tipo] || "Quiz"} · ${cuando(k.terminado)}</p>
    ${barra(k.total ? 100 * k.bien / k.total : 0, " gorda")}
    <div class="go"><button type="button" class="ub grande" data-kwiz='${esc(igual)}'>${k.tipo === "lista" ? "Otro quiz de tu plan" : "Otro quiz igual"}</button><a class="ub" href="#/">Tablero</a></div>
  </section>
  ${cambios ? `
  <section class="card" id="rota">
    <h2>Tu plan de estudio Pelagos</h2>
    ${renglon("Salen", cambios.salen, "Ninguno salió esta vez.")}
    ${renglon("Entran", cambios.entran, cambios.salen.length ? "Ninguno nuevo." : "Ninguno: no hubo lugar.")}
    ${renglon("Se quedan", cambios.quedan, "Ninguno.")}
    <p class="small">Sale el tema que aciertas. El que fallas se queda hasta que lo aciertes dos veces seguidas.</p>
  </section>` : ""}
  <section class="card">
    <h2>Cómo se movieron tus temas</h2>
    <div class="links">${temas.map((t) => {
      const c = N.cambioDeTema(E, kid, t.id), i = info(t.id);
      const abre = t.slug && t.leccion ? `<a class="tb" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tb" data-l="${t.id}">`;
      return `${abre}<span class="lv">${esc(t.nivel)}</span><span class="nm">${esc(titulo(t))}</span>
        <span class="pc${esBajo(c.despues) ? " bajo" : ""}">${pct(c.despues)}</span>
        <span class="sm">${c.de ? `${c.bien} de ${c.de} bien · ` : ""}antes ${pct(c.antes)}${i.toca ? ` · toca el ${fecha(i.toca)}` : ""}</span>
        ${barra(c.despues)}${t.slug && t.leccion ? "</a>" : "</button>"}`;
    }).join("")}</div>
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
  </section>`,
  { titulo: "Resultado del quiz · Pelagos", nav: "gramatica", conserva: o.conserva, pie: "<p>«Antes» es tu porcentaje justo antes de este quiz.</p>" });
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
  const previa = objetivo.closest("[data-l]");
  if (previa) { abrirHoja(previa.dataset.l); return; }
  const kwiz = objetivo.closest("[data-kwiz]");
  if (kwiz && P && E) { try { empezarKwiz(JSON.parse(kwiz.dataset.kwiz)); } catch { verNoExiste("No se pudo armar ese quiz."); } return; }
  const salto = objetivo.closest("[data-ir]");
  if (salto) { const e = document.getElementById(salto.dataset.ir); if (e) e.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (objetivo.closest("#ruleOff")) { $("rule").hidden = true; $("ruleOn").hidden = false; $("ruleOn").focus(); return; }
  if (objetivo.closest("#ruleOn")) { $("rule").hidden = false; $("ruleOn").hidden = true; $("ruleOff").focus(); }
});

document.addEventListener("keydown", (ev) => {
  if (!teclas || ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
  const tecla = ev.key.toLowerCase();
  if (tecla === "enter" && ev.target instanceof Element && ev.target.closest("button, a, summary")) return;    // ese Enter ya es del botón
  if (teclas[tecla]) { ev.preventDefault(); teclas[tecla](); }
});

window.addEventListener("hashchange", () => { cerrarHoja(); enPreguntaDe = null; enTarjetaDe = null; pintar(); });

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
