// Las páginas de Pelagos. Todo se arma en el navegador: no hay servidor propio.
import * as N from "./nucleo.js?v=244e9483b9";
import * as A from "./almacen.js?v=244e9483b9";
import * as V from "./videos.js?v=244e9483b9";
import * as NB from "./nube.js?v=244e9483b9";
import * as CL from "./clases.js?v=244e9483b9";
import { abrirPractica } from "./practica.js?v=244e9483b9";
import * as F from "./fondo.js?v=244e9483b9";
import * as PD from "./podcasts.js?v=244e9483b9";
import { $, MESES, NIVELES, QUIZ, vista } from "./base.js?v=244e9483b9";
import { bancoPorTema, barra, botonTema, entradas, esBajo, esc, hueco, pct, plural, revisarVideos, tieneLoop, tieneVideo, titulo } from "./texto.js?v=244e9483b9";
import { abrirGrafica, abrirGraficaTema, abrirPalabra, activarLapices, adelanto, ambiente, bibModo, callarTodo, conectarAcervo, fijarAdelanto, fijarBibModo, fotoDeLaTarjeta, hojaV, mudo, podMinDe, portadaDelDia, renglonConLapiz, verAgregar, verClases, verLectura, verLista } from "./acervo.js?v=244e9483b9";
import { abrirGlosa, abrirHoja, ayudaLista, cerrarHoja, hoja, ponerSignoAyuda, verAyuda, verPaginaAyuda } from "./ayuda.js?v=244e9483b9";
import { acomodarBitacora, conectarMapas, tarjetaBitacora, verCalor, verMapa } from "./mapas.js?v=244e9483b9";
import { MESES_CHICOS, avanceNivel, conectarTendencias, curvaMini, curvaVocab, graficaVocab, mostrarClipPremio, prepararTendencias, refrescarMini, seccionTendencias, verBiblioteca, verNivel } from "./tendencias.js?v=244e9483b9";
import { EFECTO_MS, atlasEnQuiz, colorCss, conAtlasVisible, conectarAtlas, enPreguntaDe, estadoProyectado, fijarEnPreguntaDe, nivelDelPlan, nivelProy, pintarAtlasInicio, pintarAtlasQuiz, verPregunta, verResultado } from "./atlas.js?v=244e9483b9";
import { leccionPintada, verLeccion } from "./leccion.js?v=244e9483b9";
import { avisoRepaso, botonesRepaso, callar, cerrarVideos, conectarTutoras, datosNube, empezarRepaso, enlaceNube, loopDeTutora, nombreCorto, nombreTutora, pararRepaso, repaso, tocarRepaso, tutoraDe, verTutora, verTutoras } from "./tutoras.js?v=244e9483b9";
import { circulosDeHoy, conectarHoy, moverNivel, panelExplica } from "./hoy.js?v=244e9483b9";
// ---- (base.js) el atajo $, la vista y los nombres fijos
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
let enPregunta = false; function fijarEnPregunta(v) { enPregunta = v; }       // hay una pregunta en pantalla: no se repinta debajo de ti
let turnoDePintar = 0;        // para que una lección que llega tarde no pise otra página
let teclas = null; function fijarTeclas(v) { teclas = v; }            // qué hacen las teclas B y M en la pantalla de ahora
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

// ---- (texto.js) Texto
// ---------------------------------------------------------------- Poner una página

function ir(camino, reemplazar = false) {
  if (reemplazar) window.location.replace("#" + camino);
  else window.location.hash = camino;
}

// ---------------------------------------------------------------- El menú ☰ (su elección del 25-Oct-2026)
// Una hoja que sale de la izquierda, solo con texto: ‹ Volver, Hoy, Gramática y Vocabulario (con sus círculos de hoy y sus
// pestañas), Escucha (Libros, Series, Podcasts), Clases, Bitácora, y abajo Ajustes y Cómo funciona. La sección donde estás va marcada.
let menuHoja = null, menuAbre = null;
function armarMenu() {
  const hoy = N.fechaLocal(new Date());
  const g = P && E ? N.cuentaDelDia(P, E, hoy) : null;
  const v = P && E ? N.tarjetasDelDia(P, E, hoy).grupos : null;
  const cs = (n) => n ? `<span class="menuCs" aria-label="Te queda hoy: ${n[0]}, ${n[1]}, ${n[2]}">${n.map((x, i) => `<b class="g${i}">${x}</b>`).join("")}</span>` : "";
  const camino = window.location.hash || "#/";
  const sub = (href, texto, extra = "") => `<a href="${href}"${extra}${camino === href ? ' aria-current="page"' : ""}>${texto}</a>`;
  const bib = guardado("pelagos.biblioteca") || "libros";
  const enLectura = /^#\/(lectura|podcasts)/.test(camino);
  const grupo = (clave, nombre, href, circ, subs) => `<div class="menuGrupo${navActual === clave || (clave === "escucha" && enLectura) || (clave === "inicio" && camino === "#/") ? " aqui" : ""}">
      <a class="menuSec" href="${href}"><span>${nombre}</span>${circ}</a>${subs ? `<div class="menuSubs">${subs}</div>` : ""}</div>`;
  return `<div class="menuCab"><b>Pelagos</b><button type="button" class="ub menuCerrar" aria-label="Cerrar el menú">✕</button></div>
    <button type="button" class="menuVolver" id="menuVolver">‹ Volver</button>
    ${grupo("inicio", "Tablero", "#/", "", "")}
    ${grupo("gramatica", "Gramática", "#" + QUIZ, cs(g && [g.nuevos, g.vencidos, g.fallados]), sub("#" + QUIZ, "Quiz") + sub("#/gramatica", "Lecciones") + sub("#/gramatica/atlas", "Atlas"))}
    ${grupo("vocabulario", "Vocabulario", "#/vocabulario", cs(v && [v.nuevas.length, v.vencidas.length, v.falladas.length]), sub("#/vocabulario", "Quiz") + sub("#/vocabulario/agregar", "Agregar") + sub("#/vocabulario/acervo", "Acervo"))}
    ${grupo("escucha", "Escucha", "#/lectura", "", ["libros", "series", "podcasts"].map((m) => `<a href="#/lectura" data-bibir="${m}"${enLectura && bib === m ? ' aria-current="page"' : ""}>${{ libros: "Libros", series: "Series", podcasts: "Podcasts" }[m]}</a>`).join(""))}
    ${grupo("clases", "Clases", "#/clases", "", "")}
    ${grupo("bitacora", "Bitácora", "#/bitacora", "", "")}
    <div class="menuPie"><a href="#/ajustes">Ajustes</a><a href="${esc(($("ayudaLink") || {}).getAttribute ? $("ayudaLink").getAttribute("href") || "#/ayuda" : "#/ayuda")}">Cómo funciona</a></div>`;
}
function abrirMenu(boton) {
  if (!menuHoja) {
    menuHoja = document.createElement("div");
    menuHoja.className = "menuVelo";
    menuHoja.hidden = true;
    menuHoja.innerHTML = `<nav class="menuHoja" role="dialog" aria-modal="true" aria-label="Menú de Pelagos"></nav>`;
    document.body.append(menuHoja);
    menuHoja.addEventListener("click", (ev) => {
      const t = ev.target instanceof Element ? ev.target : null;
      if (!t) return;
      if (t === menuHoja || t.closest(".menuCerrar")) { cerrarMenu(); return; }
      if (t.closest("#menuVolver")) { cerrarMenu(false); if (window.history.length > 1) window.history.back(); else ir("/"); return; }
      const b = t.closest("[data-bibir]");
      if (b) { fijarBibModo(b.dataset.bibir); guardar("pelagos.biblioteca", bibModo); }
      if (t.closest("a")) { cerrarMenu(false); if (b && /^#\/lectura/.test(window.location.hash)) { ev.preventDefault(); pintar(); } }
    });
    menuHoja.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { ev.preventDefault(); cerrarMenu(); }
      if (ev.key === "Tab") {      // el foco se queda dentro del menú
        const f = [...menuHoja.querySelectorAll("a, button")];
        if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && document.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
      }
    });
  }
  menuAbre = boton || null;
  menuHoja.querySelector(".menuHoja").innerHTML = armarMenu();
  menuHoja.hidden = false;
  document.body.classList.add("menuAbierto");
  for (const x of document.querySelectorAll(".menuBtn")) x.setAttribute("aria-expanded", "true");
  (menuHoja.querySelector(".menuGrupo.aqui a") || menuHoja.querySelector(".menuCerrar")).focus({ preventScroll: true });
}
function cerrarMenu(devolverFoco = true) {
  if (!menuHoja || menuHoja.hidden) return;
  menuHoja.hidden = true;
  document.body.classList.remove("menuAbierto");
  for (const x of document.querySelectorAll(".menuBtn")) x.setAttribute("aria-expanded", "false");
  if (devolverFoco && menuAbre && menuAbre.isConnected) menuAbre.focus({ preventScroll: true });
}
document.addEventListener("click", (ev) => {
  const b = ev.target instanceof Element && ev.target.closest(".menuBtn");
  if (b) { ev.preventDefault(); ev.stopPropagation(); abrirMenu(b); }
}, true);
window.addEventListener("hashchange", () => cerrarMenu(false));

let navActual = "";
function poner(html, { titulo: t = "Pelagos", pie = "", nav = "", conserva = false } = {}) {
  navActual = nav;
  cerrarMenu(false);
  const arriba = window.scrollY;
  const conFoco = conserva && document.activeElement && vista.contains(document.activeElement) ? document.activeElement.id : "";
  turnoDePintar++;
  armando = false;
  F.ocultar();       // el fondo del Kwiz con la tutora; la pregunta lo vuelve a prender
  delete vista.dataset.leccion;
  fijarEnPregunta(false);
  fijarTeclas(null);
  toque = null;
  vista.innerHTML = html;
  $("pie").innerHTML = pie;
  document.title = t;
  const enTablero = /^#?\/?$/.test(window.location.hash);
  $("nav").hidden = !A.hayLlave() || !P;
  // En el Tablero el ‹ no hace falta, pero su renglón se queda (invisible) para que la página no brinque al entrar a otra.
  $("nav").classList.toggle("vacio", false);      // 25-Oct-2026: el ☰ va en todas las páginas, también en el Tablero
  $("ajustesLink").hidden = !A.hayLlave() || !P;
  for (const a of document.querySelectorAll("[data-nav]")) {
    if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
  ponerSignoAyuda();
  vestir(vista);
  document.body.classList.toggle("conandrea", !!vista.querySelector(".hoy.confoto"));
  document.body.classList.toggle("qaQuiz", !!vista.querySelector(".kw.conAtlas"));
  document.body.classList.toggle("conCurva", !!vista.querySelector(".tjCurva"));      // la curva fija de abajo no tapa lo último      // quiz con Atlas: el ‹ va junto al nivel      // con el retrato al fondo, la página entera se oscurece
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
  acomodarBitacora(raiz.querySelector(".bitT"));
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
  [/^\/podcasts$/, (o) => { fijarBibModo("podcasts"); guardar("pelagos.biblioteca", "podcasts"); return verLectura(o); }],
  [/^\/lectura\/ejemplo$/, (o) => verLectura(o, true)],
  [/^\/leccion\/([a-z0-9-]+)$/, verLeccion],
  [/^\/tutoras$/, (o) => (mudo() || A.esAmigo() ? ir("/gramatica", true) : verTutoras(o))],      // en Limpio (y en el modo amigo) no hay tutoras
  [/^\/tutoras\/(\d+)$/, (o, id) => (mudo() || A.esAmigo() ? ir("/gramatica", true) : verTutora(o, id))],
  [/^\/vocabulario$/, verTarjetas],
  [/^\/vocabulario\/tanda$/, verTarjetas],          // 25-Oct-2026: en Limpio, contestar va aparte de la página de inicio
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
  // En el modo amigo, las páginas de arriba llevan siempre el logo, como en Limpio; las fotos Reef solo salen en los quizzes.
  if (ambiente() === "limpio" || A.esAmigo()) return { hay: true, html: FONDO_LIMPIO };
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
    : gifPremio ? { hay: true, html: `<div class="fondo">${etiquetaEscena(salaPremio(premioFondo), gifPremio)}${LOGO}</div>` }
    : fondoDelDia(false);
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
  for (const m0 of T ? T.medidas : []) {
    if (tarjetas.size && /anki/i.test(m0.nombre)) continue;        // con tarjetas propias, las de fuera ya no se enseñan
    const escucha = ESCUCHA.test(m0.nombre);      // se enseña como «Escucha», venga como venga del tablero
    // A la Escucha de hoy se le suman los podcasts que escuchaste en Pelagos (24-Oct-2026), enteros o a medias.
    const m = escucha && T.dia === hoy ? { ...m0, valor: m0.valor + podMinDe(hoy) } : m0;
    const hecho = m.de === 0 ? m.valor === 0 : m.valor >= m.de;
    const falta = Math.round((m.de - m.valor) * 10) / 10;
    const habla = /^clase/i.test(m.nombre);      // las clases se enseñan como «Habla», en «clases» (pedido del 23-Oct-2026)
    cuadros.push(cuadro(escucha ? "Escucha" : habla ? "Habla" : m.nombre, m.valor, m.de, habla ? m.unidad || (m.de === 1 ? "clase" : "clases") : m.unidad, hecho ? "Cumplido" : m.de === 0 ? "Meta: cero" : `Faltan ${falta}`, hecho,
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
      ${A.esAmigo() ? "" : checkin}
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

// ---- (tendencias.js) Tus tendencias (Tablero, 16-Oct-2026)
conectarTendencias();
// ---- (mapas.js) El mapa de árbol
conectarMapas();
// ---- (mapas.js) El mapa de calor
// ---------------------------------------------------------------- El quiz de vocabulario

let enTarjetaDe = null;       // la tarjeta que está en pantalla: no se repinta debajo de ti

// ---- «Deshacer» la última palabra calificada (24-Oct-2026): por unos segundos, arriba del quiz. Apunta un suceso
// «tjdeshacer» que anula esa calificación (no se borra nada) y la palabra vuelve a salir primero.
const DESHACER_MS = 10000;
let tjUltima = null, tjVolver = null;
function barraDeshacer() {
  const b = botonDeshacerTj();
  return b === "<span></span>" ? "" : `<div class="qaDeshacer">${b}</div>`;
}
/** El ↶ Deshacer de las tarjetas, chiquito, en el renglón de «Hoy» (25-Oct-2026): no ocupa renglón propio. */
function botonDeshacerTj() {
  if (!tjUltima || Date.now() > tjUltima.hasta) { tjUltima = null; return "<span></span>"; }
  setTimeout(() => { const b = $("tjDeshacerBtn"); if (b && (!tjUltima || Date.now() > tjUltima.hasta)) b.replaceWith(document.createElement("span")); }, tjUltima.hasta - Date.now() + 50);
  return `<button type="button" class="qaDesBtn" id="tjDeshacerBtn" aria-label="Deshacer: ${esc(tjUltima.como)}, ${esc(tjUltima.palabra)}">↶ Deshacer</button>`;
}
vista.addEventListener("click", (ev) => {
  if (!(ev.target instanceof Element) || !ev.target.closest("#tjDeshacerBtn") || !tjUltima) return;
  ev.stopPropagation();
  A.apuntar({ t: "tjdeshacer", id: N.nuevoId("td"), ref: tjUltima.ref, cuando: new Date().toISOString() });
  vEfecto = null;
  tjVolver = tjUltima.tarjeta;
  tjUltima = null;
  recalcular();
  pintar();
}, true);

/**
 * Tu vocabulario. Las tarjetas son sencillas a propósito: inglés al frente, español atrás, y nada más. Te la sabes o no.
 * Sale una tarjeta a la vez: el frente en inglés. Lo dices en español, tocas en cualquier parte para ver
 * la respuesta y te calificas con «Mal» o «Bien», que están siempre en el mismo lugar. Al calificar sale la siguiente.
 */
function verTarjetas(o) {
  if (o.conserva && enTarjetaDe) { fijarEnPregunta(true); return; }
  const hoy = N.fechaLocal(new Date());
  const dia = N.tarjetasDelDia(P, E, hoy);
  // Adelanto: cuando ya estás en cero, «Adelantar» trae una tanda de las que tocan pronto. Vive solo en esta página;
  // cada calificación es un suceso «tj» con «adelanto». Una tarjeta sale de la tanda en cuanto la calificas.
  if (adelanto && adelanto.dia !== hoy) fijarAdelanto(null);                                  // la tanda es de hoy nada más
  const restan = adelanto ? adelanto.ids.filter((id) => { const s = E.tarjetas.get(id); return s && !s.quitada && !(s.ultima && s.ultima >= adelanto.desde); }) : [];
  if (adelanto && !restan.length) fijarAdelanto(null);
  const limpio = ambiente() === "limpio", enTanda = /^#\/vocabulario\/tanda/.test(window.location.hash);
  if (limpio && enTanda && !dia.pendientes.length && !restan.length) return ir("/vocabulario", true);
  // En Limpio (25-Oct-2026, igual que gramática): primero la página de inicio, con «Empezar tarjetas».
  // En Limpio, Vocabulario siempre es la misma página (25-Oct-2026): solo cambia el botón.
  if (limpio && !enTanda) return verPaginaVocab(o, dia, restan, N.tarjetasAdelante(P, E, hoy));
  if (!dia.pendientes.length && !restan.length) {
    const masTarde = N.tarjetasAdelante(P, E, hoy);
    // El letrero «Vocabulario en cero · Hoy repasaste…» se quitó el 22-Oct-2026 (su pedido): el cuadro ya lo dice.
    return poner(conFondo(`
    ${entradas("vocabulario", "quiz")}
    <section class="card" id="tjCero">
      ${barraDeshacer()}
      ${dia.total ? `<h1 class="sr">Vocabulario en cero</h1>` : `<h1 class="h">Todavía no hay vocabulario</h1><p>Cuando haya palabras en el contenido, aquí salen las de cada día.</p>`}
      <div class="conCuadro">${masTarde.length ? `<button type="button" class="ub grande" id="tjAdelantar">Adelantar ${masTarde.length}</button>` : "<span></span>"}<div class="unCuadro" role="list" aria-label="Tu vocabulario de hoy">${cuadroVocabulario(hoy)}</div></div>
      <div class="tjAvance"><h2 class="tdSub">Tu avance</h2>${graficaVocab()}</div>
      ${masTarde.length ? `<p class="small">Estudia ahora ${plural(masTarde.length, "palabra que toca", "palabras que tocan")} más adelante. La que aciertes sube su escalón desde hoy; la que falles vuelve a salir hoy.</p>` : ""}
    </section>`), { titulo: "Quiz de vocabulario · Pelagos", nav: "vocabulario", conserva: o.conserva });
    return;
  }
  // Primero se termina la tanda; las que falles en ella quedan para hoy y salen después, como cualquier fallada.
  const enAdelanto = restan.length > 0;
  const cola = (enAdelanto ? restan : dia.pendientes).slice();
  // Después de «Deshacer», la palabra deshecha sale otra vez primero.
  if (tjVolver && cola.includes(tjVolver)) { cola.splice(cola.indexOf(tjVolver), 1); cola.unshift(tjVolver); }
  tjVolver = null;
  const antes = E.tarjetas.get(cola[0]);
  const c = N.tarjetaVista(tarjetas.get(cola[0]), antes);
  const foto = fotoDeLaTarjeta(c.id, hoy, antes);
  const hechas = enAdelanto ? adelanto.ids.length - restan.length : dia.hechasHoy;
  const total = enAdelanto ? adelanto.ids.length : dia.hechasHoy + dia.pendientes.length;
  const faltan = (enAdelanto ? "Adelanto: " : "") + (cola.length === 1 ? (enAdelanto ? "falta 1" : "Falta 1") : (enAdelanto ? "faltan " : "Faltan ") + cola.length);

  // En Limpio: sin título ni pestañas, el mismo renglón que gramática (‹ · Voc · círculos de hoy), la rayita bajo el
  // círculo del grupo de esta tarjeta, el ↶ Deshacer en la esquina de la tarjeta y tus palabras escondibles.
  const g = dia.grupos, grupoDe = g.nuevas.includes(c.id) ? 0 : g.vencidas.includes(c.id) ? 1 : g.falladas.includes(c.id) ? 2 : -1;
  const cabeza = limpio
    ? `<div class="lineaG"><div class="gFila conNivel"><button type="button" class="ub menuBtn qaAtras" aria-label="Menú" aria-haspopup="dialog" aria-expanded="false">☰</button><span class="qaNivel">Vocab</span><span class="qaEspacio"></span><span class="hoyFila"><span>Hoy</span>${circulosDeHoy("medio", [g.nuevas.length, g.vencidas.length, g.falladas.length], "vhoy").replace(new RegExp(`class="circ g${grupoDe}"`), `class="circ g${grupoDe} cur"`)}</span></div></div>`
    : lineaDeVocabulario(dia, c.id, antes).replace('<div class="gFila"><span></span>', `<div class="gFila">${botonDeshacerTj()}`);
  const desTj = limpio ? botonDeshacerTj() : "";
  poner(`
  ${limpio ? "" : entradas("vocabulario", "quiz")}
  <section class="kw tj${limpio ? " conAtlas" : ""}">
    <header class="hero kwh tjh">
      <div class="ratio"></div>
      ${foto ? `<img data-foto="${esc(foto.nombre)}"${foto.vocab ? ' data-vocab="1"' : ""} alt="">` : ""}
      <div class="over">
        <p class="lead sr"><span id="tjFaltan">${enAdelanto ? faltan : (cola.length === 1 ? "Falta 1" : "Faltan " + cola.length)}</span><span id="tjAviso">Dilo en español</span></p>
        <div data-explicas>${cabeza}${panelExplica()}</div>
        ${limpio ? mallaHtml(c.id, curvaMini("voc")) : ""}
        ${renglonConLapiz("frente", c.frente, "h1", "cue", ' id="cue"')}
        ${(() => { const at = N.tarjetasAtascadas(E).get(c.id); return at ? `<p class="tjAtas">Atascada · fallada en ${at.fallos} quizzes esta semana · <button type="button" class="lk" data-v="${esc(c.id)}">Ver su ficha</button></p>` : ""; })()}
      </div>
      <div class="rule tjResp" id="tjResp" tabindex="-1" aria-live="polite" hidden>
        <ul class="exs"><li class="ex">${renglonConLapiz("reverso", c.reverso, "span", "es", ' id="vResp"')}</li></ul>
      </div>
      ${desTj && desTj !== "<span></span>" ? `<div class="qaDeshacer">${desTj}</div>` : ""}
    </header>
    <div class="tjZona">
      <p class="tjToca" id="tjToca">Toca para ver la respuesta</p>
      <div class="tjBotones" id="tjBotones" role="group" aria-label="¿La supiste?" hidden><button type="button" class="ub" id="jMal">Mal</button><button type="button" class="ub" id="jBien">Bien</button><button type="button" class="ub" id="jFacil" aria-label="Fácil: a 30 días">Fácil<small>30 días</small></button></div>
    </div>
    ${limpio ? "" : curvaVocab()}
  </section>`,
  { titulo: "Quiz de vocabulario · Pelagos", nav: "vocabulario" });
  fijarEnPregunta(true);
  enTarjetaDe = c.id;
  pintarMalla(dia, cola);

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
    fijarTeclas({ b: () => calificar(true, true), m: () => calificar(false, true), f: () => calificar(true, true, true) });
  }
  function calificar(bien, conTecla = false, facil = false) {
    if (calificada || !destapadaEn || (!conTecla && Date.now() - destapadaEn < ESPERA)) return;
    calificada = true;
    const ev = { t: "tj", id: N.nuevoId("t"), tarjeta: c.id, cuando: new Date().toISOString(), bien: bien ? 1 : 0, modo: "tocar", ...(enAdelanto ? { adelanto: 1 } : {}), ...(facil ? { facil: 1 } : {}) };
    A.apuntar(ev);
    tjUltima = { ref: ev.id, tarjeta: c.id, palabra: c.reverso, como: facil ? "Fácil" : bien ? "Bien" : "Mal", hasta: Date.now() + DESHACER_MS };
    vEfecto = { id: c.id, f0: tonoTj(antes), bien: !!bien, t0: Date.now() };
    recalcular();
    enTarjetaDe = null;
    pintarMalla(N.tarjetasDelDia(P, E, hoy), cola.slice(1));
    refrescarMini();
    // Los puntitos enseñan si la tarjeta subió o se cayó, y luego sale la siguiente (o «Vocabulario en cero»).
    const de = nivelDe(antes), a = nivelDe(E.tarjetas.get(c.id));
    moverNivel(de, a);
    $("tjAviso").textContent = a > de ? `Sube al peldaño ${a}` : a < de ? `Se cae al peldaño ${a}` : `Se queda en el peldaño ${a}`;
    $("tjBotones").hidden = true;
    setTimeout(() => pintar(), a === de ? 450 : 900);
  }
  toque = () => destapar();
  fijarTeclas({ " ": () => destapar(true), enter: () => destapar(true) });
  // Los lápices: el del inglés sale hasta que destapas, para no tocarlo sin querer antes de pensar la respuesta.
  vista.querySelector('.tjh [data-lapiz="frente"]').hidden = true;
  activarLapices(vista.querySelector(".tjh"), c.id, () => {});
  $("jBien").addEventListener("click", () => calificar(true));
  $("jMal").addEventListener("click", () => calificar(false));
  $("jFacil").addEventListener("click", () => calificar(true, false, true));
}

// ---- Tus palabras en el quiz de vocabulario (su elección del 25-Oct-2026, «lo de hoy brilla»), solo en Limpio.
// Todas tus tarjetas en cuadritos, de la más vieja a la más nueva (siempre en el mismo lugar). Las de hoy a todo color,
// las demás tenues; las que ya hiciste hoy, verdes o rojas; la de ahora late. Se puede esconder (se recuerda).
const conMalla = () => ambiente() === "limpio" && guardado("pelagos.vocMalla") !== "0";
/** El botón para esconder o mostrar un mapa (el Atlas o tus palabras), igual en gramática y vocabulario (25-Oct-2026). */
const botonMapa = (cual, visible, nombre, mini = "") => `<div class="mapaCab">${mini}<button type="button" class="lk mapaBtn" data-mapa="${cual}" aria-expanded="${visible}">${visible ? "Ocultar ▴" : nombre + " ▾"}</button></div>`;
const mallaHtml = (actual = "", mini = "") => botonMapa("voc", conMalla(), "Ver tus palabras", mini) + `<div class="vMalla" id="vMalla" data-actual="${esc(actual)}"${conMalla() ? "" : " hidden"}></div>`;
let mallaArgs = null;
let vEfecto = null;          // la última que calificaste: { id, f0, bien, t0 }, para su parpadeo
/** El tono de una tarjeta: el color de su caja, o «d2»/«d1» si la fallaste hoy y todavía debe aciertos (como gramática). */
function tonoTj(st, hoy = N.fechaLocal(new Date())) {
  const debe = N.debeTarjeta(st, hoy);
  return debe >= 2 ? "d2" : debe === 1 ? "d1" : N.colorDe(st);
}
// modo (25-Oct-2026): «quiz» con marcos verdes y rojos; «inicio» sin marcos (lo de hoy brilla, lo demás tenue);
// «final» sin marcos y todo a todo color, como el Atlas de la página de gramática.
function pintarMalla(dia, cola, modo = "quiz") {
  mallaArgs = [dia, cola, modo];
  const caja = $("vMalla");
  if (!caja || caja.hidden) return;
  const hoy = N.fechaLocal(new Date());
  const pend = new Set([...dia.pendientes, ...cola]);
  // El relleno dice su caja; el marco, cómo te fue hoy (25-Oct-2026, igual que gramática): verde si la última de hoy
  // fue bien, rojo de rayitas si fue mal. Las que te faltan van a todo color y sin marco; las demás, tenues.
  const como = new Map();
  for (const [id, s] of E.tarjetas) if (s.ultima && N.fechaLocal(new Date(s.ultima)) === hoy) {
    const h = s.historia && s.historia[s.historia.length - 1];
    como.set(id, h ? !!h.bien : true);
  }
  const todas = mazo().filter((c) => { const s = E.tarjetas.get(c.id); return !(s && s.quitada); })
    .sort((a, b) => String(a.agregada || "").localeCompare(String(b.agregada || "")) || (a.id < b.id ? -1 : 1));
  const actual = caja.dataset.actual;
  const fx = vEfecto && Date.now() - vEfecto.t0 < EFECTO_MS ? vEfecto : null;
  caja.textContent = "";
  // Por mes (su elección del 25-Oct-2026): un rectángulo por mes en que las agregaste, en orden de fecha, como el Atlas
  // de gramática por tipo. Mismo tamaño de cuadrito que el Atlas; la caja se desplaza hacia abajo.
  const porMes = new Map();
  for (const c of todas) { const m = String(c.agregada || hoy).slice(0, 7); if (!porMes.has(m)) porMes.set(m, []); porMes.get(m).push(c); }
  // Los meses con menos de MES_MINIMO tarjetas se juntan con el siguiente (o, al final, con el anterior), para que no
  // queden rectángulos angostitos sin nombre (su pedido del 25-Oct-2026). El rótulo dice el rango: «feb–mar 26».
  const MES_MINIMO = 5;
  const meses = [];
  let pendiente = null;      // { desde, hasta, lista }
  for (const [m, lista] of porMes) {
    const g = pendiente ? { desde: pendiente.desde, hasta: m, lista: [...pendiente.lista, ...lista] } : { desde: m, hasta: m, lista };
    pendiente = null;
    if (g.lista.length < MES_MINIMO) { pendiente = g; continue; }
    meses.push(g);
  }
  if (pendiente) { if (meses.length) { const u = meses[meses.length - 1]; u.hasta = pendiente.hasta; u.lista.push(...pendiente.lista); } else meses.push(pendiente); }
  const nombreMes = (m) => MESES_CHICOS[Number(m.slice(5, 7)) - 1];
  const rotuloDe = (g) => g.desde === g.hasta ? `${nombreMes(g.desde)} ${g.desde.slice(2, 4)}`
    : g.desde.slice(0, 4) === g.hasta.slice(0, 4) ? `${nombreMes(g.desde)}–${nombreMes(g.hasta)} ${g.hasta.slice(2, 4)}`
    : `${nombreMes(g.desde)} ${g.desde.slice(2, 4)}–${nombreMes(g.hasta)} ${g.hasta.slice(2, 4)}`;
  const W = Math.max(200, caja.clientWidth - 10);
  const lugar = N.acomodarMapa(meses.map((g) => g.lista.length), W, 300, { cabeza: 13, margen: 2, hueco: 2, forma: 1, siempreRotulo: true });
  const mapa = document.createElement("div");
  mapa.className = "vMapa";
  mapa.style.height = lugar.alto + "px";
  caja.append(mapa);
  const pon = (el, x, y, w, h) => { el.style.left = x + "px"; el.style.top = y + "px"; el.style.width = w + "px"; el.style.height = h + "px"; };
  let bien = 0, mal = 0;
  meses.forEach((gm, j) => {
    const lista = gm.lista;
    const cj = lugar.cajas[j];
    const g = document.createElement("div");
    g.className = "qaCaja";
    pon(g, cj.x, cj.y, cj.w, cj.h);
    if (cj.rotulo) { const r = document.createElement("div"); r.className = "qaRot"; r.textContent = `${rotuloDe(gm)} · ${lista.length}`; g.append(r); }
    const arriba = cj.rotulo ? 15 : 2;
    lista.forEach((c, i) => {
    const el = document.createElement("i");
    pon(el, 2 + (i % cj.columnas) * (cj.cw + 2), arriba + Math.floor(i / cj.columnas) * (cj.ch + 2), cj.cw, cj.ch);
    const t = tonoTj(E.tarjetas.get(c.id), hoy);
    el.className = "v" + (t === null || t === undefined ? "x" : typeof t === "string" ? t : "k" + t);      // todas a todo color, nada tenue (su pedido del 25-Oct-2026)
    if (como.has(c.id)) { if (como.get(c.id)) bien++; else mal++; if (modo === "quiz") el.classList.add(como.get(c.id) ? "vbien" : "vmal"); }
    if (c.id === actual && !(fx && fx.id === actual)) el.classList.add("late");
    if (fx && fx.id === c.id) {
      el.style.setProperty("--viejo", colorCss(fx.f0));
      el.style.setProperty("--nuevo", colorCss(t));
      el.style.setProperty("--brillo", fx.bien ? "var(--verde)" : "var(--rojo)");
      el.classList.add("vParpadea");
      el.style.animationDelay = -(Date.now() - fx.t0) + "ms";
    }
    el.dataset.mv = c.id;
    g.append(el);
    });
    mapa.append(g);
  });
  // La caja se desplaza: mientras contestas, la de ahora queda en medio; en el inicio, la primera que te toca; en el final, arriba.
  const ver = modo === "quiz" ? caja.querySelector("i.late, i.vParpadea") : modo === "inicio" ? [...caja.children].find((x) => pend.has(x.dataset.mv)) : null;
  const yDe = (el) => el.getBoundingClientRect().top - caja.getBoundingClientRect().top + caja.scrollTop;
  caja.scrollTop = ver ? Math.max(0, yDe(ver) - caja.clientHeight / 2) : 0;
  caja.setAttribute("role", "img");
  caja.setAttribute("aria-label", `Tus ${todas.length} palabras. Hoy: ${plural(bien, "acertada", "acertadas")}, ${plural(mal, "fallada", "falladas")}, ${plural(pend.size, "te queda", "te quedan")}. Toca un cuadro para ver su palabra.`);
}
// Tocar un cuadrito dice su palabra (no destapa la tarjeta). Ocultar / Ver tus palabras.
document.addEventListener("click", (ev) => {
  if (!(ev.target instanceof Element)) return;
  const mb = ev.target.closest(".mapaBtn");
  if (mb) {
    // Esconder o mostrar sin volver a pintar la página (no se pierde lo que estás contestando).
    const voc = mb.dataset.mapa === "voc", clave = voc ? "pelagos.vocMalla" : "pelagos.gramAtlas";
    const ver = guardado(clave) === "0";
    guardar(clave, ver ? "1" : "0");
    const caja = voc ? $("vMalla") : $("qaMapa") || $("kwAtlas");
    mb.setAttribute("aria-expanded", String(ver));
    mb.textContent = ver ? "Ocultar ▴" : (voc ? "Ver tus palabras" : "Ver el Atlas") + " ▾";
    if (caja) { caja.hidden = !ver; const dice = $("kwAtlasDice"); if (dice) dice.hidden = !ver; }
    if (ver) { if (voc && mallaArgs) pintarMalla(...mallaArgs); else if (!voc) { pintarAtlasQuiz(); pintarAtlasInicio(); } }
    return;
  }
  const caja = $("vMalla");
  if (!caja) return;
  const el = ev.target.closest("#vMalla i");
  caja.querySelectorAll("i.tocado").forEach((x) => x.classList.remove("tocado"));
  let b = caja.querySelector(".vBurb");
  if (!el) { if (b && !ev.target.closest("#vMalla")) b.remove(); return; }
  const t = tarjetas.get(el.dataset.mv), s = E.tarjetas.get(el.dataset.mv), f = N.colorDe(s);
  if (!t) return;
  if (!b) { b = document.createElement("div"); b.className = "vBurb"; b.setAttribute("role", "status"); caja.append(b); }
  b.textContent = "";
  const n = document.createElement("b"); n.textContent = t.reverso;
  const debe = N.debeTarjeta(s);
  b.append(n, document.createElement("br"), (f === null ? "sin ver" : "toca cada " + N.PELDANOS[f]) + (debe ? ` · debe ${debe === 1 ? "1 acierto" : debe + " aciertos"} hoy` : ""));
  el.classList.add("tocado");
  const y = el.getBoundingClientRect().top - caja.getBoundingClientRect().top;      // dentro de la caja que se desplaza
  b.style.top = (y > 50 ? y + caja.scrollTop - 46 : y + caja.scrollTop + el.offsetHeight + 6) + "px";
});

/** Las de hoy, a la primera: { total, bien, malas: [ids] } — la primera calificación de hoy de cada tarjeta. */
function hoyALaPrimera(hoy) {
  let total = 0, bien = 0;
  const malas = [];
  for (const [id, s] of E.tarjetas) {
    const h = (s.historia || []).find((x) => x.cuando && N.fechaLocal(new Date(x.cuando)) === hoy);
    if (!h) continue;
    total++;
    if (h.bien) bien++; else malas.push(id);
  }
  return { total, bien, malas };
}
/**
 * La página de Vocabulario en Limpio (25-Oct-2026), igual que la del Quiz de gramática y siempre con lo mismo: los círculos
 * de hoy, tus palabras, el botón que toque (Empezar, Seguir o Adelantar), «Te costaron» y Tu avance.
 */
function verPaginaVocab(o, dia, restan, masTarde) {
  const hoy = N.fechaLocal(new Date()), r = hoyALaPrimera(hoy);
  const quedan = restan.length || dia.pendientes.length;
  const g = dia.grupos;
  const boton = quedan
    ? `<a class="ub grande" href="#/vocabulario/tanda" id="tjEmpezar">${restan.length ? "Seguir el adelanto" : dia.hechasHoy ? "Seguir tus tarjetas" : "Empezar tarjetas"}</a>`
    : masTarde.length ? `<button type="button" class="ub grande" id="tjAdelantar">Adelantar ${masTarde.length}</button>` : "";
  poner(conFondo(`
  ${entradas("vocabulario", "quiz")}
  <section class="card" id="${quedan ? "tjInicio" : "tjCero"}">
    ${barraDeshacer()}
    ${dia.total ? `<h1 class="sr">${quedan ? "Tus tarjetas de hoy" : "Vocabulario en cero"}</h1>`
      : `<h1 class="h">Todavía no hay vocabulario</h1><p>Cuando haya palabras en el contenido, aquí salen las de cada día.</p>`}
    <div class="hoyGrande" data-explicas><p class="small">Te queda hoy</p>${circulosDeHoy("grande", [g.nuevas.length, g.vencidas.length, g.falladas.length], "vhoy")}${panelExplica()}</div>
    ${mallaHtml()}
    <p class="small">Toca un cuadrito para ver su palabra.</p>
    ${boton ? `<div class="go">${boton}</div>` : ""}
    ${!quedan && masTarde.length ? `<p class="small">Estudia ahora ${plural(masTarde.length, "palabra que toca", "palabras que tocan")} más adelante. La que aciertes sube su escalón desde hoy; la que falles vuelve a salir hoy.</p>` : ""}
    ${r.malas.length ? `<details class="vCostaron"><summary>Te costaron ${r.malas.length}</summary><ul class="resCambios">${r.malas.map((id) => { const t = tarjetas.get(id); return t ? `<li class="resabajo"><span class="resNom">▼ ${esc(t.reverso)}</span><span class="resDe">${esc(t.frente)}</span></li>` : ""; }).join("")}</ul></details>` : ""}
    <div class="tjAvance"><h2 class="tdSub">Tu avance</h2>${graficaVocab()}</div>
  </section>
`), { titulo: "Vocabulario · Pelagos", nav: "vocabulario", conserva: o.conserva });
  pintarMalla(dia, restan, quedan ? "inicio" : "final");
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
// ---- (hoy.js) Lo que te queda hoy (su idea del 22-Oct-2026)
conectarHoy();
// ---- (acervo.js) La lista de vocabulario
conectarAcervo();
// ---- (acervo.js) Tus podcasts (24-Oct-2026)
// ---- (leccion.js) La lección
// ---- (tutoras.js) Las tutoras
conectarTutoras();
// ---- (tutoras.js) Repaso en audio
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
    <h1 class="sr">Tu plan de estudio Pelagos</h1>
    <div class="hoyGrande" data-explicas><p class="small">Te queda hoy</p>${circulosDeHoy("grande")}${panelExplica()}</div>
    ${ambiente() === "limpio" ? `${botonMapa("gram", conAtlasVisible(), "Ver el Atlas")}<div class="qaMapa kwAtlas" id="kwAtlas" data-nivel="${esc(nivelDelPlan(deLista))}"${conAtlasVisible() ? "" : " hidden"}></div><p class="small" id="kwAtlasDice"${conAtlasVisible() ? "" : " hidden"}></p>` : ""}
    <div class="conCuadro">${deLista.length && !lista.abierto ? `<button type="button" class="ub grande" data-kwiz='{"tipo":"lista"}'>Empezar quiz</button>`
      : abierto ? `<a class="ub grande" href="#${QUIZ}/${esc(abierto.id)}">Seguir el quiz</a>` : "<span></span>"}${conCuadro(hoy)}</div>
    ${abierto ? `<p class="small">Tienes un quiz a medias. Lo que ya contestaste está guardado.${deLista.length && !lista.abierto ? ` <a href="#${QUIZ}/${esc(abierto.id)}">Seguirlo</a>` : ""}</p>` : ""}
    <h3 id="enfoqueT">Enfoque</h3>
    <div class="enfoque" role="group" aria-labelledby="enfoqueT">
      <button type="button" class="nv ancho" data-enfoque="" aria-pressed="${E.enfoque ? "false" : "true"}">Guiado: todos los niveles</button>
      <div class="tdSeg enfSeg">${Object.keys(NIVELES).map((n) => `<button type="button" class="nv" data-enfoque="${n}" aria-pressed="${E.enfoque === n ? "true" : "false"}"${porNivel[n] ? "" : " disabled"} aria-label="${n}, ${porNivel[n] ? plural(porNivel[n], "tema con preguntas", "temas con preguntas") : "todavía sin preguntas"}">${n}<span>${porNivel[n] || 0}</span></button>`).join("")}</div>
    </div>
    <p class="small">${E.enfoque ? `Tu plan solo trae temas de ${esc(E.enfoque)}.` : "Tu plan toma temas de todos los niveles."} El número es cuántos temas tienen preguntas.${lista.abierto ? " El cambio se ve al terminar el quiz que está a medias." : ""}</p>
    ${(() => { const nv = nivelDelPlan(deLista); const h = avanceNivel("", { soloNivel: nv }); return h ? `<div id="avanceQuiz"><h3>Tu avance en ${esc(nv)}</h3>${h}</div>` : ""; })()}
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
  </section>` : ""}
`), { titulo: "Quiz de gramática · Pelagos", nav: "gramatica", conserva: o.conserva });
  pintarAtlasInicio();
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
  for (const [t, i] of (atlasEnQuiz(k) ? estadoProyectado(k.id) : E).temas) {
    if (!i.toca) continue;
    // Con el Atlas (Limpio), las cajas cuentan el mismo nivel que el Atlas: el del tema de esta pregunta.
    const nivelCajas = atlasEnQuiz(k) ? (porId.get(temaActual) || {}).nivel : E.enfoque;
    if (nivelCajas && (porId.get(t) || {}).nivel !== nivelCajas) continue;
    cajas[Math.max(0, Math.min(5, i.escalon | 0))]++;
  }
  const h = lineaLeitner({ cuenta, actual: grupo(temaActual), nivel: atlasEnQuiz(k) ? nivelProy(k.id, temaActual) : nivelDeTema(temaActual), cajas, que: "temas" });
  if (!atlasEnQuiz(k)) return h;
  // Modo Limpio (25-Oct-2026): el nivel adelante, las cajas con el color del Atlas y, debajo, el Atlas del nivel.
  const nv = (porId.get(temaActual) || {}).nivel || "";
  // 25-Oct-2026 (más compacto): el ‹ junto al nivel y sin las cajas de días (el Atlas ya enseña cómo se reparten).
  return h.replace('<div class="gFila">', `<div class="gFila conNivel"><button type="button" class="ub menuBtn qaAtras" aria-label="Menú" aria-haspopup="dialog" aria-expanded="false">☰</button><span class="qaNivel">${esc(nv)}</span>`)
    .replace(/<span class="lnCajas grandes"[^>]*>.*?<\/span><\/span>\s*/s, "")
    .replace(/<\/div>\s*$/, `${botonMapa("gram", conAtlasVisible(), "Ver el Atlas", curvaMini(nv))}<div class="qaMapa" id="qaMapa" data-nivel="${esc(nv)}" data-tema="${temaActual}" data-kid="${esc(k.id)}"${conAtlasVisible() ? "" : " hidden"}></div></div>`);
}

// ---- (atlas.js) El Atlas en el quiz (su idea del 25-Oct-2026)
conectarAtlas();
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
  if (A.esAmigo()) return s.leyendo ? "Poniendo al día…" : "Modo amigo: lo que haces se queda solo en este aparato.";
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
  if (A.esAmigo()) return verAjustesAmigo(o);
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
  // Si sus escenas todavía no llegan al abrir Ajustes, el renglón se pone al día solo cuando llegan.
  if (!tutoraDelDiaId()) {
    let vueltas = 0;
    const reloj = setInterval(() => {
      const r = $("ajTutoraHoy");
      if (!r || ++vueltas > 60) { clearInterval(reloj); return; }
      if (tutoraDelDiaId()) { r.textContent = nombreTutoraDelDia(); clearInterval(reloj); }
    }, 500);
  }
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

/** Ajustes en el modo amigo: colores, ambiente, instalar y borrar lo que hizo el amigo. Nada de llaves ni tutoras. */
function verAjustesAmigo(o) {
  const n = A.estadoSinc().pendientes;
  const esIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  poner(`
  <section class="card">
    <h1 class="h">Ajustes</h1>
    <h3>Modo amigo</h3>
    <p>Estás viendo una vitrina de Pelagos: los números son el avance real de quien la hizo, y se actualizan de vez en cuando.</p>
    <p class="small" id="ajAmigoN">${n ? `Lo tuyo: ${plural(n, "cosa guardada", "cosas guardadas")} solo en este aparato.` : "Todavía no has contestado nada aquí."}</p>
    <div class="go"><button type="button" class="ub" id="ajAmigoBorrar"${n ? "" : " hidden"}>Borrar lo mío</button></div>
    <p class="small" id="ajAviso" role="status" hidden></p>
  </section>
  ${ayudaLista().length ? `<section class="card" id="ajAyuda">
    <h2>Cómo funciona</h2>
    <p class="small">El método y las reglas de Pelagos: la escalera, el plan de cinco temas y el porcentaje.</p>
    <div class="go"><a class="ub" href="#/ayuda">Abrir «Cómo funciona»</a></div>
  </section>` : ""}
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
    <p class="small">Reef, con fotos en los quizzes y las tarjetas, o Limpio, sin fotos. En este aparato.</p>
  </section>
  ${yaEsApp() ? "" : `<section class="card" id="ajApp">
    <h2>Pelagos como app</h2>
    <div class="go"><button type="button" class="ub grande" id="ajInstalar"${ofertaDeInstalar ? "" : " hidden"}>Instalar Pelagos</button></div>
    <p class="small">${esIphone ? "En Safari: Compartir, «Agregar a inicio»." : "Si no ves el botón: menú del navegador, «Instalar Pelagos»."}</p>
  </section>`}`, { titulo: "Ajustes · Pelagos", conserva: o.conserva });
  $("ajAmigoBorrar").addEventListener("click", () => {
    A.borrarLoDelAmigo();
    recalcular();
    $("ajAmigoBorrar").hidden = true;
    $("ajAmigoN").textContent = "Listo: lo tuyo se borró de este aparato.";
  });
  const marcarTema = () => { for (const b of vista.querySelectorAll("[data-tema-ir]")) b.setAttribute("aria-current", b.dataset.temaIr === document.documentElement.dataset.tema ? "page" : "false"); };
  for (const b of vista.querySelectorAll("[data-tema-ir]")) {
    b.addEventListener("click", () => { document.documentElement.dataset.tema = b.dataset.temaIr; guardar("pelagos.tema", b.dataset.temaIr); marcarTema(); });
  }
  marcarTema();
  const marcarAmbiente = () => { for (const b of vista.querySelectorAll("[data-ambiente-ir]")) b.setAttribute("aria-current", b.dataset.ambienteIr === ambiente() ? "page" : "false"); };
  for (const b of vista.querySelectorAll("[data-ambiente-ir]")) {
    b.addEventListener("click", () => {
      guardar("pelagos.ambiente", b.dataset.ambienteIr);
      if (b.dataset.ambienteIr === "limpio") { document.documentElement.dataset.ambiente = "limpio"; callarTodo(); } else delete document.documentElement.dataset.ambiente;
      marcarAmbiente();
    });
  }
  marcarAmbiente();
  if ($("ajInstalar")) $("ajInstalar").addEventListener("click", async () => {
    if (!ofertaDeInstalar) return;
    const oferta = ofertaDeInstalar;
    ofertaDeInstalar = null;
    $("ajInstalar").hidden = true;
    try { await oferta.prompt(); } catch { /* el navegador ya no la ofrece: queda el menú */ }
  });
}

// ---- (ayuda.js) Cómo funciona (la ayuda, 16-Oct-2026)
// ---- (ayuda.js) Vista previa de un tema enlazado
// ---------------------------------------------------------------- Toques y teclas de toda la página

document.addEventListener("click", (ev) => {
  const objetivo = ev.target instanceof Element ? ev.target : null;
  if (!objetivo) return;
  if (objetivo === hoja || objetivo === hojaV || objetivo.closest("#shX") || objetivo.closest("#shL") || objetivo.closest("[data-cerrar]")) { cerrarHoja(); return; }
  const glosa = objetivo.closest("[data-glosa]");
  if (glosa) { abrirGlosa(glosa.dataset.glosa); return; }
  const palabra = objetivo.closest("[data-v]");
  if (palabra && P && E) { abrirPalabra(palabra.dataset.v); return; }
  if (toque && !hoja.hasAttribute("open") && !objetivo.closest("a, button, summary, input, label, dialog, .vMalla")) { toque(); return; }
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

window.addEventListener("hashchange", () => { callar(); cerrarVideos(); cerrarHoja(); fijarEnPreguntaDe(null); enTarjetaDe = null; pintar(); });

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

// Lo que los módulos de al lado leen de aquí (25-Oct-2026: app.js en piezas).
export { DESHACER_MS, E, ESCUCHA, ICONO_BOCINA, ICONO_NO, ICONO_SI, LOGO, P, arrancar, botonNivel, cargarVideosFondo, colorTarjeta, conCuadro, conFondo, diaLargo, esMovimiento, escenasPorSala, esperarLoopDePregunta, etiquetaEscena, etiquetaMovimiento, fijarEnPregunta, fijarTeclas, fondoDelDia, fondoDelKwiz, fotosVocab, guardado, guardar, imagenDeArriba, info, ir, lineaDeGramatica, loopDePregunta, mazo, meta, movimientoEnTodo, nivelDeTema, pintar, poner, porId, porSlug, preguntas, recalcular, resumenNiveles, sinMovimiento, tarjetas, turnoDePintar, verLlave, verNoExiste, vestir, videoDeTutora };
