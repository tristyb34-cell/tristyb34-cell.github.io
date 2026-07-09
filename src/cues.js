/* ============================================================
   DAX — coach cues
   One vivid, visual form cue per exercise, in my voice. These
   surface in the runner and the how-to so Tristan perfects form
   by picturing the movement, not decoding dry gym-database steps.
   Keyed by LIBRARY exercise id. cueFor(id) returns null if none
   is written yet (the callout just doesn't render).
   ============================================================ */
export const CUES = {
  // Push
  'Incline_Dumbbell_Press': 'Hug a big tree on the way up. Squeeze the dumbbells toward each other at the top even though they never touch.',
  'Cable_Chest_Press': "Push like you're closing a heavy door with both hands. Keep your shoulder blades pinned back so the chest does the work, not the shoulders.",
  'Dumbbell_Shoulder_Press': 'Press to the sky but stop just short of locking out, keeping a sliver of bend so the delt never gets a rest.',
  'Side_Lateral_Raise': 'Pour two jugs of water out to your sides, pinkies tilted up. Lead with your elbows. If your neck is working, you are swinging.',
  'Cable_Rope_Overhead_Triceps_Extension': 'Freeze your elbows pointing forward like two headlights. Only your forearms move. Chase the stretch behind the arm.',
  'Triceps_Pushdown': 'Pin your elbows to your sides like they are nailed there, and flex the back of your arm hard at the bottom.',
  // Pull
  'Wide-Grip_Lat_Pulldown': 'The bar is just a hook. Drive your elbows down into your back pockets and feel the outer lats. Do not lean back and row it.',
  'Seated_Cable_Rows': 'Chest up and proud, pull to your belly button, and crack a walnut between your shoulder blades. Pause on the squeeze.',
  'Bent_Over_Two-Dumbbell_Row': 'Row to your hip, not your armpit, elbow driving back like you are starting a lawnmower. Keep your back flat as a tabletop.',
  'Face_Pull': 'Pull the rope to your forehead and show your biceps to the wall behind you, spreading the rope apart at the end.',
  'Incline_Dumbbell_Curl': 'Let your arms hang straight down behind your body first, that stretch is the whole point. Curl without your elbows drifting forward.',
  'Alternate_Hammer_Curl': 'Carry two hammers, thumbs up, and squeeze the outer arm. This is the one that adds thickness and width to the arm.',
  // Legs + core
  'Leg_Press': 'Push through your heels, knees tracking over your toes, and stop just short of locking out. Do not let your lower back peel off the pad.',
  'Dumbbell_Lunges': 'Step out, drop straight down like an elevator, and drive up through your front heel. Stay tall and proud through the torso.',
  'Seated_Leg_Curl': 'Drag your heels toward your bum and squeeze the hamstring hard, toes pulled up toward your shins. Slow on the way back.',
  'Standing_Calf_Raises': 'Rise onto your big toe as high as you can, pause a full second at the top, then sink into a deep stretch. The pause is the exercise.',
  'Air_Bike': 'Brace like someone is about to punch your gut. Bring elbow to opposite knee slowly, no yanking on your neck.',
  'Plank': 'Brace your abs hard, tuck your ribs down, and squeeze your glutes. A short hard brace beats a long saggy one.',
  // Arms + delts
  'Barbell_Curl': 'Pin your elbows to your sides and curl without swinging. If your back or shoulders join in, drop the weight and go strict.',
  'Cable_Hammer_Curls_-_Rope_Attachment': 'Thumbs up on the rope, elbows glued to your sides, squeeze the outer arm at the top. Builds arm width.',
  'Bench_Dips': 'Keep your back close to the bench and lower until your elbows hit 90 degrees, then push through your palms. Feel the triceps.',
  'Bent-Knee_Hip_Raise': 'Curl your knees up toward your chest and lift your hips off the bench using the bottom of your abs, not momentum.',
};

export function cueFor(id) {
  return Object.prototype.hasOwnProperty.call(CUES, id) ? CUES[id] : null;
}
