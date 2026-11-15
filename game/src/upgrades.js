// The upgrade choices offered between waves. Each one names what it does in
// plain words, says which stat it changes, and applies itself to the world.
// The world asks for three different ones, so no wave offers the same card twice.
export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Ember',
    icon: '»»',
    desc: 'Shoot 25% faster.',
    apply(player) { player.fireInterval *= 0.8; },
  },
  {
    id: 'split',
    name: 'Split Shot',
    icon: '✦✦',
    desc: '+1 ember bolt per shot.',
    apply(player) { player.projectiles += 1; },
  },
  {
    id: 'heavy',
    name: 'Heavy Ember',
    icon: '●',
    desc: '+1 damage on every bolt.',
    apply(player) { player.bulletDamage += 1; },
  },
  {
    id: 'pierce',
    name: 'Piercing Flame',
    icon: '→→',
    desc: 'Bolts pass through +1 hollow.',
    apply(player) { player.pierce += 1; },
  },
  {
    id: 'boots',
    name: 'Swift Boots',
    icon: '≈≈',
    desc: 'Move 15% faster.',
    apply(player) { player.speed *= 1.15; },
  },
  {
    id: 'dash',
    name: 'Ember Dash',
    icon: '↯',
    desc: 'Dash recharges 35% faster.',
    apply(player) { player.dashCooldown *= 0.65; },
  },
  {
    id: 'heart',
    name: 'Ember Heart',
    icon: '♥',
    desc: '+1 max heart, and heal 1 now.',
    apply(player, world) {
      player.maxHearts += 1;
      player.hearts = Math.min(player.maxHearts, player.hearts + 1);
      void world;
    },
  },
  {
    id: 'magnet',
    name: 'Shard Magnet',
    icon: '◉',
    desc: 'Shards fly to you from 70% further.',
    apply(player) { player.magnetRadius *= 1.7; },
  },
  {
    id: 'combo',
    name: 'Combo Keeper',
    icon: '×4',
    desc: 'Your combo lasts twice as long.',
    apply(player) { player.comboWindow *= 2; },
  },
  {
    id: 'range',
    name: 'Long Fuse',
    icon: '— —',
    desc: 'Bolts fly 35% further and faster.',
    apply(player) {
      player.bulletRange *= 1.35;
      player.bulletSpeed *= 1.2;
    },
  },
];

/** Three different upgrades, drawn with the world's seeded random. */
export function drawUpgrades(random, count = 3) {
  const pool = UPGRADES.slice();
  const drawn = [];
  while (drawn.length < count && pool.length > 0) {
    const index = Math.floor(random.next() * pool.length);
    drawn.push(pool.splice(index, 1)[0]);
  }
  return drawn;
}
