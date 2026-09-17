# Calderón Bros

Un juego de plataformas al estilo Super Mario Bros con **Maite** y **Mila** como
personajes jugables. Incluye el mundo 1-1 completo con su sala subterránea de monedas.

Este directorio es **independiente**: código, sprites, sonidos, arte original y
herramientas están aquí dentro. Se puede copiar o publicar solo, sin nada más.

## Cómo jugar

Los módulos ES no funcionan abriendo el archivo directamente (`file://`); hace falta un
servidor web cualquiera sirviendo este directorio:

```sh
cd calderon-bros
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

## Tests

```sh
npm test   # o: node --test
```

## Créditos

Basado en el clon [Mario.js](https://github.com/reruns/mario) de Garrett Johnson (licencia
MIT, ver `LICENSE`). Los gráficos, sonidos y el diseño original de Super Mario Bros
pertenecen a Nintendo; este proyecto es solo de demostración.
