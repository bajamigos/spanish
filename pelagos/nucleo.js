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
export const TOPE_POR_TEMA = 3;
// La lista de estudio: cuántos temas trae y cuántos aciertos seguidos pide un tema que fallaste para poder salir.
export const LISTA = 5;
export const KWIZZES_AL_DIA = 5;                 // la medida diaria de kwizzes
export const ACIERTOS_PARA_SALIR = 2;

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
 * «enfoque» (eliges un nivel para tu plan de estudio, o lo sueltas).
 * Los de un tipo que no conoce los salta, así una versión vieja de la página no se rompe con sucesos nuevos.
 * Devuelve { temas, kwizzes, retiradas, ultimaVez, respuestas, parametros }.
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
  let enfoque = null;          // el nivel en el que te enfocas («A2»), o null si van todos los niveles

  for (const e of lista) {
    if (e.t === "enfoque") enfoque = typeof e.nivel === "string" && e.nivel ? e.nivel : null;
    else if (e.t === "retirar" && e.p) retiradas.add(e.p);
    else if (e.t === "dejar" && e.kwiz) dejados.add(e.kwiz);
    else if (e.t === "kwiz" && Array.isArray(e.preguntas) && !kwizzes.has(e.id)) {
      kwizzes.set(e.id, {
        id: e.id, tipo: e.tipo || "general", cuaderno: e.cuaderno ?? null, tema: e.tema ?? null,
        cuando: e.cuando, preguntas: e.preguntas.slice(), resp: new Map(),
        terminado: null, bien: 0, total: 0, pendientes: [], dejado: false,
      });
    } else if (e.t === "r" && e.p && e.kwiz) {
      const clave = e.kwiz + "|" + e.p;       // una sola respuesta por pregunta en cada kwiz: vale la primera
      if (dadas.has(clave)) continue;
      dadas.add(clave);
      respuestas.push(e);
    }
  }

  // Porcentaje de cada tema.
  const porTema = new Map();
  const ultimaVez = new Map();
  for (const r of respuestas) {
    const k = kwizzes.get(r.kwiz);
    if (k) k.resp.set(r.p, r);
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
    const arranque = t.arranque === null || t.arranque === undefined ? null : Math.min(100, Math.max(0, t.arranque));
    const recientes = suyas.slice().reverse();
    temas.set(t.id, {
      pct: porcentaje(arranque, recientes.map((r) => (r.bien ? 1 : 0)), parametros.decaimiento, parametros.pesoArranque),
      n: suyas.length, arranque, ultima: suyas.length ? suyas[suyas.length - 1].cuando : null,
      escalon: 0, toca: null,
    });
  }

  // Cada kwiz: qué falta, y si ya se acabó, cuántas bien.
  const cerrados = [];
  for (const k of kwizzes.values()) {
    k.dejado = dejados.has(k.id);        // un kwiz que dejaste se cierra con lo que alcanzaste a contestar
    k.pendientes = k.dejado ? [] : k.preguntas.filter((p) => !k.resp.has(p) && preguntas.has(p) && !retiradas.has(p));
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

  return { temas, kwizzes, retiradas, ultimaVez, respuestas: respuestas.length, porTema, parametros, debe, fallada, enfoque };
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
 * El tablero del día: lo que Pelagos no puede contar solo (lo que escuchaste, tu clase, tus tarjetas, el check-in).
 * Lo escribe alguien más en tablero/hoy.json. Aquí solo se revisa su forma; lo que venga mal hecho se tira.
 * Devuelve { dia, leido, atuendo, foto, medidas, extras, checkin } o null.
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
      if (nombre !== null) partes.push({ nombre, va: x.va === true });
    }
    checkin = { estado: c.estado, nivel: numero(c.nivel), nombre: texto(c.nombre, 40), titulo: texto(c.titulo, 120),
      minutos: numero(c.minutos), partes, falta: texto(c.falta, 400), puesto: momento(c.puesto) };
  }
  const foto = typeof crudo.foto === "string" && /^[a-z0-9-]+\.jpg$/.test(crudo.foto) ? crudo.foto : null;
  return { dia: crudo.dia, leido: momento(crudo.leido), atuendo: texto(crudo.atuendo, 200), foto, medidas, extras, checkin };
}

/** La pregunta que sigue en un kwiz: { p, orden, total }, o null si ya no quedan. */
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
  if (tipo === "tema") vale = (q) => q.tema === tema;
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
  for (const lista of porTema.values()) lista.sort((a, b) => a.ultima - b.ultima || a.suerte - b.suerte);

  const info = (t) => estado.temas.get(t);
  const bajosPrimero = [...porTema.keys()].sort((a, b) => (info(a).pct ?? 0) - (info(b).pct ?? 0) || a - b);
  const total = tipo === "tema" ? TOTAL_TEMA : TOTAL;
  const tope = tipo === "tema" ? TOTAL_TEMA : TOPE_POR_TEMA;
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

  // Quién entra: se alternan los que ya toca repasar y los más bajos que todavía no tienen fecha.
  const info = (t) => estado.temas.get(t);
  const libres = [...con.keys()].filter((t) => !quedan.includes(t) && !salen.includes(t));
  const porBajo = (a, b) => (info(a).pct ?? 0) - (info(b).pct ?? 0) || a - b;
  const tocan = libres.filter((t) => info(t).toca && info(t).toca <= hoy).sort((a, b) => (info(a).toca < info(b).toca ? -1 : info(a).toca > info(b).toca ? 1 : porBajo(a, b)));
  const nuevos = libres.filter((t) => !info(t).toca).sort(porBajo);
  const despues = libres.filter((t) => info(t).toca && info(t).toca > hoy).sort((a, b) => (info(a).toca < info(b).toca ? -1 : info(a).toca > info(b).toca ? 1 : porBajo(a, b)));
  const temas = quedan.slice();
  let turno = 0;
  while (temas.length < LISTA && (tocan.length || nuevos.length)) {
    const fila = (turno++ % 2 === 0 ? (tocan.length ? tocan : nuevos) : (nuevos.length ? nuevos : tocan));
    temas.push(fila.shift());
  }
  // Si no alcanza, vuelven los que acaban de salir y luego los que todavía no toca: mejor repetir que quedarse sin kwiz.
  for (const t of [...salen.filter((x) => con.has(x)).sort(porBajo), ...despues]) {
    if (temas.length >= LISTA) break;
    temas.push(t);
  }
  return { temas, quedan, salen: salen.filter((t) => !temas.includes(t)), entran: temas.filter((t) => !anteriores.includes(t)), abierto: null, ultimo };
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
  return elegidas;
}

/** Cuántos temas con preguntas hay en cada nivel: { A2: 18, B1: 2 }. Sirve para ofrecer el enfoque. */
export function nivelesConPreguntas(paquete, estado) {
  const nivelDe = new Map((paquete.temas || []).map((t) => [t.id, t.nivel]));
  const cuenta = {};
  for (const t of temasCon(paquete, estado).keys()) cuenta[nivelDe.get(t)] = (cuenta[nivelDe.get(t)] || 0) + 1;
  return cuenta;
}
