// Formulaire d'ajout / modification d'une carte.

import { CATEGORIES, COULEURS, FORMATS } from "./config.js";
import { dessiner, deviner } from "./codes.js";
import { reduirePhoto } from "./photo.js";
import { disponible as scanDisponible, lireImage, scanner } from "./scanner.js";
import { faviconExiste, logoDepuisFichier, nettoyerDomaine, sourceLogo, suggererSite } from "./logos.js";
import { dupliquerCarte, enregistrerCarte, supprimerCarte, trouverCarte } from "./storage.js";

const $ = (id) => document.getElementById(id);
let modif = null; // carte en cours de modification (null = nouvelle)
let mode = "code";
let couleur = COULEURS[5];
let photos = { recto: null, verso: null };
let slotCourant = "recto";
let formatChoisiAuMain = false;
let annulerScan = null;
let logo = { site: "", image: null }; // site = favicon d'un site, image = image choisie
let siteSaisiAuMain = false;
let delaiSuggestion = null;
let surChangement = () => {};

function majLogo() {
  const zone = $("v-f-logo-apercu");
  const source = sourceLogo({ logo: logo.image, logoSite: logo.site });
  zone.replaceChildren();
  if (source) {
    const img = new Image();
    img.alt = "";
    img.src = source;
    zone.append(img);
  } else zone.textContent = "?";
  $("v-f-logo-retirer").hidden = !source;
}

function messageLogo(texte) {
  $("v-f-logo-msg").textContent = texte ?? "";
  $("v-f-logo-msg").hidden = !texte;
}

async function chercherLogo() {
  const domaine = nettoyerDomaine($("v-f-site").value);
  if (!domaine) return messageLogo("Saisis le site de l'enseigne, par exemple carrefour.fr.");
  messageLogo("Recherche du logo…");
  if (await faviconExiste(domaine)) {
    logo = { site: domaine, image: null };
    $("v-f-site").value = domaine;
    majLogo();
    messageLogo("✅ Logo trouvé. C'est le petit logo du site : sa netteté dépend de l'enseigne. Il se charge depuis Internet (puis reste en mémoire pour le hors-ligne).");
  } else {
    messageLogo("Aucun logo trouvé pour ce site (ou pas de réseau). Tu peux choisir ta propre image, ou garder l'initiale.");
  }
}

function montrerErreur(texte) {
  $("v-f-erreur").textContent = texte ?? "";
  $("v-f-erreur").hidden = !texte;
}

function choisirMode(nouveau) {
  mode = nouveau;
  $("v-f-mode-code").classList.toggle("actif", mode === "code");
  $("v-f-mode-photo").classList.toggle("actif", mode === "photo");
  $("v-f-bloc-code").hidden = mode !== "code";
  $("v-f-bloc-photo").hidden = mode !== "photo";
  if (mode !== "code") arreterScan();
  montrerErreur("");
}

function afficherCouleurs() {
  const conteneur = $("v-f-couleurs");
  conteneur.replaceChildren();
  for (const c of COULEURS) {
    const b = document.createElement("button");
    b.type = "button";
    b.style.setProperty("--c", c);
    b.className = c === couleur ? "actif" : "";
    b.setAttribute("aria-label", `Couleur ${c}`);
    b.addEventListener("click", () => {
      couleur = c;
      afficherCouleurs();
    });
    conteneur.append(b);
  }
}

function majSlot(nom) {
  const slot = document.querySelector(`.v-photo-slot[data-slot="${nom}"]`);
  const img = slot.querySelector("img");
  img.hidden = !photos[nom];
  if (photos[nom]) img.src = photos[nom];
  slot.querySelector('[data-act="retirer"]').hidden = !photos[nom];
}

async function majApercu() {
  const valeur = $("v-f-valeur").value.trim();
  const zone = $("v-f-apercu");
  if (!valeur) {
    zone.replaceChildren();
    montrerErreur("");
    return;
  }
  try {
    await dessiner(zone, valeur, $("v-f-format").value);
    montrerErreur("");
  } catch (e) {
    zone.replaceChildren();
    montrerErreur(`Ce code ne peut pas être dessiné en ${$("v-f-format").selectedOptions[0].textContent} : ${e.message}. Change de format.`);
  }
}

function arreterScan() {
  annulerScan?.abort();
  annulerScan = null;
  $("v-f-scan-zone").hidden = true;
}

async function lancerScan() {
  if (!scanDisponible()) {
    montrerErreur("La caméra n'est pas accessible depuis ce navigateur. Saisis la valeur à la main, ou prends la carte en photo.");
    return;
  }
  montrerErreur("");
  annulerScan = new AbortController();
  $("v-f-scan-zone").hidden = false;
  try {
    const r = await scanner($("v-f-video"), annulerScan.signal);
    $("v-f-valeur").value = r.valeur;
    navigator.vibrate?.(60);
    if (r.format) {
      $("v-f-format").value = r.format;
      formatChoisiAuMain = true;
    } else {
      montrerErreur(`Code lu (${r.formatBrut}), mais ce format ne peut pas être redessiné en caisse. Choisis un format proche, ou prends la carte en photo.`);
    }
    arreterScan();
    if (r.format) majApercu();
  } catch (e) {
    arreterScan();
    if (e.message !== "scan annulé") montrerErreur(`Scan impossible : ${e.message || e.name}. Vérifie que l'autorisation caméra est accordée à l'appli.`);
  }
}

// `options.photo` : photo reçue par « Partager vers Vallet » (nouvelle carte en mode Photo).
export function ouvrirFormulaire(id = null, options = {}) {
  modif = id ? trouverCarte(id) : null;
  $("v-form-titre").textContent = modif ? "Modifier la carte" : "Nouvelle carte";
  $("v-f-supprimer").hidden = !modif;
  $("v-f-dupliquer").hidden = !modif;
  $("v-f-nom").value = modif?.nom ?? "";
  $("v-f-categorie").value = modif?.categorie ?? "fidelite";
  $("v-f-etiquettes").value = (modif?.etiquettes ?? []).join(", ");
  $("v-f-validite").value = modif?.validite ?? "";
  $("v-f-solde").value = modif?.solde ?? "";
  $("v-f-notes").value = modif?.notes ?? "";
  couleur = modif?.couleur ?? COULEURS[Math.floor(Math.random() * COULEURS.length)];
  afficherCouleurs();
  logo = { site: modif?.logoSite ?? "", image: modif?.logo ?? null };
  $("v-f-site").value = logo.site;
  siteSaisiAuMain = !!modif;
  messageLogo("");
  majLogo();
  photos = { recto: modif?.type === "photo" ? modif.photo : (options.photo ?? null), verso: modif?.photoVerso ?? null };
  majSlot("recto");
  majSlot("verso");
  $("v-f-valeur").value = modif?.type === "code" ? modif.code.valeur : "";
  $("v-f-format").value = modif?.type === "code" ? modif.code.format : "CODE128";
  formatChoisiAuMain = !!modif;
  $("v-f-apercu").replaceChildren();
  choisirMode(modif?.type ?? (options.photo ? "photo" : "code"));
  $("v-form").showModal();
  if (modif?.type === "code") majApercu();
}

function fermer() {
  arreterScan();
  $("v-form").close();
}

async function enregistrer(e) {
  e.preventDefault();
  const nom = $("v-f-nom").value.trim();
  if (!nom) return montrerErreur("Donne un nom à la carte.");
  const carte = {
    nom,
    categorie: $("v-f-categorie").value,
    couleur,
    notes: $("v-f-notes").value.trim(),
    etiquettes: [...new Set($("v-f-etiquettes").value.split(",").map((t) => t.trim()).filter(Boolean))],
    validite: $("v-f-validite").value,
    solde: $("v-f-solde").value.trim(),
    logo: logo.image,
    logoSite: logo.site,
    type: mode,
  };
  if (mode === "code") {
    const valeur = $("v-f-valeur").value.trim();
    if (!valeur) return montrerErreur("Saisis ou scanne la valeur du code (ou passe en mode Photo).");
    try {
      await dessiner(document.createElement("div"), valeur, $("v-f-format").value);
    } catch (err) {
      return montrerErreur(`Code invalide pour ce format : ${err.message}.`);
    }
    carte.code = { valeur, format: $("v-f-format").value };
    carte.photo = null;
    carte.photoVerso = null;
  } else {
    if (!photos.recto) return montrerErreur("Ajoute au moins la photo du recto (ou passe en mode Code-barres).");
    carte.photo = photos.recto;
    carte.photoVerso = photos.verso;
    carte.code = null;
  }
  if (modif) carte.id = modif.id;
  if (!enregistrerCarte(carte)) return montrerErreur("Stockage de l'appareil plein : supprime une carte ou retire le verso d'une photo.");
  fermer();
  surChangement();
}

export function initialiserFormulaire(apresChangement) {
  surChangement = apresChangement;
  $("v-f-categorie").replaceChildren(...CATEGORIES.map((c) => new Option(`${c.icone} ${c.nom}`, c.id)));
  $("v-f-format").replaceChildren(...FORMATS.map((f) => new Option(f.nom, f.id)));
  // Logo : site -> favicon, ou image perso. Pré-remplit le site d'après le nom.
  $("v-f-nom").addEventListener("input", () => {
    clearTimeout(delaiSuggestion);
    delaiSuggestion = setTimeout(() => {
      if (siteSaisiAuMain || logo.image) return;
      const site = suggererSite($("v-f-nom").value);
      if (site && site !== $("v-f-site").value) {
        $("v-f-site").value = site;
        chercherLogo();
      }
    }, 500);
  });
  $("v-f-site").addEventListener("input", () => (siteSaisiAuMain = true));
  $("v-f-logo-chercher").addEventListener("click", chercherLogo);
  $("v-f-logo-image").addEventListener("click", () => $("v-f-fichier-logo").click());
  $("v-f-fichier-logo").addEventListener("change", async (e) => {
    const fichier = e.target.files[0];
    e.target.value = "";
    if (!fichier) return;
    try {
      logo = { site: "", image: await logoDepuisFichier(fichier) };
      $("v-f-site").value = "";
      siteSaisiAuMain = true;
      majLogo();
      messageLogo("");
    } catch {
      messageLogo("Image illisible, essaie-en une autre.");
    }
  });
  $("v-f-logo-retirer").addEventListener("click", () => {
    logo = { site: "", image: null };
    $("v-f-site").value = "";
    siteSaisiAuMain = true;
    majLogo();
    messageLogo("");
  });
  $("v-f-mode-code").addEventListener("click", () => choisirMode("code"));
  $("v-f-mode-photo").addEventListener("click", () => choisirMode("photo"));
  $("v-f-valeur").addEventListener("input", () => {
    const v = $("v-f-valeur").value.trim();
    if (!formatChoisiAuMain && v) $("v-f-format").value = deviner(v);
    majApercu();
  });
  $("v-f-format").addEventListener("change", () => {
    formatChoisiAuMain = true;
    majApercu();
  });
  $("v-f-scanner").addEventListener("click", lancerScan);
  $("v-f-scan-annuler").addEventListener("click", arreterScan);

  // Lecture du code depuis une image (ex. capture d'écran d'une carte Google Wallet).
  $("v-f-lire-image").addEventListener("click", () => $("v-f-fichier-code").click());
  $("v-f-fichier-code").addEventListener("change", async (e) => {
    const fichier = e.target.files[0];
    e.target.value = "";
    if (!fichier) return;
    montrerErreur("Lecture de l'image…");
    try {
      const r = await lireImage(fichier);
      $("v-f-valeur").value = r.valeur;
      if (r.format) {
        $("v-f-format").value = r.format;
        formatChoisiAuMain = true;
        montrerErreur("");
        majApercu();
      } else {
        montrerErreur(`Code lu (${r.formatBrut}), mais ce format ne peut pas être redessiné en caisse. Garde plutôt la capture comme carte en mode Photo.`);
      }
      navigator.vibrate?.(60);
    } catch (err) {
      montrerErreur(`${err.message}. Essaie une capture plus nette (code entier, sans reflet), ou utilise le mode Photo.`);
    }
  });

  // Photos : boutons explicites « Prendre » (caméra) et « Galerie », qui
  // déclenchent des champs fichier cachés (plus fiable sur mobile qu'un champ
  // fichier caché dans un libellé).
  for (const slot of document.querySelectorAll(".v-photo-slot")) {
    const nom = slot.dataset.slot;
    slot.querySelector('[data-act="camera"]').addEventListener("click", () => {
      slotCourant = nom;
      $("v-f-fichier-camera").click();
    });
    slot.querySelector('[data-act="galerie"]').addEventListener("click", () => {
      slotCourant = nom;
      $("v-f-fichier-galerie").click();
    });
    slot.querySelector('[data-act="retirer"]').addEventListener("click", () => {
      photos[nom] = null;
      majSlot(nom);
    });
  }
  async function fichierChoisi(e) {
    const fichier = e.target.files[0];
    e.target.value = "";
    if (!fichier) return;
    try {
      photos[slotCourant] = await reduirePhoto(fichier);
      majSlot(slotCourant);
      montrerErreur("");
    } catch {
      montrerErreur("Image illisible, essaie une autre photo.");
    }
  }
  $("v-f-fichier-camera").addEventListener("change", fichierChoisi);
  $("v-f-fichier-galerie").addEventListener("change", fichierChoisi);

  $("v-f-annuler").addEventListener("click", fermer);
  $("v-form").addEventListener("cancel", arreterScan);
  $("v-f-dupliquer").addEventListener("click", () => {
    if (modif && dupliquerCarte(modif.id)) {
      fermer();
      surChangement();
    } else montrerErreur("Stockage de l'appareil plein : impossible de dupliquer.");
  });
  $("v-f-supprimer").addEventListener("click", () => {
    if (modif && confirm(`Supprimer la carte « ${modif.nom} » ?`)) {
      supprimerCarte(modif.id);
      fermer();
      surChangement();
    }
  });
  $("v-form-corps").addEventListener("submit", enregistrer);
}
