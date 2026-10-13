// Los videos completos de las tutoras. Viven solo en tus aparatos: nunca suben a GitHub.
// - En la computadora (Chrome o Edge): eliges una vez tu carpeta «Pelagos videos» y Pelagos la recuerda.
// - En el celular (o donde no se puede elegir carpeta): importas los videos una vez y se guardan en este navegador.
// Cada video se reconoce por el número de la lección al principio del nombre: «6010 - Esperanza.mp4».

const BASE = "pelagos-videos", CAJA = "cosas";
const VIDEO = /\.(mp4|webm|m4v|mov)$/i;

function abrir() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(CAJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
async function pedir(modo, hacer) {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const tx = db.transaction(CAJA, modo);
    const q = hacer(tx.objectStore(CAJA));
    tx.oncomplete = () => ok(q && q.result);
    tx.onerror = () => mal(tx.error);
  });
}
const leer = (k) => pedir("readonly", (c) => c.get(k));
const escribir = (k, v) => pedir("readwrite", (c) => c.put(v, k));

/** Si este navegador deja elegir una carpeta (Chrome o Edge en la computadora). */
export const puedeCarpeta = () => typeof window.showDirectoryPicker === "function";

/** El número de lección al principio del nombre de un archivo de video, o null. */
export function leccionDelNombre(nombre) {
  const m = /^(\d+)(?!\d)/.exec(String(nombre || "").trim());
  return m && VIDEO.test(nombre) ? Number(m[1]) : null;
}

/** Elige la carpeta de videos. Tiene que llamarse desde un clic. */
export async function elegirCarpeta() {
  const h = await window.showDirectoryPicker({ id: "pelagos-videos", mode: "read" });
  await escribir("carpeta", h);
  return h.name;
}

/** El nombre de la carpeta elegida, o "" si no hay. */
export async function nombreCarpeta() {
  try { const h = await leer("carpeta"); return h ? h.name : ""; } catch { return ""; }
}

/** Guarda en este navegador los videos elegidos. Devuelve cuántos entraron. */
export async function importar(archivos) {
  let n = 0;
  for (const f of archivos) {
    const id = leccionDelNombre(f.name);
    if (!id) continue;
    await escribir("video:" + id, f);
    n++;
  }
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch { /* sin permiso: se guarda igual */ }
  return n;
}

/** Cuántos videos hay guardados dentro de este navegador. */
export async function cuantosImportados() {
  try { return ((await pedir("readonly", (c) => c.getAllKeys())) || []).filter((k) => String(k).startsWith("video:")).length; } catch { return 0; }
}

async function deLaCarpeta(id, conPermiso) {
  const h = await leer("carpeta");
  if (!h) return null;
  let p = await h.queryPermission({ mode: "read" });
  if (p !== "granted" && conPermiso) p = await h.requestPermission({ mode: "read" });
  if (p !== "granted") return null;
  for await (const [nombre, e] of h.entries()) {
    if (e.kind === "file" && leccionDelNombre(nombre) === id) return e.getFile();
  }
  return null;
}

/** El video completo de la tutora de una lección, o null si no está en este aparato. */
export async function video(id, conPermiso = true) {
  try { const f = await leer("video:" + id); if (f) return f; } catch { /* sigue con la carpeta */ }
  try { return await deLaCarpeta(id, conPermiso); } catch { return null; }
}
