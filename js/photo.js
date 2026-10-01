// Import d'une photo de carte (caméra ou galerie) : réduite et recompressée
// en JPEG pour tenir dans le localStorage (voir PHOTO_* dans config.js).

import { PHOTO_LARGEUR_MAX, PHOTO_QUALITE } from "./config.js";

// Plusieurs méthodes de lecture : certains navigateurs mobiles refusent
// createImageBitmap avec des options, ou certains formats (HEIC...).
async function ouvrirImage(fichier) {
  try {
    return await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(fichier);
    } catch {
      const url = URL.createObjectURL(fichier);
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } finally {
        URL.revokeObjectURL(url);
      }
      return img;
    }
  }
}

export async function reduirePhoto(fichier) {
  const image = await ouvrirImage(fichier);
  const echelle = Math.min(1, PHOTO_LARGEUR_MAX / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  return canvas.toDataURL("image/jpeg", PHOTO_QUALITE);
}
