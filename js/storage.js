// Stockage local : cartes et réglages (localStorage uniquement).

import { STORAGE_KEYS } from "./config.js";

function lireJson(cle, defaut) {
  try {
    const v = JSON.parse(localStorage.getItem(cle));
    return v ?? defaut;
  } catch {
    return defaut;
  }
}

// Renvoie false si le stockage est plein (les photos pèsent) : l'appelant
// doit alors prévenir l'utilisateur, la carte n'a pas été enregistrée.
function ecrireJson(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

export function listerCartes() {
  return lireJson(STORAGE_KEYS.cartes, []);
}

export function trouverCarte(id) {
  return listerCartes().find((c) => c.id === id) ?? null;
}

// Ajoute (sans id) ou met à jour (avec id) une carte. Renvoie la carte, ou
// null si le stockage est plein.
export function enregistrerCarte(carte) {
  const cartes = listerCartes();
  const maintenant = Date.now();
  let resultat;
  const i = carte.id ? cartes.findIndex((c) => c.id === carte.id) : -1;
  if (i >= 0) {
    resultat = { ...cartes[i], ...carte };
    cartes[i] = resultat;
  } else {
    resultat = { favori: false, notes: "", ouvertLe: 0, ...carte, id: `c_${maintenant.toString(36)}${Math.random().toString(36).slice(2, 5)}`, creeLe: maintenant };
    cartes.push(resultat);
  }
  return ecrireJson(STORAGE_KEYS.cartes, cartes) ? resultat : null;
}

export function supprimerCarte(id) {
  ecrireJson(STORAGE_KEYS.cartes, listerCartes().filter((c) => c.id !== id));
}

export function basculerFavori(id) {
  const carte = trouverCarte(id);
  if (carte) enregistrerCarte({ id, favori: !carte.favori });
}

export function noterOuverture(id) {
  enregistrerCarte({ id, ouvertLe: Date.now() });
}

export function lireReglages() {
  return lireJson(STORAGE_KEYS.reglages, {});
}

export function sauverReglages(partiel) {
  ecrireJson(STORAGE_KEYS.reglages, { ...lireReglages(), ...partiel });
}

// ── Sauvegarde / restauration (toutes les clés "vallet_") ───────────────
const PREFIXE = "vallet_";
const FORMAT_SAUVEGARDE = "vallet-sauvegarde";

export function exporterDonnees() {
  const donnees = {};
  for (let i = 0; i < localStorage.length; i++) {
    const cle = localStorage.key(i);
    if (cle?.startsWith(PREFIXE)) donnees[cle] = localStorage.getItem(cle);
  }
  return { format: FORMAT_SAUVEGARDE, version: 1, date: new Date().toISOString(), donnees };
}

// Remplace les données de cet appareil par celles de la sauvegarde. Renvoie
// le nombre d'éléments restaurés, ou lève une erreur si ce n'en est pas une.
export function importerDonnees(sauvegarde) {
  if (sauvegarde?.format !== FORMAT_SAUVEGARDE || typeof sauvegarde.donnees !== "object") {
    throw new Error("ce lien n'est pas une sauvegarde Vallet");
  }
  const entrees = Object.entries(sauvegarde.donnees).filter(([cle, valeur]) => cle.startsWith(PREFIXE) && typeof valeur === "string");
  const anciennes = [];
  for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith(PREFIXE)) anciennes.push(localStorage.key(i));
  for (const cle of anciennes) localStorage.removeItem(cle);
  for (const [cle, valeur] of entrees) localStorage.setItem(cle, valeur);
  return entrees.length;
}
