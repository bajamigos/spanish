// Texto: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=02005bcb89";
import * as A from "./almacen.js?v=02005bcb89";
import * as V from "./videos.js?v=02005bcb89";
import { E, ICONO_BOCINA, ICONO_NO, ICONO_SI, P, info, meta, pintar, porId } from "./app.js?v=02005bcb89";
import { MESES, SECCIONES } from "./base.js?v=02005bcb89";
import { nombreCorto, repaso, tutoraDe } from "./tutoras.js?v=02005bcb89";
import { mudo } from "./acervo.js?v=02005bcb89";

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
  if (A.esAmigo()) return "";      // en el modo amigo no se enseña qué le falta a cada lección (tutora, video, loop, voz)
  const n = banco.get(t.id) || 0;
  const tu = tutoraDe(t.id), nombre = tu ? tu.tutora.split(",")[0] : "";
  const video = tieneVideo(t), loop = tieneLoop(t), voz = tieneVoz(t);
  const una = (si, texto) => `<span class="marca${si ? " si" : ""}">${si ? ICONO_SI : ICONO_NO}${esc(texto)}</span>`;
  const dicho = `Lección: ${t.leccion ? "sí" : "no"}. Tutora: ${nombre || "todavía no"}. Video completo: ${video ? "sí" : "no"}. Loop: ${loop ? "sí" : "no"}. Voz: ${voz ? "sí" : "no"}. Preguntas: ${n ? n : "ninguna"}.`;
  return `<span class="marcas" role="img" aria-label="${esc(dicho)}">${una(!!t.leccion, "Lección")}${una(!!tu, nombre || "Tutora")}${una(video, "Video completo")}${una(loop, "Loop")}${una(voz, "Voz")}${una(n > 0, n ? plural(n, "pregunta", "preguntas") : "Preguntas")}</span>`;
}

export { ancho, bancoPorTema, barra, botonTema, conBocina, contrastesDe, cuando, entradas, esBajo, esc, fecha, fechaCorta, hueco, marca, marcas, memoAtascados, pct, plural, revisarVideos, temasAtascadosAhora, tieneLoop, tieneVideo, tieneVoz, titulo, tono, videosAqui, videosRevisados };
