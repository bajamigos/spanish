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

let caja = null, v = null, lista = [], i = 0, vivo = false, deQuien = null, fuenteLista = null;

function asegurar() {
  if (caja) return;
  caja = document.createElement("div");
  caja.id = "fondoTutora";
  caja.setAttribute("aria-hidden", "true");
  caja.hidden = true;
  v = document.createElement("video");
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = "auto";
  v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
  caja.append(v);
  document.body.prepend(caja);
  const paso = () => {
    if (vivo && lista.length && !v.paused) {
      const [, a] = lista[i];
      if (v.currentTime >= a - 0.04 || v.currentTime < lista[i][0] - 0.5) {
        i = (i + 1) % lista.length;
        v.currentTime = lista[i][0];
      }
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/**
 * Muestra el fondo de la tutora `id` en la etapa dada.
 * `fuente()` devuelve un File o una dirección (se pide una sola vez por tutora); `tramos` es la lista de esa etapa.
 */
export async function mostrar(id, tramos, fuente, lugar = null) {
  asegurar();
  // Con `lugar`, el video va dentro de la página (arriba de la pregunta); sin él, fijo detrás de todo.
  if (lugar && caja.parentNode !== lugar) lugar.append(caja);
  caja.classList.toggle("enLinea", !!lugar);
  document.body.classList.add("conTutora");
  caja.hidden = false;
  vivo = true;
  if (deQuien !== id) {
    deQuien = id;
    if (v.src && v.src.startsWith("blob:")) URL.revokeObjectURL(v.src);
    fuenteLista = null;
    const f = await fuente();
    if (deQuien !== id) return;
    if (!f) { caja.hidden = true; return; }
    fuenteLista = typeof f === "string" ? f : URL.createObjectURL(f);
    v.src = fuenteLista;
  }
  if (!tramos || !tramos.length) return;
  const nueva = JSON.stringify(tramos) !== JSON.stringify(lista);
  lista = tramos;
  if (nueva) {
    i = 0;
    if (v.readyState < 1) await new Promise((ok) => { v.addEventListener("loadedmetadata", ok, { once: true }); setTimeout(ok, 20000); });
    v.currentTime = lista[0][0];
  }
  v.play().catch(() => {});
}

/** Esconde el fondo (otra página). El video se queda cargado por si vuelves con la misma tutora. */
export function ocultar() {
  if (!caja || caja.hidden) { document.body.classList.remove("conTutora"); return; }
  vivo = false;
  caja.hidden = true;
  v.pause();
  document.body.classList.remove("conTutora");
}
