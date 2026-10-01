// Import d'une photo de carte (caméra ou galerie) : réduite et recompressée
// en JPEG pour tenir dans le localStorage (voir PHOTO_* dans config.js).

import { PHOTO_LARGEUR_MAX, PHOTO_QUALITE } from "./config.js";

export async function reduirePhoto(fichier) {
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const echelle = Math.min(1, PHOTO_LARGEUR_MAX / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/jpeg", PHOTO_QUALITE);
}
