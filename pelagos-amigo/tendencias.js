// Tus tendencias: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=c6252b2378";
import * as A from "./almacen.js?v=c6252b2378";
import * as V from "./videos.js?v=c6252b2378";
import * as F from "./fondo.js?v=c6252b2378";
import { E, P, botonNivel, conFondo, info, ir, meta, poner, porId, resumenNiveles, verNoExiste, videoDeTutora } from "./app.js?v=c6252b2378";
import { $, CATEGORIAS, NIVELES, vista } from "./base.js?v=c6252b2378";
import { bancoPorTema, botonTema, entradas, esBajo, esc, marcas, plural, revisarVideos, temasAtascadosAhora, titulo } from "./texto.js?v=c6252b2378";
import { nombreTutora, tutoraDe } from "./tutoras.js?v=c6252b2378";
import { mudo, palabras, paraBuscar } from "./acervo.js?v=c6252b2378";

// ---------------------------------------------------------------- Tus tendencias (Tablero, 16-Oct-2026)
// En lugar del promedio por nivel, que casi no se mueve: lo que subió y bajó en los últimos 7 días,
// contando solo los temas que has practicado aquí, y tus cajas grandes de tarjetas.
// 17-Oct-2026: arriba, tu avance (gramática por nivel y vocabulario, como la gráfica de Kwiziq); abajo, los últimos 7 días.
let tendCache = null;
const tendDias = 7;
const tendAbiertas = new Set();      // «Se te quedaron» y «Se te olvidaron»: cerradas hasta que las abras (con la flecha)
function tendenciasHoy() {
  const hoy = N.fechaLocal(new Date()), suc = A.sucesos();
  const clave = hoy + "|" + suc.length;
  if (!tendCache || tendCache.clave !== clave) tendCache = { clave, t: N.tendencias(P, suc, hoy, tendDias) };
  return tendCache.t;
}
function prepararTendencias() {
  const sec = $("tendencias");
  if (!sec || sec.dataset.listo) return;
  sec.dataset.listo = "1";
  sec.addEventListener("toggle", (ev) => {
    const d = ev.target;
    if (d instanceof HTMLDetailsElement && d.dataset.tdet) { if (d.open) tendAbiertas.add(d.dataset.tdet); else tendAbiertas.delete(d.dataset.tdet); }
  }, true);
}
// El selector de nivel (en el Tablero y en el Quiz de gramática) solo cambia su gráfica.
/** El selector de nivel con su gráfica de avance. id: el de la caja de la gráfica (opcional). */
function avanceNivel(id = "", { soloNivel = null } = {}) {
  const R = progresoHoy(), conPreg = N.nivelesConPreguntas(P, E);
  const nivs = Object.keys(NIVELES).filter((n) => R.niveles[n] && conPreg[n]);
  if (!nivs.length) return "";
  // Con «soloNivel» (la página del quiz, 25-Oct-2026): sin botones; la gráfica es del nivel de tu plan.
  if (soloNivel) return nivs.includes(soloNivel) ? `<div class="avNivel"><div class="grafNivel"${id ? ` id="${id}"` : ""}>${graficaNivel(soloNivel)}</div></div>` : "";
  if (!tendNivel || !nivs.includes(tendNivel)) tendNivel = E.enfoque && nivs.includes(E.enfoque) ? E.enfoque
    : nivs.slice().sort((a, b) => R.niveles[b].n[R.niveles[b].n.length - 1] - R.niveles[a].n[R.niveles[a].n.length - 1])[0];
  return `<div class="avNivel">
    <div class="tdSeg" role="group" aria-label="Nivel">${nivs.map((n) => `<button type="button" data-tnivel="${n}" aria-pressed="${n === tendNivel}">${n}</button>`).join("")}</div>
    <div class="grafNivel"${id ? ` id="${id}"` : ""}>${graficaNivel(tendNivel)}</div>
  </div>`;
}
// 24-Oct-2026: en las gráficas de línea, al pasar el ratón (o tocar) un punto sale su valor y su fecha.
const DIAS_TIP = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
function fechaTip(d, hoy) {
  const f = `${DIAS_TIP[new Date(d + "T12:00:00").getDay()]} ${fechaChica(d)}`;
  return d === hoy ? "Hoy, " + f : f;
}
/** Un círculo invisible y grande encima de cada punto, fácil de atinar, con el texto de su burbuja. */
const puntoTip = (cx, cy, texto, r = 13) => `<circle class="ptTip" cx="${cx}" cy="${cy}" r="${r}" data-tip="${esc(texto)}"><title>${esc(texto)}</title></circle>`;
let burbuja = null, burbujaFija = false;
function mostrarBurbuja(pt) {
  if (!burbuja) {
    burbuja = document.createElement("div");
    burbuja.className = "ptBurbuja";
    burbuja.setAttribute("role", "status");
    document.body.appendChild(burbuja);
  }
  for (const v of document.querySelectorAll(".ptTip.on")) v.classList.remove("on");
  pt.classList.add("on");
  burbuja.textContent = pt.dataset.tip;
  burbuja.hidden = false;
  const r = pt.getBoundingClientRect(), b = burbuja.getBoundingClientRect();
  const left = Math.max(8, Math.min(window.innerWidth - b.width - 8, r.left + r.width / 2 - b.width / 2));
  const top = r.top - b.height - 6 < 8 ? r.bottom + 6 : r.top - b.height - 6;
  burbuja.style.left = Math.round(left + window.scrollX) + "px";
  burbuja.style.top = Math.round(top + window.scrollY) + "px";
}
function esconderBurbuja() {
  if (burbuja) burbuja.hidden = true;
  for (const v of document.querySelectorAll(".ptTip.on")) v.classList.remove("on");
  burbujaFija = false;
}
/** Un tema que se movió: su nombre y una pista de 0 a 100 con el aro (antes), el punto (ahora) y la raya de tu meta. */
function pistaTema(x, meta) {
  const t = porId.get(x.tema);
  if (!t) return "";
  const a = Math.round(x.antes), b = Math.round(x.ahora), lo = Math.min(a, b), hi = Math.max(a, b), sube = b > a;
  const abre = t.slug && t.leccion ? `<a class="tdTema" href="#/leccion/${esc(t.slug)}">` : `<button type="button" class="tdTema" data-l="${t.id}">`;
  const cierra = t.slug && t.leccion ? "</a>" : "</button>";
  return `${abre}<span class="tdFila"><span>${esc(titulo(t))} <span class="tdNv">(${esc(t.nivel)})</span></span><b>${a} → ${b}%</b></span>
    <span class="tdPista ${sube ? "sube" : "baja"}" role="img" aria-label="De ${a} a ${b} por ciento. Tu meta: ${meta}.">
      <i class="tdRiel"></i><i class="tdTramo" data-x="${lo}" data-w="${hi - lo}"></i>
      <i class="tdAro" data-x="${a}"></i><i class="tdPunto" data-x="${b}"></i><i class="tdMeta" data-x="${meta}"></i>
    </span>${cierra}`;
}
// ---- Tu avance por nivel, como la gráfica de Kwiziq: temas cubiertos (línea) y tu puntaje (área).
let progCache = null, tendNivel = null;
function progresoHoy() {
  const hoy = N.fechaLocal(new Date()), suc = A.sucesos();
  const clave = hoy + "|" + suc.length;
  if (!progCache || progCache.clave !== clave) progCache = { clave, r: N.progresoNiveles(P, suc, hoy) };
  return progCache.r;
}
const MESES_CHICOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaChica = (d) => `${Number(d.slice(8, 10))} ${MESES_CHICOS[Number(d.slice(5, 7)) - 1]}`;
/** La gráfica de avance (como la de Kwiziq): rejilla de 0 a 100%, el área verde de tu puntaje y la línea de lo cubierto.
 *  d: { dias, linea: [%], area: [%] }, rotulos: { linea, area }, etiqueta: lo que dice el lector de pantalla, nums: el pie.
 *  24-Oct-2026 (su elección, la «B»): hoy va a ¾ del ancho y el último cuarto son los días que vienen. Con «rt» (el ritmo
 *  del plan, de N.ritmoVocab o N.ritmoNivel) sale la línea punteada, la raya del 100% y dos renglones: cuándo terminas
 *  a ese ritmo y cuánto vas adelante o atrás. rt: { r, real, denom, unidad, todo } (denom: el 100% de la gráfica). */
function graficaAvance(d, rotulos, etiqueta, nums, rt = null) {
  const n = d.dias.length, W = 340, H = 200, iz = 34, de = 330, ar = 12, ab = 170;
  if (!n) return "";
  const ult = n - 1, d0 = d.dias[0], hoyD = d.dias[ult];
  const pasados = N.diasEntre(d0, hoyD), futuros = Math.max(1, Math.round(Math.max(1, pasados) / 3)), dN = N.sumarDias(hoyD, futuros);
  const xHoy = Math.round((iz + (de - iz) * 0.75) * 10) / 10;
  const x = (dia) => Math.round((pasados > 0 ? iz + ((xHoy - iz) * N.diasEntre(d0, dia)) / pasados : xHoy) * 10) / 10;
  const xf = (dia) => Math.round((xHoy + ((de - xHoy) * N.diasEntre(hoyD, dia)) / futuros) * 10) / 10;     // los días que vienen
  const xx = (dia) => (dia <= hoyD ? x(dia) : xf(dia));
  const y = (v) => Math.round((ab - (Math.min(100, v) / 100) * (ab - ar)) * 10) / 10;
  const area = `${x(d0)},${ab} ${d.area.map((v, i) => x(d.dias[i]) + "," + y(v)).join(" ")} ${x(hoyD)},${ab}`;
  const rejilla = [0, 25, 50, 75, 100].map((v) => `<line class="pgRej" x1="${iz}" y1="${y(v)}" x2="${de}" y2="${y(v)}"/><text class="pgEje" x="${iz - 4}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("");
  let ritmo = "", meta = "", texto = "";
  if (rt && rt.r) {
    const pts = [];
    for (let dia = d0 < N.sumarDias(rt.r.desde, -1) ? N.sumarDias(rt.r.desde, -1) : d0; dia <= dN; dia = N.sumarDias(dia, 1)) {
      const c = rt.r.enDia(dia);
      if (c !== null) pts.push(xx(dia) + "," + y((100 * c) / rt.denom));
    }
    if (pts.length > 1) ritmo = `<polyline class="pgRitmo" points="${pts.join(" ")}"/>`;
    meta = `<line class="pgMeta" x1="${iz}" y1="${y((100 * (rt.r.meta || rt.r.total)) / rt.denom)}" x2="${de}" y2="${y((100 * (rt.r.meta || rt.r.total)) / rt.denom)}"/>`;
    const tope = rt.r.meta || rt.r.total, aHoy = rt.r.enDia(hoyD), dif = rt.real - aHoy;
    const linea1 = rt.real >= tope ? `Ya cubriste ${rt.todo}.`
      : `Ritmo del plan (${rt.r.porDia} al día desde el ${fechaChica(rt.r.desde)}): ${rt.todo} el <b>${fechaChica(rt.r.fin)}</b>.`;
    const linea2 = rt.real >= tope ? "" : dif === 0 ? `<br>Hoy vas justo al ritmo (${rt.real} de ${aHoy}).`
      : `<br>Hoy vas <b class="${dif > 0 ? "rtSi" : "rtNo"}">${Math.abs(dif)} ${rt.unidad} ${dif > 0 ? "adelante" : "atrás"}</b> (${rt.real} de ${aHoy}).`;
    texto = `<p class="pgRitmoTxt">${linea1}${linea2}</p>`;
  }
  return `<figure class="pg">
    <div class="pgLey"><span><i class="pgLLinea" aria-hidden="true"></i>${rotulos.linea}</span><span><i class="pgLArea" aria-hidden="true"></i>${rotulos.area}</span>${ritmo ? `<span><i class="pgLRitmo" aria-hidden="true"></i>Ritmo</span>` : ""}</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(etiqueta)}">
      ${rejilla}
      <rect class="pgFuturo" x="${xHoy}" y="${ar}" width="${de - xHoy}" height="${ab - ar}"/>
      ${meta}
      <polygon class="pgArea" points="${area}"/>
      ${ritmo}
      <polyline class="pgLinea" points="${d.linea.map((v, i) => x(d.dias[i]) + "," + y(v)).join(" ")}"/>
      ${d.linea.map((v, i) => `<circle class="pgPunto" cx="${x(d.dias[i])}" cy="${y(v)}" r="${i === ult ? 5 : 3}"/>`).join("")}
      ${d.linea.map((v, i) => puntoTip(x(d.dias[i]), y(v), `${fechaTip(d.dias[i], hoyD)} · ${rotulos.linea}: ${v}% · ${rotulos.area}: ${d.area[i]}%`)).join("")}
      <line class="pgHoy" x1="${xHoy}" y1="${ar - 4}" x2="${xHoy}" y2="${ab}"/>
      ${n > 1 ? `<text class="pgEje" x="${x(d0)}" y="${H - 14}" text-anchor="start">${fechaChica(d0)}</text>` : ""}
      <text class="pgEje pgEjeHoy" x="${xHoy}" y="${H - 14}" text-anchor="middle">Hoy</text>
      <text class="pgEje" x="${de}" y="${H - 14}" text-anchor="end">${fechaChica(dN)}</text>
    </svg>
    ${texto}
    <figcaption class="pgNums">${nums}</figcaption>
  </figure>`;
}
let ritmoCache = new Map();
/** El ritmo del plan, guardado mientras no cambien tus sucesos (calcularlo cuesta: recorre tus sucesos dos veces). */
function ritmoDe(clave, fn) {
  const k = N.fechaLocal(new Date()) + "|" + A.sucesos().length + "|" + clave;
  if (!ritmoCache.has(k)) { if (ritmoCache.size > 20) ritmoCache = new Map(); ritmoCache.set(k, fn()); }
  return ritmoCache.get(k);
}
/** La gráfica de un nivel de gramática: temas cubiertos y tu puntaje del nivel. */
function graficaNivel(nivel) {
  const R = progresoHoy(), X = R.niveles[nivel];
  if (!X) return "";
  const u = R.dias.length - 1, c = X.cubiertos[u], p = X.puntaje[u];
  const r = ritmoDe("nivel:" + nivel, () => N.ritmoNivel(P, A.sucesos(), nivel));
  const rt = r ? { r, real: X.n[u], denom: X.total, unidad: "temas", todo: r.meta === r.total ? "todo " + nivel : `los ${r.meta} temas con preguntas` } : null;
  return graficaAvance({ dias: R.dias, linea: X.cubiertos, area: X.puntaje }, { linea: "Temas cubiertos", area: "Tu puntaje" },
    `${nivel}: has cubierto ${X.n[u]} de ${X.total} temas (${c}%). Tu puntaje del nivel: ${p}%. Desde el ${fechaChica(R.dias[0])}: cubiertos de ${X.cubiertos[0]}% a ${c}%, puntaje de ${X.puntaje[0]}% a ${p}%.`,
    `<p><span class="tdGrande">${c}%</span><span class="small">cubiertos · ${X.n[u]} de ${X.total} temas</span></p><p><span class="tdGrande si">${p}%</span><span class="small">tu puntaje del nivel</span></p>`, rt);
}
let vocCache = null;
function progresoVocabHoy() {
  const hoy = N.fechaLocal(new Date()), suc = A.sucesos();
  const clave = hoy + "|" + suc.length;
  if (!vocCache || vocCache.clave !== clave) vocCache = { clave, r: N.progresoVocab(P, suc, hoy) };
  return vocCache.r;
}
const semanaMemo = {};
const LETRAS_DIA = ["D", "L", "M", "M", "J", "V", "S"];
/**
 * La curva del quiz de vocabulario (su elección del 22-Oct-2026, boceto 3 con un punto por día): tu puntaje de hoy
 * en grande, cuánto subió desde ayer y los últimos 7 días, uno por punto. Se vuelve a pintar con cada palabra.
 */
const semanaNivelMemo = new Map();
/** La curva fija de abajo en gramática (25-Oct-2026): tu puntaje del nivel en los últimos 7 días, como la del vocabulario. */
/**
 * La curva chiquita (su pedido del 25-Oct-2026): en el renglón de «Ocultar» mientras contestas, en lugar de la curva
 * flotante. Tu número, cuánto subió hoy y los 7 puntos de la semana. cual: "voc" o un nivel de gramática ("B1").
 */
function curvaMini(cual) {
  if (!P || !E || !cual) return "";
  const hoy = N.fechaLocal(new Date());
  const S = cual === "voc" ? N.semanaVocab(P, A.sucesos(), hoy, E, semanaMemo) : N.semanaNivel(P, A.sucesos(), hoy, cual, semanaNivelMemo);
  const v = S.puntaje, hoyV = v[6], dif = Math.round((hoyV - v[5]) * 10) / 10;
  const W = 72, H = 22, X0 = 4, X1 = W - 5, Y0 = 4, Y1 = H - 4;
  let lo = Math.min(...v), hi = Math.max(...v);
  if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
  const xs = v.map((_, i) => X0 + (i * (X1 - X0)) / 6), ys = v.map((y) => Y1 - ((y - lo) / (hi - lo)) * (Y1 - Y0));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const nombre = cual === "voc" ? "dominio" : cual;
  const dicho = `${cual === "voc" ? "Tu dominio del vocabulario" : "Tu puntaje de " + cual}: ${hoyV} por ciento, ${dif >= 0 ? "subió " + dif : "bajó " + -dif} hoy.`;
  return `<div class="miniCurva" id="miniCurva" data-cual="${esc(cual)}" role="img" aria-label="${esc(dicho)}">
    <b>${esc(String(hoyV))}%</b><span class="mcN">${esc(nombre)}</span><span class="mcD ${dif > 0 ? "si" : dif < 0 ? "no" : ""}">${dif > 0 ? "+" : dif < 0 ? "−" : "±"}${esc(String(Math.abs(dif)))} hoy</span>
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline class="mcL" points="${pts}"></polyline>${xs.map((x, i) => `<circle class="${i === 6 ? "mcHoy" : "mcDia"}" cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${i === 6 ? 3.4 : 2}"></circle>`).join("")}</svg>
  </div>`;
}
/** Vuelve a pintar la curva chiquita (al contestar). */
function refrescarMini() {
  const m = $("miniCurva");
  if (m) m.outerHTML = curvaMini(m.dataset.cual);
}
function curvaNivel(nivel) {
  if (!P || !E || !nivel) return "";
  const S = N.semanaNivel(P, A.sucesos(), N.fechaLocal(new Date()), nivel, semanaNivelMemo);
  return curvaVocab({ S, etiqueta: nivel, de: "de " + nivel });
}
function curvaVocab({ S: S0 = null, etiqueta = "dominio", de = "del vocabulario" } = {}) {
  if (!P || !E) return "";
  const hoy = N.fechaLocal(new Date());
  const S = S0 || N.semanaVocab(P, A.sucesos(), hoy, E, semanaMemo);
  const v = S.puntaje, hoyV = v[6], dif = Math.round((hoyV - v[5]) * 10) / 10;
  const W = 280, H = 52, X0 = 10, X1 = W - 12, Y0 = 8, Y1 = 34;
  let lo = Math.min(...v), hi = Math.max(...v);
  if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
  const xs = v.map((_, i) => X0 + (i * (X1 - X0)) / 6), ys = v.map((y) => Y1 - ((y - lo) / (hi - lo)) * (Y1 - Y0));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
  const num = (x) => String(x);
  const letras = S.dias.map((d, i) => (i === 6 ? "Hoy" : LETRAS_DIA[new Date(d + "T12:00:00").getDay()]));
  const nombres = S.dias.map((d, i) => (i === 6 ? "hoy" : DIAS_LARGOS_V[new Date(d + "T12:00:00").getDay()]));
  const dicho = `Tu dominio ${de}: ${num(hoyV)} por ciento, ${dif >= 0 ? "subió " + num(dif) : "bajó " + num(-dif)} desde ayer. Los últimos siete días: ${v.map((y, i) => nombres[i] + " " + num(y)).join(", ")}.`;
  return `<aside class="tjCurva" aria-label="Tu curva de dominio">
    <p class="tjCurvaNum"><b>${esc(num(hoyV))}%</b><span>${esc(etiqueta)}</span><span class="${dif > 0 ? "si" : dif < 0 ? "no" : ""}">${dif > 0 ? "+" : dif < 0 ? "−" : "±"}${esc(num(Math.abs(dif)))} hoy</span></p>
    <svg class="tjCurvaSvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(dicho)}">
      <path class="tjCurvaArea" d="M${pts.join(" L")} L${X1},${Y1 + 4} L${X0},${Y1 + 4} Z"></path>
      <path class="tjCurvaLinea" d="M${pts.join(" L")}"></path>
      ${xs.map((x, i) => `<circle class="${i === 6 ? "tjCurvaHoy" : "tjCurvaDia"}" cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${i === 6 ? 6.5 : 4}"></circle>`).join("")}
      ${xs.map((x, i) => puntoTip(x.toFixed(1), ys[i].toFixed(1), `${fechaTip(S.dias[i], S.dias[6])} · ${num(v[i])}% de dominio`, 10)).join("")}
      ${xs.map((x, i) => `<text class="${i === 6 ? "tjCurvaLetraHoy" : "tjCurvaLetra"}" x="${x.toFixed(1)}" y="${H - 2}" text-anchor="middle">${letras[i]}</text>`).join("")}
    </svg>
  </aside>`;
}
const DIAS_LARGOS_V = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** La gráfica del vocabulario: qué parte del mazo ya viste y qué tan arriba van tus tarjetas. */
function graficaVocab() {
  const V = progresoVocabHoy();
  if (!V.dias.length) return "";
  const u = V.dias.length - 1, c = V.vistas[u], p = V.puntaje[u];
  const r = ritmoDe("vocab", () => N.ritmoVocab(A.sucesos(), V.total));
  const rt = r ? { r, real: V.n[u], denom: V.total, unidad: "palabras", todo: "todas" } : null;
  return graficaAvance({ dias: V.dias, linea: V.vistas, area: V.puntaje }, { linea: "Palabras vistas", area: "Tu dominio" },
    `Vocabulario: has visto ${V.n[u]} de tus ${V.total} tarjetas (${c}%). Tu puntaje: ${p}%. Desde el ${fechaChica(V.dias[0])}: vistas de ${V.vistas[0]}% a ${c}%, puntaje de ${V.puntaje[0]}% a ${p}%.`,
    `<p><span class="tdGrande">${c}%</span><span class="small">vistas · ${V.n[u]} de ${V.total} palabras</span></p><p><span class="tdGrande si">${p}%</span><span class="small">tu dominio</span></p>`, rt);
}
function seccionTendencias() {
  if (!P || !E) return "";
  // ---- Los últimos 7 días.
  const T = tendenciasHoy();
  const temas = (l, vacio) => (l.length ? `<div class="tdTemas">${l.map((x) => pistaTema(x, T.metaPct)).join("")}</div>` : `<p class="small">${vacio}</p>`);
  return `<section class="card tend" id="tendencias" aria-labelledby="tendT">
    <h2 id="tendT">Tu avance</h2>
    <h3 class="tdSub">Gramática por nivel</h3>
    ${avanceNivel("tdGrafNivel")}
    <h3 class="tdSub">Vocabulario</h3>
    ${graficaVocab()}
    <p class="small">La línea es qué parte de tus palabras ya viste${E.reinicioTj ? " desde el reinicio" : ""}; lo verde, qué tan arriba van tus palabras en la escalera (la caja de 75 días es 100%; las que no has visto cuentan 0).</p>
    <details class="tdDet" data-tdet="subieron"${tendAbiertas.has("subieron") ? " open" : ""}>
      <summary><h3 class="tdSub">Los que más subieron <span class="tdGris">· ${T.subieron.length} en 7 días</span></h3></summary>
      <p class="small">Aro: hace 7 días. Punto: hoy. Raya: tu meta, ${T.metaPct}%.</p>
      ${temas(T.subieron, "Ninguno subió esta semana.")}
    </details>
    <details class="tdDet" data-tdet="bajaron"${tendAbiertas.has("bajaron") ? " open" : ""}>
      <summary><h3 class="tdSub">Los que más bajaron <span class="tdGris">· ${T.bajaron.length} en 7 días</span></h3></summary>
      ${temas(T.bajaron, "Ninguno bajó esta semana.")}
    </details>
  </section>`;
}

/** Pone el clip del premio en el fondo del Tablero. Si su video no está en este aparato ni en tu almacén, lo dice. */
function mostrarClipPremio(c) {
  const lugar = $("tutoraPremio");
  if (!lugar) return;
  F.mostrar(c.id, c.tramos, () => videoDeTutora(c.id), lugar);
  videoDeTutora(c.id).then((f) => {
    if (f || !lugar.isConnected || lugar.querySelector(".sinClip")) return;
    lugar.insertAdjacentHTML("beforeend", `<p class="small sinClip">No encuentro el video de ${esc(nombreTutora(c.id))} en este aparato ni en tu almacén de Cloudflare.</p>`);
  });
}

/** Busca un tema por lo que escribas: palabras del título (en inglés o en español), el número de la lección o su slug. En el orden de Kwiziq. */
function buscarTemas(texto) {
  const q = paraBuscar(texto).trim();
  if (!q) return [];
  const niveles = Object.keys(NIVELES);
  const palabras = q.split(/\s+/).filter(Boolean);
  const encaja = (t) => {
    if (/^\d+$/.test(q)) return String(t.id) === q || String(t.id).startsWith(q);
    const tu = tutoraDe(t.id);      // también por la tutora: su nombre y su oficio («Esperanza», «aeromoza»)
    const pajar = paraBuscar([t.titulo, t.titulo_kwiziq, t.slug, t.slug_kwiziq, t.regla, tu && tu.tutora].filter(Boolean).join(" "));
    return palabras.every((w) => pajar.includes(w));
  };
  return P.temas.filter(encaja).sort((a, b) => niveles.indexOf(a.nivel) - niveles.indexOf(b.nivel) || a.orden - b.orden).slice(0, 40);
}

function pintarBusqueda(texto) {
  const caja = $("bzRes");
  if (!caja) return;
  const q = texto.trim();
  if (!q) { caja.innerHTML = ""; $("bzNota").textContent = ""; return; }
  const temas = buscarTemas(q);
  $("bzNota").textContent = temas.length ? (temas.length === 40 ? "Los primeros 40. Escribe más para afinar." : plural(temas.length, "tema", "temas") + ", en el orden de Kwiziq.") : "Nada con eso. Prueba otra palabra, o el número de la lección.";
  const banco = bancoPorTema();
  caja.innerHTML = temas.map((t) => botonTema(t, { ingles: true, sub: `<span class="donde">${esc(t.nivel)} · #${t.orden} · lección ${t.id}</span>` + marcas(t, banco) })).join("");
}

function verBiblioteca(o) {
  revisarVideos();
  const antes = o.conserva && $("bzBusca") ? $("bzBusca").value : "";
  poner(conFondo(`
  ${entradas("gramatica", "lecciones")}
  <section class="card">
    <h1 class="h">Lecciones de gramática</h1>
    <form id="bzForma" class="forma" role="search" autocomplete="off">
      <label class="small" for="bzBusca">Buscar una lección</label>
      <input id="bzBusca" class="campo" type="search" value="${esc(antes)}" placeholder="Palabra del título, número de lección o tutora" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
    </form>
    <p class="small" id="bzNota" aria-live="polite"></p>
    <div class="links" id="bzRes"></div>
    <p>Todos los temas, por nivel. Elige uno.</p>
    <div class="links">${resumenNiveles().map((n) => botonNivel(n, true)).join("")}</div>
  </section>
  ${(P.tutoras || []).length && !mudo() ? `<section class="card">
    <h2>Tutoras</h2>
    <p>Una tutora por regla: su episodio y tus notas para cambiarlo. ${plural(P.tutoras.length, "tutora escrita", "tutoras escritas")}.</p>
    <div class="go"><a class="ub grande" href="#/tutoras">Ver las tutoras</a></div>
  </section>` : ""}`), { titulo: "Lecciones de gramática · Pelagos", nav: "gramatica", conserva: o.conserva });
  $("bzBusca").addEventListener("input", () => pintarBusqueda($("bzBusca").value));
  $("bzForma").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const temas = buscarTemas($("bzBusca").value);
    if (temas.length === 1 && temas[0].slug && temas[0].leccion) ir("/leccion/" + temas[0].slug);    // una sola: ve directo
    else pintarBusqueda($("bzBusca").value);
  });
  if (antes) pintarBusqueda(antes);
}

function verNivel(o, clave, filtro) {
  const nivel = clave.toUpperCase();
  if (!NIVELES[nivel]) return verNoExiste();
  const soloBajo = filtro === "/bajo", soloAtas = filtro === "/atascados";
  const atasT = temasAtascadosAhora();
  const cola = filtro || "";
  const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
  const bajo = suyos.filter((t) => esBajo(info(t.id).pct)).length;
  const categorias = [];
  const banco = bancoPorTema();
  revisarVideos();
  for (const t of suyos) {
    const i = info(t.id);
    if (soloBajo && !esBajo(i.pct)) continue;
    if (soloAtas && !atasT.has(t.id)) continue;
    const nombre = CATEGORIAS[t.categoria] || t.categoria;
    if (!categorias.length || categorias[categorias.length - 1].nombre !== nombre) categorias.push({ nombre, temas: [], bajo: 0 });
    categorias[categorias.length - 1].temas.push(t);
    if (esBajo(i.pct)) categorias[categorias.length - 1].bajo++;
  }
  const abiertas = new Set([...vista.querySelectorAll("details.cat[open] .cn")].map((e) => e.textContent));
  poner(conFondo(`
  <p class="crumb"><a href="#/gramatica">Gramática</a> · ${nivel}</p>
  <nav class="jump niveles" aria-label="Niveles">
    ${Object.keys(NIVELES).map((n) => `<a href="#/gramatica/${n.toLowerCase()}${cola}"${n === nivel ? ' aria-current="page"' : ""}>${n}</a>`).join("")}
  </nav>
  <header class="card">
    <h1 class="h">${nivel} · ${NIVELES[nivel]}</h1>
    <p>${suyos.length} temas. ${bajo} bajo ${meta()}%.</p>
    ${graficaNivel(nivel)}
    <nav class="jump tres" aria-label="Qué temas mostrar">
      <a href="#/gramatica/${clave}"${soloBajo || soloAtas ? "" : ' aria-current="page"'}>Todos</a>
      <a href="#/gramatica/${clave}/bajo"${soloBajo ? ' aria-current="page"' : ""}>Bajo ${meta()}%</a>
      <a href="#/gramatica/${clave}/atascados"${soloAtas ? ' aria-current="page"' : ""}>Atascados${(() => { const n = suyos.filter((t) => atasT.has(t.id)).length; return n ? " " + n : ""; })()}</a>
    </nav>
  </header>
  ${categorias.length ? categorias.map((c) => `
  <details class="card cat"${filtro || (o.conserva && abiertas.has(c.nombre)) ? " open" : ""}>
    <summary><span class="cn">${esc(c.nombre)}</span><span class="cc">${plural(c.temas.length, "tema", "temas")}${filtro ? "" : ` · ${c.bajo} bajo ${meta()}%`}</span></summary>
    <div class="links">${c.temas.map((t) => {
      const i = info(t.id);
      const sub = marcas(t, banco) + (i.n ? ` <span class="resp">${plural(i.n, "respuesta", "respuestas")}</span>` : "");
      return botonTema(t, { nivel: false, anchoNombre: true, ingles: true, sub });
    }).join("")}</div>
  </details>`).join("") : `<section class="card"><p>${soloAtas ? `Ningún tema de ${nivel} está atascado. Bien.` : `Ningún tema de ${nivel} está bajo ${meta()}%.`}</p></section>`}`),
  {
    titulo: nivel + " · Lecciones de gramática · Pelagos", nav: "gramatica", conserva: o.conserva,
    pie: "<p>Toca una categoría para abrirla. Los temas en inglés todavía no tienen lección propia: llevan el nombre que les da Kwiziq.</p>" + (E.sinArranque ? "<p>Un tema sin porcentaje (–) todavía no lo contestas aquí.</p>" : "<p>Un porcentaje sin número de respuestas es tu arranque de Kwiziq.</p>") + "<p>Cada tema lleva seis marcas: lección, tutora (con su nombre), video completo, loop, voz y preguntas. La marca llena es que ya está lista; la punteada, que falta. El video completo cuenta lo que hay en este aparato (tu carpeta «Pelagos videos» o los importados); el loop y la voz, lo que ya está subido. Se llenan solas conforme llegan.</p>",
  });
}

/** Lo que antes se conectaba al cargar app.js; app.js lo llama en el mismo lugar, para que el orden no cambie. */
function conectarTendencias() {
  vista.addEventListener("click", (ev) => {
    const nv = ev.target instanceof Element ? ev.target.closest("[data-tnivel]") : null;
    const caja = nv && nv.closest(".avNivel");
    if (!caja || nv.dataset.tnivel === tendNivel) return;
    tendNivel = nv.dataset.tnivel;
    for (const b of caja.querySelectorAll("[data-tnivel]")) b.setAttribute("aria-pressed", String(b.dataset.tnivel === tendNivel));
    caja.querySelector(".grafNivel").innerHTML = graficaNivel(tendNivel);
  });
  document.addEventListener("pointerover", (ev) => {
    const pt = ev.target instanceof Element ? ev.target.closest(".ptTip") : null;
    if (pt && ev.pointerType === "mouse") mostrarBurbuja(pt);
  });
  document.addEventListener("pointerout", (ev) => {
    const pt = ev.target instanceof Element ? ev.target.closest(".ptTip") : null;
    if (pt && ev.pointerType === "mouse" && !burbujaFija) esconderBurbuja();
  });
  document.addEventListener("click", (ev) => {
    const pt = ev.target instanceof Element ? ev.target.closest(".ptTip") : null;
    if (pt) { mostrarBurbuja(pt); burbujaFija = true; } else if (burbujaFija) esconderBurbuja();
  });
  window.addEventListener("hashchange", esconderBurbuja);
}

export { DIAS_LARGOS_V, DIAS_TIP, LETRAS_DIA, MESES_CHICOS, avanceNivel, burbuja, burbujaFija, buscarTemas, conectarTendencias, curvaMini, curvaNivel, curvaVocab, esconderBurbuja, fechaChica, fechaTip, graficaAvance, graficaNivel, graficaVocab, mostrarBurbuja, mostrarClipPremio, pintarBusqueda, pistaTema, prepararTendencias, progCache, progresoHoy, progresoVocabHoy, puntoTip, refrescarMini, ritmoCache, ritmoDe, seccionTendencias, semanaMemo, semanaNivelMemo, tendAbiertas, tendCache, tendDias, tendNivel, tendenciasHoy, verBiblioteca, verNivel, vocCache };
