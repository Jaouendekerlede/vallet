// Liste/grille des cartes : recherche, filtres (favoris, catégories,
// étiquettes), tri, ordre manuel, vue grille ou liste.

import { CATEGORIES, RAPPEL_SAUVEGARDE_JOURS } from "./config.js";
import { deplacerCarte, listerCartes, lireReglages, parOrdre, sauverReglages } from "./storage.js";
import { sourceLogo } from "./logos.js";
import { etatValidite, formaterSolde } from "./validite.js";

const $ = (id) => document.getElementById(id);
const reglages = lireReglages();
const etat = { recherche: "", filtre: "toutes", tri: reglages.tri ?? "favoris", vue: reglages.vue ?? "grille" };
let rappelMasque = false;
let surOuvrir = () => {};

const TRIS = {
  favoris: (a, b) => Number(b.favori) - Number(a.favori) || a.nom.localeCompare(b.nom, "fr"),
  recentes: (a, b) => b.ouvertLe - a.ouvertLe || a.nom.localeCompare(b.nom, "fr"),
  nom: (a, b) => a.nom.localeCompare(b.nom, "fr"),
  ajout: (a, b) => b.creeLe - a.creeLe,
  manuel: parOrdre,
};

function normaliser(t) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function passeFiltre(carte) {
  const f = etat.filtre;
  if (f === "toutes") return true;
  if (f === "fav") return carte.favori;
  if (f.startsWith("cat:")) return carte.categorie === f.slice(4);
  return (carte.etiquettes ?? []).includes(f.slice(4));
}

function element(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

function creerTuile(carte, index, manuel) {
  const tuile = element("div", "v-tuile" + (carte.type === "photo" ? " photo" : ""));
  tuile.setAttribute("role", "button");
  tuile.tabIndex = 0;
  tuile.style.setProperty("--c", carte.couleur);
  tuile.style.setProperty("--i", Math.min(index, 14));
  if (carte.type === "photo") tuile.style.backgroundImage = `url("${carte.photo}")`;

  const cat = CATEGORIES.find((c) => c.id === carte.categorie) ?? CATEGORIES[CATEGORIES.length - 1];
  // Pas de vrai logo d'enseigne (droits + poids) : une initiale dans un rond.
  const badge = element("span", "v-badge", (carte.nom.match(/[\p{L}\p{N}]/u)?.[0] ?? "•").toUpperCase());
  // Logo facultatif (voir logos.js) : remplace l'initiale une fois chargé ;
  // s'il est introuvable ou hors-ligne, l'initiale reste.
  const source = sourceLogo(carte);
  if (source) {
    const img = new Image();
    img.alt = "";
    img.addEventListener("load", () => {
      badge.textContent = "";
      badge.classList.add("logo");
      badge.append(img);
    });
    img.src = source;
  }

  const droite = element("span", "v-droite");
  if (carte.favori) droite.append(element("span", "v-tuile-star", "★"));
  if (manuel) {
    for (const [symbole, delta, titre] of [["◀", -1, "Déplacer avant"], ["▶", 1, "Déplacer après"]]) {
      const b = element("button", "v-fleche", symbole);
      b.type = "button";
      b.title = titre;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        deplacerCarte(carte.id, delta);
        afficherGrille();
      });
      droite.append(b);
    }
  }

  const bas = element("span", "v-bas");
  bas.append(element("span", "v-tuile-nom", carte.nom));
  const meta = element("span", "v-tuile-meta", `${cat.icone} ${cat.nom}`);
  const solde = formaterSolde(carte.solde);
  if (solde) meta.textContent += ` · ${solde}`;
  bas.append(meta);
  const validite = etatValidite(carte);
  if (validite) bas.append(element("span", `v-pastille ${validite.classe}`, validite.texte));

  tuile.append(badge, droite, bas);
  const ouvrir = () => {
    navigator.vibrate?.(10);
    surOuvrir(carte.id);
  };
  tuile.addEventListener("click", ouvrir);
  tuile.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ouvrir();
    }
  });
  return tuile;
}

function afficherFiltres(cartes) {
  const conteneur = $("v-filtres");
  conteneur.replaceChildren();
  const puces = [{ id: "toutes", nom: "Toutes" }];
  if (cartes.some((c) => c.favori)) puces.push({ id: "fav", nom: "★ Favoris" });
  for (const c of CATEGORIES) if (cartes.some((x) => x.categorie === c.id)) puces.push({ id: `cat:${c.id}`, nom: c.nom });
  const etiquettes = [...new Set(cartes.flatMap((c) => c.etiquettes ?? []))].sort((a, b) => a.localeCompare(b, "fr"));
  for (const t of etiquettes) puces.push({ id: `tag:${t}`, nom: `# ${t}` });
  if (!puces.some((p) => p.id === etat.filtre)) etat.filtre = "toutes";
  for (const p of puces) {
    const b = element("button", "v-puce" + (etat.filtre === p.id ? " actif" : ""), p.nom);
    b.type = "button";
    b.addEventListener("click", () => {
      etat.filtre = p.id;
      afficherGrille();
    });
    conteneur.append(b);
  }
}

function afficherRappel(nbCartes) {
  const r = lireReglages();
  const dernier = r.derniereSauvegarde ?? 0;
  const jours = Math.floor((Date.now() - dernier) / 86_400_000);
  const du = r.rappel && nbCartes > 0 && !rappelMasque && jours >= RAPPEL_SAUVEGARDE_JOURS;
  $("v-rappel").hidden = !du;
  if (du) $("v-rappel-texte").textContent = dernier ? `Dernière sauvegarde il y a ${jours} jours.` : "Tu n'as encore jamais créé de lien de sauvegarde.";
}

export function afficherGrille() {
  const toutes = listerCartes();
  afficherFiltres(toutes);
  afficherRappel(toutes.length);
  const requete = normaliser(etat.recherche.trim());
  const visibles = toutes
    .filter(passeFiltre)
    .filter((c) => !requete || normaliser(`${c.nom} ${c.notes ?? ""} ${(c.etiquettes ?? []).join(" ")}`).includes(requete))
    .sort(TRIS[etat.tri] ?? TRIS.favoris);
  const grille = $("v-grille");
  grille.classList.toggle("liste", etat.vue === "liste");
  $("v-vue-btn").textContent = etat.vue === "liste" ? "▦" : "☰";
  $("v-vue-btn").title = etat.vue === "liste" ? "Afficher en grille" : "Afficher en liste";
  grille.replaceChildren();
  if (!visibles.length) {
    const vide = element("div", "v-vide", toutes.length ? "Aucune carte ne correspond." : "Aucune carte pour l'instant.\nAppuie sur ＋ pour ajouter ta première carte de fidélité, d'adhésion, cadeau ou badge.");
    grille.append(vide);
    return;
  }
  const manuel = etat.tri === "manuel";
  grille.append(...visibles.map((c, i) => creerTuile(c, i, manuel)));
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
  $("v-vue-btn").addEventListener("click", () => {
    etat.vue = etat.vue === "liste" ? "grille" : "liste";
    sauverReglages({ vue: etat.vue });
    afficherGrille();
  });
  $("v-recherche").addEventListener("input", (e) => {
    etat.recherche = e.target.value;
    afficherGrille();
  });
  $("v-rappel-plus-tard").addEventListener("click", () => {
    rappelMasque = true;
    afficherGrille();
  });
  $("v-rappel-ouvrir").addEventListener("click", () => $("v-reglages-btn").click());
  afficherGrille();
}
