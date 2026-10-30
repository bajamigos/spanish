// Las tutoras · Repaso en audio: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=bb17009638";
import * as A from "./almacen.js?v=bb17009638";
import * as V from "./videos.js?v=bb17009638";
import * as NB from "./nube.js?v=bb17009638";
import { abrirPractica } from "./practica.js?v=bb17009638";
import { E, P, conFondo, esMovimiento, escenasPorSala, guardado, guardar, info, pintar, poner, porId, recalcular, verNoExiste } from "./app.js?v=bb17009638";
import { bancoPorTema, barra, cuando, entradas, esBajo, esc, pct, plural, titulo } from "./texto.js?v=bb17009638";
import { ambiente, mudo } from "./acervo.js?v=bb17009638";
import { $, NIVELES, vista } from "./base.js?v=bb17009638";

// ---------------------------------------------------------------- Las tutoras

/** La tutora de un tema, si ya está escrita. */
const tutoraDe = (id) => (P.tutoras || []).find((t) => t.leccion === id) || null;
/** El nombre corto de la tutora de una lección («Udela»), o «la tutora». */
const nombreTutora = (id) => { const t = tutoraDe(id); return t && t.tutora ? t.tutora.split(",")[0].trim() : "la tutora"; };

// La escena completa de una tutora: el video vive solo en el aparato (ver web/videos.js).
// «Escuchar a <tutora>»: su episodio grabado (MP3) en la rama avance, en escenas/voz-<lección>/ (como los loops).
// El botón sale solo si ya hay grabación. El audio se baja con la llave y se toca aquí mismo, con el reproductor del aparato.
const nombreCorto = (t) => t.tutora.split(",")[0];
const salaVoz = (id) => "voz-" + id;
// «Conoce a <tutora>»: su presentación corta (su regla, sus trampas y su frase), en escenas/presenta-<lección>/.
const salaPresenta = (id) => "presenta-" + id;
const botonEscena = (id) => {
  const t = tutoraDe(id);
  const conoce = t ? `<button type="button" class="ub grande" data-presenta="${id}" hidden>Estudiar con ${esc(nombreCorto(t))}</button>` : "";
  const oir = t ? `<button type="button" class="ub grande" data-escuchar="${id}" hidden>Escuchar a ${esc(nombreCorto(t))}</button>` : "";
  // «Kwiz con la tutora»: sus preguntas, de 5 en 5 aciertos, con su escena de fondo que avanza con cada acierto.
  const prac = t && (bancoPorTema().get(id) || 0) >= N.ACIERTOS_TUTORA ? `<button type="button" class="ub grande" data-kwiz='{"tipo":"tutora","tema":${id}}'>Practicar con ${esc(nombreCorto(t))}</button>` : "";
  // «Llamar a <tutora>»: abre un chat nuevo de Claude con la llamada ya escrita; ahí se toca el botón de voz.
  const llama = t ? `<a class="ub grande" data-llamar href="${esc(enlaceLlamada(t))}" target="_blank" rel="noopener">Llamar a ${esc(nombreCorto(t))}</a>` : "";
  // En Limpio no hay ninguna imagen de la tutora: tampoco el botón de su escena completa.
  const escena = ambiente() === "limpio" ? "" : `<button type="button" class="ub grande" data-escena="${id}">Ver la escena completa</button>`;
  return `<div class="go">${escena}${conoce}${oir}${prac}${llama}</div><div class="voz" data-voz="${id}"></div><p class="small" data-escenaaviso="${id}" role="status"></p>`;
};

/**
 * La llamada de voz con una tutora: las instrucciones para Claude, armadas con su regla y su personaje.
 * Ella enseña la regla al principio y luego le pone una misión de su mundo. Sin nada explícito: el modo de voz no lo hace.
 * Si su personaje trae «escenas_llamada», se escoge una al azar; si no, ella inventa una con su escenario.
 */
function textoLlamada(t, azar = Math.random) {
  const p = t.personaje || {};
  const nombre = nombreCorto(t);
  // Del «set» solo se toman los lugares y objetos (lo que va antes de cada «=»).
  const escenario = String(t.set || "").split(";").map((s) => s.split("=")[0].trim()).filter(Boolean).join(", ");
  const rasgos = [
    p.edad && `${p.edad} años`, p.generacion, p.acento && `acento: ${p.acento}`, p.registro && `estilo: ${p.registro}`,
    p.energia && `energía: ${p.energia}`, p.rasgo,
    p.muletillas && p.muletillas.length && `muletillas: ${p.muletillas.join(", ")}`,
  ].filter(Boolean).map((x) => String(x).trim().replace(/[.\s]+$/, "")).join("; ");
  const escenas = Array.isArray(p.escenas_llamada) ? p.escenas_llamada : [];
  const mision = escenas.length
    ? `La misión de hoy: ${escenas[Math.floor(azar() * escenas.length) % escenas.length]}`
    : `Inventa una misión de tu mundo${escenario ? ` (${escenario})` : ""}: un problema que solo se resuelve si uso la regla.`;
  return [
    `Vamos a hacer una llamada de práctica de español por voz. Tú eres ${t.tutora}, una de las tutoras de Pelagos, mi app de estudio. Yo soy Grifo, tu estudiante. Quédate en personaje toda la llamada.`,
    `Quién eres: ${t.tutora}.${rasgos ? " " + rasgos + "." : ""}${escenario ? ` Tu mundo: ${escenario}.` : ""}`,
    `Tu regla, la única que practicamos hoy: ${t.regla}`,
    `Cómo va la llamada:`,
    `1. Abres tú, en personaje y con tu energía, ya dentro de tu mundo. Nunca me preguntes de qué quiero hablar.`,
    `2. Clase relámpago, menos de un minuto: me explicas la regla a tu manera, con un truco para acordarme y dos o tres ejemplos. Luego me pides que repita una forma.`,
    `3. ${mision} Hazme preguntas que me obliguen a usar la regla. Si me trabo, dame una pista con tus palabras.`,
    `4. Turnos cortos: una o dos frases y me pasas la palabra. Yo hablo más que tú.`,
    `5. Una vez en la llamada, equivócate a propósito con la regla, como si nada. Si te cacho, lo celebras y gano un punto.`,
    `6. No me corrijas a media plática: si me equivoco, repite la forma correcta de pasada y sigue.`,
    `7. Después de unos ocho intercambios, unos tres minutos, cierras tú: mi marcador (cuántas veces usé bien la regla), mis dos o tres errores con la forma correcta, uno por línea, y un pendiente para la próxima llamada. Luego te despides.`,
    `8. Si digo «paso» o «ahorita no», te despides en una frase.`,
    `Estilo: español mexicano natural y sencillo, con tus muletillas. Coqueta, juguetona y con humor, sin lenguaje explícito; el coqueteo nunca depende de que conteste bien. Es para el modo de voz: frases cortas, sin listas, sin emojis, sin asteriscos ni acotaciones.`,
    `Empieza ya, en personaje.`,
  ].join("\n");
}
/** El enlace que abre la llamada en Claude (chat nuevo con el texto ya puesto). */
const enlaceLlamada = (t, azar) => "https://claude.ai/new?q=" + encodeURIComponent(textoLlamada(t, azar));
function conectarEscenas(raiz) {
  for (const b of raiz.querySelectorAll("[data-escena]")) b.addEventListener("click", () => verEscena(Number(b.dataset.escena)));
  for (const b of raiz.querySelectorAll("[data-practica]")) b.addEventListener("click", async () => {
    const id = Number(b.dataset.practica), aviso = vista.querySelector(`[data-escenaaviso="${id}"]`);
    if (aviso) aviso.textContent = "Preparando la práctica…";
    // Primero un video que este aparato ya tenga (sin pedir permiso ni carpeta); si no, tu almacén de Cloudflare.
    let f = await V.video(id, false);
    if (!f) f = (await enlaceNube(id)) || null;
    try { await abrirPractica(id, f, A, NB); if (aviso) aviso.textContent = ""; } catch (e) { if (aviso) aviso.textContent = e.message || "No se pudo abrir la práctica."; }
  });
  for (const [attr, sala, etiqueta] of [["escuchar", salaVoz, "Escuchar a "], ["presenta", salaPresenta, "Estudiar con "]]) {
    for (const b of raiz.querySelectorAll(`[data-${attr}]`)) {
      const id = Number(b.dataset[attr]);
      A.escenasDe(sala(id)).then((l) => {
        const v = l.filter((x) => /^audio\//.test(x.tipo || "")).slice(-1)[0];
        if (!v || !b.isConnected) return;
        b.hidden = false;
        b.addEventListener("click", () => escuchar(b, id, v, sala(id), etiqueta));
      }).catch(() => {});
    }
  }
}
async function escuchar(b, id, v, sala = salaVoz(id), etiqueta = "Escuchar a ") {
  const caja = vista.querySelector(`[data-voz="${id}"]`), t = tutoraDe(id);
  const aviso = vista.querySelector(`[data-escenaaviso="${id}"]`);
  if (!caja) return;
  if (repaso) pararRepaso("");
  for (const otro of caja.querySelectorAll("audio")) if (otro.dataset.sala !== sala) { otro.pause(); otro.remove(); }
  let audio = caja.querySelector("audio");
  if (!audio) {
    b.disabled = true;
    if (aviso) aviso.textContent = "Bajando su voz…";
    try {
      const url = await A.escenaUrl(sala, v);
      audio = document.createElement("audio");
      audio.dataset.sala = sala;
      audio.controls = true;
      audio.preload = "auto";
      audio.src = url;
      audio.setAttribute("aria-label", (sala === salaVoz(id) ? "Episodio de " : "Presentación de ") + t.tutora);
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
    audio.addEventListener("pause", () => { b.textContent = etiqueta + nombreCorto(t); });
  }
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}
function callar() { for (const a of document.querySelectorAll(".voz audio")) a.pause(); }
/** Cierra todo lo que reproduce video con sonido (la escena completa, la escena desde su sitio y la práctica). Al cambiar de página. */
function cerrarVideos() {
  const h = $("escenaHoja"); if (h && h.open && h.cerrar) h.cerrar();
  const w = $("escenaWeb"); if (w && w.open) { const f = w.querySelector("iframe"); if (f) f.removeAttribute("src"); w.close(); }
  const pr = $("prX"); if (pr) pr.click();
}


// ---------------------------------------------------------------- Repaso en audio
// Toca, una tras otra, las voces grabadas de las tutoras (escenas/voz-<lección>/). Mientras habla cada una,
// arriba va su loop (escenas/tutora-<lección>/); cuando entra la siguiente, cambia el loop.
let repaso = null;      // { origen, cola: [{ id, v }], i, audio, faltan: [ids], sonando, aviso }
/** El loop (GIF o video) de la tutora de un tema, si ya se sabe; si no, null. */
function loopDeTutora(id) { const l = escenasPorSala.get("tutora-" + id); return l ? l.filter(esMovimiento).slice(-1)[0] || null : null; }
const nombreDe = (id) => { const t = tutoraDe(id); return t ? nombreCorto(t) : "la tutora"; };
function botonesRepaso() {
  if (mudo()) return "";
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
async function empezarRepaso(ids, origen, etiqueta = "", rutaDada = null) {
  const ruta = rutaDada || window.location.hash;      // la página donde va su loop
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
  repaso = { origen, cola, i: -1, audio, faltan, sonando: null, etiqueta, ruta };
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
  // Se busca el aviso cada vez: si la página se vuelve a pintar mientras baja el video, el mensaje no se pierde.
  const decir = (t) => { const aviso = vista.querySelector(`[data-escenaaviso="${id}"]`); if (aviso) aviso.textContent = t; };
  decir("Buscando el video…");
  // 1. Tu almacén de Cloudflare: se ve en streaming, en cualquier aparato.
  const nube = await enlaceNube(id);
  if (nube) {
    decir("");
    // Si el reproductor no acepta el enlace firmado (el iPhone), se baja el video entero y se ve desde el aparato.
    const d = abrirReproductor(nube, async () => {
      decir("Bajando el video de Cloudflare…");
      try {
        const b = await NB.bajarVideo(nube, (p) => decir("Bajando el video de Cloudflare… " + Math.round(p * 100) + "%"));
        decir("");
        ponerSubtitulos(id, abrirReproductor(b, () => verEscenaLocal(id, decir, "No se pudo ver desde Cloudflare. ")));
      } catch (e) { verEscenaLocal(id, decir, e.message + " "); }
    });
    ponerSubtitulos(id, d);
    return;
  }
  return verEscenaLocal(id, decir, false);
}
/** El video desde este aparato (tu carpeta o los importados) y, si no está, el botón para verlo desde su sitio. */
async function verEscenaLocal(id, decir, antes) {
  // Sin preguntar nada: solo si este aparato ya tenía permiso de tu carpeta o videos importados de antes.
  const f = await V.video(id, false);
  if (!f) {
    decir(antes ? "No pude traer su video de Cloudflare." : "Todavía no conectas tu almacén de Cloudflare. Se pone en Ajustes, «Videos de las tutoras».");
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
    <p class="small">${esc(tema ? tema.nivel + " · " + titulo(tema) : "Lección " + id)} · lección ${id}</p>
    <div class="rule fija"><span class="k">La regla en una línea</span><p>${esc(t.regla)}</p></div>
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

/** Lo que antes se conectaba al cargar app.js; app.js lo llama en el mismo lugar, para que el orden no cambie. */
function conectarTutoras() {
  vista.addEventListener("click", (ev) => {
    const b = ev.target instanceof Element ? ev.target.closest("[data-repasar]") : null;
    if (!b) return;
    ev.preventDefault();
    const id = Number(b.dataset.repasar);
    if (repaso && repaso.sonando === id) { if (repaso.audio.paused) repaso.audio.play().catch(() => {}); else repaso.audio.pause(); return; }
    empezarRepaso([id], "tema");
  });
}

export { SILENCIO_URL, abrirReproductor, avisoRepaso, botonEscena, botonesRepaso, callar, cerrarVideos, conectarEscenas, conectarTutoras, datosNube, embedDe, empezarRepaso, enlaceLlamada, enlaceNube, escuchar, loopDeTutora, nombreCorto, nombreDe, nombreTutora, nubeDatos, pararRepaso, pintarCC, ponerSubtitulos, refrescarRepaso, repaso, salaPresenta, salaVoz, silencio, textoLlamada, tocarRepaso, tutoraDe, ultimoAvisoRepaso, verEnElSitio, verEscena, verEscenaLocal, verTutora, verTutoras };
