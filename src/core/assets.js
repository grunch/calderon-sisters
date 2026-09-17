import { ASSET_ROOT } from '../config.js';

const images = new Map();

function loadImage(key, file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      images.set(key, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen ${file}`));
    img.src = ASSET_ROOT + file;
  });
}

/** Loads every image of a { key: file } manifest. */
export function loadImages(manifest) {
  return Promise.all(Object.entries(manifest).map(([key, file]) => loadImage(key, file)));
}

export function getImage(key) {
  const img = images.get(key);
  if (!img) throw new Error(`La imagen "${key}" no fue cargada`);
  return img;
}
