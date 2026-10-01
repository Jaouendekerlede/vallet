// Point d'entrée : restaure une éventuelle sauvegarde passée dans l'adresse,
// affiche la grille et câble les modules.

import { afficherGrille, initialiserGrille } from "./grille.js";
import { ouvrirPleinEcran, initialiserPleinEcran } from "./plein-ecran.js";
import { initialiserFormulaire, ouvrirFormulaire } from "./formulaire.js";
import { initialiserReglages } from "./reglages.js";
import { restaurerDepuisAdresse } from "./restauration.js";

async function demarrer() {
  try {
    const restaures = await restaurerDepuisAdresse();
    if (restaures !== null) alert(`✅ ${restaures} éléments restaurés (cartes et réglages).`);
  } catch (e) {
    alert(`⚠️ Lien de sauvegarde invalide : ${e.message}`);
  }
  initialiserGrille(ouvrirPleinEcran);
  initialiserPleinEcran({ apresChangement: afficherGrille, modifier: ouvrirFormulaire });
  initialiserFormulaire(afficherGrille);
  initialiserReglages();
  document.getElementById("v-ajout-btn").addEventListener("click", () => ouvrirFormulaire());
}

demarrer();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
