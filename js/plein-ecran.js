// Affichage plein écran d'une carte pour le passage en caisse : fond blanc
// (le plus lisible pour un lecteur), code en grand, écran maintenu allumé.
// Limite : une PWA ne peut pas régler la luminosité de l'écran ; le fond
// blanc aide, mais il faut monter la luminosité à la main si le scan peine.

import { dessiner, deviner } from "./codes.js";
import { trouverCarte, basculerFavori, noterOuverture } from "./storage.js";

const $ = (id) => document.getElementById(id);
let carteOuverte = null;
let verrou = null;
let surChangement = () => {};
let surModifier = () => {};

async function garderEcranAllume() {
  try {
    verrou = await navigator.wakeLock?.request("screen");
  } catch {
    // Refusé (économie d'énergie…) : l'écran pourra s'éteindre, pas bloquant.
  }
}

function libererEcran() {
  verrou?.release().catch(() => {});
  verrou = null;
}

export async function ouvrirPleinEcran(id) {
  const carte = trouverCarte(id);
  if (!carte) return;
  carteOuverte = carte;
  noterOuverture(id);
  $("v-plein-nom").textContent = carte.nom;
  $("v-plein-valeur").textContent = carte.type === "code" ? carte.code.valeur : "";
  $("v-plein-favori").textContent = carte.favori ? "★ Favori" : "☆ Favori";
  $("v-plein").hidden = false;
  garderEcranAllume();
  const corps = $("v-plein-corps");
  corps.replaceChildren();
  if (carte.type === "photo") {
    const img = document.createElement("img");
    img.src = carte.photo;
    img.alt = carte.nom;
    corps.append(img);
    return;
  }
  try {
    await dessiner(corps, carte.code.valeur, carte.code.format);
  } catch {
    // Format devenu invalide : on retombe sur le Code 128, accepté partout.
    try {
      await dessiner(corps, carte.code.valeur, deviner(carte.code.valeur) === "QR" ? "QR" : "CODE128");
    } catch (e) {
      corps.textContent = `Impossible d'afficher ce code : ${e.message}`;
    }
  }
}

export function fermerPleinEcran() {
  $("v-plein").hidden = true;
  libererEcran();
  carteOuverte = null;
  surChangement();
}

// Le verrou d'écran est perdu quand l'appli passe en arrière-plan.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && carteOuverte) garderEcranAllume();
});

export function initialiserPleinEcran({ apresChangement, modifier }) {
  surChangement = apresChangement;
  surModifier = modifier;
  $("v-plein-fermer").addEventListener("click", fermerPleinEcran);
  $("v-plein-favori").addEventListener("click", () => {
    if (!carteOuverte) return;
    basculerFavori(carteOuverte.id);
    carteOuverte = trouverCarte(carteOuverte.id);
    $("v-plein-favori").textContent = carteOuverte.favori ? "★ Favori" : "☆ Favori";
  });
  $("v-plein-modifier").addEventListener("click", () => {
    const id = carteOuverte?.id;
    fermerPleinEcran();
    if (id) surModifier(id);
  });
  // Touche Échap / bouton retour : ferme le plein écran.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("v-plein").hidden) fermerPleinEcran();
  });
}
