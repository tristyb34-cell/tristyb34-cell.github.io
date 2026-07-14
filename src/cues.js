/* ============================================================
   DAX — coach cues
   Four coaching lines per exercise, in my voice, surfaced in the
   runner and the how-to so form gets corrected BEFORE the set,
   not diagnosed after it.

     cue    picture the movement
     feel   where it should burn, so "I feel nothing" becomes diagnosable
     wrong  the failure signal, what it means, what to do about it
     range  full range of motion + tempo

   Keyed by LIBRARY exercise id.
     coachFor(id)  → the whole object, or null
     formBlock(id) → the rendered <dl>, shared by the runner and the how-to
                     so the two can never drift apart
   ============================================================ */
export const CUES = {
  // ---------------- Push (Tue) ----------------
  'Incline_Dumbbell_Press': {
    cue: 'Hug a big tree on the way up. Squeeze the dumbbells toward each other at the top even though they never touch.',
    feel: 'Across the upper chest, just under the collarbone, and a stretch through the chest at the bottom.',
    wrong: 'If your front delts and triceps are cooked but your chest never lit up, the bench is too steep or your elbows are tucked to your ribs. Drop the incline and let the elbows open to about 45 degrees.',
    range: 'Lower until your upper arms are level with your torso and the chest stretches. Two seconds down, drive up.',
  },
  'Cable_Chest_Press': {
    cue: "Push like you're closing a heavy door with both hands. Keep your shoulder blades pinned back so the chest does the work, not the shoulders.",
    feel: 'The middle of the chest, squeezing inward as your hands come together at the end.',
    wrong: 'If you feel it mostly in the front of your shoulders, your shoulder blades rolled forward. Pin them back and down before the first rep.',
    range: 'Let your hands travel behind your chest line at the back, then press all the way to a squeeze. Never lock the elbows.',
  },
  'Dumbbell_Shoulder_Press': {
    cue: 'Press to the sky but stop just short of locking out, keeping a sliver of bend so the delt never gets a rest.',
    feel: 'The front and side of the shoulder, capping over the top of the arm.',
    wrong: 'If your lower back arches off the pad and your chest takes over, the weight is too heavy. Ribs down, abs braced, press straight up rather than out in front.',
    range: 'Bottom of the rep at ear height, not lower. All the way up, minus the lockout.',
  },
  'Cable_Lateral_Raise': {
    cue: 'Side-on to a low pulley, free hand braced on the machine. Lead with the elbow and raise to shoulder height, pinky a touch high.',
    feel: 'The outer cap of the shoulder, under constant tension the whole way, including the stretch at the bottom. The bit dumbbells miss.',
    wrong: 'If you are yanking with your whole body or shrugging your traps, go lighter. The cable rewards control, not momentum. One arm at a time, no swinging.',
    range: 'Let the handle pull your arm across your body at the bottom for a full stretch, then raise to shoulder height. Three seconds down, fight the cable.',
  },
  'Side_Lateral_Raise': {
    cue: 'Pour two jugs of water out to your sides, pinkies tilted up. Lead with your elbows. If your neck is working, you are swinging.',
    feel: 'The outer cap of the shoulder, the one that builds width. It burns early and hard with light weight.',
    wrong: 'If your traps and neck are doing the work, or the weights swing up with a hip snap, halve the load. This move is embarrassing with the right weight. That is the point.',
    range: 'Up to shoulder height only, no higher. Three seconds down, fighting it the whole way.',
  },
  'Cable_Rope_Overhead_Triceps_Extension': {
    cue: 'Freeze your elbows pointing forward like two headlights. Only your forearms move. Chase the stretch behind the arm.',
    feel: 'Deep in the long head of the triceps, the meat on the back of the upper arm near the armpit.',
    wrong: 'If your elbows drift out and down and it turns into a shrug, you have lost the exercise. Reset lighter and keep the upper arms locked in place.',
    range: 'Let the rope pull your hands down behind your head into a full stretch, then extend to a hard squeeze. The stretch is where the size is.',
  },
  'Triceps_Pushdown': {
    cue: 'Pin your elbows to your sides like they are nailed there, and flex the back of your arm hard at the bottom.',
    feel: 'The outer and middle triceps, hardest at the bottom of the rep.',
    wrong: 'If you are leaning over the bar and pushing with your bodyweight, the weight is too heavy. Stand tall, elbows still.',
    range: 'All the way to a locked, squeezed bottom. Let it rise until the forearm passes 90 degrees, no further.',
  },

  // ---------------- Pull (Thu) ----------------
  'Wide-Grip_Lat_Pulldown': {
    cue: 'The bar is just a hook. Drive your elbows down into your back pockets, not backwards. Think elbows to hips.',
    feel: 'The outer lat, the wing under your armpit that runs down your ribs. Stretched at the top, squeezed at the bottom.',
    wrong: 'If you lean back and pull the bar under your chest you have turned it into a row, and the lat works shortened and weak. Sit almost upright, 15 degrees of lean at most, pull to your collarbone. And if your forearms give out before your back, you are gripping too hard: thumb over the bar, hands loose, pull with the elbow.',
    range: 'Let the bar carry your shoulder blades UP at the top so the lats stretch fully. Pull the blade down first, then bend the arm. Three seconds back up.',
  },
  'Seated_Cable_Rows': {
    cue: 'Chest up and proud, pull to your belly button, and crack a walnut between your shoulder blades. Pause on the squeeze.',
    feel: 'The middle of the back, between the shoulder blades. This is the thickness builder.',
    wrong: 'If you rock backwards and forwards from the hips to move the weight, you are using your lower back as a lever. Torso still, only the arms and blades move.',
    range: 'Let the weight pull your shoulder blades forward at the front for a stretch, then pull. One second at the squeeze.',
  },
  'Bent_Over_Two-Dumbbell_Row': {
    cue: 'Row to your hip, not your armpit, elbow driving back like you are starting a lawnmower. Keep your back flat as a tabletop.',
    feel: 'The lat, low and wide, plus the muscles between the blades.',
    wrong: 'If your lower back rounds or aches, end the set. Hinge from the hips with a flat back. If your biceps burn first, you are curling the weight up instead of driving the elbow back.',
    range: 'Full hang at the bottom, elbow past your ribs at the top. Control it down, never drop it.',
  },
  'Face_Pull': {
    cue: 'Pull the rope to your forehead and show your biceps to the wall behind you, spreading the rope apart at the end.',
    feel: 'The rear delts and the small muscles between the shoulder blades. Feels like nothing at first, then burns.',
    wrong: 'If it feels like a row into your chest, the cable is too low. Set it at head height or above. Go light. This is a posture and shoulder-health move, not an ego move.',
    range: 'All the way until your hands are beside your ears and the rope is pulled apart. Slow both ways.',
  },
  'Incline_Dumbbell_Curl': {
    cue: 'Let your arms hang straight down behind your body first. That stretch is the whole point. Curl without your elbows drifting forward.',
    feel: 'The bicep, especially the long outer head that builds the peak. A real stretch at the bottom.',
    wrong: 'If your elbows swing forward as you curl, you have handed the work to your front delts. Pin the upper arm to the bench and let only the forearm move.',
    range: 'Dead straight arms at the bottom, no cheating the stretch. Curl to a hard squeeze, three seconds down.',
  },
  'Alternate_Hammer_Curl': {
    cue: 'Carry two hammers, thumbs up, and squeeze the outer arm. This is the one that adds thickness and width to the arm.',
    feel: 'The outer forearm and the brachialis, the muscle under the bicep that pushes it up.',
    wrong: 'If your shoulders shrug or your body swings to start each rep, drop the weight. Elbows stay glued to your ribs.',
    range: 'Straighten the arm fully at the bottom. Curl to the shoulder, lower under control.',
  },
  'Dead_Hang': {
    cue: 'Just hang. Arms straight, body still, like a coat on a hook. Breathe.',
    feel: 'Your hands and forearms screaming, your lats stretching long, your shoulders under a gentle pull.',
    wrong: 'If your shoulders are up by your ears and completely slack, pull them down slightly so the joint is supported. If your hands are slipping, that is the exercise working, not a reason to stop early.',
    range: 'Hang until your grip genuinely gives out, then step down under control. Target 60 seconds. This is the one that fixes your grip.',
  },

  // ---------------- Legs + core (Fri) ----------------
  'Leg_Press': {
    cue: 'Push through your heels, knees tracking over your toes, and stop just short of locking out. Do not let your lower back peel off the pad.',
    feel: 'Quads across the front of the thigh, glutes at the deep end.',
    wrong: 'If your tailbone lifts and your lower back rounds at the bottom, you have gone deeper than your hips allow. Shorten the range. Never slam the knees straight at the top.',
    range: 'Down until the knees are around 90 degrees, or as deep as you can go with your back flat on the pad. Two seconds down.',
  },
  'Dumbbell_Lunges': {
    cue: 'Step out, drop straight down like an elevator, and drive up through your front heel. Stay tall and proud through the torso.',
    feel: 'Front-leg quad and glute. The back leg is a kickstand, not an engine.',
    wrong: 'If you feel it mostly in the back leg, your step is too short. If the front knee wobbles inward on the way up, slow down and shorten the range.',
    range: 'Back knee to just above the floor, front thigh parallel. Push up without letting the torso pitch forward.',
  },
  'Seated_Leg_Curl': {
    cue: 'Drag your heels toward your bum and squeeze the hamstring hard, toes pulled up toward your shins. Slow on the way back.',
    feel: 'The back of the thigh, hardest at the fully curled position.',
    wrong: 'If your hips lift off the seat to help, the weight is too heavy. Hips pinned, only the knee joint moves.',
    range: 'Full curl, one-second squeeze, three seconds back out to a straight leg. The negative is where hamstrings grow.',
  },
  'Standing_Calf_Raises': {
    cue: 'Rise onto your big toe as high as you can, pause a full second at the top, then sink into a deep stretch. The pause is the exercise.',
    feel: 'The calf, cramping at the top and stretching hard at the bottom.',
    wrong: 'If you are bouncing, you are using the tendon like a spring and the muscle is doing nothing. Kill the bounce, own the pause.',
    range: 'Heel dropped below the step for a full stretch, up onto the toes for a full contraction. One second at each end.',
  },
  'Air_Bike': {
    cue: 'Brace like someone is about to punch your gut. Bring elbow to opposite knee slowly, no yanking on your neck.',
    feel: 'The abs, and the obliques on the twisting side.',
    wrong: 'If your neck aches, your hands are pulling your head. Fingertips at your temples, never laced behind the skull. If you are going fast, you are cheating.',
    range: 'Fully extend the straight leg, fully rotate the shoulder across. Slow and deliberate.',
  },
  'Plank': {
    cue: 'Brace your abs hard, tuck your ribs down, and squeeze your glutes. A short hard brace beats a long saggy one.',
    feel: 'Abs braced solid all the way down the front, glutes working too.',
    wrong: 'If your hips sag toward the floor or ride up in the air, the set is over, whatever the timer says. If your lower back aches, you are sagging.',
    range: 'Not a range, a hold. Straight line from ear to heel for the full time, or stop.',
  },
  'Farmers_Walk': {
    cue: 'Stand tall between two heavy dumbbells, pick them up, and walk like you own the place. Shoulders back, no swinging.',
    feel: 'Your hands and forearms first, then your traps and your abs holding you upright.',
    wrong: 'If you are leaning to one side, the weights are uneven or too heavy. If your shoulders round forward, reset. Put them down when the grip goes, do not fight it to a fumble.',
    range: 'Walk 40 to 60 seconds in short controlled steps. Grip failure ends the set. That is the whole point of it.',
  },

  // ---------------- Arms + delts (Sat) ----------------
  'Barbell_Curl': {
    cue: 'Pin your elbows to your sides and curl without swinging. If your back or shoulders join in, drop the weight and go strict.',
    feel: 'The whole bicep, hardest through the middle of the rep.',
    wrong: 'If you are leaning back to launch the bar, you are training your lower back. If your wrists hurt, use the EZ bar instead of the straight one.',
    range: 'Straight arms at the bottom, every rep. Squeeze at the top, three seconds down.',
  },
  'Cable_Hammer_Curls_-_Rope_Attachment': {
    cue: 'Thumbs up on the rope, elbows glued to your sides, squeeze the outer arm at the top. Builds arm width.',
    feel: 'The outer arm and forearm, that thick ridge between the bicep and the elbow.',
    wrong: 'If your elbows travel forward or your shoulders shrug, you have lost the tension. Stand tall, upper arms dead still.',
    range: 'Full extension at the bottom against the cable, full squeeze at the top. The cable keeps tension the whole way, do not waste it.',
  },
  'Bench_Dips': {
    cue: 'Keep your back close to the bench and lower until your elbows hit 90 degrees, then push through your palms. Feel the triceps.',
    feel: 'The triceps, hardest at the bottom and through the drive back up.',
    wrong: 'If your shoulders feel pinched or crunchy at the bottom, you have gone too deep. Stop at 90 degrees. Keep your body scraping the bench, not drifting forward.',
    range: 'Down to 90 degrees at the elbow, up to a lockout and a squeeze. Control the descent.',
  },
  'Bent-Knee_Hip_Raise': {
    cue: 'Curl your knees up toward your chest and lift your hips off the bench using the bottom of your abs, not momentum.',
    feel: 'The lower abs, below the belly button.',
    wrong: 'If you are swinging your legs to generate the lift, you are training nothing. Slow it down and think about curling your pelvis toward your ribs.',
    range: 'The hips genuinely leave the bench at the top. Lower slowly until the abs stretch, then go again.',
  },
  'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench': {
    cue: 'Forearms flat on the bench, palms up, wrists hanging off the edge. Let the dumbbell roll to your fingertips, then curl it back.',
    feel: 'The inside of the forearm, the muscle you shake hands with. It burns fast.',
    wrong: 'If your forearm lifts off the bench, you are using your bicep. Pin it down and let only the wrist move.',
    range: 'Roll it all the way down to the fingertips for the stretch, then curl the wrist as high as it goes. Full range or it is pointless.',
  },
  'Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench': {
    cue: 'Same as the wrist curl but palms down. Lift the backs of your hands toward the ceiling.',
    feel: 'The top of the forearm, near the elbow. This one protects the wrist and elbow joint.',
    wrong: 'If you are grinding heavy weight here, you are asking for elbow pain. It should feel almost too light. That is correct.',
    range: 'Hands drop for a stretch, then lift to a squeeze. Slow, small, controlled.',
  },
};

const norm = (c) => (typeof c === 'string' ? { cue: c } : c);   // tolerate the old string shape

export function coachFor(id) {
  const c = CUES[id];
  return c ? norm(c) : null;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

/* The form block. Labels are sentence-case in the DOM (CSS uppercases them) so
   screen readers don't spell them out. Emoji are decorative and hidden from AT;
   each row is told apart by its label text and left border, never by colour alone. */
export function formBlock(id) {
  const f = coachFor(id);
  if (!f) return '';
  const row = (cls, icon, label, text) => (text ? `
    <div class="fb-row fb-${cls}">
      <dt><span class="fb-ic" aria-hidden="true">${icon}</span><span class="fb-label">${label}</span></dt>
      <dd>${esc(text)}</dd>
    </div>` : '');
  const rows =
    row('cue', '🎯', 'Cue', f.cue) +
    row('feel', '📍', 'Feel it', f.feel) +
    row('wrong', '⚠️', 'Doing it wrong if', f.wrong) +
    row('range', '↕️', 'Range &amp; tempo', f.range);
  return rows ? `<dl class="form-block">${rows}</dl>` : '';
}
