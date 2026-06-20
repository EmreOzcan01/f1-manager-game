export interface Point {
  x: number;
  y: number;
}

export interface DrsZone {
  start: number; // 0.0 to 1.0
  end: number;   // 0.0 to 1.0
}

export interface TrackGeometry {
  points: Point[];
  distances: number[];
  totalDistance: number;
  timeMap: number[]; // Maps linear time-progress [0..1] to physical track progress [0..1]
}

// ─── Track Control Points (Normalized to 0-100) ───────────────────────

const MONZA_CONTROL_POINTS: Point[] = [
  { x: 10, y: 30 }, // Start/Finish straight
  { x: 45, y: 30 },
  { x: 80, y: 30 }, 
  { x: 90, y: 33 }, // Curva Grande
  { x: 88, y: 38 }, 
  { x: 80, y: 42 }, // Variante della Roggia (chicane)
  { x: 82, y: 46 }, 
  { x: 88, y: 50 }, // Lesmo 1 & 2
  { x: 85, y: 55 },
  { x: 75, y: 62 }, // Serraglio straight
  { x: 65, y: 70 }, // Ascari entrance
  { x: 55, y: 68 }, 
  { x: 48, y: 74 }, // Ascari exit
  { x: 25, y: 74 }, // Back straight
  { x: 12, y: 70 }, // Parabolica entry
  { x: 8, y: 50 },  // Parabolica curve
  { x: 10, y: 32 }, // Parabolica exit
];

const MONACO_CONTROL_POINTS: Point[] = [
  { x: 15, y: 60 }, // Pit Straight / Start line
  { x: 30, y: 55 }, // Sainte Devote (Turn 1)
  { x: 40, y: 40 }, // Beau Rivage (uphill climb)
  { x: 52, y: 25 }, // Massenet
  { x: 62, y: 24 }, // Casino
  { x: 58, y: 38 }, // Mirabeau Haute
  { x: 48, y: 46 }, // Grand Hotel Hairpin (slowest turn)
  { x: 54, y: 55 }, // Mirabeau Bas
  { x: 64, y: 58 }, // Portier (leading to tunnel)
  { x: 78, y: 52 }, // Tunnel straight
  { x: 88, y: 55 }, 
  { x: 84, y: 66 }, // Nouvelle Chicane
  { x: 72, y: 70 }, // Tabac
  { x: 64, y: 76 }, // Louis Chiron (Swimming Pool entry)
  { x: 52, y: 75 }, // Piscine exit
  { x: 38, y: 82 }, // Rascasse
  { x: 22, y: 78 }, // Anthony Noghes
  { x: 16, y: 68 }, 
];

const SILVERSTONE_CONTROL_POINTS: Point[] = [
  { x: 25, y: 65 }, // Hamilton Straight
  { x: 40, y: 72 }, // Abbey
  { x: 52, y: 68 }, // Farm
  { x: 54, y: 52 }, // Village / Loop (slow)
  { x: 42, y: 45 }, // Aintree
  { x: 50, y: 32 }, // Wellington Straight
  { x: 68, y: 22 }, // Brooklands
  { x: 78, y: 28 }, // Luffield
  { x: 72, y: 42 }, // Woodcote
  { x: 82, y: 52 }, // Copse (fast)
  { x: 75, y: 65 }, // Maggots
  { x: 66, y: 72 }, // Becketts
  { x: 54, y: 78 }, // Chapel
  { x: 35, y: 78 }, // Hangar Straight
  { x: 15, y: 68 }, // Stowe
  { x: 12, y: 50 }, // Vale
  { x: 20, y: 55 }, // Club
];

const DEFAULT_CONTROL_POINTS: Point[] = [
  { x: 15, y: 35 }, // Start straight
  { x: 45, y: 30 },
  { x: 65, y: 32 },
  { x: 85, y: 20 }, // Turn 3/4 sweep
  { x: 90, y: 45 }, // Hairpin
  { x: 75, y: 55 },
  { x: 80, y: 75 }, // S-curves
  { x: 60, y: 82 },
  { x: 45, y: 72 }, // Chicane
  { x: 32, y: 78 },
  { x: 20, y: 65 }, // Final corner
  { x: 12, y: 48 },
];

export function getControlPoints(trackName: string): Point[] {
  const name = trackName.toLowerCase();
  if (name.includes('monza')) return MONZA_CONTROL_POINTS;
  if (name.includes('monaco')) return MONACO_CONTROL_POINTS;
  if (name.includes('silverstone')) return SILVERSTONE_CONTROL_POINTS;
  return DEFAULT_CONTROL_POINTS;
}

// ─── DRS Zones ranges (0.0 to 1.0 progress intervals) ───────────────

export function getDrsZones(trackName: string): DrsZone[] {
  const name = trackName.toLowerCase();
  if (name.includes('monza')) {
    return [
      { start: 0.0, end: 0.16 },   // Hamilton Straight
      { start: 0.52, end: 0.65 },  // Serraglio Straight
    ];
  }
  if (name.includes('monaco')) {
    return [
      { start: 0.0, end: 0.12 },   // Main Straight
    ];
  }
  if (name.includes('silverstone')) {
    return [
      { start: 0.28, end: 0.40 },  // Wellington Straight
      { start: 0.72, end: 0.83 },  // Hangar Straight
    ];
  }
  return [
    { start: 0.0, end: 0.15 },
    { start: 0.45, end: 0.60 },
  ];
}

export function isCurrentlyInDrsZone(trackName: string, progress: number): boolean {
  const zones = getDrsZones(trackName);
  const p = ((progress % 1) + 1) % 1;
  return zones.some((z) => {
    if (z.start <= z.end) {
      return p >= z.start && p <= z.end;
    } else {
      return p >= z.start || p <= z.end;
    }
  });
}

// ─── Catmull-Rom Spline Formula ───────────────────────────────────────

function getCatmullRomPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return { x, y };
}

export function generateSplinePath(controlPoints: Point[], samplesPerSegment = 20): Point[] {
  const points: Point[] = [];
  const n = controlPoints.length;
  if (n < 3) return controlPoints;

  for (let i = 0; i < n; i++) {
    const p0 = controlPoints[(i - 1 + n) % n];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % n];
    const p3 = controlPoints[(i + 2) % n];

    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      points.push(getCatmullRomPoint(p0, p1, p2, p3, t));
    }
  }

  return points;
}

// ─── Curvature speed profiling map mapping ─────────────────────────

export function mapLinearTimeToTrackProgress(geometry: TrackGeometry, linearProgress: number): number {
  const { timeMap } = geometry;
  if (!timeMap || timeMap.length === 0) return linearProgress;

  const cleanP = ((linearProgress % 1) + 1) % 1;

  let low = 0;
  let high = timeMap.length - 1;
  let idx = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (timeMap[mid] <= cleanP) {
      idx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const tStart = timeMap[idx];
  const tEnd = timeMap[idx + 1] ?? 1.0;
  const tFrac = tEnd - tStart > 0 ? (cleanP - tStart) / (tEnd - tStart) : 0;

  const M = timeMap.length - 1;
  return (idx + tFrac) / M;
}

// ─── Cumulative Distance Interpolation (Uniform Speed) ───────────────

export function buildTrackGeometry(trackName: string): TrackGeometry {
  const controlPoints = getControlPoints(trackName);
  const rawPoints = generateSplinePath(controlPoints, 20); // 20 samples per segment is great
  const M = rawPoints.length;
  
  const distances: number[] = [0];
  let accumulated = 0;

  for (let i = 0; i < M; i++) {
    const p1 = rawPoints[i];
    const p2 = rawPoints[(i + 1) % M];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    accumulated += dist;
    distances.push(accumulated);
  }

  // Compute curvature and local speed factors along the path
  const speedProfile: number[] = [];
  for (let i = 0; i < M; i++) {
    const ptPrev = rawPoints[(i - 1 + M) % M];
    const ptCurr = rawPoints[i];
    const ptNext = rawPoints[(i + 1) % M];

    const v1 = { x: ptCurr.x - ptPrev.x, y: ptCurr.y - ptPrev.y };
    const v2 = { x: ptNext.x - ptCurr.x, y: ptNext.y - ptCurr.y };

    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    let diff = Math.abs(angle2 - angle1);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    // Slower speed in sharp turns (diff increases). Maximum speed = 1.0, Minimum speed = 0.28.
    const localSpeed = Math.max(0.28, 1.0 - diff * 4.5);
    speedProfile.push(localSpeed);
  }

  // Compute cumulative time taken to travel the segments (dt = ds / speed)
  const timeSums: number[] = [0];
  let totalTimeSum = 0;
  for (let i = 0; i < M; i++) {
    const ds = distances[i + 1] - distances[i];
    const dt = ds / speedProfile[i];
    totalTimeSum += dt;
    timeSums.push(totalTimeSum);
  }

  const timeMap = timeSums.map((t) => t / totalTimeSum);

  return {
    points: rawPoints,
    distances,
    totalDistance: accumulated,
    timeMap,
  };
}

export function getPointOnTrack(geometry: TrackGeometry, progress: number): Point {
  const { points, distances, totalDistance } = geometry;
  if (points.length === 0) return { x: 0, y: 0 };

  // Warp linear time-progress to track physical progress (braking / acceleration)
  const trackProgress = mapLinearTimeToTrackProgress(geometry, progress);

  const targetDist = trackProgress * totalDistance;

  // Binary search for segment
  let low = 0;
  let high = distances.length - 1;
  let idx = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (distances[mid] <= targetDist) {
      idx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const p1 = points[idx % points.length];
  const p2 = points[(idx + 1) % points.length];
  
  const dStart = distances[idx];
  const dEnd = distances[idx + 1] ?? totalDistance;
  
  const segmentLength = dEnd - dStart;
  const t = segmentLength > 0 ? (targetDist - dStart) / segmentLength : 0;

  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}
