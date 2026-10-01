// Affichage plein écran d'une carte pour le passage en caisse : fond blanc
// (le plus lisible pour un lecteur), code en grand, écran maintenu allumé.
// Limite : une PWA ne peut pas régler la luminosité de l'écran ; le fond
// blanc aide, mais il faut monter la luminosité à la main si le scan peine.

import { dessiner, deviner } from "./codes.js";
import { creerLienCarte } from "./restauration.js";
import { partagerImage } from "./partage.js";
import { trouverCarte, basculerFavori, noterOuverture } from "./storage.js";
import { dateLongue, etatValidite, formaterSolde } from "./validite.js";

const $ = (id) => document.getElementById(id);
let carteOuverte = null;
let face = "recto";
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

function afficherInfos(carte) {
  const morceaux = [];
  const solde = formaterSolde(carte.solde);
  if (solde) morceaux.push(`Solde : ${solde}`);
  if (carte.validite) {
    const v = etatValidite(carte);
    morceaux.push(`${v?.classe === "expiree" ? "⚠️ Expirée depuis le" : "Valable jusqu'au"} ${dateLongue(carte.validite)}`);
  }
  $("v-plein-info").textContent = morceaux.join(" · ");
  $("v-plein-valeur").textContent = carte.type === "code" ? carte.code.valeur : "";
}

async function afficherCorps() {
  const carte = carteOuverte;
  const corps = $("v-plein-corps");
  corps.replaceChildren();
  $("v-plein-retourner").hidden = !(carte.type === "photo" && carte.photoVerso);
  $("v-plein-retourner").textContent = face === "recto" ? "↔ Voir le verso" : "↔ Voir le recto";
  if (carte.type === "photo") {
    const img = document.createElement("img");
    img.src = face === "verso" && carte.photoVerso ? carte.photoVerso : carte.photo;
    img.alt = `${carte.nom} (${face})`;
    corps.append(img);
    return;
  }
  try {
    await dessiner(corps, carte.code.valeur, carte.code.format);
  } catch {
    // Format devenu invalide : on retombe sur un format accepté partout.
    try {
      await dessiner(corps, carte.code.valeur, deviner(carte.code.valeur) === "QR" ? "QR" : "CODE128");
    } catch (e) {
      corps.textContent = `Impossible d'afficher ce code : ${e.message}`;
    }
  }
}

export async function ouvrirPleinEcran(id) {
  const carte = trouverCarte(id);
  if (!carte) return;
  carteOuverte = carte;
  face = "recto";
  noterOuverture(id);
  $("v-plein").style.setProperty("--c", carte.couleur);
  $("v-plein").classList.remove("zoom");
  $("v-plein-nom").textContent = carte.nom;
  $("v-plein-favori").textContent = carte.favori ? "★ Favori" : "☆ Favori";
  afficherInfos(carte);
  $("v-plein").hidden = false;
  garderEcranAllume();
  await afficherCorps();
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
  $("v-plein-agrandir").addEventListener("click", () => {
    const zoom = $("v-plein").classList.toggle("zoom");
    $("v-plein-agrandir").textContent = zoom ? "🔎 Réduire" : "🔍 Agrandir";
  });
  $("v-plein-retourner").addEventListener("click", () => {
    face = face === "recto" ? "verso" : "recto";
    afficherCorps();
  });
  $("v-plein-image").addEventListener("click", async () => {
    try {
      await partagerImage(carteOuverte, $("v-plein-corps"));
    } catch (e) {
      alert(`⚠️ Partage impossible : ${e.message}`);
    }
  });
  $("v-plein-lien").addEventListener("click", async () => {
    try {
      const lien = await creerLienCarte(carteOuverte);
      await navigator.clipboard.writeText(lien);
      alert("✅ Lien de la carte copié. Celui qui l'ouvre dans Vallet l'ajoute à ses cartes (sans rien écraser).");
    } catch (e) {
      alert(`⚠️ Lien impossible à copier : ${e.message}`);
    }
  });
  // Touche Échap / bouton retour : ferme le plein écran.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("v-plein").hidden) fermerPleinEcran();
  });
}
