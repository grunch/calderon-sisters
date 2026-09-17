#!/usr/bin/env python3
"""Builds the player sheets (sprites/<name>.png facing right and
sprites/<name>l.png facing left) from each art/sprites-<name>.png.

The output keeps the logical layout of the original player.png (16px columns,
same rows) so player.js needs no coordinate changes, but every column is a
hi-res cell: CELL_W x (16 * SCALE) pixels per 16 logical pixels.
Usage: python3 tools/build_character_sprites.py [name ...]
"""
import colorsys
import os
import sys
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', 'art')      # source illustrations
ROOT = os.path.join(HERE, '..', 'sprites')  # sheets the game loads
SCALE = 4            # output pixels per logical pixel (see Sprite.hiRes in js/sprite.js)
DRAW_W = 32          # logical width the character is drawn at (16px hitbox + 8px each side)
CELL_W = DRAW_W * SCALE
COLS = 36            # 26 columns of the original layout + 10 for run frames while shooting
ALPHA_CUTOFF = 200

# rough regions in each source sheet; every one is tight-cropped by alpha afterwards
MILA_SRC = {
    'stand':  (100, 25, 225, 198),
    'death':  (1312, 25, 1440, 198),
    'run1': (95, 205, 250, 386),
    'run2': (262, 205, 415, 386),
    'run3': (428, 205, 578, 386),
    'run4': (585, 205, 748, 386),
    'run5': (760, 205, 912, 386),
    'run6': (918, 205, 1058, 386),
    'run7': (1064, 205, 1205, 386),
    'run8': (1210, 205, 1345, 386),
    'jump': (760, 205, 912, 386),
    'climb': (918, 205, 1058, 386),
    'skid': (1064, 205, 1205, 386),
    'fstand': (628, 638, 760, 828),
    'shoot1': (52, 842, 205, 1006),
    'shoot2': (430, 842, 540, 1006),
    'shoot3': (620, 842, 752, 1006),
    'shoot4': (1022, 842, 1160, 1006),
}

MAITE_SRC = {
    'stand':  (60, 20, 192, 198),
    'death':  (1335, 20, 1468, 198),
    'run1':   (52, 200, 210, 388),
    'run2':   (225, 200, 380, 388),
    'run3':   (400, 200, 555, 388),
    'run4':   (575, 200, 740, 388),
    'run5':   (752, 200, 905, 388),
    'run6':   (915, 200, 1065, 388),
    'run7':   (1075, 200, 1225, 388),
    'run8':   (1232, 200, 1368, 388),
    'jump':   (752, 200, 905, 388),
    'climb':  (915, 200, 1065, 388),
    'skid':   (1075, 200, 1225, 388),
    'fstand': (620, 632, 762, 832),
    'shoot1': (33, 836, 195, 1010),
    'shoot2': (215, 836, 358, 1010),
    'shoot3': (410, 836, 548, 1010),
    'shoot4': (1012, 836, 1168, 1010),
}

# logical column (x / 16) -> pose. Columns not listed fall back to 'stand'.
# The run cycle has 8 frames: columns 6-8 like the original walk, plus 21-25
# (player.js lists them as frame offsets from column 6, see RUN_FRAMES there).
RUN = ['run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7', 'run8']
NORMAL = {5: 'stand', 6: 'run1', 7: 'run2', 8: 'run3', 9: 'skid', 10: 'jump',
          11: 'crouch', 12: 'climb', 13: 'jump', 20: 'grow',
          21: 'run4', 22: 'run5', 23: 'run6', 24: 'run7', 25: 'run8'}
SHOOT_OFFSET = 10    # player.js adds 160px (10 columns) while shooting
NORMAL.update({c + SHOOT_OFFSET: NORMAL[c] for c in (5, 6, 7, 8, 9, 21, 22, 23, 24, 25)})
FIRE = dict(NORMAL)
FIRE.update({5: 'fstand', 15: 'shoot1', 16: 'shoot2', 17: 'shoot3', 18: 'shoot4',
             19: 'shoot3', 31: 'shoot4', 32: 'shoot2', 33: 'shoot3', 34: 'shoot4',
             35: 'shoot2'})
SMALL_OVERRIDES = {11: 'death'}  # the small row has the death pose, not a crouch

STAND_H = 160.0      # source height of the standing pose == 32 logical px


def load_poses(source, regions):
    sheet = Image.open(os.path.join(ART, source)).convert('RGBA')
    hard = sheet.getchannel('A').point(lambda v: 255 if v >= ALPHA_CUTOFF else 0)
    sheet.putalpha(hard)
    poses = {}
    for name, region in regions.items():
        crop = sheet.crop(region)
        poses[name] = crop.crop(crop.getbbox())
    return poses


def recolor(img, fn):
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            h, s, v = fn(h, s, v)
            r, g, b = colorsys.hsv_to_rgb(h % 1.0, min(1.0, s), min(1.0, v))
            px[x, y] = (int(r * 255), int(g * 255), int(b * 255), a)
    return out


def mila_fire_colors(h, s, v):
    deg = h * 360
    if 235 <= deg <= 295 and s < 0.5 and v > 0.35:   # lilac shirt -> cream
        return 40 / 360.0, s * 0.3, min(1.0, v * 1.08)
    if 295 < deg <= 350:                              # pink -> hot pink
        return h, s * 1.7, v
    return h, s, v


def maite_fire_colors(h, s, v):
    if s < 0.2 and v > 0.5:                           # white gi -> pink gi
        return 335 / 360.0, 0.25 + (1.0 - v) * 0.6, min(1.0, v * 1.02)
    return h, s, v


CHARACTERS = {
    'mila': {'source': 'sprites-mila.png', 'regions': MILA_SRC, 'fire': mila_fire_colors},
    'maite': {'source': 'sprites-maite.png', 'regions': MAITE_SRC, 'fire': maite_fire_colors},
}


def star_colors(shift):
    def fn(h, s, v):
        return h + shift, s * 1.15, min(1.0, v * 1.1)
    return fn


def fit(img, height_px):
    """Scale a pose for a cell of the given height, keeping the character's proportions."""
    factor = (height_px / STAND_H)
    factor = min(factor, height_px / float(img.height), CELL_W / float(img.width))
    size = (max(1, round(img.width * factor)), max(1, round(img.height * factor)))
    return img.resize(size, Image.LANCZOS)


def head_center(img):
    """x of the middle of the hair, the steadiest part of a running frame."""
    box = img.crop((0, 0, img.width, int(img.height * 0.45))).getbbox()
    return (box[0] + box[2]) / 2.0


def run_cell(poses, name, height_px):
    """All run frames share one scale and keep the head still, so only the
    legs move (bottom-aligning each frame made the feet look glued down)."""
    frames = [poses[n] for n in RUN]
    tallest = max(f.height for f in frames)
    reach = max(max(head_center(f), f.width - head_center(f)) for f in frames)
    factor = min(height_px / STAND_H, height_px / float(tallest), CELL_W / 2.0 / reach)
    img = poses[name]
    scaled = img.resize((max(1, round(img.width * factor)),
                         max(1, round(img.height * factor))), Image.LANCZOS)
    out = Image.new('RGBA', (CELL_W, height_px), (0, 0, 0, 0))
    x = round(CELL_W / 2.0 - head_center(img) * factor)
    out.alpha_composite(scaled, (x, height_px - round(tallest * factor)))
    return out


def cell(poses, name, height_px):
    if name in RUN:
        return run_cell(poses, name, height_px)
    out = Image.new('RGBA', (CELL_W, height_px), (0, 0, 0, 0))
    if name == 'crouch':
        img = fit(poses['stand'], height_px)
        img = img.resize((img.width, round(img.height * 0.7)), Image.LANCZOS)
    elif name == 'grow':
        img = fit(poses['stand'], round(height_px * 0.75))
    else:
        img = fit(poses[name], height_px)
    out.alpha_composite(img, ((CELL_W - img.width) // 2, height_px - img.height))
    return out


def draw_row(sheet, poses, mapping, y_logical, height_logical):
    height_px = height_logical * SCALE
    for col in range(5, COLS):
        name = mapping.get(col, 'stand')
        if name not in poses and name not in ('crouch', 'grow'):
            name = 'stand'
        sheet.alpha_composite(cell(poses, name, height_px),
                              (col * CELL_W, y_logical * SCALE))


def build(name):
    character = CHARACTERS[name]
    base = load_poses(character['source'], character['regions'])
    fire = {k: (v if k.startswith(('fstand', 'shoot')) else recolor(v, character['fire']))
            for k, v in base.items()}
    fire['stand'] = fire['fstand']
    small = {**NORMAL, **SMALL_OVERRIDES}

    sheet = Image.new('RGBA', (COLS * CELL_W, 288 * SCALE), (0, 0, 0, 0))
    draw_row(sheet, base, NORMAL, 0, 32)
    draw_row(sheet, base, small, 32, 16)
    draw_row(sheet, fire, FIRE, 96, 32)
    draw_row(sheet, fire, {**FIRE, **SMALL_OVERRIDES}, 128, 16)
    # star power palettes: the rows listed in level.invincibility (+32 for small)
    for y, shift in ((144, 0.33), (192, 0.66), (240, 0.12)):
        star = {k: recolor(v, star_colors(shift)) for k, v in base.items()}
        draw_row(sheet, star, NORMAL, y, 32)
        draw_row(sheet, star, small, y + 32, 16)

    sheet.save(os.path.join(ROOT, name + '.png'), optimize=True)

    left = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    for col in range(COLS):
        box = (col * CELL_W, 0, (col + 1) * CELL_W, sheet.height)
        left.paste(ImageOps.mirror(sheet.crop(box)), box)
    left.save(os.path.join(ROOT, name + 'l.png'), optimize=True)


if __name__ == '__main__':
    for character_name in (sys.argv[1:] or sorted(CHARACTERS)):
        build(character_name)
