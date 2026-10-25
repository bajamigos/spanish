// Los videos completos de las tutoras. Viven solo en tus aparatos: nunca suben a GitHub.
// Desde el 15-Oct los videos salen de tu almacén de Cloudflare (web/nube.js). Aquí solo queda leer, sin preguntar nada,
// lo que un aparato ya tenía de antes: la carpeta que ya tenía permiso o los videos importados.
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

/** El número de lección al principio del nombre de un archivo de video, o null. */
export function leccionDelNombre(nombre) {
  const m = /^(\d+)(?!\d)/.exec(String(nombre || "").trim());
  return m && VIDEO.test(nombre) ? Number(m[1]) : null;
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

/** Las lecciones que ya tienen su video completo en este aparato: importados y, si ya diste permiso, los de tu carpeta. Nunca pide permiso. */
export async function cuales() {
  const ids = new Set();
  try {
    for (const k of (await pedir("readonly", (c) => c.getAllKeys())) || []) {
      const m = /^video:(\d+)$/.exec(String(k));
      if (m) ids.add(Number(m[1]));
    }
  } catch { /* sin base todavía */ }
  try {
    const h = await leer("carpeta");
    if (h && (await h.queryPermission({ mode: "read" })) === "granted") {
      for await (const [nombre, e] of h.entries()) {
        const id = e.kind === "file" ? leccionDelNombre(nombre) : null;
        if (id) ids.add(id);
      }
    }
  } catch { /* la carpeta ya no está o no deja leer */ }
  return ids;
}
