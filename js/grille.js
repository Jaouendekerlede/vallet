// Liste/grille des cartes : recherche, filtre par catégorie, tri.

import { CATEGORIES } from "./config.js";
import { listerCartes, lireReglages, sauverReglages } from "./storage.js";

const $ = (id) => document.getElementById(id);
const etat = { recherche: "", categorie: "toutes", tri: lireReglages().tri ?? "favoris" };
let surOuvrir = () => {};

const TRIS = {
  favoris: (a, b) => Number(b.favori) - Number(a.favori) || a.nom.localeCompare(b.nom, "fr"),
  recentes: (a, b) => b.ouvertLe - a.ouvertLe || a.nom.localeCompare(b.nom, "fr"),
  nom: (a, b) => a.nom.localeCompare(b.nom, "fr"),
  ajout: (a, b) => b.creeLe - a.creeLe,
};

function normaliser(t) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function creerTuile(carte) {
  const tuile = document.createElement("button");
  tuile.type = "button";
  tuile.className = "v-tuile" + (carte.type === "photo" ? " photo" : "");
  tuile.style.setProperty("--c", carte.couleur);
  if (carte.type === "photo") tuile.style.backgroundImage = `url("${carte.photo}")`;
  const cat = CATEGORIES.find((c) => c.id === carte.categorie) ?? CATEGORIES[CATEGORIES.length - 1];
  const nom = document.createElement("span");
  nom.className = "v-tuile-nom";
  nom.textContent = carte.nom;
  const bas = document.createElement("span");
  bas.className = "v-tuile-bas";
  bas.textContent = `${cat.icone} ${cat.nom}`;
  tuile.append(nom, bas);
  if (carte.favori) {
    const etoile = document.createElement("span");
    etoile.className = "v-tuile-star";
    etoile.textContent = "★";
    tuile.append(etoile);
  }
  tuile.addEventListener("click", () => surOuvrir(carte.id));
  return tuile;
}

function afficherFiltres(cartes) {
  const conteneur = $("v-filtres");
  conteneur.replaceChildren();
  const puces = [{ id: "toutes", nom: "Toutes" }, ...CATEGORIES.filter((c) => cartes.some((x) => x.categorie === c.id))];
  for (const p of puces) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "v-puce" + (etat.categorie === p.id ? " actif" : "");
    b.textContent = p.nom;
    b.addEventListener("click", () => {
      etat.categorie = p.id;
      afficherGrille();
    });
    conteneur.append(b);
  }
}

export function afficherGrille() {
  const toutes = listerCartes();
  if (etat.categorie !== "toutes" && !toutes.some((c) => c.categorie === etat.categorie)) etat.categorie = "toutes";
  afficherFiltres(toutes);
  const requete = normaliser(etat.recherche.trim());
  const visibles = toutes
    .filter((c) => etat.categorie === "toutes" || c.categorie === etat.categorie)
    .filter((c) => !requete || normaliser(`${c.nom} ${c.notes ?? ""}`).includes(requete))
    .sort(TRIS[etat.tri] ?? TRIS.favoris);
  const grille = $("v-grille");
  grille.replaceChildren();
  if (!visibles.length) {
    const vide = document.createElement("div");
    vide.className = "v-vide";
    vide.textContent = toutes.length ? "Aucune carte ne correspond." : "Aucune carte pour l'instant.\nAppuie sur ＋ pour ajouter ta première carte de fidélité, d'adhésion, cadeau ou badge.";
    vide.style.whiteSpace = "pre-line";
    grille.append(vide);
    return;
  }
  grille.append(...visibles.map(creerTuile));
}

// `ouvrir(id)` est appelé quand on appuie sur une carte.
export function initialiserGrille(ouvrir) {
  surOuvrir = ouvrir;
  $("v-tri").value = etat.tri;
  $("v-tri").addEventListener("change", (e) => {
    etat.tri = e.target.value;
    sauverReglages({ tri: etat.tri });
    afficherGrille();
  });
  $("v-recherche").addEventListener("input", (e) => {
    etat.recherche = e.target.value;
    afficherGrille();
  });
  afficherGrille();
}
