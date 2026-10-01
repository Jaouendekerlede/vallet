// Liens de sauvegarde et de partage : les données compressées dans l'adresse
// de l'appli, après le « # ». Gardé (envoyé à soi-même, noté quelque part…),
// un lien de sauvegarde suffit pour tout retrouver sur un nouveau téléphone --
// sans compte, sans serveur : la partie après « # » n'est jamais envoyée à
// GitHub Pages. Pas de rappel automatique par défaut (juste un bouton dans
// Réglages ; le rappel est une option à activer).
// Limite : avec beaucoup de cartes en photo, le lien devient très long et
// certaines messageries le coupent ; l'appli le signale (voir reglages.js).
// Deux sortes de liens : #restaurer= (tout remplacer) et #carte= (ajouter
// une seule carte reçue d'un proche, sans rien écraser).

import { exporterDonnees, importerDonnees, importerCarte } from "./storage.js";

const MARQUE = "#restaurer=";
const MARQUE_CARTE = "#carte=";

async function transformer(octets, flux) {
  const sortie = new Blob([octets]).stream().pipeThrough(flux);
  return new Uint8Array(await new Response(sortie).arrayBuffer());
}

function versBase64Url(octets) {
  let binaire = "";
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function depuisBase64Url(texte) {
  const binaire = atob(texte.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0));
}

async function compresser(objet) {
  return versBase64Url(await transformer(new TextEncoder().encode(JSON.stringify(objet)), new CompressionStream("deflate")));
}

// Lève une erreur si le lien est abîmé (par exemple coupé par une messagerie).
async function decompresser(texte) {
  const octets = await transformer(depuisBase64Url(texte), new DecompressionStream("deflate"));
  return JSON.parse(new TextDecoder().decode(octets));
}

function baseAdresse(adresse) {
  return adresse.split("#")[0].split("?")[0];
}

// Adresse de l'appli (sans « # » ni paramètres) + données compressées.
export async function creerLienSauvegarde(adresse = location.href) {
  const sauvegarde = exporterDonnees();
  return { lien: `${baseAdresse(adresse)}${MARQUE}${await compresser(sauvegarde)}`, date: sauvegarde.date };
}

// Lien pour donner UNE carte à quelqu'un (la copie ne reprend ni favori ni historique).
export async function creerLienCarte(carte, adresse = location.href) {
  const { id, creeLe, ordre, ouvertLe, favori, ...reste } = carte;
  return `${baseAdresse(adresse)}${MARQUE_CARTE}${await compresser({ format: "vallet-carte", carte: reste })}`;
}

// À appeler une fois au démarrage. Si l'adresse contient un lien, l'applique et
// nettoie l'adresse. Renvoie { type: "sauvegarde", nombre } ou
// { type: "carte", nom }, ou null si l'adresse n'en contenait pas.
export async function traiterAdresse() {
  const hash = location.hash;
  const sauvegarde = hash.startsWith(MARQUE);
  if (!sauvegarde && !hash.startsWith(MARQUE_CARTE)) return null;
  history.replaceState(null, "", location.pathname);
  const contenu = await decompresser(hash.slice((sauvegarde ? MARQUE : MARQUE_CARTE).length));
  if (sauvegarde) return { type: "sauvegarde", nombre: importerDonnees(contenu) };
  if (contenu?.format !== "vallet-carte") throw new Error("ce lien n'est pas une carte Vallet");
  return { type: "carte", nom: importerCarte(contenu.carte).nom };
}
