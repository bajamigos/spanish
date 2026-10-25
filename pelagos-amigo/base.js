// Lo que todas las páginas comparten: el atajo $, la vista y los nombres fijos. Sacado de app.js el 25-Oct-2026, sin cambios.



const $ = (id) => document.getElementById(id);
const vista = $("vista");

const KWIZIQ = "https://spanish.kwiziq.com/revision/grammar/";
const NIVELES = {
  A0: "Inicial", A1: "Principiante", A2: "Intermedio bajo",
  B1: "Intermedio", B2: "Intermedio alto", C1: "Avanzado",
};
const CATEGORIAS = {
  "Idioms, Idiomatic Usage, and Structures": "Estructuras y modismos",
  "Verbs Tenses & Conjugation": "Verbos: tiempos y conjugación",
  "Prepositions & Conjunctions": "Preposiciones y conjunciones",
  "Adjectives & Adverbs": "Adjetivos y adverbios",
  "Pronouns": "Pronombres",
  "Nouns & Articles": "Sustantivos y artículos",
  "Questions & Interrogatives": "Preguntas",
  "Numbers, Time & Date": "Números, hora y fecha",
  "Negative Words & Constructions": "Negación",
};
// Los mismos tipos de palabra, en corto, para los rótulos del mapa.
const CATEGORIAS_CORTAS = {
  "Idioms, Idiomatic Usage, and Structures": "Estructuras",
  "Verbs Tenses & Conjugation": "Verbos",
  "Prepositions & Conjunctions": "Preposiciones",
  "Adjectives & Adverbs": "Adjetivos",
  "Pronouns": "Pronombres",
  "Nouns & Articles": "Sustantivos",
  "Questions & Interrogatives": "Preguntas",
  "Numbers, Time & Date": "Números",
  "Negative Words & Constructions": "Negación",
};
const GRUPOS = [["antes", "Antes de esta"], ["confunde", "Se confunde con"], ["sigue", "Sigue con"]];
const TIPOS_KWIZ = { lista: "Pelagos Quiz", general: "Quiz general", cuaderno: "Quiz del cuaderno", tema: "Quiz de un tema", tutora: "Práctica con la tutora" };
const QUIZ = "/gramatica/quiz";       // dónde vive el quiz de gramática
// Cada sección trae dos entradas, que van como dos botones arriba de sus páginas.
// Regla del acomodo: cada materia trae cómo se estudia y cómo se ve; lo que es de todo va en el Tablero.
const SECCIONES = {
  tablero: ["Tablero", [["hoy", "#/", "Hoy"], ["clases", "#/clases", "Clases"], ["bitacora", "#/bitacora", "Bitácora"]]],
  gramatica: ["Gramática", [["quiz", "#" + QUIZ, "Quiz"], ["lecciones", "#/gramatica", "Lecciones"], ["atlas", "#/gramatica/atlas", "Atlas"]]],
  vocabulario: ["Vocabulario", [["quiz", "#/vocabulario", "Quiz"], ["agregar", "#/vocabulario/agregar", "Agregar"], ["lista", "#/vocabulario/acervo", "Acervo"]]],
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre"];

export { $, CATEGORIAS, CATEGORIAS_CORTAS, GRUPOS, KWIZIQ, MESES, NIVELES, QUIZ, SECCIONES, TIPOS_KWIZ, vista };
