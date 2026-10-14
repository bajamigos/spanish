// «Practica con la tutora»: la escena se detiene, la tutora te provoca y tú le contestas con la regla.
// - Las líneas de la tutora (reto, reacciones) son audios grabados en la rama avance: escenas/practica-<lección>/.
// - El guion de la práctica (tiempos, textos) vive en contenido/tutoras/practica/<lección>.json.
// - El video es el de tu carpeta «Pelagos videos» (nunca sube a GitHub); se reproduce el corte con los tramos.
// - Tú escribes o dictas. Tu voz nunca se graba: el dictado solo la convierte en texto.
// - Al final, la escena se repite completa con tus líneas y se guarda en «Mis escenas» (en este aparato, por ahora).

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CLAVE = "pelagos.misEscenas";

/** Sin etiquetas de voz ([breathy], …) para los subtítulos. */
export const limpio = (t) => String(t || "").replace(/\[[^\]]*\]\s*/g, "").trim();

/**
 * Revisa una línea con la regla «tan + adjetivo/adverbio + que».
 * "buena": hay tan y después un que. "como": tan… como sin que. "corta": falta el tan o el que.
 */
export function revisar(texto) {
  const t = String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const i = t.search(/\btan\b/);
  if (i < 0) return "corta";
  const resto = t.slice(i + 3);
  if (/\bque\b/.test(resto)) return "buena";
  if (/\bcomo\b/.test(resto)) return "como";
  return "corta";
}

/** Del tiempo del corte al tiempo del archivo original. `tramos` = [{de, a}] en orden. */
export function aFuente(tramos, t) {
  let ini = 0;
  for (let i = 0; i < tramos.length; i++) {
    const d = tramos[i].a - tramos[i].de;
    if (t < ini + d || i === tramos.length - 1) return { i, src: tramos[i].de + Math.min(Math.max(t - ini, 0), d) };
    ini += d;
  }
  return { i: 0, src: 0 };
}
/** Del tiempo del archivo (dentro del tramo i) al tiempo del corte. */
export function aCorte(tramos, i, src) {
  let ini = 0;
  for (let k = 0; k < i; k++) ini += tramos[k].a - tramos[k].de;
  return ini + (src - tramos[i].de);
}

function misEscenas() { try { return JSON.parse(localStorage.getItem(CLAVE) || "[]"); } catch { return []; } }
function guardarEscena(e) {
  try { const l = misEscenas(); l.push(e); localStorage.setItem(CLAVE, JSON.stringify(l.slice(-200))); return true; } catch { return false; }
}

/** `fuente`: el archivo del video (de tu carpeta o importado) o un enlace firmado de tu almacén de Cloudflare. */
export async function abrirPractica(id, fuente) {
  const A = await import("./almacen.js");
  const guion = await A.practica(id);
  if (!guion) throw new Error("Esta tutora todavía no tiene práctica.");
  if (!fuente) throw new Error("No encuentro su video ni en tu carpeta «Pelagos videos» ni en tu almacén de Cloudflare.");
  const sala = "practica-" + id;
  const audios = new Map();
  const audio = (nombre) => {
    if (!audios.has(nombre)) audios.set(nombre, A.escenaUrl(sala, { archivo: nombre, tipo: "audio/mpeg" }));
    return audios.get(nombre);
  };

  let d = $("practicaHoja");
  if (d) d.remove();
  d = document.createElement("dialog");
  d.id = "practicaHoja"; d.className = "sheet escena practica";
  d.setAttribute("aria-label", "Practica con " + guion.tutora);
  d.innerHTML = `<div class="in">
    <div class="pr-pantalla"><video playsinline muted preload="auto"></video><p class="pr-sub" aria-live="polite"></p></div>
    <p class="pr-regla small">${esc(guion.regla)}</p>
    <form class="pr-turno" hidden>
      <label class="k" for="prLinea">Tu línea</label>
      <textarea id="prLinea" rows="2" lang="es" autocomplete="off" spellcheck="true"></textarea>
      <div class="acts"><button type="submit" class="ub grande">Contestarle</button><button type="button" class="ub grande" id="prDictar" hidden>🎙 Dictar</button><button type="button" class="ub" id="prSaltar">Saltar</button></div>
      <p class="small pr-aviso" role="status"></p>
    </form>
    <div class="pr-menu acts"></div>
    <div class="acts"><button type="button" class="ub grande" id="prX">Cerrar</button></div>
  </div>`;
  document.body.appendChild(d);
  const v = d.querySelector("video"), sub = d.querySelector(".pr-sub"), form = d.querySelector(".pr-turno");
  const caja = $("prLinea"), aviso = d.querySelector(".pr-aviso"), menu = d.querySelector(".pr-menu");
  const local = typeof fuente !== "string";
  const url = local ? URL.createObjectURL(fuente) : fuente;
  v.src = url;
  const voz = new Audio();
  let vivo = true, reco = null;
  const cerrar = () => {
    vivo = false; v.pause(); voz.pause(); if (reco) try { reco.abort(); } catch { /* ya paró */ }
    if (local) URL.revokeObjectURL(url); if (d.open) d.close(); d.remove();
  };
  $("prX").addEventListener("click", cerrar);
  d.addEventListener("cancel", (ev) => { ev.preventDefault(); cerrar(); });
  if (d.showModal) d.showModal(); else d.setAttribute("open", "");

  const tramos = guion.tramos;
  const decir = (t) => { sub.textContent = t || ""; sub.hidden = !t; };
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  async function hablar(nombre, texto) {
    decir(limpio(texto));
    try {
      voz.src = await audio(nombre);
      await voz.play();
      await new Promise((ok) => { voz.onended = ok; voz.onerror = ok; });
    } catch { await esperar(2500); }
  }
  async function irA(t) {
    const { i, src } = aFuente(tramos, t);
    v.currentTime = src; v.dataset.tramo = i;
    await new Promise((ok) => { v.onseeked = ok; setTimeout(ok, 1500); });
  }
  // Reproduce el corte desde donde está hasta `hasta` (tiempo del corte), saltando entre tramos.
  function correr(hasta) {
    return new Promise((ok) => {
      const paso = () => {
        if (!vivo) return ok();
        let i = Number(v.dataset.tramo || 0);
        if (v.currentTime >= tramos[i].a - 0.04 && i < tramos.length - 1) { i++; v.dataset.tramo = i; v.currentTime = tramos[i].de; }
        if (aCorte(tramos, i, v.currentTime) >= hasta || v.ended) { v.pause(); return ok(); }
        requestAnimationFrame(paso);
      };
      v.play().then(() => requestAnimationFrame(paso)).catch(() => ok());
    });
  }
  // Tu turno: escribe o dicta; la tutora reacciona según cómo usaste la regla.
  const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Reco) {
    const b = $("prDictar"); b.hidden = false;
    b.addEventListener("click", () => {
      if (reco) { reco.stop(); return; }
      reco = new Reco(); reco.lang = "es-MX"; reco.interimResults = true; reco.continuous = false;
      const antes = caja.value ? caja.value.trim() + " " : "";
      reco.onresult = (ev) => { caja.value = antes + [...ev.results].map((r) => r[0].transcript).join(""); };
      reco.onend = () => { reco = null; b.textContent = "🎙 Dictar"; };
      reco.onerror = () => { aviso.textContent = "No se pudo dictar. Escríbelo."; };
      b.textContent = "■ Listo"; reco.start();
    });
  }
  const usadas = new Set();
  const reaccionBuena = () => {
    const l = guion.reacciones.buena;
    let libres = l.filter((r) => !usadas.has(r.audio));
    if (!libres.length) { usadas.clear(); libres = l; }
    const r = libres[Math.floor(Math.random() * libres.length)];
    usadas.add(r.audio); return r;
  };
  function turno() {
    return new Promise((ok) => {
      let intentos = 0;
      form.hidden = false; caja.value = ""; aviso.textContent = ""; caja.focus();
      const listo = (linea, r) => { form.hidden = true; form.onsubmit = null; $("prSaltar").onclick = null; ok({ linea, r }); };
      $("prSaltar").onclick = () => listo("", null);
      form.onsubmit = async (ev) => {
        ev.preventDefault();
        const linea = caja.value.trim();
        if (!linea) { aviso.textContent = "Escríbele algo, o toca «Saltar»."; return; }
        const tipo = revisar(linea);
        intentos++;
        if (tipo === "buena" || intentos >= 2) {
          const r = reaccionBuena();
          form.hidden = true; decir(linea); await esperar(1800);
          await hablar(r.audio, r.texto);
          return listo(linea, r.audio);
        }
        const r = guion.reacciones[tipo][0];
        aviso.textContent = tipo === "como" ? "Es tan… que, no tan… como." : "Te faltó el tan o el que.";
        await hablar(r.audio, r.texto);
        caja.focus();
      };
    });
  }

  async function practicar() {
    menu.innerHTML = "";
    await irA(guion.escena.de);
    await hablar(guion.intro.audio, guion.intro.texto);
    const lineas = [];
    for (const reto of guion.retos) {
      if (!vivo) return;
      decir(""); await correr(reto.t);
      await hablar(reto.audio, reto.texto);
      const { linea, r } = await turno();
      lineas.push({ t: reto.t, linea, r });
    }
    if (!vivo) return;
    decir(""); await correr(guion.escena.a);
    await hablar(guion.fin.audio, guion.fin.texto);
    const escena = { leccion: id, tutora: guion.tutora, cuando: new Date().toISOString(), lineas };
    const ok = guardarEscena(escena);
    decir("");
    pintarMenu(ok ? "Guardada en «Mis escenas»." : "No se pudo guardar en este aparato.");
  }
  async function repetir(escena) {
    menu.innerHTML = "";
    await irA(guion.escena.de);
    for (let k = 0; k < guion.retos.length; k++) {
      if (!vivo) return;
      const reto = guion.retos[k], tuya = escena.lineas[k] || {};
      decir(""); await correr(reto.t);
      await hablar(reto.audio, reto.texto);
      if (tuya.linea) {
        decir("Tú: " + tuya.linea); await esperar(Math.max(2500, tuya.linea.length * 70));
        const r = [...guion.reacciones.buena, ...guion.reacciones.como, ...guion.reacciones.corta].find((x) => x.audio === tuya.r);
        if (r) await hablar(r.audio, r.texto);
      }
    }
    if (!vivo) return;
    decir(""); await correr(guion.escena.a);
    await hablar(guion.fin.audio, guion.fin.texto);
    decir(""); pintarMenu("");
  }
  function pintarMenu(nota) {
    const mias = misEscenas().filter((e) => e.leccion === id).reverse();
    menu.innerHTML = (nota ? `<p class="small" role="status">${esc(nota)}</p>` : "") +
      `<button type="button" class="ub grande" data-pr="nueva">${mias.length ? "Otra práctica" : "Empezar"}</button>` +
      (mias.length ? `<p class="k">Mis escenas</p>` + mias.slice(0, 8).map((e, n) =>
        `<button type="button" class="ub" data-pr="${n}">${esc(new Date(e.cuando).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }))} · ${e.lineas.filter((l) => l.linea).length} líneas</button>`).join("") : "");
    for (const b of menu.querySelectorAll("[data-pr]")) b.addEventListener("click", () => {
      const k = b.dataset.pr;
      (k === "nueva" ? practicar() : repetir(mias[Number(k)])).catch(() => decir("Algo falló. Cierra y vuelve a abrir."));
    });
  }
  await irA(guion.escena.de);
  decir(guion.tutora + " te espera en el cañón.");
  pintarMenu("");
}
