// Verrou par code PIN à 4 chiffres. Limite à connaître : c'est une barrière
// devant l'écran, pas un chiffrement -- les cartes restent lisibles dans le
// stockage du navigateur par quelqu'un qui maîtrise l'appareil. L'empreinte
// digitale (WebAuthn) n'est pas proposée : trop dépendante de l'appareil.

import { DELAI_VERROU_MS } from "./config.js";
import { lireReglages, sauverReglages, toutEffacer } from "./storage.js";

const $ = (id) => document.getElementById(id);
let saisie = "";
let quitteA = 0;

async function hacher(pin, sel) {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sel + pin));
  return [...new Uint8Array(octets)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const pinActif = () => !!lireReglages().pin;

export async function definirPin(pin) {
  const sel = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16)).join("");
  sauverReglages({ pin: { sel, hash: await hacher(pin, sel) } });
}

export function retirerPin() {
  sauverReglages({ pin: null });
}

function majPoints() {
  $("v-verrou-points").textContent = "●".repeat(saisie.length) + "○".repeat(4 - saisie.length);
}

export function verrouiller() {
  if (!pinActif()) return;
  saisie = "";
  majPoints();
  $("v-verrou").hidden = false;
}

async function ajouterChiffre(c) {
  if (saisie.length >= 4) return;
  saisie += c;
  majPoints();
  if (saisie.length < 4) return;
  const { pin } = lireReglages();
  if (pin && (await hacher(saisie, pin.sel)) === pin.hash) {
    $("v-verrou").hidden = true;
    return;
  }
  $("v-verrou-corps").classList.add("secoue");
  setTimeout(() => {
    $("v-verrou-corps").classList.remove("secoue");
    saisie = "";
    majPoints();
  }, 400);
}

export function initialiserVerrou() {
  const clavier = $("v-verrou-clavier");
  for (const t of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = t;
    b.disabled = t === "";
    b.addEventListener("click", () => {
      if (t === "⌫") {
        saisie = saisie.slice(0, -1);
        majPoints();
      } else ajouterChiffre(t);
    });
    clavier.append(b);
  }
  $("v-verrou-oublie").addEventListener("click", () => {
    if (confirm("Code PIN oublié : la seule solution est d'EFFACER toutes les cartes de cet appareil (tu pourras les récupérer avec un lien de sauvegarde). Continuer ?")) {
      toutEffacer();
      location.reload();
    }
  });
  verrouiller();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") quitteA = Date.now();
    else if (quitteA && Date.now() - quitteA > DELAI_VERROU_MS) verrouiller();
  });
}
