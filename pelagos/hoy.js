// Lo que te queda hoy: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=f3879af2e7";
import { E, P } from "./app.js?v=f3879af2e7";
import { esc, titulo } from "./texto.js?v=f3879af2e7";
import { $ } from "./base.js?v=f3879af2e7";

// ---------------------------------------------------------------- Lo que te queda hoy (su idea del 22-Oct-2026)
// Su regla: rayitas para «este quiz» (la línea de arriba del quiz) y círculos para «hoy».
const GRUPOS_HOY = [["nuevo", "nuevos"], ["vencido", "vencidos"], ["fallado", "fallados"]];
/** Los tres círculos de hoy. tam: "chico" (Tablero), "medio" (durante el quiz) o "grande" (página del Quiz, con su palabra). */
function circulosDeHoy(tam, cuentas = null, donde = "hoy") {
  const c = cuentas ? null : N.cuentaDelDia(P, E, N.fechaLocal(new Date()));
  const ns = cuentas || [c.nuevos, c.vencidos, c.fallados];
  const G = donde === "vhoy" ? GRUPOS_VOC : GRUPOS_HOY;
  const dice = ns.map((n, i) => n + " " + G[i][n === 1 ? 0 : 1]).join(", ");
  return `<span class="hoyC ${tam}" role="group" aria-label="Hoy: ${dice}">${ns.map((n, i) =>
    `<button type="button" class="circ g${i}" data-explica="${donde}:${i}:${n}" aria-pressed="false" aria-label="${n} ${G[i][n === 1 ? 0 : 1]} hoy"><b>${n}</b>${tam === "grande" ? `<span>${G[i][n === 1 ? 0 : 1]}</span>` : ""}</button>`).join("")}</span>`;
}
const GRUPOS_VOC = [["nueva", "nuevas"], ["vencida", "vencidas"], ["fallada", "falladas"]];
const panelExplica = () => `<div class="explica" role="status" hidden></div>`;
function textoExplica(donde, i, n) {
  const g = (donde === "vhoy" ? GRUPOS_VOC : GRUPOS_HOY)[i][n === 1 ? 0 : 1], titulo = `${donde === "quiz" ? "Este quiz" : "Hoy"} · ${n} ${g}:`;
  const T = donde === "vhoy" ? [
    "palabras que todavía no has aprendido y que entran hoy.",
    "palabras que ya aprendiste y que hoy te toca repasar.",
    "palabras que fallaste hoy; vuelven a salir hasta que las aciertes.",
  ] : donde === "hoy" ? [
    "lo que te queda de tus cinco temas nuevos de hoy. Si ya no te queda ningún repaso, entran más.",
    "temas que ya aprendiste y que hoy te toca repasar, contando los que todavía no entran a tu quiz. Entran primero, el más atrasado antes.",
    "temas que todavía te deben aciertos, de cualquier día. Necesitan dos aciertos seguidos para salir de tu plan.",
  ] : [
    "de las preguntas que te quedan en este quiz, estas son de temas que nunca has acertado.",
    "de las preguntas que te quedan en este quiz, estas son de temas que ya te tocaba repasar.",
    "de las preguntas que te quedan en este quiz, estas son de temas que todavía te deben aciertos.",
  ];
  return `<b class="g${i}">${esc(titulo)}</b> ${esc(T[i])}`;
}
// Tocar un número lo explica abajo; tocarlo otra vez, o tocar otro, cambia o cierra. Dentro del cuadro del Tablero no abre el quiz.

/** Llena o vacía los puntitos, uno tras otro, para que se vea la subida o la caída. */
function moverNivel(de, a) {
  const caja = $("tjNivel");
  if (!caja) {
    // Sin puntitos (23-Oct-2026): se resalta la caja a la que llegó la tarjeta o el tema.
    const cs = [...document.querySelectorAll(".lnCajas.grandes .lnC")];
    cs.forEach((c, i) => { c.classList.toggle("cur", i === a - 1); c.classList.remove("salta", "cae"); });
    if (a > 0 && cs[a - 1]) { void cs[a - 1].offsetWidth; cs[a - 1].classList.add(a > de ? "salta" : a < de ? "cae" : "salta"); }
    return;
  }
  caja.classList.add(a > de ? "sube" : a < de ? "baja" : "igual");
  caja.setAttribute("aria-label", `Peldaño ${a} de ${N.ESCALONES.length}`);
  [...caja.children].forEach((p, i) => {
    const paso = a < de ? de - 1 - i : i - de;      // al caer se vacían de derecha a izquierda
    p.style.transitionDelay = Math.max(0, paso) * 70 + "ms";
    p.classList.toggle("on", i < a);
  });
}

/** Lo que antes se conectaba al cargar app.js; app.js lo llama en el mismo lugar, para que el orden no cambie. */
function conectarHoy() {
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest("[data-explica]");
    if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    const caja = b.closest("[data-explicas]"), panel = caja && caja.querySelector(".explica");
    if (!panel) return;
    // Donde hay mapa (el Atlas o tus palabras), tocar un círculo o el 0-3-0 marca sus temas en el mapa y ya no abre
    // la explicación que lo empujaba hacia abajo (su pedido del 25-Oct-2026).
    if (document.querySelector("#kwAtlas, #qaMapa, #vMalla") && b.closest(".hoyGrande, .gFila.conNivel")) return;
    const abierto = b.getAttribute("aria-pressed") === "true";
    caja.querySelectorAll("[data-explica]").forEach((x) => x.setAttribute("aria-pressed", "false"));
    if (abierto) { panel.hidden = true; return; }
    const [donde, i, n] = b.dataset.explica.split(":");
    b.setAttribute("aria-pressed", "true");
    panel.className = "explica g" + i;
    panel.innerHTML = textoExplica(donde, Number(i), Number(n));
    panel.hidden = false;
  }, true);
}

export { GRUPOS_HOY, GRUPOS_VOC, circulosDeHoy, conectarHoy, moverNivel, panelExplica, textoExplica };
