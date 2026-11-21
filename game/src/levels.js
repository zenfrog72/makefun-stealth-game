// levels.js — the four galleries of the Velvet Hour museum, as data.
//
// Grid legend:
//   #  museum wall            .  marble floor (lit)
//   ,  burgundy rug (shadow — hide here)   C  display pedestal (cover)
//   S  statue (tall cover)    B  planter (cover)
//   g  gem case (loot)        T  the target artefact's case
//   E  exit doors             P  the thief's entry point
// Walls, pedestals, statues and planters block both movement and sight.
//
// Guards walk waypoint to waypoint in straight lines, so every patrol
// below runs along a clear corridor. Cameras sit on a tile and sweep
// their cone back and forth across the arc named by base and sweep
// (degrees, 0 = east, positive clockwise).

export const LEVELS = [
  {
    name: 'The Marble Hall',
    subtitle: 'Learn the guards. Take the Moonstone Brooch.',
    targetName: 'Moonstone Brooch',
    par: 75,
    grid: [
      '##########################',
      '#....C.....T.....C.......#',
      '#....C...........C....g..#',
      '#........................#',
      '#..,,....C.....C....,,...#',
      '#..,,....C..g..C....,,...#',
      '#........................#',
      '#....##..........##......#',
      '#....##....,,....##...E..#',
      '#..........,,............#',
      '#..g....C......C.....g...#',
      '#.......C..,,..C.........#',
      '#..,,...C..,,..C....,,...#',
      '#..,,....................#',
      '#....C.....P.......C.....#',
      '#....C.............C.....#',
      '##########################',
    ],
    guards: [
      { path: [{ x: 3, y: 3, wait: 1.4 }, { x: 22, y: 3, wait: 1.4 }] },
      { path: [{ x: 23, y: 5, wait: 1.0 }, { x: 23, y: 12, wait: 1.0 }] },
    ],
    cameras: [],
  },
  {
    name: 'The Sculpture Garden',
    subtitle: 'Statues make fine hiding places. Take the Jade Phoenix.',
    targetName: 'Jade Phoenix',
    par: 100,
    grid: [
      '##########################',
      '#..g.....S.......S.......#',
      '#........S...T...S....g..#',
      '#..,,....S.......S.......#',
      '#..,,....................#',
      '#.....B.....##.....B.....#',
      '#..g..B.....##.....B..g..#',
      '#........................#',
      '#....,,....,,....,,......#',
      '#....,,....,,....,,...E..#',
      '#........................#',
      '#.....B.....##.....B.....#',
      '#..,,.B..g..##.....B..,,.#',
      '#..,,................,,..#',
      '#........C....P..........#',
      '#..g.....C.........g.....#',
      '##########################',
    ],
    guards: [
      { path: [{ x: 4, y: 4, wait: 1.2 }, { x: 21, y: 4, wait: 1.2 }] },
      { path: [{ x: 15, y: 7, wait: 0.8 }, { x: 15, y: 13, wait: 0.8 }] },
      { path: [{ x: 21, y: 13, wait: 1.0 }, { x: 5, y: 13, wait: 1.0 }] },
    ],
    cameras: [],
  },
  {
    name: 'The Vault Gallery',
    subtitle: 'One camera watches the vault. Take the Sun Dial.',
    targetName: 'Sun Dial',
    par: 120,
    grid: [
      '############################',
      '#.....C......T.......C.....#',
      '#..g..C..............C..g..#',
      '#.....C..........##..C.....#',
      '#.................##.......#',
      '#..,,.....C......C.....,,..#',
      '#..,,.....C..##..C.....,,..#',
      '#................##........#',
      '#....##....,,..........##..#',
      '#....##....,,....C.....##..#',
      '#..........,,....C.........#',
      '#..g....C........C....g....#',
      '#.......C....##..C.........#',
      '#..,,...C....##..C....,,...#',
      '#..,,..................,,..#',
      '#.....C......P......C......#',
      '#..g..C.............C...E..#',
      '############################',
    ],
    guards: [
      { path: [{ x: 4, y: 2, wait: 1.2 }, { x: 4, y: 7, wait: 1.2 }] },
      { path: [{ x: 8, y: 8, wait: 0.8 }, { x: 22, y: 8, wait: 0.8 }] },
      { path: [{ x: 8, y: 14, wait: 1.0 }, { x: 19, y: 14, wait: 1.0 }] },
    ],
    cameras: [{ x: 13, y: 2, base: 90, sweep: 55, period: 7 }],
  },
  {
    name: 'The Star Sapphire',
    subtitle: 'The whole museum guards one stone. Take it anyway.',
    targetName: 'Star Sapphire',
    par: 150,
    grid: [
      '############################',
      '#..g.....C..........C......#',
      '#........C....##....C...g..#',
      '#..,,....C....##....C......#',
      '#..,,..........T...........#',
      '#.....##....C.....C....##..#',
      '#.....##....C..S..C....##..#',
      '#................S.........#',
      '#..,,....C....S.....C..,,..#',
      '#..,,....C..........C..,,..#',
      '#..........................#',
      '#....B......##......B......#',
      '#..g.B..,,..##..,,..B..g...#',
      '#....B......##......B......#',
      '#..,,..........P.......,,..#',
      '#..,,....C..........C..,,..#',
      '#........C....E.....C......#',
      '############################',
    ],
    guards: [
      { path: [{ x: 3, y: 4, wait: 1.0 }, { x: 12, y: 4, wait: 1.0 }] },
      { path: [{ x: 22, y: 5, wait: 0.8 }, { x: 22, y: 12, wait: 0.8 }] },
      { path: [{ x: 20, y: 10, wait: 1.0 }, { x: 6, y: 10, wait: 1.0 }] },
      { path: [{ x: 5, y: 14, wait: 0.8 }, { x: 22, y: 14, wait: 0.8 }] },
    ],
    cameras: [
      { x: 13, y: 1, base: 90, sweep: 60, period: 8 },
      { x: 12, y: 16, base: 270, sweep: 60, period: 9 },
    ],
  },
];
