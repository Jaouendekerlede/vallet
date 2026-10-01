// Fenêtre Réglages : lien de sauvegarde manuel et mentions légales.

import { creerLienSauvegarde } from "./restauration.js";
import { MENTION_COURTE, MENTION_LEGALE, VERSION_TEXTE } from "./mentions.js";

const $ = (id) => document.getElementById(id);

// Au-delà, certaines messageries et navigateurs coupent le lien.
const LIEN_LONG = 30000;

export function initialiserReglages() {
  $("v-version").textContent = VERSION_TEXTE;
  $("v-mention").textContent = `${MENTION_COURTE}. ${MENTION_LEGALE}`;
  $("v-reglages-btn").addEventListener("click", () => {
    $("v-sauvegarde-retour").hidden = true;
    $("v-reglages").showModal();
  });
  $("v-reglages-fermer").addEventListener("click", () => $("v-reglages").close());
  $("v-sauvegarde-btn").addEventListener("click", async () => {
    const retour = $("v-sauvegarde-retour");
    retour.hidden = false;
    try {
      const { lien } = await creerLienSauvegarde();
      let copie = false;
      try {
        await navigator.clipboard.writeText(lien);
        copie = true;
      } catch {
        // Presse-papiers refusé : le lien reste affiché pour le copier à la main.
      }
      retour.textContent = `${copie ? "✅ Lien copié dans le presse-papiers. " : "Copie ce lien : "}${lien.length > LIEN_LONG ? "⚠️ Il est très long (beaucoup de photos) : certaines messageries le coupent. Envoie-le plutôt par mail, ou garde-le dans une note. " : ""}${copie ? "" : lien}`;
    } catch (e) {
      retour.textContent = `⚠️ Impossible de créer le lien : ${e.message}`;
    }
  });
}
