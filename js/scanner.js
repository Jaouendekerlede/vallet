// Scan d'un code avec la caméra, via le BarcodeDetector natif du navigateur
// (gratuit, sans bibliothèque). Limite connue : il existe sur Chrome Android
// mais PAS sur Safari iOS ni Chrome Windows -- ailleurs, on saisit la valeur
// à la main (disponible() = false). Un scanner de secours (ZXing, ~400 Ko,
// chargé à la demande) pourra être ajouté plus tard si besoin.

import { FORMATS_SCANNER } from "./config.js";

export function disponible() {
  return "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
}

// Ouvre la caméra dans `video` jusqu'à lire un code. Renvoie
// { valeur, format, formatBrut } (format = null si on ne sait pas le
// redessiner) ou lève une erreur. `signal` (AbortSignal) permet d'annuler.
export async function scanner(video, signal) {
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
