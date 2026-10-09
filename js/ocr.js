// Reconnaissance de texte (OCR) avec Tesseract, gratuit et 100 % local : les
// fichiers (~9 Mo : moteur + langue française) ne sont chargés qu'au premier
// usage (même bibliothèque que Scanix, copiée dans js/vendor/ocr).

import { chargerScript } from "./chargeur.js";

let promesseWorker = null;

async function obtenirWorker() {
  promesseWorker ??= (async () => {
    await chargerScript("js/vendor/ocr/tesseract.min.js");
    const base = new URL("js/vendor/ocr/", location.href).href;
    return window.Tesseract.createWorker("fra", 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
    });
  })().catch((e) => {
    promesseWorker = null;
    throw e;
  });
  return promesseWorker;
}

// Lit le texte visible sur un canvas (photo de carte). Renvoie une chaîne
// brute, vide si rien de lisible ou en cas d'échec (hors-ligne la première
// fois, etc.) -- jamais bloquant pour le reste du formulaire.
export async function reconnaitreTexte(canvas) {
  try {
    const worker = await obtenirWorker();
    const { data } = await worker.recognize(canvas);
    return (data.text ?? "").trim();
  } catch {
    return "";
  }
}
