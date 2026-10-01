// Scan d'un code avec la caméra. Deux moteurs, gratuits et sans serveur :
//  - le BarcodeDetector natif (Chrome Android, dont le Pixel) : rapide, rien à
//    télécharger ;
//  - sinon ZXing (js/vendor/, ~330 Ko, chargé seulement au premier scan) pour
//    iPhone, Chrome Windows, etc.

import { FORMATS_SCANNER, FORMATS_ZXING } from "./config.js";
import { chargerScript } from "./chargeur.js";

export function disponible() {
  return !!navigator.mediaDevices?.getUserMedia;
}

async function scannerNatif(video, signal) {
  const detecteur = new window.BarcodeDetector();
  const flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  video.srcObject = flux;
  await video.play();
  try {
    while (!signal.aborted) {
      const trouves = await detecteur.detect(video).catch(() => []);
      if (trouves.length) {
        return { valeur: trouves[0].rawValue, format: FORMATS_SCANNER[trouves[0].format] ?? null, formatBrut: trouves[0].format };
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error("scan annulé");
  } finally {
    flux.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}

async function scannerZxing(video, signal) {
  await chargerScript("js/vendor/zxing-library.min.js");
  const ZX = window.ZXing;
  const lecteur = new ZX.BrowserMultiFormatReader();
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      lecteur.reset();
      reject(new Error("scan annulé"));
    });
    lecteur
      .decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video, (resultat) => {
        if (!resultat) return;
        lecteur.reset();
        const brut = ZX.BarcodeFormat[resultat.getBarcodeFormat()];
        resolve({ valeur: resultat.getText(), format: FORMATS_ZXING[brut] ?? null, formatBrut: brut });
      })
      .catch((e) => {
        lecteur.reset();
        reject(e);
      });
  });
}

// Ouvre la caméra dans `video` jusqu'à lire un code. Renvoie
// { valeur, format, formatBrut } (format = null si on ne sait pas le
// redessiner) ou lève une erreur. `signal` (AbortSignal) permet d'annuler.
export function scanner(video, signal) {
  return "BarcodeDetector" in window ? scannerNatif(video, signal) : scannerZxing(video, signal);
}
