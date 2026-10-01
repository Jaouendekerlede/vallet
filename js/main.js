// Point d'entrée : thème, verrou PIN, restauration d'un lien passé dans
// l'adresse, photo reçue par « Partager vers Vallet », puis la grille.

import { appliquerTheme } from "./theme.js";
import { initialiserVerrou } from "./verrou.js";
import { afficherGrille, initialiserGrille } from "./grille.js";
import { ouvrirPleinEcran, initialiserPleinEcran } from "./plein-ecran.js";
import { initialiserFormulaire, ouvrirFormulaire } from "./formulaire.js";
import { initialiserReglages } from "./reglages.js";
import { traiterAdresse } from "./restauration.js";
import { reduirePhoto } from "./photo.js";

appliquerTheme();

// Image envoyée par le menu Partager du téléphone : le service worker l'a
// rangée dans un cache, on la reprend ici pour pré-remplir une nouvelle carte.
async function recupererPartage() {
  if (!location.search.includes("partage=1")) return null;
  history.replaceState(null, "", location.pathname);
  try {
    const cache = await caches.open("vallet-partage");
    const cle = new URL("image-partagee", location.href).href;
    const reponse = await cache.match(cle);
    if (!reponse) return null;
    await cache.delete(cle);
    return await reduirePhoto(await reponse.blob());
  } catch {
    return null;
  }
}

async function demarrer() {
  initialiserVerrou();
  try {
    const r = await traiterAdresse();
    if (r?.type === "sauvegarde") alert(`✅ ${r.nombre} éléments restaurés (cartes et réglages).`);
    if (r?.type === "carte") alert(`✅ Carte « ${r.nom} » ajoutée à tes cartes.`);
    if (r) appliquerTheme();
  } catch (e) {
    alert(`⚠️ Lien invalide : ${e.message}`);
  }
  initialiserGrille(ouvrirPleinEcran);
  initialiserPleinEcran({ apresChangement: afficherGrille, modifier: ouvrirFormulaire });
  initialiserFormulaire(afficherGrille);
  initialiserReglages();
  document.getElementById("v-ajout-btn").addEventListener("click", () => ouvrirFormulaire());
  const photoPartagee = await recupererPartage();
  if (photoPartagee) ouvrirFormulaire(null, { photo: photoPartagee });
  const splash = document.getElementById("v-splash");
  splash.classList.add("fini");
  setTimeout(() => splash.remove(), 500);
}

demarrer();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
