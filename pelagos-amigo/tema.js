// El modo de color (claro u oscuro) se pone antes de pintar, para que la página no parpadee al abrir.
// Se elige en Ajustes y se guarda en este aparato. Sin elección, la página abre en oscuro.
try {
  var tema = window.localStorage.getItem("pelagos.tema");
  if (tema === "claro" || tema === "oscuro") document.documentElement.dataset.tema = tema;
  // Ambiente «limpio»: sin fotos ni dibujos, solo el fondo negro o blanco del modo de color.
  if (window.localStorage.getItem("pelagos.ambiente") === "limpio") document.documentElement.dataset.ambiente = "limpio";
} catch (e) { /* sin memoria: se queda el modo de fábrica */ }
