// Fenêtre Réglages : thème, code PIN, espace utilisé, lien de sauvegarde
// manuel, rappel optionnel et mentions légales.

import { QUOTA_APPROX } from "./config.js";
import { creerLienSauvegarde } from "./restauration.js";
import { MENTION_COURTE, MENTION_LEGALE, VERSION_TEXTE } from "./mentions.js";
import { espaceUtilise, lireReglages, sauverReglages } from "./storage.js";
import { appliquerTheme } from "./theme.js";
import { definirPin, pinActif, retirerPin } from "./verrou.js";

const $ = (id) => document.getElementById(id);

// Au-delà, certaines messageries et navigateurs coupent le lien.
const LIEN_LONG = 30000;

function majEspace() {
  const utilise = espaceUtilise();
  const pct = Math.min(100, Math.round((utilise / QUOTA_APPROX) * 100));
  $("v-espace-barre").value = pct;
  $("v-espace-texte").textContent = `${(utilise / 1_000_000).toFixed(2).replace(".", ",")} M de caractères utilisés sur environ ${QUOTA_APPROX / 1_000_000} M (${pct} %). Les photos sont ce qui pèse le plus.`;
}

function majPin() {
  const actif = pinActif();
  $("v-pin-etat").textContent = actif ? "🔒 Code PIN actif : demandé au démarrage et après 30 s hors de l'appli." : "Aucun code PIN. Attention : c'est une barrière devant l'écran, pas un chiffrement des données.";
  $("v-pin-retirer").hidden = !actif;
  $("v-pin-saisie").value = "";
  $("v-pin-valider").textContent = actif ? "Changer le code" : "Activer le code";
}

export function initialiserReglages() {
  $("v-version").textContent = VERSION_TEXTE;
  $("v-mention").textContent = `${MENTION_COURTE}. ${MENTION_LEGALE}`;
  $("v-reglages-btn").addEventListener("click", () => {
    const r = lireReglages();
    $("v-theme").value = r.theme ?? "auto";
    $("v-rappel-option").checked = !!r.rappel;
    $("v-sauvegarde-retour").hidden = true;
    $("v-sauvegarde-date").textContent = r.derniereSauvegarde ? `Dernier lien créé le ${new Date(r.derniereSauvegarde).toLocaleDateString("fr-FR")}.` : "Aucun lien de sauvegarde créé pour l'instant.";
    majEspace();
    majPin();
    $("v-reglages").showModal();
  });
  $("v-reglages-fermer").addEventListener("click", () => $("v-reglages").close());
  $("v-theme").addEventListener("change", (e) => {
    sauverReglages({ theme: e.target.value });
    appliquerTheme(e.target.value);
  });
  $("v-rappel-option").addEventListener("change", (e) => sauverReglages({ rappel: e.target.checked }));

  $("v-pin-valider").addEventListener("click", async () => {
    const pin = $("v-pin-saisie").value;
    if (!/^\d{4}$/.test(pin)) return alert("Le code PIN doit faire exactement 4 chiffres.");
    await definirPin(pin);
    majPin();
  });
  $("v-pin-retirer").addEventListener("click", () => {
    if (confirm("Retirer le code PIN ?")) {
      retirerPin();
      majPin();
    }
  });

  $("v-sauvegarde-btn").addEventListener("click", async () => {
    const retour = $("v-sauvegarde-retour");
    retour.hidden = false;
    try {
      const { lien } = await creerLienSauvegarde();
      sauverReglages({ derniereSauvegarde: Date.now() });
      let copie = false;
      try {
        await navigator.clipboard.writeText(lien);
        copie = true;
      } catch {
        // Presse-papiers refusé : le lien reste affiché pour le copier à la main.
      }
      retour.textContent = `${copie ? "✅ Lien copié dans le presse-papiers. " : "Copie ce lien : "}${lien.length > LIEN_LONG ? "⚠️ Il est très long (beaucoup de photos) : certaines messageries le coupent. Envoie-le plutôt par mail, ou garde-le dans une note. " : ""}${copie ? "" : lien}`;
      $("v-sauvegarde-date").textContent = `Dernier lien créé le ${new Date().toLocaleDateString("fr-FR")}.`;
    } catch (e) {
      retour.textContent = `⚠️ Impossible de créer le lien : ${e.message}`;
    }
  });
}
