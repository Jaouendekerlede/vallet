// Date de validité et solde d'une carte (saisis à la main : lire un solde
// automatiquement est impossible sans service propre à chaque enseigne).

import { EXPIRE_BIENTOT_JOURS } from "./config.js";

// null si pas de date ou si elle est encore loin. Sinon { classe, texte }.
export function etatValidite(carte) {
  if (!carte.validite) return null;
  const fin = new Date(`${carte.validite}T00:00:00`);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const jours = Math.round((fin - aujourdhui) / 86_400_000);
  if (jours < 0) return { classe: "expiree", texte: "Expirée" };
  if (jours === 0) return { classe: "bientot", texte: "Expire aujourd'hui" };
  if (jours <= EXPIRE_BIENTOT_JOURS) return { classe: "bientot", texte: `Expire dans ${jours} j` };
  return null;
}

export function dateLongue(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function formaterSolde(solde) {
  if (solde === "" || solde == null) return "";
  const n = Number(String(solde).replace(",", "."));
  return Number.isNaN(n) ? "" : n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
