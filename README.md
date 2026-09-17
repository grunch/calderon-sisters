# Calderón Sisters

Un juego de plataformas al estilo Super Mario Bros con **Maite** y **Mila** como
personajes jugables. Incluye el mundo 1-1 completo con su sala subterránea de monedas.

Este directorio es **independiente**: código, sprites, sonidos, arte original y
herramientas están aquí dentro. Se puede copiar o publicar solo, sin nada más.

## Cómo jugar

Los módulos ES no funcionan abriendo el archivo directamente (`file://`); hace falta un
servidor web cualquiera sirviendo este directorio:

```sh
cd calderon-sisters
python3 -m http.server 8000     # o: npm start
# y abre http://localhost:8000/
```

Para publicarlo basta subir el directorio a cualquier hosting estático (GitHub Pages,
Netlify, etc.). No tiene dependencias ni paso de compilación. Las carpetas `art/`,
`tools/` y `test/` no hacen falta para jugar.

| Acción | Teclado | Gamepad | Táctil |
| --- | --- | --- | --- |
| Moverse | ← → o A / D | cruceta / stick | ◀ ▶ |
| Agacharse / entrar en tubería | ↓ o S | cruceta abajo | ▼ |
| Saltar | X o Espacio | A | A |
| Correr / bola de fuego | Z o Shift | B / X | B |
| Elegir personaje | ← → y Enter | | ◀ ▶ y A |
| **Pantalla completa** | **F** | | botón ⛶ |
| Pausa | P o Esc | Start | botón ❚❚ |
| Sonido | M | | botón ♫ |

## Características

- Módulos ES y clases, sin variables globales ni paso de compilación.
- Pantalla adaptable: escala entera (píxeles nítidos), HiDPI y vista panorámica.
- Pantalla completa con F, pausa, silencio, controles táctiles y gamepad.
- HUD con puntos, monedas, tiempo y vidas; fin de juego y nivel completado.
- Física a paso fijo de 60 Hz: va igual de rápido a 30, 60 o 144 FPS.
- Recuerda el último personaje, el récord y el silencio (`localStorage`).

## Estructura

```
index.html, css/       la página
src/
  main.js              arranque, bucle principal, pantalla completa
  embed.js             arranque alternativo: el juego corriendo dentro de otro programa
  config.js            constantes compartidas
  assets-manifest.js   imágenes y sonidos a cargar
  core/                motor: timestep, viewport, entrada, audio, sprites, colisiones
  game/                reglas: jugador, enemigos, objetos, terreno, niveles, sesión
    levels/            datos de cada nivel (para agregar uno: créalo y regístralo en index.js)
  ui/                  HUD, selección de personaje, pausa, resultados
sprites/, sounds/      lo que carga el juego
art/                   ilustraciones originales (personajes y casa del final)
tools/                 scripts que convierten art/ en sprites/ (Python 3 + Pillow)
test/                  tests de la lógica pura
```

### Agregar o cambiar un personaje

1. Pon su hoja en `art/sprites-<nombre>.png` (fondo transparente).
2. Añade sus regiones en `tools/build_character_sprites.py` y ejecuta
   `python3 tools/build_character_sprites.py <nombre>`.
3. Añade una entrada en `src/game/characters.js`.

La casa del final del nivel sale de `art/castle.png` con `python3 tools/build_castle.py`.

### Incrustar el juego en otro programa

`src/embed.js` arranca el mismo juego, con las mismas reglas, sobre un canvas ajeno. El
anfitrión es dueño del canvas, del bucle de cuadros, de los controles, del sonido y de lo
que se guarda; el juego no escucha el teclado ni toca `localStorage`.

```js
import { createEmbeddedGame } from './src/embed.js';

const tele = await createEmbeddedGame({
  ctx,                         // contexto 2D; 256 × 240 da escala 1
  assetRoot: 'assets/tele/',   // carpeta con sprites/ y sounds/
  input,                       // isDown, consumePress, clearPresses, reset
  audio,                       // muted, setMuted, play, playMusic, stopMusic, pauseAll, resumeAll
  settings,                    // load(nombre, porDefecto), save(nombre, valor)
  onLevelClear: () => {}       // una vez por nivel completado
});

tele.advance(dt);              // en cada cuadro: pasos fijos de 1/60 s
tele.render();
tele.destroy();                // al salir: suelta teclas y corta la música
```

**Una sola partida incrustada a la vez.** Las entidades del juego comparten un único
estado (`src/game/world.js`), así que dos partidas vivas se pisarían el nivel, la cámara y
los controles. `createEmbeddedGame` rechaza una segunda llamada mientras la primera siga
viva o cargando; `destroy()` libera el lugar, y también lo libera una carga o un arranque
que falle. Para mostrar el juego en más de una pantalla a la vez, dibuja el mismo canvas en
todas.

## Tests

```sh
npm test   # o: node --test
```

## Créditos

Basado en el clon [Mario.js](https://github.com/reruns/mario) de Garrett Johnson (licencia
MIT, ver `LICENSE`). Los gráficos, sonidos y el diseño original de Super Mario Bros
pertenecen a Nintendo; este proyecto es solo de demostración.
