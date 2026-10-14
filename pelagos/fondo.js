// El video de fondo del «Kwiz con la tutora»: arranca con su presentación y avanza un tramo de la escena con cada acierto.
// Vive fuera de la página (un solo <video> fijo detrás de todo), así no se vuelve a cargar con cada pregunta.
// Va siempre sin sonido.

/**
 * Reparte las escenas de una tutora en n + 1 etapas: la 0 es la primera escena (su presentación);
 * el resto de la escena se divide en n partes seguidas, en orden, y la última termina en el final.
 * Devuelve n + 1 listas de tramos [de, a] (tiempos del archivo original).
 */
export function etapas(escenas, n = 5) {
  if (!escenas || !escenas.length) return [];
  const resto = escenas.slice(1), L = resto.length;
  const salida = [escenas[0].tramos];
  const b = (k) => Math.round((k * L) / n);
  for (let k = 1; k <= n; k++) {
    const trozo = resto.slice(b(k - 1), b(k)).flatMap((e) => e.tramos);
    salida.push(trozo.length ? trozo : salida[salida.length - 1]);
  }
  return salida;
}

// Dos videos con el mismo archivo: uno se ve y el otro espera ya parado en el principio de la etapa siguiente,
// así el salto de escena al acertar es instantáneo (sobre todo en el iPhone).
let caja = null, vids = [], act = 0, listas = [[], []], idx = [0, 0], vivo = false, deQuien = null, propio = null;
const clave = (t) => JSON.stringify(t || []);

function nuevoVideo() {
  const x = document.createElement("video");
  x.muted = true; x.defaultMuted = true; x.playsInline = true; x.preload = "auto";
  x.setAttribute("playsinline", ""); x.setAttribute("muted", "");
  return x;
}
const conDatos = (x) => (x.readyState >= 1 ? Promise.resolve() : new Promise((ok) => { x.addEventListener("loadedmetadata", ok, { once: true }); setTimeout(ok, 20000); }));

function asegurar() {
  if (caja) return;
  caja = document.createElement("div");
  caja.id = "fondoTutora";
  caja.setAttribute("aria-hidden", "true");
  caja.hidden = true;
  vids = [nuevoVideo(), nuevoVideo()];
  vids[1].hidden = true;
  caja.append(...vids);
  document.body.prepend(caja);
  const paso = () => {
    const v = vids[act], lista = listas[act];
    if (vivo && lista.length && !v.paused) {
      const k = idx[act];
      if (v.currentTime >= lista[k][1] - 0.04 || v.currentTime < lista[k][0] - 0.5) {
        idx[act] = (k + 1) % lista.length;
        v.currentTime = lista[idx[act]][0];
      }
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/** Deja el video escondido parado en el principio de `tramos`, listo para cambiar. */
async function preparar(tramos) {
  const o = 1 - act, x = vids[o];
  if (!tramos || !tramos.length || clave(tramos) === clave(listas[act])) return;
  listas[o] = tramos; idx[o] = 0;
  await conDatos(x);
  if (clave(listas[o]) === clave(tramos)) { x.pause(); x.currentTime = tramos[0][0]; }
}

/**
 * Muestra el video de la tutora `id` en la etapa dada (`tramos`) y prepara la que sigue (`despues`).
 * `fuente()` devuelve un File o una dirección (se pide una sola vez por tutora).
 * Con `lugar`, el video va dentro de la página (arriba de la pregunta); sin él, fijo detrás de todo.
 */
export async function mostrar(id, tramos, fuente, lugar = null, despues = null) {
  asegurar();
  if (lugar && caja.parentNode !== lugar) lugar.append(caja);
  caja.classList.toggle("enLinea", !!lugar);
  document.body.classList.add("conTutora");
  caja.hidden = false;
  vivo = true;
  if (deQuien !== id) {
    deQuien = id;
    if (propio) { URL.revokeObjectURL(propio); propio = null; }
    listas = [[], []];
    const f = await fuente();
    if (deQuien !== id) return;
    if (!f) { caja.hidden = true; return; }
    const src = typeof f === "string" ? f : (propio = URL.createObjectURL(f));
    for (const x of vids) x.src = src;
  }
  if (!tramos || !tramos.length) return;
  const k = clave(tramos);
  if (k !== clave(listas[act])) {
    const o = 1 - act;
    if (k === clave(listas[o]) && vids[o].readyState >= 2) {
      // Cambio instantáneo: el otro video ya estaba parado ahí.
      vids[act].pause(); vids[act].hidden = true;
      act = o; vids[act].hidden = false;
    } else {
      listas[act] = tramos; idx[act] = 0;
      await conDatos(vids[act]);
      vids[act].currentTime = tramos[0][0];
    }
  }
  vids[act].play().catch(() => {});
  preparar(despues);
}

/** Esconde el video (otra página). Se queda cargado por si vuelves con la misma tutora. */
export function ocultar() {
  document.body.classList.remove("conTutora");
  if (!caja || caja.hidden) return;
  vivo = false;
  caja.hidden = true;
  for (const x of vids) x.pause();
}
