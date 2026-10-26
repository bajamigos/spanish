// El Atlas en el quiz: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=5a2076ef12";
import * as A from "./almacen.js?v=5a2076ef12";
import { ambiente, juegoDeFotos } from "./acervo.js?v=5a2076ef12";
import { DESHACER_MS, E, LOGO, P, arrancar, cargarVideosFondo, conCuadro, conFondo, esperarLoopDePregunta, etiquetaMovimiento, fijarEnPregunta, fijarTeclas, fondoDelKwiz, guardado, guardar, imagenDeArriba, info, ir, lineaDeGramatica, loopDePregunta, nivelDeTema, pintar, poner, porId, preguntas, recalcular, sinMovimiento, verNoExiste } from "./app.js?v=5a2076ef12";
import { $, CATEGORIAS, CATEGORIAS_CORTAS, QUIZ, TIPOS_KWIZ, vista } from "./base.js?v=5a2076ef12";
import { barra, cuando, esBajo, esc, fecha, hueco, pct, plural, titulo } from "./texto.js?v=5a2076ef12";
import { circulosDeHoy, moverNivel, panelExplica } from "./hoy.js?v=5a2076ef12";
import { refrescarMini } from "./tendencias.js?v=5a2076ef12";
import { empezarRepaso, tutoraDe } from "./tutoras.js?v=5a2076ef12";

// ---------------------------------------------------------------- El Atlas en el quiz (su idea del 25-Oct-2026)
// En Limpio, arriba de cada pregunta: todos los temas del nivel en chiquito, con el mismo acomodo del Atlas (por tipo y
// en el orden de las lecciones), así cada tema está siempre en el mismo lugar. Los temas de este quiz llevan borde, el de
// la pregunta late, y al contestar el cuadro cambia de color y sube (o baja) su nombre con el cambio de porcentaje.
const atlasEnQuiz = (k) => ambiente() === "limpio" && k && k.tipo !== "tutora";
const conAtlasVisible = () => guardado("pelagos.gramAtlas") !== "0";
// Las cajas de los temas se mueven al cerrar el quiz (al terminarlo o dejarlo). El Atlas enseña desde ya cómo quedan:
// se calcula como si dejaras el quiz en este momento, con lo que ya contestaste.
let proyCache = { n: -1, kid: null, E: null };
function estadoProyectado(kid) {
  const S = A.sucesos();
  if (proyCache.n === S.length && proyCache.kid === kid) return proyCache.E;
  const k = E.kwizzes.get(kid);
  const Ep = k && k.resp.size && !k.terminado ? N.calcular(P, [...S, { t: "dejar", id: "proyeccion", kwiz: kid, cuando: new Date().toISOString() }]) : E;
  proyCache = { n: S.length, kid, E: Ep };
  return Ep;
}
const infoProy = (kid, t) => estadoProyectado(kid).temas.get(t) || { pct: null, n: 0, toca: null };
const nivelProy = (kid, t) => { const i = infoProy(kid, t); return i && i.toca ? i.escalon + 1 : 0; };
// Qué temas llevan borde en el Atlas (su pedido del 25-Oct-2026): tocar el 0-3-0 marca los de este quiz; tocar los
// círculos de hoy, los de hoy. Se queda así de pregunta en pregunta.
let qaMarcar = "quiz";
let efectoR = null;          // la última respuesta: { kid, tema, f0, f1, p0, p1, bien, t0 }, para su animación
const EFECTO_MS = 3200;
/** El color de un cuadro, como valor de CSS (para el parpadeo entre el color de antes y el de ahora). */
// El tono de un tema (su elección del 25-Oct-2026, «mezcla pareja»): el color de su caja, pero un tema rojo que todavía
// debe aciertos va más apagado, entre el gris de «sin ver» y el rojo: «d2» debe 2, «d1» debe 1. null es sin ver.
function tonoDe(Ex, id) {
  const f = N.colorDe(Ex.temas.get(id));
  const debe = f === 0 ? Ex.debe.get(id) || 0 : 0;
  return debe >= 2 ? "d2" : debe === 1 ? "d1" : f;
}
const rango = (t) => (t === null || t === undefined ? -3 : t === "d2" ? -2 : t === "d1" ? -1 : t);
const claseTono = (t, pre = "q") => (t === null || t === undefined ? pre + "x" : typeof t === "string" ? pre + t : pre + "k" + t);
const colorCss = (t) => (t === null || t === undefined ? "color-mix(in srgb, var(--ink) 10%, transparent)" : typeof t === "string" ? `var(--k${t})` : `var(--k${t})`);
/**
 * Dibuja el Atlas de un nivel dentro de «caja»: un cuadro por tema, acomodados por tipo y en el orden de las lecciones.
 * colorDe(id) da el color (0 a 5, o null); marcar es un Set de temas con borde. Devuelve { celdas: Map(id → { el, y, h }), cuenta, sinVer, total }.
 */
function armarAtlas(caja, nivel, colorDe, marcar = new Set(), como = new Map()) {
  const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
  const porTipo = new Map();
  for (const t of suyos) { if (!porTipo.has(t.categoria)) porTipo.set(t.categoria, []); porTipo.get(t.categoria).push(t); }
  const tipos = [...porTipo.entries()].sort((a, b) => b[1].length - a[1].length);
  const W = Math.max(200, caja.clientWidth);
  const lugar = N.acomodarMapa(tipos.map(([, l]) => l.length), W, 300, { cabeza: 13, margen: 2, hueco: 2, forma: 1 });
  const pon = (el, x, y, w, h) => { el.style.left = x + "px"; el.style.top = y + "px"; el.style.width = w + "px"; el.style.height = h + "px"; };
  caja.textContent = "";
  caja.style.height = lugar.alto + "px";
  const cuenta = [0, 0, 0, 0, 0, 0], celdas = new Map();
  let sinVer = 0;
  tipos.forEach(([cat, temas], j) => {
    const c = lugar.cajas[j];
    const g = document.createElement("div");
    g.className = "qaCaja";
    pon(g, c.x, c.y, c.w, c.h);
    if (c.rotulo) { const r = document.createElement("div"); r.className = "qaRot"; r.textContent = CATEGORIAS_CORTAS[cat] || CATEGORIAS[cat] || cat; g.append(r); }
    const arriba = c.rotulo ? 15 : 2;
    temas.forEach((t, i) => {
      const f = colorDe(t.id);
      if (f === null) sinVer++; else if (typeof f === "number") cuenta[f]++; else cuenta[0]++;
      const el = document.createElement("i");
      // El borde (25-Oct-2026): blanco sin contestar, verde continuo si lo acertaste, rojo de rayitas si lo fallaste.
      el.className = "qaC " + claseTono(f) + (marcar.has(t.id) ? (como.has(t.id) ? (como.get(t.id) ? " qaMarca qaBien" : " qaMarca qaMal") : " qaMarca") : "");
      el.dataset.t = t.id;
      const x = 2 + (i % c.columnas) * (c.cw + 2), y = arriba + Math.floor(i / c.columnas) * (c.ch + 2);
      pon(el, x, y, c.cw, c.ch);
      celdas.set(t.id, { el, y: c.y + y, h: c.ch });
      g.append(el);
    });
    caja.append(g);
  });
  caja.setAttribute("role", "img");
  caja.setAttribute("aria-label", `Atlas de ${nivel}: ${plural(suyos.length, "tema", "temas")}. ${N.PELDANOS.map((p, i) => `${cuenta[i]} en ${p}`).join(", ")}${sinVer ? `, ${sinVer} sin ver` : ""}. Toca un cuadro para ver su tema.`);
  return { celdas, cuenta, sinVer, total: suyos.length };
}
/** El cambio de un cuadro (su elección del 25-Oct-2026): parpadea entre el color de antes y el de ahora y se queda en el nuevo. */
function parpadear(el, f0, f1, dir, retraso = 0) {
  el.style.setProperty("--viejo", colorCss(f0));
  el.style.setProperty("--nuevo", colorCss(f1));
  el.classList.add("qaParpadea", dir === "abajo" ? "qaBajo" : dir === "arriba" ? "qaSubio" : "qaIgual");
  el.style.animationDelay = retraso + "ms";
}
const direccion = (f0, f1, bien) => (!bien || rango(f1) < rango(f0) ? "abajo" : rango(f1) > rango(f0) ? "arriba" : "igual");

/** Los temas de hoy de un grupo: 0 nuevos, 1 vencidos, 2 fallados (los mismos que cuentan los círculos). */
function temasDeGrupo(i) { const d = N.temasDelDia(P, E); return [d.nuevos, d.vencidos, d.fallados][i] || []; }
/** Recuadra lo que manda en el Atlas: el 0-3-0 entero («quiz») o un solo círculo («hoy0», «hoy1», «hoy2»). */
function marcarGrupo(raiz, que) {
  if (!raiz) return;
  const cu = raiz.querySelector(".lnCuenta");
  if (cu) cu.classList.toggle("qaSel", que === "quiz");
  raiz.querySelectorAll(".hoyC .circ").forEach((c, i) => c.classList.toggle("qaSel", que === "hoy" + i));
}

// ---- El Atlas en la página del quiz (su pedido del 25-Oct-2026): tu nivel con los temas de tu plan; tocar un círculo
// de «Te queda hoy» marca los que te quedan de ese grupo, y tocarlo otra vez regresa a tu plan.
let kwMarcar = "plan";
/** El nivel de tu plan: el del Enfoque; en Guiado, el que más se repite entre los temas de tu plan. */
function nivelDelPlan(deLista) {
  if (E.enfoque) return E.enfoque;
  const c = {};
  for (const t of deLista) c[t.nivel] = (c[t.nivel] || 0) + 1;
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || "A1";
}
function pintarAtlasInicio() {
  const caja = $("kwAtlas");
  if (!caja || caja.hidden) return;
  const marcar = new Set(kwMarcar === "plan" ? N.listaDeEstudio(P, E).temas : temasDeGrupo(Number(kwMarcar.slice(3)) || 0));
  armarAtlas(caja, caja.dataset.nivel, (id) => tonoDe(E, id), marcar);
  marcarGrupo(caja.closest("section"), kwMarcar);
  const d = $("kwAtlasDice");
  if (d) d.textContent = kwMarcar === "plan" ? "Con borde: los temas de tu plan. Toca un círculo para ver los que te quedan de ese grupo."
    : `Con borde: ${["los nuevos", "los vencidos", "los fallados"][Number(kwMarcar.slice(3))]} que te quedan hoy. Toca el círculo otra vez para volver a tu plan.`;
}

function pintarAtlasQuiz() {
  const caja = $("qaMapa");
  if (!caja || caja.hidden) return;
  const nivel = caja.dataset.nivel, actual = Number(caja.dataset.tema), kid = caja.dataset.kid;
  const k = E.kwizzes.get(kid);
  // Marcados: los temas de este quiz, o (si tocaste los círculos de hoy) los de hoy. Ver qaMarcar.
  // Y cómo te fue: en este quiz, o hoy en cualquier quiz. Si un tema salió dos veces, vale tu última respuesta.
  let marcar;
  const como = new Map();
  const porTiempo = (rs) => rs.slice().sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando));
  if (qaMarcar.startsWith("hoy")) {
    const hoy = N.fechaLocal(new Date());
    for (const r of porTiempo((E.todas || []).filter((r) => N.fechaLocal(new Date(r.cuando)) === hoy))) como.set(r.tema, !!r.bien);
    marcar = new Set(temasDeGrupo(Number(qaMarcar.slice(3)) || 0));
  } else {
    marcar = new Set(k ? k.preguntas.map((x) => (preguntas.get(N.preguntaDe(x)) || {}).tema) : []);
    if (k) for (const r of porTiempo([...k.resp.values()])) como.set(r.tema, !!r.bien);
  }
  marcarGrupo(document.querySelector(".gFila.conNivel"), qaMarcar);
  const { celdas } = armarAtlas(caja, nivel, (id) => tonoDe(estadoProyectado(kid), id), marcar, como);
  const fx = efectoR && efectoR.kid === kid && Date.now() - efectoR.t0 < EFECTO_MS ? efectoR : null;
  const cel = fx && celdas.get(fx.tema);
  const yaVa = fx ? -(Date.now() - fx.t0) : 0;
  if (cel) parpadear(cel.el, fx.f0, fx.f1, direccion(fx.f0, fx.f1, fx.bien), yaVa);
  // Siempre late el tema de la pregunta. Si es el mismo que se está animando (lo acabas de contestar y vuelve), late al terminar.
  const act = celdas.get(actual);
  clearTimeout(pintarAtlasQuiz.t);
  if (act && !(cel && fx.tema === actual)) act.el.classList.add("qaActual");
  else if (act) pintarAtlasQuiz.t = setTimeout(() => {
    if (!act.el.isConnected) return;
    act.el.classList.remove("qaParpadea", "qaSubio", "qaIgual", "qaBajo"); act.el.style.animationDelay = ""; act.el.classList.add("qaActual");
  }, Math.max(0, EFECTO_MS + yaVa));
  // Sin etiqueta encima (su pedido del 25-Oct-2026): el parpadeo del cuadro basta.
}
// ---- El Atlas en el resultado (su elección del 25-Oct-2026): tus temas del quiz, cambiando uno por uno.
const NOMBRE_COLOR = ["rojo", "naranja", "amarillo", "verde claro", "verde", "verde oscuro"];
const nombreColor = (f) => (f === null || f === undefined ? "sin ver" : f === "d2" ? "debe 2" : f === "d1" ? "debe 1" : NOMBRE_COLOR[f]);
const PASO_RESULTADO = 1600;      // cada cuánto empieza el siguiente tema
function pintarAtlasResultado(k) {
  const cuerpo = $("resAtlasCuerpo");
  if (!cuerpo) return;
  // Cómo estaban antes de este quiz: el mismo cálculo sin sus respuestas.
  const antes = N.calcular(P, A.sucesos().filter((e) => !(e.t === "r" && e.kwiz === k.id)));
  const temas = [...new Set(k.preguntas.filter((p) => k.resp.has(p)).map((p) => k.resp.get(p).tema))].filter((t) => porId.has(t));
  const bienDe = new Map();
  for (const r of k.resp.values()) bienDe.set(r.tema, (bienDe.has(r.tema) ? bienDe.get(r.tema) : true) && !!r.bien);
  const niveles = [...new Set(temas.map((t) => porId.get(t).nivel))];
  const pasos = [];
  for (const nv of niveles) {
    const h = document.createElement("h3"); h.className = "resNivel"; h.textContent = nv; if (niveles.length > 1) cuerpo.append(h);
    const caja = document.createElement("div"); caja.className = "qaMapa resMapa"; caja.dataset.nivel = nv;
    cuerpo.append(caja);
    const deAqui = temas.filter((t) => porId.get(t).nivel === nv);
    const { celdas } = armarAtlas(caja, nv, (id) => (deAqui.includes(id) ? tonoDe(antes, id) : tonoDe(E, id)), new Set(deAqui), bienDe);
    for (const t of deAqui) pasos.push({ t, cel: celdas.get(t) });
  }
  const ul = document.createElement("ul"); ul.className = "resCambios";
  pasos.forEach(({ t }) => {
    const a = antes.temas.get(t) || {}, d = info(t), f0 = tonoDe(antes, t), f1 = tonoDe(E, t), dir = direccion(f0, f1, bienDe.get(t));
    const li = document.createElement("li"); li.className = "res" + dir;
    const n = document.createElement("span"); n.className = "resNom"; n.textContent = (dir === "abajo" ? "▼ " : dir === "arriba" ? "▲ " : "● ") + titulo(porId.get(t));
    const c = document.createElement("span"); c.className = "resDe"; c.textContent = `${f0 === f1 ? nombreColor(f1) : nombreColor(f0) + " → " + nombreColor(f1)} · ${pct(a.pct)} → ${pct(d.pct)}`;
    li.append(n, c);
    ul.append(li);
  });
  cuerpo.append(ul);
  // Empieza cuando lo ves: si está abajo de la pantalla, espera a que llegues.
  const arrancar = () => pasos.forEach(({ t, cel }, i) => {
    const f0 = tonoDe(antes, t), f1 = tonoDe(E, t);
    if (cel) parpadear(cel.el, f0, f1, direccion(f0, f1, bienDe.get(t)), 300 + i * PASO_RESULTADO);
    const li = ul.children[i]; li.style.animationDelay = 300 + i * PASO_RESULTADO + "ms"; li.classList.add("resVa");
  });
  if (!("IntersectionObserver" in window)) return arrancar();
  const ob = new IntersectionObserver((xs) => { if (xs.some((x) => x.isIntersecting)) { ob.disconnect(); arrancar(); } }, { threshold: 0.4 });
  ob.observe(cuerpo);
}

// Tocar (o pasar el ratón por) un cuadro dice su tema, tu porcentaje y cada cuánto te toca.
function burbujaAtlas(el, caja = el && el.closest(".qaMapa")) {
  for (const b of document.querySelectorAll(".qaMapa .qaBurb")) if (!el || b.parentElement !== caja) b.remove();
  document.querySelectorAll(".qaMapa .qaC.tocado").forEach((x) => x.classList.remove("tocado"));
  if (!el || !caja) return;
  let b = caja.querySelector(".qaBurb");
  const Ex = caja.dataset.kid ? estadoProyectado(caja.dataset.kid) : E;
  const t = porId.get(Number(el.dataset.t)), i = Ex.temas.get(t.id), f = N.colorDe(i), debe = Ex.debe.get(t.id) || 0;
  if (!b) { b = document.createElement("div"); b.className = "qaBurb"; b.setAttribute("role", "status"); caja.append(b); }
  b.textContent = "";
  const n = document.createElement("b"); n.textContent = titulo(t); b.append(n, document.createElement("br"), `${pct(i && i.pct)} · ${f === null ? "sin ver" : "toca cada " + N.PELDANOS[f]}${debe ? ` · debe ${debe === 1 ? "1 acierto" : debe + " aciertos"}` : ""}`);
  el.classList.add("tocado");
  const cy = el.getBoundingClientRect().top - caja.getBoundingClientRect().top;
  b.style.top = (cy < 50 ? cy + el.offsetHeight + 8 : cy - 50) + "px";
}

// ---- «Deshacer» en el quiz de gramática (25-Oct-2026): un botoncito abajo, por DESHACER_MS después de contestar.
// Apunta «rdeshacer» (no se borra nada): la respuesta deja de contar y vuelves a esa pregunta.
let rUltima = null;          // { ref, kid, tema, hasta }
function pintarDeshacerR() {
  const lugar = $("rDeshacer");
  if (!lugar) return;
  const vale = rUltima && Date.now() < rUltima.hasta && lugar.dataset.kid === rUltima.kid;
  lugar.hidden = !vale;
  if (!vale) return;
  const tm = porId.get(rUltima.tema);
  lugar.querySelector("button").setAttribute("aria-label", "Deshacer tu respuesta de " + (tm ? titulo(tm) : "la pregunta anterior"));
  clearTimeout(pintarDeshacerR.t);
  pintarDeshacerR.t = setTimeout(pintarDeshacerR, rUltima.hasta - Date.now() + 50);
}

function verPregunta(o, kid) {
  if (o.conserva && enPreguntaDe === kid) { fijarEnPregunta(true); return; }
  const k = E.kwizzes.get(kid);
  if (!k) return verNoExiste();
  const sig = N.siguiente(E, kid);
  if (!sig) return k.terminado ? ir(QUIZ + "/" + kid + "/resultado", true) : verNoExiste(k.dejado ? "Ese quiz lo dejaste sin contestar nada." : "Ese quiz se quedó sin preguntas.");
  const q = preguntas.get(N.preguntaDe(sig.p));
  const tema = porId.get(q.tema);
  // Escalera de formatos: según la caja del tema, la de opciones se contesta escribiendo lo que falta,
  // y la de escribir sale sin pista en las cajas de 30 y 75 días. El Kwiz con la tutora se queda como está.
  const nivelF = k.tipo === "tutora" ? 0 : N.formatoDelTema(E, q.tema);
  const enHueco = q.tipo === "opcion" && nivelF >= 1;
  const escribir = q.tipo === "escribir" || enHueco;
  const conPista = !!q.pista && !(q.tipo === "escribir" && nivelF === 2);
  const opciones = escribir ? [] : N.barajar(q.opciones, N.azarDe(kid + "-" + sig.p));
  const deTutora = k.tipo === "tutora";
  const juego = deTutora ? [] : juegoDeFotos();
  const foto = juego.length ? juego[Math.floor(N.azarDe(kid + "#" + sig.orden)() * juego.length)] : null;

  // Como el Tablero: el loop fijo arriba y la pregunta en tarjetas de vidrio encima. De pregunta en pregunta solo cambia
  // el loop (la tutora de cada tema); si el tema no tiene loop, el de la tutora del día. Al terminar, el resultado
  // vuelve al fondo del día.
  const conLoop = !deTutora && ambiente() !== "limpio" && !sinMovimiento();
  const propio = conLoop ? loopDePregunta(q.tema) : "";
  const viene = conLoop && !propio && A.leccionesConLoop().has(q.tema);      // su loop está por llegar: el logo mientras tanto
  const delDia = conLoop && !propio && !viene ? (cargarVideosFondo(), etiquetaMovimiento()) : "";
  const clip = propio || delDia;
  const arriba = conLoop && (clip || viene);
  const envolver = (h) => arriba
    ? `<div class="hoy confoto contutora kwFondo"><div class="fondo${clip ? "" : " cargando"}">${clip ? clip + LOGO : '<img class="logoCarga" src="logo.png" alt="Pelagos">'}</div><div class="sobre">${h}</div></div>`
    : h;      // en Limpio la pregunta va sin logo, como la tarjeta de vocabulario: más pantalla para la pregunta (18-Oct)
  poner(envolver(`
  <section class="kw${deTutora ? " kwTutora" : ""}${atlasEnQuiz(k) ? " conAtlas" : ""}">
    <header class="hero kwh${arriba ? " contutora" : ""}">
      <div class="ratio"></div>
      ${deTutora ? (ambiente() === "limpio" ? "" : '<div class="tutoraVideo" id="tutoraVideo"></div>') : arriba ? "" : imagenDeArriba(foto && foto.nombre)}
      <div class="over">
        <p class="lead${deTutora ? "" : " sr"}"><span>${deTutora ? `Aciertos: ${k.bien || 0} de ${N.ACIERTOS_TUTORA}` : `Pregunta ${sig.orden} de ${sig.total}`}</span><span>${enHueco ? "Escribe lo que falta" : escribir ? "Dilo en español" : "Toca la respuesta"}</span></p>
        ${deTutora ? `<div class="score"><div class="track" role="img" aria-label="Llevas ${k.bien || 0} de ${N.ACIERTOS_TUTORA} aciertos"><i data-w="${100 * (k.bien || 0) / N.ACIERTOS_TUTORA}"></i></div></div>` : ""}
        ${deTutora ? "" : `<div data-explicas>${lineaDeGramatica(k, q.tema)}${panelExplica()}</div>`}
        <h1 class="cue" id="cue"${q.tipo === "escribir" ? ' lang="en"' : ""}>${hueco(q.frase)}</h1>
        ${(() => { const at = deTutora ? null : N.temasAtascados(E).get(q.tema); return at && tema ? `<p class="tjAtas">Atascado · fallado en ${at.fallos} quizzes esta semana${tema.slug && tema.leccion ? ` · <a class="lk" href="#/leccion/${esc(tema.slug)}">Ver la lección</a>` : ""}</p>` : ""; })()}
        ${q.glosa ? `<p class="sub">(${esc(q.glosa)})</p>` : ""}
        ${conPista && atlasEnQuiz(k) ? `<p class="sub" id="pista">${esc(q.pista)}</p>`
          : conPista ? `<div class="hrow"><button type="button" class="chip" id="pistaBtn">Pista</button><span class="sub" id="pista" hidden>${esc(q.pista)}</span></div>` : ""}
        ${atlasEnQuiz(k) ? `<div class="qaDeshacer" id="rDeshacer" data-kid="${esc(kid)}" hidden><button type="button" class="qaDesBtn" id="rDeshacerBtn">↶ Deshacer</button></div>` : ""}
      </div>
    </header>
    <div class="card" id="controles">
      ${escribir && atlasEnQuiz(k) ? `
      <nav class="jump tres qaModos" aria-label="Cómo contestas">
        <button type="button" id="modoEscribir">Escribir</button><button type="button" id="modoDecir">Decir en voz alta</button><button type="button" class="qaRevisar" id="revisar">Revisar</button>
      </nav>
      <div id="zonaEscribir">
        <label class="sr" for="campo">Tu respuesta</label>
        <input id="campo" class="campo" type="text" lang="es" aria-describedby="cue" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send">
        <div class="teclas" role="group" aria-label="Letras con acento">${["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"].map((c) => `<button type="button" class="tecla" data-c="${c}">${c}</button>`).join("")}</div>
      </div>
      <div id="zonaDecir" hidden><p class="small">Dilo en voz alta y toca Revisar para ver la respuesta y calificarte.</p></div>` : escribir ? `
      <nav class="jump dos" aria-label="Cómo contestas">
        <button type="button" id="modoEscribir">Escribir</button><button type="button" id="modoDecir">Decir en voz alta</button>
      </nav>
      <div id="zonaEscribir">
        <label class="small" for="campo">Tu respuesta</label>
        <input id="campo" class="campo" type="text" lang="es" aria-describedby="cue" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send">
        <div class="teclas" role="group" aria-label="Letras con acento">${["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"].map((c) => `<button type="button" class="tecla" data-c="${c}">${c}</button>`).join("")}</div>
        <div class="go"><button type="button" class="ub" id="noSe1">No sé</button><button type="button" class="ub grande" id="revisar">Revisar</button></div>
      </div>
      <div id="zonaDecir" hidden>
        <p>Dilo en voz alta. Luego mira la respuesta y califícate.</p>
        <div class="go"><button type="button" class="ub" id="noSe2">No sé</button><button type="button" class="ub grande" id="ver">Ver la respuesta</button></div>
      </div>` : `
      <div class="ops" role="group" aria-label="Opciones" aria-describedby="cue">${opciones.map((op) => `<button type="button" class="ub op" data-op="${esc(op)}">${esc(op)}<span class="nota"></span></button>`).join("")}</div>`}
    </div>
    <div class="card" id="veredicto" tabindex="-1" hidden>
      <p><span class="pill" id="vPill"></span></p>
      <div class="go arriba" id="vJuicio" hidden><button type="button" class="ub grande" id="jMal">Mal</button><button type="button" class="ub grande" id="jBien">Bien</button></div>
      <div class="go arriba" id="vSeguir" hidden><button type="button" class="ub grande" id="siguiente">Siguiente</button></div>
      <p class="vtuya" id="vTuya" hidden></p>
      <p class="vresp" id="vResp"></p>
      <div class="small vTambien" id="vTambien" hidden></div>
      <p id="vExp" hidden></p>
      <p class="small" id="vNota" hidden></p>
      <p class="small" id="vTema" hidden></p>
      <p class="small" id="vPct" hidden></p>
      <p class="small sosp" id="vSosp" role="status" hidden></p>
      <div class="mala" id="vMala" hidden>
        <button type="button" class="lk" id="malaBtn">Pregunta mala</button>
        <span id="malaSeguro" hidden>¿La retiro? Ya no sale y esta respuesta deja de contar. <button type="button" class="lk" id="malaSi">Sí, retírala</button> · <button type="button" class="lk" id="malaNo">No</button></span>
        <span id="malaHecho" hidden></span>
      </div>
    </div>
  </section>`),
  {
    titulo: `Pregunta ${sig.orden} de ${sig.total} · Pelagos`, nav: "gramatica",
    pie: "<p>Si aciertas, pasa sola a la siguiente." + (escribir ? "" : " Si fallas, toca la respuesta correcta para seguir.") + "</p>" +
      "<p>Lo que contestas se guarda al momento; puedes cerrar y seguir después, en este aparato o en otro.</p>",
  });
  fijarEnPregunta(true);
  fijarEnPreguntaDe(kid);
  pintarAtlasQuiz();
  pintarDeshacerR();
  if (deTutora) fondoDelKwiz(k);
  else esperarLoopDePregunta(kid, sig.p, q.tema, k);

  // En Limpio la pista ya está a la vista (25-Oct-2026), así que se apunta como vista.
  let pista = conPista && atlasEnQuiz(k), contestada = false, ultimoEscrito = null, modo = "escribir";
  const texto = (id, valor) => { const e = $(id); e.hidden = !valor; e.textContent = valor || ""; };

  function veredicto(d) {
    $("veredicto").hidden = false;
    const pill = $("vPill");
    pill.className = "pill " + (d.juicio ? "duda" : d.bien ? "bien" : "mal");
    pill.textContent = d.juicio ? "Tú decides" : d.bien ? (d.casi ? "Bien, pero revisa los acentos" : "Bien") : "Mal";
    pill.parentElement.hidden = !!d.juicio && atlasEnQuiz(k);         // en Limpio, sin «Tú decides» (25-Oct-2026): Mal y Bien ya lo dicen
    const tuya = escribir ? ultimoEscrito : (d.bien ? null : d.elegido);
    texto("vTuya", tuya && !(d.bien && !d.casi) ? "Tu respuesta: " + tuya : "");
    $("vTuya").classList.toggle("mal", !d.juicio && !d.bien);
    $("vResp").textContent = "Respuesta: " + q.respuesta;
    // También vale: una por renglón (25-Oct-2026). Si son muchas, las primeras y las demás detrás de «Ver las otras».
    const tv = $("vTambien"), otras = q.tambien_vale || [];
    tv.textContent = ""; tv.hidden = !otras.length;
    if (otras.length) {
      const VISTAS = 6;
      const lista = (xs) => { const ul = document.createElement("ul"); for (const x of xs) { const li = document.createElement("li"); li.textContent = x; ul.append(li); } return ul; };
      const t = document.createElement("p"); t.className = "vTit"; t.textContent = "También vale:";
      tv.append(t, lista(otras.slice(0, VISTAS)));
      if (otras.length > VISTAS) {
        const d = document.createElement("details"), sm = document.createElement("summary");
        sm.textContent = "Ver las otras " + (otras.length - VISTAS);
        d.append(sm, lista(otras.slice(VISTAS)));
        tv.append(d);
      }
    }
    texto("vExp", q.explicacion);
    texto("vNota", d.juicio || !d.bien ? q.nota_juicio : "");
    const vt = $("vTema");
    vt.hidden = !!d.juicio;
    vt.textContent = "";
    if (!d.juicio && tema) {
      vt.append("Tema: ");
      let enlace;
      if (tema.slug && tema.leccion) { enlace = document.createElement("a"); enlace.href = "#/leccion/" + tema.slug; }
      else { enlace = document.createElement("button"); enlace.type = "button"; enlace.className = "lk"; enlace.dataset.l = tema.id; }
      enlace.textContent = titulo(tema);
      vt.append(enlace);
    }
    texto("vPct", !d.juicio ? "Tu porcentaje en este tema: " + pct(d.antes) + " → " + pct(d.despues) : "");
    // Sospechosa: la fallaste otra vez, pero el resto del tema lo llevas bien. Quizá la mala es la pregunta.
    const sx = !d.juicio && !d.bien ? (E.sospechosas || []).find((x) => x.p === q.id) : null;
    texto("vSosp", sx ? `Esta pregunta ya te salió mal ${sx.fallas} veces, pero el resto del tema lo llevas ${sx.restoBien} de ${sx.restoDe}. Quedó en tus preguntas sospechosas (en Ajustes). Si crees que está mal, retírala aquí abajo.` : "");
    $("vJuicio").hidden = !d.juicio;
    $("vSeguir").hidden = !!d.juicio;

    $("vMala").hidden = !!d.juicio;
    $("controles").hidden = escribir || !!d.juicio;
    if (escribir) {
      // El foco va a la tarjeta, no a un botón: así un segundo Enter no te califica «Bien» sin querer,
      // y quien usa lector de pantalla oye el veredicto completo.
      $("veredicto").focus({ preventScroll: true });
      $("veredicto").scrollIntoView({ block: "nearest" });
    }
    if (d.juicio) { fijarTeclas({ b: () => juzgar(true), m: () => juzgar(false) }); return; }
    $("siguiente").textContent = d.ultima ? "Ver el resultado" : "Siguiente";
    fijarTeclas({ enter: avanzar });
  }

  // Si aciertas, pasa sola a la siguiente después de un respiro para ver «Bien». Si fallas, se queda para que leas.
  let solo = 0;
  function avanzar() {
    clearTimeout(solo);
    fijarEnPreguntaDe(null);
    if (N.siguiente(E, kid)) pintar(); else ir(QUIZ + "/" + kid + "/resultado");
  }

  function apuntarRespuesta(bien, extra = {}) {
    if (contestada) return;
    contestada = true;
    const conAtlas = atlasEnQuiz(k);
    const antes = info(q.tema).pct, nivelAntes = conAtlas ? nivelProy(kid, q.tema) : nivelDeTema(q.tema), colorAntes = conAtlas ? tonoDe(estadoProyectado(kid), q.tema) : null;
    const rid = N.nuevoId("r");
    A.apuntar({
      t: "r", id: rid, kwiz: kid, p: q.id, ...(sig.p !== q.id ? { s: sig.p } : {}), tema: q.tema, cuando: new Date().toISOString(),
      bien: bien ? 1 : 0, modo: escribir ? modo : "tocar", escrito: (escribir ? ultimoEscrito : extra.elegido) || null, pista: pista ? 1 : 0,
    });
    recalcular();
    if (!deTutora) moverNivel(nivelAntes, conAtlas ? nivelProy(kid, q.tema) : nivelDeTema(q.tema));
    refrescarMini();
    if (conAtlas) {
      efectoR = { kid, tema: q.tema, f0: colorAntes, f1: tonoDe(estadoProyectado(kid), q.tema), p0: antes, p1: info(q.tema).pct, bien: !!bien, t0: Date.now() };
      rUltima = { ref: rid, kid, tema: q.tema, hasta: Date.now() + DESHACER_MS };
      pintarAtlasQuiz();
      pintarDeshacerR();
    }
    if (deTutora) {
      const kk = E.kwizzes.get(kid);
      // Con 5 buenas la ronda se cierra sola (las que sobran no cuentan) y el fondo llega al final.
      if (kk && kk.bien >= N.ACIERTOS_TUTORA && N.siguiente(E, kid)) { A.apuntar({ t: "dejar", id: N.nuevoId("d"), kwiz: kid, cuando: new Date().toISOString() }); recalcular(); }
      // La que fallas vuelve 3 preguntas después (una sola vez por pregunta).
      else if (kk && !bien && sig.p === q.id) {
        A.apuntar({ t: "otra", id: N.nuevoId("o"), kwiz: kid, slot: q.id + "~2", antes: kk.pendientes[2] || null, cuando: new Date().toISOString() });
        recalcular();
      }
      fondoDelKwiz(E.kwizzes.get(kid));
    }
    veredicto({ bien, casi: !!extra.casi, elegido: extra.elegido, antes, despues: info(q.tema).pct, ultima: !N.siguiente(E, kid) });
    if (bien && !extra.casi) {
      const aqui = window.location.hash;
      solo = setTimeout(() => { if (enPreguntaDe === kid && window.location.hash === aqui) { saltoPorOpcion = Date.now(); avanzar(); } }, PAUSA_ACIERTO);
    }
  }
  const juzgar = (bien) => apuntarRespuesta(bien);

  if (escribir) {
    const campo = $("campo");
    const ponerModo = (m) => {
      modo = m;
      guardar("pelagos.modo", m);
      $("zonaEscribir").hidden = m !== "escribir";
      $("zonaDecir").hidden = m !== "decir";
      $("modoEscribir").setAttribute("aria-current", m === "escribir" ? "page" : "false");
      $("modoDecir").setAttribute("aria-current", m === "decir" ? "page" : "false");
      if (m === "escribir") campo.focus({ preventScroll: true }); else ($("ver") || $("revisar")).focus({ preventScroll: true });
    };
    $("modoEscribir").addEventListener("click", () => ponerModo("escribir"));
    $("modoDecir").addEventListener("click", () => ponerModo("decir"));
    ponerModo(guardado("pelagos.modo") === "decir" ? "decir" : "escribir");

    const compacto = !$("noSe1");      // Limpio con Atlas: un solo botón, «Revisar», para todo
    const revisar = () => {
      if (compacto && modo === "decir") { ultimoEscrito = null; veredicto({ juicio: true }); return; }
      ultimoEscrito = campo.value.trim();
      if (!ultimoEscrito && compacto) { ultimoEscrito = null; apuntarRespuesta(false); return; }      // vacío: como «No sé»
      if (!ultimoEscrito) { campo.focus(); return; }
      const nota = N.calificarEscrito(ultimoEscrito, q.respuesta, q.tambien_vale);
      if (nota === null) veredicto({ juicio: true });
      else apuntarRespuesta(true, { casi: nota === "casi" });
    };
    $("revisar").addEventListener("click", revisar);
    campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); revisar(); } });
    for (const t of vista.querySelectorAll(".tecla")) {
      t.addEventListener("click", () => {
        const a = campo.selectionStart, b = campo.selectionEnd;
        campo.value = campo.value.slice(0, a) + t.dataset.c + campo.value.slice(b);
        campo.focus();
        campo.setSelectionRange(a + 1, a + 1);
      });
    }
    const noSe = () => { ultimoEscrito = null; apuntarRespuesta(false); };
    if (!compacto) {
      $("ver").addEventListener("click", () => { ultimoEscrito = null; veredicto({ juicio: true }); });
      $("noSe1").addEventListener("click", noSe);
      $("noSe2").addEventListener("click", noSe);
    }
    $("jBien").addEventListener("click", () => juzgar(true));
    $("jMal").addEventListener("click", () => juzgar(false));
  } else {
    // Tocas una opción y ahí mismo ves Bien o Mal. La respuesta correcta se vuelve el botón para seguir:
    // si acertaste pasa sola; si fallaste, la tocas y pasa la siguiente pregunta, sin buscar otro botón.
    let contestadaEn = 0;
    const nota = (boton, texto) => { boton.querySelector(".nota").textContent = texto; };      // el renglón ya tiene su lugar: nada se mueve
    for (const b of vista.querySelectorAll(".op")) {
      b.addEventListener("click", () => {
        if (contestada) {
          if (b.dataset.op === q.respuesta && Date.now() - contestadaEn > 600) { saltoPorOpcion = Date.now(); avanzar(); }
          return;
        }
        if (Date.now() - saltoPorOpcion < 500) return;       // el segundo toque de un doble toque no contesta la pregunta nueva
        const bien = b.dataset.op === q.respuesta;
        contestadaEn = Date.now();
        apuntarRespuesta(bien, { elegido: b.dataset.op });
        let correcta = null;
        for (const otra of vista.querySelectorAll(".op")) {
          if (otra.dataset.op === q.respuesta) {
            correcta = otra;
            otra.classList.add("es");
            nota(otra, bien ? "Bien." : "Era esta. Tócala para seguir.");
          } else {
            otra.disabled = true;
            if (otra === b) { otra.classList.add("no"); nota(otra, "Mal. Tocaste esta."); }
          }
        }
        const aviso = vista.querySelector(".lead span:last-child");
        if (aviso) { aviso.textContent = bien ? "Bien" : "Mal"; aviso.className = "fallo " + (bien ? "bien" : "mal"); }
        if (correcta) correcta.focus({ preventScroll: true });
      });
    }
  }

  if ($("pistaBtn")) $("pistaBtn").addEventListener("click", () => { pista = true; $("pista").hidden = false; $("pistaBtn").hidden = true; });

  $("siguiente").addEventListener("click", avanzar);

  // «Pregunta mala»: la retira y su respuesta deja de contar.
  $("malaBtn").addEventListener("click", () => { $("malaBtn").hidden = true; $("malaSeguro").hidden = false; $("malaSi").focus(); });
  $("malaNo").addEventListener("click", () => { $("malaBtn").hidden = false; $("malaSeguro").hidden = true; });
  $("malaSi").addEventListener("click", () => {
    A.apuntar({ t: "retirar", id: N.nuevoId("x"), p: q.id, cuando: new Date().toISOString() });
    recalcular();
    $("malaSeguro").hidden = true;
    $("malaHecho").hidden = false;
    $("malaHecho").textContent = "Retirada. El tema quedó en " + pct(info(q.tema).pct) + ".";
    $("vPct").hidden = true;
    $("siguiente").textContent = N.siguiente(E, kid) ? "Siguiente" : "Ver el resultado";
  });
}
let enPreguntaDe = null; function fijarEnPreguntaDe(v) { enPreguntaDe = v; }
let saltoPorOpcion = 0;
/** Cuánto se queda a la vista el «Bien» antes de pasar sola a la siguiente pregunta. */
const PAUSA_ACIERTO = 900;

function verResultado(o, kid) {
  const k = E.kwizzes.get(kid);
  if (!k) return verNoExiste();
  if (!k.terminado) return k.pendientes.length ? ir(QUIZ + "/" + kid, true) : verNoExiste("Ese quiz se quedó sin preguntas.");
  const filas = k.preguntas.filter((p) => k.resp.has(p)).map((p) => ({ r: k.resp.get(p), q: preguntas.get(N.preguntaDe(p)) }));
  const temas = [...new Set(filas.map((f) => f.r.tema))].map((id) => porId.get(id)).filter(Boolean);
  const fallas = [...new Set(filas.filter((f) => !f.r.bien).map((f) => f.r.tema))].filter((id) => porId.has(id));
  const igual = JSON.stringify({ tipo: k.tipo, cuaderno: k.cuaderno, tema: k.tema });
  const cambios = N.cambiosDeLista(P, E, kid);
  const atr = N.temasAtascados(E);
  // Parejas de contraste con dos o más temas en este quiz: esos temas se ponen juntos, primero.
  const enQuiz = new Set(temas.map((t) => t.id));
  const parejasDelQuiz = (P.contrastes || []).filter((c) => c.temas.filter((x) => enQuiz.has(x)).length >= 2);
  const orden = [...new Set([...parejasDelQuiz.flatMap((c) => c.temas.filter((x) => enQuiz.has(x))), ...temas.map((t) => t.id)])];
  temas.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
  const nombres = (ids) => ids.map((id) => porId.get(id)).filter(Boolean).map((t) => {
    const tu = tutoraDe(t.id);
    return `<li>${esc(titulo(t))}${tu ? ` <span class="tutoraDe">· ${esc(tu.tutora.split(",")[0])}</span>` : ""}</li>`;
  }).join("");
  /** Cuánto se movió el tema en este quiz, junto a su porcentaje: «+2.6» o «−16.7». */
  const movio = (antes, despues) => {
    if (antes === null || antes === undefined || despues === null || despues === undefined) return "";
    const d = Math.round((despues - antes) * 10) / 10;
    if (!d) return ` <span class="delta">±0</span>`;
    return ` <span class="delta ${d > 0 ? "sube" : "baja"}">${d > 0 ? "+" : "−"}${Math.abs(d)}</span>`;
  };
  const renglon = (rotulo, ids, vacio) => `<h3>${rotulo}</h3>${ids.length ? `<ul class="rota">${nombres(ids)}</ul>` : `<p class="small">${vacio}</p>`}`;
  poner((k.tipo === "tutora" ? (h) => `<div class="hoy"><div class="sobre">${h}</div></div>` : conFondo)(`${k.tipo === "tutora" && ambiente() !== "limpio" ? '<div class="kwTutora"><div class="hero"><div class="tutoraVideo" id="tutoraVideo"></div></div></div>' : ""}
  <section class="card">
    <h1 class="h">${k.tipo === "tutora" ? (k.bien >= N.ACIERTOS_TUTORA ? `¡${N.ACIERTOS_TUTORA} de ${N.ACIERTOS_TUTORA}! Llegaste al final` : `${k.bien} buenas: te faltaron ${N.ACIERTOS_TUTORA - k.bien}`) : `${k.bien} de ${k.total}`}</h1>
    ${atlasEnQuiz(k) ? `<div class="qaDeshacer" id="rDeshacer" data-kid="${esc(kid)}" hidden><button type="button" class="qaDesBtn" id="rDeshacerBtn">↶ Deshacer la última</button></div>` : ""}
    <p>${TIPOS_KWIZ[k.tipo] || "Quiz"} · ${cuando(k.terminado)}</p>
    ${barra(k.total ? 100 * k.bien / k.total : 0, " gorda")}
    ${k.tipo === "tutora" ? "" : `<div class="hoyGrande" data-explicas><p class="small">Te queda hoy</p>${circulosDeHoy("grande")}${panelExplica()}</div>`}
    <div class="conCuadro"><button type="button" class="ub grande" data-kwiz='${esc(igual)}'>${k.tipo === "lista" ? "Otro quiz de tu plan" : "Otro quiz igual"}</button>${conCuadro()}</div>
    <div class="go"><a class="ub" href="${(() => { const t = k.tipo === "tutora" ? porId.get(k.tema) : null; return t && t.slug && t.leccion ? "#/leccion/" + esc(t.slug) : "#" + QUIZ; })()}">Cerrar</a>${fallas.length ? `<button type="button" class="ub" id="estudiarFallas">Estudiar las fallas</button>` : ""}</div>
  </section>
  ${atlasEnQuiz(k) ? `<section class="card" id="resAtlas"><h2>Tus temas en el Atlas</h2><div id="resAtlasCuerpo"></div></section>` : ""}
  <section class="card">
    <h2>Pregunta por pregunta</h2>
    <div class="pairs">${filas.map(({ r, q }) => {
      const t = porId.get(r.tema);
      const enlace = !t ? "" : t.slug && t.leccion ? `<a href="#/leccion/${esc(t.slug)}">${esc(titulo(t))}</a>` : `<button type="button" class="lk" data-l="${t.id}">${esc(titulo(t))}</button>`;
      return `<div class="pair rq">
        <div class="row ${r.bien ? "bien" : "mal"}"><span class="tag">${r.bien ? "Bien" : "Mal"}</span><span class="fq"${q && q.tipo === "escribir" ? ' lang="en"' : ""}>${q ? hueco(q.frase) : "Esta pregunta ya no está en el contenido."}</span></div>
        ${!r.bien && r.escrito ? `<p class="why">Tu respuesta: <span class="tach">${esc(r.escrito)}</span></p>` : ""}
        ${q ? `<p class="why">Respuesta: <b>${esc(q.respuesta)}</b></p>` : ""}
        ${q && q.explicacion ? `<p class="why">${esc(q.explicacion)}</p>` : ""}
        <p class="why">${enlace}${E.retiradas.has(r.p) ? " · pregunta retirada, ya no cuenta" : ""}</p>
      </div>`;
    }).join("")}</div>
  </section>
  <section class="card">
    <h2>Cómo se movieron tus temas</h2>
    ${parejasDelQuiz.map((c) => `<p class="small pareja">Se confunden: <b>${esc(c.nombre)}</b>. Aquí salen juntos para que compares.</p>`).join("")}
    <div class="links">${temas.map((t) => {
      const c = N.cambioDeTema(E, kid, t.id), i = info(t.id);
      const abre = t.slug && t.leccion ? `<a class="tb" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tb" data-l="${t.id}">`;
      return `${abre}<span class="lv">${esc(t.nivel)}</span><span class="nm">${esc(titulo(t))}</span>
        <span class="pc${esBajo(c.despues) ? " bajo" : ""}">${pct(c.despues)}${movio(c.antes, c.despues)}</span>
        ${c.de || i.toca ? `<span class="sm">${[atr.has(t.id) ? "Atascado" : "", (() => { const pj = parejasDelQuiz.find((x) => x.temas.includes(t.id)); return pj ? "Pareja: " + esc(pj.nombre) : ""; })(), c.de ? `${c.bien} de ${c.de} bien` : "", i.toca ? `toca el ${fecha(i.toca)}` : ""].filter(Boolean).join(" · ")}</span>` : ""}
        ${barra(c.despues)}${t.slug && t.leccion ? "</a>" : "</button>"}`;
    }).join("")}</div>
  </section>
  ${cambios ? `
  <section class="card" id="rota">
    <h2>Tu plan de estudio Pelagos</h2>
    ${renglon("Salen", cambios.salen, "Ninguno salió esta vez.")}
    ${renglon("Entran", cambios.entran, cambios.salen.length ? "Ninguno nuevo." : "Ninguno: no hubo lugar.")}
    ${renglon("Se quedan", cambios.quedan, "Ninguno.")}
    <p class="small">Sale el tema que aciertas. El que fallas se queda hasta que lo aciertes dos veces seguidas.</p>
  </section>` : ""}
`),
  { titulo: "Resultado del quiz · Pelagos", nav: "gramatica", conserva: o.conserva, pie: "<p>El número junto al porcentaje es cuánto se movió el tema en este quiz.</p>" });
  fondoDelKwiz(k);     // en el Kwiz con la tutora, el resultado se queda con la escena donde llegaste
  pintarAtlasResultado(k);
  pintarDeshacerR();
  // Estudiar las fallas: vuelve a tu plan y toca solo las voces de las tutoras de los temas que fallaste (se quedan en tu plan).
  const ef = $("estudiarFallas");
  if (ef) ef.addEventListener("click", () => {
    empezarRepaso(fallas, "plan", fallas.length === 1 ? "Tu falla." : "Tus fallas.", "#" + QUIZ);
    ir(QUIZ);
  });
}

/** Lo que antes se conectaba al cargar app.js; app.js lo llama en el mismo lugar, para que el orden no cambie. */
function conectarAtlas() {
  document.addEventListener("click", (ev) => {
    if (!(ev.target instanceof Element) || !$("qaMapa")) return;
    const g = ev.target.closest(".gFila.conNivel .lnCuenta, .gFila.conNivel .hoyC");
    if (!g) return;
    // Cada círculo de hoy marca solo los suyos (25-Oct-2026): nuevos, vencidos o fallados que te quedan.
    const c = ev.target.closest(".hoyC .circ");
    const nuevo = c ? "hoy" + (c.dataset.explica || "hoy:0").split(":")[1] : "quiz";
    if (nuevo !== qaMarcar) { qaMarcar = nuevo; efectoR = null; pintarAtlasQuiz(); }
  }, true);      // en captura: el que explica los números corta el clic, y este tiene que oírlo antes
  document.addEventListener("click", (ev) => {
    if (!(ev.target instanceof Element) || !$("kwAtlas")) return;
    const c = ev.target.closest(".hoyGrande .hoyC .circ");
    if (!c) return;
    const g = "hoy" + (c.dataset.explica || "hoy:0").split(":")[1];
    kwMarcar = kwMarcar === g ? "plan" : g;
    pintarAtlasInicio();
  }, true);
  document.addEventListener("click", (ev) => {
    if (!(ev.target instanceof Element) || !document.querySelector(".qaMapa")) return;
    const el = ev.target.closest(".qaMapa .qaC");
    if (el) burbujaAtlas(el);                  // tocar otra vez el mismo no la cierra: con ratón, pasar encima ya la abrió
    else if (!ev.target.closest(".qaMapa")) burbujaAtlas(null);
  });
  document.addEventListener("pointerover", (ev) => {
    if (ev.pointerType !== "mouse" || !(ev.target instanceof Element)) return;
    const el = ev.target.closest(".qaMapa .qaC");
    if (el) burbujaAtlas(el);
  });
  document.addEventListener("pointerout", (ev) => {
    if (ev.pointerType !== "mouse" || !(ev.target instanceof Element) || !ev.target.closest(".qaMapa")) return;
    if (!(ev.relatedTarget instanceof Element) || !ev.relatedTarget.closest(".qaMapa")) burbujaAtlas(null);
  });
  document.addEventListener("click", (ev) => {
    if (!(ev.target instanceof Element) || !ev.target.closest("#rDeshacerBtn") || !rUltima) return;
    const u = rUltima;
    rUltima = null; efectoR = null;
    A.apuntar({ t: "rdeshacer", id: N.nuevoId("rd"), ref: u.ref, kwiz: u.kid, cuando: new Date().toISOString() });
    recalcular();
    fijarEnPreguntaDe(null);
    if (window.location.hash === "#" + QUIZ + "/" + u.kid) pintar(); else ir(QUIZ + "/" + u.kid);
    setTimeout(() => { const c = $("cue"); if (c) { c.tabIndex = -1; c.focus({ preventScroll: true }); } }, 50);
  });
}

export { EFECTO_MS, NOMBRE_COLOR, PASO_RESULTADO, PAUSA_ACIERTO, armarAtlas, atlasEnQuiz, burbujaAtlas, claseTono, colorCss, conAtlasVisible, conectarAtlas, direccion, efectoR, enPreguntaDe, estadoProyectado, fijarEnPreguntaDe, infoProy, kwMarcar, marcarGrupo, nivelDelPlan, nivelProy, nombreColor, parpadear, pintarAtlasInicio, pintarAtlasQuiz, pintarAtlasResultado, pintarDeshacerR, proyCache, qaMarcar, rUltima, rango, saltoPorOpcion, temasDeGrupo, tonoDe, verPregunta, verResultado };
