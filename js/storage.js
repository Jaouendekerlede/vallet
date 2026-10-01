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

// Ordre manuel : `ordre` si la carte a été déplacée, sinon sa date de création.
export const parOrdre = (a, b) => (a.ordre ?? a.creeLe) - (b.ordre ?? b.creeLe);

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
    resultat = {
      favori: false,
      notes: "",
      etiquettes: [],
      validite: "",
      solde: "",
      photoVerso: null,
      ouvertLe: 0,
      ...carte,
      id: `c_${maintenant.toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      creeLe: maintenant,
      ordre: maintenant,
    };
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

// Décale une carte dans l'ordre manuel (delta = -1 vers le début, +1 vers la fin).
export function deplacerCarte(id, delta) {
  const cartes = listerCartes().sort(parOrdre);
  const i = cartes.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= cartes.length) return;
  [cartes[i], cartes[j]] = [cartes[j], cartes[i]];
  cartes.forEach((c, k) => (c.ordre = k));
  ecrireJson(STORAGE_KEYS.cartes, cartes);
}

export function dupliquerCarte(id) {
  const carte = trouverCarte(id);
  if (!carte) return null;
  const { id: _id, creeLe, ordre, ...reste } = carte;
  return enregistrerCarte({ ...reste, nom: `${carte.nom} (copie)`, favori: false, ouvertLe: 0 });
}

// Ajoute une carte reçue par un lien de partage (jamais d'écrasement).
export function importerCarte(carte) {
  if (typeof carte?.nom !== "string" || !["code", "photo"].includes(carte.type)) throw new Error("ce lien n'est pas une carte Vallet");
  const { id, creeLe, ordre, ...reste } = carte;
  const ajoutee = enregistrerCarte({ ...reste, favori: false, ouvertLe: 0 });
  if (!ajoutee) throw new Error("stockage de l'appareil plein");
  return ajoutee;
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

function clesVallet() {
  const cles = [];
  for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith(PREFIXE)) cles.push(localStorage.key(i));
  return cles;
}

// Nombre de caractères occupés dans le localStorage par Vallet.
export function espaceUtilise() {
  return clesVallet().reduce((total, cle) => total + cle.length + (localStorage.getItem(cle)?.length ?? 0), 0);
}

export function exporterDonnees() {
  const donnees = {};
  for (const cle of clesVallet()) donnees[cle] = localStorage.getItem(cle);
  return { format: FORMAT_SAUVEGARDE, version: 2, date: new Date().toISOString(), donnees };
}

// Remplace les données de cet appareil par celles de la sauvegarde. Renvoie
// le nombre d'éléments restaurés, ou lève une erreur si ce n'en est pas une.
export function importerDonnees(sauvegarde) {
  if (sauvegarde?.format !== FORMAT_SAUVEGARDE || typeof sauvegarde.donnees !== "object") {
    throw new Error("ce lien n'est pas une sauvegarde Vallet");
  }
  const entrees = Object.entries(sauvegarde.donnees).filter(([cle, valeur]) => cle.startsWith(PREFIXE) && typeof valeur === "string");
  for (const cle of clesVallet()) localStorage.removeItem(cle);
  for (const [cle, valeur] of entrees) localStorage.setItem(cle, valeur);
  return entrees.length;
}

// Efface toutes les données de Vallet sur cet appareil (code PIN oublié).
export function toutEffacer() {
  for (const cle of clesVallet()) localStorage.removeItem(cle);
}
