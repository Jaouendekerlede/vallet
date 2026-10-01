// Copie de l'appli pour un démarrage hors-ligne. Réseau d'abord (une mise à
// jour publiée est prise tout de suite), la copie ne sert que sans réseau.
// Les cartes sont dans le localStorage : rien d'autre à mettre en cache.

const CACHE_NOM = "vallet-v4";
// Le scanner de secours (zxing-library, 330 Ko) n'est pas préchargé : il est
// mis en cache à sa première utilisation par le gestionnaire fetch ci-dessous.
const FICHIERS_COQUILLE = ["./", "./index.html", "./style.css", "./manifest.json", "./js/main.js", "./js/grille.js", "./js/plein-ecran.js", "./js/formulaire.js", "./js/reglages.js", "./js/storage.js", "./js/config.js", "./js/mentions.js", "./js/restauration.js", "./js/codes.js", "./js/scanner.js", "./js/photo.js", "./js/chargeur.js", "./js/validite.js", "./js/theme.js", "./js/verrou.js", "./js/partage.js", "./js/logos.js", "./js/vendor/qrcode-generator.js", "./js/vendor/JsBarcode.all.min.js", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NOM)
      .then((cache) => cache.addAll(FICHIERS_COQUILLE.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n.startsWith("vallet-v") && n !== CACHE_NOM).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// « Partager vers Vallet » (Android) : l'image arrive en POST ; on la range
// dans un cache le temps que l'appli la reprenne, puis on ouvre l'appli.
async function recevoirPartage(requete) {
  try {
    const image = (await requete.formData()).get("image");
    if (image) await (await caches.open("vallet-partage")).put(new URL("image-partagee", self.registration.scope).href, new Response(image));
  } catch {
    // Partage illisible : l'appli s'ouvrira simplement sans photo.
  }
  return Response.redirect(new URL("index.html?partage=1", self.registration.scope).href, 303);
}

// Logos d'enseignes (favicons Google, voir logos.js) : chargés une fois depuis
// Internet puis gardés pour le hors-ligne. Cache à part, jamais purgé par la
// mise à jour de l'appli.
async function logoEnCache(requete) {
  const cache = await caches.open("vallet-logos");
  const trouve = await cache.match(requete);
  if (trouve) return trouve;
  try {
    const reponse = await fetch(requete);
    if (reponse.ok || reponse.type === "opaque") await cache.put(requete, reponse.clone());
    return reponse;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && url.hostname === "t2.gstatic.com" && url.pathname === "/faviconV2") {
    event.respondWith(logoEnCache(event.request));
    return;
  }
  if (event.request.method === "POST" && url.origin === self.location.origin && url.pathname.endsWith("/partage")) {
    event.respondWith(recevoirPartage(event.request));
    return;
  }
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request.url, { cache: "no-cache" })
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE_NOM).then((cache) => cache.put(event.request, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("./index.html"))),
  );
});
