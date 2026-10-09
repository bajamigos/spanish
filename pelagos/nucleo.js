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
export const TOTAL = 10;
export const TOTAL_TEMA = 5;
export const TOPE_POR_TEMA = 3;

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
 * Sucesos: «kwiz» (empieza uno), «r» (una respuesta), «retirar» (pregunta mala), «dejar» (dejas un kwiz a medias).
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

  for (const e of lista) {
    if (e.t === "retirar" && e.p) retiradas.add(e.p);
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

  return { temas, kwizzes, retiradas, ultimaVez, respuestas: respuestas.length, porTema, parametros };
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
