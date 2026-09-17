#!/usr/bin/env python3
"""Cuts the house out of art/castle.png (removing sky, sidewalk and street)
and saves it as sprites/castle-house.png, ready to be drawn at the end of 1-1.

Usage: python3 tools/build_castle.py
"""
import os
from collections import deque
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', 'art')      # source illustrations
ROOT = os.path.join(HERE, '..', 'sprites')  # sheets the game loads
GROUND_Y = 1190            # the house ends here; below it is sidewalk and street
BASE_TOP_Y = 1100          # below this only the stone base is part of the house...
BASE_LEFT_X, BASE_RIGHT_X = 33, 1096   # ...and it spans these columns
OUTPUT_HEIGHT = 384        # 96 logical pixels (6 tiles) at 4 source pixels each


def is_sky(pixel):
    r, _, b, _ = pixel
    return b > 180 and b >= r  # blue sky and white-blue clouds; the house is tan and gray


def remove_sky(img):
    """Flood fills from the borders so only sky connected to the outside goes away."""
    px = img.load()
    width, height = img.size
    queue = deque((x, y) for x in range(width) for y in (0, height - 1))
    queue.extend((x, y) for y in range(height) for x in (0, width - 1))
    seen = set()
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not (0 <= x < width and 0 <= y < height):
            continue
        seen.add((x, y))
        if not is_sky(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))


def build():
    source = Image.open(os.path.join(ART, 'castle.png')).convert('RGBA')
    house = source.crop((0, 0, source.width, GROUND_Y))
    remove_sky(house)

    px = house.load()
    for y in range(BASE_TOP_Y, house.height):  # the strips of dirt next to the base
        for x in list(range(0, BASE_LEFT_X)) + list(range(BASE_RIGHT_X, house.width)):
            px[x, y] = (0, 0, 0, 0)

    house = house.crop(house.getbbox())
    width = round(house.width * OUTPUT_HEIGHT / house.height)
    house = house.resize((width, OUTPUT_HEIGHT), Image.LANCZOS)
    house.save(os.path.join(ROOT, 'castle-house.png'), optimize=True)
    print('castle-house.png', house.size)


if __name__ == '__main__':
    build()
