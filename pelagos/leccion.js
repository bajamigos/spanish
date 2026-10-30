// La lección: sacado de app.js el 25-Oct-2026, sin cambios.
import * as N from "./nucleo.js?v=bb17009638";
import * as A from "./almacen.js?v=bb17009638";
import { ancho, barra, contrastesDe, esc, fecha, marca, pct, plural, titulo } from "./texto.js?v=bb17009638";
import { E, LOGO, P, esMovimiento, escenasPorSala, etiquetaEscena, imagenDeArriba, info, meta, movimientoEnTodo, poner, porId, porSlug, recalcular, sinMovimiento, turnoDePintar, verLlave, verNoExiste } from "./app.js?v=bb17009638";
import { CATEGORIAS, GRUPOS, KWIZIQ, NIVELES, vista } from "./base.js?v=bb17009638";
import { ambiente, escalonDeTema, fotoDeLeccion, mudo } from "./acervo.js?v=bb17009638";
import { botonEscena, conectarEscenas, tutoraDe } from "./tutoras.js?v=bb17009638";

// ---------------------------------------------------------------- La lección

// ---- «Tus ejemplos» (su idea del 30-Oct-2026): tus frases con esta regla, con su revisión, y «Mi ejemplo» para agregar otra.
function seccionTusEjemplos(id) {
  const suyas = [...(E.frases || new Map()).values()].filter((f) => f.tema === id).sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));
  if (A.esAmigo()) return "";        // tus frases son tuyas: en el modo amigo no salen
  const amigo = false;
  const una = (f) => {
    const r = f.revision;
    if (!r) return `<li>${esc(f.texto)} <span class="cfEst">⏳ por revisar</span></li>`;
    if (r.estado === "bien") return `<li>${esc(f.texto)} <span class="cfEst">✓ revisada</span>${r.nota ? `<p class="small">${esc(r.nota)}</p>` : ""}</li>`;
    return `<li><s class="cfMal">${esc(f.texto)}</s><br><span class="cfBien">${esc(r.corregida)}</span> <span class="cfEst">✎ corregida</span>${r.nota ? `<p class="small">${esc(r.nota)}</p>` : ""}</li>`;
  };
  return `<section class="card" id="tusEjemplos">
    <h2>Tus ejemplos</h2>
    ${suyas.length ? `<ul class="cfEj">${suyas.map(una).join("")}</ul>` : `<p class="small">Todavía no tienes frases tuyas con esta regla.</p>`}
    ${amigo ? "" : `<label class="small" for="miEj">Mi ejemplo</label>
    <textarea id="miEj" class="cfCampo" lang="es" maxlength="${N.FRASE_MAX}" placeholder="Escribe tu propia frase con esta regla"></textarea>
    <div class="acts"><button type="button" class="ub" id="miEjGuardar" data-tema="${id}">Guardar para revisión</button></div>
    <p class="cfNota" id="miEjNota">Te llega la corrección y, si queda bien, también entra a tu quiz.</p>`}
  </section>`;
}
vista.addEventListener("click", (ev) => {
  const b = ev.target instanceof Element ? ev.target.closest("#miEjGuardar") : null;
  if (!b) return;
  const campo = document.getElementById("miEj"), texto = campo ? campo.value.trim() : "";
  if (!texto) { document.getElementById("miEjNota").textContent = "Escribe tu frase primero."; if (campo) campo.focus(); return; }
  A.apuntar({ t: "frase", id: N.nuevoId("fr"), tema: Number(b.dataset.tema), texto, origen: "leccion", cuando: new Date().toISOString() });
  recalcular();
  const sec = document.getElementById("tusEjemplos");
  if (sec) { sec.outerHTML = seccionTusEjemplos(Number(b.dataset.tema)); document.getElementById("miEjNota").textContent = "Guardada. Queda por revisar."; }
});

function bloque(b) {
  switch (b.tipo) {
    case "texto": return `<p>${marca(b.texto)}</p>`;
    case "formula": return `<div class="formula" aria-label="${esc((b.partes || []).join(", más "))}">${(b.partes || []).map((p, i) => (i ? "<i>+</i>" : "") + `<span>${esc(p)}</span>`).join("")}</div>`;
    case "tabla": return `<div class="scroll"><table class="conj">
      <thead><tr>${(b.encabezados || []).map((e) => `<th scope="col">${esc(e)}</th>`).join("")}</tr></thead>
      <tbody>${(b.filas || []).map((f) => `<tr><th scope="row">${esc(f[0])}</th>${f.slice(1).map((c, i) => `<td${i ? "" : ' class="f"'}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
    case "nota_andrea": return `<p class="pen">${esc(b.texto)}<span>Nota de Andrea, al margen</span></p>`;
    case "ejemplos": return `<ul class="exs">${(b.lista || []).map((e) => `<li class="ex"><span class="es" lang="es-MX">${marca(e.es)}</span><span class="en" lang="en">${esc(e.en)}</span></li>`).join("")}</ul>`;
    case "pares": return `<div class="pairs">${(b.lista || []).map((par) => `<div class="pair">
      ${(par.filas || []).map((f) => `<div class="row ${f.v === "bien" ? "bien" : "mal"}"><span class="tag">${f.v === "bien" ? "Bien" : "Mal"}</span><span class="t">${esc(f.t)}</span></div>`).join("")}
      ${par.nota ? `<p class="why">${esc(par.nota)}</p>` : ""}</div>`).join("")}</div>`;
    case "usos": return `<dl class="uses">${(b.lista || []).map((u) => `<div class="use"><dt>${esc(u.forma)}${u.aqui ? ' <span class="here">esta lección</span>' : ""}</dt><dd>${marca(u.texto)}</dd></div>`).join("")}</dl>`;
    case "mini_kwiz": return (b.lista || []).map((q) => `<details class="q"><summary>${marca(q.p)}</summary><div class="a"><b>${esc(q.r)}</b>${q.nota ? `<span>${esc(q.nota)}</span>` : ""}</div></details>`).join("");
    default: return "";
  }
}

function verLeccion(o, slug) {
  const tema = porSlug.get(slug);
  if (!tema) return verNoExiste();
  if (o.conserva && vista.dataset.leccion === slug) return;      // ya está en pantalla: no se mueve mientras lees
  // Abrir la lección de un tema atascado lo destraba: la cuenta de fallas empieza de cero.
  if (N.temasAtascados(E).has(tema.id)) { A.apuntar({ t: "destrabar", id: N.nuevoId("b"), tema: tema.id, como: "leccion", cuando: new Date().toISOString() }); recalcular(); }
  poner(`<section class="card"><h1 class="h">${esc(tema.titulo)}</h1><p>Abriendo la lección…</p></section>`,
    { titulo: tema.titulo + " · Pelagos", nav: "gramatica" });
  const turno = turnoDePintar;
  vista.dataset.leccion = slug;
  A.leccion(tema.leccion).then((lec) => {
    if (turno !== turnoDePintar) return;
    pintarLeccion(tema, lec);
  }).catch((e) => {
    if (turno !== turnoDePintar) return;
    if (e instanceof A.Fallo && e.tipo === "llave") return verLlave("Tu llave ya no sirve. Pon una nueva.");
    verNoExiste("No se pudo abrir la lección: " + (e instanceof A.Fallo ? e.message : "algo falló") + ".");
  });
}

// El clip de la tutora (escenas/tutora-<tema>/). Ver README.
function clipDeTutora(tema) {
  if (!movimientoEnTodo() || ambiente() === "limpio" || sinMovimiento()) return "";
  const sala = "tutora-" + tema.id;
  if (!escenasPorSala.has(sala)) {
    escenasPorSala.set(sala, []);
    A.escenasDe(sala).then((l) => {
      escenasPorSala.set(sala, l);
      const v = l.filter(esMovimiento).slice(-1)[0];
      // Llegó después de pintar: se vuelve a pintar la lección, ahora con el clip de fondo.
      if (v && movimientoEnTodo() && vista.dataset.leccion === tema.slug && leccionPintada && leccionPintada.tema === tema) pintarLeccion(tema, leccionPintada.lec, true);
    }).catch(() => {});
  }
  const v = escenasPorSala.get(sala).filter(esMovimiento).slice(-1)[0];
  return v ? etiquetaEscena(sala, v) : "";
}

let leccionPintada = null;
// Con clip de tutora, la lección va como el Tablero: el clip fijo al fondo y todo lo demás pasa por encima.
const conClipDeFondo = (clip, html) => clip ? `<div class="hoy confoto contutora"><div class="fondo">${clip}${LOGO}</div><div class="sobre">${html}</div></div>` : html;

function pintarLeccion(tema, lec, conserva = false) {
  leccionPintada = { tema, lec };
  const tutora = clipDeTutora(tema);
  const i = info(tema.id);
  const kwiziq = tema.slug_kwiziq ? KWIZIQ + tema.slug_kwiziq : null;
  // «Se confunde con»: lo que diga la lección más sus parejas de contrastes.json (16-Oct-2026).
  const susPares = contrastesDe(tema.id);
  const grupos = GRUPOS.map(([clave, nombre]) => {
    let ids = (lec.enlaces || {})[clave] || [];
    if (clave === "confunde") ids = [...new Set([...ids, ...susPares.flatMap((c) => c.temas.filter((x) => x !== tema.id))])];
    return { clave, nombre, temas: ids.map((id) => porId.get(id)).filter(Boolean) };
  }).filter((g) => g.temas.length);
  const traen = [...new Set(P.enlaces.filter((x) => x[1] === tema.id).map((x) => x[0]))].map((id) => porId.get(id)).filter(Boolean)
    .sort((a, b) => (a.nivel < b.nivel ? -1 : a.nivel > b.nivel ? 1 : a.orden - b.orden));
  const banco = P.preguntas.filter((q) => q.tema === tema.id && q.estado === "revisada" && !E.retiradas.has(q.id)).length;
  const secciones = lec.secciones || [];
  const saltos = [["regla", "Regla"], ["ejemplos", "Ejemplos"], ["kwiz", "Quiz"], ["enlaces", "Enlaces"]]
    .filter(([id]) => id === "enlaces" || secciones.some((s) => s.id === id));
  poner(conClipDeFondo(tutora, `
  <p class="crumb"><a href="#/gramatica">Gramática</a> · <a href="#/gramatica/${esc(tema.nivel.toLowerCase())}">${esc(tema.nivel)}</a> · ${esc(CATEGORIAS[tema.categoria] || tema.categoria)}</p>
  <header class="hero${tutora ? " contutora" : ""}">
    <div class="ratio"></div>
    ${tutora ? "" : imagenDeArriba(lec.foto && fotoDeLeccion(lec.foto))}
    <div class="over">
      <p class="lead"><span>${esc(tema.nivel)} · ${esc(NIVELES[tema.nivel] || "")}</span><span>${i.n === 0 ? "" : plural(i.n, "respuesta", "respuestas")}</span></p>
      <h1>${esc(lec.titulo)}</h1>
      ${lec.subtitulo ? `<p class="sub">${esc(lec.subtitulo)}</p>` : ""}
      <button type="button" class="score" data-graftema="${tema.id}" aria-label="Tu porcentaje: ${pct(i.pct)}, meta ${meta()}%. Ver tu porcentaje día por día">
        <span>Tu porcentaje: ${pct(i.pct)} · meta ${meta()}% <span class="vergraf" aria-hidden="true">· ver gráfica</span></span>
        <div class="track" role="img" aria-label="${pct(i.pct)} de 100, meta en ${meta()}"><i data-w="${ancho(i.pct)}"></i><b data-x="${meta()}"></b></div>
      </button>
      ${escalonDeTema(i) ? `<p class="sub escalonTema">${escalonDeTema(i)}</p>` : ""}
    </div>
    ${lec.regla ? `
    <div class="rule" id="rule"><span class="k">La regla en una línea</span><p>${esc(lec.regla)}</p><button type="button" id="ruleOff">Ya me la sé</button></div>
    <button type="button" class="back" id="ruleOn" hidden>Ver la regla</button>` : ""}
  </header>
  <nav class="jump" aria-label="Partes de la lección">${saltos.map(([id, nombre]) => `<button type="button" data-ir="${id}">${nombre}</button>`).join("")}</nav>
  ${secciones.map((s) => `<section class="card" id="${esc(s.id)}"><h2>${esc(s.titulo)}</h2>${(s.bloques || []).map(bloque).join("")}</section>`).join("")}
  ${seccionTusEjemplos(tema.id)}
  ${banco ? `
  <section class="card" id="practica">
    <h2>Quiz de este tema</h2>
    <p>Cinco preguntas solo de esta regla. Cada respuesta mueve tu porcentaje.</p>
    <div class="go"><button type="button" class="ub grande" data-kwiz='{"tipo":"tema","tema":${tema.id}}'>Empezar</button></div>
    <p class="small">Hay ${plural(banco, "pregunta revisada", "preguntas revisadas")} de este tema.</p>
  </section>` : ""}
  ${tutoraDe(tema.id) && !mudo() ? `
  <section class="card" id="tutora">
    <h2>Tu tutora</h2>
    <p>${esc(tutoraDe(tema.id).tutora)} te enseña esta regla a su manera.</p>
    ${botonEscena(tema.id)}
  </section>` : ""}
  <section class="card" id="enlaces">
    <h2>Esta lección en la red</h2>
    <p>Cada lección apunta a otras. Toca una y ves su regla sin salir de aquí.</p>
    ${grupos.map((g) => `<h3>${g.nombre}</h3>${g.clave === "confunde" && susPares.length ? susPares.map((c) => `<p class="small"><b>${esc(c.nombre)}</b>: ${esc(c.porque)}</p>`).join("") : ""}<div class="links">${g.temas.map((t) => `
      <button type="button" class="tb" data-l="${t.id}"><span class="lv">${esc(t.nivel)}</span><span class="nm">${esc(titulo(t))}</span><span class="pc">${pct(info(t.id).pct)}</span>${barra(info(t.id).pct)}</button>`).join("")}</div>`).join("")}
    <h3>Te traen aquí</h3>
    ${traen.length
      ? `<p class="backs">${traen.map((t) => `<button type="button" class="lk" data-l="${t.id}">${esc(titulo(t))}</button>`).join(" · ")}</p>`
      : '<p class="small">Todavía ninguna otra lección menciona esta. La lista se arma sola conforme se escriben.</p>'}
    ${(lec.biblioteca || []).length ? `<h3>En tu biblioteca</h3><ul class="lib">${lec.biblioteca.map((x) => `<li><span class="kind">${esc(x.tipo)}</span>${
      x.kwiziq && kwiziq ? `<a href="${esc(kwiziq)}" rel="noopener noreferrer" target="_blank">${esc(x.texto)}</a>`
        : x.url && /^https:\/\//.test(x.url) ? `<a href="${esc(x.url)}" rel="noopener noreferrer" target="_blank">${esc(x.texto)}</a>`
          : `<span>${esc(x.texto)}</span>`}${x.donde ? `<span class="where">${esc(x.donde)}</span>` : ""}</li>`).join("")}</ul>` : ""}
  </section>`),
  {
    titulo: lec.titulo + " · Pelagos", nav: "gramatica", conserva,
    pie: (tema.leccion.comparada_kwiziq ? `<p>Comparada punto por punto con la lección de Kwiziq el ${fecha(tema.leccion.comparada_kwiziq)}.</p>` : "") +
      (i.n === 0 && tema.arranque_fuente ? `<p>Tu porcentaje es el arranque: viene del ${esc(tema.arranque_fuente)}, leído el ${fecha(tema.arranque_leido)}.</p>` : ""),
  });
  vista.dataset.leccion = tema.slug;
  conectarEscenas(vista);
}

export { bloque, clipDeTutora, conClipDeFondo, leccionPintada, pintarLeccion, verLeccion };
