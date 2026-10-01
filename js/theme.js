// Thème clair / sombre : automatique (suit le téléphone) ou forcé dans Réglages.

import { lireReglages } from "./storage.js";

const sombreSysteme = window.matchMedia("(prefers-color-scheme: dark)");

export function appliquerTheme(preference = lireReglages().theme ?? "auto") {
  const theme = preference === "auto" ? (sombreSysteme.matches ? "sombre" : "clair") : preference;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "clair" ? "#eef0f8" : "#0f1220");
}

sombreSysteme.addEventListener("change", () => appliquerTheme());
