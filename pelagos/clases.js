// La página de Clases (Tablero, entrada «Clases»): tus clases de Worldsacross, tres días a la vez, como un calendario.
//
// - Los datos llegan en tablero/clases.json (rama de avance). La página solo los lee: los escribe la tarea que ya
//   revisa tu día cada media hora, desde tu Chrome. Forma:
//       { "version": 1, "leido": "2026-10-13T15:30:00Z",
//         "clases": [ { "inicio": "2026-10-16T12:00:00-07:00", "min": 50, "tutor": "Rodolfo García",
//                       "foto": "rodolfo-garcia.jpg", "estado": "agendada" } ],
//         "libres": [ { "inicio": "…", "min": 50, "tutor": "…", "foto": "…" } ] }
//   `estado`: agendada, hecha o cancelada (las canceladas no se pintan). `libres` es opcional: huecos de tus favoritos.
// - Las fotos de los tutores viven en tablero/tutores/ (misma rama) y se bajan con la llave, como todo lo privado.
// - De 6 am a 9 pm, horas de 12. Se desliza a los lados (o con las flechas) para cambiar de días.
// - Todo lo que trae el archivo se escribe como texto, nunca como HTML.
import * as A from "./almacen.js?v=8ae7269937";

export const HORA0 = 6, HORA1 = 21, PX = 56;      // la cuadrícula: de 6 am a 9 pm, 56 px por hora
const ATRAS = 7, ADELANTE = 13;                    // hasta dónde se puede deslizar, en días desde hoy
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WA = "https://app.worldsacross.com/booking/my-classes";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let corrimiento = 0;      // cuántos días te has movido desde hoy
/** Al entrar a la página, se empieza en hoy. */
export function aHoy() { corrimiento = 0; }

/** Revisa el archivo y lo vuelve una lista limpia: { leido, clases, libres }, o null si no sirve. */
export function leerClases(datos) {
  if (!datos || typeof datos !== "object" || !Array.isArray(datos.clases)) return null;
  const limpia = (x, libre) => {
    if (!x || typeof x !== "object" || typeof x.inicio !== "string") return null;
    const ini = new Date(x.inicio);
    if (Number.isNaN(ini.getTime())) return null;
    const min = Number.isFinite(x.min) && x.min >= 10 && x.min <= 240 ? x.min : 50;
    const tutor = typeof x.tutor === "string" && x.tutor.trim() ? x.tutor.trim().slice(0, 60) : "Tu tutor";
    const foto = typeof x.foto === "string" && /^[a-z0-9-]+\.(jpg|png|webp)$/.test(x.foto) ? x.foto : "";
    const estado = libre ? "libre" : ["agendada", "hecha", "cancelada"].includes(x.estado) ? x.estado : "agendada";
    return { ini, min, tutor, foto, estado };
  };
  const clases = datos.clases.map((x) => limpia(x, false)).filter(Boolean).filter((x) => x.estado !== "cancelada").sort((a, b) => a.ini - b.ini);
  const libres = (Array.isArray(datos.libres) ? datos.libres : []).map((x) => limpia(x, true)).filter(Boolean);
  const leido = typeof datos.leido === "string" && !Number.isNaN(new Date(datos.leido).getTime()) ? new Date(datos.leido) : null;
  return { leido, clases, libres };
}

/** «8:00 am», «12:30 pm». */
export function hora12(d) {
  const h = d.getHours(), m = d.getMinutes();
  return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + " " + (h < 12 ? "am" : "pm");
}
const medianoche = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const masDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mismoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fin = (c) => new Date(c.ini.getTime() + c.min * 60000);
/** «17 h 30 min», «50 min», «3 h». */
export function duracion(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}
/** Dónde va algo en la cuadrícula, en px desde las 6 am (pegado a la orilla si cae fuera). */
function arriba(d) {
  const h = d.getHours() + d.getMinutes() / 60;
  return Math.round(Math.min(Math.max(h - HORA0, 0), HORA1 - HORA0 - 50 / 60) * PX);
}
/** Lo que falta para que empiece: «en 20 min», «en 3 h», «ahora». Vacío si falta más de un día. */
function falta(c, ahora) {
  const m = Math.round((c.ini - ahora) / 60000);
  if (m <= 0) return "ahora";
  if (m < 60) return `en ${m} min`;
  if (m < 24 * 60) return `en ${Math.round(m / 60)} h`;
  return "";
}

/** «hoy a las 8:00 am (en 20 min)», «mañana a las 12:00 pm», «el viernes 16 a las 12:00 pm». */
function cuandoLargo(c, ahora) {
  const hoy = medianoche(ahora), f = falta(c, ahora);
  const dia = mismoDia(c.ini, hoy) ? "hoy" : mismoDia(c.ini, masDias(hoy, 1)) ? "mañana" : `el ${DIAS_LARGOS[c.ini.getDay()]} ${c.ini.getDate()}`;
  return `${dia} a las ${hora12(c.ini)}${f ? ` (${f})` : ""}`;
}

/** Todo lo que la página necesita para pintar tres días, empezando `corr` días después de hoy. */
export function armarClases(L, ahora = new Date(), corr = 0) {
  const hoy = medianoche(ahora);
  const hecha = (c) => c.estado === "hecha" || fin(c) <= ahora;
  const siguiente = L.clases.find((c) => !hecha(c)) || null;
  // La semana de hoy, de lunes a domingo: cuánto hablas en total y cuánto ya hablaste.
  const lunes = masDias(hoy, -((hoy.getDay() + 6) % 7)), domingo = masDias(lunes, 7);
  const deLaSemana = L.clases.filter((c) => c.ini >= lunes && c.ini < domingo);
  const semana = {
    clases: deLaSemana.length,
    hechas: deLaSemana.filter(hecha).length,
    total: deLaSemana.reduce((s, c) => s + c.min, 0),
    hablado: deLaSemana.filter(hecha).reduce((s, c) => s + c.min, 0),
  };
  const dias = [0, 1, 2].map((k) => {
    const d = masDias(hoy, corr + k), esHoy = mismoDia(d, ahora);
    const nombre = esHoy ? "Hoy" : mismoDia(d, masDias(hoy, 1)) ? "Mañana" : mismoDia(d, masDias(hoy, -1)) ? "Ayer"
      : DIAS_LARGOS[d.getDay()].replace(/^./, (x) => x.toUpperCase()) + " " + d.getDate();
    const eventos = L.clases.filter((c) => mismoDia(c.ini, d)).map((c) => {
      const lista = hecha(c), sigue = c === siguiente;
      return { ...c, clase: lista ? "hecha" : sigue ? "sigue" : "", hecha: lista, sigue, cuando: falta(c, ahora) };
    });
    // Los huecos libres solo cuentan si no chocan con una clase tuya y todavía no pasan.
    for (const x of L.libres) {
      if (!mismoDia(x.ini, d) || fin(x) <= ahora) continue;
      if (eventos.some((c) => c.ini < fin(x) && x.ini < fin(c))) continue;
      eventos.push({ ...x, clase: "libre", hecha: false, sigue: false, cuando: "" });
    }
    eventos.sort((a, b) => a.ini - b.ini);
    return { fecha: d, esHoy, nombre, corto: DIAS[d.getDay()], num: d.getDate(), eventos };
  });
  const a = dias[0].fecha, b = dias[2].fecha;
  const rango = a.getMonth() === b.getMonth()
    ? `${DIAS[a.getDay()]} ${a.getDate()} – ${DIAS[b.getDay()]} ${b.getDate()} de ${MESES[b.getMonth()]}`
    : `${DIAS[a.getDay()]} ${a.getDate()} de ${MESES[a.getMonth()]} – ${DIAS[b.getDay()]} ${b.getDate()} de ${MESES[b.getMonth()]}`;
  const conAhora = dias.some((x) => x.esHoy) && ahora.getHours() >= HORA0 && ahora.getHours() < HORA1;
  return { dias, rango, semana, siguiente, ahoraTop: conAhora ? arriba(ahora) : null, alInicio: corr <= -ATRAS, alFinal: corr >= ADELANTE };
}

/** El calendario (sin el fondo ni las entradas de arriba: esos los pone la página). */
export function htmlClases(datos, ahora = new Date()) {
  const L = leerClases(datos);
  if (!L) {
    return `<section class="card"><h1 class="h">Clases</h1>
      <p>Todavía no llegan tus clases de Worldsacross. La tarea de cada media hora las trae desde tu Chrome; si tu computadora está prendida, aparecen solas.</p>
      <p><a class="ub" href="${WA}" target="_blank" rel="noopener noreferrer">Abrir Worldsacross</a></p></section>`;
  }
  const C = armarClases(L, ahora, corrimiento);
  const s = C.semana;
  const horas = [];
  for (let h = HORA0; h <= HORA1; h++) horas.push(`<span data-top="${(h - HORA0) * PX - 8}">${h % 12 || 12} ${h < 12 ? "AM" : "PM"}</span>`);
  const viejo = L.leido && ahora - L.leido > 3 * 3600000 ? `<p class="small viejo">Leído ${mismoDia(L.leido, ahora) ? "hoy" : "el " + L.leido.getDate() + " de " + MESES[L.leido.getMonth()]} a las ${hora12(L.leido)}: puede que falte algo nuevo.</p>` : "";
  let i = 0;
  const bloque = (e) => {
    const n = i++;
    const nombre = e.tutor.split(" ")[0];
    const linea = e.clase === "libre" ? "libre" : hora12(e.ini);
    const dicho = `${e.tutor}, ${hora12(e.ini)}${e.hecha ? ", hecha" : e.clase === "libre" ? ", hueco libre" : e.sigue ? ", la que sigue" : ""}`;
    return `<button type="button" class="clB${e.clase ? " " + e.clase : ""}" data-top="${arriba(e.ini)}" data-cl="${n}" aria-label="${esc(dicho)}">
      ${e.foto ? `<img data-tutor="${esc(e.foto)}" alt="">` : `<span class="clIni" aria-hidden="true">${esc(nombre.slice(0, 1))}</span>`}
      <span class="clT"><span class="clN">${esc(nombre)}${e.hecha ? " ✓" : ""}</span><span class="clH">${esc(linea)}</span></span></button>`;
  };
  const eventos = [];
  const columnas = C.dias.map((d) => {
    for (const e of d.eventos) eventos.push({ ...e, dia: d });
    return `<div class="clCol${d.esHoy ? " hoyCol" : ""}" role="group" aria-label="${esc(d.nombre)}: ${d.eventos.filter((e) => e.clase !== "libre").length === 1 ? "1 clase" : d.eventos.filter((e) => e.clase !== "libre").length + " clases"}">
      ${d.esHoy && C.ahoraTop !== null ? `<i class="clAhora" data-top="${C.ahoraTop}" aria-hidden="true"></i>` : ""}
      ${d.eventos.map(bloque).join("")}</div>`;
  }).join("");
  ultimos = eventos;
  return `
    <section class="card clCabeza">
      <div class="clFila">
        <div><h1 class="h">Clases</h1><p class="clRango">${esc(C.rango)}</p></div>
        <div class="clNav">
          <button type="button" class="ub" data-ir="-1" aria-label="Días anteriores"${C.alInicio ? " disabled" : ""}>‹</button>
          <button type="button" class="ub" data-ir="0">Hoy</button>
          <button type="button" class="ub" data-ir="1" aria-label="Días siguientes"${C.alFinal ? " disabled" : ""}>›</button>
        </div>
      </div>
      <p class="clHoras"><b>${esc(duracion(s.total))}</b> de conversación esta semana</p>
      <p class="small">${s.clases === 1 ? "1 clase" : s.clases + " clases"} · ${s.hechas === 1 ? "1 hecha" : s.hechas + " hechas"}${s.hablado ? ` · ${esc(duracion(s.hablado))} ya habladas` : ""}</p>
      ${C.siguiente ? `<p class="clSigue">La que sigue: <b>${esc(C.siguiente.tutor)}</b>, ${esc(cuandoLargo(C.siguiente, ahora))}</p>` : ""}
      ${viejo}
    </section>
    <section class="card clCal" id="clCal" aria-label="Calendario de ${esc(C.rango)}">
      <div class="clDias"><span></span>${C.dias.map((d) => `<span class="${d.esHoy ? "esHoy" : ""}"><small>${esc(d.corto)}${d.esHoy ? " · Hoy" : ""}</small><b>${d.num}</b></span>`).join("")}</div>
      <div class="clCuerpo"><div class="clHorasCol" aria-hidden="true">${horas.join("")}</div>${columnas}</div>
    </section>
    <section class="card clClave" aria-label="Qué significa cada color">
      <span><i class="sigue"></i>La que sigue</span><span><i></i>Agendada</span>${L.libres.length ? '<span><i class="libre"></i>Tu favorito, libre</span>' : ""}<span><i class="hecha"></i>Hecha ✓</span>
      <span class="small">Desliza a los lados para cambiar de días. Toca una clase para abrirla.</span>
    </section>`;
}
let ultimos = [];      // los bloques que están en pantalla, en orden (data-cl)

/** Lo que el HTML no puede traer escrito (lugares y fotos) y lo que se toca. `repintar` vuelve a pintar la página. */
export function montar(raiz, repintar) {
  for (const e of raiz.querySelectorAll(".clCuerpo [data-top]")) e.style.top = e.dataset.top + "px";
  for (const img of raiz.querySelectorAll("img[data-tutor]")) fotoEn(img, img.dataset.tutor);
  const ir = (n) => {
    const nuevo = n === 0 ? 0 : Math.max(-ATRAS, Math.min(ADELANTE, corrimiento + n));
    if (nuevo === corrimiento && n !== 0) return;
    corrimiento = nuevo;
    repintar();
  };
  for (const b of raiz.querySelectorAll("[data-ir]")) b.addEventListener("click", () => ir(Number(b.dataset.ir)));
  const cal = raiz.querySelector("#clCal");
  if (!cal) return;
  // Deslizar: con el dedo o arrastrando el mouse, a la izquierda avanza un día y a la derecha regresa.
  let x0 = null, y0 = null, deslizo = false;
  cal.addEventListener("pointerdown", (ev) => { x0 = ev.clientX; y0 = ev.clientY; deslizo = false; });
  cal.addEventListener("pointerup", (ev) => {
    if (x0 === null) return;
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) { deslizo = true; ir(dx < 0 ? 1 : -1); }
  });
  cal.addEventListener("pointercancel", () => { x0 = null; });
  cal.addEventListener("click", (ev) => {
    if (deslizo) { deslizo = false; return; }
    const b = ev.target instanceof Element ? ev.target.closest("[data-cl]") : null;
    if (b) abrir(ultimos[Number(b.dataset.cl)]);
  });
}

function fotoEn(img, archivo) {
  A.fotoTutor(archivo).then((u) => {
    if (!img.isConnected) return;
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement("span"), { className: "clIni", textContent: (img.closest("[aria-label]")?.getAttribute("aria-label") || "?").slice(0, 1) }));
  });
}

/** La tarjetita de una clase: foto grande, nombre, horario y el botón para entrar. */
function abrir(e) {
  const hoja = document.getElementById("hojaV"), dentro = document.getElementById("hvIn");
  if (!e || !hoja || !dentro) return;
  const dia = e.dia.nombre === "Hoy" || e.dia.nombre === "Mañana" || e.dia.nombre === "Ayer" ? e.dia.nombre : e.dia.nombre.replace(/ \d+$/, "") + " " + e.dia.num + " de " + MESES[e.dia.fecha.getMonth()];
  const estado = e.clase === "libre" ? "Tu favorito tiene este hueco libre" : e.hecha ? "Hecha ✓" : e.sigue ? (e.cuando ? "La que sigue: empieza " + e.cuando : "La que sigue") : "Agendada";
  dentro.innerHTML = `
    <div class="clFicha${e.clase ? " " + e.clase : ""}">
      ${e.foto ? `<img data-tutor="${esc(e.foto)}" alt="">` : `<span class="clIni grande" aria-hidden="true">${esc(e.tutor.slice(0, 1))}</span>`}
      <h2 id="hvT" tabindex="-1">${esc(e.tutor)}</h2>
      <p class="clCuando">${esc(dia)}, ${esc(hora12(e.ini))} – ${esc(hora12(fin(e)))}</p>
      <p class="clEstado">${esc(estado)}</p>
    </div>
    <div class="acts">
      ${e.hecha ? "" : `<a class="ub grande" href="${WA}" target="_blank" rel="noopener noreferrer">${e.clase === "libre" ? "Ver en Worldsacross" : "Entrar a la clase"}</a>`}
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>`;
  for (const img of dentro.querySelectorAll("img[data-tutor]")) fotoEn(img, img.dataset.tutor);
  if (!hoja.hasAttribute("open")) { if (hoja.showModal) hoja.showModal(); else hoja.setAttribute("open", ""); }
  document.getElementById("hvT").focus({ preventScroll: true });
}
