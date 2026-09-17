import { ASSET_ROOT } from '../config.js';

const images = new Map();

/** Loads `root + file` and remembers it under `key`; rejects naming the file that failed. */
function loadImage(key, file, root) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      images.set(key, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen ${file}`));
    img.src = root + file;
  });
}

/** Loads every image of a { key: file } manifest, from `root` when the game is hosted elsewhere. */
export function loadImages(manifest, root = ASSET_ROOT) {
  return Promise.all(Object.entries(manifest).map(([key, file]) => loadImage(key, file, root)));
}

/** The image loaded under `key`; throws when it was never loaded. */
export function getImage(key) {
  const img = images.get(key);
  if (!img) throw new Error(`La imagen "${key}" no fue cargada`);
  return img;
}
