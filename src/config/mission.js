/**
 * Mission configuration: site, default traverse, basemaps.
 * Repository: martian-map
 *
 * Waypoints were chosen on the real HiRISE DTM (see README → "Choosing the route"):
 * flat (<6°) ground, rim stops next to the chasm wall, and a floor stop ~250 m lower,
 * all connected by safe-path legs that never cross terrain steeper than 20°.
 */

export const SITE = {
  name: 'Sakarya Vallis',
  region: 'Gale Crater · Aeolis Mons (Mount Sharp)',
  center: [-5.081, 137.258],
  zoom: 14,
  terrainHeader: './data/terrain/sakarya-10m.json',
  ortho: {
    url: './data/terrain/hirise-ortho-5m.jpg',
    productId: 'PSP_006855_1750_RED_C_01_ORTHO',
    // Same map projection and footprint as the DTM (from the PDS label)
    bounds: [[-5.2217247582496, 137.17157717], [-4.9503982410223, 137.28950561]]
  },
  weather: './data/rems-recent.json',
  scienceGoal:
    'Read ~250 m of Mount Sharp’s layered rock where Sakarya Vallis cuts through it: ' +
    'map the layers from the rim, then sample the lowest exposed layers on the canyon floor.'
};

const ANALOG = {
  plain: {
    src: './img/PIA24430.jpg',
    caption: 'Analog: rock-strewn plain seen by Perseverance in Jezero Crater — not this site.',
    link: 'https://photojournal.jpl.nasa.gov/catalog/PIA24430'
  },
  layers: {
    src: './img/PIA26366.jpg',
    caption: 'Analog: layered rock exposure (NASA PIA26366) — not this site.',
    link: 'https://photojournal.jpl.nasa.gov/catalog/PIA26366'
  },
  rocks: {
    src: './img/PIA24484.jpg',
    caption: 'Analog: loose rocks and bright bedrock patches seen by Perseverance — not this site.',
    link: 'https://photojournal.jpl.nasa.gov/catalog/PIA24484'
  }
};

export const DEFAULT_ROUTE = [
  {
    id: 'base',
    name: 'Base camp',
    pos: [-5.0802, 137.2710],
    type: 'base',
    objective: 'Suit checkout and egress on flat plateau ground east of the canyon.',
    photo: ANALOG.plain
  },
  {
    id: 'stop-1',
    name: 'North rim overlook',
    pos: [-5.0727, 137.2573],
    type: 'science',
    objective: 'Photograph the opposite canyon wall and mark layer boundaries before descending.',
    photo: ANALOG.layers
  },
  {
    id: 'stop-2',
    name: 'Canyon floor, foot of the wall',
    pos: [-5.0790, 137.2431],
    type: 'science',
    objective: 'Sample the lowest exposed layers and fallen blocks; compare with the rim, ~250 m higher.',
    photo: ANALOG.rocks
  },
  {
    id: 'stop-3',
    name: 'South rim overlook',
    pos: [-5.0901, 137.2618],
    type: 'science',
    objective: 'Second view of the wall: check whether layers seen from the north rim continue sideways.',
    photo: ANALOG.layers
  }
];

export const NEW_STOP_PHOTO = ANALOG.rocks;

export const BASEMAPS = [
  {
    id: 'mola',
    name: 'MOLA colour elevation',
    detail: '463 m/px · Mars Global Surveyor',
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    maxNative: 7,
    on: true,
    opacity: 1
  },
  {
    id: 'ctx',
    name: 'CTX visible mosaic',
    detail: '5 m/px · Mars Reconnaissance Orbiter',
    url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}',
    maxNative: 12,
    on: true,
    opacity: 1
  },
  {
    id: 'themis',
    name: 'THEMIS daytime infrared',
    detail: '100 m/px · Mars Odyssey (thermal)',
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    maxNative: 9,
    on: false,
    opacity: 0.7
  },
  {
    id: 'viking',
    name: 'Viking colour mosaic',
    detail: '232 m/px · Viking Orbiters',
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    maxNative: 7,
    on: false,
    opacity: 0.6
  }
];

export const SOURCES = [
  ['HiRISE DTM DTEEC_006855_1750_007501_1750_A01 + orthoimage', 'https://www.uahirise.org/dtm/dtm.php?ID=PSP_006855_1750'],
  ['NASA Mars Trek (MOLA, THEMIS, Viking tiles)', 'https://trek.nasa.gov/mars/'],
  ['USGS Astrogeology CTX mosaic & Mars geologic map', 'https://astrogeology.usgs.gov/'],
  ['Curiosity REMS weather (CAB / NASA JPL)', 'https://mars.nasa.gov/msl/weather/'],
  ['Curiosity RAD dose — Hassler et al. 2014, Science 343', 'https://doi.org/10.1126/science.1244797'],
  ['NASA DONKI space weather (solar energetic particles)', 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/'],
  ['NASA BVAD life-support baseline (NASA/TP-2015-218570)', 'https://ntrs.nasa.gov/citations/20150002905']
];
