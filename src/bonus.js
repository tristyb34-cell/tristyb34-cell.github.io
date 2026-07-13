/* ============================================================
   DAX — optional bonus sessions for rest days
   Pure upside. He trains Tue/Thu/Fri/Sat; these fill the 3 rest
   days IF he has the time and the itch (~once or twice every couple
   months). They log as real work and show in history, but because
   they fall on non-training days they NEVER count toward consistency
   and skipping them is never a "miss". Sunday is kettlebells.
   ============================================================ */
const slot = (id, sets, reps, rest) => ({ id, sets, reps, rest });

export const BONUS_DAYS = {
  Sun: {
    dow: 'Sun', title: 'Kettlebell full-body', bonus: true,
    note: 'A different stimulus for a rest day. Grab one kettlebell and move.',
    items: [
      slot('One-Arm_Kettlebell_Swings', 3, '12', 60),
      slot('Goblet_Squat', 3, '10-12', 75),
      slot('Two-Arm_Kettlebell_Military_Press', 3, '8-10', 75),
      slot('One-Arm_Kettlebell_Row', 3, '10', 60),
      slot('Kettlebell_Hang_Clean', 3, '8', 75),
    ],
  },
  Mon: {
    dow: 'Mon', title: 'Arms & delts pump', bonus: true,
    note: 'A quick bonus pump if the arms are feeling fresh.',
    items: [
      slot('Barbell_Curl', 3, '10-12', 60),
      slot('Cable_Hammer_Curls_-_Rope_Attachment', 3, '12', 60),
      slot('Triceps_Pushdown', 3, '12-15', 60),
      slot('Side_Lateral_Raise', 3, '15-20', 45),
      slot('Bench_Dips', 3, '12-15', 60),
    ],
  },
  Wed: {
    dow: 'Wed', title: 'Core & conditioning', bonus: true,
    note: 'Abs and a bit of conditioning. Light, optional.',
    items: [
      slot('Air_Bike', 3, '20', 45),
      slot('Plank', 3, '45s', 45),
      slot('Bent-Knee_Hip_Raise', 3, '15', 45),
      slot('Farmers_Walk', 3, '40-60s', 75),
    ],
  },
};

export function bonusFor(dow) { return BONUS_DAYS[dow] || null; }
