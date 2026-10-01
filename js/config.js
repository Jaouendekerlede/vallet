// Constantes de l'appli : clés de stockage, catégories, couleurs, formats.

export const STORAGE_KEYS = {
  cartes: "vallet_cartes",
  reglages: "vallet_reglages",
};

export const CATEGORIES = [
  { id: "fidelite", nom: "Fidélité", icone: "🛍️" },
  { id: "adhesion", nom: "Adhésion", icone: "🎟️" },
  { id: "cadeau", nom: "Cadeau", icone: "🎁" },
  { id: "badge", nom: "Badge", icone: "🪪" },
  { id: "autre", nom: "Autre", icone: "📇" },
];

export const COULEURS = ["#e11d48", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#64748b"];

// Formats que l'appli sait DESSINER (les seuls utilisables en caisse).
export const FORMATS = [
  { id: "QR", nom: "QR code" },
  { id: "CODE128", nom: "Code 128" },
  { id: "EAN13", nom: "EAN-13" },
  { id: "EAN8", nom: "EAN-8" },
  { id: "UPC", nom: "UPC-A" },
  { id: "CODE39", nom: "Code 39" },
  { id: "ITF", nom: "ITF (2 parmi 5)" },
];

// Noms renvoyés par le scanner natif (BarcodeDetector) -> nos formats.
// Data Matrix, PDF417 et Aztec ne sont volontairement pas listés : on ne
// saurait pas les redessiner fidèlement (voir scanner.js).
export const FORMATS_SCANNER = {
  qr_code: "QR",
  code_128: "CODE128",
  ean_13: "EAN13",
  ean_8: "EAN8",
  upc_a: "UPC",
  code_39: "CODE39",
  itf: "ITF",
};

// Photo : assez nette pour lire un code, assez légère pour le localStorage.
export const PHOTO_LARGEUR_MAX = 1000;
export const PHOTO_QUALITE = 0.7;
