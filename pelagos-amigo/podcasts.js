// Tus podcasts en Pelagos (su pedido del 24-Oct-2026): los 15 programas de su lista «pelagos» de Pocket Casts
// (sin Broojula ni Niñas Bien, que sus feeds no se dejan leer desde una página). El navegador lee cada feed RSS
// directo y el MP3 suena desde el servidor del podcast, con un <audio> normal: así sigue sonando con la pantalla
// apagada, y con Media Session sale en la pantalla bloqueada con sus botones.
// Lo que escuchas se apunta como suceso «pod» (cada 2 minutos de escucha, al pausar y al terminar): de ahí salen
// «dónde te quedaste» (en cualquier aparato) y los minutos que suman a tu Escucha, también si lo escuchas a medias.
import * as N from "./nucleo.js?v=8160ca6f60";
import * as A from "./almacen.js?v=8160ca6f60";

const PC = "https://static.pocketcasts.com/discover/images/400/";
export const PROGRAMAS = [
  ["asi", "Así como suena", "https://feeds.simplecast.com/bDacRxP4", "e87cb730-7a84-0134-9030-3327a14bcdba"],
  ["botepronto", "Botepronto", "https://feeds.simplecast.com/t5LnVB_E", "bf18cb50-7f0b-0134-904b-3327a14bcdba"],
  ["espiral", "Crónicas de la Espiral", "https://feeds.megaphone.fm/SONORO4610926207", "a2291460-e81a-0137-b6e9-0acc26574db2"],
  ["delirios", "Delirios Crónicos", "https://media.rss.com/delirios-cronicos/feed.xml", "25944d00-e329-013c-248d-0e0713ac2c8b"],
  ["ruzzarin", "Diego Ruzzarin", "https://feeds.megaphone.fm/TMVAM2798358918", "1d4db340-cf12-0136-3246-08b04944ede4"],
  ["dollop", "El Dollop", "https://feeds.simplecast.com/YVUZ6yUE", "acd530c0-3fde-0138-973f-0acc26574db2"],
  ["hilo", "El hilo", "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/b9075595-43ce-4bdd-9a4c-b1ea01352a3d/e4eb1040-260e-4556-a9c7-b1ea01352a67/podcast.rss", "c618c910-5084-0138-9799-0acc26574db2"],
  ["pasquin", "El Pasquín", "https://anchor.fm/s/a9057fcc/podcast/rss", "0e7d3d40-46d4-0133-c150-0d11918ab357"],
  ["nanutria", "Nanutria", "https://anchor.fm/s/8274e00/podcast/rss", "b521cee0-e7d5-0136-3249-08b04944ede4"],
  ["gusgri", "Gusgri", "https://anchor.fm/s/44b85b5c/podcast/rss", "7056ff20-2310-0139-32ba-0acc26574db2"],
  ["leyendas", "Leyendas Legendarias", "https://feeds.simplecast.com/TjkG2gz_", "a5e0c890-193a-0137-f265-1d245fc5f9cf"],
  ["luli", "Luli y Nabi", "https://media.rss.com/luliynabi/feed.xml", "3f950df0-c789-013a-d94d-0acc26574db2"],
  ["mundo", "Mundo Futuro", "https://feeds.megaphone.fm/SONORO3540463091", "d71b3f70-a184-0139-c14d-0acc26574db2"],
  ["mandarax", "Mándarax", "https://feeds.megaphone.fm/SONORO8891923076", "e6b96ce0-787a-0138-edea-0acc26574db2"],
  ["notos", "No Hay Tos", "https://feeds.simplecast.com/UrwSRKXH", "b8b90ef0-2036-0136-c266-7d73a919276a"],
].map(([clave, nombre, rss, uuid]) => ({ clave, nombre, rss, portada: PC + uuid + ".jpg" }));
const porClave = new Map(PROGRAMAS.map((p) => [p.clave, p]));
export const programa = (clave) => porClave.get(clave) || null;

const POR_PROGRAMA = 12;              // los episodios más nuevos de cada uno
const VIGENCIA = 60 * 60 * 1000;      // los feeds se vuelven a leer si la copia tiene más de una hora
const CACHE = "pelagos.podcasts";
const POS = "pelagos.podpos";          // dónde te quedaste, en este aparato, antes de que suba el suceso

function leerLocal(clave) { try { return JSON.parse(localStorage.getItem(clave) || "null"); } catch { return null; } }
function guardarLocal(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); } catch { /* sin almacenamiento: no pasa nada */ } }

/** «00:35:36», «35:36» o «2136» -> segundos. */
export function segundos(t) {
  if (t == null) return null;
  const s = String(t).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  const p = s.split(":").map(Number);
  if (!p.length || p.some((x) => !Number.isFinite(x))) return null;
  return p.reduce((a, x) => a * 60 + x, 0);
}
/** Un id corto y estable para un episodio (de su guid o su MP3). */
function idDe(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
const sinEtiquetas = (html) => {
  const d = new DOMParser().parseFromString(String(html || ""), "text/html");
  return (d.body.textContent || "").replace(/\s+/g, " ").trim();
};

/** El XML de un feed -> sus episodios más nuevos. */
export function episodiosDeFeed(xml, clave) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const eps = [];
  for (const it of doc.querySelectorAll("item")) {
    const enc = it.querySelector("enclosure");
    const url = enc && enc.getAttribute("url");
    if (!url || !/^https:\/\//.test(url)) continue;
    const titulo = (it.querySelector("title")?.textContent || "").trim();
    const guid = (it.querySelector("guid")?.textContent || url).trim();
    const fecha = Date.parse(it.querySelector("pubDate")?.textContent || "") || 0;
    const dur = segundos(it.getElementsByTagName("itunes:duration")[0]?.textContent);
    const desc = sinEtiquetas(it.getElementsByTagName("itunes:summary")[0]?.textContent || it.querySelector("description")?.textContent).slice(0, 400);
    eps.push({ id: clave + "-" + idDe(guid), prog: clave, titulo: titulo || "Sin título", fecha, dur, url, desc });
  }
  return eps.sort((a, b) => b.fecha - a.fecha).slice(0, POR_PROGRAMA);
}

let episodiosMem = null;     // { cuando, eps, fallaron }
let leyendo = null;
/** Los episodios que hay (de la copia, al instante), o null si nunca se han leído. */
export function episodios() {
  if (!episodiosMem) episodiosMem = leerLocal(CACHE);
  return episodiosMem;
}
/** Lee los 15 feeds (si la copia es vieja o si se pide). Devuelve la promesa; avisa con alCambiar. */
export function actualizar(forzar = false) {
  const c = episodios();
  if (leyendo) return leyendo;
  if (!forzar && c && Date.now() - c.cuando < VIGENCIA) return Promise.resolve(c);
  leyendo = (async () => {
    const fallaron = [], eps = [];
    await Promise.all(PROGRAMAS.map(async (p) => {
      try {
        const ctl = new AbortController(), reloj = setTimeout(() => ctl.abort(), 20000);
        const r = await fetch(p.rss, { signal: ctl.signal, referrerPolicy: "no-referrer", credentials: "omit" });
        clearTimeout(reloj);
        if (!r.ok) throw new Error(String(r.status));
        eps.push(...episodiosDeFeed(await r.text(), p.clave));
      } catch {
        fallaron.push(p.clave);
        // Si un feed falla, se quedan sus episodios de la copia anterior.
        if (c) eps.push(...c.eps.filter((e) => e.prog === p.clave));
      }
    }));
    episodiosMem = { cuando: Date.now(), eps: eps.sort((a, b) => b.fecha - a.fecha), fallaron };
    guardarLocal(CACHE, episodiosMem);
    avisar();
    return episodiosMem;
  })().finally(() => { leyendo = null; });
  return leyendo;
}

// ---- Lo escuchado (sucesos «pod»): dónde te quedaste y los minutos por día.
let escuchaCache = null;
/**
 * De los sucesos: { pos: Map(id -> {pos, dur, fin, cuando}), dias: Map(día -> {min, programas: Map(clave -> min)}) }.
 * Los minutos son tiempo de verdad escuchando (sin contar la velocidad), sumados de todos tus aparatos.
 */
export function escuchado(sucesos = A.sucesos()) {
  const clave = sucesos.length + "|" + (sucesos.length ? sucesos[sucesos.length - 1].id : "");
  if (escuchaCache && escuchaCache.clave === clave) return escuchaCache.r;
  const pos = new Map(), seg = new Map();
  for (const e of sucesos) {
    if (e.t !== "pod" || typeof e.ep !== "string") continue;
    const ms = Date.parse(e.cuando || "") || 0;
    const prev = pos.get(e.ep);
    if (!prev || ms >= prev.ms) pos.set(e.ep, { pos: Number(e.pos) || 0, dur: Number(e.dur) || null, fin: !!e.fin || (prev && prev.fin) || false, ms });
    else if (e.fin) prev.fin = true;
    const s = Number(e.seg) || 0;
    if (s > 0 && ms) {
      const dia = N.fechaLocal(new Date(ms));
      if (!seg.has(dia)) seg.set(dia, new Map());
      const m = seg.get(dia);
      m.set(e.prog || "?", (m.get(e.prog || "?") || 0) + s);
    }
  }
  const dias = new Map();
  for (const [dia, m] of seg) {
    const programas = new Map([...m].map(([k, s]) => [k, Math.round(s / 60)]));
    dias.set(dia, { min: Math.round([...m.values()].reduce((a, b) => a + b, 0) / 60), programas });
  }
  // Tu lista (24-Oct-2026): lo que quitaste (deslizando o con la ✕) y desde cuándo empieza.
  const quitados = new Map();
  let corte = null;
  for (const e of sucesos) {
    if (e.t === "podquita" && typeof e.ep === "string") {
      const ms = Date.parse(e.cuando || "") || 0, prev = quitados.get(e.ep);
      if (!prev || ms >= prev.ms) quitados.set(e.ep, { ms, fuera: !e.deshacer });
    } else if (e.t === "podinicio" && Number.isFinite(e.desde)) corte = corte === null ? e.desde : Math.min(corte, e.desde);
  }
  const fuera = new Set([...quitados].filter(([, x]) => x.fuera).map(([k]) => k));
  escuchaCache = { clave, r: { pos, dias, fuera, corte } };
  return escuchaCache.r;
}

const LISTA_INICIAL = 30;
/**
 * Tu lista: los episodios desde el corte (los 30 más nuevos del día que empezó, y de ahí en adelante solo los que se
 * publiquen), menos los que quitaste. Lo quitado no se rellena con episodios viejos. La primera vez, apunta el corte.
 */
export function miLista(eps) {
  const r = escuchado();
  let corte = r.corte;
  if (corte === null) {
    if (!eps.length) return [];
    corte = eps[Math.min(LISTA_INICIAL, eps.length) - 1].fecha;
    A.apuntar({ t: "podinicio", id: N.nuevoId("pi"), cuando: new Date().toISOString(), desde: corte });
  }
  return eps.filter((e) => e.fecha >= corte && !r.fuera.has(e.id));
}
export const quitado = (id) => escuchado().fuera.has(id);
/** Quita un episodio de tu lista (o lo devuelve, con deshacer). */
export function quitar(id, deshacer = false) {
  A.apuntar({ t: "podquita", id: N.nuevoId("pq"), cuando: new Date().toISOString(), ep: id, deshacer: deshacer || undefined });
}
/** Dónde te quedaste en un episodio: lo más nuevo entre este aparato y tus sucesos. */
export function posicion(id) {
  const local = (leerLocal(POS) || {})[id];
  const s = escuchado().pos.get(id);
  if (local && (!s || local.ms > s.ms)) return local;
  return s || null;
}
function guardarPosLocal(id, x) {
  const t = leerLocal(POS) || {};
  t[id] = x;
  const ids = Object.keys(t);
  if (ids.length > 300) for (const k of ids.sort((a, b) => t[a].ms - t[b].ms).slice(0, ids.length - 300)) delete t[k];
  guardarLocal(POS, t);
}

// ---- El reproductor: un solo <audio>, fuera de la página (no se calla al cambiar de página).
const audio = new Audio();
audio.preload = "metadata";
audio.dataset.podcast = "1";      // el candado de Limpio lo deja sonar: lo pediste tú
let actual = null;            // el episodio que está cargado
let segSinApuntar = 0, ultimoTic = null, ultimoApunte = 0;
const VELOCIDADES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
let velocidad = Number(leerLocal("pelagos.podvel")) || 1;

const oyentes = new Set();
export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar() { for (const fn of oyentes) { try { fn(); } catch { /* que no tumbe a los demás */ } } }

export const cargado = () => actual;
export const sonando = () => !!actual && !audio.paused;
export const tiempo = () => ({ pos: audio.currentTime || 0, dur: Number.isFinite(audio.duration) ? audio.duration : (actual && actual.dur) || 0 });
export const vel = () => velocidad;

function contar() {
  const ahora = performance.now();
  if (ultimoTic !== null && !audio.paused) {
    const d = (ahora - ultimoTic) / 1000;
    if (d > 0 && d < 5) segSinApuntar += d;       // un salto grande es que el teléfono se durmió sin sonar
  }
  ultimoTic = audio.paused ? null : ahora;
}
/** Apunta lo escuchado: posición y segundos de escucha desde el último apunte. */
function apuntar(fin = false) {
  if (!actual) return;
  contar();
  const { pos, dur } = tiempo();
  const seg = Math.round(segSinApuntar);
  const x = { pos: Math.round(pos), dur: Math.round(dur) || null, fin: fin || (dur > 0 && pos >= dur - 30), ms: Date.now() };
  guardarPosLocal(actual.id, x);
  if (seg < 5 && !fin) return;
  segSinApuntar -= seg;
  ultimoApunte = Date.now();
  A.apuntar({ t: "pod", id: N.nuevoId("pd"), cuando: new Date().toISOString(), ep: actual.id, prog: actual.prog,
    titulo: actual.titulo.slice(0, 160), pos: x.pos, dur: x.dur, seg, fin: x.fin || undefined });
}

/** Toca un episodio (desde donde te quedaste) o, si es el que está cargado, lo pausa o lo sigue. */
export function tocar(ep) {
  if (actual && actual.id === ep.id) { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); return; }
  if (actual) apuntar();
  actual = ep;
  const p = posicion(ep.id);
  const desde = p && !p.fin && p.pos > 5 ? Math.max(0, p.pos - 3) : 0;
  audio.src = ep.url;
  audio.playbackRate = velocidad;
  audio.defaultPlaybackRate = velocidad;
  const alListo = () => { if (desde) audio.currentTime = desde; };
  audio.addEventListener("loadedmetadata", alListo, { once: true });
  audio.play().catch(() => {});
  sesionDeMedios();
  avisar();
}
export function pausa() { audio.pause(); }
export function seguir() { if (actual) audio.play().catch(() => {}); }
export function saltar(s) {
  if (!actual) return;
  const { dur } = tiempo();
  audio.currentTime = Math.max(0, Math.min(dur || Infinity, (audio.currentTime || 0) + s));
  avisar();
}
export function ir(seg) { if (actual) { audio.currentTime = Math.max(0, seg); avisar(); } }
export function cambiarVelocidad() {
  const i = VELOCIDADES.indexOf(velocidad);
  velocidad = VELOCIDADES[(i + 1) % VELOCIDADES.length];
  audio.playbackRate = velocidad;
  audio.defaultPlaybackRate = velocidad;
  guardarLocal("pelagos.podvel", velocidad);
  avisar();
  return velocidad;
}
export function cerrar() {
  if (!actual) return;
  apuntar();
  audio.pause();
  actual = null;
  audio.removeAttribute("src");
  audio.load();
  if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
  avisar();
}

function sesionDeMedios() {
  if (!("mediaSession" in navigator) || !actual) return;
  const p = programa(actual.prog);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: actual.titulo, artist: p ? p.nombre : "", album: "Pelagos",
      artwork: p ? [{ src: p.portada, sizes: "400x400", type: "image/jpeg" }] : [] });
    const m = navigator.mediaSession;
    m.setActionHandler("play", () => seguir());
    m.setActionHandler("pause", () => pausa());
    m.setActionHandler("seekbackward", () => saltar(-15));
    m.setActionHandler("seekforward", () => saltar(30));
    m.setActionHandler("seekto", (d) => { if (d && Number.isFinite(d.seekTime)) ir(d.seekTime); });
    try { m.setActionHandler("previoustrack", null); m.setActionHandler("nexttrack", null); } catch { /* no todos lo dejan */ }
  } catch { /* sin Media Session: suena igual */ }
}
function posicionDeMedios() {
  if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState || !actual) return;
  const { pos, dur } = tiempo();
  if (dur > 0 && pos <= dur) try { navigator.mediaSession.setPositionState({ duration: dur, position: pos, playbackRate: velocidad }); } catch { /* nada */ }
}

let ultimoAviso = 0;
audio.addEventListener("play", () => { ultimoTic = performance.now(); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; avisar(); });
audio.addEventListener("pause", () => { apuntar(); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused"; avisar(); });
audio.addEventListener("ended", () => { apuntar(true); avisar(); });
audio.addEventListener("timeupdate", () => {
  contar();
  if (Date.now() - ultimoApunte > 120000 && segSinApuntar >= 60) apuntar();
  if (Date.now() - ultimoAviso > 1000) { ultimoAviso = Date.now(); posicionDeMedios(); avisar(); }
});
audio.addEventListener("loadedmetadata", () => { posicionDeMedios(); avisar(); });
audio.addEventListener("error", () => avisar());
export const fallo = () => !!actual && !!audio.error;
// Al irse (cerrar la pestaña o mandar la app al fondo), que quede apuntado dónde ibas.
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && actual) apuntar(); });
window.addEventListener("pagehide", () => { if (actual) apuntar(); });
