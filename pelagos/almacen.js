// El almacén: habla con GitHub y guarda copias en este aparato.
//
// - El contenido se lee del repositorio privado (rama de contenido).
// - Tu avance son sucesos que solo se agregan, en la rama de avance:
//       sucesos/<aparato>/<año-mes>.jsonl
//   Cada aparato escribe en su propio archivo, así dos aparatos nunca se pisan.
// - El tablero del día (tablero/hoy.json, en la misma rama) solo se lee: la página nunca lo escribe.
//   Lo mismo tus clases (tablero/clases.json) y las fotos de tus tutores (tablero/tutores/).
// - Lo que contestas entra primero a una fila en este aparato y de ahí sube.
//   Sin internet, la fila espera y sube sola cuando vuelve.
// - La llave vive solo en este navegador y solo viaja a la dirección de CONFIG.api.
import { CONFIG } from "./config.js?v=98c9c2bb3b";

const CLAVES = { llave: "pelagos.llave", aparato: "pelagos.aparato", fila: "pelagos.fila." };      // la fila: una clave por suceso
const RUTA_SUCESOS = /^sucesos\/([A-Za-z0-9_-]+)\/(\d{4}-\d{2})\.jsonl$/;
const RUTA_TABLERO = "tablero/hoy.json";
// Tus clases de Worldsacross (tablero/clases.json) y las fotos de tus tutores (tablero/tutores/), en la misma rama. Solo se leen.
const RUTA_CLASES = "tablero/clases.json";
// Tu registro de lectura (tablero/lectura.json, misma rama): libros, portadas y minutos por día. Solo se lee.
const RUTA_LECTURA = "tablero/lectura.json";
// Un loop de tutora: un GIF o video en escenas/tutora-<lección>/ de la rama de avance.
const RUTA_LOOP = /^escenas\/tutora-(\d+)\/[a-z0-9-]+\.(gif|mp4|webm)$/;
let conLoop = new Set();        // lecciones cuya tutora ya tiene loop; se renueva en cada sincronización
// La voz de una tutora: un MP3 o M4A en escenas/voz-<lección>/ (lo deja ahí la acción «Voces de las tutoras»).
const RUTA_VOZ = /^escenas\/voz-(\d+)\/[A-Za-z0-9_-]+\.(mp3|m4a)$/;
let conVoz = new Set();         // lecciones cuya tutora ya tiene voz grabada; se renueva en cada sincronización
// Su presentación con voz («Conoce a…»): un MP3 en escenas/presenta-<lección>/.
const RUTA_PRESENTA = /^escenas\/presenta-(\d+)\/[A-Za-z0-9_-]+\.(mp3|m4a)$/;
let conPresenta = new Set();    // lecciones con presentación grabada; se renueva en cada sincronización

/** Las lecciones cuya tutora ya tiene loop (lo que vio la última sincronización, más lo que subiste desde aquí). */
export const leccionesConLoop = () => conLoop;
/** Las lecciones cuya tutora ya tiene voz grabada (lo que vio la última sincronización). */
export const leccionesConVoz = () => conVoz;
/** Las lecciones con presentación con voz (lo que vio la última sincronización). */
export const leccionesConPresenta = () => conPresenta;

export class Fallo extends Error {
  /** tipo: «llave», «permiso», «falta», «red», «github», «choque», «paquete» */
  constructor(tipo, mensaje, estado = 0) {
    super(mensaje);
    this.tipo = tipo;
    this.estado = estado;
  }
}

// ---------------------------------------------------------------- Lo pequeño: localStorage

const respaldoChico = new Map();
const soloEnMemoria = new Set();      // claves que el navegador no dejó guardar: para esas manda la memoria
function leerChico(clave) {
  if (soloEnMemoria.has(clave)) return respaldoChico.get(clave) ?? null;
  try { const v = window.localStorage.getItem(clave); return v === null ? (respaldoChico.get(clave) ?? null) : v; }
  catch { return respaldoChico.get(clave) ?? null; }
}
function ponerChico(clave, valor) {
  respaldoChico.set(clave, valor);
  try { window.localStorage.setItem(clave, valor); soloEnMemoria.delete(clave); return true; }
  catch { soloEnMemoria.add(clave); return false; }
}
function quitarChico(clave) {
  respaldoChico.delete(clave);
  soloEnMemoria.delete(clave);
  try { window.localStorage.removeItem(clave); } catch { /* sin memoria: nada que quitar */ }
}

export function llave() { return leerChico(CLAVES.llave); }
export function hayLlave() { return !!llave(); }

/** El nombre de este aparato en el repositorio. Se inventa una vez y se queda. */
export function aparato() {
  let a = leerChico(CLAVES.aparato);
  if (a && /^[a-z0-9-]{3,40}$/.test(a)) return a;
  const clase = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? "telefono" : "compu";
  const letras = "abcdefghijkmnpqrstuvwxyz23456789";
  let cola = "";
  for (const b of crypto.getRandomValues(new Uint8Array(5))) cola += letras[b % letras.length];
  a = clase + "-" + cola;
  ponerChico(CLAVES.aparato, a);
  return a;
}

// ---------------------------------------------------------------- Lo grande: IndexedDB

const respaldoGrande = new Map();
let basePromesa = null;
function base() {
  if (!basePromesa) {
    basePromesa = new Promise((listo) => {
      try {
        const r = indexedDB.open("pelagos", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => listo(r.result);
        r.onerror = () => listo(null);
        r.onblocked = () => listo(null);
      } catch { listo(null); }
    });
  }
  return basePromesa;
}
function pedir(modo, hacer) {
  return base().then((db) => {
    if (!db) return undefined;
    return new Promise((listo) => {
      try {
        const tx = db.transaction("kv", modo);
        const r = hacer(tx.objectStore("kv"));
        tx.oncomplete = () => listo(r ? r.result : undefined);
        tx.onerror = tx.onabort = () => listo(undefined);
      } catch { listo(undefined); }
    });
  });
}
async function kvLeer(clave) {
  if (respaldoGrande.has(clave)) return respaldoGrande.get(clave);
  const v = await pedir("readonly", (s) => s.get(clave));
  return v === undefined ? null : v;
}
async function kvPoner(clave, valor) {
  respaldoGrande.set(clave, valor);
  await pedir("readwrite", (s) => s.put(valor, clave));
}
async function kvQuitar(clave) {
  respaldoGrande.delete(clave);
  await pedir("readwrite", (s) => s.delete(clave));
}
async function kvVaciar() {
  respaldoGrande.clear();
  await pedir("readwrite", (s) => s.clear());
}

// ---------------------------------------------------------------- Hablar con GitHub

const REPO = "/repos/" + CONFIG.repo;
const ruta = (camino) => camino.split("/").map(encodeURIComponent).join("/");

async function api(camino, { metodo = "GET", crudo = false, cuerpo = null, cabeceras = {}, con = llave() } = {}) {
  if (!con) throw new Fallo("llave", "Falta la llave.");
  let r;
  try {
    r = await fetch(CONFIG.api + camino, {
      method: metodo, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
      headers: {
        Accept: crudo ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        Authorization: "Bearer " + con,
        ...(cuerpo ? { "Content-Type": "application/json" } : {}),
        ...cabeceras,
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new Fallo("red", "No hay conexión con GitHub.");
  }
  if (r.status === 401) throw new Fallo("llave", "GitHub no reconoce esa llave.", 401);
  if (r.status === 403 || r.status === 429) {
    let dicho = "";
    try { dicho = String((await r.clone().json()).message || ""); } catch { /* sin explicación */ }
    if (r.status === 429 || r.headers.get("x-ratelimit-remaining") === "0" || /rate limit|abuse|too many|try again/i.test(dicho)) {
      throw new Fallo("github", "GitHub pide esperar un rato antes de seguir.", r.status);
    }
    throw new Fallo("permiso", "La llave no tiene permiso para eso.", r.status);
  }
  if (r.status >= 500) throw new Fallo("github", "GitHub no contestó bien. Luego se intenta otra vez.", r.status);
  return r;
}

function aBase64(texto) {
  const b = new TextEncoder().encode(texto);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}

/** El nombre que git le da a un archivo según lo que trae dentro. */
async function shaDe(texto) {
  const cuerpo = new TextEncoder().encode(texto);
  const cabeza = new TextEncoder().encode("blob " + cuerpo.length + "\0");
  const todo = new Uint8Array(cabeza.length + cuerpo.length);
  todo.set(cabeza);
  todo.set(cuerpo, cabeza.length);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-1", todo));
  return Array.from(h, (x) => x.toString(16).padStart(2, "0")).join("");
}

// Todo lo que toca la red pasa por una sola fila, de uno en uno: leer y escribir nunca se cruzan.
let turno = Promise.resolve();
function enTurno(hacer) {
  const p = turno.then(hacer, hacer);
  turno = p.catch(() => {});
  return p;
}

// ---------------------------------------------------------------- Avisos de cómo va el guardado

const sinc = { pendientes: 0, guardando: false, leyendo: false, error: null, guardado: null, leido: null, fragil: false, cambios: 0 };
const oyentes = new Set();
function avisar() {
  sinc.pendientes = leerFila().length;
  sinc.fragil = filaEnMemoria.size > 0;
  for (const fn of oyentes) { try { fn(estadoSinc()); } catch { /* un oyente roto no detiene el guardado */ } }
}
export function estadoSinc() { return { ...sinc, pendientes: leerFila().length, fragil: filaEnMemoria.size > 0 }; }
export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

// ---------------------------------------------------------------- La llave

/** Prueba una llave leyendo el paquete. Si abre, la guarda en este navegador. */
export async function entrar(nueva) {
  const limpia = String(nueva || "").trim();
  if (!limpia) throw new Fallo("llave", "Pega tu llave.");
  if (/\s/.test(limpia)) throw new Fallo("llave", "Esa llave trae espacios. Cópiala otra vez, completa.");
  const r = await api(REPO + "/contents/" + ruta("paquete/contenido.json") + "?ref=" + encodeURIComponent(CONFIG.ramaContenido),
    { crudo: true, con: limpia });
  if (r.status === 404) throw new Fallo("falta", "La llave no abre tu repositorio Pelagos. Al crearla hay que elegir ese repositorio.", 404);
  if (!r.ok) throw new Fallo("github", "GitHub contestó algo raro (" + r.status + ").", r.status);
  let paquete;
  try { paquete = await r.json(); } catch { throw new Fallo("paquete", "El paquete de contenido llegó roto."); }
  revisarPaquete(paquete);
  sinc.error = null;
  ponerChico(CLAVES.llave, limpia);
  await kvPoner("paquete", { etag: r.headers.get("ETag"), datos: paquete });
  return paquete;
}

/** Quita la llave y las copias de contenido de este aparato. Lo que falta por subir se queda esperando. */
export async function salir() {
  quitarChico(CLAVES.llave);
  sinc.error = null;
  sinc.guardado = null;
  archivos.clear();
  leidos.clear();
  tableroActual = null;
  clasesActual = null;
  lecturaActual = null;
  for (const u of fotosVivas.values()) u.then((x) => x && URL.revokeObjectURL(x)).catch(() => {});
  fotosVivas.clear();
  await kvVaciar();
  avisar();
}

function revisarPaquete(p) {
  if (!p || typeof p !== "object" || !Array.isArray(p.temas) || !Array.isArray(p.preguntas)) {
    throw new Fallo("paquete", "El paquete de contenido llegó roto.");
  }
  if (p.version !== 1) throw new Fallo("paquete", "El contenido es de una versión más nueva que esta página. Recarga la página.");
  // Lo que la página escribe tal cual en pantalla tiene que venir con la forma esperada.
  for (const t of p.temas) {
    if (!Number.isInteger(t.id) || !/^[A-C][0-2]$/.test(t.nivel) || (t.slug && !/^[a-z0-9-]+$/.test(t.slug))) {
      throw new Fallo("paquete", "El paquete de contenido trae un tema mal hecho.");
    }
  }
  for (const c of p.cuadernos || []) {
    if (!Number.isInteger(c.id) || !Array.isArray(c.temas)) throw new Fallo("paquete", "El paquete de contenido trae un cuaderno mal hecho.");
  }
}

// ---------------------------------------------------------------- Leer: paquete y sucesos

const archivos = new Map();     // ruta -> { sha, texto }
let tableroActual = null;       // { sha, datos }: el tablero del día, tal como llegó

/** El tablero del día tal como está en el repositorio, o null. La forma la revisa quien lo usa. */
export function tablero() { return tableroActual ? tableroActual.datos : null; }
/** Cambia cuando llega un tablero nuevo o unas clases nuevas: con eso la página sabe que tiene que volver a pintarse. */
export function huellaTablero() { return (tableroActual ? tableroActual.sha : "") + "|" + (clasesActual ? clasesActual.sha : "") + "|" + (lecturaActual ? lecturaActual.sha : ""); }
let lecturaActual = null;       // { sha, datos }: tu registro de lectura, tal como llegó
/** Tu registro de lectura tal como está en el repositorio, o null. La forma la revisa quien lo usa. */
export function lectura() { return lecturaActual ? lecturaActual.datos : null; }
let clasesActual = null;        // { sha, datos }: tus clases de Worldsacross, tal como llegaron
/** Tus clases tal como están en el repositorio, o null. La forma la revisa quien las usa. */
export function clases() { return clasesActual ? clasesActual.datos : null; }
const leidos = new Map();       // ruta -> { sha, lista }   (los sucesos ya separados, para no repetir el trabajo)

function separar(texto) {
  const lista = [];
  for (const linea of texto.split("\n")) {
    if (!linea.trim()) continue;
    try {
      const e = JSON.parse(linea);
      if (e && typeof e === "object" && e.id) lista.push(e);
    } catch { /* un renglón roto se salta; los demás cuentan */ }
  }
  return lista;
}

/** Todos los sucesos que este aparato conoce: los del repositorio más los que esperan en la fila. */
export function sucesos() {
  const todos = [];
  for (const [camino, a] of archivos) {
    let l = leidos.get(camino);
    if (!l || l.sha !== a.sha) { l = { sha: a.sha, lista: separar(a.texto) }; leidos.set(camino, l); }
    for (const e of l.lista) todos.push(e);
  }
  for (const e of leerFila()) todos.push(e);
  return todos;
}


/** Lo que este aparato guardó la última vez. Sirve para pintar al instante, antes de que GitHub conteste. */
export async function cargarLocal() {
  const guardado = await kvLeer("paquete");
  const indice = (await kvLeer("indice")) || {};
  archivos.clear();
  for (const camino of Object.keys(indice)) {
    const a = await kvLeer("ev:" + camino);
    if (a && typeof a.texto === "string") archivos.set(camino, a);
  }
  const loops = await kvLeer("loops");
  if (Array.isArray(loops)) conLoop = new Set(loops.filter(Number.isInteger));
  const voces = await kvLeer("voces");
  if (Array.isArray(voces)) conVoz = new Set(voces.filter(Number.isInteger));
  const presentas = await kvLeer("presentas");
  if (Array.isArray(presentas)) conPresenta = new Set(presentas.filter(Number.isInteger));
  const t = await kvLeer("tablero");
  tableroActual = t && typeof t.sha === "string" && t.datos && typeof t.datos === "object" ? t : null;
  const c = await kvLeer("clases");
  clasesActual = c && typeof c.sha === "string" && c.datos && typeof c.datos === "object" ? c : null;
  const l = await kvLeer("lectura");
  lecturaActual = l && typeof l.sha === "string" && l.datos && typeof l.datos === "object" ? l : null;
  if (!guardado || !guardado.datos) return null;
  try { revisarPaquete(guardado.datos); } catch { return null; }
  return guardado.datos;
}

async function guardarIndice() {
  const indice = {};
  for (const [camino, a] of archivos) indice[camino] = a.sha;
  await kvPoner("indice", indice);
}

/** Trae del repositorio el paquete (si cambió) y los archivos de sucesos que cambiaron. Devuelve el paquete. */
export function sincronizar() {
  return enTurno(async () => {
    sinc.leyendo = true;
    avisar();
    try {
      const guardado = await kvLeer("paquete");
      const r = await api(REPO + "/contents/" + ruta("paquete/contenido.json") + "?ref=" + encodeURIComponent(CONFIG.ramaContenido),
        { crudo: true, cabeceras: guardado && guardado.etag ? { "If-None-Match": guardado.etag } : {} });
      let paquete;
      if (r.status === 304 && guardado) paquete = guardado.datos;
      else if (r.ok) {
        try { paquete = await r.json(); } catch { throw new Fallo("paquete", "El paquete de contenido llegó roto."); }
        revisarPaquete(paquete);
        await kvPoner("paquete", { etag: r.headers.get("ETag"), datos: paquete });
      } else if (r.status === 404) throw new Fallo("falta", "La llave ya no abre tu repositorio Pelagos.", 404);
      else throw new Fallo("github", "GitHub contestó algo raro (" + r.status + ").", r.status);

      const t = await api(REPO + "/git/trees/" + encodeURIComponent(CONFIG.ramaAvance) + "?recursive=1");
      let arbol = [], hojaTablero = null, hojaClases = null, hojaLectura = null;
      if (t.ok) {
        const blobs = ((await t.json()).tree || []).filter((x) => x.type === "blob");
        arbol = blobs.filter((x) => RUTA_SUCESOS.test(x.path));
        hojaTablero = blobs.find((x) => x.path === RUTA_TABLERO) || null;
        hojaClases = blobs.find((x) => x.path === RUTA_CLASES) || null;
        hojaLectura = blobs.find((x) => x.path === RUTA_LECTURA) || null;
        conLoop = new Set(blobs.map((x) => RUTA_LOOP.exec(x.path)).filter(Boolean).map((m) => Number(m[1])));
        await kvPoner("loops", [...conLoop]);
        conVoz = new Set(blobs.map((x) => RUTA_VOZ.exec(x.path)).filter(Boolean).map((m) => Number(m[1])));
        await kvPoner("voces", [...conVoz]);
        conPresenta = new Set(blobs.map((x) => RUTA_PRESENTA.exec(x.path)).filter(Boolean).map((m) => Number(m[1])));
        await kvPoner("presentas", [...conPresenta]);
      }
      else if (t.status !== 404 && t.status !== 409) throw new Fallo("github", "GitHub contestó algo raro (" + t.status + ").", t.status);

      const cambiados = arbol.filter((x) => !archivos.has(x.path) || archivos.get(x.path).sha !== x.sha);
      for (let i = 0; i < cambiados.length; i += 6) {
        await Promise.all(cambiados.slice(i, i + 6).map(async (x) => {
          const b = await api(REPO + "/git/blobs/" + encodeURIComponent(x.sha), { crudo: true });
          if (!b.ok) throw new Fallo("github", "No se pudo leer " + x.path + ".", b.status);
          const texto = await b.text();
          const local = archivos.get(x.path);
          // Si lo de aquí es lo mismo y trae más renglones, GitHub todavía va atrasado: se queda lo de aquí.
          if (local && local.texto.length > texto.length && local.texto.startsWith(texto)) return;
          const nuevo = { sha: x.sha, texto };
          archivos.set(x.path, nuevo);
          await kvPoner("ev:" + x.path, nuevo);
        }));
      }
      const vivos = new Set(arbol.map((x) => x.path));
      for (const camino of [...archivos.keys()]) {
        if (vivos.has(camino)) continue;
        if ((reciente.get(camino) || 0) > Date.now() - 10 * 60 * 1000) continue;      // lo acabas de guardar: GitHub todavía no lo lista
        archivos.delete(camino); leidos.delete(camino); await kvQuitar("ev:" + camino);
      }
      await guardarIndice();
      // El tablero es un adorno: si no se puede leer o viene roto, se queda el de antes y lo demás sigue.
      if (!hojaTablero) {
        if (t.ok && tableroActual) { tableroActual = null; await kvQuitar("tablero"); }
      } else if (!tableroActual || tableroActual.sha !== hojaTablero.sha) {
        try {
          const b = await api(REPO + "/git/blobs/" + encodeURIComponent(hojaTablero.sha), { crudo: true });
          if (b.ok) {
            const datos = JSON.parse(await b.text());
            if (datos && typeof datos === "object") { tableroActual = { sha: hojaTablero.sha, datos }; await kvPoner("tablero", tableroActual); }
          }
        } catch (e) {
          if (e instanceof Fallo && e.tipo === "llave") throw e;
        }
      }
      // Las clases son otro adorno, igual que el tablero.
      if (!hojaClases) {
        if (t.ok && clasesActual) { clasesActual = null; await kvQuitar("clases"); }
      } else if (!clasesActual || clasesActual.sha !== hojaClases.sha) {
        try {
          const b = await api(REPO + "/git/blobs/" + encodeURIComponent(hojaClases.sha), { crudo: true });
          if (b.ok) {
            const datos = JSON.parse(await b.text());
            if (datos && typeof datos === "object") { clasesActual = { sha: hojaClases.sha, datos }; await kvPoner("clases", clasesActual); }
          }
        } catch (e) {
          if (e instanceof Fallo && e.tipo === "llave") throw e;
        }
      }
      // Y la lectura, igual.
      if (!hojaLectura) {
        if (t.ok && lecturaActual) { lecturaActual = null; await kvQuitar("lectura"); }
      } else if (!lecturaActual || lecturaActual.sha !== hojaLectura.sha) {
        try {
          const b = await api(REPO + "/git/blobs/" + encodeURIComponent(hojaLectura.sha), { crudo: true });
          if (b.ok) {
            const datos = JSON.parse(await b.text());
            if (datos && typeof datos === "object") { lecturaActual = { sha: hojaLectura.sha, datos }; await kvPoner("lectura", lecturaActual); }
          }
        } catch (e) {
          if (e instanceof Fallo && e.tipo === "llave") throw e;
        }
      }
      sinc.leido = Date.now();
      return paquete;
    } finally {
      sinc.leyendo = false;
      avisar();
    }
  });
}

// ---------------------------------------------------------------- Escribir: la fila

// Cada suceso que espera tiene su propia clave. Así dos pestañas pueden apuntar y quitar a la vez sin pisarse.
const filaEnMemoria = new Map();     // lo que el navegador no dejó guardar: vive mientras la página esté abierta
function leerFila() {
  const lista = [...filaEnMemoria.values()];
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const clave = ls.key(i);
      if (!clave || !clave.startsWith(CLAVES.fila)) continue;
      try {
        const e = JSON.parse(ls.getItem(clave));
        if (e && typeof e === "object" && e.id && !filaEnMemoria.has(e.id)) lista.push(e);
      } catch { /* una clave rota se salta */ }
    }
  } catch { /* sin localStorage: solo lo de memoria */ }
  return lista.sort((a, b) => (a.cuando < b.cuando ? -1 : a.cuando > b.cuando ? 1 : a.id < b.id ? -1 : 1));
}
function meterEnFila(e) {
  try { window.localStorage.setItem(CLAVES.fila + e.id, JSON.stringify(e)); }
  catch { filaEnMemoria.set(e.id, e); }
}
function sacarDeFila(ids) {
  for (const id of ids) {
    filaEnMemoria.delete(id);
    try { window.localStorage.removeItem(CLAVES.fila + id); } catch { /* nada que quitar */ }
  }
}

const reciente = new Map();          // camino -> cuándo lo guardó esta pestaña
// Las otras pestañas de este navegador se enteran al momento de lo que una guardó.
const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("pelagos") : null;
if (canal) {
  canal.onmessage = (ev) => {
    const d = ev.data;
    if (!d || d.t !== "archivo" || typeof d.camino !== "string" || !RUTA_SUCESOS.test(d.camino) || typeof d.texto !== "string") return;
    archivos.set(d.camino, { sha: String(d.sha), texto: d.texto });
    reciente.set(d.camino, Date.now());
    sinc.cambios++;
    avisar();
  };
}

let reloj = null;
function programar(ms) {
  if (reloj) clearTimeout(reloj);
  reloj = setTimeout(() => { reloj = null; subir(); }, ms);
}

/** Apunta un suceso. Queda guardado en este aparato al instante y sube a GitHub enseguida. */
export function apuntar(suceso) {
  meterEnFila({ ...suceso, aparato: aparato() });
  avisar();
  programar(1200);
}

function caminoDe(suceso) {
  const mes = /^\d{4}-\d{2}/.test(suceso.cuando || "") ? suceso.cuando.slice(0, 7) : new Date().toISOString().slice(0, 7);
  return "sucesos/" + aparato() + "/" + mes + ".jsonl";
}

async function bajar(camino) {
  const r = await api(REPO + "/contents/" + ruta(camino) + "?ref=" + encodeURIComponent(CONFIG.ramaAvance), { crudo: true });
  if (r.status === 404) return null;
  if (!r.ok) throw new Fallo("github", "No se pudo leer " + camino + ".", r.status);
  const texto = await r.text();
  return { sha: await shaDe(texto), texto };
}

async function escribir(camino, nuevos) {
  for (let intento = 0; intento < 4; intento++) {
    let actual = archivos.get(camino);
    if (!actual) {
      actual = await bajar(camino);
      if (actual) archivos.set(camino, actual);
    }
    const ya = new Set(actual ? separar(actual.texto).map((e) => e.id) : []);
    const faltan = nuevos.filter((e) => !ya.has(e.id));
    if (!faltan.length) return;
    let texto = actual ? actual.texto : "";
    if (texto && !texto.endsWith("\n")) texto += "\n";
    texto += faltan.map((e) => JSON.stringify(e)).join("\n") + "\n";
    const cuantas = faltan.filter((e) => e.t === "r").length;
    const r = await api(REPO + "/contents/" + ruta(camino), {
      metodo: "PUT",
      cuerpo: {
        message: "avance: " + (cuantas ? cuantas + (cuantas === 1 ? " respuesta" : " respuestas") : faltan.length + " sucesos") + " (" + aparato() + ")",
        content: aBase64(texto), branch: CONFIG.ramaAvance, ...(actual ? { sha: actual.sha } : {}),
      },
    });
    if (r.status === 200 || r.status === 201) {
      const j = await r.json();
      const guardado = { sha: j.content && j.content.sha ? j.content.sha : await shaDe(texto), texto };
      archivos.set(camino, guardado);
      reciente.set(camino, Date.now());
      await kvPoner("ev:" + camino, guardado);
      await guardarIndice();
      if (canal) { try { canal.postMessage({ t: "archivo", camino, ...guardado }); } catch { /* las otras pestañas se enteran al ponerse al día */ } }
      return;
    }
    if (r.status === 409 || r.status === 422) {       // alguien más tocó el archivo: se lee de nuevo y se junta
      archivos.delete(camino);
      continue;
    }
    if (r.status === 404) throw new Fallo("falta", "No se pudo guardar: falta la rama «" + CONFIG.ramaAvance + "» o la llave no deja escribir.", 404);
    throw new Fallo("github", "GitHub no quiso guardar (" + r.status + ").", r.status);
  }
  throw new Fallo("choque", "No se pudo guardar después de varios intentos.");
}

/** Sube lo que espera en la fila. Si no se puede, lo deja ahí y vuelve a intentar solo. */
export function subir() {
  return enTurno(async () => {
    const fila = leerFila();
    if (!fila.length || !hayLlave()) { avisar(); return; }
    sinc.guardando = true;
    avisar();
    try {
      const grupos = new Map();
      for (const e of fila) {
        const c = caminoDe(e);
        if (!grupos.has(c)) grupos.set(c, []);
        grupos.get(c).push(e);
      }
      for (const [camino, lista] of grupos) {
        await escribir(camino, lista);
        sacarDeFila(lista.map((e) => e.id));
      }
      sinc.error = null;
      sinc.guardado = Date.now();
      if (leerFila().length) programar(300);
    } catch (e) {
      sinc.error = e instanceof Fallo ? e : new Fallo("red", "No se pudo guardar.");
      if (sinc.error.tipo === "red" || sinc.error.tipo === "github" || sinc.error.tipo === "choque") programar(20000);
    } finally {
      sinc.guardando = false;
      avisar();
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { if (leerFila().length) programar(500); });
  window.addEventListener("storage", (ev) => { if (!ev.key || ev.key.startsWith(CLAVES.fila)) { sinc.cambios++; avisar(); } });
}

// ---------------------------------------------------------------- Lecciones y portadas

/** El archivo de una lección. Se guarda una copia en este aparato y solo se baja de nuevo si cambió. */
export async function leccion(info) {
  const clave = "lec:" + info.archivo;
  const guardada = await kvLeer(clave);
  if (guardada && guardada.huella === info.huella) return guardada.datos;
  try {
    const r = await api(REPO + "/contents/" + ruta(info.archivo) + "?ref=" + encodeURIComponent(CONFIG.ramaContenido), { crudo: true });
    if (!r.ok) throw new Fallo(r.status === 404 ? "falta" : "github", "No se pudo abrir la lección.", r.status);
    const datos = await r.json();
    await kvPoner(clave, { huella: info.huella, datos });
    return datos;
  } catch (e) {
    if (guardada && !(e instanceof Fallo && e.tipo === "llave")) return guardada.datos;     // sin internet: sirve la copia vieja
    throw e;
  }
}

/** Los subtítulos (WebVTT) del video de una tutora: contenido/tutoras/subtitulos/<lección>.vtt. Texto o null si no tiene. */
export async function subtitulos(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const clave = "vtt:" + id;
  try {
    const r = await api(REPO + "/contents/" + ruta("contenido/tutoras/subtitulos/" + id + ".vtt") + "?ref=" + encodeURIComponent(CONFIG.ramaContenido), { crudo: true });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("github");
    const texto = await r.text();
    await kvPoner(clave, texto);
    return texto;
  } catch {
    try { return (await kvLeer(clave)) || null; } catch { return null; }   // sin internet: la copia guardada
  }
}

/** Las escenas de cada tutora en orden (contenido/tutoras/escalada.json), para el fondo del Kwiz con la tutora. */
export async function escalada() {
  try {
    const r = await api(REPO + "/contents/" + ruta("contenido/tutoras/escalada.json") + "?ref=" + encodeURIComponent(CONFIG.ramaContenido), { crudo: true });
    if (!r.ok) throw new Error("github");
    const d = await r.json();
    await kvPoner("escalada", d);
    return d;
  } catch {
    try { return (await kvLeer("escalada")) || null; } catch { return null; }
  }
}

/** El guion de «Practica con la tutora»: contenido/tutoras/practica/<lección>.json. Objeto o null si no tiene. */
export async function practica(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const clave = "practica:" + id;
  try {
    const r = await api(REPO + "/contents/" + ruta("contenido/tutoras/practica/" + id + ".json") + "?ref=" + encodeURIComponent(CONFIG.ramaContenido), { crudo: true });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("github");
    const datos = await r.json();
    await kvPoner(clave, datos);
    return datos;
  } catch {
    try { return (await kvLeer(clave)) || null; } catch { return null; }   // sin internet: la copia guardada
  }
}

const fotosVivas = new Map();   // nombre -> promesa de una dirección blob:

/** Una portada como dirección que la página puede mostrar. Las portadas son privadas: se bajan con la llave. */
export function foto(info, carpeta = "reef") {
  if (!info || !info.nombre || !/^[a-z]+$/.test(carpeta)) return Promise.resolve(null);
  const nombre = carpeta + "/" + info.nombre;
  if (!fotosVivas.has(nombre)) {
    fotosVivas.set(nombre, (async () => {
      const clave = carpeta === "reef" ? "foto:" + info.nombre : "foto:" + nombre;
      const guardada = await kvLeer(clave);
      let bytes = guardada && guardada.huella === info.huella ? guardada.bytes : null;
      if (!bytes) {
        try {
          const r = await api(REPO + "/contents/" + ruta("contenido/img/" + nombre) + "?ref=" + encodeURIComponent(CONFIG.ramaContenido), { crudo: true });
          if (!r.ok) throw new Fallo("github", "No se pudo bajar la portada.", r.status);
          bytes = await r.arrayBuffer();
          await kvPoner(clave, { huella: info.huella, bytes });
        } catch {
          bytes = guardada ? guardada.bytes : null;
        }
      }
      if (!bytes) { fotosVivas.delete(nombre); return null; }
      return URL.createObjectURL(new Blob([bytes], { type: info.nombre.endsWith(".gif") ? "image/gif" : info.nombre.endsWith(".webp") ? "image/webp" : "image/jpeg" }));
    })());
  }
  return fotosVivas.get(nombre);
}

const tutoresVivos = new Map();   // archivo -> promesa de una dirección blob:
/** La foto de un tutor (tablero/tutores/<archivo>, rama de avance) como dirección que la página puede mostrar, o null. */
export function fotoTutor(archivo) {
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(String(archivo || ""))) return Promise.resolve(null);
  if (!tutoresVivos.has(archivo)) {
    tutoresVivos.set(archivo, (async () => {
      const clave = "tutor:" + archivo;
      let bytes = null;
      try {
        const r = await api(REPO + "/contents/" + ruta("tablero/tutores/" + archivo) + "?ref=" + encodeURIComponent(CONFIG.ramaAvance), { crudo: true });
        if (r.ok) { bytes = await r.arrayBuffer(); await kvPoner(clave, { bytes }); }
      } catch { /* sin internet: sirve la copia de antes */ }
      if (!bytes) { const g = await kvLeer(clave); bytes = g ? g.bytes : null; }
      if (!bytes) { tutoresVivos.delete(archivo); return null; }
      const tipo = archivo.endsWith(".png") ? "image/png" : archivo.endsWith(".webp") ? "image/webp" : "image/jpeg";
      return URL.createObjectURL(new Blob([bytes], { type: tipo }));
    })());
  }
  return tutoresVivos.get(archivo);
}

// ---------------------------------------------------------------- Escenas que sube él (GIF, imágenes, video)
// Viven en la rama de avance, en escenas/<lugar>/: un archivo por escena y un indice.json con el orden y la descripción.
// Así son privadas (se bajan con la llave), permanentes y salen en todos sus aparatos.

const TIPOS_ESCENA = { gif: "image/gif", webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", m4a: "audio/mp4" };
const MAX_ESCENA = 30 * 1024 * 1024;       // la API de GitHub aguanta más, pero el celular no
const escenasVivas = new Map();

function salaBuena(sala) { return /^[a-z0-9-]+$/.test(String(sala || "")); }

async function leerIndiceEscenas(sala) {
  const r = await api(REPO + "/contents/" + ruta("escenas/" + sala + "/indice.json") + "?ref=" + encodeURIComponent(CONFIG.ramaAvance));
  if (r.status === 404) return { sha: null, items: [] };
  if (!r.ok) throw new Fallo("github", "No se pudieron leer las escenas.", r.status);
  const j = await r.json();
  let items = [];
  try { items = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(String(j.content || "").replace(/\s/g, "")), (c) => c.charCodeAt(0)))); } catch { items = []; }
  return { sha: j.sha, items: Array.isArray(items) ? items.filter((x) => x && typeof x.archivo === "string" && /^[a-z0-9-]+\.[a-z0-9]+$/.test(x.archivo)) : [] };
}

async function escribirIndiceEscenas(sala, cambia) {
  for (let intento = 0; intento < 4; intento++) {
    const { sha, items } = await leerIndiceEscenas(sala);
    const nuevos = cambia(items.slice());
    const r = await api(REPO + "/contents/" + ruta("escenas/" + sala + "/indice.json"), {
      metodo: "PUT",
      cuerpo: { message: "escenas: " + sala + " (" + aparato() + ")", content: aBase64(JSON.stringify(nuevos, null, 1)), branch: CONFIG.ramaAvance, ...(sha ? { sha } : {}) },
    });
    if (r.status === 200 || r.status === 201) return nuevos;
    if (r.status === 409 || r.status === 422) continue;
    if (r.status === 404) throw new Fallo("falta", "No se pudo guardar: falta la rama «" + CONFIG.ramaAvance + "» o la llave no deja escribir.", 404);
    throw new Fallo("github", "GitHub no quiso guardar la escena (" + r.status + ").", r.status);
  }
  throw new Fallo("choque", "No se pudo guardar la escena después de varios intentos.");
}

/** Las escenas de un lugar, en orden: [{ archivo, tipo, desc, orden }]. */
export async function escenasDe(sala) {
  if (!salaBuena(sala)) return [];
  const { items } = await leerIndiceEscenas(sala);
  return items.sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** Sube un archivo (GIF, imagen o video) a un lugar. Devuelve la lista nueva. */
export async function escenaSubir(sala, archivo, desc = "") {
  if (!salaBuena(sala)) throw new Fallo("escena", "Ese lugar no admite escenas.");
  const ext = (String(archivo.name || "").split(".").pop() || "").toLowerCase();
  const tipo = TIPOS_ESCENA[ext];
  if (!tipo) throw new Fallo("escena", "Solo GIF, WebP, PNG, JPG, MP4, WebM, MP3 o M4A.");
  if (archivo.size > MAX_ESCENA) throw new Fallo("escena", "Pesa más de 30 MB. Hazlo más chico o más corto.");
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const nombre = Date.now().toString(36) + (ext === "jpeg" ? "jpg" : ext).replace(/^/, ".");
  const r = await api(REPO + "/contents/" + ruta("escenas/" + sala + "/" + nombre), {
    metodo: "PUT",
    cuerpo: { message: "escena: " + sala + " (" + aparato() + ")", content: btoa(s), branch: CONFIG.ramaAvance },
  });
  if (r.status === 404) throw new Fallo("falta", "No se pudo guardar: falta la rama «" + CONFIG.ramaAvance + "» o la llave no deja escribir.", 404);
  if (r.status !== 200 && r.status !== 201) throw new Fallo("github", "GitHub no quiso guardar la escena (" + r.status + ").", r.status);
  const loop = RUTA_LOOP.exec("escenas/" + sala + "/" + nombre);
  if (loop) { conLoop = new Set([...conLoop, Number(loop[1])]); kvPoner("loops", [...conLoop]).catch(() => {}); }
  const lista = await escribirIndiceEscenas(sala, (items) => {
    const orden = items.reduce((m, x) => Math.max(m, x.orden || 0), 0) + 1;
    items.push({ archivo: nombre, tipo, desc: String(desc || "").slice(0, 600), orden });
    return items;
  });
  return lista.sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** Quita una escena de la lista. El archivo se queda en el historial del repositorio: nada se borra para siempre. */
export async function escenaQuitar(sala, archivo) {
  if (!salaBuena(sala)) return [];
  const lista = await escribirIndiceEscenas(sala, (items) => items.filter((x) => x.archivo !== archivo));
  return lista.sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** Cambia el orden de las escenas de un lugar: `archivos` es la lista de nombres en el orden nuevo. */
export async function escenaOrdenar(sala, archivos) {
  if (!salaBuena(sala) || !Array.isArray(archivos)) return [];
  const lista = await escribirIndiceEscenas(sala, (items) => {
    const pos = new Map(archivos.map((a, i) => [a, i]));
    items.sort((a, b) => (pos.has(a.archivo) ? pos.get(a.archivo) : 1e6 + (a.orden || 0)) - (pos.has(b.archivo) ? pos.get(b.archivo) : 1e6 + (b.orden || 0)));
    items.forEach((x, i) => { x.orden = i + 1; });
    return items;
  });
  return lista.sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** Una escena como dirección blob: que la página puede reproducir. */
export function escenaUrl(sala, item) {
  if (!salaBuena(sala) || !item || !/^[a-z0-9-]+\.[a-z0-9]+$/.test(item.archivo || "")) return Promise.resolve(null);
  const clave = sala + "/" + item.archivo;
  if (!escenasVivas.has(clave)) {
    escenasVivas.set(clave, (async () => {
      const r = await api(REPO + "/contents/" + ruta("escenas/" + clave) + "?ref=" + encodeURIComponent(CONFIG.ramaAvance), { crudo: true });
      if (!r.ok) throw new Fallo("github", "No se pudo bajar la escena.", r.status);
      const bytes = await r.arrayBuffer();
      if (item.tipo === "image/gif") duracionesGif.set(clave, medirGif(new Uint8Array(bytes)));
      return URL.createObjectURL(new Blob([bytes], { type: item.tipo || "application/octet-stream" }));
    })().catch((e) => { escenasVivas.delete(clave); throw e; }));
  }
  return escenasVivas.get(clave);
}

const duracionesGif = new Map();
/** Cuánto dura una vuelta de un GIF y si se repite solo: { ms, infinito }. Lee los retardos de cada cuadro. */
function medirGif(b) {
  let ms = 0, infinito = false;
  try {
    let i = 13;
    if (b[10] & 0x80) i += 3 * (1 << ((b[10] & 7) + 1));
    while (i < b.length && b[i] !== 0x3b) {
      if (b[i] === 0x21) {
        const tipo = b[i + 1];
        if (tipo === 0xf9) ms += (b[i + 4] | (b[i + 5] << 8)) * 10 || 100;
        if (tipo === 0xff && b[i + 2] === 11 && String.fromCharCode(...b.subarray(i + 3, i + 11)) === "NETSCAPE") infinito = (b[i + 16] | (b[i + 17] << 8)) === 0;
        i += 2;
        while (b[i]) i += b[i] + 1;
        i++;
      } else if (b[i] === 0x2c) {
        const flags = b[i + 9];
        i += 10;
        if (flags & 0x80) i += 3 * (1 << ((flags & 7) + 1));
        i++;
        while (b[i]) i += b[i] + 1;
        i++;
      } else break;
    }
  } catch { /* GIF raro: se trata como si se repitiera solo */ return { ms: 0, infinito: true }; }
  return { ms: Math.max(ms, 100), infinito };
}
export function escenaGif(sala, item) { return duracionesGif.get(sala + "/" + (item && item.archivo)) || null; }

// ---------------------------------------------------------------- Tu almacén de videos en Cloudflare R2
// La llave de solo lectura del almacén vive en ajustes/nube.json (rama de avance, privada): se pone una vez
// en un aparato y los demás la toman de ahí. Copia en este aparato para cuando no hay internet.
const RUTA_NUBE = "ajustes/nube.json";

/** Los datos del almacén ({ url, id, secreto, cubeta }) o null si todavía no los pones. */
export async function nubeLeer() {
  try {
    const r = await api(REPO + "/contents/" + ruta(RUTA_NUBE) + "?ref=" + encodeURIComponent(CONFIG.ramaAvance), { crudo: true });
    if (r.status === 404) { await kvPoner("nube", null); return null; }
    if (!r.ok) throw new Error("github");
    const d = await r.json();
    await kvPoner("nube", d);
    return d;
  } catch {
    try { return (await kvLeer("nube")) || null; } catch { return null; }
  }
}

