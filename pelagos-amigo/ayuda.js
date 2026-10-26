// Cómo funciona · Vista previa: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=d5603222f7";
import * as A from "./almacen.js?v=d5603222f7";
import { DESHACER_MS, E, P, info, meta, poner, porId, verNoExiste } from "./app.js?v=d5603222f7";
import { $, CATEGORIAS, KWIZIQ } from "./base.js?v=d5603222f7";
import { ancho, esc, pct, plural, titulo, tono } from "./texto.js?v=d5603222f7";
import { activarGrafica, hojaV, htmlGrafica } from "./acervo.js?v=d5603222f7";

// ---------------------------------------------------------------- Cómo funciona (la ayuda, 16-Oct-2026)
//
// Las páginas viven en el contenido (contenido/ayuda.json), no aquí: la página pública no dice nada del método.
// Sus números van entre llaves y se toman del motor al pintar, así que nunca se quedan viejos.

/** Qué página de ayuda abre el «?» de arriba, según dónde estás. */
const AYUDA_DE = [
  [/^\/gramatica\/quiz/, "quiz"],
  [/^\/kwiz/, "quiz"],
  [/^\/gramatica\/atlas$/, "porcentaje"],
  [/^\/gramatica\/[a-z0-9]+\/atascados$/, "atascadas"],
  [/^\/gramatica(\/[a-z0-9]+)?(\/bajo)?$/, "porcentaje"],
  [/^\/(leccion|tutoras)(\/|$)/, "tutoras"],
  [/^\/vocabulario/, "tarjetas"],
  [/^\/podcasts$/, "podcasts"],
  [/^\/(clases|bitacora|lectura)?$/, "tablero"],
];

function ayudaLista() { return (P && P.ayuda && P.ayuda.paginas) || []; }
function ayudaPagina(slug) { return ayudaLista().find((p) => p.slug === slug) || null; }

/** «Cómo funciona», abajo de Ajustes (17-Oct-2026; antes era un «?» arriba): lleva a la página que explica donde estás (o al índice). */
function ponerSignoAyuda() {
  const q = $("ayudaLink");
  if (!q) return;
  const camino = window.location.hash.replace(/^#/, "") || "/";
  q.hidden = !ayudaLista().length || !A.hayLlave() || !P;
  q.removeAttribute("aria-current");
  if (camino.startsWith("/ayuda")) { q.href = "#/ayuda"; q.setAttribute("aria-current", "page"); q.textContent = "Cómo funciona"; return; }
  const fila = AYUDA_DE.find(([re]) => re.test(camino));
  const pag = fila && ayudaPagina(fila[1]);
  q.href = pag ? "#/ayuda/" + pag.slug : "#/ayuda";
  q.textContent = "Cómo funciona";
  q.setAttribute("aria-label", pag ? "Cómo funciona: " + pag.titulo : "Cómo funciona");
}

/** Los números del motor que la ayuda nombra entre llaves. */
function numerosAyuda() {
  const dias = (d) => (d === 1 ? "1 día" : d + " días");
  const e = N.ESCALONES;
  const n = {
    ESCALONES: e.slice(0, -1).join(", ") + " y " + e[e.length - 1] + " días", N_ESCALONES: e.length,
    NUEVAS_AL_DIA: N.NUEVAS_AL_DIA, KWIZZES_AL_DIA: N.KWIZZES_AL_DIA, LISTA: N.LISTA, NUEVOS_TEMAS_AL_DIA: N.NUEVOS_TEMAS_AL_DIA, DESHACER_S: DESHACER_MS / 1000, ACIERTOS_PARA_SALIR: N.ACIERTOS_PARA_SALIR,
    META: meta(), DECAIMIENTO: E ? E.parametros.decaimiento : N.DECAIMIENTO, PESO_ARRANQUE: E ? E.parametros.pesoArranque : N.PESO_ARRANQUE,
    TOTAL_TEMA: N.TOTAL_TEMA, TOTAL_TUTORA: N.TOTAL_TUTORA, ACIERTOS_TUTORA: N.ACIERTOS_TUTORA,
    SOSPECHA_FALLAS: N.SOSPECHA_FALLAS, SOSPECHA_PCT: N.SOSPECHA_PCT, SOSPECHA_MIN: N.SOSPECHA_MIN,
    ATASCADO_FALLOS: N.ATASCADO_FALLOS, ATASCADO_DIAS: N.ATASCADO_DIAS,
  };
  e.forEach((d, i) => { n["E" + i] = dias(d); });
  return n;
}
const conNumeros = (texto, n = numerosAyuda()) => String(texto ?? "").replace(/\{([A-Z0-9_]+)\}/g, (todo, k) => (k in n ? String(n[k]) : todo));

/** Texto de la ayuda -> HTML: los números del motor, **negrita** y los enlaces [[ayuda:slug|…]] y [[g:clave|…]]. */
function marcaAyuda(texto, n) {
  let s = esc(conNumeros(texto, n));
  s = s.replace(/\[\[ayuda:([a-z0-9-]+)\|([^\]]+)\]\]/g, (_, slug, dentro) => `<a href="#/ayuda/${slug}">${dentro}</a>`);
  s = s.replace(/\[\[g:([a-z0-9-]+)\|([^\]]+)\]\]/g, (_, clave, dentro) => `<button type="button" class="lk" data-glosa="${clave}">${dentro}</button>`);
  s = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  return s;
}
function verAyuda(o) {
  const lista = ayudaLista();
  if (!lista.length) return verNoExiste("Todavía no hay páginas de ayuda en tu contenido.");
  poner(`
  <section class="card">
    <h1 class="h">Cómo funciona</h1>
    <p>El método y las reglas de Pelagos, una página por tema.</p>
    <ul class="ayudaIdx">${lista.map((p) => `<li><a href="#/ayuda/${p.slug}"><b>${esc(p.titulo)}</b><span>${esc(p.resumen)}</span></a></li>`).join("")}</ul>
  </section>`, { titulo: "Cómo funciona · Pelagos", nav: "ayuda", conserva: o.conserva });
}

function verPaginaAyuda(o, slug) {
  const p = ayudaPagina(slug);
  if (!p) return verNoExiste("Esa página de ayuda no existe.");
  const n = numerosAyuda(), G = (P.ayuda && P.ayuda.glosario) || {};
  const lista = ayudaLista(), i = lista.indexOf(p), sigue = lista[i + 1];
  const secciones = p.secciones.map((s) => `
    <section class="card ayudaPag">
      ${s.h ? `<h2>${esc(conNumeros(s.h, n))}</h2>` : ""}
      ${(s.p || []).map((x) => `<p${/^P = /.test(x) ? ' class="formula"' : ""}>${marcaAyuda(x, n)}</p>`).join("")}
      ${s.lista ? `<ul>${s.lista.map((x) => `<li>${marcaAyuda(x, n)}</li>`).join("")}</ul>` : ""}
    </section>`).join("");
  const terminos = Object.entries(G).sort((a, b) => a[1].termino.localeCompare(b[1].termino, "es"));
  const glosa = p.glosario ? `<section class="card ayudaPag"><dl class="glosa">${terminos.map(([k, g]) => `<dt id="g-${k}">${esc(g.termino)}</dt><dd>${marcaAyuda(g.def, n)}</dd>`).join("")}</dl></section>` : "";
  poner(`
  <section class="card">
    <p class="small"><a href="#/ayuda">Cómo funciona</a></p>
    <h1 class="h">${esc(p.titulo)}</h1>
    ${p.resumen ? `<p>${esc(p.resumen)}</p>` : ""}
  </section>
  ${secciones}${glosa}
  <section class="card">
    <p>${sigue ? `Sigue: <a href="#/ayuda/${sigue.slug}">${esc(sigue.titulo)}</a> · ` : ""}<a href="#/ayuda">Todas las páginas</a></p>
  </section>`, { titulo: p.titulo + " · Pelagos", nav: "ayuda", conserva: o.conserva });
}

/** La definición de una palabra del glosario, en la hoja de abajo, sin salir de la página. */
function abrirGlosa(clave) {
  const g = P && P.ayuda && P.ayuda.glosario && P.ayuda.glosario[clave];
  if (!g) return;
  const n = numerosAyuda();
  hojaV.querySelectorAll(".hvFondo").forEach((x) => x.remove());
  hojaV.classList.remove("conFoto");
  $("hvIn").innerHTML = `
    <span class="k">Glosario</span>
    <h2 id="hvT" tabindex="-1">${esc(g.termino)}</h2>
    <p class="r">${marcaAyuda(g.def, n)}</p>
    <div class="acts">
      <a class="ub" href="#/ayuda/glosario" data-cerrar>Ver el glosario</a>
      <button type="button" class="ub" data-cerrar>Cerrar</button>
    </div>`;
  if (!hojaV.hasAttribute("open")) { if (hojaV.showModal) hojaV.showModal(); else hojaV.setAttribute("open", ""); }
  $("hvT").focus({ preventScroll: true });
}


// ---------------------------------------------------------------- Vista previa de un tema enlazado

const hoja = $("sheet");
function abrirHoja(id) {
  const t = porId.get(Number(id));
  if (!t || !E) return;
  const i = info(t.id);
  $("shK").textContent = "Vista previa · " + t.nivel + " · " + (CATEGORIAS[t.categoria] || t.categoria);
  $("shT").textContent = titulo(t);
  $("shR").textContent = t.regla || "Este tema todavía no tiene lección ni resumen propio.";
  $("shP").textContent = "Tu porcentaje: " + pct(i.pct) + (i.n === 0 ? "" : " · " + plural(i.n, "respuesta", "respuestas"));
  $("shB").style.width = ancho(i.pct) + "%";
  $("shB").parentElement.className = "bar" + tono(i.pct);
  const serieT = N.historiaTemas(P, A.sucesos(), [t.id], N.fechaLocal(new Date()));
  $("shG").innerHTML = htmlGrafica(serieT, "gT", titulo(t));
  activarGrafica(serieT, "gT");
  const conLeccion = !!(t.slug && t.leccion);
  $("shL").hidden = !conLeccion;
  if (conLeccion) $("shL").href = "#/leccion/" + t.slug;
  $("shKw").hidden = !t.slug_kwiziq;
  if (t.slug_kwiziq) $("shKw").href = KWIZIQ + t.slug_kwiziq;
  if (hoja.showModal) hoja.showModal(); else hoja.setAttribute("open", "");
}
function cerrarHoja() {
  for (const h of [hoja, hojaV]) {
    if (!h.hasAttribute("open")) continue;
    if (h.close) h.close(); else h.removeAttribute("open");
  }
}

export { AYUDA_DE, abrirGlosa, abrirHoja, ayudaLista, ayudaPagina, cerrarHoja, conNumeros, hoja, marcaAyuda, numerosAyuda, ponerSignoAyuda, verAyuda, verPaginaAyuda };
