// Logos d'enseignes, 100 % gratuits et facultatifs. Deux sources possibles :
//  - « logo » : une image choisie dans la galerie, réduite et gardée dans la
//    carte (totalement local, marche toujours) ;
//  - « logoSite » : le favicon du site de l'enseigne, via le service gratuit
//    (non officiel) favicons de Google. Limites : le navigateur interdit d'en
//    garder une copie dans la carte (pas d'en-tête CORS), donc l'image est
//    chargée depuis Internet puis mise en cache par le service worker pour le
//    hors-ligne ; la qualité dépend du site (souvent 32-64 px) ; si le service
//    disparaît, l'initiale de la carte reprend sa place.
// Pas de logos embarqués dans l'appli : droits de marque et poids.

import { ouvrirImage } from "./photo.js";

// Quelques enseignes courantes -> site, pour pré-remplir le champ « site ».
const SITES_ENSEIGNES = {
  carrefour: "carrefour.fr", leclerc: "e-leclerc.com", "e.leclerc": "e-leclerc.com", auchan: "auchan.fr", intermarche: "intermarche.com", lidl: "lidl.fr",
  aldi: "aldi.fr", monoprix: "monoprix.fr", franprix: "franprix.fr", casino: "casino.fr", "super u": "magasins-u.com", "hyper u": "magasins-u.com",
  picard: "picard.fr", biocoop: "biocoop.fr", naturalia: "naturalia.fr", decathlon: "decathlon.fr", fnac: "fnac.com", darty: "darty.com",
  boulanger: "boulanger.com", leroy: "leroymerlin.fr", castorama: "castorama.fr", brico: "bricodepot.fr", ikea: "ikea.com", conforama: "conforama.fr",
  airfrance: "airfrance.fr",
 maisons: "maisonsdumonde.com", sephora: "sephora.fr", nocibe: "nocibe.fr", marionnaud: "marionnaud.fr", yves: "yves-rocher.fr",
  kiabi: "kiabi.com", zara: "zara.com", "h&m": "hm.com", hm: "hm.com", celio: "celio.com", jules: "jules.com", camaieu: "camaieu.fr",
  intersport: "intersport.fr", cultura: "cultura.com", gibert: "gibert.com", micromania: "micromania.fr", 
  total: "totalenergies.fr", shell: "shell.fr", esso: "esso.fr", bp: "bp.com", sncf: "sncf-connect.com", ouigo: "ouigo.com", navigo: "iledefrance-mobilites.fr",
  ibis: "all.accor.com", accor: "all.accor.com", amazon: "amazon.fr", mcdonald: "mcdonalds.fr",
  starbucks: "starbucks.fr", quick: "quick.fr", subway: "subway.com", cinema: "cinemaspathegaumont.com", pathe: "cinemaspathegaumont.com", ugc: "ugc.fr",
};

function sansAccents(t) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Site probable d'après le nom saisi (ex. « Carrefour City » -> carrefour.fr), ou "".
export function suggererSite(nom) {
  const mots = sansAccents(nom).split(/\s+/);
  for (const [cle, site] of Object.entries(SITES_ENSEIGNES)) {
    if (!cle.includes(" ") ? mots.includes(cle) || mots[0] === cle : sansAccents(nom).startsWith(cle)) return site;
  }
  return "";
}

// « https://www.carrefour.fr/magasins?x=1 » -> « carrefour.fr » (ou "" si invalide).
export function nettoyerDomaine(saisie) {
  const t = saisie.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(t) ? t : "";
}

export function urlFavicon(domaine) {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${encodeURIComponent(domaine)}&size=128`;
}

// Source d'image du logo d'une carte, ou null s'il n'y en a pas.
export function sourceLogo(carte) {
  if (carte.logo) return carte.logo;
  if (carte.logoSite) return urlFavicon(carte.logoSite);
  return null;
}

// Image choisie dans la galerie -> petit PNG carré 128 px (fond transparent).
export async function logoDepuisFichier(fichier) {
  const image = await ouvrirImage(fichier);
  const echelle = 128 / Math.max(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * echelle));
  canvas.height = Math.max(1, Math.round(image.height * echelle));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  return canvas.toDataURL("image/png");
}

// Vérifie qu'un favicon existe pour ce site (le service renvoie 404 sinon).
export function faviconExiste(domaine) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = urlFavicon(domaine);
  });
}
