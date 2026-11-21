// levels.js — the four galleries of the Velvet Hour museum, as data.
//
// What each character of a grid row means:
//   #  museum wall            .  marble floor, lit
//   ,  burgundy rug — shadow, hide here   C  display pedestal, cover
//   S  statue, tall cover     B  planter, cover
//   g  gem case, loot         T  the target artefact's case
//   E  exit doors             P  where the thief slips in
// Walls, pedestals, statues and planters block both feet and eyes.
//
// A guard walks his waypoints in a straight line, so every patrol below
// follows a clear corridor; he waits at each end, looking around, then
// turns back. A camera sits on one tile and sweeps its cone back and
// forth across the arc its base and sweep name (degrees, 0 is east,
// positive clockwise).

export const LEVELS = [
  {
    name: 'The Marble Hall',
    subtitle: 'Learn the guards. Take the Moonstone Brooch.',
    targetName: 'Moonstone Brooch',
    par: 75,
    grid: [
      '##########################', // the north wall
      '#....C.....T.....C.......#', // target case on the north wall
      '#....C...........C....g..#', // first gem, east side
      '#........................#', // open floor, north patrol lane
      '#..,,....C.....C....,,...#', // rug, pedestals, rug
      '#..,,....C..g..C....,,...#', // gem between two pedestals
      '#........................#', // open floor, middle
      '#....##..........##......#', // the hall's inner blocks
      '#....##....,,....##...E..#', // exit on the east wall
      '#..........,,............#', // rug, south of the blocks
      '#..g....C......C.....g...#', // gems on both flanks
      '#.......C..,,..C.........#', // rug between pedestals
      '#..,,...C..,,..C....,,...#', // rugs on both sides
      '#..,,....................#', // rug, west edge
      '#....C.....P.......C.....#', // the thief slips in here
      '#....C.............C.....#',
      '##########################', // the south wall
    ],
    guards: [
      {
        path: [
          { x: 3, y: 3, wait: 1.4 },
          { x: 22, y: 3, wait: 1.4 },
        ],
      },
      {
        path: [
          { x: 23, y: 5, wait: 1.0 },
          { x: 23, y: 12, wait: 1.0 },
        ],
      },
    ],
    cameras: [],
  },
  {
    name: 'The Sculpture Garden',
    subtitle: 'Statues make fine hiding places. Take the Jade Phoenix.',
    targetName: 'Jade Phoenix',
    par: 100,
    grid: [
      '##########################', // the north wall
      '#..g.....S.......S.......#', // gems between the statues
      '#........S...T...S....g..#', // target case, centre north
      '#..,,....S.......S.......#', // rug between statues
      '#..,,....................#', // rug, west edge
      '#.....B.....##.....B.....#', // planters and the garden wall
      '#..g..B.....##.....B..g..#', // gems behind the planters
      '#........................#', // open floor, centre
      '#....,,....,,....,,......#', // three rugs in a row
      '#....,,....,,....,,...E..#', // exit, east wall
      '#........................#', // open floor, south centre
      '#.....B.....##.....B.....#', // planters and the garden wall
      '#..,,.B..g..##.....B..,,.#', // gem behind a planter
      '#..,,................,,..#', // rugs on both edges
      '#........C....P..........#', // the thief slips in here
      '#..g.....C.........g.....#', // gems on both flanks
      '##########################',
    ],
    guards: [
      {
        path: [
          { x: 4, y: 4, wait: 1.2 },
          { x: 21, y: 4, wait: 1.2 },
        ],
      },
      {
        path: [
          { x: 15, y: 7, wait: 0.8 },
          { x: 15, y: 13, wait: 0.8 },
        ],
      },
      {
        path: [
          { x: 21, y: 13, wait: 1.0 },
          { x: 5, y: 13, wait: 1.0 },
        ],
      },
    ],
    cameras: [],
  },
  {
    name: 'The Vault Gallery',
    subtitle: 'One camera watches the vault. Take the Sun Dial.',
    targetName: 'Sun Dial',
    par: 120,
    grid: [
      '############################', // the north wall
      '#.....C......T.......C.....#', // target case, centre north
      '#..g..C..............C..g..#', // gems on both flanks
      '#.....C..........##..C.....#', // pedestals, vault wall
      '#.................##.......#', // vault wall, east side
      '#..,,.....C......C.....,,..#', // rugs on both sides
      '#..,,.....C..##..C.....,,..#', // vault block, north
      '#................##........#', // vault wall, middle
      '#....##....,,..........##..#', // the vault block, centre
      '#....##....,,....C.....##..#', // vault block, pedestal east
      '#..........,,....C.........#', // rug, pedestal
      '#..g....C........C....g....#', // gems on both flanks
      '#.......C....##..C.........#', // vault wall, south
      '#..,,...C....##..C....,,...#', // rugs on both sides
      '#..,,..................,,..#', // rugs on both edges
      '#.....C......P......C......#', // the thief slips in here
      '#..g..C.............C...E..#', // exit, south-east corner
      '############################', // the south wall
    ],
    guards: [
      {
        path: [
          { x: 4, y: 2, wait: 1.2 },
          { x: 4, y: 7, wait: 1.2 },
        ],
      },
      {
        path: [
          { x: 8, y: 8, wait: 0.8 },
          { x: 22, y: 8, wait: 0.8 },
        ],
      },
      {
        path: [
          { x: 8, y: 14, wait: 1.0 },
          { x: 19, y: 14, wait: 1.0 },
        ],
      },
    ],
    cameras: [
      {
        x: 13, y: 2, // above the vault, sweeping down
        base: 90, sweep: 55, period: 7,
      },
    ],
  },
  {
    name: 'The Star Sapphire',
    subtitle: 'The whole museum guards one stone. Take it anyway.',
    targetName: 'Star Sapphire',
    par: 150,
    grid: [
      '############################', // the north wall
      '#..g.....C..........C......#', // first gem, west side // first gem, west side
      '#........C....##....C...g..#', // wall block, gem east
      '#..,,....C....##....C......#', // rug, wall block
      '#..,,..........T...........#', // target case, upper middle
      '#.....##....C.....C....##..#', // wall blocks, pedestals
      '#.....##....C..S..C....##..#', // the statue at the centre
      '#................S.........#', // statue, east of centre
      '#..,,....C....S.....C..,,..#', // statue, rugs both sides
      '#..,,....C..........C..,,..#', // rugs on both edges
      '#..........................#', // open floor, centre
      '#....B......##......B......#', // planters, wall block
      '#..g.B..,,..##..,,..B..g...#', // gems behind planters
      '#....B......##......B......#', // planters, wall block
      '#..,,..........P.......,,..#', // the thief slips in here
      '#..,,....C..........C..,,..#', // rugs on both edges
      '#........C....E.....C......#', // exit, south wall
      '############################', // the south wall
    ],
    guards: [
      {
        path: [
          { x: 3, y: 4, wait: 1.0 },
          { x: 12, y: 4, wait: 1.0 },
        ],
      },
      {
        path: [
          { x: 22, y: 5, wait: 0.8 },
          { x: 22, y: 12, wait: 0.8 },
        ],
      },
      {
        path: [
          { x: 20, y: 10, wait: 1.0 },
          { x: 6, y: 10, wait: 1.0 },
        ],
      },
      {
        path: [
          { x: 5, y: 14, wait: 0.8 },
          { x: 22, y: 14, wait: 0.8 },
        ],
      },
    ],
    cameras: [
      {
        x: 13, y: 1, // north wall, sweeping the target
        base: 90, sweep: 60, period: 8,
      },
      {
        x: 12, y: 16, // south wall, sweeping the exit
        base: 270, sweep: 60, period: 9,
      },
    ],
  },
];
