export interface LandingSite {
  id: string;
  name: string;
  region: string;
  /** Selenographic latitude, degrees (negative = south). */
  lat: number;
  /** Selenographic longitude, degrees east. */
  lon: number;
  /** Elevation relative to the 1737.4 km reference sphere, metres. */
  elevation: number;
  /** Terrain horizon elevation in degrees, 12 sectors from north, clockwise. */
  horizon: number[];
  notes: string;
}

/**
 * Candidate south-polar landing regions drawn from published CLPS / Artemis
 * site studies. Coordinates are representative of the region centre; horizon
 * profiles are illustrative terrain masks, not surveyed data.
 */
export const SITES: LandingSite[] = [
  {
    id: "shackleton-rim",
    name: "Shackleton Connecting Ridge",
    region: "Shackleton–de Gerlache",
    lat: -89.45,
    lon: -137.0,
    elevation: 1980,
    horizon: [1.2, 0.9, 0.6, 0.4, 0.5, 0.8, 1.6, 2.4, 3.1, 2.6, 1.9, 1.5],
    notes: "High-illumination ridge with short shadow episodes and a low western horizon.",
  },
  {
    id: "de-gerlache-rim",
    name: "de Gerlache Rim 2",
    region: "de Gerlache",
    lat: -88.72,
    lon: -68.5,
    elevation: 1640,
    horizon: [2.1, 1.4, 0.9, 0.7, 1.1, 1.8, 2.9, 3.6, 3.0, 2.2, 2.4, 2.6],
    notes: "Broad rim bench adjacent to permanently shadowed regions of scientific interest.",
  },
  {
    id: "malapert-massif",
    name: "Malapert Massif",
    region: "Malapert",
    lat: -85.99,
    lon: 2.9,
    elevation: 5100,
    horizon: [0.8, 0.6, 0.5, 0.6, 0.9, 1.2, 1.5, 1.3, 1.0, 0.9, 0.8, 0.8],
    notes: "Tall massif with near-continuous Earth view; a natural relay candidate.",
  },
  {
    id: "haworth",
    name: "Haworth Plateau",
    region: "Haworth",
    lat: -87.45,
    lon: -2.1,
    elevation: 1450,
    horizon: [3.4, 3.0, 2.2, 1.6, 1.9, 2.8, 4.2, 5.1, 4.4, 3.8, 3.6, 3.5],
    notes: "Elevated plateau beside a deep cold trap; horizon is high in most directions.",
  },
  {
    id: "nobile-rim",
    name: "Nobile Rim 1",
    region: "Nobile",
    lat: -85.35,
    lon: 31.4,
    elevation: 1210,
    horizon: [2.6, 2.0, 1.5, 1.2, 1.4, 2.0, 3.2, 3.8, 3.4, 3.0, 2.8, 2.7],
    notes: "VIPER-class terrain with mixed illumination and frequent Earth occultations.",
  },
  {
    id: "leibnitz-beta",
    name: "Leibnitz Beta Plateau",
    region: "Leibnitz",
    lat: -85.2,
    lon: 33.2,
    elevation: 4300,
    horizon: [1.0, 0.8, 0.7, 0.9, 1.4, 1.9, 2.1, 1.8, 1.4, 1.1, 1.0, 1.0],
    notes: "Broad high plateau offering long sunlit intervals and stable comms geometry.",
  },
  {
    id: "amundsen-rim",
    name: "Amundsen Rim",
    region: "Amundsen",
    lat: -84.3,
    lon: 82.8,
    elevation: 1890,
    horizon: [1.8, 1.5, 1.2, 1.3, 1.7, 2.4, 3.0, 2.8, 2.3, 2.0, 1.9, 1.8],
    notes: "Far-eastern rim; Earth sits low and grazes the horizon through the month.",
  },
  {
    id: "faustini-rim",
    name: "Faustini Rim A",
    region: "Faustini",
    lat: -87.2,
    lon: 84.0,
    elevation: 1330,
    horizon: [2.9, 2.3, 1.8, 1.5, 1.7, 2.5, 3.6, 4.2, 3.7, 3.2, 3.0, 2.9],
    notes: "Rim site with direct traverse access into a permanently shadowed crater floor.",
  },
];
