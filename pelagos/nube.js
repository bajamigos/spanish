// Los videos completos de las tutoras en tu almacén privado de Cloudflare R2.
// El almacén es privado: Pelagos firma aquí mismo, con tu llave de solo lectura, un enlace que caduca
// (AWS Signature V4, el mismo idioma que habla R2). Nadie más puede ver los videos, ni con el enlace viejo.
// La llave vive en tu repositorio privado (rama avance, ajustes/nube.json): se pone una vez en un aparato
// y los demás la toman de ahí.

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (texto) => hex(await crypto.subtle.digest("SHA-256", enc.encode(texto)));
async function hmac(llave, texto) {
  const k = await crypto.subtle.importKey("raw", typeof llave === "string" ? enc.encode(llave) : llave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(texto));
}
// RFC 3986, como lo pide la firma: todo se codifica salvo A-Z a-z 0-9 - _ . ~
const codificar = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/** Limpia lo que pegaste: el enlace S3 queda solo como https://<cuenta>.r2.cloudflarestorage.com. */
export function limpiar(datos) {
  const d = datos || {};
  const m = /^https:\/\/([a-z0-9.-]+\.r2\.cloudflarestorage\.com)/i.exec(String(d.url || "").trim());
  return {
    url: m ? "https://" + m[1].toLowerCase() : "",
    id: String(d.id || "").trim(),
    secreto: String(d.secreto || "").trim(),
    cubeta: String(d.cubeta || "pelagos-videos").trim(),
  };
}

/** Si los datos alcanzan para firmar. */
export const lista = (d) => !!(d && d.url && d.id && d.secreto && d.cubeta);

/**
 * Un enlace firmado para ver un archivo del almacén, válido `segundos` (máximo 7 días).
 * `ahora` se puede fijar para las pruebas.
 */
export async function enlace(datos, archivo, segundos = 6 * 3600, ahora = new Date()) {
  const d = limpiar(datos);
  if (!lista(d) || !archivo) return "";
  const camino = "/" + [d.cubeta, ...String(archivo).split("/")].map(codificar).join("/");
  return firmar({ origen: d.url, camino, id: d.id, secreto: d.secreto, region: "auto", segundos, ahora });
}

/** La firma en sí (exportada para probarla con el ejemplo oficial de AWS). */
export async function firmar({ origen, camino, id, secreto, region, segundos, ahora }) {
  const host = origen.replace(/^https:\/\//, "");
  const fecha = ahora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");   // 20261014T130000Z
  const dia = fecha.slice(0, 8);
  const alcance = `${dia}/${region}/s3/aws4_request`;
  const params = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${id}/${alcance}`],
    ["X-Amz-Date", fecha],
    ["X-Amz-Expires", String(Math.max(1, Math.min(604800, Math.round(segundos))))],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const consulta = params.map(([k, v]) => codificar(k) + "=" + codificar(v)).sort().join("&");
  const canonica = ["GET", camino, consulta, "host:" + host + "\n", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const aFirmar = ["AWS4-HMAC-SHA256", fecha, alcance, await sha256(canonica)].join("\n");
  let k = await hmac("AWS4" + secreto, dia);
  k = await hmac(k, region);
  k = await hmac(k, "s3");
  k = await hmac(k, "aws4_request");
  const firma = hex(await hmac(k, aFirmar));
  return `${origen}${camino}?${consulta}&X-Amz-Signature=${firma}`;
}
