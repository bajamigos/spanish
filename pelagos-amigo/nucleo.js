// El motor de Pelagos. Aquí no hay pantalla ni internet: solo cuentas.
//
// Se guarda cada cosa que pasa (un kwiz que empieza, una respuesta, una pregunta retirada)
// y todo lo demás se calcula de ahí: el porcentaje de cada tema, qué kwiz está a medias,
// cuándo vuelve a tocar un tema. Si la fórmula cambia, se recalcula y no se pierde nada.
//
//     P = 100 * (suma(L^i * a_i) + K * L^n * p0) / (suma(L^i) + K * L^n)
//
//     a_i = 1 si la respuesta i estuvo bien, 0 si estuvo mal (i = 0 es la más reciente)
//     n   = cuántas respuestas llevas en el tema
//     p0  = el arranque: tu porcentaje de Kwiziq, entre 0 y 1
//     L   = cuánto pesa cada respuesta frente a la que le sigue (0.85)
//     K   = cuántas respuestas vale el arranque (4)

export const DECAIMIENTO = 0.85;
export const PESO_ARRANQUE = 4;
export const META = 80;
// Días hasta que vuelve a tocar un tema, según cuántas veces seguidas lo has sostenido.
export const ESCALONES = [1, 2, 5, 12, 30, 75];
export const TOTAL = 5;
export const TOTAL_TEMA = 5;
/** El «Kwiz con la tutora»: hasta 10 preguntas de su tema; la ronda se cierra sola al llegar a ACIERTOS_TUTORA buenas. */
export const TOTAL_TUTORA = 10;
export const ACIERTOS_TUTORA = 5;
export const TOPE_POR_TEMA = 3;
// La lista de estudio: cuántos temas trae y cuántos aciertos seguidos pide un tema que fallaste para poder salir.
export const LISTA = 5;
export const NUEVOS_TEMAS_AL_DIA = 5;           // la cuota de temas nuevos de gramática por día (su regla del 22-Oct-2026)
export const KWIZZES_AL_DIA = 5;                 // la medida diaria de kwizzes
export const ACIERTOS_PARA_SALIR = 2;
export const ESCALON_FACIL = 4;                   // «Ya me la sé» la manda a la caja de 30 días (ESCALONES[4])
export const PESO_FACIL = 3;                      // y cuenta como 3 aciertos en su porcentaje (su pedido del 24-Oct-2026)
export const NUEVAS_AL_DIA = 20;                 // cuántas tarjetas nuevas entran al día, como mucho

// ---------------------------------------------------------------- El porcentaje

/** arranque: 0 a 100 o null. respuestas: lista de 1 y 0, la más reciente primero. */
export function porcentaje(arranque, respuestas, decaimiento = DECAIMIENTO, pesoArranque = PESO_ARRANQUE) {
  const n = respuestas.length;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const peso = decaimiento ** i;
    num += peso * (respuestas[i] ? 1 : 0);
    den += peso;
  }
  if (arranque !== null && arranque !== undefined) {
    const p0 = Math.min(100, Math.max(0, Number(arranque))) / 100;
    const resto = pesoArranque * decaimiento ** n;
    num += resto * p0;
    den += resto;
  }
  if (den === 0) return null;
  return Math.round(10000 * num / den) / 100;
}

/** 15.3 -> «15.3%», 96 -> «96%». Una raya si no hay número. */
export function textoPct(valor) {
  if (valor === null || valor === undefined) return "–";
  return String(Math.round(valor * 10) / 10) + "%";
}

// ---------------------------------------------------------------- El mapa de árbol

/** Los seis colores del mapa, del más bajo al más alto. */
export const FRANJAS = ["Menos de 60", "60 a 69", "70 a 79", "80 a 89", "90 a 99", "100"];

/** En qué color cae un porcentaje: 0 (menos de 60) a 5 (100). Sin número, null. */
export function franja(v) {
  if (v === null || v === undefined) return null;
  return v < 60 ? 0 : v < 70 ? 1 : v < 80 ? 2 : v < 90 ? 3 : v < 99.995 ? 4 : 5;
}

/** Los nombres de los seis colores: cada cuánto vuelve lo que está en ese peldaño (13-Oct-2026: el color es el peldaño). */
export const PELDANOS = ESCALONES.map((d) => (d === 1 ? "1 día" : d + " días"));

/**
 * El color (0 a 5) de una tarjeta o un tema: su peldaño en la escalera de repaso. Lo que todavía no tiene fecha en
 * Pelagos pero sí trae porcentaje (de Anki o de Kwiziq) se pinta por su porcentaje mientras tanto. Sin nada, null.
 */
export function colorDe(x) {
  if (!x) return null;
  if (x.toca) return Math.max(0, Math.min(ESCALONES.length - 1, x.escalon | 0));
  return franja(x.pct);
}

/**
 * Reparte un rectángulo de W por H en cajas lo más cuadradas posible, una por valor y con área proporcional a él.
 * Los valores van del más grande al más chico. Devuelve { x, y, w, h } por cada uno, en el mismo orden.
 */
export function cuadricular(valores, W, H) {
  const total = valores.reduce((a, v) => a + v, 0), cajas = [];
  if (!(total > 0) || !(W > 0) || !(H > 0)) return valores.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const a = valores.map((v) => v * W * H / total);
  let x = 0, y = 0, w = W, h = H, i = 0;
  while (i < a.length) {
    const lado = Math.min(w, h);
    let j = i, suma = 0, menor = Infinity, mayor = 0, mejor = Infinity;
    while (j < a.length) {
      const s2 = suma + a[j], menor2 = Math.min(menor, a[j]), mayor2 = Math.max(mayor, a[j]);
      const peor = Math.max(lado * lado * mayor2 / (s2 * s2), s2 * s2 / (lado * lado * menor2));
      if (j > i && peor > mejor) break;
      suma = s2; menor = menor2; mayor = mayor2; mejor = peor; j++;
    }
    const grueso = suma / lado;
    let corrido = 0;
    for (let q = i; q < j; q++) {
      const largo = a[q] / grueso;
      cajas[q] = w >= h ? { x, y: y + corrido, w: grueso, h: largo } : { x: x + corrido, y, w: largo, h: grueso };
      corrido += largo;
    }
    if (w >= h) { x += grueso; w -= grueso; } else { y += grueso; h -= grueso; }
    i = j;
  }
  return cajas;
}

/**
 * Acomoda un nivel del mapa: una caja por tipo de palabra y, dentro, una cuadrícula con un cuadro por tema.
 * cuantos: temas de cada tipo, del más grande al más chico. area: los pixeles cuadrados que le tocan a cada tema.
 * Devuelve { alto, cajas: [{ x, y, w, h, rotulo, columnas, filas, cw, ch }] }; cw y ch son el tamaño de cada cuadro.
 */
export function acomodarMapa(cuantos, W, area, { cabeza = 22, margen = 3, hueco = 2, forma = 1.7 } = {}) {
  // El rótulo solo va en cajas con lugar: en una de dos o tres temas se comería los cuadros.
  const conRotulo = (n, caja) => n >= 4 && caja.h >= 52;
  // Un tipo con un solo tema pesa como si tuviera dos, para que su cuadro no quede como una rayita.
  const peso = (n) => Math.max(n, 2) * area;
  // Dos pasadas: la segunda le da a cada tipo el lugar de su propio rótulo y de sus márgenes.
  let valores = cuantos.map(peso);
  let alto = Math.max(60, valores.reduce((a, v) => a + v, 0) / W);
  let cajas = cuadricular(valores, W, alto);
  valores = cuantos.map((n, i) => peso(n) + (conRotulo(n, cajas[i]) ? cabeza * cajas[i].w : 0) + 2 * margen * (cajas[i].w + cajas[i].h));
  alto = Math.max(60, Math.round(valores.reduce((a, v) => a + v, 0) / W));
  cajas = cuadricular(valores, W, alto);
  return {
    alto,
    cajas: cajas.map((c, i) => {
      const n = cuantos[i], rotulo = conRotulo(n, c);
      const bw = Math.max(4, c.w - 2 * margen - hueco), bh = Math.max(4, c.h - 2 * margen - hueco - (rotulo ? cabeza : 0));
      let columnas = 1, mejor = Infinity;
      for (let k = 1; k <= n; k++) {
        const f = Math.abs(Math.log((bw / k) / (bh / Math.ceil(n / k)) / forma));
        if (f < mejor) { mejor = f; columnas = k; }
      }
      const filas = Math.ceil(n / columnas);
      return { ...c, rotulo, columnas, filas, cw: bw / columnas - hueco, ch: bh / filas - hueco };
    }),
  };
}

// ---------------------------------------------------------------- Fechas

function dos(n) { return String(n).padStart(2, "0"); }

/** Un momento -> la fecha de ese momento en este aparato: «2026-10-09». */
export function fechaLocal(momento) {
  const d = momento instanceof Date ? momento : new Date(momento);
  return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate());
}

/** «2026-10-09» más 2 días -> «2026-10-11». */
export function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split("-").map(Number);
  return fechaLocal(new Date(a, m - 1, d + dias));
}

/** Devuelve [escalón nuevo, fecha desde la que toca]. Acertar aleja la fecha; fallar la regresa a 1 día. */
export function siguienteToca(escalon, acerto, fecha) {
  const nuevo = acerto ? Math.min((escalon || 0) + 1, ESCALONES.length - 1) : 0;
  return [nuevo, sumarDias(fecha, ESCALONES[nuevo])];
}

// ---------------------------------------------------------------- Calificar lo escrito

const SIGNOS = /[¿?¡!.,;:«»"'’‘“”()\-–—…]/g;

/** Minúsculas, sin signos y sin espacios de más. Los acentos se conservan. */
export function normalizar(texto) {
  return String(texto ?? "").normalize("NFC").toLowerCase().replace(SIGNOS, " ").split(/\s+/).filter(Boolean).join(" ");
}

/** Quita los acentos y la diéresis, pero deja la ñ. */
export function sinAcentos(texto) {
  return String(texto ?? "").normalize("NFC")
    .replace(/ñ/g, "\u0000").replace(/Ñ/g, "\u0001")
    .normalize("NFD").replace(/\p{Mn}/gu, "")
    .replace(/\u0000/g, "ñ").replace(/\u0001/g, "Ñ");
}

/** «bien» si coincide, «casi» si solo faltan acentos, null si te toca decidir a ti. */
export function calificarEscrito(escrito, respuesta, tambienVale = []) {
  const dado = normalizar(escrito);
  if (!dado) return null;
  const validas = [respuesta, ...(tambienVale || [])].map(normalizar);
  if (validas.includes(dado)) return "bien";
  if (validas.map(sinAcentos).includes(sinAcentos(dado))) return "casi";
  return null;
}

// ---------------------------------------------------------------- Azar

/** Un azar que siempre da lo mismo para el mismo texto: así las opciones no cambian de lugar al recargar. */
export function azarDe(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function barajar(lista, azar = Math.random) {
  const s = lista.slice();
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

/** Un nombre que no se repite, para un kwiz o una respuesta. */
export function nuevoId(prefijo, ahora = Date.now()) {
  let cola = "";
  const letras = "abcdefghijklmnopqrstuvwxyz0123456789";
  const g = globalThis.crypto;
  if (g && g.getRandomValues) {
    for (const b of g.getRandomValues(new Uint8Array(6))) cola += letras[b % letras.length];
  } else {
    for (let i = 0; i < 6; i++) cola += letras[Math.floor(Math.random() * letras.length)];
  }
  return prefijo + ahora.toString(36) + cola;
}

// ---------------------------------------------------------------- De los sucesos al estado

function ms(e) {
  const v = Date.parse(e.cuando);
  return Number.isNaN(v) ? 0 : v;
}

/** Quita repetidos y ordena por momento. Dos aparatos pueden traer el mismo suceso; cuenta una vez. */
export function ordenar(sucesos) {
  const vistos = new Set();
  const lista = [];
  for (const e of sucesos || []) {
    if (!e || typeof e !== "object" || !e.id || !e.t || vistos.has(e.id)) continue;
    vistos.add(e.id);
    lista.push({ e, m: ms(e) });
  }
  lista.sort((a, b) => a.m - b.m || (a.e.id < b.e.id ? -1 : a.e.id > b.e.id ? 1 : 0));
  return lista.map((x) => x.e);
}

/**
 * Rehace todo desde cero: el paquete de contenido más la lista de sucesos.
 * Sucesos: «kwiz» (empieza uno), «r» (una respuesta), «retirar» (pregunta mala), «dejar» (dejas un kwiz a medias),
 * «enfoque» (eliges un nivel para tu plan de estudio, o lo sueltas), «tj» (calificas una tarjeta),
 * «tjq» (quitas una tarjeta de tu vocabulario, o la devuelves), «tje» (le corriges el frente o el reverso a una tarjeta)
 * «tjn» (agregas a mano una tarjeta nueva) y «ftj» (una foto se le presta a una tarjeta; ver fotoDeTarjeta).
 * Los de un tipo que no conoce los salta, así una versión vieja de la página no se rompe con sucesos nuevos.
 * Devuelve { temas, kwizzes, retiradas, ultimaVez, respuestas, parametros, tarjetas… }.
 */
export function calcular(paquete, sucesos) {
  const parametros = {
    decaimiento: paquete.meta?.decaimiento ?? DECAIMIENTO,
    pesoArranque: paquete.meta?.peso_arranque ?? PESO_ARRANQUE,
    meta: paquete.meta?.meta ?? META,
  };
  const preguntas = new Map();
  const retiradas = new Set();
  for (const q of paquete.preguntas || []) {
    preguntas.set(q.id, q);
    if (q.estado === "retirada") retiradas.add(q.id);
  }
  const lista = ordenar(sucesos);
  const kwizzes = new Map();
  const respuestas = [];
  const dadas = new Set();
  const dejados = new Set();
  const absueltas = new Map();  // pregunta -> cuándo dijiste «la fallé yo» (ver sospechosasDe)
  const destrabes = new Map();  // tema -> [{ ms, como }]: cuándo lo destrabaste a mano (ver atascados)
  const destrabesTj = new Map(); // tarjeta -> [{ ms, como }]: la editaste o tocaste «Seguir así»
  let enfoque = null;          // el nivel en el que te enfocas («A2»), o null si van todos los niveles

  // Las tarjetas. Cada una sube por la misma escalera de días que los temas. Una tarjeta que viene de otro
  // lado (tu mazo de antes) puede traer ya su escalón y su fecha; una nueva no trae nada.
  const tarjetas = new Map();
  // La foto prestada a cada tarjeta: tarjeta -> { foto, cuando }. Vale el último préstamo.
  const fotosTarjeta = new Map();
  for (const c of paquete.tarjetas || []) {
    const toca = typeof c.toca === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.toca) ? c.toca : null;
    // «repasos» y «aciertos»: lo que la tarjeta ya traía contado de tu mazo de antes. Solo sirven para su porcentaje.
    const baseN = Number.isInteger(c.repasos) && c.repasos > 0 ? c.repasos : 0;
    const baseBien = Number.isInteger(c.aciertos) && c.aciertos > 0 ? Math.min(c.aciertos, baseN) : 0;
    tarjetas.set(c.id, {
      escalon: toca ? Math.max(0, Math.min(ESCALONES.length - 1, c.escalon | 0)) : 0, toca, traia: !!toca, n: 0, nr: 0, bien: 0, primera: null, ultima: null, fallada: null,
      historia: [], baseN, baseBien, quitada: false, cambio: null,
    });
  }
  const agregadas = [];
  let reinicioTj = 0;
  let sinArranque = false;     // true: ningún tema trae su porcentaje de Kwiziq; solo cuenta lo que contestas aquí          // cuándo reiniciaste tu vocabulario, o 0        // las tarjetas que agregaste a mano: no vienen en el contenido, viven en tus sucesos
  const porVer = new Map();    // estrenos que tocaste en la Biblioteca para verlos: «tv:123» o «movie:456» -> cuándo; «porver» con quitar los saca
  const notas = new Map();     // tus notas sobre las tutoras (y lo que sea): id -> { id, sobre, texto, cuando }; «notaq» quita una

  // Cuánto estudiaste cada día: lo que ya traías contado de antes (tu mazo de Anki) más lo que contestas aquí,
  // sea vocabulario o gramática. Es lo que pinta el mapa de calor.
  // Además, por materia: «actividadVoc» (lo de antes más tus repasos de vocabulario) y «actividadGram» (quizzes terminados).
  const actividad = new Map(), actividadVoc = new Map(), actividadGram = new Map();
  for (const [dia, n] of Object.entries(paquete.historial?.dias || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && Number.isInteger(n) && n > 0) { actividad.set(dia, n); actividadVoc.set(dia, n); }
  }
  const cuenta = (cuando) => {
    if (Number.isNaN(Date.parse(cuando))) return;
    const dia = fechaLocal(cuando);
    actividad.set(dia, (actividad.get(dia) || 0) + 1);
  };

  // «Deshacer» (24-Oct-2026): un suceso «tjdeshacer» anula la calificación «tj» que nombra en «ref». Nada se borra.
  const deshechos = new Set();
  for (const e of lista) if (e.t === "tjdeshacer" && typeof e.ref === "string") deshechos.add(e.ref);
  // Lo mismo en gramática (25-Oct-2026): «rdeshacer» anula la respuesta «r» de «ref»; la pregunta vuelve a quedar sin contestar.
  for (const e of lista) if (e.t === "rdeshacer" && typeof e.ref === "string") deshechos.add(e.ref);
  for (const e of lista) {
    if (e.t === "tj") {
      const c = tarjetas.get(e.tarjeta);
      if (!c || deshechos.has(e.id)) continue;
      // «Ya me la sé» (24-Oct-2026): un acierto que pesa PESO_FACIL en su porcentaje y la sube directo a la caja de 30 días.
      const facil = !!e.facil && !!e.bien;
      const dia = fechaLocal(e.cuando);
      const yaHoy = !!c.ultima && fechaLocal(c.ultima) === dia;     // ya la habías repasado hoy
      const peso = facil ? PESO_FACIL : 1;
      c.n += peso;
      c.nr++;                                    // repasos desde el último reinicio (o desde siempre)
      if (!c.primera) c.primera = e.cuando;
      c.ultima = e.cuando;
      c.historia.push({ cuando: e.cuando, bien: !!e.bien, ...(facil ? { peso } : {}) });
      cuenta(e.cuando);
      actividadVoc.set(dia, (actividadVoc.get(dia) || 0) + 1);
      if (!e.bien) { c.escalon = 0; c.toca = dia; c.fallada = dia; }                     // fallada: vuelve a salir hoy mismo                     // fallada: vuelve a salir hoy mismo
      else {
        c.bien += peso;
        if (facil && c.fallada !== dia && c.escalon < ESCALON_FACIL) { c.escalon = ESCALON_FACIL; c.toca = sumarDias(dia, ESCALONES[ESCALON_FACIL]); }
        else if (c.fallada === dia) { c.escalon = 0; c.toca = sumarDias(dia, ESCALONES[0]); c.fallada = null; }      // la rescataste hoy: mañana otra vez
        else if (!c.toca || c.toca <= dia || (e.adelanto && !yaHoy)) [c.escalon, c.toca] = siguienteToca(c.nr === 1 && !c.traia ? -1 : c.escalon, true, dia);    // adelantada a propósito: sí sube
      }
    } else if (e.t === "tjreinicio") {
      // Reinicio del vocabulario (17-Oct-2026): todas las tarjetas vuelven a ser nuevas y entran de NUEVAS_AL_DIA en
      // NUEVAS_AL_DIA. Su historia y sus aciertos se quedan; solo cambia la escalera. Para deshacerlo se quita ese renglón de tus sucesos.
      reinicioTj = ms(e);
      for (const c of tarjetas.values()) { c.escalon = 0; c.toca = null; c.traia = false; c.primera = null; c.fallada = null; c.nr = 0; }
    } else if (e.t === "tjn") {
      // Una tarjeta nueva, hecha a mano. Si ya hay una con ese id (del contenido o de otro suceso), vale la que ya estaba.
      const texto = limpiarCambio(e);
      if (typeof e.tarjeta !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(e.tarjeta) || tarjetas.has(e.tarjeta) || !texto || !texto.frente || !texto.reverso) continue;
      agregadas.push({ id: e.tarjeta, mazo: "A mano", frente: texto.frente, reverso: texto.reverso, agregada: fechaLocal(e.cuando) });
      tarjetas.set(e.tarjeta, { escalon: 0, toca: null, traia: false, n: 0, nr: 0, bien: 0, primera: null, ultima: null, fallada: null, historia: [], baseN: 0, baseBien: 0, quitada: false, cambio: null });
    } else if (e.t === "tjq") {
      const c = tarjetas.get(e.tarjeta);
      if (c) c.quitada = !(e.quitar === 0 || e.quitar === false);        // quitar: 0 la devuelve
    } else if (e.t === "tje") {
      const c = tarjetas.get(e.tarjeta);
      const cambio = c && limpiarCambio(e);
      if (cambio) { c.cambio = { ...(c.cambio || {}), ...cambio }; marcarDestrabe(destrabesTj, e.tarjeta, e, "editar"); }     // vale lo último que corregiste; editada, se destraba
    } else if (e.t === "nota") {
      const sobre = typeof e.sobre === "string" && /^[a-z]+:[A-Za-z0-9_-]{1,40}$/.test(e.sobre) ? e.sobre : null;
      const texto = typeof e.texto === "string" ? e.texto.replace(/\r/g, "").trim().slice(0, NOTA_MAX) : "";
      if (sobre && texto && !notas.has(e.id)) notas.set(e.id, { id: e.id, sobre, texto, cuando: e.cuando });
    } else if (e.t === "porver") {
      if (typeof e.obra === "string" && /^(tv|movie):\d{1,10}$/.test(e.obra)) {
        if (e.quitar) porVer.delete(e.obra); else porVer.set(e.obra, e.cuando || "");
      }
    } else if (e.t === "notaq") {
      if (typeof e.nota === "string") notas.delete(e.nota);
    } else if (e.t === "ftj") {
      if (typeof e.tarjeta === "string" && typeof e.foto === "string" && /^[a-z0-9-]+\.jpg$/.test(e.foto)) fotosTarjeta.set(e.tarjeta, { foto: e.foto, cuando: e.cuando || "" });
    } else if (e.t === "sinarranque") sinArranque = !(e.deshacer === 1 || e.deshacer === true);   // 17-Oct-2026: tus porcentajes de Kwiziq dejan de contar
    else if (e.t === "enfoque") enfoque = typeof e.nivel === "string" && e.nivel ? e.nivel : null;
    else if (e.t === "retirar" && e.p) retiradas.add(e.p);
    else if (e.t === "absolver" && e.p) absueltas.set(e.p, ms(e));       // «Está bien, la fallé yo»: la sospecha empieza de cero
    else if (e.t === "destrabar" && e.tema != null) marcarDestrabe(destrabes, Number(e.tema), e, e.como);      // leíste la lección de un tema atascado, o «Seguir así»
    else if (e.t === "destrabar" && typeof e.tarjeta === "string") marcarDestrabe(destrabesTj, e.tarjeta, e, e.como);   // «Seguir así» con una tarjeta
    else if (e.t === "dejar" && e.kwiz) dejados.add(e.kwiz);
    else if (e.t === "otra" && e.kwiz && typeof e.slot === "string" && /^[^~]+~\d+$/.test(e.slot)) {
      // «Otra vez»: la pregunta fallada vuelve más adelante en el mismo kwiz, como «<id>~2», antes de `antes` (o al final).
      const k = kwizzes.get(e.kwiz);
      if (k && !k.preguntas.includes(e.slot)) {
        const i = e.antes ? k.preguntas.indexOf(e.antes) : -1;
        if (i >= 0) k.preguntas.splice(i, 0, e.slot); else k.preguntas.push(e.slot);
      }
    }
    else if (e.t === "kwiz" && Array.isArray(e.preguntas) && !kwizzes.has(e.id)) {
      kwizzes.set(e.id, {
        id: e.id, tipo: e.tipo || "general", cuaderno: e.cuaderno ?? null, tema: e.tema ?? null,
        cuando: e.cuando, preguntas: e.preguntas.slice(), resp: new Map(),
        terminado: null, bien: 0, total: 0, pendientes: [], dejado: false,
      });
    } else if (e.t === "r" && e.p && e.kwiz) {
      if (deshechos.has(e.id)) continue;
      if (e.s && !String(e.s).startsWith(e.p + "~")) continue;
      const clave = e.kwiz + "|" + (e.s || e.p);       // una sola respuesta por pregunta (o por su vuelta «~2») en cada kwiz: vale la primera
      if (dadas.has(clave)) continue;
      dadas.add(clave);
      respuestas.push(e);
    }
  }

  for (const r of respuestas) cuenta(r.cuando);

  // Porcentaje de cada tema.
  const porTema = new Map();
  const ultimaVez = new Map();
  for (const r of respuestas) {
    const k = kwizzes.get(r.kwiz);
    if (k) k.resp.set(r.s || r.p, r);
    const antes = ultimaVez.get(r.p);
    if (!antes || ms(r) >= antes) ultimaVez.set(r.p, ms(r));
    if (retiradas.has(r.p)) continue;
    if (!porTema.has(r.tema)) porTema.set(r.tema, []);
    porTema.get(r.tema).push(r);
  }
  // Lo que cada tema «debe»: al fallar, queda debiendo dos aciertos seguidos. Cada acierto paga uno.
  // También se guarda cuál fue la última pregunta fallada, para volver a preguntarla.
  const debe = new Map();
  const fallada = new Map();
  for (const r of respuestas) {
    if (retiradas.has(r.p)) continue;
    if (r.bien) { if ((debe.get(r.tema) || 0) > 0) debe.set(r.tema, debe.get(r.tema) - 1); }
    else { debe.set(r.tema, ACIERTOS_PARA_SALIR); fallada.set(r.tema, r.p); }
  }

  const temas = new Map();
  for (const t of paquete.temas || []) {
    const suyas = porTema.get(t.id) || [];
    const arranque = sinArranque || t.arranque === null || t.arranque === undefined ? null : Math.min(100, Math.max(0, t.arranque));
    const recientes = suyas.slice().reverse();
    temas.set(t.id, {
      pct: porcentaje(arranque, recientes.map((r) => (r.bien ? 1 : 0)), parametros.decaimiento, parametros.pesoArranque),
      n: suyas.length, arranque, ultima: suyas.length ? suyas[suyas.length - 1].cuando : null, primera: suyas.length ? suyas[0].cuando : null,
      escalon: 0, toca: null,
    });
  }

  // Cada kwiz: qué falta, y si ya se acabó, cuántas bien.
  const cerrados = [];
  for (const k of kwizzes.values()) {
    k.dejado = dejados.has(k.id);        // un kwiz que dejaste se cierra con lo que alcanzaste a contestar
    const base = (p) => String(p).split("~")[0];
    k.pendientes = k.dejado ? [] : k.preguntas.filter((p) => !k.resp.has(p) && preguntas.has(base(p)) && !retiradas.has(base(p)));
    const cuentan = [...k.resp.values()].filter((r) => !retiradas.has(r.p));
    k.total = cuentan.length;
    k.bien = cuentan.filter((r) => r.bien).length;
    if (k.resp.size && !k.pendientes.length) {
      k.terminado = [...k.resp.values()].reduce((m, r) => (ms(r) > ms(m) ? r : m)).cuando;
      cerrados.push(k);
    }
  }

  // «Toca»: cada kwiz terminado mueve la fecha de los temas que salieron en él.
  // Fallar regresa el tema a un día. Acertar lo aleja, pero solo si ya tocaba:
  // repasar de más el mismo día no lo manda a meses de distancia.
  cerrados.sort((a, b) => Date.parse(a.terminado) - Date.parse(b.terminado) || (a.id < b.id ? -1 : 1));
  for (const k of cerrados) {
    const acerto = new Map();
    for (const r of k.resp.values()) {
      if (retiradas.has(r.p)) continue;
      acerto.set(r.tema, (acerto.has(r.tema) ? acerto.get(r.tema) : true) && !!r.bien);
    }
    for (const [tema, bien] of acerto) {
      const t = temas.get(tema);
      if (!t) continue;
      const dia = fechaLocal(k.terminado);
      if (!bien) [t.escalon, t.toca] = siguienteToca(t.escalon, false, dia);
      else if (!t.toca || t.toca <= dia) [t.escalon, t.toca] = siguienteToca(t.escalon, true, dia);
    }
  }

  for (const k of kwizzes.values()) {
    if (!k.terminado || Number.isNaN(Date.parse(k.terminado))) continue;
    const dia = fechaLocal(k.terminado);
    actividadGram.set(dia, (actividadGram.get(dia) || 0) + 1);
  }

  const sospechosas = sospechosasDe(respuestas, retiradas, absueltas);

  return { sinArranque, reinicioTj, sospechosas, absueltas, destrabes, destrabesTj, todas: respuestas, temas, kwizzes, retiradas, ultimaVez, respuestas: respuestas.length, porTema, parametros, debe, fallada, enfoque, tarjetas, fotosTarjeta, agregadas, actividad, actividadVoc, actividadGram, notas, porVer };
}

// ---------------------------------------------------------------- Preguntas sospechosas y temas atorados (16-Oct-2026)

/** Una pregunta es sospechosa si la fallaste SOSPECHA_FALLAS veces o más, nunca la has acertado,
 *  y en el resto de su tema vas en SOSPECHA_PCT % o más, con SOSPECHA_MIN respuestas o más.
 *  Después de «Está bien, la fallé yo» solo cuentan las respuestas posteriores. */
export const SOSPECHA_FALLAS = 2, SOSPECHA_PCT = 80, SOSPECHA_MIN = 5;
function sospechosasDe(respuestas, retiradas, absueltas) {
  const porPregunta = new Map(), porTema = new Map();
  for (const r of respuestas) {
    if (retiradas.has(r.p)) continue;
    if (!porTema.has(r.tema)) porTema.set(r.tema, []);
    porTema.get(r.tema).push(r);
    if (absueltas.has(r.p) && ms(r) <= absueltas.get(r.p)) continue;
    if (!porPregunta.has(r.p)) porPregunta.set(r.p, { p: r.p, tema: r.tema, fallas: 0, bien: 0, escritos: [], ultima: null });
    const x = porPregunta.get(r.p);
    if (r.bien) x.bien++; else { x.fallas++; if (r.escrito) x.escritos.push(r.escrito); }
    x.ultima = r.cuando;
  }
  const lista = [];
  for (const x of porPregunta.values()) {
    if (x.fallas < SOSPECHA_FALLAS || x.bien) continue;
    const resto = (porTema.get(x.tema) || []).filter((r) => r.p !== x.p);
    const bien = resto.filter((r) => r.bien).length;
    if (resto.length < SOSPECHA_MIN || 100 * bien / resto.length < SOSPECHA_PCT) continue;
    lista.push({ ...x, restoBien: bien, restoDe: resto.length });
  }
  return lista.sort((a, b) => (a.ultima < b.ultima ? 1 : -1));
}

/**
 * Atascados (16-Oct-2026): la misma regla para tarjetas y temas, como las «leech» de Anki.
 * Algo se atasca si lo fallas en ATASCADO_FALLOS quizzes distintos en los últimos ATASCADO_DIAS días.
 * En vocabulario el quiz es el del día (los reintentos del mismo día cuentan uno); en gramática, cada quiz cuenta aparte.
 * Cuenta aunque nunca lo hayas acertado en Pelagos (tus temas traen Kwiziq y tus tarjetas, Anki).
 * Se destraba (la cuenta empieza de cero) al arreglarlo (editar la tarjeta; leer la lección o terminar el kwiz con la
 * tutora del tema), al acertarlo ACIERTOS_PARA_SALIR veces seguidas en días distintos, o con «Seguir así».
 */
export const ATASCADO_FALLOS = 3, ATASCADO_DIAS = 7;

function marcarDestrabe(mapa, clave, e, como) {
  if (!mapa.has(clave)) mapa.set(clave, []);
  mapa.get(clave).push({ ms: ms(e), como: como || "" });
}

/** intentos: [{ clave, ms, dia, bien, sesion }] en orden; desde: Map clave -> ms del último destrabe. Devuelve Map clave -> { fallos, dias }. */
function atascadosDe(intentos, desde, hoy) {
  const limite = Date.parse(hoy + "T00:00:00") - (ATASCADO_DIAS - 1) * 864e5;
  const racha = new Map(), fallos = new Map();          // racha: clave -> { n, dia } de aciertos seguidos en días distintos
  for (const x of intentos) {
    if (x.bien) {
      const r = racha.get(x.clave) || { n: 0, dia: null };
      if (r.dia !== x.dia) { r.n++; r.dia = x.dia; }
      racha.set(x.clave, r);
      if (r.n >= ACIERTOS_PARA_SALIR) desde.set(x.clave, Math.max(desde.get(x.clave) || 0, x.ms));
    } else {
      racha.set(x.clave, { n: 0, dia: null });
      if (!fallos.has(x.clave)) fallos.set(x.clave, []);
      fallos.get(x.clave).push(x);
    }
  }
  const salida = new Map();
  for (const [clave, l] of fallos) {
    const corte = Math.max(limite, desde.get(clave) || 0);
    const n = new Set(l.filter((x) => x.ms > corte).map((x) => x.sesion)).size;
    if (n >= ATASCADO_FALLOS) salida.set(clave, { fallos: n, dias: ATASCADO_DIAS });
  }
  return salida;
}

const ultimoDestrabe = (mapa) => new Map([...(mapa || [])].map(([k, l]) => [k, Math.max(0, ...l.map((d) => d.ms))]));

/** Los temas atascados: Map tema -> { fallos, dias }. */
export function temasAtascados(estado, hoy = fechaLocal(new Date())) {
  const desde = ultimoDestrabe(estado.destrabes);
  for (const k of estado.kwizzes.values()) {
    if (k.tipo === "tutora" && k.terminado && k.tema != null) {
      const t = Number(k.tema), m = Date.parse(k.terminado);
      desde.set(t, Math.max(desde.get(t) || 0, m));
    }
  }
  const intentos = (estado.todas || []).filter((r) => !estado.retiradas.has(r.p))
    .map((r) => ({ clave: r.tema, ms: ms(r), dia: fechaLocal(new Date(ms(r))), bien: !!r.bien, sesion: r.kwiz }));
  return atascadosDe(intentos, desde, hoy);
}

/** Las tarjetas atascadas: Map tarjeta -> { fallos, dias }. Las quitadas no cuentan. */
export function tarjetasAtascadas(estado, hoy = fechaLocal(new Date())) {
  const desde = ultimoDestrabe(estado.destrabesTj);
  const intentos = [];
  for (const [id, c] of estado.tarjetas || []) {
    if (c.quitada) continue;
    for (const h of c.historia) { const dia = fechaLocal(h.cuando); intentos.push({ clave: id, ms: Date.parse(h.cuando), dia, bien: h.bien, sesion: dia }); }
  }
  intentos.sort((a, b) => a.ms - b.ms);
  return atascadosDe(intentos, desde, hoy);
}

// ---------------------------------------------------------------- El mapa de calor

/** Desde cuántos repasos en un día sube el color: 1, 20, 60 y 150. */
export const CALOR = [1, 20, 60, 150];
/** Los escalones de la Bitácora de gramática: quizzes terminados en el día (5 es tu meta). */
export const CALOR_GRAM = [1, 3, 5, 10];
/** El color de un día, de 0 (nada) a 4 (el más caliente). */
export function nivelDeCalor(n, escala = CALOR) {
  let nivel = 0;
  for (const desde of Array.isArray(escala) ? escala : CALOR) if (n >= desde) nivel++;
  return nivel;
}

/**
 * Tus rachas: días seguidos con al menos un repaso. «actual» cuenta hasta hoy; si hoy todavía no estudias, hasta ayer.
 * Devuelve { actual, larga, largaFin, dias, total, mejor: { dia, n } }.
 */
export function rachas(actividad, hoy = fechaLocal(new Date())) {
  const dias = [...actividad.keys()].filter((d) => actividad.get(d) > 0).sort();
  let larga = 0, largaFin = null, seguidos = 0, anterior = null, total = 0, mejor = { dia: null, n: 0 };
  for (const d of dias) {
    seguidos = anterior && sumarDias(anterior, 1) === d ? seguidos + 1 : 1;
    if (seguidos > larga) { larga = seguidos; largaFin = d; }
    anterior = d;
    const n = actividad.get(d);
    total += n;
    if (n > mejor.n) mejor = { dia: d, n };
  }
  let actual = 0;
  for (let d = actividad.get(hoy) > 0 ? hoy : sumarDias(hoy, -1); actividad.get(d) > 0; d = sumarDias(d, -1)) actual++;
  return { actual, larga, largaFin, dias: dias.length, total, mejor };
}

const TEXTO_MAX = 300;
export const NOTA_MAX = 2000;

/** Tus notas sobre algo («tutora:9542»), de la más vieja a la más nueva. */
export function notasSobre(estado, sobre) {
  return [...((estado && estado.notas) || new Map()).values()].filter((n) => n.sobre === sobre).sort((a, b) => ms(a) - ms(b));
}
/** Lo que se le puede corregir a una tarjeta: el frente y el reverso. Una tarjeta no lleva nada más; lo demás se tira. */
function limpiarCambio(e) {
  const texto = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, TEXTO_MAX) : null);
  const cambio = {};
  const frente = texto(e.frente), reverso = texto(e.reverso);
  if (frente) cambio.frente = frente;
  if (reverso) cambio.reverso = reverso;
  return Object.keys(cambio).length ? cambio : null;
}

/** Todo tu vocabulario: las tarjetas del contenido y, después, las que agregaste a mano. */
export function mazo(paquete, estado) {
  return [...(paquete.tarjetas || []), ...((estado && estado.agregadas) || [])];
}

/** Una tarjeta como se ve hoy: lo que trae el contenido, con lo que tú le hayas corregido encima. */
export function tarjetaVista(tarjeta, suya) {
  return suya && suya.cambio ? { ...tarjeta, ...suya.cambio } : tarjeta;
}

/** El porcentaje de aciertos de una tarjeta, de 0 a 100, o null si nunca la has contestado. */
export function aciertoDeTarjeta(suya) {
  if (!suya) return null;
  const n = (suya.baseN || 0) + suya.n;
  return n ? 100 * ((suya.baseBien || 0) + suya.bien) / n : null;
}

/** El kwiz a medias más reciente, o null. */
export function kwizAbierto(estado) {
  let mejor = null;
  for (const k of estado.kwizzes.values()) {
    if (k.terminado || !k.pendientes.length) continue;
    if (!mejor || Date.parse(k.cuando) > Date.parse(mejor.cuando)) mejor = k;
  }
  return mejor;
}

/** Los kwizzes terminados, el más reciente primero. */
export function kwizzesHechos(estado) {
  return [...estado.kwizzes.values()].filter((k) => k.terminado)
    .sort((a, b) => Date.parse(b.terminado) - Date.parse(a.terminado));
}

/** Cuántos kwizzes terminaste ese día (por la fecha de este aparato). */
export function kwizzesDelDia(estado, dia = fechaLocal(new Date())) {
  return kwizzesHechos(estado).filter((k) => fechaLocal(k.terminado) === dia).length;
}

/**
 * Las tarjetas de hoy: las que ya tocan (repasos, primero las más atrasadas), después las nuevas que caben hoy
 * y al final las que fallaste hoy, para que no te salgan de inmediato otra vez.
 * Las que quitaste de tu vocabulario no salen ni cuentan.
 * Devuelve { pendientes: [id…], repasos, nuevas, hechasHoy, total }. «pendientes» va en el orden en que salen.
 */
export function tarjetasDelDia(paquete, estado, hoy = fechaLocal(new Date())) {
  const repasos = [], nuevas = [], falladas = [];
  let hechasHoy = 0, nuevasHoy = 0, total = 0;
  for (const c of mazo(paquete, estado)) {
    const s = estado.tarjetas && estado.tarjetas.get(c.id);
    if (!s) continue;
    if (s.primera && !s.traia && fechaLocal(s.primera) === hoy) nuevasHoy++;
    if (s.quitada) continue;                 // la quitaste de tu vocabulario: ya no sale ni cuenta
    total++;
    if (!s.toca) nuevas.push(c.id);
    else if (s.toca <= hoy) (s.fallada === hoy ? falladas : repasos).push({ id: c.id, toca: s.toca, ultima: s.ultima ? Date.parse(s.ultima) : 0 });
    else if (s.ultima && fechaLocal(s.ultima) === hoy) hechasHoy++;
  }
  repasos.sort((a, b) => (a.toca < b.toca ? -1 : a.toca > b.toca ? 1 : 0) || a.ultima - b.ultima || (a.id < b.id ? -1 : 1));
  const caben = nuevas.slice(0, Math.max(0, NUEVAS_AL_DIA - nuevasHoy));
  falladas.sort((a, b) => a.ultima - b.ultima || (a.id < b.id ? -1 : 1));      // las que fallaste hoy van al final, la más vieja primero
  return {
    pendientes: [...repasos.map((r) => r.id), ...caben, ...falladas.map((r) => r.id)], repasos: repasos.length + falladas.length, nuevas: caben.length, hechasHoy, total,
    // Las de hoy por grupo, para el contador de colores del quiz (nuevas · vencidas · falladas).
    grupos: { nuevas: caben, vencidas: repasos.map((r) => r.id), falladas: falladas.map((r) => r.id) },
  };
}

export const ADELANTO = 20;

/**
 * Para adelantar cuando ya estás en cero (17-Oct-2026): primero las que nunca has repasado en Pelagos (la que toca
 * más pronto primero), luego las nuevas que ya no cupieron hoy, luego las demás, y al final las que viste ayer.
 * Antes salían las que tocan más pronto, que muchas veces eran las mismas de ayer. Las que ya viste hoy no entran (13-Oct-2026: salían otra vez y subían de más). Las quitadas no salen. Devuelve hasta «cuantas» ids, en el orden en que salen.
 * Al calificarlas con «adelanto», la que aciertas sube su escalón desde hoy (una sola vez al día); la que fallas vuelve a salir hoy.
 */
export function tarjetasAdelante(paquete, estado, hoy = fechaLocal(new Date()), cuantas = ADELANTO) {
  const dia = tarjetasDelDia(paquete, estado, hoy);
  const yaHoy = new Set(dia.pendientes);
  const proximas = [], nuevas = [];
  for (const c of mazo(paquete, estado)) {
    const s = estado.tarjetas && estado.tarjetas.get(c.id);
    if (!s || s.quitada || yaHoy.has(c.id)) continue;
    if (s.ultima && fechaLocal(s.ultima) === hoy) continue;       // ya la viste hoy: adelantar es para las que no has visto

    if (!s.toca) nuevas.push(c.id);
    else if (s.toca > hoy) proximas.push({ id: c.id, toca: s.toca, ultima: s.ultima ? Date.parse(s.ultima) : 0 });
  }
  proximas.sort((a, b) => (a.toca < b.toca ? -1 : a.toca > b.toca ? 1 : 0) || a.ultima - b.ultima || (a.id < b.id ? -1 : 1));
  const ayer = sumarDias(hoy, -1);
  const nunca = proximas.filter((x) => !x.ultima);
  const deAyer = proximas.filter((x) => x.ultima && fechaLocal(new Date(x.ultima)) === ayer);
  const otras = proximas.filter((x) => x.ultima && fechaLocal(new Date(x.ultima)) !== ayer);
  return [...nunca.map((x) => x.id), ...nuevas, ...otras.map((x) => x.id), ...deAyer.map((x) => x.id)].slice(0, cuantas);
}

/**
 * El tablero del día: lo que Pelagos no puede contar solo (lo que escuchaste, tu clase, tus tarjetas, el check-in).
 * Lo escribe alguien más en tablero/hoy.json. Aquí solo se revisa su forma; lo que venga mal hecho se tira.
 * Devuelve { dia, leido, atuendo, foto, medidas, extras, checkin, podcasts } o null.
 */
export function leerTablero(crudo) {
  if (!crudo || typeof crudo !== "object" || crudo.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(crudo.dia || "")) return null;
  const texto = (v, tope = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, tope) : null);
  const numero = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const momento = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
  const medidas = [];
  for (const m of Array.isArray(crudo.medidas) ? crudo.medidas.slice(0, 8) : []) {
    const nombre = texto(m && m.nombre, 60), valor = numero(m && m.valor), de = numero(m && m.de);
    if (nombre === null || valor === null || de === null) continue;
    medidas.push({ nombre, valor, de, unidad: texto(m.unidad, 12) || "" });
  }
  const extras = [];
  for (const x of Array.isArray(crudo.extras) ? crudo.extras.slice(0, 6) : []) {
    const nombre = texto(x && x.nombre, 60), valor = texto(String((x && x.valor) ?? ""), 24);
    if (nombre !== null && valor !== null) extras.push({ nombre, valor });
  }
  let checkin = null;
  const c = crudo.checkin;
  if (c && typeof c === "object" && ["nuevo", "oido", "ninguno"].includes(c.estado)) {
    const partes = [];
    for (const x of Array.isArray(c.partes) ? c.partes.slice(0, 8) : []) {
      const nombre = texto(x && x.nombre, 30);
      // «con» dice con qué se gana la parte, para que la página la prenda al momento sin esperar a la siguiente lectura:
      // «siempre», «tarjetas» (tus tarjetas en cero), «kwizzes» (tu meta de kwizzes), «medida:<nombre>» o «todas» (las demás juntas).
      const con = typeof x?.con === "string" && /^(siempre|tarjetas|kwizzes|todas|medida:.{1,60})$/.test(x.con) ? x.con : null;
      // «icono» es el nombre de un dibujito que la página conoce; va en la esquina del cuadro de esa medida.
      const icono = typeof x?.icono === "string" && /^[a-z]{2,12}$/.test(x.icono) ? x.icono : null;
      // «extra»: una parte de más (la Amiga, por la clase). Se gana sola y no cuenta para «todas».
      if (nombre !== null) partes.push({ nombre, va: x.va === true, con, icono, ...(x.extra === true ? { extra: true } : {}) });
    }
    // «url» y «ultimo.url»: el episodio en ElevenReader (solo direcciones de su biblioteca). «ultimo» es el episodio de Andrea más nuevo de hoy: el check-in o la Mamada.
    const enlace = (u) => (typeof u === "string" && /^https:\/\/elevenreader\.io\/reader\/[A-Za-z0-9/:_?=&.-]{1,200}$/.test(u) ? u : null);
    const ul = c.ultimo && typeof c.ultimo === "object" && enlace(c.ultimo.url) ? { titulo: texto(c.ultimo.titulo, 120), url: enlace(c.ultimo.url) } : null;
    checkin = { estado: c.estado, nivel: numero(c.nivel), nombre: texto(c.nombre, 40), titulo: texto(c.titulo, 120),
      minutos: numero(c.minutos), partes, falta: texto(c.falta, 400), puesto: momento(c.puesto), url: enlace(c.url), ultimo: ul };
  }
  // «podcasts»: los programas en español que escuchaste hoy en Pocket Casts, con sus minutos (para la Escucha, 22-Oct-2026).
  const podcasts = [];
  for (const x of Array.isArray(crudo.podcasts) ? crudo.podcasts.slice(0, 12) : []) {
    const programa = texto(x && x.programa, 80), min = numero(x && x.min);
    if (programa !== null && min !== null) podcasts.push({ programa, min: Math.round(min) });
  }
  const foto = typeof crudo.foto === "string" && /^[a-z0-9-]+\.jpg$/.test(crudo.foto) ? crudo.foto : null;
  // «frase»: la línea del día de Andrea, coqueta y con tus números de esa lectura.
  return { dia: crudo.dia, leido: momento(crudo.leido), atuendo: texto(crudo.atuendo, 200), foto, frase: texto(crudo.frase, 240), medidas, extras, checkin, podcasts };
}

/**
 * Tu registro de lectura (tablero/lectura.json): los libros de tu biblioteca de ElevenReader y tus minutos por día.
 * Lo escribe la tarea del Tablero; aquí solo se revisa su forma y lo que venga mal hecho se tira.
 * Devuelve { libros: [{ id, titulo, autor, url, portada, falta, estado, terminado }], dias: Map(día -> minutos),
 * horas: Map(día -> Map(hora -> minutos)), libroDia: Map(día -> id del libro), meta } o null.
 * «estado»: «leyendo» (el que estás escuchando; el primero así es «Leyendo ahora»), «terminado» o «pendiente».
 */
export function leerLectura(crudo) {
  if (!crudo || typeof crudo !== "object" || crudo.version !== 1) return null;
  const texto = (v, tope = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, tope) : null);
  const dia = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const url = (u) => (typeof u === "string" && /^https:\/\/elevenreader\.io\/reader\/library\/u:[A-Za-z0-9]{6,40}$/.test(u) ? u : null);
  // Las portadas son las miniaturas públicas de ElevenReader (su CDN en Google); nada más se acepta.
  const portada = (u) => (typeof u === "string" && /^https:\/\/storage\.googleapis\.com\/eleven-public-cdn\/database\/reader_customers\/[A-Za-z0-9]{6,40}\/read\/u%3A[A-Za-z0-9]{6,40}\/thumbnail\.(webp|jpg|jpeg|png)(\?v=\d{1,14})?$/.test(u) ? u : null);
  // También van libros de fuera de ElevenReader (Kindle, papel…): sin «url», con su portada de Open Library si la hay.
  const ol = (u) => (typeof u === "string" && /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d{1,10}-[SML]\.jpg$/.test(u) ? u : null);
  const clave = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const libros = [], vistos = new Set();
  for (const b of Array.isArray(crudo.libros) ? crudo.libros.slice(0, 300) : []) {
    const titulo = texto(b && b.titulo, 160), u = url(b && b.url);
    if (!titulo) continue;
    const id = u ? u.slice(u.lastIndexOf("/") + 1) : "x:" + clave(titulo);
    if (vistos.has(id)) continue;
    vistos.add(id);
    const num = (v, max) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
    libros.push({ id, titulo, autor: texto(b.autor, 80), url: u, portada: portada(b.portada) || ol(b.portada),
      falta: texto(b.falta, 40), estado: ["leyendo", "terminado", "pendiente", "abandonado"].includes(b.estado) ? b.estado : "pendiente",
      terminado: dia(b.terminado), nota: Number.isInteger(b.nota) ? num(b.nota, 5) : null, avance: num(b.avance, 1),
      paginas: Number.isInteger(b.paginas) ? num(b.paginas, 5000) : null, veces: Number.isInteger(b.veces) && b.veces > 1 && b.veces < 20 ? b.veces : 1,
      medio: texto(b.medio, 20) });
  }
  const dias = new Map();
  if (crudo.dias && typeof crudo.dias === "object" && !Array.isArray(crudo.dias)) {
    for (const [d, m] of Object.entries(crudo.dias)) if (dia(d) && typeof m === "number" && Number.isFinite(m) && m >= 0 && m < 1440) dias.set(d, Math.round(m));
  }
  // «horas»: los minutos de cada día repartidos por hora (0 a 23), para la gráfica de a qué hora escuchas.
  const horas = new Map();
  if (crudo.horas && typeof crudo.horas === "object" && !Array.isArray(crudo.horas)) {
    for (const [d, hs] of Object.entries(crudo.horas)) {
      if (!dia(d) || !hs || typeof hs !== "object" || Array.isArray(hs)) continue;
      const m = new Map();
      for (const [h, v] of Object.entries(hs)) if (/^([01]?\d|2[0-3])$/.test(h) && typeof v === "number" && v > 0 && v <= 60) m.set(Number(h), Math.round(v));
      if (m.size) horas.set(d, m);
    }
  }
  // «libroDia»: qué libro escuchaste cada día (su id «u:…»), para sumar los minutos por libro.
  const libroDia = new Map();
  if (crudo.libroDia && typeof crudo.libroDia === "object" && !Array.isArray(crudo.libroDia)) {
    for (const [d, id] of Object.entries(crudo.libroDia)) if (dia(d) && typeof id === "string" && /^u:[A-Za-z0-9]{6,40}$/.test(id)) libroDia.set(d, id);
  }
  const meta = typeof crudo.meta === "number" && crudo.meta > 0 && crudo.meta < 1440 ? crudo.meta : 60;
  // Series, películas y podcasts (su hoja de Excel, 14-Oct): carteles de TMDB y portadas de Apple Podcasts.
  const imagen = (u) => (typeof u === "string" && (/^https:\/\/image\.tmdb\.org\/t\/p\/w\d{2,4}\/[A-Za-z0-9]{10,40}\.(jpg|png)$/.test(u)
    || /^https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[A-Za-z0-9/._-]{10,250}\/\d{2,4}x\d{2,4}bb\.(jpg|png)$/.test(u)
    || /^portadas\/[a-z0-9-]{1,60}\.(jpg|png|webp)$/.test(u)) ? u : null);      // portadas/…: las que no están en internet, en la rama de avance (18-Oct)
  const horasDe = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 100000 ? v : null);
  const estrellas = (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);
  const series = [];
  for (const x of Array.isArray(crudo.series) ? crudo.series.slice(0, 300) : []) {
    const titulo = texto(x && x.titulo, 120);
    if (!titulo) continue;
    series.push({ titulo, tipo: x.tipo === "Película" ? "Película" : "Serie", horas: horasDe(x.horas), genero: texto(x.genero, 60),
      nota: estrellas(x.nota), estado: ["terminado", "pendiente", "abandonado", "viendo"].includes(x.estado) ? x.estado : "terminado", portada: imagen(x.portada) });
  }
  const podcasts = [];
  for (const x of Array.isArray(crudo.podcasts) ? crudo.podcasts.slice(0, 300) : []) {
    const titulo = texto(x && x.titulo, 120);
    if (titulo) podcasts.push({ titulo, nota: estrellas(x.nota), portada: imagen(x.portada) });
  }
  // «estrenos»: lo nuevo en español de Netflix México (de TMDB), que escribe la tarea del Tablero. «obra» es «tv:<id>» o «movie:<id>».
  const estrenos = [];
  for (const x of Array.isArray(crudo.estrenos) ? crudo.estrenos.slice(0, 60) : []) {
    const titulo = texto(x && x.titulo, 120), obra = typeof x?.obra === "string" && /^(tv|movie):\d{1,10}$/.test(x.obra) ? x.obra : null;
    if (titulo && obra) estrenos.push({ obra, titulo, tipo: obra.startsWith("movie") ? "Película" : "Serie", fecha: dia(x.fecha), portada: imagen(x.portada),
      sinopsis: texto(x.sinopsis, 700), generos: texto(x.generos, 80), duracion: texto(x.duracion, 20) });
  }
  const g = crudo.granTotal;
  const granTotal = g && typeof g === "object" && horasDe(g.horas) !== null && dia(g.corte) ? { horas: g.horas, corte: g.corte, desde: dia(g.desde) } : null;
  return { libros, dias, horas, libroDia, meta, series, seriesHoras: horasDe(crudo.seriesHoras), podcasts, podcastsHoras: horasDe(crudo.podcastsHoras), granTotal, estrenos, estrenosDia: dia(crudo.estrenosDia) };
}

/** Desde qué día se dibuja la historia de cada nivel en el Atlas (su pedido del 10 de octubre: «starting today»). */
export const INICIO_HISTORIA = "2026-10-10";

/**
 * El promedio de unos temas al cierre de cada día, de «desde» a «hasta» (los dos incluidos).
 * Cada día se calcula con los sucesos que había hasta ese día, como si la página se abriera esa noche.
 * Devuelve [{ dia, pct }]; pct es null si ese día ninguno de los temas tenía porcentaje.
 */
export function historiaTemas(paquete, sucesos, ids, hasta = fechaLocal(new Date()), desde = INICIO_HISTORIA) {
  const lista = (sucesos || []).filter((e) => e && typeof e === "object").map((e) => ({ e, dia: fechaLocal(new Date(ms(e))) }));
  const salida = [];
  for (let dia = desde, vueltas = 0; dia <= hasta && vueltas < 800; dia = sumarDias(dia, 1), vueltas++) {
    const estado = calcular(paquete, lista.filter((x) => x.dia <= dia).map((x) => x.e));
    let suma = 0, con = 0;
    for (const id of ids) { const v = estado.temas.get(id)?.pct; if (v !== null && v !== undefined) { suma += v; con++; } }
    salida.push({ dia, pct: con ? suma / con : null });
  }
  return salida;
}

/** El promedio de un nivel, día por día (ver historiaTemas). */
export function historiaNivel(paquete, sucesos, nivel, hasta = fechaLocal(new Date()), desde = INICIO_HISTORIA) {
  return historiaTemas(paquete, sucesos, (paquete.temas || []).filter((t) => t.nivel === nivel).map((t) => t.id), hasta, desde);
}

/**
 * Tus tendencias de los últimos `dias` días (16-Oct-2026), para el Tablero. Solo cuentan los temas que has
 * practicado aquí: el promedio de todos los temas casi no se mueve, porque la mayoría trae su porcentaje de Kwiziq.
 * Devuelve {
 *   dias: ["AAAA-MM-DD", …] (el último es hoy), base: el día antes del primero,
 *   meta: [n por día] — temas practicados con porcentaje en tu meta o más, al cierre de cada día,
 *   practicados: n hoy, promedio: { antes, ahora } — promedio de tus temas practicados,
 *   subieron, bajaron: [{ tema, antes, ahora }] (hasta TOP_TENDENCIAS, los que más se movieron),
 *   cajas: { 4: [n por día], 5: [n por día] } — tarjetas en la caja de 30 y en la de 75 días,
 *   quedaron, olvidadas: [{ id, antes, ahora }] — escalones de las tarjetas que subieron o bajaron,
 * }.
 */
export const TOP_TENDENCIAS = 5;
export function tendencias(paquete, sucesos, hoy = fechaLocal(new Date()), dias = 7) {
  const lista = (sucesos || []).filter((e) => e && typeof e === "object").map((e) => ({ e, dia: fechaLocal(new Date(ms(e))) }));
  const meta = paquete.meta?.meta ?? META;
  const base = sumarDias(hoy, -dias);
  const fechas = [];
  for (let i = dias - 1; i >= 0; i--) fechas.push(sumarDias(hoy, -i));
  const al = (dia) => calcular(paquete, lista.filter((x) => x.dia <= dia).map((x) => x.e));
  const practicados = (E) => [...E.temas].filter(([, t]) => t.n > 0 && t.pct !== null);
  const E0 = al(base);
  const serie = [], cajas = { 4: [], 5: [] };
  let E = E0;
  for (const dia of fechas) {
    E = al(dia);
    serie.push(practicados(E).filter(([, t]) => t.pct >= meta).length);
    for (const k of [4, 5]) cajas[k].push([...E.tarjetas.values()].filter((t) => !t.quitada && t.toca && t.escalon === k).length);
  }
  const prom = (E) => { const l = practicados(E); return l.length ? l.reduce((a, [, t]) => a + t.pct, 0) / l.length : null; };
  // Los temas que contestaste en estos días: cuánto se movieron desde el día base.
  const enVentana = new Set(lista.filter((x) => x.e.t === "r" && x.dia > base && x.dia <= hoy).map((x) => x.e.tema));
  const mov = [...enVentana].map((id) => ({ tema: id, antes: E0.temas.get(id)?.pct ?? null, ahora: E.temas.get(id)?.pct ?? null }))
    .filter((x) => x.antes !== null && x.ahora !== null);
  const subieron = mov.filter((x) => x.ahora > x.antes).sort((a, b) => (b.ahora - b.antes) - (a.ahora - a.antes)).slice(0, TOP_TENDENCIAS);
  const bajaron = mov.filter((x) => x.ahora < x.antes).sort((a, b) => (a.ahora - a.antes) - (b.ahora - b.antes)).slice(0, TOP_TENDENCIAS);
  // Las tarjetas que cambiaron de caja. «Se te quedó»: subió (las más altas primero). «Se te olvidó»: bajó.
  const quedaron = [], olvidadas = [];
  for (const [id, t] of E.tarjetas) {
    if (t.quitada) continue;
    // Si reiniciaste el vocabulario en estos días, se compara contra el reinicio (todas nuevas), no contra antes.
    const reinicio = E.reinicioTj && E.reinicioTj > (E0.reinicioTj || 0);
    const a = E0.tarjetas.get(id), antes = reinicio ? -1 : a && a.toca ? a.escalon : -1, ahora = t.toca ? t.escalon : -1;
    if (ahora > antes) quedaron.push({ id, antes, ahora });
    else if (ahora < antes && antes >= 0) olvidadas.push({ id, antes, ahora });
  }
  quedaron.sort((a, b) => b.ahora - a.ahora || (b.ahora - b.antes) - (a.ahora - a.antes));
  olvidadas.sort((a, b) => (a.ahora - a.antes) - (b.ahora - b.antes) || b.antes - a.antes);
  const cuantasEn = (Ex, k) => [...Ex.tarjetas.values()].filter((t) => !t.quitada && t.toca && t.escalon === k).length;
  return {
    dias: fechas, base, meta: serie, metaPct: meta, practicados: practicados(E).length,
    metaBase: practicados(E0).filter(([, t]) => t.pct >= meta).length, cajasBase: { 4: cuantasEn(E0, 4), 5: cuantasEn(E0, 5) },
    promedio: { antes: prom(E0), ahora: prom(E) }, subieron, bajaron, cajas,
    subieronCaja: quedaron.length, olvidadasN: olvidadas.length,
    quedaron: quedaron.slice(0, TOP_TENDENCIAS), olvidadas: olvidadas.slice(0, TOP_TENDENCIAS),
  };
}

/**
 * Tu avance por nivel, como la gráfica de Kwiziq (17-Oct-2026): para cada día, desde tu primera respuesta de gramática
 * hasta hoy, qué parte de los temas de cada nivel ya contestaste aquí («cubiertos») y tu puntaje del nivel: la suma de
 * los porcentajes de sus temas entre todos sus temas (los que no has visto cuentan 0, así que nunca pasa de cubiertos).
 * Si hay más de «puntos» días, se toman días repartidos (siempre con el primero y hoy).
 * Devuelve { dias: [...], niveles: { B2: { total, cubiertos: [%], puntaje: [%], n: [temas cubiertos] } } }.
 */
export function progresoNiveles(paquete, sucesos, hoy = fechaLocal(new Date()), puntos = 60) {
  const lista = (sucesos || []).filter((e) => e && typeof e === "object").map((e) => ({ e, dia: fechaLocal(new Date(ms(e))) }));
  const resp = lista.filter((x) => x.e.t === "r").map((x) => x.dia).sort();
  // Si hoy los porcentajes de Kwiziq ya no cuentan, tampoco cuentan hacia atrás: la gráfica entera es solo lo de aquí.
  const sa = lista.filter((x) => x.e.t === "sinarranque").sort((a, b) => ms(a.e) - ms(b.e)).pop();
  if (sa && !(sa.e.deshacer === 1 || sa.e.deshacer === true)) lista.unshift({ e: { t: "sinarranque", id: "sa-retro", cuando: "2000-01-01T00:00:00Z" }, dia: "2000-01-01" });
  const desde = resp.length ? sumarDias(resp[0], -1) : hoy;
  let todos = [];
  for (let d = desde, v = 0; d <= hoy && v < 2000; d = sumarDias(d, 1), v++) todos.push(d);
  if (todos.length > puntos) {
    const paso = (todos.length - 1) / (puntos - 1);
    todos = [...new Set(Array.from({ length: puntos }, (_, i) => todos[Math.round(i * paso)]))];
  }
  const porNivel = new Map();
  for (const t of paquete.temas || []) { if (!porNivel.has(t.nivel)) porNivel.set(t.nivel, []); porNivel.get(t.nivel).push(t.id); }
  const niveles = {};
  for (const [n, ids] of porNivel) niveles[n] = { total: ids.length, cubiertos: [], puntaje: [], n: [] };
  for (const dia of todos) {
    const E = calcular(paquete, lista.filter((x) => x.dia <= dia).map((x) => x.e));
    for (const [n, ids] of porNivel) {
      let c = 0, suma = 0;
      for (const id of ids) { const t = E.temas.get(id); if (!t) continue; if (t.n > 0) c++; suma += t.pct ?? 0; }
      const N = niveles[n];
      N.n.push(c);
      N.cubiertos.push(Math.round((1000 * c) / ids.length) / 10);
      N.puntaje.push(Math.round((10 * suma) / ids.length) / 10);
    }
  }
  return { dias: todos, niveles };
}

/**
 * Tu avance en vocabulario, con la misma idea (17-Oct-2026): para cada día, qué parte de tu mazo ya viste («vistas»;
 * después de un reinicio, solo cuentan las que volviste a ver) y tu puntaje: qué tan arriba van tus tarjetas en la
 * escalera, en promedio sobre todo el mazo (la caja más alta = 100%; las que no has visto cuentan 0).
 * Empieza el día de tu último reinicio, o el día antes de tu primer repaso. Devuelve { dias, total, vistas, puntaje, n }.
 */
export function progresoVocab(paquete, sucesos, hoy = fechaLocal(new Date()), puntos = 60) {
  const lista = (sucesos || []).filter((e) => e && typeof e === "object").map((e) => ({ e, dia: fechaLocal(new Date(ms(e))) }));
  const reinicios = lista.filter((x) => x.e.t === "tjreinicio").map((x) => x.dia).sort();
  const repasos = lista.filter((x) => x.e.t === "tj").map((x) => x.dia).sort();
  const desde = reinicios.length ? reinicios[reinicios.length - 1] : repasos.length ? sumarDias(repasos[0], -1) : hoy;
  let dias = [];
  for (let d = desde, v = 0; d <= hoy && v < 2000; d = sumarDias(d, 1), v++) dias.push(d);
  if (dias.length > puntos) { const paso = (dias.length - 1) / (puntos - 1); dias = [...new Set(Array.from({ length: puntos }, (_, i) => dias[Math.round(i * paso)]))]; }
  const salida = { dias, total: 0, vistas: [], puntaje: [], n: [] };
  const tope = ESCALONES.length;
  for (const dia of dias) {
    const E = calcular(paquete, lista.filter((x) => x.dia <= dia).map((x) => x.e));
    let total = 0, vistas = 0, suma = 0;
    for (const t of E.tarjetas.values()) {
      if (t.quitada) continue;
      total++;
      const vista = E.reinicioTj ? t.nr > 0 : t.n > 0 || t.traia;
      if (vista) vistas++;
      if (t.toca) suma += (t.escalon + 1) / tope;
    }
    salida.total = total;
    salida.n.push(vistas);
    salida.vistas.push(total ? Math.round((1000 * vistas) / total) / 10 : 0);
    salida.puntaje.push(total ? Math.round((1000 * suma) / total) / 10 : 0);
  }
  return salida;
}

/** Tu puntaje de vocabulario con un estado ya calculado (la misma cuenta que progresoVocab), con un decimal. */
export function puntajeVocabDe(E) {
  const tope = ESCALONES.length;
  let total = 0, suma = 0;
  for (const t of E.tarjetas.values()) {
    if (t.quitada) continue;
    total++;
    if (t.toca) suma += (t.escalon + 1) / tope;
  }
  return total ? Math.round((1000 * suma) / total) / 10 : 0;
}

/**
 * Tu puntaje de vocabulario de los últimos 7 días, uno por día, para la curva del quiz (pedido el 22-Oct-2026):
 * { dias: [7 fechas, la última es hoy], puntaje: [7 números] }. Los seis días de antes salen de los sucesos de antes de
 * hoy y se guardan en `memo` (un objeto que el que llama conserva) mientras esos sucesos no cambien; el de hoy sale de
 * `Ehoy`, el estado que ya calculó la página, así que se mueve con cada palabra que calificas.
 */
export function semanaVocab(paquete, sucesos, hoy, Ehoy, memo = {}) {
  const dias = [];
  for (let k = 6; k >= 0; k--) dias.push(sumarDias(hoy, -k));
  const antes = (sucesos || []).filter((e) => e && typeof e === "object" && fechaLocal(new Date(ms(e))) < hoy);
  const clave = hoy + "|" + antes.length;
  if (memo.clave !== clave) {
    memo.clave = clave;
    memo.pasados = dias.slice(0, 6).map((d) => puntajeVocabDe(calcular(paquete, antes.filter((e) => fechaLocal(new Date(ms(e))) <= d))));
  }
  return { dias, puntaje: [...memo.pasados, puntajeVocabDe(Ehoy)] };
}

/** Los aciertos de una tarjeta al cierre de cada día: lo que traía de antes más sus repasos hasta ese día. */
export function historiaTarjeta(suya, hasta = fechaLocal(new Date()), desde = INICIO_HISTORIA) {
  const repasos = (suya?.historia || []).map((h) => ({ dia: fechaLocal(new Date(Date.parse(h.cuando) || 0)), bien: !!h.bien, peso: h.peso || 1 }));
  const salida = [];
  for (let dia = desde, vueltas = 0; dia <= hasta && vueltas < 800; dia = sumarDias(dia, 1), vueltas++) {
    let n = suya?.baseN || 0, bien = suya?.baseBien || 0;
    for (const r of repasos) if (r.dia <= dia) { n += r.peso; if (r.bien) bien += r.peso; }
    salida.push({ dia, pct: n ? (100 * bien) / n : null });
  }
  return salida;
}

/** La pregunta que sigue en un kwiz: { p, orden, total }, o null si ya no quedan. */
/** El id de la pregunta de un lugar del kwiz: «6152-01~2» (la vuelta de una fallada) es la 6152-01. */
export const preguntaDe = (lugar) => String(lugar).split("~")[0];

export function siguiente(estado, kwizId) {
  const k = estado.kwizzes.get(kwizId);
  if (!k || !k.pendientes.length) return null;
  return { p: k.pendientes[0], orden: k.resp.size + 1, total: k.resp.size + k.pendientes.length };
}

/** Cómo movió un kwiz el porcentaje de un tema: { antes, despues, bien, de }. */
export function cambioDeTema(estado, kwizId, temaId) {
  const k = estado.kwizzes.get(kwizId);
  const t = estado.temas.get(temaId);
  if (!k || !t) return null;
  const fin = k.terminado ? Date.parse(k.terminado) : Infinity;
  const suyas = estado.porTema.get(temaId) || [];
  const base = suyas.filter((r) => r.kwiz !== kwizId && ms(r) < fin);
  const propias = suyas.filter((r) => r.kwiz === kwizId);
  const { decaimiento, pesoArranque } = estado.parametros;
  const unos = (rs) => rs.slice().sort((a, b) => ms(b) - ms(a)).map((r) => (r.bien ? 1 : 0));
  return {
    antes: porcentaje(t.arranque, unos(base), decaimiento, pesoArranque),
    despues: porcentaje(t.arranque, unos([...base, ...propias]), decaimiento, pesoArranque),
    bien: propias.filter((r) => r.bien).length, de: propias.length,
  };
}

// ---------------------------------------------------------------- Escalera de formatos

/**
 * Qué tan difícil se pregunta un tema, según su caja (pedido el 15-Oct-2026, como la escalera de Kwiziq):
 *   0  nuevo, fallado o en las cajas de 1 y 2 días: tocar la respuesta (opciones);
 *   1  cajas de 5 y 12 días: escribir lo que falta (la pregunta de opciones, sin opciones);
 *   2  cajas de 30 y 75 días: escribir la frase completa, sin pista.
 */
export function formatoDelTema(estado, tema) {
  const i = estado.temas.get(tema);
  if (!i || !i.toca || (estado.debe && (estado.debe.get(tema) || 0) > 0)) return 0;
  return i.escalon <= 1 ? 0 : i.escalon <= 3 ? 1 : 2;
}

// ---------------------------------------------------------------- Armar un kwiz

/**
 * Elige las preguntas de un kwiz. Devuelve la lista de ids, ya en el orden en que salen.
 *
 * Reparto: 5 de tus temas más bajos, 3 de temas que ya toca repasar, 2 de temas que nunca has contestado aquí.
 * Si hay pocos temas con preguntas, se completa con los más bajos, hasta 3 preguntas por tema.
 * Un kwiz de un solo tema son 5 preguntas de ese tema.
 */
export function armar(paquete, estado, { tipo = "general", cuaderno = null, tema = null } = {}, hoy = fechaLocal(new Date()), azar = Math.random) {
  let vale = () => true;
  if (tipo === "tema" || tipo === "tutora") vale = (q) => q.tema === tema;
  else if (tipo === "cuaderno") {
    const c = (paquete.cuadernos || []).find((x) => x.id === cuaderno);
    const suyos = new Set(c ? c.temas : []);
    vale = (q) => suyos.has(q.tema);
  }
  const porTema = new Map();
  for (const q of paquete.preguntas || []) {
    if (q.estado !== "revisada" || estado.retiradas.has(q.id) || !estado.temas.has(q.tema) || !vale(q)) continue;
    if (!porTema.has(q.tema)) porTema.set(q.tema, []);
    porTema.get(q.tema).push({ ultima: estado.ultimaVez.get(q.id) || 0, suerte: azar(), id: q.id });
  }
  if (!porTema.size) return [];
  // Primero las que nunca has visto; luego las que viste hace más tiempo.
  // Escalera de formatos (15-Oct-2026): en las cajas de 30 y 75 días se prefieren las de escribir la frase;
  // antes, las de opciones (que en las cajas de 5 y 12 días se contestan escribiendo lo que falta). El Kwiz con la tutora no la usa.
  const tipoQ = new Map((paquete.preguntas || []).map((q) => [q.id, q.tipo]));
  for (const [t, lista] of porTema) {
    const quiere = tipo === "tutora" ? null : formatoDelTema(estado, t) === 2 ? "escribir" : "opcion";
    const pesa = (x) => (quiere && tipoQ.get(x.id) !== quiere ? 1 : 0);
    lista.sort((a, b) => (a.ultima ? 1 : 0) - (b.ultima ? 1 : 0) || pesa(a) - pesa(b) || a.ultima - b.ultima || a.suerte - b.suerte);
  }

  const info = (t) => estado.temas.get(t);
  const bajosPrimero = [...porTema.keys()].sort((a, b) => (info(a).pct ?? 0) - (info(b).pct ?? 0) || a - b);
  const total = tipo === "tutora" ? TOTAL_TUTORA : tipo === "tema" ? TOTAL_TEMA : TOTAL;
  const tope = tipo === "tutora" ? TOTAL_TUTORA : tipo === "tema" ? TOTAL_TEMA : TOPE_POR_TEMA;
  const elegidas = [];
  const cuenta = new Map();

  const tomar = (t) => {
    if (elegidas.length >= total || (cuenta.get(t) || 0) >= tope || !porTema.get(t).length) return false;
    elegidas.push(porTema.get(t).shift().id);
    cuenta.set(t, (cuenta.get(t) || 0) + 1);
    return true;
  };

  for (const t of bajosPrimero.slice(0, 5)) tomar(t);
  const vencidos = [...porTema.keys()].filter((t) => info(t).toca && info(t).toca <= hoy && !cuenta.has(t))
    .sort((a, b) => (info(a).toca < info(b).toca ? -1 : info(a).toca > info(b).toca ? 1 : a - b));
  for (const t of vencidos.slice(0, 3)) tomar(t);
  const nuevos = bajosPrimero.filter((t) => info(t).n === 0 && !cuenta.has(t));
  for (const t of nuevos.slice(0, 2)) tomar(t);
  let avanzo = true;
  while (elegidas.length < total && avanzo) {
    avanzo = false;
    for (const t of bajosPrimero) avanzo = tomar(t) || avanzo;
  }
  return barajar(elegidas, azar);
}

// ---------------------------------------------------------------- La lista de estudio
//
// Funciona como la de Kwiziq, que se observó el 9 de octubre de 2026 con tres exámenes de verdad:
// el examen trae una pregunta de cada tema de la lista; el tema que aciertas sale; el que fallas o saltas
// se queda, y después de acertarlo una vez sigue ahí una vuelta más. En su lugar entran temas nuevos.
// Aquí la lista es de cinco temas en lugar de diez.

function temasCon(paquete, estado, nivel = null) {
  const con = new Map();      // tema -> sus preguntas que se pueden usar
  const nivelDe = nivel ? new Map((paquete.temas || []).map((t) => [t.id, t.nivel])) : null;
  for (const q of paquete.preguntas || []) {
    if (q.estado !== "revisada" || estado.retiradas.has(q.id) || !estado.temas.has(q.tema)) continue;
    if (nivelDe && nivelDe.get(q.tema) !== nivel) continue;
    if (!con.has(q.tema)) con.set(q.tema, []);
    con.get(q.tema).push(q);
  }
  return con;
}

function kwizzesDeLista(estado) {
  return [...estado.kwizzes.values()].filter((k) => k.tipo === "lista")
    .sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando) || (a.id < b.id ? -1 : 1));
}

function temasDeKwiz(paquete, k) {
  const deQue = new Map((paquete.preguntas || []).map((q) => [q.id, q.tema]));
  const vistos = [];
  for (const p of k.preguntas) {
    const t = deQue.has(p) ? deQue.get(p) : (k.resp.get(p) || {}).tema;
    if (t !== undefined && !vistos.includes(t)) vistos.push(t);
  }
  return vistos;
}

/**
 * La lista de estudio de ahora.
 * Devuelve { temas, quedan, salen, entran, abierto, ultimo }:
 *   temas   los temas de la lista, en orden;
 *   abierto el kwiz de la lista que está a medias, si hay uno (mientras no lo termines, la lista no se mueve);
 *   quedan, salen, entran  qué pasó con la lista después del último kwiz terminado.
 */
export function listaDeEstudio(paquete, estado, hoy = fechaLocal(new Date())) {
  const con = temasCon(paquete, estado, estado.enfoque);       // con enfoque, el plan solo trae temas de ese nivel
  const todos = kwizzesDeLista(estado);
  const ultimo = todos.length ? todos[todos.length - 1] : null;
  if (ultimo && ultimo.pendientes.length) {
    return { temas: temasDeKwiz(paquete, ultimo), quedan: [], salen: [], entran: [], abierto: ultimo, ultimo };
  }
  const anteriores = ultimo ? temasDeKwiz(paquete, ultimo) : [];
  const quedan = [];
  for (const t of anteriores) {
    if (!con.has(t)) continue;
    const suyas = [...ultimo.resp.values()].filter((r) => r.tema === t && !estado.retiradas.has(r.p));
    const fallo = suyas.some((r) => !r.bien);
    if (!suyas.length || fallo || (estado.debe.get(t) || 0) > 0) quedan.push(t);     // sin contestar, fallado o todavía debe aciertos
  }
  const salen = anteriores.filter((t) => !quedan.includes(t));

  // Quién entra (cuota diaria, su regla del 22-Oct-2026): primero todos los que ya toca repasar, el más vencido primero;
  // luego temas nuevos, los más bajos, hasta NUEVOS_TEMAS_AL_DIA al día (cuentan los que viste por primera vez hoy).
  const info = (t) => estado.temas.get(t);
  const libres = [...con.keys()].filter((t) => !quedan.includes(t) && !salen.includes(t));
  const porBajo = (a, b) => (info(a).pct ?? 0) - (info(b).pct ?? 0) || a - b;
  const porFecha = (a, b) => (info(a).toca < info(b).toca ? -1 : info(a).toca > info(b).toca ? 1 : porBajo(a, b));
  const tocan = libres.filter((t) => info(t).toca && info(t).toca <= hoy).sort(porFecha);
  const nuevos = libres.filter((t) => !info(t).toca).sort(porBajo);
  const despues = libres.filter((t) => info(t).toca && info(t).toca > hoy).sort(porFecha);
  const nuevosHoy = [...con.keys()].filter((t) => info(t).primera && fechaLocal(info(t).primera) === hoy).length;
  let cupo = Math.max(0, NUEVOS_TEMAS_AL_DIA - nuevosHoy);
  const temas = quedan.slice();
  while (temas.length < LISTA && tocan.length) temas.push(tocan.shift());
  while (temas.length < LISTA && cupo > 0 && nuevos.length) { temas.push(nuevos.shift()); cupo--; }
  // Si ya no hay repasos ni cupo, entran nuevos de más, como «Adelantar» del vocabulario (su regla del 22-Oct-2026):
  // la cuota solo frena los nuevos cuando hay repasos esperando. Si ya no hay nuevos, vuelven antes de tiempo los que
  // tocan más pronto y luego los que acaban de salir: mejor repetir que quedarse sin kwiz.
  for (const t of [...nuevos, ...despues, ...salen.filter((x) => con.has(x)).sort(porBajo)]) {
    if (temas.length >= LISTA) break;
    temas.push(t);
  }
  return { temas, quedan, salen: salen.filter((t) => !temas.includes(t)), entran: temas.filter((t) => !anteriores.includes(t)), abierto: null, ultimo };
}

/**
 * Lo que te queda HOY de gramática, por grupo (su idea del 22-Oct-2026): { nuevos, vencidos, fallados }.
 * Cada tema cae en un solo grupo: fallado si todavía debe aciertos (de cualquier día); vencido si no debe nada y ya le
 * tocaba; nuevo si no tiene fecha, hasta lo que queda de la cuota de NUEVOS_TEMAS_AL_DIA. Respeta el enfoque.
 */
export function cuentaDelDia(paquete, estado, hoy = fechaLocal(new Date())) {
  const d = temasDelDia(paquete, estado, hoy);
  return { nuevos: d.nuevos.length, vencidos: d.vencidos.length, fallados: d.fallados.length };
}

/**
 * Los temas de hoy, uno por uno (25-Oct-2026, para marcarlos en el Atlas del quiz): { nuevos, vencidos, fallados }.
 * Los mismos que cuenta cuentaDelDia. Los nuevos son los que quedan de la cuota del día, los más bajos primero
 * (como entran a tu plan).
 */
export function temasDelDia(paquete, estado, hoy = fechaLocal(new Date())) {
  const con = temasCon(paquete, estado, estado.enfoque);
  const nuevos = [], vencidos = [], fallados = [];
  let nuevosHoy = 0;
  for (const t of con.keys()) {
    const i = estado.temas.get(t);
    if (i.primera && fechaLocal(i.primera) === hoy) nuevosHoy++;
    if ((estado.debe.get(t) || 0) > 0) fallados.push(t);
    else if (i.toca && i.toca <= hoy) vencidos.push(t);
    else if (!i.toca) nuevos.push(t);
  }
  nuevos.sort((a, b) => (estado.temas.get(a).pct ?? 0) - (estado.temas.get(b).pct ?? 0) || a - b);
  return { nuevos: nuevos.slice(0, Math.max(0, NUEVOS_TEMAS_AL_DIA - nuevosHoy)), vencidos, fallados };
}

/** Qué pasó con la lista después de un kwiz ya terminado: { quedan, salen, entran }, o null si no es de la lista. */
export function cambiosDeLista(paquete, estado, kwizId, hoy = fechaLocal(new Date())) {
  const k = estado.kwizzes.get(kwizId);
  if (!k || k.tipo !== "lista" || !k.terminado) return null;
  const todos = kwizzesDeLista(estado);
  const sigue = todos[todos.indexOf(k) + 1];
  const suyos = temasDeKwiz(paquete, k);
  const despues = sigue ? temasDeKwiz(paquete, sigue) : listaDeEstudio(paquete, estado, hoy).temas;
  return {
    quedan: suyos.filter((t) => despues.includes(t)),
    salen: suyos.filter((t) => !despues.includes(t)),
    entran: despues.filter((t) => !suyos.includes(t)),
  };
}

/**
 * Las preguntas del kwiz de la lista: una por tema, en el orden de la lista.
 * Un tema que acabas de fallar trae primero otra pregunta; a la vuelta siguiente regresa la que fallaste.
 */
export function armarLista(paquete, estado, hoy = fechaLocal(new Date()), azar = Math.random) {
  const con = temasCon(paquete, estado);

  const elegidas = [];
  for (const t of listaDeEstudio(paquete, estado, hoy).temas) {
    const suyas = (con.get(t) || []).map((q) => ({ id: q.id, ultima: estado.ultimaVez.get(q.id) || 0, suerte: azar() }))
      .sort((a, b) => a.ultima - b.ultima || a.suerte - b.suerte);
    if (!suyas.length) continue;
    const fallada = estado.fallada.get(t);
    const debe = estado.debe.get(t) || 0;
    let elegida = suyas[0].id;
    if (debe === 1 && suyas.some((q) => q.id === fallada)) elegida = fallada;
    else if (debe >= ACIERTOS_PARA_SALIR && elegida === fallada && suyas.length > 1) elegida = suyas[1].id;
    elegidas.push(elegida);
  }
  // Revueltas (su pedido del 25-Oct-2026): así no sale siempre primero el mismo tema.
  return barajar(elegidas, azar);
}

/** Cuántos temas con preguntas hay en cada nivel: { A2: 18, B1: 2 }. Sirve para ofrecer el enfoque. */
export function nivelesConPreguntas(paquete, estado) {
  const nivelDe = new Map((paquete.temas || []).map((t) => [t.id, t.nivel]));
  const cuenta = {};
  for (const t of temasCon(paquete, estado).keys()) cuenta[nivelDe.get(t)] = (cuenta[nivelDe.get(t)] || 0) + 1;
  return cuenta;
}

// ---------------------------------------------------------------- Fotos prestadas a las tarjetas

/** Una tarjeta conserva su foto mientras toque en los próximos FOTO_DIAS días (o siga sin fecha). */
export const FOTO_DIAS = 30;

/**
 * La foto de una tarjeta de vocabulario. Cada tarjeta «viva» tiene una foto propia que ninguna otra tarjeta viva tiene.
 * Viva: no la quitaste y toca dentro de FOTO_DIAS días, o todavía no tiene fecha. Cuando se aleja, su foto regresa al montón.
 * Si la tarjeta ya tuvo una foto y nadie vivo la tiene, se queda con la misma. Si no, toma una libre: primero las que
 * nunca se han prestado, luego la que lleva más tiempo sin prestarse. Si todas están ocupadas, repite la de menos uso.
 * Devuelve { foto, nueva }: «nueva» dice si hay que apuntar el préstamo («ftj»).
 */
export function fotoDeTarjeta(estado, idTarjeta, nombres, hoy = fechaLocal(new Date())) {
  if (!nombres || !nombres.length) return { foto: null, nueva: false };
  const disponibles = new Set(nombres);
  const limite = sumarDias(hoy, FOTO_DIAS);
  const prestamos = (estado && estado.fotosTarjeta) || new Map();
  const viva = (id) => {
    const s = estado.tarjetas && estado.tarjetas.get(id);
    return !!s && !s.quitada && (!s.toca || s.toca <= limite);
  };
  // Quién tiene cada foto: entre las vivas, el préstamo más reciente gana.
  const duenos = new Map(), ultimoUso = new Map();
  for (const [id, p] of prestamos) {
    if (!disponibles.has(p.foto)) continue;
    if (!ultimoUso.has(p.foto) || p.cuando > ultimoUso.get(p.foto)) ultimoUso.set(p.foto, p.cuando);
    if (id === idTarjeta || !viva(id)) continue;
    const d = duenos.get(p.foto);
    if (!d || p.cuando > d.cuando) duenos.set(p.foto, { id, cuando: p.cuando });
  }
  const mia = prestamos.get(idTarjeta);
  if (mia && disponibles.has(mia.foto)) {
    const d = duenos.get(mia.foto);
    if (!d || d.cuando < mia.cuando) return { foto: mia.foto, nueva: false };
  }
  const libres = nombres.filter((n) => !duenos.has(n));
  const azar = azarDe("foto#" + idTarjeta);
  const nunca = libres.filter((n) => !ultimoUso.has(n));
  if (nunca.length) return { foto: nunca[Math.floor(azar() * nunca.length)], nueva: true };
  const pool = libres.length ? libres : nombres.slice();
  pool.sort((a, b) => ((ultimoUso.get(a) || "") < (ultimoUso.get(b) || "") ? -1 : (ultimoUso.get(a) || "") > (ultimoUso.get(b) || "") ? 1 : a < b ? -1 : 1));
  return { foto: pool[0], nueva: true };
}

// ---- La tutora del día (el fondo de todas las páginas fuera de lecciones y quizzes) y sus clips de premio.
// Cada cumplido del tablero se ve con un tramo de la escena de la tutora del día; la manzana, con su final.
/** Qué tipo de escena (contenido/tutoras/escalada.json) va con cada premio del tablero. */
export const ESCENA_DE_PREMIO = Object.freeze({ mano: "mano", boca: "mamada", papaya: "papaya", durazno: "doggy", animo: "final" });

/** Si las escenas de una tutora traen un tramo para cada premio (mano, boca, papaya, durazno y el final). */
export function tieneClips(escenas) {
  if (!Array.isArray(escenas)) return false;
  const hay = new Set(escenas.filter((e) => e && e.tramos && e.tramos.length).map((e) => e.tipo));
  return Object.values(ESCENA_DE_PREMIO).every((t) => hay.has(t));
}

/** Todos los tramos [de, a] de un tipo de escena, en orden, juntando sus apariciones. [] si no hay. */
export function tramosDe(escenas, tipo) {
  return (escenas || []).filter((e) => e && e.tipo === tipo).flatMap((e) => e.tramos || []);
}

/**
 * La tutora del día: entre las lecciones que pueden serlo, una distinta cada día, por turno y en orden de número.
 * El turno se cuenta en días desde 1970, así que el mismo día da la misma en todos tus aparatos.
 * `fecha` es «2026-10-14» (hora de este aparato). Devuelve el número de la lección, o null si no hay ninguna.
 */
export function tutoraDelDia(candidatas, fecha, salto = 0) {
  const lista = [...new Set(candidatas || [])].map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!lista.length) return null;
  const [a, m, d] = String(fecha).split("-").map(Number);
  const dia = Math.floor(Date.UTC(a, m - 1, d) / 86400000);
  const i = dia + (Number(salto) || 0);
  return lista[((i % lista.length) + lista.length) % lista.length];
}

/**
 * Lo que te toca repasar cada día que viene (pedido del 23-Oct-2026 para la Bitácora, como el mapa de Anki):
 * Map día → { v: tarjetas, g: temas }. Solo repasos con fecha (lo del círculo amarillo): nada de nuevas ni de
 * temas nuevos, porque esos dependen de cómo te vaya. Una tarjeta y un tema pesan lo mismo.
 * Hoy junta también todo lo atrasado (y los temas que debes por fallarlos).
 */
export function cargaFutura(paquete, estado, hoy = fechaLocal(new Date()), dias = 60) {
  const fin = new Date(hoy + "T12:00:00"); fin.setDate(fin.getDate() + dias);
  const ultimo = fechaLocal(fin);
  const carga = new Map();
  const sumar = (dia, k) => { const x = carga.get(dia) || { v: 0, g: 0 }; x[k]++; carga.set(dia, x); };
  for (const c of mazo(paquete, estado)) {
    const s = estado.tarjetas && estado.tarjetas.get(c.id);
    if (!s || s.quitada || !s.toca) continue;
    const dia = s.toca < hoy ? hoy : s.toca;
    if (dia <= ultimo) sumar(dia, "v");
  }
  for (const t of temasCon(paquete, estado, estado.enfoque).keys()) {
    const i = estado.temas.get(t);
    if ((estado.debe.get(t) || 0) > 0) { sumar(hoy, "g"); continue; }
    if (!i.toca) continue;
    const dia = i.toca < hoy ? hoy : i.toca;
    if (dia <= ultimo) sumar(dia, "g");
  }
  return carga;
}

// ---------------------------------------------------------------- El ritmo del plan (24-Oct-2026)
// La línea punteada de las gráficas de avance: dónde irías si cumplieras la cuota de cada día, y cuándo terminarías.
// Las cuentas salen de las mismas reglas que deciden qué entra cada día; no se inventa ninguna meta.

/** Días entre dos fechas «AAAA-MM-DD» (b menos a). */
export function diasEntre(a, b) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5); }
export const INICIO_CUOTA_GRAMATICA = "2026-10-22";       // el día que empezó la cuota de NUEVOS_TEMAS_AL_DIA

/**
 * Vocabulario: desde tu último reinicio entran NUEVAS_AL_DIA palabras nuevas al día (el día del reinicio es el día 1).
 * Devuelve { desde, total, porDia, fin, enDia(d) -> palabras vistas al ritmo ese día } o null si nunca reiniciaste.
 * «total» son tus palabras de hoy (sin las quitadas): si agregas palabras, la fecha de fin se recorre sola.
 */
export function ritmoVocab(sucesos, total) {
  const reinicios = (sucesos || []).filter((e) => e && e.t === "tjreinicio").map((e) => fechaLocal(new Date(ms(e)))).sort();
  if (!reinicios.length || !total) return null;
  const desde = reinicios[reinicios.length - 1], porDia = NUEVAS_AL_DIA;
  const fin = sumarDias(desde, Math.ceil(total / porDia) - 1);
  return { desde, total, porDia, fin, enDia: (d) => (d < desde ? null : Math.min(total, porDia * (diasEntre(desde, d) + 1))) };
}

/**
 * Gramática de un nivel: solo cuando es tu enfoque (los temas nuevos solo entran de ahí). Desde el día que empezó la
 * cuota, o el día que escogiste ese enfoque si fue después, entran NUEVOS_TEMAS_AL_DIA al día, partiendo de los temas
 * que ya habías cubierto el día anterior. La meta son los temas del nivel que tienen preguntas (los demás no se pueden
 * cubrir). Devuelve { desde, base, meta, total, porDia, fin, enDia(d) } o null.
 */
export function ritmoNivel(paquete, sucesos, nivel) {
  const lista = (sucesos || []).filter((e) => e && typeof e === "object");
  const E = calcular(paquete, lista);
  if (E.enfoque !== nivel) return null;
  const elegido = lista.filter((e) => e.t === "enfoque" && e.nivel === nivel).map((e) => fechaLocal(new Date(ms(e)))).sort().pop();
  const desde = elegido && elegido > INICIO_CUOTA_GRAMATICA ? elegido : INICIO_CUOTA_GRAMATICA;
  const ids = (paquete.temas || []).filter((t) => t.nivel === nivel).map((t) => t.id);
  const meta = temasCon(paquete, E, nivel).size;
  if (!meta) return null;
  const ayer = sumarDias(desde, -1);
  const Eb = calcular(paquete, lista.filter((e) => fechaLocal(new Date(ms(e))) <= ayer));
  let base = 0;
  for (const id of ids) { const t = Eb.temas.get(id); if (t && t.n > 0) base++; }
  const porDia = NUEVOS_TEMAS_AL_DIA;
  const fin = base >= meta ? desde : sumarDias(desde, Math.ceil((meta - base) / porDia) - 1);
  return { desde, base, meta, total: ids.length, porDia, fin, enDia: (d) => (d < ayer ? null : Math.min(meta, base + porDia * diasEntre(ayer, d))) };
}
