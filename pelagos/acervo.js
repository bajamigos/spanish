// La lista de vocabulario · Tus podcasts: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=02005bcb89";
import * as A from "./almacen.js?v=02005bcb89";
import * as CL from "./clases.js?v=02005bcb89";
import * as PD from "./podcasts.js?v=02005bcb89";
import { E, ESCUCHA, P, colorTarjeta, conFondo, diaLargo, fondoDelDia, fotosVocab, guardado, guardar, info, ir, mazo, meta, pintar, poner, porId, recalcular, tarjetas, vestir } from "./app.js?v=02005bcb89";
import { pararRepaso, repaso } from "./tutoras.js?v=02005bcb89";
import { $, MESES, NIVELES, vista } from "./base.js?v=02005bcb89";
import { ancho, barra, cuando, entradas, esc, fecha, fechaCorta, marcas, pct, plural, titulo } from "./texto.js?v=02005bcb89";
import { fechaTip } from "./tendencias.js?v=02005bcb89";
import { cerrarHoja } from "./ayuda.js?v=02005bcb89";
import { MESES_CORTOS } from "./mapas.js?v=02005bcb89";

// ---------------------------------------------------------------- La lista de vocabulario

let adelanto = null; function fijarAdelanto(v) { adelanto = v; }          // la tanda de «Adelantar»: { dia, desde, ids }. Solo en esta página.
// El botón se escucha desde el documento: la página se puede volver a pintar sola (al guardar) y el botón cambia.

const TANDA = 300;            // cuántas palabras se pintan de un jalón
const ORDENES = [["fallo", "Falladas"], ["az", "A–Z"], ["toca", "Próximas"], ["nueva", "Nuevas"]];
let lvBusca = "";             // lo que escribiste en el buscador
let lvOrden = "fallo";
let lvAtascadas = false;      // el filtro «Atascadas» del Acervo
let lvCuantas = TANDA;
let lvAviso = null;           // la palabra que acabas de quitar, para poder deshacerlo

const paraBuscar = (texto) => N.sinAcentos(N.normalizar(texto));
const sinArticulo = (texto) => paraBuscar(texto).replace(/^(el|la|los|las|un|una|unos|unas)\s+/, "");
const alfabeto = (a, b) => sinArticulo(a.c.reverso).localeCompare(sinArticulo(b.c.reverso), "es");
const ORDENAR = {
  fallo: (a, b) => (a.pct === null) - (b.pct === null) || a.pct - b.pct || alfabeto(a, b),                    // las que más fallas primero; las que no has visto, al final
  az: alfabeto,
  toca: (a, b) => (!a.s.toca) - (!b.s.toca) || (a.s.toca < b.s.toca ? -1 : a.s.toca > b.s.toca ? 1 : 0) || alfabeto(a, b),
  // Por fecha de alta: las que agregaste más recién primero; las que no traen fecha, al final.
  nueva: (a, b) => (!a.c.agregada) - (!b.c.agregada) || (a.c.agregada > b.c.agregada ? -1 : a.c.agregada < b.c.agregada ? 1 : 0) || alfabeto(a, b),
};

/** Todas tus palabras, cada una con lo que le hayas corregido, su avance y su porcentaje de aciertos. */
function palabras() {
  return mazo().map((c) => { const s = E.tarjetas.get(c.id); return { id: c.id, c: N.tarjetaVista(c, s), s, pct: N.aciertoDeTarjeta(s) }; });
}

/** El ambiente de las fotos (Ajustes): «reef» o «limpio». Se guarda en este aparato. Expanse se juntó con Reef
 *  (pedido del 13-Oct-2026): quien lo tenía guardado ve Reef. */
function ambiente() {
  return guardado("pelagos.ambiente") === "limpio" ? "limpio" : "reef";
}
/** En Limpio, Pelagos no suena: ni tutoras, ni repasos, ni check-ins. Lo único con sonido es tu libro, que se abre en ElevenReader. */
const mudo = () => ambiente() === "limpio";
// El candado del silencio: en Limpio, ningún audio ni video de la página puede sonar, venga de donde venga.
{
  const tocar = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!mudo() || (this.dataset && this.dataset.podcast)) return tocar.call(this);    // tus podcasts sí suenan: los pides tú (24-Oct-2026)
    this.muted = true;
    if (this instanceof HTMLAudioElement) { this.pause(); return Promise.reject(new DOMException("Pelagos está en Limpio: sin sonido.", "NotAllowedError")); }
    return tocar.call(this);
  };
}
/** Calla todo lo que esté sonando (al pasar a Limpio). */
function callarTodo() {
  if (repaso) pararRepaso("");
  for (const m of document.querySelectorAll("audio, video")) { m.muted = true; if (m instanceof HTMLAudioElement) m.pause(); }
}
/** Las portadas del ambiente de este aparato. */
function juegoDeFotos() { const a = ambiente(); return a === "limpio" ? [] : a === "expanse" ? (P.fotosExpanse || []) : (P.fotos || []); }
/** La portada fija de una lección (es Reef); en Expanse, su pareja: la que ocupa el mismo lugar en el otro juego. */
function fotoDeLeccion(nombre) {
  if (ambiente() === "limpio") return null;
  if (!nombre || ambiente() !== "expanse") return nombre;
  const i = Math.max(0, (P.fotos || []).findIndex((f) => f.nombre === nombre)), lista = P.fotosExpanse;
  return lista[i % lista.length].nombre;
}

/**
 * La foto de una tarjeta de vocabulario: en Reef, la que tiene prestada (siempre la misma mientras la tarjeta toque
 * en los próximos 30 días; ver N.fotoDeTarjeta). Sin fotos de vocabulario, una portada Reef al azar. En Limpio, ninguna.
 * Las tarjetas llevan siempre foto fija, aunque el fondo en movimiento esté prendido.
 */
function fotoDeLaTarjeta(id, hoy, antes) {
  if (ambiente() === "limpio") return null;
  if (fotosVocab.size) {
    const r = N.fotoDeTarjeta(E, id, [...fotosVocab.keys()], hoy);
    if (!r.foto) return null;
    if (r.nueva) { A.apuntar({ t: "ftj", id: N.nuevoId("ft"), tarjeta: id, foto: r.foto, cuando: new Date().toISOString() }); recalcular(); }
    return { nombre: r.foto, vocab: true };
  }
  const juego = juegoDeFotos();
  return juego.length ? juego[Math.floor(N.azarDe(id + "#" + hoy + "#" + antes.n)() * juego.length)] : null;
}

/** Tus clases de Worldsacross, tres días a la vez (ver web/clases.js), con la misma cabeza que las otras materias. */
function verClases(o) {
  if (!o.conserva) CL.aHoy();
  // La lección que se sugiere al pedir una clase: tu tema B2 más bajo (regla del 13-Oct-2026: por ahora, B2).
  // Solo temas que siguen en el quiz: uno retirado (26-Oct-2026: «debe de haber», que en México suena raro) no se sugiere.
  const vivos = new Set((P.preguntas || []).filter((q) => q.estado === "revisada" && !(E && E.retiradas.has(q.id))).map((q) => q.tema));
  const b2 = (P.temas || []).filter((t) => t.nivel === "B2" && t.slug_kwiziq && vivos.has(t.id)).map((t) => ({ t, pct: info(t.id).pct }))
    .filter((x) => x.pct !== null && x.pct !== undefined).sort((a, b) => a.pct - b.pct)[0];
  CL.ponerSugerencia(b2 ? { tema: b2.t.id, titulo: b2.t.titulo || b2.t.titulo_kwiziq, pct: b2.pct, url: "https://spanish.kwiziq.com/revision/grammar/" + b2.t.slug_kwiziq } : null);
  // 23-Oct-2026: la misma cabeza que Gramática, Vocabulario y Escucha: la foto del día arriba y el título «Habla».
  const fondo = fondoDelDia();
  poner(`<div class="hoy clases${fondo.hay ? " confoto" : ""}">${fondo.html}<div class="sobre"><p class="secTitulo" role="heading" aria-level="2">Habla</p>${CL.htmlClases(A.clases(), new Date(), CL.pedidosDe(A.sucesos()), CL.pedidosHuecosDe(A.sucesos()), CL.limpiadoDe(A.sucesos()))}</div></div>`,
    { titulo: "Clases · Pelagos", nav: "inicio", conserva: o.conserva });
  CL.montar(vista, () => pintar({ conserva: true }));
}

/**
 * Tu gran total de horas de español (su «sí» del 14-Oct): lo de su hoja de Excel hasta el corte, más lo que Pelagos
 * cuenta solo desde el día siguiente: minutos de ElevenReader, clases de Worldsacross ya dadas, quizzes (10 min cada uno,
 * como en su hoja) y repasos de tarjetas (unos 4 segundos cada uno). Devuelve { horas, desde } o null.
 */
function granTotal() {
  const L = N.leerLectura(A.lectura());
  if (!L || !L.granTotal) return null;
  const corte = L.granTotal.corte, hoy = N.fechaLocal(new Date());
  const dias = new Map(L.dias);
  const T = N.leerTablero(A.tablero()), er = T && T.dia === hoy ? T.medidas.find((m) => ESCUCHA.test(m.nombre)) : null;
  if (er) dias.set(hoy, Math.max(dias.get(hoy) || 0, er.valor));
  for (const [d, x] of PD.escuchado().dias) dias.set(d, (dias.get(d) || 0) + x.min);
  let min = 0;
  for (const [d, m] of dias) if (d > corte) min += m;
  for (const [d, n] of E.actividadGram) if (d > corte) min += n * 10;
  for (const [d, n] of E.actividadVoc) if (d > corte) min += n * 0.06;
  const C = CL.leerClases(A.clases()), ahora = Date.now();
  if (C) for (const c of C.clases) if (N.fechaLocal(c.ini) > corte && (c.estado === "hecha" || c.ini.getTime() + c.min * 60000 <= ahora)) min += c.min;
  return { horas: L.granTotal.horas + min / 60, desde: L.granTotal.desde };
}

/** Minutos como «48 min» o «5 h 12 min». */
const horasMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? " " + (m % 60) + " min" : ""}` : m + " min");

/**
 * Lectura: tu registro de ElevenReader (su idea del 13-Oct-2026). Se llega tocando el cuadro ElevenReader del Tablero.
 * Arriba el libro que estás escuchando, con su portada; abajo tu estante. Cada libro abre ElevenReader en ese libro
 * (en el iPhone, la app). Los datos llegan en tablero/lectura.json, que escribe la tarea del Tablero; los minutos de hoy
 * los trae también el tablero del día, que se lee más seguido, y gana el número más alto.
 */
function verLectura(o, ejemplo = false) {
  const hoy = N.fechaLocal(new Date());
  const L = N.leerLectura(ejemplo ? lecturaDeEjemplo(hoy) : A.lectura()), T = ejemplo ? null : N.leerTablero(A.tablero());
  const meta = L ? L.meta : 60;
  const dias = new Map(L ? L.dias : []);
  const er = T && T.dia === hoy ? T.medidas.find((m) => ESCUCHA.test(m.nombre)) : null;
  if (er) dias.set(hoy, Math.max(dias.get(hoy) || 0, Math.round(er.valor)));
  if (!ejemplo) for (const [d, x] of PD.escuchado().dias) dias.set(d, (dias.get(d) || 0) + x.min);
  const libros = L ? L.libros : [];
  // «Leyendo ahora» es el de ElevenReader (se abre con un toque); los demás van a sus estantes.
  const ahora = libros.find((b) => b.estado === "leyendo" && b.url) || libros.find((b) => b.estado === "leyendo") || null;
  const resto = libros.filter((b) => b !== ahora);
  const portada = (b, clase) => b.portada
    ? `<img class="${clase}" src="${esc(b.portada)}" alt="Portada de ${esc(b.titulo)}" referrerpolicy="no-referrer">`
    : `<span class="${clase} sinPortada" aria-hidden="true">${esc(b.titulo)}</span>`;
  const abre = (b) => `href="${esc(b.url)}" target="_blank" rel="noopener"`;

  // Los últimos 14 días, del más viejo al de hoy.
  const d0 = new Date(), ultimos = [];
  for (let i = 13; i >= 0; i--) ultimos.push(N.fechaLocal(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - i)));
  const minHoy = dias.get(hoy) || 0;
  // Los podcasts en español de hoy (Pocket Casts), que ya vienen sumados en la Escucha.
  const pods = (T && T.dia === hoy ? T.podcasts : []).slice();
  const enPelagos = ejemplo ? null : PD.escuchado().dias.get(hoy);
  if (enPelagos) for (const [k, min] of enPelagos.programas) if (min > 0) pods.push({ programa: (PD.programa(k) || { nombre: k }).nombre + " (en Pelagos)", min });
  const podMin = pods.reduce((a, x) => a + x.min, 0);
  const podHoy = pods.length ? `<p class="lecturaHoy">Hoy escuchaste</p><ul class="podHoy">${pods.map((x) => `<li>${esc(x.programa)}: ${esc(horasMin(x.min))}</li>`).join("")}</ul>` : "";
  const lineaHoy = minHoy >= meta ? `Hoy: ${minHoy} de ${meta} min. Meta cumplida.` : `Hoy: ${minHoy} de ${meta} min. Te faltan ${meta - minHoy}.`;
  const semana = ultimos.slice(-7).map((d) => dias.get(d) || 0);
  const lineaSemana = `Últimos 7 días: ${semana.filter((m) => m >= meta).length} de 7 con la hora cumplida, ${horasMin(semana.reduce((a, b) => a + b, 0))} en total.`;

  const tarjetaAhora = ahora ? `
    <section class="card" id="leyendoAhora">
      <a class="libroAhora" ${abre(ahora)}>
        ${portada(ahora, "portadaGrande")}
        <span class="libroDatos">
          <span class="small">Leyendo ahora</span>
          <span class="libroTitulo">${esc(ahora.titulo)}</span>
          ${ahora.autor ? `<span class="small">${esc(ahora.autor)}</span>` : ""}
          ${ahora.falta ? `<span class="libroFalta">Te faltan ${esc(ahora.falta)}</span>` : ""}
          <span class="small">Tócalo para abrirlo en ElevenReader.</span>
        </span>
      </a>
    </section>` : "";
  // Los estantes (su pedido del 14-Oct: sus libros de antes, de su hoja de Excel, también con portada).
  const estrellas = (n) => (n ? `<span class="estrellas" aria-label="${n} de 5 estrellas">${"★".repeat(n)}</span>` : "");
  const pie = (b) => {
    const partes = [];
    if (b.estado === "terminado") partes.push("Terminado" + (b.terminado ? " el " + diaLargo(b.terminado) + (b.terminado.slice(0, 4) !== hoy.slice(0, 4) ? " de " + b.terminado.slice(0, 4) : "") : "") + (b.veces > 1 ? ` (${b.veces} veces)` : ""));
    else if (b.estado === "leyendo") partes.push(b.avance !== null ? `Vas en ${Math.round(b.avance * 100)} %` : b.falta ? "Faltan " + b.falta : "Leyendo");
    else if (b.estado === "abandonado") partes.push("Lo dejaste" + (b.avance ? ` en ${Math.round(b.avance * 100)} %` : ""));
    if (b.medio) partes.push(b.medio);
    return esc(partes.join(" · "));
  };
  const ficha = (b) => {
    const [ab, ci] = b.url ? [`<a class="libro" ${abre(b)}>`, "</a>"] : ['<div class="libro">', "</div>"];
    return `<li>${ab}${portada(b, "portadaChica")}<span class="libroTitulo">${esc(b.titulo)}</span>${b.autor ? `<span class="small">${esc(b.autor)}</span>` : ""}${estrellas(b.nota)}<span class="small">${pie(b)}</span>${ci}</li>`;
  };
  const leidos = resto.filter((b) => b.estado === "terminado")
    .map((b, i) => [b, i]).sort((x, y) => (y[0].terminado || "").localeCompare(x[0].terminado || "") || x[1] - y[1]).map((x) => x[0]);
  const paginas = leidos.reduce((t, b) => t + (b.paginas || 0) * b.veces, 0);
  const estanteDe = (id, titulo, lista, resumen = "") => lista.length ? `
    <section class="card estanteCard" id="${id}">
      <h2>${titulo}</h2>
      ${resumen ? `<p class="small">${esc(resumen)}</p>` : ""}
      <ul class="estante">${lista.map(ficha).join("")}</ul>
    </section>` : "";
  const estante =
    estanteDe("estLeyendo", "También leyendo", resto.filter((b) => b.estado === "leyendo")) +
    estanteDe("estante", "Leídos", leidos, `${plural(leidos.length, "libro terminado", "libros terminados")}${paginas ? ", " + paginas.toLocaleString("es-MX") + " páginas" : ""}.`) +
    estanteDe("estPendientes", "Por leer", resto.filter((b) => b.estado === "pendiente")) +
    estanteDe("estDejados", "Los que dejaste", resto.filter((b) => b.estado === "abandonado"));

  // ---- Las gráficas (su idea del 13-Oct): minutos por día, a qué hora escuchas y cuánto va de cada libro.
  // Cada una trae una frase que la resume y, al tocar una barra, el detalle en palabras.
  const tituloDe = new Map(libros.map((b) => [b.id, b.titulo]));
  const INI = ["D", "L", "M", "M", "J", "V", "S"];
  const porDia = ultimos.map((d) => {
    const [a, m, dd] = d.split("-").map(Number), v = dias.get(d) || 0, lib = L && L.libroDia.get(d);
    return { dia: d, corto: INI[new Date(a, m - 1, dd).getDay()], sub: String(dd), valor: v, hoy: d === hoy,
      detalle: `${mayuscula(diaLargo(d))}: ${v ? horasMin(v) : "nada"}${v && lib && tituloDe.has(lib) ? " (" + tituloDe.get(lib) + ")" : ""}${v >= meta ? ". Hora cumplida." : "."}` };
  });
  const total14 = porDia.reduce((a, b) => a + b.valor, 0);
  const mejor = porDia.reduce((a, b) => (b.valor > a.valor ? b : a), porDia[0]);
  const grafDias = graficaBarras({ id: "grafDias", titulo: "Minutos por día", barras: porDia, meta,
    resumen: total14 ? `En 14 días: ${horasMin(total14)}, ${plural(porDia.filter((b) => b.valor >= meta).length, "día", "días")} con la hora cumplida. Tu mejor día: ${diaLargo(mejor.dia)}, con ${horasMin(mejor.valor)}.` : "En 14 días todavía no hay minutos." });

  // «A qué hora escuchas» y «Por libro» se quitaron el 18-Oct-2026, a pedido suyo: queda solo «Minutos por día».

  // ---- Biblioteca (su «sí» del 14-Oct): tres botones arriba, Libros · Series · Podcasts, como los de la Bitácora.
  // Los libros son lo de siempre; las series y los podcasts vienen de su hoja de Excel, con sus carteles y portadas.
  if (!bibModo) fijarBibModo(["libros", "series", "podcasts"].includes(guardado("pelagos.biblioteca")) ? guardado("pelagos.biblioteca") : "libros");
  const modo = ejemplo ? "libros" : bibModo;
  const unDecimal = (h) => (Math.round(h * 10) / 10).toLocaleString("es-MX");
  // Una portada que no está en internet vive en la rama de avance (tablero/portadas/…) y se pone al terminar de pintar.
  const cartel = (x, clase) => /^portadas\/[a-z0-9-]+\.(jpg|png|webp)$/.test(x.portada || "")
    ? `<img class="${clase}" data-portadapriv="${esc(x.portada.slice(9))}" data-titulo="${esc(x.titulo)}" alt="${esc(x.titulo)}">`
    : x.portada
    ? `<img class="${clase}" src="${esc(x.portada)}" alt="${esc(x.titulo)}" referrerpolicy="no-referrer">`
    : `<span class="${clase} sinPortada" aria-hidden="true">${esc(x.titulo)}</span>`;
  const repisa = (id, titulo, lista, fichaDe, resumen = "") => lista.length ? `
    <section class="card estanteCard" id="${id}">
      <h2>${titulo}</h2>
      ${resumen ? `<p class="small">${esc(resumen)}</p>` : ""}
      <ul class="estante${id.startsWith("pod") ? " cuadrado" : ""}">${lista.map(fichaDe).join("")}</ul>
    </section>` : "";
  let cuerpo = "", cabeza = "";
  if (modo === "series") {
    // Tres pestañas (su pedido del 14-Oct): Por ver · Estrenos · Vistas. Tocar un estreno lo pasa a Por ver (y en Por ver, tocarlo lo regresa).
    if (!serModo) serModo = ["porver", "estrenos", "vistas"].includes(guardado("pelagos.series")) ? guardado("pelagos.series") : "estrenos";
    const S = L ? L.series : [], ES = L ? L.estrenos : [];
    const fichaS = (x) => `<li><div class="libro">${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span>` +
      `<span class="small">${esc(x.tipo)}${x.horas !== null ? " · " + unDecimal(x.horas) + " h" : ""}</span>${estrellas(x.nota)}${x.genero ? `<span class="small">${esc(x.genero)}</span>` : ""}</div></li>`;
    const fechaCorta = (d) => { const [, m, dd] = d.split("-").map(Number); return `${dd} de ${MESES[m - 1]}`; };
    // Tocar un cartel abre su ficha (sinopsis y botones); desde ahí se agrega o se quita de Por ver (su cambio del 14-Oct).
    const fichaE = (x, enPorVer) => `<li><button type="button" class="libro estreno" data-obra="${esc(x.obra)}" aria-haspopup="dialog" ` +
      `aria-label="${esc(x.titulo)}, ${esc(x.tipo.toLowerCase())}${x.fecha ? ", estreno del " + fechaCorta(x.fecha) : ""}${enPorVer ? ", en Por ver" : ""}. Ver ficha">` +
      `${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span><span class="small">${esc(x.tipo)}${x.fecha ? " · " + fechaCorta(x.fecha) : ""}</span></button></li>`;
    const vistas = S.filter((x) => x.estado === "terminado").map((x, i) => [x, i]).sort((a, b) => (b[0].nota || 0) - (a[0].nota || 0) || a[1] - b[1]).map((x) => x[0]);
    const elegidos = ES.filter((x) => E.porVer.has(x.obra)).sort((a, b) => (E.porVer.get(b.obra) || "").localeCompare(E.porVer.get(a.obra) || ""));
    const nuevos = ES.filter((x) => !E.porVer.has(x.obra));
    const porVerHoja = S.filter((x) => x.estado === "pendiente");
    const total = L && L.seriesHoras !== null ? L.seriesHoras : vistas.reduce((t, x) => t + (x.horas || 0), 0);
    const pestanas = `<div class="jump tres" role="group" aria-label="Qué series enseña" id="serModo">${[["porver", "Por ver"], ["estrenos", "Estrenos"], ["vistas", "Vistas"]]
      .map(([k, n]) => `<button type="button" data-ser="${k}" aria-pressed="${k === serModo}">${n}</button>`).join("")}</div>`;
    if (serModo === "estrenos") {
      cabeza = `${pestanas}<p class="small">Lo nuevo en español en Netflix México${L && L.estrenosDia ? ", al " + fechaCorta(L.estrenosDia) : ""}. Toca un cartel para ver de qué trata.</p>`;
      cuerpo = nuevos.length ? repisa("serEstrenos", "Estrenos", nuevos, (x) => fichaE(x, false)) : `<section class="card"><p class="small">${ES.length ? "Ya pasaste todos los estrenos a Por ver." : "Todavía no llegan los estrenos. La tarea del Tablero los trae una vez al día."}</p></section>`;
    } else if (serModo === "porver") {
      cabeza = `${pestanas}<p class="small">${plural(elegidos.length + porVerHoja.length, "pendiente", "pendientes")}.</p>`;
      cuerpo = repisa("serElegidos", "De los estrenos", elegidos, (x) => fichaE(x, true)) + repisa("serPorVer", "De tu lista", porVerHoja, fichaS) +
        (elegidos.length + porVerHoja.length ? "" : `<section class="card"><p class="small">Nada por ver. Abre un estreno y agrégalo desde su ficha.</p></section>`);
    } else {
      cabeza = `${pestanas}<p class="lecturaHoy">${unDecimal(total)} horas de series y películas.</p><p class="small">${plural(vistas.length, "vista", "vistas")}, de la mejor a la peor.</p>`;
      cuerpo = repisa("serViendo", "Viendo", S.filter((x) => x.estado === "viendo"), fichaS) + repisa("serVistas", "Vistas", vistas, fichaS) +
        repisa("serDejadas", "Las que dejaste", S.filter((x) => x.estado === "abandonado"), fichaS);
    }
  } else if (modo === "podcasts") {
    const Pd = L ? L.podcasts : [];
    const fichaP = (x) => `<li><div class="libro">${cartel(x, "portadaChica")}<span class="libroTitulo">${esc(x.titulo)}</span></div></li>`;
    cabeza = `${podHoy}<p class="lecturaHoy">${L && L.podcastsHoras !== null ? L.podcastsHoras.toLocaleString("es-MX") + " horas de podcasts." : "Tus podcasts."}</p><p class="small">${plural(Pd.length, "podcast", "podcasts")}, por tus estrellas.</p>`;
    // Minutos de podcasts por día (su pedido del 25-Oct-2026), los mismos 14 días que la de los libros:
    // Pocket Casts (de tu tablero) más lo que escuchas aquí en Pelagos.
    const pc = A.podcastsPorDia(), dentro = ejemplo ? new Map() : PD.escuchado().dias;
    const porDiaPod = ultimos.map((d) => {
      const [a, m, dd] = d.split("-").map(Number);
      const deFuera = new Map(((pc[d] || {}).programas || []).map((x) => [x.programa, x.min]));
      if (d === hoy && T && T.dia === hoy) for (const x of T.podcasts || []) deFuera.set(x.programa, Math.max(deFuera.get(x.programa) || 0, x.min));
      const progs = [...deFuera.entries()].filter(([, v]) => v > 0);
      const aqui = dentro.get(d);
      if (aqui) for (const [k, v] of aqui.programas) if (v > 0) progs.push([(PD.programa(k) || { nombre: k }).nombre + " (en Pelagos)", v]);
      const v = Math.round(progs.reduce((x, [, y]) => x + y, 0));
      return { dia: d, corto: INI[new Date(a, m - 1, dd).getDay()], sub: String(dd), valor: v, hoy: d === hoy,
        detalle: `${mayuscula(diaLargo(d))}: ${v ? horasMin(v) : "nada"}${progs.length ? " (" + progs.map(([n, y]) => `${n}, ${horasMin(Math.round(y))}`).join("; ") + ")" : ""}.` };
    });
    const totalPod = porDiaPod.reduce((a, b) => a + b.valor, 0);
    const mejorPod = porDiaPod.reduce((a, b) => (b.valor > a.valor ? b : a), porDiaPod[0]);
    const grafPod = graficaBarras({ id: "grafPod", titulo: "Minutos de podcasts por día", barras: porDiaPod,
      resumen: totalPod ? `En 14 días: ${horasMin(totalPod)} de podcasts en español. Tu mejor día: ${diaLargo(mejorPod.dia)}, con ${horasMin(mejorPod.valor)}.` : "En 14 días todavía no hay minutos de podcasts." });
    cuerpo = grafPod + [3, 2, 1].map((n) => repisa("pod" + n, `${"★".repeat(n)} <span class="sr">${plural(n, "estrella", "estrellas")}</span>`, Pd.filter((x) => x.nota === n), fichaP)).join("") +
      repisa("podSin", "Sin estrellas", Pd.filter((x) => !x.nota), fichaP);
  } else {
    cabeza = `<p class="lecturaHoy">${esc(lineaHoy)}</p>${podMin ? `<p class="small">De eso, ${esc(horasMin(podMin))} de podcasts en español.</p>` : ""}<p class="small">${esc(lineaSemana)}</p>`;
    cuerpo = tarjetaAhora + grafDias + estante;
  }
  const fondo = fondoDelDia();
  poner(`
  <div class="hoy lectura${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      <p class="secTitulo" role="heading" aria-level="2">Escucha</p>
      ${ejemplo ? "" : `<div class="jump tres sec" role="group" aria-label="Qué enseña la Biblioteca" id="bibModo">
        ${[["libros", "Libros"], ["series", "Series"], ["podcasts", "Podcasts"]].map(([clave, nombre]) => `<button type="button" data-bib="${clave}" aria-pressed="${clave === modo}">${nombre}</button>`).join("")}
      </div>`}
      ${modo === "podcasts" && !ejemplo ? seccionPodcasts() : ""}
      <section class="card" id="lecturaCabeza">
        <h1 class="h">Biblioteca</h1>
        ${ejemplo ? `<p class="lecturaEjemplo">Datos inventados, solo para ver cómo se ve. <a href="#/lectura">Volver a tus datos</a></p>` : ""}
        ${cabeza}
      </section>
      ${L || modo === "podcasts" ? cuerpo : `<section class="card"><p class="small">Todavía no llega tu registro de lectura. La tarea del Tablero lo trae en su próxima pasada.</p></section>`}
    </div>
  </div>`, { titulo: "Biblioteca · Pelagos", nav: "inicio", conserva: o.conserva });
  vista.querySelector("#serModo")?.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-ser]");
    if (!b || b.dataset.ser === serModo) return;
    serModo = b.dataset.ser; guardar("pelagos.series", serModo);
    verLectura({ conserva: true });
    vista.querySelector(`[data-ser="${serModo}"]`)?.focus();
  });
  for (const b of vista.querySelectorAll("[data-obra]")) b.addEventListener("click", () => abrirObra(b.dataset.obra));
  for (const img of vista.querySelectorAll("img[data-portadapriv]")) A.fotoPortada(img.dataset.portadapriv).then((u) => {
    if (!img.isConnected) return;
    if (u) img.src = u;
    else img.replaceWith(Object.assign(document.createElement("span"), { className: img.className + " sinPortada", textContent: img.dataset.titulo || "" }));
  });
  const botones = vista.querySelector("#bibModo");
  if (botones) botones.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-bib]");
    if (!b || b.dataset.bib === bibModo) return;
    fijarBibModo(b.dataset.bib); guardar("pelagos.biblioteca", bibModo);
    verLectura({ conserva: true });
    vista.querySelector(`[data-bib="${bibModo}"]`)?.focus();
  });
  // Tocar (o enfocar) una barra dice su detalle en el renglón de abajo de la gráfica.
  for (const g of vista.querySelectorAll(".grafica")) {
    const decir = (ev) => {
      const b = ev.target.closest && ev.target.closest(".hit");
      if (!b) return;
      for (const x of g.querySelectorAll(".hit.activa")) x.classList.remove("activa");
      b.classList.add("activa");
      g.querySelector(".grafDetalle").textContent = b.getAttribute("aria-label");
    };
    g.addEventListener("click", decir);
    g.addEventListener("focusin", decir);
  }
}

/** La ficha de un estreno: su cartel, de qué trata y los botones para pasarlo a Por ver (o quitarlo) y buscarlo en Netflix. */
function abrirObra(obra, aviso = "") {
  const L = N.leerLectura(A.lectura()), x = L && L.estrenos.find((e) => e.obra === obra);
  if (!x) return;
  const enPorVer = E.porVer.has(obra);
  const [, m, d] = (x.fecha || "--").split("-").map(Number);
  hojaV.querySelectorAll(".hvFondo").forEach((n) => n.remove());
  hojaV.classList.remove("conFoto");
  $("hvIn").innerHTML = `
    <div class="obraFicha">
      ${x.portada ? `<img class="obraCartel" src="${esc(x.portada)}" alt="Cartel de ${esc(x.titulo)}" referrerpolicy="no-referrer">` : ""}
      <h2 id="hvT" tabindex="-1">${esc(x.titulo)}</h2>
      <p class="small">${[x.tipo, x.generos, x.duracion, x.fecha ? "estreno del " + d + " de " + MESES[m - 1] : ""].filter(Boolean).map(esc).join(" · ")}</p>
      ${x.sinopsis ? `<p class="obraSinopsis">${esc(x.sinopsis)}</p>` : ""}
      <p class="small" id="obraAviso" role="status">${esc(aviso)}</p>
    </div>
    <div class="acts">
      <button type="button" class="ub grande" data-porver aria-pressed="${enPorVer}">${enPorVer ? "Quitar de Por ver" : "Agregar a Por ver"}</button>
      <a class="ub" href="https://www.netflix.com/search?q=${encodeURIComponent(x.titulo)}" target="_blank" rel="noopener noreferrer">Buscar en Netflix</a>
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>`;
  hojaV.querySelector("[data-porver]").addEventListener("click", () => {
    A.apuntar({ t: "porver", id: N.nuevoId("pv"), obra, ...(enPorVer ? { quitar: 1 } : {}), cuando: new Date().toISOString() });
    recalcular();
    verLectura({ conserva: true });
    abrirObra(obra, enPorVer ? "Lo quitaste de Por ver." : "Listo: está en Por ver.");
    hojaV.querySelector("[data-porver]").focus();
  });
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  if (!aviso) $("hvT").focus({ preventScroll: true });
}

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------------------------------------------------------------- Tus podcasts (24-Oct-2026)
/** Minutos de podcast escuchados en Pelagos ese día (enteros o a medias, de todos tus aparatos). */
const podMinDe = (dia) => { const x = PD.escuchado().dias.get(dia); return x ? x.min : 0; };
const mmss = (s) => {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`;
};
const minutosDichos = (s) => { const m = Math.round((s || 0) / 60); return m >= 60 ? horasMin(m) : m + " min"; };
let podProg = null, podDeshacer = null;
/** Quita un episodio de tu lista: se va con su animación y queda «Deshacer» un rato. */
function quitarEp(id) {
  const c = PD.episodios(), ep = c && c.eps.find((e) => e.id === id);
  if (!ep) return;
  PD.quitar(id);
  podDeshacer = { id, titulo: ep.titulo, cuando: Date.now() };
  const l = $("podLista");
  if (l) l.innerHTML = listaPodcasts();
  $("podDeshacer")?.focus();
  setTimeout(() => { if (podDeshacer && Date.now() - podDeshacer.cuando >= 9500) { podDeshacer = null; const x = $("podDeshacer"); if (x) x.closest(".podDeshacer").remove(); } }, 10000);
}
function fechaEp(ms) {
  if (!ms) return "";
  const d = N.fechaLocal(new Date(ms)), hoy = N.fechaLocal(new Date());
  if (d === hoy) return "hoy";
  const ayer = N.fechaLocal(new Date(Date.now() - 864e5));
  return d === ayer ? "ayer" : fechaTip(d, hoy);
}
/** Cómo vas en un episodio: «Nuevo», «Vas en 12 de 48 min» o «Escuchado». */
function estadoEp(ep) {
  const p = PD.posicion(ep.id);
  if (!p || (!p.fin && p.pos < 30)) return { texto: "Nuevo", clase: "nuevo" };
  if (p.fin) return { texto: "Escuchado", clase: "visto" };
  const dur = p.dur || ep.dur;
  return { texto: dur ? `Vas en ${Math.round(p.pos / 60)} de ${Math.round(dur / 60)} min` : `Vas en ${Math.round(p.pos / 60)} min`, clase: "medias" };
}
function filaEp(ep) {
  const pr = PD.programa(ep.prog), est = estadoEp(ep), cur = PD.cargado(), es = cur && cur.id === ep.id, suena = es && PD.sonando();
  const datos = [pr ? pr.nombre : "", fechaEp(ep.fecha), ep.dur ? minutosDichos(ep.dur) : ""].filter(Boolean).join(" · ");
  return `<li class="podFila" data-podfila="${esc(ep.id)}"><button type="button" class="podEp${es ? " actual" : ""}" data-podep="${esc(ep.id)}" aria-pressed="${suena}"
      aria-label="${esc((suena ? "Pausar: " : es ? "Seguir: " : "Escuchar: ") + ep.titulo + ". " + datos + ". " + est.texto + ".")}">
    ${pr ? `<img class="podPortada" src="${esc(pr.portada)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ""}
    <span class="podDatos"><span class="podTit">${esc(ep.titulo)}</span><span class="small">${esc(datos)}</span>
      <span class="podEstado ${est.clase}">${suena ? "Sonando" : es ? "En pausa · " + esc(est.texto) : esc(est.texto)}</span></span>
  </button><button type="button" class="podQuita" data-podquita="${esc(ep.id)}" aria-label="${esc("Quitar de tu lista: " + ep.titulo)}">✕</button></li>`;
}
function listaPodcasts() {
  const c = PD.episodios();
  if (!c) return `<p class="small">Leyendo tus podcasts…</p>`;
  if (!podProg) podProg = guardado("pelagos.podprog") || "todos";
  // «Tu lista»: solo lo nuevo, menos lo que quitaste (no se rellena con viejos). Por programa: sus episodios recientes, menos los quitados.
  const eps = podProg === "todos" ? PD.miLista(c.eps) : c.eps.filter((e) => e.prog === podProg && !PD.quitado(e.id));
  const deshacer = podDeshacer ? `<p class="podDeshacer" role="status">Quitaste «${esc(podDeshacer.titulo)}». <button type="button" class="lk" id="podDeshacer">Deshacer</button></p>` : "";
  return deshacer + (eps.length ? `<ul class="podLista" data-noswipe>${eps.map(filaEp).join("")}</ul>`
    : `<p class="small">${podProg === "todos" ? "Tu lista está vacía. Los episodios nuevos aparecen aquí en cuanto se publiquen." : "No hay episodios de este programa en tu lista."}</p>`);
}
function estadoPodcasts() {
  const c = PD.episodios();
  if (!c) return "";
  const hace = Math.round((Date.now() - c.cuando) / 60000);
  const falla = c.fallaron && c.fallaron.length ? ` No se pudo leer: ${c.fallaron.map((k) => (PD.programa(k) || { nombre: k }).nombre).join(", ")}.` : "";
  return `Actualizado ${hace < 1 ? "ahorita" : "hace " + horasMin(hace)}.${falla}`;
}
function seccionPodcasts() {
  if (!podProg) podProg = guardado("pelagos.podprog") || "todos";
  PD.actualizar().then(() => { const l = $("podLista"); if (l) { l.innerHTML = listaPodcasts(); const e = $("podAct"); if (e) e.textContent = estadoPodcasts(); } }).catch(() => {});
  return `<section class="card" id="podNuevos" aria-labelledby="podT">
    <h2 id="podT">Escucha aquí</h2>
    <p class="small">Tu lista de episodios nuevos. Tócalo para escucharlo; sigue donde te quedaste, también en el otro aparato. Desliza uno de lado (o toca su ✕) para quitarlo: no se rellena con viejos, solo llegan los que se publiquen. Lo que escuches, entero o a medias, suma a tu Escucha.</p>
    <label class="small" for="podProg">Programa</label>
    <select id="podProg" class="campo podSel">
      <option value="todos"${podProg === "todos" ? " selected" : ""}>Todos, lo más nuevo</option>
      ${PD.PROGRAMAS.map((p) => `<option value="${p.clave}"${podProg === p.clave ? " selected" : ""}>${esc(p.nombre)}</option>`).join("")}
    </select>
    <div id="podLista">${listaPodcasts()}</div>
    <p class="small" id="podAct">${esc(estadoPodcasts())}</p>
    <div class="go"><button type="button" class="ub" id="podLeer">Buscar episodios nuevos</button></div>
  </section>`;
}

// Deslizar un episodio a la izquierda (o a la derecha) lo quita de tu lista, como en Pocket Casts.
{
  let fila = null, x0 = 0, y0 = 0, dx = 0, moviendo = false;
  vista.addEventListener("pointerdown", (ev) => {
    const f = ev.target instanceof Element ? ev.target.closest(".podFila") : null;
    if (!f || ev.pointerType === "mouse" || ev.target.closest(".podQuita")) return;
    fila = f; x0 = ev.clientX; y0 = ev.clientY; dx = 0; moviendo = false;
  });
  vista.addEventListener("pointermove", (ev) => {
    if (!fila) return;
    const ddx = ev.clientX - x0, ddy = ev.clientY - y0;
    if (!moviendo) {
      if (Math.abs(ddy) > 12 && Math.abs(ddy) > Math.abs(ddx)) { fila = null; return; }      // va para arriba o abajo: es scroll
      if (Math.abs(ddx) < 14) return;
      moviendo = true; fila.classList.add("deslizando");
    }
    dx = ddx;
    const b = fila.querySelector(".podEp");
    b.style.transform = `translateX(${dx}px)`;
    b.style.opacity = String(Math.max(0.25, 1 - Math.abs(dx) / 300));
    fila.classList.toggle("listo", Math.abs(dx) > fila.offsetWidth * 0.35);
  });
  const soltar = () => {
    if (!fila) return;
    const f = fila; fila = null;
    if (!moviendo) return;
    const b = f.querySelector(".podEp");
    if (Math.abs(dx) > f.offsetWidth * 0.35) {
      b.style.transform = `translateX(${dx < 0 ? -f.offsetWidth : f.offsetWidth}px)`;
      b.style.opacity = "0";
      setTimeout(() => quitarEp(f.dataset.podfila), 180);
    } else { b.style.transform = ""; b.style.opacity = ""; f.classList.remove("deslizando", "listo"); }
    // El toque que suelta el deslizado no cuenta como «escuchar».
    const tragar = (e) => { e.stopPropagation(); e.preventDefault(); };
    f.addEventListener("click", tragar, { capture: true, once: true });
    setTimeout(() => f.removeEventListener("click", tragar, { capture: true }), 400);
  };
  vista.addEventListener("pointerup", soltar);
  vista.addEventListener("pointercancel", () => { if (fila) { const b = fila.querySelector(".podEp"); b.style.transform = ""; b.style.opacity = ""; fila.classList.remove("deslizando", "listo"); fila = null; } });
}

// El reproductor (su elección del 24-Oct-2026): el «gordito» de rueda, negro en modo oscuro y plata en claro.
// Abajo de cada página va una barra delgada (portada, título, play); al tocarla sube el aparato como hoja, encima
// de la página. La rueda: −15 a la izquierda, +30 a la derecha, la velocidad arriba, ☰ abajo (tu lista en la misma
// pantallita) y en medio play/pausa. Se baja deslizando hacia abajo, tocando afuera o con Escape.
let podBarra = null, podHoja = null, podClaveLista = "", podVistaLista = false, podSel = 0;
const velTexto = (v) => (Number.isInteger(v * 10) ? v.toFixed(1) : String(v)) + "×";
function armarBarra() {
  const d = document.createElement("div");
  d.className = "podMini"; d.id = "podBarra"; d.hidden = true;
  d.setAttribute("role", "region"); d.setAttribute("aria-label", "Reproductor de podcasts");
  d.innerHTML = `
    <button type="button" class="podAbrir"><img class="podMiniCov" alt="" referrerpolicy="no-referrer">
      <span class="podMiniTxt"><span class="podBarraTit"></span><span class="podBarraProg"></span></span></button>
    <button type="button" class="podPlay" aria-label="Pausa"></button>
    <button type="button" class="podX" aria-label="Cerrar el reproductor">✕</button>`;
  document.body.appendChild(d);
  d.querySelector(".podAbrir").addEventListener("click", abrirPodHoja);
  d.querySelector(".podPlay").addEventListener("click", () => (PD.sonando() ? PD.pausa() : PD.seguir()));
  d.querySelector(".podX").addEventListener("click", () => { cerrarHojaPod(); PD.cerrar(); });

  const h = document.createElement("div");
  h.className = "podHoja"; h.id = "podHoja"; h.hidden = true;
  h.setAttribute("role", "dialog"); h.setAttribute("aria-modal", "true"); h.setAttribute("aria-label", "Reproductor");
  h.innerHTML = `
    <div class="podVelo"></div>
    <div class="podPanel">
      <button type="button" class="podAgarra" aria-label="Bajar el reproductor"></button>
      <div class="podAp">
        <div class="podPant">
          <div class="podPantBarra"><span class="podEstadoTxt"></span><span class="podVelTxt"></span><span class="podPila" aria-hidden="true"></span></div>
          <div class="podVSonando">
            <div class="podPantFila"><img class="podPantCov" alt="" referrerpolicy="no-referrer">
              <div class="podPantTxt"><b class="podPantTit"></b><span class="podPantProg"></span></div></div>
            <input type="range" class="podRango" min="0" max="1" step="1" value="0" aria-label="Dónde vas">
            <div class="podPantT"><span class="podPos">0:00</span><span class="podFalta"></span></div>
            <p class="podError" role="alert" hidden>No se pudo cargar este episodio.</p>
          </div>
          <div class="podVLista" hidden><div class="podPantLista" role="listbox" aria-label="Tu lista"></div></div>
        </div>
        <div class="podRueda">
          <button type="button" class="podVel" aria-label="Velocidad"></button>
          <button type="button" class="podAtras" aria-label="Atrás 15 segundos">−15</button>
          <button type="button" class="podAdelante" aria-label="Adelante 30 segundos">+30</button>
          <button type="button" class="podMenu" aria-label="Tu lista">☰</button>
          <button type="button" class="podCentro" aria-label="Pausa"></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(h);
  podHoja = h;
  h.querySelector(".podVelo").addEventListener("click", cerrarHojaPod);
  h.querySelector(".podAgarra").addEventListener("click", cerrarHojaPod);
  h.querySelector(".podAtras").addEventListener("click", () => PD.saltar(-15));
  h.querySelector(".podAdelante").addEventListener("click", () => PD.saltar(30));
  h.querySelector(".podVel").addEventListener("click", () => PD.cambiarVelocidad());
  h.querySelector(".podMenu").addEventListener("click", () => { podVistaLista = !podVistaLista; podSel = 0; pintarBarra(); if (podVistaLista) h.querySelector(".podFilaL.sel")?.focus(); });
  h.querySelector(".podCentro").addEventListener("click", () => {
    if (podVistaLista) { const ep = listaDeLaHoja()[podSel]; if (ep) { PD.tocar(ep); podVistaLista = false; pintarBarra(); } return; }
    if (PD.sonando()) PD.pausa(); else PD.seguir();
  });
  h.querySelector(".podPantLista").addEventListener("click", (ev) => {
    const f = ev.target instanceof Element ? ev.target.closest("[data-podi]") : null;
    if (!f) return;
    const ep = listaDeLaHoja()[Number(f.dataset.podi)];
    if (ep) { PD.tocar(ep); podVistaLista = false; pintarBarra(); }
  });
  const r = h.querySelector(".podRango");
  r.addEventListener("input", () => { r.dataset.moviendo = "1"; h.querySelector(".podPos").textContent = mmss(Number(r.value)); });
  r.addEventListener("change", () => { delete r.dataset.moviendo; PD.ir(Number(r.value)); });
  h.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { ev.preventDefault(); cerrarHojaPod(); }
    else if (podVistaLista && (ev.key === "ArrowDown" || ev.key === "ArrowUp")) { ev.preventDefault(); moverSel(ev.key === "ArrowDown" ? 1 : -1); }
  });
  // Girar la rueda (con el dedo o el ratón) sube y baja por tu lista, como en el aparato de verdad.
  const rueda = h.querySelector(".podRueda");
  let ang0 = null, acum = 0;
  const angulo = (ev) => { const b = rueda.getBoundingClientRect(); return Math.atan2(ev.clientY - (b.top + b.height / 2), ev.clientX - (b.left + b.width / 2)) * 180 / Math.PI; };
  rueda.addEventListener("pointerdown", (ev) => { if (!podVistaLista || (ev.target instanceof Element && ev.target.closest(".podCentro"))) return; ang0 = angulo(ev); acum = 0; });
  rueda.addEventListener("pointermove", (ev) => {
    if (ang0 === null) return;
    let d = angulo(ev) - ang0; if (d > 180) d -= 360; if (d < -180) d += 360;
    ang0 = angulo(ev); acum += d;
    while (Math.abs(acum) >= 28) { moverSel(acum > 0 ? 1 : -1); acum -= Math.sign(acum) * 28; rueda.dataset.giro = "1"; }
  });
  const soltar = () => { ang0 = null; setTimeout(() => { delete rueda.dataset.giro; }, 0); };
  rueda.addEventListener("pointerup", soltar); rueda.addEventListener("pointercancel", soltar);
  rueda.addEventListener("click", (ev) => { if (rueda.dataset.giro) { ev.stopPropagation(); ev.preventDefault(); } }, true);
  // Deslizar el panel hacia abajo lo baja.
  const panel = h.querySelector(".podPanel");
  let y0 = null, dy = 0;
  panel.addEventListener("pointerdown", (ev) => { if (ev.target instanceof Element && ev.target.closest(".podRueda, .podRango, .podPantLista")) return; y0 = ev.clientY; dy = 0; });
  panel.addEventListener("pointermove", (ev) => { if (y0 === null) return; dy = Math.max(0, ev.clientY - y0); panel.style.transform = dy ? `translateY(${dy}px)` : ""; });
  const fin = () => { if (y0 === null) return; y0 = null; panel.style.transform = ""; if (dy > 90) cerrarHojaPod(); };
  panel.addEventListener("pointerup", fin); panel.addEventListener("pointercancel", fin);
  return d;
}
function listaDeLaHoja() { const c = PD.episodios(); return c ? PD.miLista(c.eps).slice(0, 40) : []; }
function moverSel(paso) {
  const n = listaDeLaHoja().length;
  if (!n) return;
  podSel = Math.max(0, Math.min(n - 1, podSel + paso));
  pintarListaHoja();
  const f = podHoja.querySelector(".podFilaL.sel");
  if (f) { f.scrollIntoView({ block: "nearest" }); f.focus(); }
}
function pintarListaHoja() {
  const l = podHoja.querySelector(".podPantLista"), cur = PD.cargado();
  const eps = listaDeLaHoja();
  const corto = (s) => (s >= 3600 ? Math.round(s / 3600) + "h" : Math.round(s / 60) + "'");
  l.innerHTML = eps.length ? eps.map((e, i) => {
    const pr = PD.programa(e.prog);
    return `<button type="button" role="option" aria-selected="${i === podSel}" class="podFilaL${i === podSel ? " sel" : ""}" data-podi="${i}"><span>${cur && cur.id === e.id ? "▶ " : ""}${esc(pr ? pr.nombre : "")} · ${esc(e.titulo)}</span><span>${e.dur ? corto(e.dur) : ""}</span></button>`;
  }).join("") : `<p class="podVacia">Tu lista está vacía.</p>`;
}
function abrirPodHoja() {
  if (!podHoja || !PD.cargado()) return;
  podVistaLista = false;
  podHoja.hidden = false;
  document.body.classList.add("conHoja");
  requestAnimationFrame(() => podHoja.classList.add("abierta"));
  pintarBarra();
  podHoja.querySelector(".podCentro").focus();
}
function cerrarHojaPod() {
  if (!podHoja || podHoja.hidden) return;
  podHoja.classList.remove("abierta");
  document.body.classList.remove("conHoja");
  setTimeout(() => { if (!podHoja.classList.contains("abierta")) podHoja.hidden = true; }, 220);
  podBarra?.querySelector(".podAbrir")?.focus();
}
function pintarBarra() {
  const ep = PD.cargado();
  if (!podBarra) { if (!ep) return; podBarra = armarBarra(); }
  podBarra.hidden = !ep;
  document.body.classList.toggle("conPod", !!ep);
  // La lista de episodios de la página se vuelve a pintar solo cuando cambia qué suena (no a cada segundo).
  const clave = ep ? ep.id + "|" + PD.sonando() : "";
  if (clave !== podClaveLista) {
    podClaveLista = clave;
    const l = $("podLista");
    if (l) {
      const foco = document.activeElement instanceof HTMLElement && document.activeElement.dataset.podep;
      l.innerHTML = listaPodcasts();
      if (foco) l.querySelector(`[data-podep="${CSS.escape(foco)}"]`)?.focus();
    }
    if (podVistaLista) pintarListaHoja();
  }
  if (!ep) { cerrarHojaPod(); return; }
  const pr = PD.programa(ep.prog), { pos, dur } = PD.tiempo(), suena = PD.sonando();
  for (const img of [podBarra.querySelector(".podMiniCov"), podHoja.querySelector(".podPantCov")]) if (pr && img.getAttribute("src") !== pr.portada) img.src = pr.portada;
  podBarra.querySelector(".podBarraTit").textContent = ep.titulo;
  podBarra.querySelector(".podBarraProg").textContent = (pr ? pr.nombre : "") + (dur ? " · faltan " + minutosDichos(dur - pos) : "");
  podBarra.querySelector(".podAbrir").setAttribute("aria-label", "Abrir el reproductor: " + ep.titulo);
  const icono = suena ? "❚❚" : "▶";
  for (const b of [podBarra.querySelector(".podPlay"), podHoja.querySelector(".podCentro")]) { b.textContent = icono; b.setAttribute("aria-label", suena ? "Pausa" : "Seguir"); }
  // La pantallita.
  podHoja.querySelector(".podEstadoTxt").textContent = podVistaLista ? "☰ TU LISTA" : (suena ? "❚❚ SONANDO" : "▶ EN PAUSA");
  podHoja.querySelector(".podVelTxt").textContent = podVistaLista ? `${Math.min(podSel + 1, listaDeLaHoja().length)} de ${listaDeLaHoja().length}` : velTexto(PD.vel());
  podHoja.querySelector(".podVSonando").hidden = podVistaLista;
  podHoja.querySelector(".podVLista").hidden = !podVistaLista;
  if (podVistaLista && !podHoja.querySelector(".podFilaL")) pintarListaHoja();
  podHoja.querySelector(".podPantTit").textContent = ep.titulo;
  podHoja.querySelector(".podPantProg").textContent = pr ? pr.nombre : "";
  const r = podHoja.querySelector(".podRango");
  if (!r.dataset.moviendo) {
    r.max = String(Math.max(1, Math.round(dur)));
    r.value = String(Math.round(pos));
    r.style.setProperty("--lleno", (dur ? Math.min(100, (pos / dur) * 100) : 0).toFixed(1) + "%");
    r.setAttribute("aria-valuetext", `${minutosDichos(pos)} de ${minutosDichos(dur)}`);
    podHoja.querySelector(".podPos").textContent = mmss(pos);
  }
  podHoja.querySelector(".podFalta").textContent = dur ? "−" + mmss(dur - pos) : "";
  podHoja.querySelector(".podVel").textContent = velTexto(PD.vel());
  podHoja.querySelector(".podVel").setAttribute("aria-label", "Velocidad: " + velTexto(PD.vel()) + ". Toca para cambiarla.");
  podHoja.querySelector(".podError").hidden = !PD.fallo();
}

let bibModo = null, serModo = null; function fijarBibModo(v) { bibModo = v; }      // qué enseña la Biblioteca: libros, series o podcasts (se recuerda en este aparato)

/**
 * Una gráfica de barras sencilla en SVG: una sola serie, sin colores que digan nada más que «minutos».
 * La línea punteada es la meta. Cada barra se puede tocar o enfocar (su detalle se dice abajo) y hay una tabla para lectores de pantalla.
 */
function graficaBarras({ id, titulo, resumen, barras, meta = null }) {
  const W = 340, H = 180, izq = 30, der = 4, arriba = 14, abajo = 30;
  const n = barras.length, paso = (W - izq - der) / n, ancho = Math.max(3, paso - 2);
  const maxV = Math.max(meta || 0, ...barras.map((b) => b.valor), 1);
  const div = maxV > 180 ? 60 : maxV > 60 ? 30 : 10, tope = Math.ceil(maxV / div) * div;
  const y = (v) => arriba + (H - arriba - abajo) * (1 - v / tope), base = y(0);
  const r1 = (v) => Math.round(v * 10) / 10;
  const marcas = barras.map((b, i) => {
    const x = izq + i * paso + (paso - ancho) / 2, top = y(b.valor), alto = base - top, r = Math.min(4, ancho / 2, alto);
    const forma = b.valor > 0 ? `<path class="barraG" d="M${r1(x)} ${r1(base)}V${r1(top + r)}Q${r1(x)} ${r1(top)} ${r1(x + r)} ${r1(top)}H${r1(x + ancho - r)}Q${r1(x + ancho)} ${r1(top)} ${r1(x + ancho)} ${r1(top + r)}V${r1(base)}Z"/>` : "";
    const cx = r1(izq + i * paso + paso / 2);
    return `${forma}<text class="ejeG${b.hoy ? " hoyG" : ""}" x="${cx}" y="${H - abajo + 13}" text-anchor="middle">${esc(b.corto)}</text>${b.sub ? `<text class="ejeG sub${b.hoy ? " hoyG" : ""}" x="${cx}" y="${H - abajo + 25}" text-anchor="middle">${esc(b.sub)}</text>` : ""}` +
      `<rect class="hit" x="${r1(izq + i * paso)}" y="${arriba}" width="${r1(paso)}" height="${r1(base - arriba)}" tabindex="0" role="button" aria-label="${esc(b.detalle)}"/>`;
  }).join("");
  const lineaMeta = meta ? `<line class="metaG" x1="${izq}" x2="${W - der}" y1="${r1(y(meta))}" y2="${r1(y(meta))}"/><text class="ejeG" x="${izq - 4}" y="${r1(y(meta)) + 4}" text-anchor="end">${meta}</text>` : "";
  const ejes = `<line class="baseG" x1="${izq}" x2="${W - der}" y1="${r1(base)}" y2="${r1(base)}"/><text class="ejeG" x="${izq - 4}" y="${r1(base) + 4}" text-anchor="end">0</text>` +
    (tope !== meta ? `<text class="ejeG" x="${izq - 4}" y="${arriba + 4}" text-anchor="end">${tope}</text><line class="guiaG" x1="${izq}" x2="${W - der}" y1="${arriba}" y2="${arriba}"/>` : "");
  return `
    <section class="card grafica" id="${id}">
      <h2>${esc(titulo)}</h2>
      <p class="small">${esc(resumen)}</p>
      <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(titulo)}, en minutos">${ejes}${lineaMeta}${marcas}</svg>
      <p class="small grafDetalle" role="status">Toca una barra para ver el detalle.</p>
    </section>`;
}

/**
 * Datos inventados para ver la página Lectura llena (su pedido del 14-Oct-2026). Cuentan su semana como él la contó:
 * la semana pasada, de lunes a viernes, El despertar del Leviatán de 8 a 4, a ratos (y lo terminó el domingo);
 * esta semana, el lunes empezó La guerra de Calibán. Las fechas se acomodan a la semana de hoy.
 */
function lecturaDeEjemplo(hoy) {
  const [a, m, d] = hoy.split("-").map(Number), h0 = new Date(a, m - 1, d);
  const lunes = new Date(a, m - 1, d - ((h0.getDay() + 6) % 7));
  const dia = (k) => N.fechaLocal(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + k));
  const LEV = "u:BiCFwSqEjKjg0tXUxqkr", CAL = "u:a8e4UoY51nZ8QwhXlIt9";
  const P = (id, v) => `https://storage.googleapis.com/eleven-public-cdn/database/reader_customers/ljEp3KNMeuTpAGEeIxGpXpPOJfs2/read/u%3A${id.slice(2)}/thumbnail.webp?v=${v}`;
  // A ratos de 8 a 4: minutos por hora, de lunes a viernes de la semana pasada; el fin de semana, de noche.
  const ratos = [
    { 8: 25, 9: 40, 10: 15, 11: 35, 12: 10, 13: 30, 14: 20, 15: 35 },
    { 8: 10, 9: 30, 10: 45, 12: 20, 13: 25, 14: 40, 15: 15 },
    { 8: 35, 9: 45, 10: 50, 11: 25, 12: 15, 13: 20, 14: 30, 15: 20 },
    { 8: 20, 9: 15, 10: 40, 11: 30, 13: 35, 15: 25 },
    { 8: 30, 9: 40, 10: 35, 11: 20, 12: 25, 13: 30, 14: 30, 15: 20 },
    { 19: 30, 20: 40 },
    { 18: 15, 19: 35, 20: 25 },
  ];
  const horas = {}, dias = {}, libroDia = {};
  ratos.forEach((hs, k) => { const f = dia(k - 7); horas[f] = hs; dias[f] = Object.values(hs).reduce((x, y) => x + y, 0); libroDia[f] = LEV; });
  // Esta semana: el lunes empezó Calibán (16 min en la noche); el martes, 46 en la mañana y 14 en la noche.
  const esta = [{ 21: 16 }, { 9: 46, 20: 14 }];
  esta.forEach((hs, k) => { const f = dia(k); if (f > hoy) return; horas[f] = hs; dias[f] = Object.values(hs).reduce((x, y) => x + y, 0); libroDia[f] = CAL; });
  return { version: 1, meta: 60, dias, horas, libroDia, libros: [
    { titulo: "La guerra de Calibán (Chingón)", autor: "James S. A. Corey", url: "https://elevenreader.io/reader/library/" + CAL, portada: P(CAL, "1791158807"), falta: "19 h 14 min", estado: "leyendo" },
    { titulo: "Amos Illustrated El despertar del Leviatán", autor: "James S. A. Corey", url: "https://elevenreader.io/reader/library/" + LEV, portada: P(LEV, "1791158815"), estado: "terminado", terminado: dia(-1) },
  ] };
}

/** La portada del día: cambia cada día. */
function portadaDelDia() {
  const hoy = new Date(), lista = juegoDeFotos();
  return lista.length ? lista[Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 86400000) % lista.length].nombre : null;
}

/** Cuándo toca una palabra, en pocas palabras. */
/** En qué escalón va un tema de gramática (el repaso tipo Leitner) y cuándo vuelve a tocar. */
function escalonDeTema(i) {
  if (!i || !i.toca) return "";
  const e = Math.max(0, Math.min(N.ESCALONES.length - 1, i.escalon | 0)), dias = N.ESCALONES[e];
  return `Escalón ${e + 1} de ${N.ESCALONES.length} (cada ${plural(dias, "día", "días")}) · ${cuandoToca(i, N.fechaLocal(new Date()))}`;
}
function cuandoToca(s, hoy) {
  if (s.quitada) return "Quitada";
  if (!s.toca) return "Sin ver";
  if (s.toca < hoy) return "Tocaba el " + fechaCorta(s.toca);
  if (s.toca === hoy) return "Toca hoy";
  return s.toca === N.sumarDias(hoy, 1) ? "Toca mañana" : "Toca el " + fechaCorta(s.toca);
}

/**
 * Todo tu vocabulario a la vista, como el mapa: un cuadro por palabra, solo en español, y el color dice qué tan
 * seguido la aciertas. Se puede buscar y ordenar. Al tocar una palabra sube su ficha.
 */
function verLista(o) {
  if (!o.conserva) { lvBusca = ""; lvCuantas = TANDA; lvAviso = null; }
  const hoy = N.fechaLocal(new Date());
  const todas = palabras();
  const vivas = todas.filter((x) => !x.s.quitada), quitadas = todas.filter((x) => x.s.quitada).sort(alfabeto);
  const cuenta = [0, 0, 0, 0, 0, 0];
  let sinVer = 0;
  for (const x of vivas) { const k = colorTarjeta(x); if (k === null) sinVer++; else cuenta[k]++; }
  const tocan = N.tarjetasDelDia(P, E, hoy).pendientes.length;
  const atasTj = N.tarjetasAtascadas(E, hoy);
  const nAtas = vivas.filter((x) => atasTj.has(x.id)).length;
  if (!nAtas) lvAtascadas = false;
  const fondo = fondoDelDia();
  const abiertas = !!vista.querySelector("#lvQuitadas[open]");
  poner(`
  <div class="hoy mapa lista${fondo.hay ? " confoto" : ""}">
    ${fondo.html}
    <div class="sobre">
      ${entradas("vocabulario", "lista")}
      <section class="card" id="lvCabeza">
        <h1 class="h">Acervo</h1>
        <p>${plural(vivas.length, "palabra", "palabras")}. ${tocan === 0 ? "Hoy no queda ninguna por repasar." : tocan === 1 ? "Hoy queda 1 por repasar." : `Hoy quedan ${tocan} por repasar.`}</p>
        <label class="sr" for="lvBusca">Buscar una palabra</label>
        <input id="lvBusca" class="campo" type="search" placeholder="Buscar una palabra" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
        <div class="jump cuatro" role="group" aria-label="En qué orden salen">${ORDENES.map(([clave, nombre]) => `<button type="button" data-orden="${clave}" aria-pressed="${clave === lvOrden}">${nombre}</button>`).join("")}</div>
        <div class="jump uno"><button type="button" id="lvAtas" aria-pressed="${lvAtascadas}"${nAtas ? "" : " disabled"}>Atascadas (${nAtas})</button></div>
        ${!lvAviso || lvAviso.nueva ? "" : `<p class="small" id="lvAviso" role="status">Quitaste «${esc(lvAviso.texto)}». <button type="button" class="lk" id="lvDeshacer">Deshacer</button></p>`}
      </section>
      <section class="card" id="lvLista">
        <h2 class="sr">Tus palabras</h2>
        <p class="small" id="lvCuenta" role="status"></p>
        <div class="lvCeldas" id="lvCeldas"></div>
        <div class="go"><button type="button" class="ub" id="lvMas" hidden></button></div>
      </section>
      <section class="card" id="clave">
        <h2 class="sr">Qué significa cada color</h2>
        <p class="small">El color es el peldaño de la palabra: cada cuánto te toca repasarla. Son los mismos puntitos del quiz.</p>
        <ul class="clave">${N.PELDANOS.map((nombre, i) => `<li><i class="mc k${i}"></i><span>${nombre}</span><b>${cuenta[i]}</b></li>`).join("")}<li><i class="mc kx"></i><span>Sin ver</span><b>${sinVer}</b></li></ul>
      </section>
      ${quitadas.length ? `
      <details class="card cat" id="lvQuitadas"${abiertas ? " open" : ""}>
        <summary><span class="cn">Quitadas</span><span class="cc">${plural(quitadas.length, "palabra", "palabras")}. Ya no salen en tu quiz.</span></summary>
        <div class="links">${quitadas.map((x) => `<button type="button" class="tb" data-devolver="${esc(x.id)}"><span class="nm ancho" lang="es-MX">${esc(x.c.reverso)}</span><span class="pc">Devolver</span><span class="sm ancho" lang="en">${esc(x.c.frente)}</span></button>`).join("")}</div>
      </details>` : ""}
    </div>
  </div>`,
  { titulo: "Acervo · Pelagos", nav: "vocabulario", conserva: o.conserva });

  const campo = $("lvBusca");
  campo.value = lvBusca;
  function celdas() {
    const q = paraBuscar(lvBusca);
    const base = lvAtascadas ? vivas.filter((x) => atasTj.has(x.id)) : vivas;
    const salen = (q ? base.filter((x) => [x.c.reverso, x.c.frente].some((t) => paraBuscar(t).includes(q))) : base.slice()).sort(ORDENAR[lvOrden] || alfabeto);
    $("lvCeldas").innerHTML = salen.slice(0, lvCuantas).map((x) => {
      const f = colorTarjeta(x);
      const atas = atasTj.has(x.id);
      return `<button type="button" class="vc ${f === null ? "kx" : "k" + f}${atas ? " atas" : ""}" data-v="${esc(x.id)}" lang="es-MX" aria-label="${esc(x.c.reverso)}: ${f === null ? "sin ver" : `peldaño ${f + 1}, ${x.pct === null ? "sin aciertos todavía" : pct(x.pct) + " de aciertos"}`}${atas ? ", atascada" : ""}">${esc(x.c.reverso)}</button>`;
    }).join("");
    $("lvCuenta").textContent = !vivas.length ? "Todavía no hay palabras en tu vocabulario."
      : q ? (salen.length ? `${salen.length} de ${vivas.length} con «${lvBusca.trim()}».` : `Ninguna palabra con «${lvBusca.trim()}».`)
        : lvAtascadas ? `${plural(salen.length, "palabra atascada", "palabras atascadas")}: las fallaste en ${N.ATASCADO_FALLOS} quizzes distintos en ${N.ATASCADO_DIAS} días. Toca una para editarla, seguir así o quitarla.`
        : "Toca una palabra para ver su traducción y cómo te ha ido con ella.";
    $("lvMas").hidden = salen.length <= lvCuantas;
    $("lvMas").textContent = `Ver más (faltan ${salen.length - lvCuantas})`;
  }
  celdas();
  campo.addEventListener("input", () => { lvBusca = campo.value; lvCuantas = TANDA; celdas(); });
  campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") campo.blur(); });       // en el teléfono, «Buscar» guarda el teclado
  $("lvMas").addEventListener("click", () => { lvCuantas += TANDA; celdas(); });
  for (const b of vista.querySelectorAll("[data-orden]")) {
    b.addEventListener("click", () => {
      lvOrden = b.dataset.orden; lvCuantas = TANDA;
      for (const otro of vista.querySelectorAll("[data-orden]")) otro.setAttribute("aria-pressed", String(otro === b));
      celdas();
    });
  }
  $("lvAtas").addEventListener("click", () => { lvAtascadas = !lvAtascadas; lvCuantas = TANDA; $("lvAtas").setAttribute("aria-pressed", String(lvAtascadas)); celdas(); });
  for (const b of vista.querySelectorAll("[data-devolver]")) b.addEventListener("click", () => quitarPalabra(b.dataset.devolver, false));
  if ($("lvDeshacer")) $("lvDeshacer").addEventListener("click", () => quitarPalabra(lvAviso.id, false));
}

/** Quita una palabra de tu vocabulario, o la devuelve. No se borra nada: tu historial con ella se queda guardado. */
function quitarPalabra(id, quitar) {
  const c = tarjetas.get(id);
  if (!c) return;
  A.apuntar({ t: "tjq", id: N.nuevoId("q"), tarjeta: id, cuando: new Date().toISOString(), quitar: quitar ? 1 : 0 });
  recalcular();
  lvAviso = quitar ? { id, texto: N.tarjetaVista(c, E.tarjetas.get(id)).reverso } : null;
  cerrarHoja();
  pintar({ conserva: true });
}

/** Los dos renglones de una palabra (español e inglés), para corregirla o para agregar una nueva. */
// Editar una tarjeta (opción 3, 15-Oct-2026): un lápiz junto a cada renglón. Tocas el lápiz del español o del inglés,
// ese renglón se vuelve una caja, y «Listo» guarda solo ese renglón (un suceso «tje»). El porcentaje y el peldaño no cambian.
const ICONO_LAPIZ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const NOMBRE_CAMPO = { reverso: "el español", frente: "el inglés" };
/** Un renglón de la tarjeta con su lápiz. «etiqueta» es el elemento del texto (h1, h2, span); «otros», sus atributos. */
function renglonConLapiz(campo, texto, etiqueta, clase, otros = "") {
  const lang = campo === "reverso" ? "es-MX" : "en";
  return `<div class="conLapiz" data-campo="${campo}"><${etiqueta} class="${clase}" lang="${lang}"${otros}>${esc(texto)}</${etiqueta}><button type="button" class="lapiz" data-lapiz="${campo}" aria-label="Editar ${NOMBRE_CAMPO[campo]}">${ICONO_LAPIZ}</button></div>`;
}
/** Conecta los lápices de «raiz». Al guardar llama a «listo(campo, texto)» después de apuntar el cambio. */
function activarLapices(raiz, id, listo) {
  for (const b of raiz.querySelectorAll("[data-lapiz]")) b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const fila = b.closest(".conLapiz"), campo = b.dataset.lapiz, texto = fila.firstElementChild;
    if (fila.querySelector("form")) return;
    const antes = texto.textContent;
    const forma = document.createElement("form");
    forma.className = "lapizForma"; forma.autocomplete = "off";
    forma.innerHTML = `<label class="sr" for="lz-${campo}">Corrige ${NOMBRE_CAMPO[campo]}</label>
      <input id="lz-${campo}" class="campo" type="text" lang="${campo === "reverso" ? "es" : "en"}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <div class="lapizBotones"><button type="submit" class="ub">Listo</button><button type="button" class="ub" data-x aria-label="Cancelar">${ICONO_X}</button></div>
      <p class="err" role="alert" hidden></p>`;
    const caja = forma.querySelector("input");
    caja.value = antes;
    texto.hidden = true; b.hidden = true;
    fila.append(forma);
    caja.focus(); caja.select();
    const cerrar = () => { forma.remove(); texto.hidden = false; b.hidden = false; b.focus({ preventScroll: true }); };
    forma.querySelector("[data-x]").addEventListener("click", (e) => { e.stopPropagation(); cerrar(); });
    caja.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } });
    forma.addEventListener("click", (e) => e.stopPropagation());
    forma.addEventListener("submit", (e) => {
      e.preventDefault();
      const nuevo = caja.value.replace(/\s+/g, " ").trim();
      if (!nuevo) { const err = forma.querySelector(".err"); err.hidden = false; err.textContent = "Escribe algo o toca la equis."; return; }
      if (nuevo !== antes) {
        A.apuntar({ t: "tje", id: N.nuevoId("e"), tarjeta: id, cuando: new Date().toISOString(), [campo]: nuevo });
        recalcular();
        texto.textContent = nuevo;
      }
      cerrar();
      listo(campo, nuevo);
    });
  });
}

function formaPalabra(c, escondida) {
  return `
    <form id="hvForma" class="forma" autocomplete="off"${escondida ? " hidden" : ""}>
      <label class="small" for="hvEs">En español</label>
      <input id="hvEs" class="campo" type="text" lang="es" value="${esc(c.reverso || "")}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <label class="small" for="hvEn">En inglés</label>
      <input id="hvEn" class="campo" type="text" lang="en" value="${esc(c.frente || "")}" autocapitalize="off" autocorrect="off" spellcheck="false">
      <p class="err" id="hvError" role="alert" hidden></p>
      <div class="go"><button type="button" class="ub" id="hvCancelar">Cancelar</button><button type="submit" class="ub grande">Guardar</button></div>
    </form>`;
}
/** Lo que hay escrito en la forma, ya limpio; null (y un aviso) si le falta el español o el inglés. */
function leerForma() {
  const limpio = (t) => t.replace(/\s+/g, " ").trim();
  const reverso = limpio($("hvEs").value), frente = limpio($("hvEn").value);
  if (!reverso || !frente) { $("hvError").hidden = false; $("hvError").textContent = "Le falta el español o el inglés."; return null; }
  return { reverso, frente };
}

let agAviso = null;            // la palabra que acabas de agregar, para decirlo en la página

// El acordeón de una clase (clases.js) agrega sus palabras clave a tu acervo con «+», igual que Agregar.

/** Agregar (Vocabulario): una palabra a mano. Es un renglón más de tu avance, y entra a tu quiz como palabra nueva. */
function verAgregar(o) {
  if (!o.conserva) agAviso = null;
  poner(conFondo(`
  ${entradas("vocabulario", "agregar")}
  <section class="card" id="agCard">
    <h1 class="h">Agregar una palabra</h1>
    <p>En español y en inglés. Entra a tu quiz como palabra nueva y se queda en tu acervo.</p>
    ${formaPalabra({}, false)}
    ${agAviso ? `<p class="small" id="agAviso" role="status">Agregaste «${esc(agAviso)}». Va a salir en tu quiz como palabra nueva.</p>` : ""}
  </section>`), { titulo: "Agregar · Pelagos", nav: "vocabulario", conserva: o.conserva });
  $("hvCancelar").textContent = "Borrar";
  $("hvCancelar").addEventListener("click", () => { $("hvEs").value = ""; $("hvEn").value = ""; $("hvError").hidden = true; $("hvEs").focus(); });
  $("hvForma").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = leerForma();
    if (!f) return;
    if (palabras().some((x) => !x.s.quitada && paraBuscar(x.c.reverso) === paraBuscar(f.reverso))) { $("hvError").hidden = false; $("hvError").textContent = "Esa palabra ya está en tu vocabulario."; return; }
    A.apuntar({ t: "tjn", id: N.nuevoId("n"), tarjeta: N.nuevoId("tm"), cuando: new Date().toISOString(), frente: f.frente, reverso: f.reverso });
    recalcular();
    agAviso = f.reverso;
    lvAviso = null;
    pintar({ conserva: true });
    if ($("hvEs")) $("hvEs").focus();         // lista para la siguiente
  });
}

// La ficha de una palabra: sube desde abajo, como la vista previa de un tema.
const hojaV = $("hojaV");
const REPASOS_A_LA_VISTA = 26;

// La hoja de una palabra lleva de fondo la foto de Reef de esa tarjeta (la misma del quiz).
// Una tarjeta quitada solo enseña la foto que ya tenía; no se le presta una nueva.
function ponerFondoPalabra(id, s, hoy) {
  hojaV.querySelectorAll(".hvFondo").forEach((x) => x.remove());
  hojaV.classList.remove("conFoto");
  if (ambiente() === "limpio") return;
  let foto = null;
  if (s.quitada) {
    const p = E.fotosTarjeta && E.fotosTarjeta.get(id);
    if (p && fotosVocab.has(p.foto)) foto = { nombre: p.foto, vocab: true };
  } else foto = fotoDeLaTarjeta(id, hoy, { n: 0 });
  if (!foto) return;
  const capa = document.createElement("div");
  capa.className = "hvFondo";
  capa.setAttribute("aria-hidden", "true");
  capa.innerHTML = `<img data-foto="${esc(foto.nombre)}"${foto.vocab ? ' data-vocab="1"' : ""} alt="">`;
  hojaV.prepend(capa);
  hojaV.classList.add("conFoto");
}

function abrirPalabra(id) {
  const cruda = tarjetas.get(id), s = E && E.tarjetas.get(id);
  if (!cruda || !s) return;
  const c = N.tarjetaVista(cruda, s), v = N.aciertoDeTarjeta(s), hoy = N.fechaLocal(new Date());
  const atasF = N.tarjetasAtascadas(E, hoy).get(id);
  const n = s.baseN + s.n, bien = s.baseBien + s.bien;
  const ultimos = s.historia.slice(-REPASOS_A_LA_VISTA);
  const buenos = ultimos.filter((h) => h.bien).length;
  // Cada repaso es una barrita, del más viejo al más nuevo: alta si la supiste, bajita si no.
  const grafica = !ultimos.length ? "" : `
    <figure class="hvG">
      <svg width="${ultimos.length * 11 - 3}" height="40" viewBox="0 0 ${ultimos.length * 11 - 3} 40" role="img" aria-label="${ultimos.length === 1 ? "Tu último repaso" : `Tus últimos ${ultimos.length} repasos`}: ${buenos} bien y ${ultimos.length - buenos} mal">${ultimos.map((h, i) =>
        h.bien ? `<rect class="gb" x="${i * 11}" y="2" width="8" height="38" rx="2"/>` : `<rect class="gm" x="${i * 11}" y="27" width="8" height="13" rx="2"/>`).join("")}</svg>
      <figcaption class="small">${ultimos.length === 1 ? "Tu último repaso" : `Tus últimos ${ultimos.length} repasos, del más viejo al más nuevo`}. Barra alta: bien. Barra bajita: mal.</figcaption>
    </figure>`;
  const serieV = N.historiaTarjeta(s, hoy);
  const datos = [
    ["Próximo repaso", s.quitada ? "Ninguno: la quitaste" : !s.toca ? "Todavía no la has visto" : s.toca < hoy ? "Atrasado: tocaba el " + fechaCorta(s.toca)
      : s.toca === hoy ? "Hoy" : s.toca === N.sumarDias(hoy, 1) ? "Mañana" : "El " + fechaCorta(s.toca)],
    s.toca && !s.quitada ? ["La ves cada", plural(N.ESCALONES[s.escalon], "día", "días")] : null,
    s.ultima ? ["Última vez", cuando(s.ultima)] : null,
    c.agregada ? ["Agregada", "El " + fechaCorta(c.agregada)] : null,
    s.n ? ["En Pelagos", `${plural(s.n, "repaso", "repasos")}, ${s.bien} bien`] : null,
    s.baseN ? ["Antes de Pelagos", `${plural(s.baseN, "repaso", "repasos")}, ${s.baseBien} bien`] : null,
  ].filter(Boolean);
  $("hvIn").innerHTML = `
    <span class="k">Vocabulario · ${esc(cuandoToca(s, hoy))}</span>
    ${atasF ? `<div class="atasAviso" role="note"><p>Atascada: la fallaste en ${atasF.fallos} quizzes distintos en los últimos ${atasF.dias} días. Corrígela con el lápiz, pártela en dos o quítala. Se destraba al editarla, al acertarla ${N.ACIERTOS_PARA_SALIR} veces seguidas en días distintos o con «Seguir así».</p><div class="go"><button type="button" class="ub" id="hvSeguir">Seguir así</button></div></div>` : ""}
    <ul class="exs"><li class="ex">${renglonConLapiz("reverso", c.reverso, "h2", "es", ' id="hvT" tabindex="-1"')}${renglonConLapiz("frente", c.frente, "span", "en")}</li></ul>
    <div class="sc"><span>Aciertos: ${v === null ? "todavía sin datos" : `${pct(v)} · ${bien} de ${n}`}</span>${v === null ? "" : barra(v)}</div>
    ${grafica}
    <div class="hvLinea">${htmlGrafica(serieV, "gV", c.reverso, false)}</div>
    <dl class="hvDatos">${datos.map(([k, t]) => `<div><dt>${k}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl>
    <div class="acts" id="hvActos">
      ${s.quitada ? '<button type="button" class="ub" id="hvDevolver">Devolver</button>' : '<button type="button" class="ub" id="hvQuitar">Quitar</button>'}
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>
    <p id="hvSeguro" hidden>¿La quito de tu vocabulario? Ya no sale en tu quiz. <button type="button" class="lk" id="hvSi">Sí, quítala</button> · <button type="button" class="lk" id="hvNo">No</button></p>`;
  ponerFondoPalabra(id, s, hoy);
  vestir(hojaV);
  activarGrafica(serieV, "gV");
  activarLapices($("hvIn"), id, () => pintar({ conserva: true }));
  if ($("hvQuitar")) $("hvQuitar").addEventListener("click", () => { $("hvSeguro").hidden = false; $("hvNo").focus(); });
  if ($("hvDevolver")) $("hvDevolver").addEventListener("click", () => quitarPalabra(id, false));
  $("hvNo").addEventListener("click", () => { $("hvSeguro").hidden = true; });
  if ($("hvSeguir")) $("hvSeguir").addEventListener("click", () => {
    A.apuntar({ t: "destrabar", id: N.nuevoId("b"), tarjeta: id, como: "seguir", cuando: new Date().toISOString() });
    recalcular();
    pintar({ conserva: true });
    abrirPalabra(id);
  });
  $("hvSi").addEventListener("click", () => quitarPalabra(id, true));
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}

// Las gráficas de porcentaje por día (nivel, tema y palabra): una línea con un marcador que se mueve con el dedo o las flechas.
const diaCorto = (d) => `${Number(d.slice(8, 10))} ${MESES_CORTOS[Number(d.slice(5, 7)) - 1]}`;
const GW = 320, GH = 210, GIZ = 36, GDE = 14, GAR = 14, GAB = 30, GAN = GW - GIZ - GDE, GAL = GH - GAR - GAB;
/** El HTML de la gráfica. «pre» distingue las piezas de cada gráfica (pueden estar dos hojas abiertas). */
function htmlGrafica(serie, pre, nombre, conMeta = true) {
  if (serie.every((p) => p.pct === null)) return `<p class="small">La gráfica de tu porcentaje por día aparece cuando haya datos.</p>`;
  const xs = (i) => serie.length === 1 ? GIZ + GAN / 2 : GIZ + (i * GAN) / (serie.length - 1);
  const ys = (v) => GAR + GAL - (Math.max(0, Math.min(100, v)) / 100) * GAL;
  const puntos = serie.map((p, i) => (p.pct === null ? null : [xs(i), ys(p.pct)]));
  let trazo = "", abierta = false;       // la línea se corta donde no hay dato
  for (const p of puntos) { if (!p) { abierta = false; continue; } trazo += `${abierta ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; abierta = true; }
  const paso = Math.max(1, Math.ceil(serie.length / 6)), ult = serie.length - 1;
  const etiquetas = serie.map((p, i) => (i % paso === 0 || i === ult) && !(i !== ult && ult - i < paso)
    ? `<text class="gx" x="${xs(i).toFixed(1)}" y="${GH - 10}" text-anchor="${serie.length > 1 && i === ult ? "end" : serie.length > 1 && i === 0 ? "start" : "middle"}">${diaCorto(p.dia)}</text>` : "").join("");
  const rejilla = [0, 25, 50, 75, 100].map((v) => `<line class="gr" x1="${GIZ}" x2="${GW - GDE}" y1="${ys(v)}" y2="${ys(v)}"/><text class="gy" x="${GIZ - 6}" y="${ys(v) + 4}" text-anchor="end">${v}</text>`).join("");
  const m = meta();
  return `
    <p class="gLee" id="${pre}Lee" aria-live="polite"></p>
    <svg class="ggraf" id="${pre}Svg" viewBox="0 0 ${GW} ${GH}" role="img" tabindex="0" aria-label="Gráfica de línea: ${esc(nombre)}, porcentaje por día. Usa las flechas para moverte de día.">
      ${rejilla}
      ${conMeta ? `<line class="gmeta" x1="${GIZ}" x2="${GW - GDE}" y1="${ys(m)}" y2="${ys(m)}"/><text class="gmt" x="${GW - GDE}" y="${ys(m) - 5}" text-anchor="end">meta ${m}%</text>` : ""}
      ${etiquetas}
      <path class="gl" d="${trazo}"/>
      ${puntos.map((p) => (p ? `<circle class="gp" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2"/>` : "")).join("")}
      <line class="gt" id="${pre}Tv" y1="${GAR}" y2="${GAR + GAL}"/>
      <circle class="gtp" id="${pre}Tp" r="6"/>
    </svg>
    <p class="small">${serie.length === 1 ? "La gráfica empieza hoy: cada día que pase se agrega un punto. " : ""}Toca la línea para ver el porcentaje exacto de cada día.${conMeta ? " La raya punteada es tu meta." : ""}</p>
    <ul class="sr">${serie.map((p) => `<li>${esc(fechaCorta(p.dia))}: ${esc(pct(p.pct))}</li>`).join("")}</ul>`;
}
/** Le da vida a una gráfica ya puesta: el marcador empieza en hoy. */
function activarGrafica(serie, pre) {
  const svg = $(pre + "Svg");
  if (!svg) return;
  const hoy = N.fechaLocal(new Date());
  const xs = (i) => serie.length === 1 ? GIZ + GAN / 2 : GIZ + (i * GAN) / (serie.length - 1);
  const ys = (v) => GAR + GAL - (Math.max(0, Math.min(100, v)) / 100) * GAL;
  let actual = serie.length - 1;
  const marcar = (i) => {
    actual = Math.max(0, Math.min(serie.length - 1, i));
    const p = serie[actual], x = xs(actual);
    $(pre + "Tv").setAttribute("x1", x); $(pre + "Tv").setAttribute("x2", x);
    const tp = $(pre + "Tp");
    if (p.pct === null) tp.setAttribute("visibility", "hidden");
    else { tp.setAttribute("visibility", "visible"); tp.setAttribute("cx", x); tp.setAttribute("cy", ys(p.pct)); }
    $(pre + "Lee").textContent = `${p.dia === hoy ? "Hoy" : fecha(p.dia).replace(/ de \d{4}$/, "")}: ${pct(p.pct)}`;
  };
  const tocar = (ev) => {
    const r = svg.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * GW;
    marcar(serie.length === 1 ? 0 : Math.round(((x - GIZ) / GAN) * (serie.length - 1)));
  };
  svg.addEventListener("pointerdown", (ev) => { tocar(ev); svg.setPointerCapture?.(ev.pointerId); });
  svg.addEventListener("pointermove", (ev) => { if (ev.buttons || ev.pointerType === "mouse") tocar(ev); });
  svg.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowLeft") { marcar(actual - 1); ev.preventDefault(); }
    else if (ev.key === "ArrowRight") { marcar(actual + 1); ev.preventDefault(); }
  });
  marcar(serie.length - 1);
}

// La gráfica de un tema, desde su lección.
function abrirGraficaTema(id) {
  const t = porId.get(Number(id));
  if (!t) return;
  const serie = N.historiaTemas(P, A.sucesos(), [t.id], N.fechaLocal(new Date()));
  $("hvIn").innerHTML = `
    <span class="k">Lección · ${esc(t.nivel)}</span>
    <h2 id="hvT" tabindex="-1">${esc(titulo(t))}</h2>
    ${htmlGrafica(serie, "gL", titulo(t))}
    <div class="acts"><button type="button" class="ub" data-cerrar>Cerrar</button></div>`;
  activarGrafica(serie, "gL");
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}

// La gráfica de un nivel: su promedio al cierre de cada día, desde el día en que la pidió.
function abrirGrafica(nivel) {
  const serie = N.historiaNivel(P, A.sucesos(), nivel, N.fechaLocal(new Date()));
  $("hvIn").innerHTML = `
    <span class="k">Atlas · ${esc(NIVELES[nivel])}</span>
    <h2 id="hvT" tabindex="-1"><span class="lv">${nivel}</span> Tu porcentaje, día por día</h2>
    ${htmlGrafica(serie, "gN", "nivel " + nivel)}
    <div class="acts"><button type="button" class="ub" data-cerrar>Cerrar</button></div>`;
  activarGrafica(serie, "gN");
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}

/** Lo que antes se conectaba al cargar app.js; app.js lo llama en el mismo lugar, para que el orden no cambie. */
function conectarAcervo() {
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest || !ev.target.closest("#tjAdelantar")) return;
    const hoy = N.fechaLocal(new Date()), ids = N.tarjetasAdelante(P, E, hoy);
    if (!ids.length) return;
    fijarAdelanto({ dia: hoy, desde: new Date().toISOString(), ids });
    if (ambiente() === "limpio") ir("/vocabulario/tanda"); else pintar();
  });
  vista.addEventListener("click", (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    const b = t && t.closest("[data-podep]");
    if (b) {
      const c = PD.episodios(), ep = c && c.eps.find((e) => e.id === b.dataset.podep);
      if (ep) PD.tocar(ep);
      return;
    }
    const q = t && t.closest("[data-podquita]");
    if (q) { quitarEp(q.dataset.podquita); return; }
    if (t && t.closest("#podDeshacer") && podDeshacer) {
      PD.quitar(podDeshacer.id, true);
      const id = podDeshacer.id; podDeshacer = null;
      const l = $("podLista"); if (l) { l.innerHTML = listaPodcasts(); l.querySelector(`[data-podep="${CSS.escape(id)}"]`)?.focus(); }
      return;
    }
    if (t && t.closest("#podLeer")) {
      const e = $("podAct"); if (e) e.textContent = "Buscando…";
      PD.actualizar(true).then(() => { const l = $("podLista"); if (l) l.innerHTML = listaPodcasts(); const e2 = $("podAct"); if (e2) e2.textContent = estadoPodcasts(); });
    }
  });
  vista.addEventListener("change", (ev) => {
    if (!(ev.target instanceof HTMLSelectElement) || ev.target.id !== "podProg") return;
    podProg = ev.target.value; guardar("pelagos.podprog", podProg);
    const l = $("podLista"); if (l) l.innerHTML = listaPodcasts();
  });
  window.addEventListener("hashchange", cerrarHojaPod);
  PD.alCambiar(pintarBarra);
  CL.conAcervo({
    tiene: (es) => palabras().some((x) => !x.s.quitada && paraBuscar(x.c.reverso) === paraBuscar(es)),
    agregar: (es, en) => {
      if (palabras().some((x) => !x.s.quitada && paraBuscar(x.c.reverso) === paraBuscar(es))) return false;
      A.apuntar({ t: "tjn", id: N.nuevoId("n"), tarjeta: N.nuevoId("tm"), cuando: new Date().toISOString(), frente: String(en).slice(0, 160), reverso: String(es).slice(0, 160) });
      recalcular();
      return true;
    },
  });
}

export { GAB, GAL, GAN, GAR, GDE, GH, GIZ, GW, ICONO_LAPIZ, ICONO_X, NOMBRE_CAMPO, ORDENAR, ORDENES, REPASOS_A_LA_VISTA, TANDA, abrirGrafica, abrirGraficaTema, abrirObra, abrirPalabra, abrirPodHoja, activarGrafica, activarLapices, adelanto, agAviso, alfabeto, ambiente, armarBarra, bibModo, callarTodo, cerrarHojaPod, conectarAcervo, cuandoToca, diaCorto, escalonDeTema, estadoEp, estadoPodcasts, fechaEp, fijarAdelanto, fijarBibModo, filaEp, formaPalabra, fotoDeLaTarjeta, fotoDeLeccion, graficaBarras, granTotal, hojaV, horasMin, htmlGrafica, juegoDeFotos, lecturaDeEjemplo, leerForma, listaDeLaHoja, listaPodcasts, lvAtascadas, lvAviso, lvBusca, lvCuantas, lvOrden, mayuscula, minutosDichos, mmss, moverSel, mudo, palabras, paraBuscar, pintarBarra, pintarListaHoja, podBarra, podClaveLista, podDeshacer, podHoja, podMinDe, podProg, podSel, podVistaLista, ponerFondoPalabra, portadaDelDia, quitarEp, quitarPalabra, renglonConLapiz, seccionPodcasts, serModo, sinArticulo, velTexto, verAgregar, verClases, verLectura, verLista };
