// La página de Clases (Tablero, entrada «Clases»): tus clases de Worldsacross, tres días a la vez, como un calendario.
//
// - Los datos llegan en tablero/clases.json (rama de avance). La página solo los lee: los escribe la tarea que ya
//   revisa tu día cada media hora, desde tu Chrome. Forma:
//       { "version": 1, "leido": "2026-10-13T15:30:00Z",
//         "clases": [ { "inicio": "2026-10-16T12:00:00-07:00", "min": 50, "tutor": "Rodolfo García",
//                       "foto": "rodolfo-garcia.jpg", "estado": "agendada",
//                       "tema": "Podcast y debate: Precariedad laboral",
//                       "leccion": { "titulo": "Must have done con deber", "url": "https://spanish.kwiziq.com/…" } } ],
//         "libres": [ { "inicio": "…", "min": 50, "tutor": "…", "foto": "…" } ] }
//   `estado`: agendada, hecha o cancelada (las canceladas no se pintan). `libres` es opcional: huecos de tus favoritos.
//   `tema` y `leccion` son opcionales: los pone Claude cuando reserva. `tema` es la actividad de Worldsacross (debate,
//   conversación…) y sale en el bloque; `leccion` es la lección pública de Kwiziq y sale en la ficha como enlace.
//   `repaso` y `practica` son opcionales (22-Oct-2026): direcciones de ElevenReader (https://elevenreader.io/…) del
//   repaso de clase y de la práctica tipo Pimsleur de esa clase. Salen en la ficha como «Escuchar el repaso» y «Practicar».
// - Las fotos de los tutores viven en tablero/tutores/ (misma rama) y se bajan con la llave, como todo lo privado.
// - De 6 am a 9 pm, horas de 12. Se desliza a los lados (o con las flechas) para cambiar de días.
// - Todo lo que trae el archivo se escribe como texto, nunca como HTML.
// - Pedir una clase: en la ficha de un hueco libre hay un botón por tutor. Al confirmar se apunta un suceso
//       { "t": "pedirClase", "id": "pc-…", "inicio": "…", "min": 50, "tutor": "…",
//         "actividad": "debate" | "conversacion", "gramatica": true | false, "leccion": { "tema", "titulo", "url" } | null }
//   Al confirmar escoges la actividad (el debate que propone Worldsacross o conversación libre) y si va una lección de
//   gramática (la sugerida es tu tema B2 más bajo; la pone la página con ponerSugerencia).
//   (y { "t": "cancelarPedido", "id": "pc-…" } para quitarlo). La tarea de cada media hora lo reserva en Worldsacross
//   y lo contesta en clases.json: "pedidos": [ { "id": "pc-…", "estado": "reservada" | "no se pudo", "nota": "…" } ].
// - Revisar quién está libre un día (22-Oct-2026): debajo de cada fecha, de hoy a 7 días, hay un botón «Revisar».
//   Apunta { "t": "pedirHuecos", "id": "ph-…", "dia": "2026-10-22", "cuando": "…" }. Una tarea lo atiende en su
//   siguiente corrida (a los 10, 25, 40 o 55), revisa en Worldsacross las horas que le quedan a ese día (de 8 am a 4 pm,
//   unos diez minutos) y lo contesta en clases.json: "huecosPedidos": [ { "id": "ph-…", "estado": "hecho" | "no se pudo",
//   "nota": "…", "contestado": "…" } ], con los «libres» de ese día ya al día. Mientras tanto el día dice «Revisando…».
import * as A from "./almacen.js?v=c1bd704d72";

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
    const tema = !libre && typeof x.tema === "string" ? x.tema.trim().slice(0, 120) : "";
    const lx = !libre && x.leccion && typeof x.leccion === "object" ? x.leccion : null;
    const leccion = lx && typeof lx.url === "string" && /^https:\/\/spanish\.kwiziq\.com\/[^\s"'<>]*$/.test(lx.url)
      ? { url: lx.url, titulo: typeof lx.titulo === "string" && lx.titulo.trim() ? lx.titulo.trim().slice(0, 120) : "Lección de Kwiziq" } : null;
    const er = (u) => !libre && typeof u === "string" && /^https:\/\/elevenreader\.io\/[^\s"'<>]*$/.test(u) ? u : "";
    return { ini, min, tutor, foto, estado, tema, leccion, repaso: er(x.repaso), practica: er(x.practica) };
  };
  const clases = datos.clases.map((x) => limpia(x, false)).filter(Boolean).filter((x) => x.estado !== "cancelada").sort((a, b) => a.ini - b.ini);
  const libres = (Array.isArray(datos.libres) ? datos.libres : []).map((x) => limpia(x, true)).filter(Boolean);
  const leido = typeof datos.leido === "string" && !Number.isNaN(new Date(datos.leido).getTime()) ? new Date(datos.leido) : null;
  const respuestas = new Map();
  for (const x of Array.isArray(datos.pedidos) ? datos.pedidos : []) {
    if (x && typeof x.id === "string" && ["reservada", "no se pudo"].includes(x.estado)) {
      const cuando = typeof x.contestado === "string" && !Number.isNaN(new Date(x.contestado).getTime()) ? new Date(x.contestado) : null;
      respuestas.set(x.id, { estado: x.estado, nota: typeof x.nota === "string" ? x.nota.slice(0, 200) : "", contestado: cuando });
    }
  }
  const huecos = new Map();
  for (const x of Array.isArray(datos.huecosPedidos) ? datos.huecosPedidos : []) {
    if (x && typeof x.id === "string" && ["hecho", "no se pudo"].includes(x.estado)) {
      const cuando = typeof x.contestado === "string" && !Number.isNaN(new Date(x.contestado).getTime()) ? new Date(x.contestado) : null;
      huecos.set(x.id, { estado: x.estado, nota: typeof x.nota === "string" ? x.nota.slice(0, 200) : "", contestado: cuando });
    }
  }
  // Cuándo se puso al día por última vez la disponibilidad: la lectura de la noche («libresLeido») o el «Revisar» más nuevo ya hecho.
  const fecha = (v) => (typeof v === "string" && !Number.isNaN(new Date(v).getTime()) ? new Date(v) : null);
  let dispo = fecha(datos.libresLeido);
  for (const h of huecos.values()) if (h.estado === "hecho" && h.contestado && (!dispo || h.contestado > dispo)) dispo = h.contestado;
  return { leido, clases, libres, respuestas, huecos, dispo };
}

/** «2026-10-22» en tu hora. */
export function diaClave(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const HUECO0 = 8, HUECO1 = 16, HUECOS_ADELANTE = 7;   // se revisan las horas en punto de 8 am a 4 pm, hasta 7 días
/** Tus pedidos de «Revisar» un día, sacados de tus sucesos: [{ id, dia, cuando }], el más nuevo al final. */
export function pedidosHuecosDe(sucesos) {
  const lista = [];
  for (const e of sucesos || []) {
    if (!e || e.t !== "pedirHuecos" || typeof e.id !== "string" || typeof e.dia !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.dia)) continue;
    if (lista.some((x) => x.id === e.id)) continue;
    const cuando = typeof e.cuando === "string" && !Number.isNaN(new Date(e.cuando).getTime()) ? new Date(e.cuando) : null;
    lista.push({ id: e.id, dia: e.dia, cuando });
  }
  return lista;
}
/** ¿A ese día todavía le quedan horas por revisar? (hoy: una hora en punto de 8 a 4 que empiece en más de 30 minutos). */
export function quedanHoras(d, ahora = new Date()) {
  const hoy = medianoche(ahora), dia = medianoche(d);
  if (dia < hoy || dia > masDias(hoy, HUECOS_ADELANTE)) return false;
  if (dia > hoy) return true;
  const ultima = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), HUECO1);
  return ultima - ahora > 30 * 60000;
}

/** Tus pedidos de clase, sacados de tus sucesos: [{ id, ini, min, tutor, cuando }], sin los cancelados. */
export function pedidosDe(sucesos) {
  const quitados = new Set(), lista = [];
  for (const e of sucesos || []) if (e && e.t === "cancelarPedido" && typeof e.id === "string") quitados.add(e.id);
  for (const e of sucesos || []) {
    if (!e || e.t !== "pedirClase" || typeof e.id !== "string" || quitados.has(e.id) || typeof e.tutor !== "string") continue;
    const ini = new Date(e.inicio);
    if (Number.isNaN(ini.getTime()) || lista.some((x) => x.id === e.id)) continue;
    const actividad = e.actividad === "conversacion" ? "conversacion" : "debate";
    const leccion = e.gramatica !== false && e.leccion && typeof e.leccion.titulo === "string" ? e.leccion.titulo.slice(0, 120) : "";
    lista.push({ id: e.id, ini, min: Number.isFinite(e.min) ? e.min : 50, tutor: e.tutor.slice(0, 60), cuando: e.cuando || "", actividad, leccion });
  }
  return lista;
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

/** «hoy», «ayer» o «el 12»: para decir cuándo se confirmó algo. */
function diaCorto(f, ahora = new Date()) {
  return mismoDia(f, ahora) ? "hoy" : mismoDia(f, masDias(medianoche(ahora), -1)) ? "ayer" : "el " + f.getDate();
}

/** «hoy a las 8:00 am (en 20 min)», «mañana a las 12:00 pm», «el viernes 16 a las 12:00 pm». */
function cuandoLargo(c, ahora) {
  const hoy = medianoche(ahora), f = falta(c, ahora);
  const dia = mismoDia(c.ini, hoy) ? "hoy" : mismoDia(c.ini, masDias(hoy, 1)) ? "mañana" : `el ${DIAS_LARGOS[c.ini.getDay()]} ${c.ini.getDate()}`;
  return `${dia} a las ${hora12(c.ini)}${f ? ` (${f})` : ""}`;
}

/** Todo lo que la página necesita para pintar tres días, empezando `corr` días después de hoy. */
export function armarClases(L, ahora = new Date(), corr = 0, pedidos = [], huecos = []) {
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
      if (eventos.some((c) => c.clase !== "libre" && c.ini < fin(x) && x.ini < fin(c))) continue;
      // Varios favoritos libres a la misma hora van en un solo bloque: sale el primero (el archivo los trae por tu orden).
      const mismo = eventos.find((c) => c.clase === "libre" && c.ini.getTime() === x.ini.getTime());
      if (mismo) { if (mismo.tutor !== x.tutor && !mismo.otros.includes(x.tutor)) mismo.otros.push(x.tutor); continue; }
      eventos.push({ ...x, clase: "libre", hecha: false, sigue: false, cuando: "", otros: [] });
    }
    // Un hueco que ya pediste lo dice: «pedida» mientras Andrea no contesta; si no se pudo, sale la nota.
    for (const e of eventos) {
      if (e.clase !== "libre") continue;
      const p = pedidos.filter((x) => x.ini.getTime() === e.ini.getTime()).pop();
      if (!p) continue;
      const resp = L.respuestas.get(p.id);
      if (resp && resp.estado === "reservada") continue;       // ya es clase: llega en «clases» con la próxima lectura
      e.pedido = { ...p, respuesta: resp || null };
      e.clase = resp ? "libre fallida" : "libre pedida";
    }
    // Un pedido que no se pudo sale en rojo aunque el hueco ya no esté en «libres»: así sabes que hay que buscar otro.
    for (const p of pedidos) {
      const resp = L.respuestas.get(p.id);
      if (!resp || resp.estado !== "no se pudo" || !mismoDia(p.ini, d) || fin(p) <= ahora) continue;
      if (eventos.some((c) => c.ini < fin(p) && p.ini < fin(c))) continue;
      eventos.push({ ini: p.ini, min: p.min, tutor: p.tutor, foto: "", estado: "libre", clase: "libre fallida", hecha: false, sigue: false, cuando: "", otros: [], pedido: { ...p, respuesta: resp } });
    }
    // Las clases que pediste desde aquí y Andrea reservó: «Confirmada».
    for (const e of eventos) {
      if (e.clase.startsWith("libre")) continue;
      const p = pedidos.find((x) => x.ini.getTime() === e.ini.getTime() && x.tutor === e.tutor && L.respuestas.get(x.id)?.estado === "reservada");
      if (p) e.confirmada = L.respuestas.get(p.id).contestado || true;
    }
    eventos.sort((a, b) => a.ini - b.ini);
    // «Revisar»: el último pedido de ese día y si ya te contestaron.
    const clave = diaClave(d), ultimo = huecos.filter((x) => x.dia === clave).pop() || null;
    const resp = ultimo ? (L.huecos || new Map()).get(ultimo.id) || null : null;
    const revisar = { puede: quedanHoras(d, ahora), clave, pendiente: !!(ultimo && !resp), respuesta: resp, pedido: ultimo };
    return { fecha: d, esHoy, nombre, corto: DIAS[d.getDay()], num: d.getDate(), eventos, revisar };
  });
  const a = dias[0].fecha, b = dias[2].fecha;
  const rango = a.getMonth() === b.getMonth()
    ? `${DIAS[a.getDay()]} ${a.getDate()} – ${DIAS[b.getDay()]} ${b.getDate()} de ${MESES[b.getMonth()]}`
    : `${DIAS[a.getDay()]} ${a.getDate()} de ${MESES[a.getMonth()]} – ${DIAS[b.getDay()]} ${b.getDate()} de ${MESES[b.getMonth()]}`;
  const conAhora = dias.some((x) => x.esHoy) && ahora.getHours() >= HORA0 && ahora.getHours() < HORA1;
  // Los pedidos que Andrea no pudo reservar (de hoy en adelante), para avisarte arriba.
  const fallidos = pedidos.filter((p) => p.ini >= ahora && L.respuestas.get(p.id)?.estado === "no se pudo")
    .map((p) => ({ ...p, nota: L.respuestas.get(p.id).nota }));
  const pendientes = pedidos.filter((p) => p.ini >= ahora && !L.respuestas.has(p.id));
  // Los días que pediste revisar y que todavía no te contestan (de hoy en adelante).
  const hoyClave = diaClave(hoy);
  const revisando = [...new Map(huecos.filter((x) => x.dia >= hoyClave && !(L.huecos || new Map()).has(x.id)).map((x) => [x.dia, x])).values()];
  return { dias, rango, revisando, semana, siguiente, fallidos, pendientes, ahoraTop: conAhora ? arriba(ahora) : null, alInicio: corr <= -ATRAS, alFinal: corr >= ADELANTE };
}

/** El calendario (sin el fondo ni las entradas de arriba: esos los pone la página). */
export function htmlClases(datos, ahora = new Date(), pedidos = [], huecos = []) {
  const L = leerClases(datos);
  if (!L) {
    return `<section class="card"><h1 class="h">Clases</h1>
      <p>Todavía no llegan tus clases de Worldsacross. La tarea de cada media hora las trae desde tu Chrome; si tu computadora está prendida, aparecen solas.</p>
      <p><a class="ub" href="${WA}" target="_blank" rel="noopener noreferrer">Abrir Worldsacross</a></p></section>`;
  }
  const C = armarClases(L, ahora, corrimiento, pedidos, huecos);
  const s = C.semana;
  const horas = [];
  for (let h = HORA0; h <= HORA1; h++) horas.push(`<span data-top="${(h - HORA0) * PX - 8}">${h % 12 || 12} ${h < 12 ? "AM" : "PM"}</span>`);
  const viejo = L.leido && ahora - L.leido > 3 * 3600000 ? `<p class="small viejo">Leído ${mismoDia(L.leido, ahora) ? "hoy" : "el " + L.leido.getDate() + " de " + MESES[L.leido.getMonth()]} a las ${hora12(L.leido)}: puede que falte algo nuevo.</p>` : "";
  const dispo = L.dispo
    ? `<p class="small clDispo">Disponibilidad al día: ${DIAS_LARGOS[L.dispo.getDay()]} ${L.dispo.getDate()} de ${MESES[L.dispo.getMonth()]}${mismoDia(L.dispo, ahora) ? " (hoy)" : ""}, ${hora12(L.dispo)}</p>`
    : `<p class="small clDispo">Disponibilidad: todavía sin revisar.</p>`;
  let i = 0;
  const bloque = (e) => {
    const n = i++;
    const nombre = e.tutor.split(" ")[0];
    const linea = e.clase.startsWith("libre") ? (e.clase === "libre pedida" ? "pedida ⏳" : e.clase === "libre fallida" ? "no se pudo ✕" : hora12(e.ini) + (e.otros.length ? ` · +${e.otros.length}` : "")) : hora12(e.ini);
    const dicho = `${e.tutor}, ${hora12(e.ini)}${e.tema ? ", " + e.tema : ""}${e.hecha ? ", hecha" : e.clase === "libre pedida" ? ", ya la pediste" : e.clase === "libre fallida" ? ", no se pudo reservar" : e.clase === "libre" ? `, hueco libre${e.otros?.length ? "; también " + e.otros.join(", ") : ""}` : e.sigue ? ", la que sigue" : ""}`;
    return `<button type="button" class="clB${e.clase ? " " + e.clase : ""}" data-top="${arriba(e.ini)}" data-cl="${n}" aria-label="${esc(dicho)}">
      ${e.foto ? `<img data-tutor="${esc(e.foto)}" alt="">` : `<span class="clIni" aria-hidden="true">${esc(nombre.slice(0, 1))}</span>`}
      <span class="clT"><span class="clN">${esc(nombre)}${e.hecha ? " ✓" : ""}</span><span class="clH">${esc(linea)}</span>${e.tema ? `<span class="clTema">${esc(e.tema)}</span>` : ""}</span></button>`;
  };
  const eventos = [];
  const columnas = C.dias.map((d) => {
    for (const e of d.eventos) eventos.push({ ...e, dia: d });
    return `<div class="clCol${d.esHoy ? " hoyCol" : ""}" role="group" aria-label="${esc(d.nombre)}: ${d.eventos.filter((e) => !e.clase.startsWith("libre")).length === 1 ? "1 clase" : d.eventos.filter((e) => !e.clase.startsWith("libre")).length + " clases"}">
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
      ${C.pendientes.length ? `<p class="clPedidos">${C.pendientes.length === 1 ? "1 clase pedida" : C.pendientes.length + " clases pedidas"}: Andrea la${C.pendientes.length === 1 ? "" : "s"} reserva en la próxima media hora.</p>` : ""}
      ${C.revisando.map((x) => `<p class="clPedidos">Revisando quién está libre ${esc(diaDicho(x.dia, ahora))}${x.cuando ? ` (lo pediste a las ${esc(hora12(x.cuando))})` : ""}: Andrea lo empieza en unos quince minutos y tarda como diez.</p>`).join("")}
      ${C.fallidos.map((p) => `<p class="clNoSePudo">No se pudo reservar a <b>${esc(p.tutor)}</b>, ${esc(cuandoLargo(p, ahora))}${p.nota ? `: ${esc(p.nota)}` : "."}</p>`).join("")}
      ${dispo}
      ${viejo}
    </section>
    <section class="card clCal" id="clCal" aria-label="Calendario de ${esc(C.rango)}">
      <div class="clDias"><span></span>${C.dias.map((d) => `<span class="${d.esHoy ? "esHoy" : ""}"><small>${esc(d.corto)}${d.esHoy ? " · Hoy" : ""}</small><b>${d.num}</b>${botonRevisar(d, ahora)}</span>`).join("")}</div>
      <div class="clCuerpo"><div class="clHorasCol" aria-hidden="true">${horas.join("")}</div>${columnas}</div>
    </section>
    <section class="card clClave" aria-label="Qué significa cada color">
      <span><i class="sigue"></i>La que sigue</span><span><i></i>Agendada</span>${L.libres.length ? '<span><i class="libre"></i>Tu favorito, libre</span>' : ""}<span><i class="hecha"></i>Hecha ✓</span>
      <span class="small">Desliza a los lados para cambiar de días. Toca una clase para abrirla.</span>
    </section>
    <section class="card clResumen" aria-label="Tu semana de clases">
      <p class="clHoras"><b>${esc(duracion(s.total))}</b> de conversación esta semana</p>
      <p class="small">${s.clases === 1 ? "1 clase" : s.clases + " clases"} · ${s.hechas === 1 ? "1 hecha" : s.hechas + " hechas"}${s.hablado ? ` · ${esc(duracion(s.hablado))} ya habladas` : ""}</p>
      ${C.siguiente ? `<p class="clSigue">La que sigue: <b>${esc(C.siguiente.tutor)}</b>, ${esc(cuandoLargo(C.siguiente, ahora))}${C.siguiente.tema ? ` · ${esc(C.siguiente.tema)}` : ""}</p>` : ""}
    </section>`;
}
/** «hoy», «mañana» o «el viernes 23», para un día «2026-10-23». */
function diaDicho(clave, ahora) {
  const [y, m, dd] = clave.split("-").map(Number), d = new Date(y, m - 1, dd), hoy = medianoche(ahora);
  return mismoDia(d, hoy) ? "hoy" : mismoDia(d, masDias(hoy, 1)) ? "mañana" : `el ${DIAS_LARGOS[d.getDay()]} ${d.getDate()}`;
}
/** Debajo de la fecha: «Revisar», «Revisando…» o la hora de la última revisión (y se puede volver a pedir). */
function botonRevisar(d, ahora) {
  const r = d.revisar;
  if (!r || (!r.puede && !r.pendiente)) return "";
  const cual = `${DIAS_LARGOS[d.fecha.getDay()]} ${d.fecha.getDate()}`;
  if (r.pendiente) return `<span class="clRevisar enCurso" role="status">Revisando…</span>`;
  const hecho = r.respuesta && r.respuesta.estado === "hecho" && r.respuesta.contestado ? `Al día ${hora12(r.respuesta.contestado)}` : r.respuesta && r.respuesta.estado === "no se pudo" ? "No se pudo" : "";
  return `<button type="button" class="clRevisar" data-huecos="${esc(r.clave)}" aria-label="Revisar quién de tus favoritos está libre el ${esc(cual)}${hecho ? ". " + esc(hecho) : ""}">${hecho ? `<small>${esc(hecho)}</small>` : ""}↻ Revisar</button>`;
}
let ultimos = [];      // los bloques que están en pantalla, en orden (data-cl)
let repintarAhora = () => {};
let sugerencia = null;      // { tema, titulo, pct, url }: tu tema B2 más bajo, para la nota del tutor
/** La lección sugerida para los pedidos (la calcula la página con tus porcentajes). */
export function ponerSugerencia(s) {
  sugerencia = s && typeof s.url === "string" && /^https:\/\/spanish\.kwiziq\.com\//.test(s.url) ? s : null;
}
const ACTIVIDADES = { debate: "Debate (el tema que propone Worldsacross)", conversacion: "Conversación libre" };

/** Lo que el HTML no puede traer escrito (lugares y fotos) y lo que se toca. `repintar` vuelve a pintar la página. */
export function montar(raiz, repintar) {
  repintarAhora = repintar;
  for (const e of raiz.querySelectorAll(".clCuerpo [data-top]")) e.style.top = e.dataset.top + "px";
  for (const img of raiz.querySelectorAll("img[data-tutor]")) fotoEn(img, img.dataset.tutor);
  const ir = (n) => {
    const nuevo = n === 0 ? 0 : Math.max(-ATRAS, Math.min(ADELANTE, corrimiento + n));
    if (nuevo === corrimiento && n !== 0) return;
    corrimiento = nuevo;
    repintar();
  };
  for (const b of raiz.querySelectorAll("[data-ir]")) b.addEventListener("click", () => ir(Number(b.dataset.ir)));
  // «Revisar»: apunta el pedido y la página dice «Revisando…» hasta que la tarea lo conteste.
  for (const b of raiz.querySelectorAll("[data-huecos]")) b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    A.apuntar({ t: "pedirHuecos", id: "ph-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), dia: b.dataset.huecos, cuando: new Date().toISOString() });
    repintar();
  });
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
  const libre = e.clase.startsWith("libre"), pendiente = e.clase === "libre pedida";
  const estado = pendiente ? `Ya se la pediste a Andrea: ${e.pedido.tutor}, ${ACTIVIDADES[e.pedido.actividad].split(" (")[0].toLowerCase()}${e.pedido.leccion ? " y gramática: " + e.pedido.leccion : ""}. La reserva en la próxima media hora.`
    : e.clase === "libre fallida" ? `No se pudo reservar a ${e.pedido.tutor}${e.pedido.respuesta.nota ? ": " + e.pedido.respuesta.nota.replace(/\.?$/, ".") : "."} Escoge otro tutor u otra hora.`
    : libre ? "Tu favorito tiene este hueco libre" : e.hecha ? "Hecha ✓"
    : e.confirmada ? (e.sigue ? "La que sigue · " : "") + "Confirmada ✓" + (e.confirmada instanceof Date ? ` (Worldsacross, ${diaCorto(e.confirmada)} a las ${hora12(e.confirmada)})` : "")
    : e.sigue ? (e.cuando ? "La que sigue: empieza " + e.cuando : "La que sigue") : "Agendada";
  dentro.innerHTML = `
    <div class="clFicha${e.clase ? " " + e.clase : ""}">
      ${e.foto ? `<img data-tutor="${esc(e.foto)}" alt="">` : `<span class="clIni grande" aria-hidden="true">${esc(e.tutor.slice(0, 1))}</span>`}
      <h2 id="hvT" tabindex="-1">${esc(e.tutor)}</h2>
      <p class="clCuando">${esc(dia)}, ${esc(hora12(e.ini))} – ${esc(hora12(fin(e)))}</p>
      <p class="clEstado">${esc(estado)}</p>
      ${e.otros?.length ? `<p class="clOtros">También libres: ${esc(e.otros.join(", "))}</p>` : ""}
      ${e.tema ? `<p class="clFTema">${esc(e.tema)}</p>` : ""}
      ${e.leccion ? `<p class="clLeccion">Lección: <a href="${esc(e.leccion.url)}" target="_blank" rel="noopener noreferrer">${esc(e.leccion.titulo)}</a></p>` : ""}
    </div>
    <div class="acts" id="clActs">
      ${pendiente ? `<button type="button" class="ub" data-cancelar>Cancelar el pedido</button>`
        : libre ? [e.tutor, ...(e.otros || [])].filter((t) => e.clase !== "libre fallida" || t !== e.pedido.tutor).map((t) => `<button type="button" class="ub grande" data-pedir="${esc(t)}">Reservar con ${esc(t.split(" ")[0])}</button>`).join("") : ""}
      ${e.hecha || libre ? "" : `<a class="ub grande" href="${WA}" target="_blank" rel="noopener noreferrer">Entrar a la clase</a>`}
      ${!libre && e.practica ? `<a class="ub grande" data-practica href="${esc(e.practica)}" target="_blank" rel="noopener noreferrer">Practicar</a>` : ""}
      ${!libre && e.repaso ? `<a class="ub" data-repaso href="${esc(e.repaso)}" target="_blank" rel="noopener noreferrer">Escuchar el repaso</a>` : ""}
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>`;
  // Se cierra como con «Cerrar», para que la página haga lo mismo de siempre (regresar el foco, etc.).
  const cerrar = () => { const x = dentro.querySelector("[data-cerrar]"); if (x) x.click(); else if (hoja.close) hoja.close(); };
  // Reservar pide un segundo sí: nada se apunta hasta que confirmas.
  for (const b of dentro.querySelectorAll("[data-pedir]")) b.addEventListener("click", () => {
    const tutor = b.dataset.pedir, acts = document.getElementById("clActs");
    acts.innerHTML = `<p class="clPregunta" id="clPreg" tabindex="-1">¿Le pido a Andrea que te reserve a <b>${esc(tutor)}</b>, ${esc(dia.toLowerCase() === "hoy" || dia.toLowerCase() === "mañana" ? dia.toLowerCase() : "el " + dia.charAt(0).toLowerCase() + dia.slice(1))}, de ${esc(hora12(e.ini))} a ${esc(hora12(fin(e)))}?</p>
      <fieldset class="clOpc"><legend>¿De qué hablan?</legend>
        ${Object.entries(ACTIVIDADES).map(([v, t], i) => `<label><input type="radio" name="clAct" value="${v}"${i === 0 ? " checked" : ""}> ${esc(t)}</label>`).join("")}
      </fieldset>
      ${sugerencia ? `<fieldset class="clOpc"><legend>Gramática</legend>
        <label><input type="checkbox" id="clGram" checked> Agregar la lección «${esc(sugerencia.titulo)}»${Number.isFinite(sugerencia.pct) ? ` (tu B2 más bajo, ${esc(Math.round(sugerencia.pct))} %)` : ""}</label>
      </fieldset>` : ""}
      <button type="button" class="ub grande" data-si>Sí, resérvala</button>
      <button type="button" class="ub" data-cerrar>No</button>`;
    document.getElementById("clPreg").focus();
    acts.querySelector("[data-si]").addEventListener("click", () => {
      const actividad = acts.querySelector("input[name='clAct']:checked")?.value === "conversacion" ? "conversacion" : "debate";
      const conGram = !!(sugerencia && acts.querySelector("#clGram")?.checked);
      A.apuntar({ t: "pedirClase", id: "pc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        cuando: new Date().toISOString(), inicio: e.ini.toISOString(), min: e.min, tutor, actividad, gramatica: conGram,
        leccion: conGram ? { tema: sugerencia.tema, titulo: sugerencia.titulo, url: sugerencia.url } : null });
      cerrar();
      repintarAhora();
    });
  });
  const cancelar = dentro.querySelector("[data-cancelar]");
  if (cancelar) cancelar.addEventListener("click", () => {
    A.apuntar({ t: "cancelarPedido", id: e.pedido.id, cuando: new Date().toISOString() });
    cerrar();
    repintarAhora();
  });
  for (const img of dentro.querySelectorAll("img[data-tutor]")) fotoEn(img, img.dataset.tutor);
  if (!hoja.hasAttribute("open")) { if (hoja.showModal) hoja.showModal(); else hoja.setAttribute("open", ""); }
  document.getElementById("hvT").focus({ preventScroll: true });
}
