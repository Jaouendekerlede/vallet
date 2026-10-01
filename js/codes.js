// Génération des codes-barres / QR codes. Les petites bibliothèques
// (js/vendor/) ne sont chargées qu'à la première utilisation. Elles sont dans
// le dépôt (pas sur un CDN) pour que le plein écran en caisse marche aussi
// sans réseau.

import { chargerScript } from "./chargeur.js";

// Format le plus probable d'après la valeur saisie (modifiable ensuite).
export function deviner(valeur) {
  if (/^\d{13}$/.test(valeur)) return "EAN13";
  if (/^\d{12}$/.test(valeur)) return "UPC";
  if (/^\d{8}$/.test(valeur)) return "EAN8";
  if (/^https?:\/\//i.test(valeur) || valeur.length > 40) return "QR";
  return "CODE128";
}

// Dessine le code dans `conteneur` (vidé au préalable). Lève une erreur si la
// valeur est impossible dans ce format (ex. clé de contrôle EAN fausse).
export async function dessiner(conteneur, valeur, format) {
  conteneur.replaceChildren();
  if (format === "QR") {
    await chargerScript("js/vendor/qrcode-generator.js");
    const qr = window.qrcode(0, "M");
    qr.addData(valeur);
    qr.make();
    conteneur.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
    return;
  }
  await chargerScript("js/vendor/JsBarcode.all.min.js");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  conteneur.appendChild(svg);
  try {
    window.JsBarcode(svg, valeur, {
      format,
      lineColor: "#000",
      background: "#fff",
      margin: 10,
      width: 3,
      height: 120,
      displayValue: true,
      fontSize: 18,
      valid: (ok) => {
        if (!ok) throw new Error("valeur impossible dans ce format");
      },
    });
  } catch (e) {
    conteneur.replaceChildren();
    throw new Error(e.message || "valeur impossible dans ce format");
  }
  // Le SVG doit s'adapter à la largeur disponible (et rester exportable en image).
  if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${svg.getAttribute("width")} ${svg.getAttribute("height")}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.style.width = "100%";
}
