// Partage d'une carte seule : en image (PNG pour un code, JPEG pour une photo)
// via la feuille de partage du téléphone, ou en téléchargement ailleurs.

function nomFichier(nom) {
  return nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "carte";
}

function chargerImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image impossible à créer"));
    img.src = url;
  });
}

async function imageDuCode(carte, conteneur) {
  const svg = conteneur.querySelector("svg");
  if (!svg) throw new Error("code non affiché");
  const [, , largeur, hauteur] = svg.getAttribute("viewBox").split(/[ ,]+/).map(Number);
  const echelle = 900 / largeur;
  const clone = svg.cloneNode(true);
  clone.setAttribute("width", largeur * echelle);
  clone.setAttribute("height", hauteur * echelle);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  try {
    const img = await chargerImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = hauteur * echelle + 110;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(carte.nom, canvas.width / 2, 70, 900);
    ctx.drawImage(img, 30, 100);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// `conteneur` = l'élément qui affiche le code (pour en récupérer le dessin).
export async function partagerImage(carte, conteneur) {
  const blob = carte.type === "photo" ? await (await fetch(carte.photo)).blob() : await imageDuCode(carte, conteneur);
  const fichier = new File([blob], `${nomFichier(carte.nom)}.${blob.type === "image/png" ? "png" : "jpg"}`, { type: blob.type });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: carte.nom });
    } catch (e) {
      if (e.name !== "AbortError") throw e; // fermer la feuille de partage n'est pas une erreur
    }
    return;
  }
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = fichier.name;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 5000);
}
