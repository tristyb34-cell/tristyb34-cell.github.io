/* ============================================================
   DAX — solo-lifter safety. Tristan trains alone, so lifts that
   can pin or crush you without a spotter are blocked and mapped
   to a solo-safe same-muscle substitute.
   ============================================================ */

// Genuine "get pinned under the load" lifts when training alone.
export const SPOTTER_LIFTS = new Set([
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Bench_Press_-_With_Bands',
  'Close-Grip_Barbell_Bench_Press',
  'Decline_Barbell_Bench_Press',
  'Barbell_Squat',
]);

// Solo-safe replacement for each spotter lift (all bundled in the library).
export const SAFE_SUB = {
  'Barbell_Bench_Press_-_Medium_Grip': 'Cable_Chest_Press',
  'Barbell_Incline_Bench_Press_-_Medium_Grip': 'Incline_Dumbbell_Press',
  'Bench_Press_-_With_Bands': 'Cable_Chest_Press',
  'Close-Grip_Barbell_Bench_Press': 'Cable_Chest_Press',
  'Decline_Barbell_Bench_Press': 'Decline_Dumbbell_Bench_Press',
  'Barbell_Squat': 'Leg_Press',
};

export const isSpotter = (id) => SPOTTER_LIFTS.has(id);
export const safeSub = (id) => SAFE_SUB[id] || null;
