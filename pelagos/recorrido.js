// El Recorrido (Tour of Cyberpunk TJ): un visor de panoramas 360 hecho a mano, sin librerías, con WebGL.
// Convención de los panoramas: el centro de la imagen es el NORTE (rumbo 0), la derecha el ESTE, la izquierda el OESTE,
// y los bordes pegados el SUR. Un rumbo en grados (0 a 360) apunta a ese lugar de la imagen.
// La página no trae contenido: los lugares y las fotos llegan del paquete privado (ver app.js).

const RAD = Math.PI / 180;
const NOMBRES = ["NORTE", "NORESTE", "ESTE", "SURESTE", "SUR", "SUROESTE", "OESTE", "NOROESTE"];
const MAX_TEXTURAS = 6;                 // panoramas que se guardan a la vez en la tarjeta de video
const FOV_MIN = 40, FOV_MAX = 100, FOV_INICIAL = 78;
const norm = (g) => ((g % 360) + 360) % 360;
const dif = (a, b) => ((a - b + 540) % 360) - 180;       // la diferencia más corta entre dos rumbos, de -180 a 180
const rumboNombre = (r) => NOMBRES[Math.round(norm(r) / 45) % 8];
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const cuadro = () => new Promise((ok) => requestAnimationFrame(ok));

const VERTICE = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
const FRAGMENTO = `precision highp float;
uniform vec2 res; uniform float yaw, pitch, tanf, mezcla;
uniform sampler2D t0, t1;
const float PI = 3.14159265358979;
vec2 busca(vec3 d){ return vec2(0.5 + atan(d.x, -d.z) / (2.0 * PI), 0.5 + asin(clamp(d.y, -1.0, 1.0)) / PI); }
void main(){
  vec2 p = gl_FragCoord.xy / res * 2.0 - 1.0;
  float asp = res.x / res.y;
  vec2 esc = asp >= 1.0 ? vec2(asp, 1.0) : vec2(1.0, 1.0 / asp);   // el campo de visión es el del lado más corto
  vec3 d = normalize(vec3(p.x * esc.x * tanf, p.y * esc.y * tanf, -1.0));
  float cp = cos(pitch), sp = sin(pitch);
  d = vec3(d.x, d.y * cp - d.z * sp, d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  d = vec3(d.x * cy - d.z * sy, d.y, d.x * sy + d.z * cy);
  vec2 uv = busca(d);
  vec4 a = texture2D(t0, uv);
  gl_FragColor = mezcla > 0.0 ? mix(a, texture2D(t1, uv), mezcla) : a;
}`;

/**
 * Abre el visor dentro de `raiz`.
 *  tour        { inicio, lugares: [{ id, foto, titulo, sub, corto, x, y, nivel, salidas: [[rumbo, id]], andrea, acciones }] }
 *  bajarFoto   (nombreDeArchivo) -> Promise<dirección blob: o null>
 *  desde       id del lugar donde empezar
 *  hojaMision  (lugar) -> HTML de la hoja de misión, o "" si el lugar no tiene
 *  tinte       (lugar) -> 0 a 5 (la franja de color de su nivel) o null
 *  alMover     (lugar) -> aviso de que llegaste a un lugar
 * Devuelve { cerrar }.
 */
export function abrirRecorrido(raiz, { tour, bajarFoto, desde, hojaMision, tinte, alMover, esDeNoche, escenaVista, escenaMarcar, salirHref = "#/" }) {
  const lugares = new Map(tour.lugares.map((l) => [l.id, l]));
  let actual = lugares.get(desde) || lugares.get(tour.inicio) || tour.lugares[0];

  // ---------------------------------------------------------------- Lo que se ve
  const caja = document.createElement("div");
  caja.className = "rec";
  caja.setAttribute("role", "region");
  caja.setAttribute("aria-label", "Recorrido por Tijuana");
  caja.tabIndex = -1;
  caja.innerHTML = `
    <canvas class="rec-lienzo" aria-label="Panorama 360. Arrastra para mirar alrededor."></canvas>
    <a class="rec-b rec-salir" href="${salirHref}">Salir</a>
    <p class="rec-b rec-brujula" id="recBrujula" aria-live="off"></p>
    <div class="rec-titulo" id="recTitulo"><b id="recT"></b><span id="recS"></span></div>
    <div class="rec-flechas" id="recFlechas"></div>
    <div class="rec-andrea" id="recAndrea" hidden><b>Andrea</b><span id="recAndreaT"></span></div>
    <p class="rec-describe" id="recDescribe" role="status" aria-live="polite" hidden></p>
    <div class="rec-mapa" id="recMapa"><canvas id="recMapaC" aria-label="Mapa de Tijuana. Toca para agrandarlo."></canvas></div>
    <div class="rec-barra">
      <button type="button" class="rec-b" id="recBMapa" aria-pressed="false">Mapa</button>
      <button type="button" class="rec-b" id="recBSalidas">Salidas</button>
      <button type="button" class="rec-b" id="recBLuz" hidden>Apagar las luces</button>
      <button type="button" class="rec-b" id="recBEscena" hidden>▶ Escena</button>
      <button type="button" class="rec-b" id="recBHombro" hidden>Acercarte</button>
      <button type="button" class="rec-b" id="recBDescribe" aria-pressed="false" hidden>Describir</button>
      <button type="button" class="rec-b" id="recBMision">Misión</button>
    </div>
    <section class="rec-hoja" id="recHoja" hidden aria-label="Hoja del recorrido"><button type="button" class="rec-b rec-x" id="recX">Cerrar</button><div id="recHojaC"></div></section>
    <div class="rec-escena" id="recEscena" hidden role="dialog" aria-modal="true" aria-label="Escena"><img id="recEscenaG" alt=""><button type="button" class="rec-b rec-saltar" id="recSaltar">Saltar ›</button></div>
    <p class="rec-carga" id="recCarga" role="status" hidden>Cargando…</p>
    <p class="rec-carga rec-error" id="recError" role="alert" hidden></p>`;
  raiz.appendChild(caja);
  const $ = (id) => caja.querySelector("#" + id);
  const lienzo = caja.querySelector(".rec-lienzo");
  const gl = lienzo.getContext("webgl", { antialias: false, alpha: false }) || lienzo.getContext("experimental-webgl");
  if (!gl) {
    $("recError").hidden = false;
    $("recError").textContent = "Este navegador no pudo abrir el visor 360. Prueba con otro.";
    return { cerrar() { caja.remove(); } };
  }

  // ---------------------------------------------------------------- WebGL
  const compilar = (tipo, texto) => { const s = gl.createShader(tipo); gl.shaderSource(s, texto); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERTICE));
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAGMENTO));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const atrib = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(atrib);
  gl.vertexAttribPointer(atrib, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(["res", "yaw", "pitch", "tanf", "mezcla", "t0", "t1"].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.uniform1i(U.t0, 0);
  gl.uniform1i(U.t1, 1);
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

  // ---------------------------------------------------------------- Estado de la cámara
  let yaw = 0, pitch = 0, fov = FOV_INICIAL;          // yaw en grados = el rumbo al que miras
  let mezcla = 0;
  let texA = null, texB = null;                       // la de ahora y la que entra
  const texturas = new Map();                         // id de lugar -> textura de WebGL
  let sucio = true, viva = true, moviendo = false, ocupado = 0;

  const pedir = () => { sucio = true; };
  function tamano() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(lienzo.clientWidth * dpr)), h = Math.max(1, Math.round(lienzo.clientHeight * dpr));
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; gl.viewport(0, 0, w, h); }
    return [w, h];
  }

  // Un lugar con `fotoNoche` tiene dos luces: sola según la hora del aparato, o la que elijas con el botón.
  const luzElegida = new Map();                                   // id de lugar -> "dia" | "noche"
  const luzDe = (l) => (!l.fotoNoche ? "dia" : luzElegida.get(l.id) || (esDeNoche && esDeNoche() ? "noche" : "dia"));
  const variante = (l) => (luzDe(l) === "noche" ? { ...l, id: l.id + ":noche", foto: l.fotoNoche } : l);

  async function cargarTextura(lugar0) {
    const lugar = variante(lugar0);
    if (texturas.has(lugar.id)) { const t = texturas.get(lugar.id); texturas.delete(lugar.id); texturas.set(lugar.id, t); return t; }      // la más usada al final
    const url = await bajarFoto(lugar.foto);
    if (!url) throw new Error("sin foto");
    const img = new Image();
    img.src = url;
    await img.decode();
    let fuente = img;
    if (img.width > maxTex) {                                    // tarjetas de video chicas: se reduce
      const c = document.createElement("canvas");
      c.width = maxTex; c.height = Math.round(img.height * maxTex / img.width);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      fuente = c;
    }
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, fuente);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texturas.set(lugar.id, t);
    while (texturas.size > MAX_TEXTURAS) {                       // se suelta la que hace más tiempo no se usa (menos la de ahora)
      const [viejo, tv] = texturas.entries().next().value;
      if (tv === texA || tv === texB) { texturas.delete(viejo); texturas.set(viejo, tv); continue; }
      texturas.delete(viejo); gl.deleteTexture(tv);
    }
    return t;
  }

  function dibujar() {
    const [w, h] = tamano();
    gl.uniform2f(U.res, w, h);
    gl.uniform1f(U.yaw, yaw * RAD);
    gl.uniform1f(U.pitch, pitch * RAD);
    gl.uniform1f(U.tanf, Math.tan(fov * RAD / 2));
    gl.uniform1f(U.mezcla, texB ? mezcla : 0);
    if (texA) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); }
    if (texB) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---------------------------------------------------------------- Proyección: de un rumbo a un lugar de la pantalla
  function proyectar(rumbo, cabeceo) {
    const b = rumbo * RAD, c = cabeceo * RAD;
    let x = Math.cos(c) * Math.sin(b), y = Math.sin(c), z = -Math.cos(c) * Math.cos(b);
    const cy = Math.cos(yaw * RAD), sy = Math.sin(yaw * RAD), cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp;
    if (z2 > -0.08) return null;                                  // detrás de ti
    const W = lienzo.clientWidth, H = lienzo.clientHeight, tf = Math.tan(fov * RAD / 2);
    const ex = W >= H ? W / H : 1, ey = W >= H ? 1 : H / W;
    const nx = x1 / -z2 / (tf * ex), ny = y2 / -z2 / (tf * ey);
    return [(nx + 1) / 2 * W, (1 - ny) / 2 * H];
  }

  // ---------------------------------------------------------------- Flechas y puntos del lugar
  const contFlechas = $("recFlechas");
  let marcas = [];                                                // { el, rumbo, cabeceo }
  function armarMarcas() {
    contFlechas.textContent = "";
    marcas = [];
    for (const [rumbo, destino] of actual.salidas) {
      const d = lugares.get(destino);
      if (!d) continue;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rec-flecha";
      b.textContent = "▲ " + (d.corto || d.titulo);
      b.setAttribute("aria-label", `Ir a ${d.titulo}, al ${rumboNombre(rumbo).toLowerCase()}`);
      b.addEventListener("click", () => ir(destino, rumbo));
      contFlechas.appendChild(b);
      marcas.push({ el: b, rumbo, cabeceo: -26 });
    }
    for (const a of actual.acciones || []) {
      if (typeof a.rumbo !== "number") continue;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rec-punto";
      b.textContent = "✦ " + a.texto;
      b.addEventListener("click", () => abrirHoja("mision", a.id));
      contFlechas.appendChild(b);
      marcas.push({ el: b, rumbo: a.rumbo, cabeceo: a.cabeceo || 0 });
    }
  }
  function colocarMarcas() {
    for (const m of marcas) {
      const p = proyectar(m.rumbo, m.cabeceo);
      if (!p) { m.el.hidden = true; continue; }
      m.el.hidden = false;
      m.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, -50%)`;
    }
  }

  // ---------------------------------------------------------------- Brújula
  function pintarBrujula() {
    const r = norm(yaw);
    $("recBrujula").textContent = `${rumboNombre(r)} ${Math.round(r)}°`;
  }

  // ---------------------------------------------------------------- Mapa chico y mapa grande
  const mapaC = $("recMapaC"), mapaCaja = $("recMapa");
  const xs = tour.lugares.map((l) => l.x), ys = tour.lugares.map((l) => l.y);
  const caja2 = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  let mapaGrande = false, nodos = [];
  const colorK = (i) => getComputedStyle(document.documentElement).getPropertyValue("--k" + i).trim() || "#d8c7a0";
  function pintarMapa() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const anchoCss = mapaGrande ? Math.min(window.innerWidth - 24, 560) : 150;
    const relacion = (caja2.y1 - caja2.y0 + 1.2) / (caja2.x1 - caja2.x0 + 1.2);
    const altoCss = Math.round(Math.min(anchoCss * relacion, mapaGrande ? window.innerHeight * 0.7 : 130));
    const aw = Math.round(anchoCss * dpr), ah = Math.round(altoCss * dpr);
    if (mapaC.width !== aw || mapaC.height !== ah) {
      mapaC.style.width = anchoCss + "px"; mapaC.style.height = altoCss + "px";
      mapaC.width = aw; mapaC.height = ah;
    }
    const g = mapaC.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, anchoCss, altoCss);
    const pad = mapaGrande ? 34 : 14;
    const sx = (anchoCss - 2 * pad) / Math.max(0.01, caja2.x1 - caja2.x0), sy = (altoCss - 2 * pad) / Math.max(0.01, caja2.y1 - caja2.y0);
    const k = Math.min(sx, sy);
    const ox = (anchoCss - k * (caja2.x1 - caja2.x0)) / 2, oy = (altoCss - k * (caja2.y1 - caja2.y0)) / 2;
    const pos = (l) => [ox + (l.x - caja2.x0) * k, oy + (l.y - caja2.y0) * k];
    nodos = [];
    g.lineWidth = mapaGrande ? 2 : 1.5;
    g.strokeStyle = "rgba(255,243,214,0.5)";
    for (const l of tour.lugares) for (const [, d] of l.salidas) {
      const o = lugares.get(d);
      if (!o) continue;
      const [a, b] = pos(l), [c, e] = pos(o);
      g.beginPath(); g.moveTo(a, b); g.lineTo(c, e); g.stroke();
    }
    const r0 = mapaGrande ? 9 : 4.5;
    g.font = "600 12px system-ui, sans-serif";
    g.textAlign = "center";
    for (const l of tour.lugares) {
      const [px, py] = pos(l);
      nodos.push({ l, px, py });
      const t = tinte ? tinte(l) : null;
      g.beginPath();
      g.arc(px, py, l === actual ? r0 * 1.5 : r0, 0, 2 * Math.PI);
      g.fillStyle = t === null || t === undefined ? "#d8c7a0" : colorK(t);
      g.fill();
      g.lineWidth = l === actual ? 3 : 1.2;
      g.strokeStyle = l === actual ? "#ffffff" : "rgba(0,0,0,0.7)";
      g.stroke();
      if (mapaGrande) {
        g.fillStyle = l === actual ? "#ffe9a8" : "#f6e7c1";
        g.fillText(l.corto || l.titulo, px, py + r0 + 14);
      }
    }
    const a = nodos.find((n) => n.l === actual);                   // hacia dónde miras
    if (a) {
      const r = yaw * RAD, largo = mapaGrande ? 26 : 15;
      g.beginPath();
      g.moveTo(a.px, a.py);
      g.arc(a.px, a.py, largo, r - Math.PI / 2 - 0.55, r - Math.PI / 2 + 0.55);
      g.closePath();
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fill();
    }
  }
  function ponerMapaGrande(si) {
    mapaGrande = si;
    mapaCaja.classList.toggle("grande", si);
    $("recBMapa").setAttribute("aria-pressed", String(si));
    pintarMapa();
  }
  mapaC.addEventListener("click", (ev) => {
    if (!mapaGrande) { ponerMapaGrande(true); return; }
    const r = mapaC.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    let mejor = null, dist = 26;
    for (const n of nodos) { const d = Math.hypot(n.px - x, n.py - y); if (d < dist) { dist = d; mejor = n; } }
    ponerMapaGrande(false);
    if (mejor && mejor.l !== actual) ir(mejor.l.id, null);
  });
  $("recBMapa").addEventListener("click", () => ponerMapaGrande(!mapaGrande));

  // ---------------------------------------------------------------- Hoja: salidas y misión
  const hoja = $("recHoja");
  function abrirHoja(que, foco) {
    let html = "";
    if (que === "salidas") {
      html = `<h2>Salidas</h2><ol class="rec-lista">${actual.salidas.map(([r, d], i) => {
        const o = lugares.get(d);
        return o ? `<li><button type="button" class="rec-b" data-sal="${i}">${i + 1}. ${rumboNombre(r)}: ${o.titulo}</button></li>` : "";
      }).join("")}</ol><p class="rec-nota">También puedes tocar los números 1 al ${Math.max(1, actual.salidas.length)} en el teclado.</p>`;
    } else {
      html = hojaMision(actual) || `<h2>${actual.titulo}</h2><p>Aquí no hay misión. Camina a otro lugar.</p>`;
    }
    $("recHojaC").innerHTML = html;
    hoja.hidden = false;
    hoja.dataset.que = que;
    hoja.scrollTop = 0;
    const objetivo = foco && $("recHojaC").querySelector(`[data-accion="${foco}"]`);
    if (objetivo) objetivo.scrollIntoView({ block: "start" });
    $("recX").focus({ preventScroll: true });
  }
  function cerrarHoja() { hoja.hidden = true; caja.focus({ preventScroll: true }); }
  $("recX").addEventListener("click", cerrarHoja);
  $("recBSalidas").addEventListener("click", () => (hoja.hidden || hoja.dataset.que !== "salidas" ? abrirHoja("salidas") : cerrarHoja()));
  $("recBMision").addEventListener("click", () => (hoja.hidden || hoja.dataset.que !== "mision" ? abrirHoja("mision") : cerrarHoja()));
  $("recHojaC").addEventListener("click", (ev) => {
    const b = ev.target instanceof Element ? ev.target.closest("[data-sal]") : null;
    if (!b) return;
    const [r, d] = actual.salidas[Number(b.dataset.sal)] || [];
    if (d) { cerrarHoja(); ir(d, r); }
  });

  // ---------------------------------------------------------------- Escenas (un GIF a pantalla completa, como una cut scene)
  const escenaCaja = $("recEscena");
  let escenaHilo = 0;
  async function verEscena(lugar) {
    const e = lugar && lugar.escena;
    if (!e || !viva) return;
    const url = await bajarFoto(e.gif).catch(() => null);
    if (!url || !viva || actual !== lugar) return;
    const yo = ++escenaHilo;
    const img = $("recEscenaG");
    img.src = "";                                                 // el GIF empieza desde el primer cuadro
    img.src = url;
    $("recEscena").setAttribute("aria-label", e.titulo || "Escena");
    escenaCaja.hidden = false;
    try { if (escenaCaja.requestFullscreen) await escenaCaja.requestFullscreen(); } catch { /* sin pantalla completa: cubre la página igual */ }
    $("recSaltar").focus({ preventScroll: true });
    if (escenaMarcar) escenaMarcar(lugar.id);
    setTimeout(() => { if (yo === escenaHilo) cerrarEscena(); }, Math.max(1, e.segundos || 5) * 1000);
  }
  function cerrarEscena() {
    escenaHilo++;
    if (escenaCaja.hidden) return;
    escenaCaja.hidden = true;
    $("recEscenaG").removeAttribute("src");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    caja.focus({ preventScroll: true });
  }
  $("recSaltar").addEventListener("click", cerrarEscena);
  escenaCaja.addEventListener("click", cerrarEscena);
  $("recBEscena").addEventListener("click", () => verEscena(actual));
  // «Acercarte»: la toma por encima de tu hombro, para hablarle a quien está en el lugar. Se cierra tocando.
  async function verHombro(lugar) {
    if (!lugar || !lugar.hombro || !viva) return;
    const url = await bajarFoto(lugar.hombro).catch(() => null);
    if (!url || !viva || actual !== lugar) return;
    escenaHilo++;
    $("recEscenaG").src = url;
    $("recEscena").setAttribute("aria-label", "Frente a frente. Toca para volver.");
    escenaCaja.hidden = false;
    $("recSaltar").focus({ preventScroll: true });
  }
  $("recBHombro").addEventListener("click", () => verHombro(actual));
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && !escenaCaja.hidden) cerrarEscena(); });

  // ---------------------------------------------------------------- Cambiar la luz del lugar (día / noche)
  $("recBDescribe").addEventListener("click", () => {
    const p = $("recDescribe"), b = $("recBDescribe"), abre = p.hidden;
    p.hidden = !abre; b.setAttribute("aria-pressed", String(abre));
    p.textContent = abre ? actual.describe : "";
  });
  $("recBLuz").addEventListener("click", async () => {
    if (!actual.fotoNoche || moviendo) return;
    moviendo = true;
    try {
      luzElegida.set(actual.id, luzDe(actual) === "noche" ? "dia" : "noche");
      $("recBLuz").textContent = luzDe(actual) === "noche" ? "Prender las luces" : "Apagar las luces";
      const t = await cargarTextura(actual);
      texB = t; mezcla = 0;
      const t1 = performance.now();
      for (let k = 0; k < 1;) { await cuadro(); k = Math.min(1, (performance.now() - t1) / 700); mezcla = k; pedir(); }
      texA = t; texB = null; mezcla = 0; pedir();
    } catch {
      $("recError").hidden = false;
      $("recError").textContent = "No se pudo cambiar la luz. Revisa tu conexión.";
    } finally { moviendo = false; }
  });

  // ---------------------------------------------------------------- Ir a otro lugar
  function mostrarLugar() {
    $("recT").textContent = actual.titulo;
    $("recS").textContent = actual.sub || "";
    const a = $("recAndrea");
    a.hidden = !actual.andrea;
    $("recAndreaT").textContent = actual.andrea ? "«" + actual.andrea + "»" : "";
    $("recBMision").hidden = !(actual.acciones && actual.acciones.length);
    $("recBEscena").hidden = !actual.escena;
    $("recBHombro").hidden = !actual.hombro;
    $("recBDescribe").hidden = !actual.describe;
    $("recDescribe").textContent = ""; $("recDescribe").hidden = true; $("recBDescribe").setAttribute("aria-pressed", "false");
    $("recBLuz").hidden = !actual.fotoNoche;
    $("recBLuz").textContent = luzDe(actual) === "noche" ? "Prender las luces" : "Apagar las luces";
    armarMarcas();
    pintarMapa();
    pedir();
    if (alMover) alMover(actual);
  }
  function precargar() {
    // Los lugares vecinos se bajan mientras miras este, para que el paso sea rápido.
    (async () => {
      for (const [, d] of actual.salidas) {
        const l = lugares.get(d);
        if (l && viva) { try { await bajarFoto(variante(l).foto); } catch { /* no pasa nada: se baja cuando vayas */ } }
      }
    })();
  }

  async function ir(id, rumbo) {
    const destino = lugares.get(id);
    if (!destino || moviendo) return;
    moviendo = true;
    $("recError").hidden = true;
    cerrarHoja();
    ponerMapaGrande(false);
    try {
      const listo = cargarTextura(destino);                      // empieza a bajar mientras giras
      const pendiente = { v: true };
      listo.then(() => { pendiente.v = false; }, () => { pendiente.v = false; });
      if (rumbo !== null) {                                      // girar hacia la salida y acercar
        const y0 = yaw, f0 = fov, dy = dif(rumbo, y0), t0 = performance.now();
        for (let k = 0; k < 1;) {
          await cuadro();
          k = Math.min(1, (performance.now() - t0) / 650);
          const e = k * k * (3 - 2 * k);
          yaw = y0 + dy * e; fov = f0 - (f0 - 52) * e;
          pedir();
        }
      }
      if (pendiente.v) $("recCarga").hidden = false;
      const t = await listo;
      $("recCarga").hidden = true;
      texB = t; mezcla = 0;
      const f1 = fov, t1 = performance.now();
      actual = destino;
      if (rumbo !== null) yaw = norm(rumbo);
      pitch = 0;
      mostrarLugar();
      for (let k = 0; k < 1;) {                                  // fundido y vuelta al ángulo normal
        await cuadro();
        k = Math.min(1, (performance.now() - t1) / 600);
        mezcla = k; fov = f1 + (FOV_INICIAL - f1) * k;
        pedir();
      }
      texA = t; texB = null; mezcla = 0; fov = FOV_INICIAL;
      pedir();
      precargar();
      if (actual.escena && !(escenaVista && escenaVista(actual.id))) verEscena(actual);
    } catch {
      $("recCarga").hidden = true;
      $("recError").hidden = false;
      $("recError").textContent = "No se pudo abrir ese lugar. Revisa tu conexión y vuelve a tocarlo.";
    } finally {
      moviendo = false;
    }
  }

  // ---------------------------------------------------------------- Mirar alrededor: arrastrar, pellizcar, rueda y teclado
  const punteros = new Map();
  let ultimo = null, distancia0 = 0, fov0 = 0, vel = [0, 0];
  const grados = () => fov / Math.max(1, Math.min(lienzo.clientWidth, lienzo.clientHeight));          // grados por píxel
  lienzo.addEventListener("pointerdown", (ev) => {
    lienzo.setPointerCapture(ev.pointerId);
    punteros.set(ev.pointerId, [ev.clientX, ev.clientY]);
    vel = [0, 0];
    if (punteros.size === 2) { const [a, b] = [...punteros.values()]; distancia0 = Math.hypot(a[0] - b[0], a[1] - b[1]); fov0 = fov; }
    ultimo = [ev.clientX, ev.clientY];
    if (!hoja.hidden) cerrarHoja();
    if (mapaGrande) ponerMapaGrande(false);
  });
  lienzo.addEventListener("pointermove", (ev) => {
    if (!punteros.has(ev.pointerId)) return;
    punteros.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (punteros.size >= 2) {
      const [a, b] = [...punteros.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (distancia0 > 0) { fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov0 * distancia0 / d)); pedir(); }
      return;
    }
    const dx = ev.clientX - ultimo[0], dy = ev.clientY - ultimo[1];
    ultimo = [ev.clientX, ev.clientY];
    yaw = norm(yaw - dx * grados());
    pitch = Math.max(-85, Math.min(85, pitch + dy * grados()));
    vel = [-dx * grados(), dy * grados()];
    pedir();
  });
  const soltar = (ev) => { punteros.delete(ev.pointerId); if (!punteros.size) inercia(); };
  lienzo.addEventListener("pointerup", soltar);
  lienzo.addEventListener("pointercancel", soltar);
  lienzo.addEventListener("wheel", (ev) => { ev.preventDefault(); fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov + ev.deltaY * 0.05)); pedir(); }, { passive: false });
  async function inercia() {
    for (let i = 0; i < 40 && !punteros.size && (Math.abs(vel[0]) > 0.02 || Math.abs(vel[1]) > 0.02); i++) {
      await cuadro();
      yaw = norm(yaw + vel[0]); pitch = Math.max(-85, Math.min(85, pitch + vel[1]));
      vel = [vel[0] * 0.92, vel[1] * 0.92];
      pedir();
    }
  }
  function teclas(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || !caja.isConnected) return;
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
    const tecla = ev.key;
    const paso = 7;
    if (tecla === "ArrowLeft") yaw = norm(yaw - paso);
    else if (tecla === "ArrowRight") yaw = norm(yaw + paso);
    else if (tecla === "ArrowUp") pitch = Math.min(85, pitch + paso);
    else if (tecla === "ArrowDown") pitch = Math.max(-85, pitch - paso);
    else if (tecla === "+" || tecla === "=") fov = Math.max(FOV_MIN, fov - 6);
    else if (tecla === "-" || tecla === "_") fov = Math.min(FOV_MAX, fov + 6);
    else if (tecla.toLowerCase() === "m") { ponerMapaGrande(!mapaGrande); return; }
    else if (tecla === "Escape") { if (!escenaCaja.hidden) cerrarEscena(); else if (!hoja.hidden) cerrarHoja(); else if (mapaGrande) ponerMapaGrande(false); return; }
    else if (/^[1-9]$/.test(tecla) && ev.target instanceof Element && !ev.target.closest("input, textarea")) {
      const s = actual.salidas[Number(tecla) - 1];
      if (s) { ir(s[1], s[0]); }
      return;
    } else return;
    ev.preventDefault();
    pedir();
  }
  document.addEventListener("keydown", teclas);
  const alRedimensionar = () => { pedir(); if (mapaGrande) pintarMapa(); };
  window.addEventListener("resize", alRedimensionar);

  // ---------------------------------------------------------------- El ciclo: solo dibuja cuando algo cambió
  (function ciclo() {
    if (!viva) return;
    if (sucio) {
      sucio = false;
      dibujar();
      colocarMarcas();
      pintarBrujula();
      pintarMapa();
    }
    requestAnimationFrame(ciclo);
  })();

  // ---------------------------------------------------------------- Arrancar
  (async () => {
    mostrarLugar();
    yaw = actual.mira !== undefined ? actual.mira : 0;
    $("recCarga").hidden = false;
    try {
      texA = await cargarTextura(actual);
      $("recCarga").hidden = true;
      pedir();
      precargar();
      if (actual.escena && !(escenaVista && escenaVista(actual.id))) verEscena(actual);
    } catch {
      $("recCarga").hidden = true;
      $("recError").hidden = false;
      $("recError").textContent = "No se pudo abrir el panorama. Revisa tu conexión y recarga Pelagos.";
    }
  })();
  caja.focus({ preventScroll: true });

  return {
    ir: (id) => ir(id, null),
    cerrar() {
      viva = false;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      document.removeEventListener("keydown", teclas);
      window.removeEventListener("resize", alRedimensionar);
      for (const t of texturas.values()) gl.deleteTexture(t);
      texturas.clear();
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
      caja.remove();
    },
  };
}
