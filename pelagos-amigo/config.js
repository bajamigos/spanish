// Dónde vive Pelagos. La página es pública y no trae contenido:
// las lecciones, las preguntas y tu avance están en el repositorio privado y solo se abren con tu llave.
export const CONFIG = Object.freeze({
  api: "https://api.github.com",
  repo: "bajamigos/Pelagos",
  ramaContenido: "main",      // lecciones, preguntas y portadas
  ramaAvance: "avance",       // tus respuestas, un archivo por aparato y por mes
  amigo: true,               // true solo en la vitrina para amigos (la arma herramientas/amigo.py)
});
