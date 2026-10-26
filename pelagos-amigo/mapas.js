// El mapa de árbol · El mapa de calor: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=d5603222f7";
import * as A from "./almacen.js?v=d5603222f7";
import { $, CATEGORIAS, CATEGORIAS_CORTAS, NIVELES, vista } from "./base.js?v=d5603222f7";
import { E, P, diaLargo, fondoDelDia, guardado, guardar, info, pintar, poner, tarjetas } from "./app.js?v=d5603222f7";
import { tonoDe } from "./atlas.js?v=d5603222f7";
import { ancho, entradas, esc, fecha, hueco, pct, plural, titulo } from "./texto.js?v=d5603222f7";
import { granTotal } from "./acervo.js?v=d5603222f7";

// ---------------------------------------------------------------- El mapa de árbol

let anchoDelMapa = 0;         // el ancho con el que se dibujó, para volver a dibujarlo si la pantalla cambia

/** Todos los temas en un mapa: una tarjeta por nivel, de C1 a A0; dentro, una caja por tipo de palabra y un cuadro de color por tema. */
/** El nombre de una regla, abreviado para que quepa en su cuadro del Atlas: «Ver in the preterite» → «Ver · pret.». */
const ABREVIAS = [[/^the /i, ""], [/ in the /gi, " · "], [/ with the /gi, " + "], [/\bpreterite\b/gi, "pret."], [/\bimperfect\b/gi, "imperf."],
  [/\bpresent\b/gi, "pres."], [/\bsubjunctive\b/gi, "subj."], [/\bconditional\b/gi, "cond."], [/\bfuture\b/gi, "fut."], [/\bperfect\b/gi, "perf."],
  [/\bindicative\b/gi, "ind."], [/\bimperative\b/gi, "imper."], [/\bverbs\b/gi, "vbs"], [/\bverb\b/gi, "vb"], [/\bpronouns?\b/gi, "pron."],
  [/\bexpressions?\b/gi, "expr."], [/\birregular\b/gi, "irreg."], [/\bregular\b/gi, "reg."], [/\badjectives?\b/gi, "adj."], [/\bstem-changing\b/gi, "stem-ch."],
  [/\s+and\s+/gi, " & "], [/\s{2,}/g, " "]];
function abreviarRegla(nom) {
  let x = String(nom || "");
  for (const [re, por] of ABREVIAS) x = x.replace(re, por);
  return x.trim();
}

function verMapa(o) {
  const W = Math.max(240, vista.clientWidth - 18);       // lo que queda dentro de la tarjeta
  anchoDelMapa = vista.clientWidth;
  const cuenta = [0, 0, 0, 0, 0, 0], debeN = { d2: 0, d1: 0 };
  let sinVer = 0;
  const tarjetas = Object.keys(NIVELES).reverse().map((nivel) => {
    const suyos = P.temas.filter((t) => t.nivel === nivel).sort((a, b) => a.orden - b.orden);
    if (!suyos.length) return "";
    const porTipo = new Map();
    let suma = 0, con = 0;
    for (const t of suyos) {
      if (!porTipo.has(t.categoria)) porTipo.set(t.categoria, []);
      porTipo.get(t.categoria).push(t);
      const v = info(t.id).pct, k = tonoDe(E, t.id);
      if (v !== null) { suma += v; con++; }
      if (k === null) sinVer++; else if (typeof k === "number") cuenta[k]++; else debeN[k]++;
    }
    const tipos = [...porTipo.entries()].sort((a, b) => b[1].length - a[1].length);
    const area = Math.max(1300, Math.min(5200, W * 720 / suyos.length));      // cada nivel ocupa más o menos una pantalla
    const lugar = N.acomodarMapa(tipos.map(([, temas]) => temas.length), W, area);
    const cajas = tipos.map(([categoria, temas], k) => {
      const c = lugar.cajas[k];
      const nombre = CATEGORIAS[categoria] || categoria;
      const filas = [];
      for (let i = 0; i < temas.length; i += c.columnas) {
        const fila = temas.slice(i, i + c.columnas).map((t) => {
          const v = info(t.id).pct, f = tonoDe(E, t.id);
          // Su pedido del 18-Oct: en cada cuadro, el nombre de la regla (aunque sea letra diminuta: en el teléfono se agranda
          // con dos dedos). El porcentaje ya no va en el cuadro: sale al tocarlo. La letra es la más grande que quepa.
          const nom = titulo(t), corto = abreviarRegla(nom);
          const largaPalabra = Math.max(4, ...corto.split(/\s+/).map((w) => w.length));
          const letra = Math.max(1.5, Math.min(9, 0.8 * Math.sqrt((c.cw - 4) * (c.ch - 3) / (0.6 * 1.25 * Math.max(6, corto.length + 4))), (c.cw - 4) / (0.62 * largaPalabra)));
          return `<button type="button" class="mc mn k${f === null ? "x" : f}" data-l="${t.id}" aria-label="${esc(nom)}: ${esc(pct(v))}"><span class="mt"${t.titulo ? "" : ' lang="en"'} data-letra="${letra.toFixed(1)}">${esc(corto)}</span></button>`;
        });
        while (fila.length < c.columnas) fila.push('<span class="mc vacio"></span>');
        filas.push(`<div class="mfila">${fila.join("")}</div>`);
      }
      return `<div class="mcaja" role="group" aria-label="${esc(nombre)}: ${plural(temas.length, "tema", "temas")}" data-caja="${(c.x / W * 100).toFixed(3)},${c.y.toFixed(1)},${(c.w / W * 100).toFixed(3)},${c.h.toFixed(1)}">
        ${c.rotulo ? `<div class="mrot" aria-hidden="true">${esc(CATEGORIAS_CORTAS[categoria] || nombre)}${c.w >= 120 ? ` <span>${temas.length}</span>` : ""}</div>` : ""}
        <div class="mcuerpo">${filas.join("")}</div>
      </div>`;
    });
    return `
    <section class="card nivelMapa" id="mapa${nivel}">
      <h2><button type="button" class="mgraf" data-grafnivel="${nivel}" aria-label="${nivel}, ${NIVELES[nivel]}: ${pct(con ? suma / con : null)}. Ver tu porcentaje día por día"><span class="lv">${nivel}</span> ${NIVELES[nivel]} <span class="mpc">${pct(con ? suma / con : null)}</span></button></h2>
      <div class="mmapa" data-alto="${lugar.alto}">${cajas.join("")}</div>
    </section>`;
  }).join("");

  // El fondo del día va fijo al fondo, el mismo que en el Tablero.
  const fondo = fondoDelDia();
  poner(`
  <div class="hoy mapa${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("gramatica", "atlas")}
      <h1 class="sr">Atlas</h1>
      ${tarjetas}
      <section class="card" id="clave">
        <h2 class="sr">Qué significa cada color</h2>
        <p class="small">El color es el peldaño del tema: cada cuánto te toca repasarlo. El número es tu porcentaje.</p>
        <ul class="clave"><li><i class="mc kd2"></i><span>Fallado: debe 2 aciertos</span><b>${debeN.d2}</b></li><li><i class="mc kd1"></i><span>Fallado: debe 1 acierto</span><b>${debeN.d1}</b></li>${N.PELDANOS.map((nombre, i) => `<li><i class="mc k${i}"></i><span>${nombre}</span><b>${cuenta[i]}</b></li>`).join("")}${sinVer ? `<li><i class="mc kx"></i><span>Sin ver</span><b>${sinVer}</b></li>` : ""}</ul>
      </section>
    </div>
  </div>`,
  { titulo: "Atlas · Pelagos", nav: "gramatica", conserva: o.conserva });
}



// ---------------------------------------------------------------- El mapa de calor

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const miles = (n) => Number(n).toLocaleString("es-MX");

/**
 * Medio año como tira de calor: cada columna es una semana (de lunes a domingo, de arriba abajo) y cada cuadro un día.
 * Los días que todavía no llegan no se dibujan.
 */
/**
 * Tus clases por día (24-Oct-2026): «hechas» = las terminadas (tablero/clases-historial.json más las «hecha» de
 * clases.json) y «confirmadas» = las agendadas que todavía no empiezan. Cada día trae la lista [{ tutor, ini }].
 */
let clasesCache = null;
function clasesPorDia() {
  const huella = A.huellaTablero();
  if (clasesCache && clasesCache.huella === huella) return clasesCache;
  const hechas = new Map(), confirmadas = new Map(), vistas = new Set(), ahora = Date.now();
  const meter = (x, mapa) => {
    if (!x || typeof x !== "object" || typeof x.inicio !== "string") return;
    const ini = new Date(x.inicio);
    if (Number.isNaN(ini.getTime())) return;
    const tutor = typeof x.tutor === "string" && x.tutor.trim() ? x.tutor.trim().slice(0, 60) : "tu tutor";
    const clave = ini.getTime() + "|" + tutor;
    if (vistas.has(clave)) return;
    vistas.add(clave);
    const dia = N.fechaLocal(ini);
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia).push({ tutor, ini });
  };
  const h = A.historialDeClases ? A.historialDeClases() : null;
  for (const x of h && Array.isArray(h.clases) ? h.clases : []) meter(x, hechas);
  const c = A.clases();
  const lista = c && Array.isArray(c.clases) ? c.clases : [];
  for (const x of lista) if (x && x.estado === "hecha") meter(x, hechas);
  for (const x of lista) if (x && (x.estado === "agendada" || !x.estado) && new Date(x.inicio).getTime() > ahora) meter(x, confirmadas);
  const cuantas = new Map([...hechas].map(([d, l]) => [d, l.length]));
  clasesCache = { huella, hechas, confirmadas, cuantas };
  return clasesCache;
}
/** «2 clases, con Luis y Ayline» (o «1 clase, con Luis a las 11:00» si es una que viene). */
function textoClases(lista, conHora) {
  const nombres = [...new Set(lista.map((k) => k.tutor.split(/\s+/)[0] + (conHora ? " a las " + k.ini.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" }) : "")))];
  const y = nombres.length > 1 ? nombres.slice(0, -1).join(", ") + " y " + nombres[nombres.length - 1] : nombres[0];
  return plural(lista.length, "clase", "clases") + ", con " + y;
}

/**
 * El color de un día en la Bitácora: «jv» vocabulario (amarillo), «jg» gramática (azul), «ja» los dos (verde), más su escalón.
 * Desde el 24-Oct-2026 el día completo es vocabulario + gramática + clase: en Juntos, un día con estudio pero sin clase
 * sale rayado («sin»). En Habla: con clase, verde lleno («jk»); con estudio pero sin clase, rayado gris («hraya»); sin nada, vacío.
 */
function colorDelDia(dia, modo) {
  const v = E.actividadVoc.get(dia) || 0, g = E.actividadGram.get(dia) || 0;
  const nv = N.nivelDeCalor(v), ng = N.nivelDeCalor(g, N.CALOR_GRAM);
  if (modo === "vocabulario") return nv ? `jv c${nv}` : "c0";
  if (modo === "gramatica") return ng ? `jg c${ng}` : "c0";
  const n = E.actividad.get(dia) || 0;
  const conClase = clasesPorDia().hechas.has(dia);
  if (modo === "habla") return conClase ? "jk" : (n || g) ? "c0 hraya" : "c0";
  const sin = conClase ? "" : " sin";
  if (v && g) return `ja c${Math.max(nv, ng)}${sin}`;
  if (g) return `jg c${ng}${sin}`;
  if (n) return `jv c${N.nivelDeCalor(n)}${sin}`;     // repasos de vocabulario (o respuestas sueltas de gramática sin quiz terminado)
  return conClase ? "jk" : "c0";                       // una clase en un día sin estudio: verde igual
}
const MODOS_BITACORA = [["juntos", "Juntos"], ["vocabulario", "Vocabulario"], ["gramatica", "Gramática"], ["habla", "Habla"]];
let calorModo = null;         // «juntos», «vocabulario», «gramatica» o «habla»: lo que enseña la Bitácora (se guarda en el aparato)

function tiraDeCalor(anio, mesInicial, hoy, modo = "juntos") {
  const dos = (n) => String(n).padStart(2, "0");
  const cuadros = [], meses = [];
  const primero = new Date(anio, mesInicial, 1);
  const hueco = (primero.getDay() + 6) % 7;                 // lunes = 0
  for (let k = 0; k < hueco; k++) cuadros.push('<i class="hc vacio"></i>');
  for (let d = new Date(primero); d.getMonth() < mesInicial + 6 && d.getFullYear() === anio; d.setDate(d.getDate() + 1)) {
    const dia = `${anio}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    if (dia > hoy) break;
    if (d.getDate() === 1) meses.push(`<span data-col="${Math.floor(cuadros.length / 7) + 1}">${MESES_CORTOS[d.getMonth()]}</span>`);
    const n = E.actividad.get(dia) || 0;
    cuadros.push(`<i class="hc ${colorDelDia(dia, modo)}${dia === hoy ? " hoy" : ""}" data-dia="${dia}" data-n="${n}" data-v="${E.actividadVoc.get(dia) || 0}" data-g="${E.actividadGram.get(dia) || 0}"></i>`);
  }
  if (cuadros.length === hueco) return "";
  return `<div class="hmeses" aria-hidden="true">${meses.join("")}</div><div class="htira">${cuadros.join("")}</div>`;
}

/** Las últimas semanas, de lunes a domingo, en una sola tira (la Bitácora del Tablero). */
function tiraReciente(hoy, modo, semanas = 26) {
  const dos = (n) => String(n).padStart(2, "0");
  const fin = new Date(hoy + "T12:00:00");
  const ini = new Date(fin); ini.setDate(ini.getDate() - ((fin.getDay() + 6) % 7) - 7 * (semanas - 1));
  const cuadros = [], meses = [];
  for (const d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
    const dia = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    if (d.getDate() === 1) meses.push(`<span data-col="${Math.floor(cuadros.length / 7) + 1}">${MESES_CORTOS[d.getMonth()]}</span>`);
    cuadros.push(`<i class="hc ${colorDelDia(dia, modo)}${dia === hoy ? " hoy" : ""}" data-dia="${dia}"></i>`);
  }
  return `<div class="hmeses" aria-hidden="true">${meses.join("")}</div><div class="htira">${cuadros.join("")}</div>`;
}
/** Los escalones del futuro: cuántos repasos (tarjetas + temas, pesan igual) te tocan ese día. */
const CALOR_FUT = [1, 15, 30, 50];
const SEMANAS_FUT = 8;          // las semanas que se ven por delante
/** Lo que te toca en un día que viene, según el modo: { n, v, g }. */
function cargaDe(fut, dia, modo) {
  const x = fut.get(dia) || { v: 0, g: 0 };
  if (modo === "habla") return { n: 0, v: 0, g: 0 };
  const v = modo === "gramatica" ? 0 : x.v, g = modo === "vocabulario" ? 0 : x.g;
  return { n: v + g, v, g };
}
/**
 * La tira de la Bitácora como la de Anki (pedido del 23-Oct-2026): todo tu pasado hacia la izquierda (se desliza),
 * hoy a tres cuartos y 8 semanas de futuro en gris: lo que te toca repasar (tarjetas y temas pesan lo mismo).
 * Hoy va partido: arriba lo que ya hiciste, abajo lo que te falta.
 */
function tiraBitacora(hoy, modo) {
  const dos = (n) => String(n).padStart(2, "0");
  const fut = N.cargaFutura(P, E, hoy, SEMANAS_FUT * 7);
  const K = clasesPorDia();
  const primero = [...E.actividad.keys()].sort()[0] || hoy;
  const ini = new Date(primero + "T12:00:00"); ini.setDate(ini.getDate() - ((ini.getDay() + 6) % 7));
  const minimo = new Date(hoy + "T12:00:00"); minimo.setDate(minimo.getDate() - ((minimo.getDay() + 6) % 7) - 7 * 25);
  if (ini > minimo) ini.setTime(minimo.getTime());                   // al menos 26 semanas hacia atrás
  const fin = new Date(hoy + "T12:00:00"); fin.setDate(fin.getDate() - ((fin.getDay() + 6) % 7) + 7 * (SEMANAS_FUT + 1) - 1);
  const cuadros = [], meses = [];
  let colHoy = 0;
  for (const d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
    const dia = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    const col = Math.floor(cuadros.length / 7) + 1;
    if (d.getDate() === 1) meses.push(`<span data-col="${col}">${MESES_CORTOS[d.getMonth()]}</span>`);
    if (dia < hoy) { cuadros.push(`<i class="hc ${colorDelDia(dia, modo)}" data-dia="${dia}"></i>`); continue; }
    const c = cargaDe(fut, dia, modo), nf = N.nivelDeCalor(c.n, CALOR_FUT);
    // Con Juntos, cuánto pone cada uno: el % de vocabulario va en data-pv (lo pinta acomodarBitacora).
    const pv = modo === "juntos" && c.n ? ` fp" data-pv="${Math.round(100 * c.v / c.n)}` : "";
    if (dia === hoy) { colHoy = col; cuadros.push(`<i class="hc ${colorDelDia(dia, modo)} hoy${nf ? ` fq f${nf}${pv}` : ""}" data-dia="${dia}"></i>`); continue; }
    // El futuro (24-Oct-2026): con clase confirmada se ve completo; sin clase, rayado (en Juntos) o vacío (en Habla).
    const conf = K.confirmadas.has(dia);
    if (modo === "habla") cuadros.push(`<i class="hc fut${conf ? " kf" : ""}" data-dia="${dia}"></i>`);
    else if (modo === "juntos" && conf && !nf) cuadros.push(`<i class="hc fut kf" data-dia="${dia}" data-n="0"></i>`);
    else cuadros.push(`<i class="hc fut${modo === "juntos" && nf && !conf ? " sin" : ""}${nf ? ` f${nf}${pv}` : ""}" data-dia="${dia}" data-n="${c.n}"></i>`);   // pv cierra el class: va al final
  }
  const semanas = Math.ceil(cuadros.length / 7);
  return `<div class="bitScroll" data-colhoy="${colHoy}" data-semanas="${semanas}"><div class="bitAncho">
    <div class="hmeses" aria-hidden="true">${meses.join("")}</div><div class="htira">${cuadros.join("")}</div></div></div>
    <p class="bitInfo" id="bitInfo" aria-live="polite"></p>`;
}
/** La tira mide lo que sus semanas, y hoy queda a tres cuartos del ancho. */
function acomodarBitacora(caja) {
  const sc = caja && caja.querySelector(".bitScroll");
  if (!sc) return;
  const sem = Number(sc.dataset.semanas), col = Number(sc.dataset.colhoy), ancho = 14;     // 12 px el cuadro + 2 de espacio
  const dentro = sc.querySelector(".bitAncho");
  dentro.style.width = sem * ancho + "px";
  for (const x of dentro.querySelectorAll(".htira, .hmeses")) x.style.gridTemplateColumns = `repeat(${sem}, 12px)`;
  for (const e of dentro.querySelectorAll("[data-col]")) e.style.gridColumnStart = e.dataset.col;
  for (const e of dentro.querySelectorAll("[data-pv]")) e.style.setProperty("--pv", e.dataset.pv + "%");
  sc.scrollLeft = Math.max(0, (col - 0.5) * ancho - sc.clientWidth * 0.75);
}
/** Lo que dice un cuadro al tocarlo, en una línea discreta abajo de la tira. */
function infoDelDia(dia, hoy, modo) {
  const f = new Date(dia + "T12:00:00");
  const nombre = dia === hoy ? "Hoy" : `${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][f.getDay()]} ${f.getDate()} ${MESES_CORTOS[f.getMonth()]}`;
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const hecho = () => {
    const v = modo === "gramatica" ? 0 : E.actividadVoc.get(dia) || 0, g = modo === "vocabulario" ? 0 : E.actividadGram.get(dia) || 0;
    const p = [v ? pl(v, "card", "cards") : "", g ? pl(g, "quiz", "quizzes") : ""].filter(Boolean);
    return p.length ? p.join(" · ") : "nada";
  };
  const K = clasesPorDia(), hechas = K.hechas.get(dia), conf = K.confirmadas.get(dia);
  const clase = hechas ? textoClases(hechas) : conf ? textoClases(conf, true) : "";
  if (modo === "habla") return `${nombre}: ${clase || (dia < hoy ? "sin clase" : dia === hoy ? "todavía sin clase" : "sin clase reservada")}`;
  const mas = modo === "juntos" && clase ? ` · ${clase}` : "";
  if (dia < hoy) return `${nombre}: ${hecho()}${mas}`;
  const c = cargaDe(N.cargaFutura(P, E, hoy, SEMANAS_FUT * 7), dia, modo);
  const toca = c.n ? `${dia === hoy ? "te faltan" : "te tocan"} ${c.n}${c.v && c.g ? ` (${pl(c.v, "card", "cards")}, ${pl(c.g, "tema", "temas")})` : c.v ? " cards" : " temas"}` : dia === hoy ? "no te falta nada" : "nada por repasar";
  return dia === hoy ? `Hoy: hiciste ${hecho()}; ${toca}${mas}` : `${nombre}: ${toca}${mas}`;
}

/** La tarjeta de la Bitácora en el Tablero (22-Oct-2026): solo el mapa de calor, con Juntos · Vocabulario · Gramática. */
function tarjetaBitacora() {
  if (!calorModo) calorModo = MODOS_BITACORA.some(([m]) => m === guardado("pelagos.bitacora")) ? guardado("pelagos.bitacora") : "juntos";
  const hoy = N.fechaLocal(new Date());
  return `<section class="card bitT" id="bitacora" aria-labelledby="bitTT">
    <h2 id="bitTT">Bitácora</h2>
    <div class="tdSeg cuatro" role="group" aria-label="Qué enseña la Bitácora">${MODOS_BITACORA.map(([clave, nombre]) => `<button type="button" data-bmodo="${clave}" aria-pressed="${clave === calorModo}">${nombre}</button>`).join("")}</div>
    <div class="hanio" id="bitTira" aria-label="Tu estudio día por día y lo que te toca repasar en las próximas semanas">${tiraBitacora(hoy, calorModo)}</div>
  </section>`;
}
// Tocar un cuadro de la Bitácora del Tablero: lo que hiciste o lo que te toca, discretito abajo.

/** Tu historia de estudio, día por día: entre más repasos, más caliente el color. Un año por tarjeta, el más nuevo arriba. */
function verCalor(o) {
  const hoy = N.fechaLocal(new Date());
  if (!calorModo) calorModo = MODOS_BITACORA.some(([m]) => m === guardado("pelagos.bitacora")) ? guardado("pelagos.bitacora") : "juntos";
  const modo = calorModo;
  const mapa = modo === "vocabulario" ? E.actividadVoc : modo === "gramatica" ? E.actividadGram : modo === "habla" ? clasesPorDia().cuantas : E.actividad;
  const unidad = modo === "gramatica" ? ["quiz", "quizzes"] : modo === "habla" ? ["clase", "clases"] : ["repaso", "repasos"];
  const R = N.rachas(mapa, hoy);
  const ambos = [...E.actividadGram.keys()].filter((d) => E.actividadVoc.get(d) > 0).length;
  const porAnio = new Map();
  for (const [dia, n] of mapa) {
    const a = Number(dia.slice(0, 4));
    if (!porAnio.has(a)) porAnio.set(a, { dias: 0, total: 0 });
    porAnio.get(a).dias++; porAnio.get(a).total += n;
  }
  const esteAnio = Number(hoy.slice(0, 4));
  const primerAnio = porAnio.size ? Math.min(...porAnio.keys()) : esteAnio;
  const anios = [];
  for (let a = esteAnio; a >= primerAnio; a--) anios.push(a);
  const fondo = fondoDelDia();
  const dias = (n) => plural(n, "día", "días");
  poner(`
  <div class="hoy mapa calor${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("tablero", "bitacora")}
      <section class="card" id="calorCabeza">
        <h1 class="h">Bitácora</h1>
        <div class="jump tres cuatro" role="group" aria-label="Qué enseña la Bitácora" id="calorModo">
          ${MODOS_BITACORA.map(([clave, nombre]) => `<button type="button" data-modo="${clave}" aria-pressed="${clave === modo}">${nombre}</button>`).join("")}
        </div>
        <p class="small" id="calorDia" role="status">Toca un cuadro para ver ese día.</p>
      </section>
      ${anios.map((a) => {
        const x = porAnio.get(a) || { dias: 0, total: 0 };
        return `
      <section class="card anioCalor" id="calor${a}">
        <h2>${a} <span class="mpc">${x.dias ? `${dias(x.dias)} · ${miles(x.total)}` : "sin estudio"}</span></h2>
        <div class="hanio" role="img" aria-label="${a}: ${x.dias ? `${dias(x.dias)} de estudio y ${miles(x.total)} ${unidad[1]}` : "sin estudio"}">${tiraDeCalor(a, 0, hoy, modo)}${tiraDeCalor(a, 6, hoy, modo)}</div>
      </section>`;
      }).join("")}
      <section class="card" id="calorClave">
        ${(() => { const g = granTotal(); return g ? `<p class="granTotal"><b>${Math.floor(g.horas).toLocaleString("es-MX")} horas</b>de español desde ${g.desde ? g.desde.slice(0, 4) : "siempre"}.</p>` : ""; })()}
        <div class="extras">
          <div><b>${dias(R.actual)}</b>racha de ahora</div>
          <div><b>${dias(R.larga)}</b>tu racha más larga</div>
          <div><b>${miles(R.dias)}</b>días estudiados</div>
        </div>
        ${R.mejor.dia ? `<p class="small">${miles(R.total)} ${unidad[1]} en total. Tu mejor día fue el ${fecha(R.mejor.dia)}, con ${miles(R.mejor.n)}.${R.largaFin ? ` Tu racha más larga terminó el ${fecha(R.largaFin)}.` : ""}${modo === "juntos" ? ` ${ambos === 1 ? "1 día" : miles(ambos) + " días"} con los dos.` : ""}</p>` : `<p>Todavía no hay días${modo === "gramatica" ? " con quizzes" : modo === "habla" ? " con clase" : " de estudio"}. Aquí se van a ir prendiendo.</p>`}
        <ul class="hclave" aria-label="Qué significa cada color">
          <li><i class="hc c0"></i>Nada</li>${modo === "juntos"
            ? '<li><i class="hc jv c3"></i>Vocabulario</li><li><i class="hc jg c3"></i>Gramática</li><li><i class="hc ja c3 sin"></i>Los dos, sin clase</li><li><i class="hc ja c3"></i>Las tres, con clase</li>'
            : modo === "habla" ? '<li><i class="hc c0 hraya"></i>Estudiaste, sin clase</li><li><i class="hc jk"></i>Con clase</li>' : (modo === "gramatica" ? N.CALOR_GRAM : N.CALOR).map((desde, i, esc_) => `<li><i class="hc ${modo === "gramatica" ? "jg" : "jv"} c${i + 1}"></i>${desde}${i === esc_.length - 1 ? " o más" : esc_[i + 1] - 1 === desde ? "" : " a " + (esc_[i + 1] - 1)}</li>`).join("")}
        </ul>
      </section>
    </div>
  </div>`,
  { titulo: "Bitácora · Pelagos", nav: "inicio", conserva: o.conserva });
  // Un toque en un cuadro dice qué día es y cuánto estudiaste.
  let marcado = null;
  vista.querySelector(".sobre").addEventListener("click", (ev) => {
    const b = ev.target instanceof Element ? ev.target.closest("[data-modo]") : null;
    if (b) { calorModo = b.dataset.modo; guardar("pelagos.bitacora", calorModo); return pintar({ conserva: true }); }
    const c = ev.target instanceof Element ? ev.target.closest(".hc[data-dia]") : null;
    if (!c) return;
    if (marcado) marcado.classList.remove("sel");
    marcado = c; c.classList.add("sel");
    const n = Number(c.dataset.n), v = Number(c.dataset.v), g = Number(c.dataset.g);
    const kh = clasesPorDia().hechas.get(c.dataset.dia);
    const que = modo === "habla" ? (kh ? textoClases(kh) : "sin clase") : modo === "vocabulario" ? (v ? plural(v, "repaso de vocabulario", "repasos de vocabulario") : "sin vocabulario")
      : modo === "gramatica" ? (g ? plural(g, "quiz de gramática", "quizzes de gramática") : "sin quizzes")
        : (n ? plural(n, "repaso", "repasos") + (g ? ` y ${plural(g, "quiz de gramática", "quizzes de gramática")}` : "") : "sin estudio") + (kh ? "; " + textoClases(kh) : "");
    $("calorDia").textContent = `${diaLargo(c.dataset.dia)} de ${c.dataset.dia.slice(0, 4)}: ${que}.`;
  });
}

/** Lo que antes se conectaba al cargar app.js; app.js lo llama en el mismo lugar, para que el orden no cambie. */
function conectarMapas() {
  window.addEventListener("resize", () => {
    // Si la pantalla cambia de ancho (o el teléfono se voltea), el mapa se vuelve a dibujar a la medida.
    if (vista.querySelector(".nivelMapa") && Math.abs(vista.clientWidth - anchoDelMapa) > 8) pintar({ conserva: true });
  });
  vista.addEventListener("click", (ev) => {
    const b = ev.target instanceof Element ? ev.target.closest("[data-bmodo]") : null;
    if (!b) return;
    calorModo = b.dataset.bmodo; guardar("pelagos.bitacora", calorModo);
    const caja = b.closest(".bitT");
    for (const x of caja.querySelectorAll("[data-bmodo]")) x.setAttribute("aria-pressed", String(x.dataset.bmodo === calorModo));
    caja.querySelector("#bitTira").innerHTML = tiraBitacora(N.fechaLocal(new Date()), calorModo);
    acomodarBitacora(caja);
  });
  vista.addEventListener("click", (ev) => {
    const c = ev.target instanceof Element ? ev.target.closest(".bitT .hc[data-dia]") : null;
    if (!c) return;
    const caja = c.closest(".bitT"), info = caja.querySelector("#bitInfo");
    for (const x of caja.querySelectorAll(".hc.sel")) x.classList.remove("sel");
    c.classList.add("sel");
    if (info) info.textContent = infoDelDia(c.dataset.dia, N.fechaLocal(new Date()), calorModo);
  });
}

export { ABREVIAS, CALOR_FUT, MESES_CORTOS, MODOS_BITACORA, SEMANAS_FUT, abreviarRegla, acomodarBitacora, anchoDelMapa, calorModo, cargaDe, clasesCache, clasesPorDia, colorDelDia, conectarMapas, infoDelDia, miles, tarjetaBitacora, textoClases, tiraBitacora, tiraDeCalor, tiraReciente, verCalor, verMapa };
