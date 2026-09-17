// Hitboxes are [offsetX, offsetY, width, height] relative to the entity position.

export function boxOf(entity, snapToPixels = false) {
  const x = entity.pos[0] + entity.hitbox[0];
  const y = entity.pos[1] + entity.hitbox[1];
  return {
    x: snapToPixels ? Math.floor(x) : x,
    y: snapToPixels ? Math.floor(y) : y,
    w: entity.hitbox[2],
    h: entity.hitbox[3]
  };
}

/** Boxes that merely touch count as overlapping, like in the original engine. */
export function boxesOverlap(a, b) {
  const apartX = a.x > b.x + b.w || a.x + a.w < b.x;
  const apartY = a.y > b.y + b.h || a.y + a.h < b.y;
  return !apartX && !apartY;
}

export function overlaps(entityA, entityB) {
  return boxesOverlap(boxOf(entityA), boxOf(entityB));
}

/**
 * Resolves an entity against something solid (a tile or a pipe): land on top,
 * bonk it from below or get stopped like a wall.
 *   hooks.isCovered(): true when another tile sits on top, so nobody can land here
 *   hooks.onBonk(entity): the player hit the solid from below
 */
export function collideSolid(solid, entity, hooks = {}) {
  const a = boxOf(solid, true);
  const b = boxOf(entity, true);
  if (!boxesOverlap(a, b)) return;

  const center = b.x + b.w / 2;
  const isLanding = Math.abs(b.y + b.h - a.y) <= entity.vel[1];
  const isUnderneath = Math.abs(b.y - a.y - a.h) > entity.vel[1] &&
    center + 2 >= a.x && center - 2 <= a.x + a.w;

  if (isLanding) {
    if (hooks.isCovered && hooks.isCovered()) return;
    entity.vel[1] = 0;
    entity.pos[1] = a.y - entity.hitbox[3] - entity.hitbox[1];
    entity.standing = true;
    if (entity.isPlayer) entity.jumping = 0;
  } else if (isUnderneath) {
    entity.vel[1] = 0;
    entity.pos[1] = a.y + a.h;
    if (entity.isPlayer) {
      if (hooks.onBonk) hooks.onBonk(entity);
      entity.jumping = 0;
    }
  } else {
    entity.collideWall(solid);
  }
}
