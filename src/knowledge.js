/* ============================================================
   DAX — Knowledge library
   Tristan's personal training wiki: short, plain-English lessons
   tailored to HIS goal (lean V-taper, solo, consistency-first).
   Data + helpers + the article reader overlay + "Got it" state.
   ============================================================ */
import { db } from './store.js';

export const CATEGORIES = [
  { id: 'training',   label: 'Training',      icon: '🏋️', blurb: 'How muscle actually grows.' },
  { id: 'muscles',    label: 'Muscle groups', icon: '💪', blurb: 'Each muscle: how it works, how to train it.' },
  { id: 'diet',       label: 'Diet',          icon: '🍽️', blurb: 'The raw materials.' },
  { id: 'recovery',   label: 'Recovery',      icon: '😴', blurb: 'Where growth actually happens.' },
  { id: 'aesthetics', label: 'Body & look',   icon: '🪞', blurb: 'The sculpted-physique truths.' },
  { id: 'mindset',    label: 'Mindset',       icon: '🧠', blurb: 'The head game.' },
];

/* Each article: { id, cat, icon, title, teaser, dows?, body:[paragraphs] }
   dows = training days this lesson is relevant to, for the context-aware
   daily card ("today you train shoulders, here's a shoulder lesson"). */
export const ARTICLES = [
  /* ---------------- TRAINING ---------------- */
  { id: 'three-laws', cat: 'training', icon: '⚖️', title: 'The 3 laws that matter most',
    teaser: 'Overload, recovery, food. Everything else is detail.',
    body: [
      'Ninety percent of your results come down to three things. One: progressive overload, you force the muscle to handle more over time. Two: recovery, the muscle is rebuilt during rest and sleep, not in the gym. Three: food, protein and calories are the raw material it rebuilds with.',
      'Miss any one and the other two barely matter. Perfect training with no food builds nothing. Perfect food with no overload maintains what you have. Get all three pointing the same way and your body has no choice but to grow.',
      'If you only remember one lesson in here, make it this one. The rest is refinement.',
    ],
    short: [
      'Three things drive 90% of results: <strong>overload</strong> (do more over time), <strong>recovery</strong> (rebuilt during rest, not the gym), and <strong>food</strong> (the raw material).',
      'Miss one and the other two barely matter. Point all three the same way and growth is forced.',
    ],
    quiz: { q: 'Where is muscle actually rebuilt?', why: 'The gym is the stimulus; the rebuild happens during rest and sleep.',
      options: [{ text: 'During the workout' }, { text: 'During rest and sleep', correct: true }, { text: 'While stretching' }] } },
  { id: 'progressive-overload', cat: 'training', icon: '📈', title: 'Progressive overload: the engine',
    teaser: 'Beat last time, or you are just exercising.',
    body: [
      'Muscle only grows when you ask it to do more than last time: more weight, more reps, or more sets. Your body is lazy and adaptive, like a callus, it only thickens when something keeps rubbing it. Lift the same weight for the same reps forever and you stay exactly the same.',
      'This is why DAX nags you to beat last session. That coach line is not decoration, it is the single most important feature. Tracking your numbers is what makes the overload real instead of a vibe.',
      'You will not beat it every single session, and that is fine. The trend over weeks is what counts.',
    ],
    short: [
      'Muscle only grows when you ask it to do <strong>more than last time</strong>: more weight, reps, or sets. Same weight forever = same body.',
      'That is why DAX nags you to beat last session. The trend over weeks is what counts, not every single day.',
    ],
    quiz: { q: 'What makes a muscle grow?', why: 'Doing more than last time (weight, reps, or sets) is the stimulus. Same input = same output.',
      options: [{ text: 'Doing more than last time', correct: true }, { text: 'Lifting the same weight consistently' }, { text: 'Longer rest between sets' }] } },
  { id: 'double-progression', cat: 'training', icon: '🪜', title: 'Double progression: how to add weight',
    teaser: 'Climb the reps, then bump the weight.',
    body: [
      'Do not just slap more weight on every week, you will stall or get hurt. Use double progression. Pick a rep range, say 8 to 12. Each session try to add a rep at the same weight: 8, then 9, then 10, up to 12 on every set.',
      'Once you hit the top of the range on all your sets, then you add 2.5kg. Your reps naturally drop back to around 8, and you start climbing again at the new heavier weight.',
      'So most sessions you beat last time by a rep, not a plate. The weight only moves when you have earned it. DAX does this maths for you and tells you which move to make.',
    ],
    short: [
      'Pick a rep range (say 8 to 12). Add a rep each session at the same weight until you hit the top on every set.',
      'Only <strong>then</strong> add 2.5kg. Reps drop back near 8 and you climb again. You beat last time by a rep, not a plate.',
    ],
    quiz: { q: 'When do you add weight in double progression?', why: 'You earn the jump by hitting the top of the rep range on all sets first.',
      options: [{ text: 'Every session, no matter what' }, { text: 'Once you hit the top of the rep range on all sets', correct: true }, { text: 'When the weight feels light on set one' }] } },
  { id: 'rir-failure', cat: 'training', icon: '🔥', title: 'How hard? Reps in reserve',
    teaser: 'Working sets 1-3 from failure. Warm-ups do not count.',
    body: [
      'A set only really counts when you take it close to failure, roughly 1 to 3 reps left in the tank. Sets you stop 5+ reps early feel comfortable but do almost nothing. Most people train their whole lives leaving too much in the tank and wonder why they never grow.',
      'Your working sets should be genuinely hard. Your last set of an exercise can go to 0-1 reps, real failure, on the safe stuff like cables, machines and dumbbells. Warm-up sets are not near failure, they are the ramp-up.',
      'One caution for you: you are just back after years off, so ease in. Leave 2-3 in the tank for the first few weeks while tendons and form catch up, then start pushing to 1-2.',
    ] },
  { id: 'volume', cat: 'training', icon: '📊', title: 'Volume: how many sets',
    teaser: 'About 10-20 hard sets per muscle per week.',
    body: [
      'Volume is your total hard sets for a muscle across the week. The sweet spot for growth is roughly 10 to 20 sets per muscle per week. Below that you under-stimulate, way above it you just dig a recovery hole you cannot climb out of.',
      'More is not better, better is better. Ten hard sets beat twenty half-hearted ones. This is why quality of effort matters more than just piling on exercises.',
      'Your plan already lands your priority muscles, delts, back, arms, in that range across two sessions a week. You do not need to add more, you need to make what is there count.',
    ] },
  { id: 'frequency', cat: 'training', icon: '🔁', title: 'Frequency: why twice a week wins',
    teaser: 'Two smaller doses beat one big blast.',
    body: [
      'After you train a muscle, the "grow" signal it sends lasts about 48 hours, then it fades. Blast chest once a week and you get one spike, then five flat days. Hit it twice a week and you get two spikes, roughly double the time actually spent growing, for the same total work.',
      'That is exactly why your plan trains delts and lats twice a week instead of one giant day. More frequent, smaller doses beat one big dose.',
      'It also means a missed session hurts less, because the muscle gets another shot in a few days.',
    ] },
  { id: 'tempo-stretch', cat: 'training', icon: '🎈', title: 'The stretch is where muscle is built',
    teaser: 'Control the lowering. Feel the stretch.',
    body: [
      'Most people explode the weight up and let it drop. Backwards. The lowering phase and the stretched position of a rep drive the most growth. Think of the muscle like a rubber band, the magic is in the stretch, not the snap back.',
      'Practical version: take about 2 to 3 seconds to lower every rep, and really feel the muscle stretch at the bottom, the bottom of a curl, the deep part of a lat pulldown, the stretch at the bottom of a lateral raise.',
      'Same weight, more growth, just by not throwing it around. This is one of the biggest free upgrades you can make.',
    ] },
  { id: 'mind-muscle', cat: 'training', icon: '🧩', title: 'Mind-muscle connection & full range',
    teaser: 'Feel the target. Use the whole range.',
    body: [
      'For building shape, feeling the target muscle work beats moving the most weight. If you are curling and feeling it in your shoulders and back, you are just moving a weight from A to B, not building biceps. Slow down and aim the tension at the muscle you want.',
      'Take every rep through its full range: all the way to the stretch, all the way to the squeeze. Half-reps with a heavier weight grow you less and hurt you more.',
      'This matters most for the aesthetic muscles, delts and arms. They respond to clean tension, not heaving.',
    ] },
  { id: 'warmups', cat: 'training', icon: '🌡️', title: 'Warm-ups vs working sets',
    teaser: 'Ramp up, then bring the real effort.',
    body: [
      'Two kinds of sets. Warm-up sets are light, easy, and just prepare the joint and groove the movement, they do not count toward growth and should not be near failure. Working sets are the real ones, heavy and close to failure, and those are what build muscle.',
      'For a big lift, a couple of ramp-up sets are plenty. For isolation moves like lateral raises you often need just one. Do not burn your energy on endless warm-up sets and arrive at your working sets already tired.',
      'DAX shows a full-body warm-up at the start of each session, that is your five minutes to protect the joints, especially five years off.',
    ] },
  { id: 'deloads', cat: 'training', icon: '🪫', title: 'Deloads & managing fatigue',
    teaser: 'Back off every 6-8 weeks so you can push again.',
    body: [
      'Training hard every week forever does not work, fatigue piles up faster than you notice and your lifts stall. Every 6 to 8 weeks, take a lighter week: same movements, less weight or fewer sets. You come back fresher and stronger.',
      'Little niggles, joints that ache, sleep going sideways, and stalled numbers are signs you need it. Backing off is not weakness, it is how you keep progressing for years instead of burning out in months.',
      'You are also in a tendon re-entry block right now, which is a built-in easy phase while your tissue catches up to your muscles.',
    ] },

  /* ---------------- MUSCLE GROUPS ---------------- */
  { id: 'm-shoulders', cat: 'muscles', icon: '🦾', title: 'Shoulders: the width makers', dows: ['Tue', 'Sat'],
    teaser: 'Three heads. The side head is your width.',
    body: [
      'The shoulder (deltoid) has three heads: front, side, and rear. Pressing hits the front, which most people already overdevelop. The side head is the one that makes shoulders look wide and capped, and it is your number one priority for the V-taper.',
      'Train side delts with lateral raises, high reps, 12 to 20, and slow control, they are small and respond to volume not heavy weight. Do not swing them. The rear head (face pulls) balances your posture and rounds out the 3D look.',
      'Wide shoulders and a narrow waist are what create the illusion of a bigger frame even if your skeleton is average. This is your biggest aesthetic lever.',
    ] },
  { id: 'm-back', cat: 'muscles', icon: '🪽', title: 'Back: width vs thickness', dows: ['Thu'],
    teaser: 'Lats give the taper. Rows give the thickness.',
    body: [
      'Your back has two jobs for the look. The lats, trained by pulldowns and pull-ups, give width, the top of your V. Rows (cable rows, dumbbell rows) build thickness through the middle back, the detail and density.',
      'For your taper, prioritise lat width: wide-grip pulldowns, full stretch at the top, drive the elbows down and think about pulling with the elbows not the hands.',
      'A strong wide back is half the V-taper, the shoulders are the other half. The waist just has to stay lean underneath.',
    ] },
  { id: 'm-chest', cat: 'muscles', icon: '🛡️', title: 'Chest: mind the upper shelf', dows: ['Tue'],
    teaser: 'Upper chest is the aesthetic bit.',
    body: [
      'The chest is one muscle but you can bias regions by angle. Incline presses hit the upper chest, which is the part that builds the "shelf" and makes a physique look powerful. Flat and decline work the mid and lower chest.',
      'Prioritise incline work. A big lower chest with nothing up top can look droopy, upper-chest focus looks square and strong.',
      'You do not need barbell bench to build a great chest. Incline dumbbells and cable presses do it, and they are safe to push hard solo.',
    ] },
  { id: 'm-biceps', cat: 'muscles', icon: '💪', title: 'Biceps: peak and thickness', dows: ['Thu', 'Sat'],
    teaser: 'Two heads, plus the muscle under them.',
    body: [
      'The biceps has two heads. Incline curls (arm behind the body) stretch the long head and build the peak. Regular and preacher curls hit the short head. Underneath sits the brachialis, and hammer curls build it, which pushes the biceps up and adds arm thickness.',
      'So a full arm needs a mix: a supinating curl for the biceps, a hammer curl for thickness, and ideally an incline curl for the stretch and peak.',
      'Arms are a lagging point for you, so they get extra volume across two days. Slow the lowering, feel the stretch.',
    ] },
  { id: 'm-triceps', cat: 'muscles', icon: '🐴', title: 'Triceps: two-thirds of your arm', dows: ['Tue', 'Sat'],
    teaser: 'The long head is the real arm size.',
    body: [
      'People chase biceps but the triceps is about two-thirds of your upper-arm size. It has three heads. The long head is the biggest and only gets fully worked when your arm is overhead or behind you, so overhead extensions are key, that is what makes arms look full.',
      'Pushdowns hit the lateral head (the outer sweep), and dips hit everything. A complete arm plan has both a pushdown and an overhead extension.',
      'Want bigger arms? Give the triceps at least as much attention as the biceps. Your plan now hits the long head front and back.',
    ] },
  { id: 'm-legs', cat: 'muscles', icon: '🦵', title: 'Legs: the base', dows: ['Fri'],
    teaser: 'Quads, hamstrings, glutes, calves.',
    body: [
      'Front of the thigh is the quads (leg press, extensions, lunges), back is the hamstrings (leg curls, Romanian deadlifts), plus the glutes and the calves lower down. Legs are half your body, and training them releases a whole-body growth stimulus.',
      'You are on maintenance legs right now, once a week, so you keep and slowly build them while your upper body gets the spotlight. Machines like leg press and leg curl let you push hard safely on your own.',
      'Do not skip them entirely. Legs frame the physique and a top-heavy look with skinny legs reads as unbalanced.',
    ] },
  { id: 'm-abs', cat: 'muscles', icon: '🧱', title: 'Abs: build a little, reveal with the cut', dows: ['Fri', 'Sat'],
    teaser: 'Train them like a muscle, show them with diet.',
    body: [
      'Abs are a muscle like any other. Train them a little, a few hard sets twice a week, and they thicken so they "pop" when you get lean. You do not need hundreds of crunches, that does nothing.',
      'But visibility is all diet. No amount of ab work burns belly fat, abs show when your body fat is low enough, which for the lower abs is the last place to lean out.',
      'Keep oblique work light. Hammering heavy side bends thickens your waist, which fights the taper you want. Build the front, keep the sides tight.',
    ] },

  /* ---------------- DIET ---------------- */
  { id: 'd-protein-why', cat: 'diet', icon: '🧱', title: 'Protein: the bricks',
    teaser: 'No protein, no new muscle. Simple as that.',
    body: [
      'Muscle is largely protein. When you train, you damage muscle fibres, and protein is the raw material your body rebuilds them bigger with. Training without enough protein is like a builder with no bricks: the crew shows up, but nothing goes up.',
      'This has been your single biggest gap. You eat plenty of calories, but a lot of it was junk that carries energy without much protein. Calories keep you alive, protein builds the body.',
      'Get this one right and everything else works better.',
    ] },
  { id: 'd-protein-how', cat: 'diet', icon: '🥩', title: 'How much protein, and when',
    teaser: 'Roughly 2g per kg, spread across the day.',
    body: [
      'Aim for about 1.6 to 2.2 grams of protein per kilo of bodyweight per day. For you that lands around 140 to 155 grams. That is the number that actually matters, hit it daily and consistency does the rest.',
      'Spread it across the day, roughly 30 to 40 grams per meal, rather than one giant hit. Your body can only use so much at once for muscle building, so four meals of 35g beats one of 140g.',
      'The old "anabolic window" panic (protein right after training) is mostly a myth. Total daily protein is what counts, not the stopwatch.',
    ] },
  { id: 'd-calories', cat: 'diet', icon: '⚡', title: 'Calories: surplus, deficit, maintenance',
    teaser: 'The master switch for gaining or losing.',
    body: [
      'Calories are energy. Eat more than you burn (a surplus) and you gain weight. Eat less (a deficit) and you lose it. Eat around your burn (maintenance) and you hold. This one rule governs whether you get bigger or leaner, full stop.',
      'To build muscle you generally want a small surplus so there is spare energy to grow. To reveal muscle you want a deficit to strip fat. You cannot maximise both at once, which is why people bulk then cut.',
      'Your fast metabolism means your maintenance is high, so you have to actually eat to grow. Under-eating, not lack of effort, was the real block before.',
    ] },
  { id: 'd-bulk-cut-recomp', cat: 'diet', icon: '🔄', title: 'Bulk, cut, or recomp',
    teaser: 'Build in a surplus, reveal in a deficit.',
    body: [
      'A bulk is a surplus to build muscle, you accept a little fat gain. A cut is a deficit to strip fat, you accept a little muscle risk (protein and lifting protect it). Most people alternate: build for months, then cut to reveal.',
      'Recomp is the rare middle path: build muscle and lose fat at the same time. It mostly works for beginners, the overweight, and people returning after a break, and you are in that window right now.',
      'That is why your calories are set at a lean gain, not a big bulk: you can add muscle while the belly shrinks, so we exploit it while it lasts.',
    ] },
  { id: 'd-creatine', cat: 'diet', icon: '💊', title: 'Creatine: the one that works',
    teaser: 'Cheap, safe, proven. Take it daily.',
    body: [
      'Creatine is the most researched, most reliable supplement there is, and one of the cheapest. It helps your muscles produce quick energy, so you get a few more reps, which over time means more muscle. It also pulls a little water into the muscle, making it look fuller.',
      'Take 5 grams every day, forever, timing does not matter (the "must be pre-workout" thing is a myth). Consistency is the whole game, so we tie it to your morning shake.',
      'It is safe long-term for healthy people. This is one of the very few supplements worth your money.',
    ] },
  { id: 'd-whey', cat: 'diet', icon: '🥤', title: 'Whey: it is just food',
    teaser: 'A convenient protein top-up, not magic.',
    body: [
      'Whey protein is not a drug or a steroid, it is just fast-digesting protein from milk in powder form. Its only job is to make hitting your protein easier and cheaper than always eating meat.',
      'Use it to patch the gaps, the meals where real food is a hassle. Key rule for you: mix it with milk, not water, so it carries real calories too, otherwise you patch the protein but blow a hole in your surplus.',
      'Do not let it become your whole diet, whole food gives you fullness and micronutrients a powder cannot. It is a tool, not the meal.',
    ] },
  { id: 'd-junk-trap', cat: 'diet', icon: '🍟', title: 'The junk-calorie trap',
    teaser: 'Calories without bricks. Your exact weakness.',
    body: [
      'Your problem was never eating too little, it was eating a lot of food that carries energy but almost no protein: chips, sweets, fizzy drinks, crumbed nuggets. Calories without bricks. You paid the calorie price and got none of the building material.',
      'The fix is not to eat less, it is to swap junk calories for quality ones without dropping your total. Clean food is often less calorie-dense, so "eating healthy" must not accidentally starve your surplus.',
      'This is why your shake, eggs, tuna, and deli chicken exist: reliable protein and quality calories, so every calorie you eat is also a brick.',
    ] },
  { id: 'd-alcohol-fibre-water', cat: 'diet', icon: '🚰', title: 'Alcohol, fibre & water',
    teaser: 'The quiet levers around the plate.',
    body: [
      'Alcohol is the big one to limit: it is empty calories, it wrecks the sleep that builds your muscle, and it blunts recovery for a day or two. You do not have to be a monk, but heavy drinking directly fights your goal.',
      'Fibre, from veg, fruit and wholegrains, keeps digestion and appetite steady and stops the lower belly looking bloated. Aim for a serving of veg or fruit at most meals.',
      'Water: even mild dehydration saps strength and makes you feel flat. Drink through the day, more around training. Boring, free, and it works.',
    ] },

  /* ---------------- RECOVERY ---------------- */
  { id: 'r-sleep', cat: 'recovery', icon: '😴', title: 'Sleep: your number one recovery lever',
    teaser: 'Muscle is built in the dark.',
    body: [
      'Sleep is when your body actually repairs and grows the muscle you damaged in the gym. Skimp on it and you leave gains on the table no matter how well you train and eat. Aim for 7 to 9 hours.',
      'Deep sleep is where most of the muscle-building repair and growth hormone happen. Consistent sleep and wake times help you get more of it, your body learns the rhythm.',
      'For you specifically: smoking closer to bedtime blunts REM sleep, so keeping a 90-minute gap before sleep protects it. You are already doing this well.',
    ] },
  { id: 'r-doms', cat: 'recovery', icon: '🥵', title: 'DOMS: why you get sore',
    teaser: 'Soreness is not the goal, and not damage.',
    body: [
      'Delayed onset muscle soreness (DOMS) is that ache that peaks a day or two after training, worst when a movement is new or you are just back. It is a normal response, not injury, and it fades fast as your body adapts, within a few weeks the same session barely touches you.',
      'Soreness is not a scoreboard. You can grow without being sore and be sore without growing. Do not chase it.',
      'What helps: eat your protein, move gently (a walk beats lying still), and sleep. Sharp or joint pain is different, that is a signal to back off, not push through.',
    ] },
  { id: 'r-tendons', cat: 'recovery', icon: '🕸️', title: 'Tendons lag muscles',
    teaser: 'Muscles remember in weeks, tendons take months.',
    body: [
      'Your muscles get their strength back quickly after time off, but tendons and connective tissue adapt much slower. That mismatch is exactly how people hurt themselves coming back: the muscle can lift more than the tendon is ready for.',
      'That is why DAX holds your weights lighter for the first weeks even when the lift feels easy. It is not doubting you, it is protecting the tissue that has not caught up yet.',
      'Ego later. A tweaked shoulder costs you a month, a patient month costs you nothing.',
    ] },
  { id: 'r-stress', cat: 'recovery', icon: '🧯', title: 'Stress & cortisol',
    teaser: 'Life stress eats into your recovery budget.',
    body: [
      'Your body has one recovery budget, and hard training, poor sleep, and life stress all draw from it. Chronic stress keeps cortisol high, which works against recovery, appetite, and sleep, so a brutal life phase can stall your gains even if training is on point.',
      'You cannot always control stress, but you can protect the basics under it: keep sleep and protein steady, and do not also try to smash a super-aggressive program during a stressful stretch.',
      'Training itself is a great stress reliever, so the gym helps here, as long as you are recovering around it.',
    ] },
  { id: 'r-neat', cat: 'recovery', icon: '🚶', title: 'NEAT & your fast metabolism',
    teaser: 'You burn a lot just existing. Feed it.',
    body: [
      'NEAT is all the energy you burn outside exercise: walking, fidgeting, standing, daily movement. Naturally lean, fast-metabolism people often have high NEAT, they burn a lot just living, which is why staying skinny came easy and gaining is the hard part for you.',
      'The lesson is not to move less, movement is good for health and appetite. The lesson is that your maintenance calories are higher than you think, so you genuinely have to eat to grow.',
      'When people say "I eat a lot and stay skinny," this is usually why. The scale does not lie: if you are not gaining, you are not eating enough, yet.',
    ] },

  /* ---------------- BODY & LOOK ---------------- */
  { id: 'a-vtaper', cat: 'aesthetics', icon: '🔻', title: 'The V-taper: your whole goal',
    teaser: 'Wide up top, narrow at the waist.',
    body: [
      'The V-taper is the silhouette that reads as "in shape" even under a shirt: broad shoulders and lats up top, tapering down to a lean waist. It is created by three things, wide side delts, wide lats, and a tight waist.',
      'You cannot change your skeleton (your clavicle width is fixed), but you can build the muscle and manage the waist to create the illusion of a much bigger frame. Side delts and lats widen the top, leanness narrows the bottom.',
      'This is why your whole plan leans into shoulders and back and keeps the waist tight. Chase the shoulder-to-waist ratio, not the scale number.',
    ] },
  { id: 'a-bodyfat', cat: 'aesthetics', icon: '📉', title: 'Body fat & what abs need',
    teaser: 'Abs are made in the kitchen.',
    body: [
      'How visible your muscle is depends on body fat percentage. Most men start seeing abs around 12 to 15 percent, and the deep, dry, fully-shredded look is lower still. It is a diet outcome, not a training one.',
      'You can build all the muscle you want, but a layer of fat over it hides the definition. That is why the sequence is build first, then cut to reveal, you cannot skip to shredded without the muscle underneath.',
      'You do not need to live shredded year-round, that is miserable and hard to maintain. Build most of the year, lean out when you want to show it.',
    ] },
  { id: 'a-vlines', cat: 'aesthetics', icon: '📐', title: 'The V-lines (Adonis belt) truth',
    teaser: 'Diet reveals them. You cannot train them.',
    body: [
      'Those diagonal lines at the lower abs pointing toward the hips are not a muscle you can build, they are a tendon and fascia line that only shows when body fat is low enough and the lower abs are developed underneath.',
      'The lower belly is the last place most men lean out, so V-lines are a late reveal, they surface when you are genuinely lean, not before. How pronounced they get is partly genetic.',
      'So the play is boring but true: train lower abs lightly, keep the waist tight, and let a cut do the reveal. You diet them into visibility, you do not crunch them into existence.',
    ] },
  { id: 'a-myths', cat: 'aesthetics', icon: '🚫', title: 'Spot reduction & "toning" myths',
    teaser: 'Two of the biggest gym lies.',
    body: [
      'Spot reduction is a myth: doing ab work does not burn belly fat, and doing inner-thigh moves does not slim thighs. Fat comes off your whole body at once, in an order set by your genetics, driven by an overall calorie deficit.',
      '"Toning" is also a myth as most people mean it. There is no special light-weight, high-rep magic that "tones." A toned look is just built muscle plus low body fat. You cannot shape a muscle into a look, you build it and reveal it.',
      'So ignore anyone selling a "fat-blasting ab routine." Build muscle, manage calories, get lean. That is the whole trick.',
    ] },
  { id: 'a-genetics', cat: 'aesthetics', icon: '🧬', title: 'Genetics: what you can and cannot change',
    teaser: 'Play your hand well, do not fold it.',
    body: [
      'Some things are fixed: your bone structure, clavicle width, muscle insertions, where you store fat, and how pronounced details like ab lines get. Comparing your fixed traits to someone else\'s is a losing game.',
      'But almost everything that matters is trainable: how much muscle you carry, how lean you get, your proportions. You cannot widen your skeleton, but you can build side delts and lats to create width, and stay lean to look bigger.',
      'Your frame is smaller than a Hemsworth, and that is fine, the realistic target is your best build: capped delts, a wide back, tight waist. Chase your ceiling, not someone else\'s.',
    ] },

  /* ---------------- MINDSET ---------------- */
  { id: 'ms-consistency', cat: 'mindset', icon: '🗝️', title: 'Consistency is a trainable skill',
    teaser: 'Not a personality trait you lack.',
    body: [
      'You have called consistency your weak spot, but it is not a fixed character flaw, it is an unbuilt skill, and skills are trainable. The people who "have discipline" mostly built structure that makes showing up the default, they are not superhuman.',
      'The trap is relying on motivation, which always runs out. The fix is structure: a fixed plan, a set schedule, reminders, low friction. DAX is that scaffolding, the onramp, the reminders, the "just show up" scoreboard.',
      'Make the gym your keystone habit. Nail that one, prove to yourself you follow through, and that identity spreads to everything else.',
    ] },
  { id: 'ms-motivation', cat: 'mindset', icon: '🎯', title: 'Motivation vs structure',
    teaser: 'Do not wait to feel like it.',
    body: [
      'Motivation is a feeling, and feelings are weather, they come and go and you cannot rely on them. If you only train when you feel like it, you will train rarely. The people who succeed built systems that carry them on the days they feel like nothing.',
      'Lower the bar on bad days instead of skipping. The 15-minute version still counts. Showing up tired and doing a little keeps the chain alive and keeps the identity intact.',
      'Discipline is just showing up when motivation is absent. Build the habit and motivation becomes a bonus, not a requirement.',
    ] },
  { id: 'ms-patience', cat: 'mindset', icon: '⏳', title: 'Patience & newbie gains',
    teaser: 'Fast at first, then trust the long game.',
    body: [
      'Your first year or two back, especially as a beginner-ish lifter, is the "newbie gains" window: you build muscle faster than you ever will again. Use it, be consistent now while the returns are highest.',
      'But visible change still takes months, and it is not linear. Your weight, pump, and how lean you look swing day to day from water, food, and sleep. Judge everything on the 4-week trend, not the daily mirror.',
      'That is why DAX uses a 7-day weight average and monthly photos, to keep the daily noise from messing with your head.',
    ] },
  { id: 'ms-comparison', cat: 'mindset', icon: '📖', title: 'Chapter 1 vs chapter 20',
    teaser: 'Do not compare your start to their middle.',
    body: [
      'The guy who looks unreal has usually been at it for years, often with better genetics for the look, and sometimes with help you cannot see. Comparing your week one to his year ten is a fast way to feel like quitting for no reason.',
      'The only fair comparison is you against your own last month. Are your numbers up? Is the waist tighter, the shoulders wider? That is the scoreboard that matters.',
      'Run your own race. Consistency over years beats intensity over weeks, every single time.',
    ] },
];

/* ---------------- helpers ---------------- */
export const allArticles = () => ARTICLES;
export const articleById = (id) => ARTICLES.find(a => a.id === id) || null;
export const articlesByCat = (catId) => ARTICLES.filter(a => a.cat === catId);
export const categoryById = (id) => CATEGORIES.find(c => c.id === id) || null;

// deterministic daily pick; context-aware to today's training day if given
export function dailyArticle(dow) {
  const epochDay = Math.floor(Date.now() / 86400000);
  const matched = dow ? ARTICLES.filter(a => a.dows && a.dows.includes(dow)) : [];
  const pool = matched.length ? matched : ARTICLES;
  return pool[epochDay % pool.length];
}

/* ---------------- "Got it" learned state ---------------- */
export async function getLearned() {
  return new Set((await db.get('learned', [])) || []);
}
export async function isLearned(id) {
  return (await getLearned()).has(id);
}
export async function toggleLearned(id) {
  const set = await getLearned();
  if (set.has(id)) set.delete(id); else set.add(id);
  await db.set('learned', Array.from(set));
  return set.has(id);
}
export async function learnedCount() {
  return (await getLearned()).size;
}

/* ---------------- the article reader overlay ----------------
   Accessible modal: role=dialog, focus trap-ish (focus close on open,
   Esc closes, focus returns), "Got it" toggle announces state. */
const gotLabel = (on) => `<span aria-hidden="true">${on ? '✓ ' : ''}</span>${on ? 'You’ve got this' : 'Got it — I understand this'}`;
const gotHint = (on) => on ? 'Saved to your Learned shelf. Tap to unmark.' : 'Marks it as learned so you can find it fast later.';

export async function openArticle(id, onClose) {
  const a = articleById(id);
  if (!a) return;
  const cat = categoryById(a.cat);
  const learned = await isLearned(id);
  const returnFocus = document.activeElement;
  // background regions to inert while the modal is open — NOT #sr-status (keeps announce alive)
  const bg = [document.querySelector('.app-header'), document.getElementById('view'), document.getElementById('tabbar')].filter(Boolean);

  const overlay = document.createElement('div');
  overlay.id = 'reader';
  overlay.className = 'reader-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reader-title');
  overlay.innerHTML = `
    <div class="reader-card">
      <div class="reader-head">
        <button class="reader-close" id="reader-close">‹ Back</button>
        <span class="reader-cat">${cat ? `<span aria-hidden="true">${cat.icon}</span> ${cat.label}` : ''}</span>
      </div>
      <div class="reader-body">
        <div class="reader-icon" aria-hidden="true">${a.icon || '📘'}</div>
        <h2 id="reader-title" class="reader-title" tabindex="-1">${a.title}</h2>
        ${a.short ? `
          ${a.short.map(p => `<p class="reader-p">${p}</p>`).join('')}
          <details class="mcq-full">
            <summary>Read the full version</summary>
            ${a.body.map(p => `<p class="reader-p">${p}</p>`).join('')}
          </details>`
          : a.body.map(p => `<p class="reader-p">${p}</p>`).join('')}
        ${a.quiz ? `
          <h3 class="reader-h3">Quick check</h3>
          <fieldset class="mcq">
            <legend class="mcq-q">${a.quiz.q}</legend>
            ${a.quiz.options.map((o, i) => `
              <div class="mcq-opt">
                <input type="radio" name="mcq-${a.id}" id="mcq-${a.id}-${i}" data-correct="${o.correct ? '1' : '0'}" />
                <label for="mcq-${a.id}-${i}">${o.text}</label>
              </div>`).join('')}
          </fieldset>
          <p class="mcq-feedback" role="status" aria-live="polite"></p>` : ''}
        <button class="btn got-it ${learned ? 'on' : ''}" id="got-it" aria-pressed="${learned ? 'true' : 'false'}">${gotLabel(learned)}</button>
        <p class="got-hint">${gotHint(learned)}</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  bg.forEach(el => { el.inert = true; });
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => {
    overlay.classList.remove('show');
    document.removeEventListener('keydown', onKey);
    bg.forEach(el => { el.inert = false; });
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 220);
    // re-render FIRST (it may replace the trigger), THEN place focus, so we never
    // focus a node that's about to be removed and drop focus to <body>.
    if (onClose) onClose();
    const back = (returnFocus && returnFocus.isConnected && returnFocus)
      || document.querySelector(`.learn-row[data-id="${id}"]`)
      || document.querySelector('.tab[data-tab="learn"]');
    if (back && back.focus) back.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  // answer-on-change: show correct/incorrect via the co-located role=status (no color-only)
  overlay.querySelectorAll(`input[name="mcq-${a.id}"]`).forEach(r =>
    r.addEventListener('change', () => {
      const fb = overlay.querySelector('.mcq-feedback');
      if (!fb) return;
      const correct = r.dataset.correct === '1';
      fb.className = 'mcq-feedback ' + (correct ? 'ok' : 'no');
      fb.innerHTML = correct
        ? `<span aria-hidden="true">✓ </span>Correct. ${a.quiz.why || ''}`
        : `<span aria-hidden="true">✗ </span>Not quite, try again.`;
    }));
  overlay.querySelector('#reader-close').addEventListener('click', close);

  const gi = overlay.querySelector('#got-it');
  gi.addEventListener('click', async () => {
    // aria-pressed + the text change are the state signal; VO announces on activation
    const now = await toggleLearned(id);
    gi.setAttribute('aria-pressed', now ? 'true' : 'false');
    gi.classList.toggle('on', now);
    gi.innerHTML = gotLabel(now);
    overlay.querySelector('.got-hint').textContent = gotHint(now);
  });

  // focus the title, not the close button — gives context immediately for a reading surface
  overlay.querySelector('#reader-title').focus();
}
