// Axis voices (k2-voices A): when you pick up a die and choose a job, two axes have their say.
// Each axis has one character: Pace walks the streets, Power is blunt, Fuel runs a kitchen, Rest
// talks slowly, Routine ticks boxes, Shape measures twice. `low` is a die of 1–2, `mid` 3–4,
// `high` 5–6. `{value}` is yesterday's reason for that axis, exactly as the dice tile shows it
// ("16,400 steps", "four and a half hours"). A low day is said honestly and kindly, never scolded.
import type { AxisVoices } from './types';

export const VOICES: AxisVoices = {
  scout: {
    Pace: {
      low: ['Pace: {value}. I\'ll scout the nearest town and come straight back.', 'Pace: short legs today. A scout by tram, not on foot.'],
      mid: ['Pace: {value}. Enough to walk a ground and the streets round it.', 'Pace: a decent day on foot. The scout can do a town and a half.'],
      high: ['Pace: {value}! Send the scout everywhere. I\'ll carry the bags.', 'Pace: {value}. That\'s Lille to Lens in spirit. The fog won\'t know what hit it.'],
    },
    Power: {
      low: ['Power: {value}. I\'ll hold the scout\'s umbrella and that\'s about it.', 'Power: not much push in me. A quiet look, no barging in.'],
      mid: ['Power: {value}. Enough to shoulder through a crowded away end.', 'Power: solid. The scout can stand at the front of the terrace.'],
      high: ['Power: {value}. The scout walks in like they own the place.', 'Power: strong day. Nobody moves our scout off a good seat.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Pack the scout a proper lunch; I can\'t do it from here.', 'Fuel: running light. A short trip, home for dinner.'],
      mid: ['Fuel: {value}. Sandwiches packed, flask filled. Off you go.', 'Fuel: enough in the tank for a full day of terraces.'],
      high: ['Fuel: {value}. The scout eats like a docker and walks like one too.', 'Fuel: full tank. Two matches in a day, and a station sandwich between.'],
    },
    Rest: {
      low: ['Rest: {value}. The scout might nod off at half-time. Sit near the exit.', 'Rest: a thin night. Eyes half-open in the stand, but open.'],
      mid: ['Rest: {value}. Awake enough to notice who does the running nobody claps.', 'Rest: a fair night. Notes will be legible.'],
      high: ['Rest: {value}. Wide awake. The scout will see things the home fans miss.', 'Rest: slept like the fox under the away end. Sharp as anything.'],
    },
    Routine: {
      low: ['Routine: {value}. The scout forgot the notebook. Writing on a ticket again.', 'Routine: a loose day. The report may be one long sentence.'],
      mid: ['Routine: {value}. Report in the usual format: where, who, why.', 'Routine: tidy enough. Every name spelt right, probably.'],
      high: ['Routine: {value}. A report with headings. Marcel will weep.', 'Routine: every box ticked. The scout fills in the margins too.'],
    },
    Shape: {
      low: ['Shape: {value}. No measurements today; we\'ll guess the left-back\'s height.', 'Shape: a vague day. The report says "tallish".'],
      mid: ['Shape: {value}. Close enough to judge a frame and a stride.', 'Shape: steady. The scout measures twice, writes once.'],
      high: ['Shape: {value}. Exact. The report has a ruler drawn in the margin.', 'Shape: sharp. The scout knows every player\'s shirt size by half-time.'],
    },
  },
  study: {
    Pace: {
      low: ['Pace: {value}. I\'ll watch the target\'s highlights. Sitting down.', 'Pace: slow day. One clip at a time.'],
      mid: ['Pace: {value}. Enough to clock how fast they really are.', 'Pace: I\'ll time their sprints against mine.'],
      high: ['Pace: {value}. I know quick when I see it, and I saw it yesterday.', 'Pace: I\'ll follow the target round town if I have to. Politely.'],
    },
    Power: {
      low: ['Power: {value}. I\'ll take their word on the long shots.', 'Power: not much to compare with today. I\'ll trust the tape.'],
      mid: ['Power: {value}. I can tell a strong shot from a lucky one.', 'Power: enough in me to judge a tackle properly.'],
      high: ['Power: {value}. I know a real shot when I hit one. Theirs are real.', 'Power: I\'ll spot whether they win headers or just jump nicely.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Half a study; the other half needs lunch.', 'Fuel: light day. I\'ll read the summary, not the file.'],
      mid: ['Fuel: {value}. Fed enough to read the whole file.', 'Fuel: I\'ll check whether they last ninety or fade at seventy.'],
      high: ['Fuel: {value}. Full. I\'ll read every page and the footnotes.', 'Fuel: a proper day. I can tell an engine from a tourist.'],
    },
    Rest: {
      low: ['Rest: {value}. I might mix up two targets. Check my notes.', 'Rest: tired eyes. One target, slowly.'],
      mid: ['Rest: {value}. Clear enough to spot what the agent left out.', 'Rest: I\'ll notice the bit of tape they didn\'t send.'],
      high: ['Rest: {value}. Wide awake. Nothing hidden stays hidden.', 'Rest: rested and suspicious, in a good way.'],
    },
    Routine: {
      low: ['Routine: {value}. The file is a bit of a pile. I\'ll find what I can.', 'Routine: scattered day. Some notes will be on napkins.'],
      mid: ['Routine: {value}. File sorted, tabs on.', 'Routine: one column for strengths, one for questions. Tidy.'],
      high: ['Routine: {value}. Colour-coded. Leverage, labelled.', 'Routine: every box ticked. We\'ll know them better than their manager.'],
    },
    Shape: {
      low: ['Shape: {value}. Rough measurements. Treat them as rumours.', 'Shape: no tape today. Height "about right".'],
      mid: ['Shape: {value}. Measured, mostly. Good enough for talks.', 'Shape: I\'ll check if the listed height is the real height.'],
      high: ['Shape: {value}. Exact. Every number in their file, checked.', 'Shape: measured twice. Their agent rounded up; I didn\'t.'],
    },
  },
  watch: {
    Pace: {
      low: ['Pace: {value}. I\'ll watch from the sofa. Style, at least.', 'Pace: slow legs, quick eyes, I hope.'],
      mid: ['Pace: {value}. I\'ll see which side they run down.', 'Pace: enough to clock their wingers.'],
      high: ['Pace: {value}. I\'ll know their quickest player by the second clip.', 'Pace: I\'ll be on the touchline in spirit, timing them.'],
    },
    Power: {
      low: ['Power: {value}. I\'ll note who shoots. Not much more.', 'Power: a quiet watch from me.'],
      mid: ['Power: {value}. I\'ll find who wins their headers.', 'Power: enough to spot their bruisers.'],
      high: ['Power: {value}. I\'ll know who they lean on and where it hurts.', 'Power: I\'ll find the weak shoulder in their back line.'],
    },
    Fuel: {
      low: ['Fuel: {value}. I\'ll watch the first half and eat in the second.', 'Fuel: light. I\'ll skim their last match.'],
      mid: ['Fuel: {value}. I can watch the whole ninety.', 'Fuel: I\'ll see when their midfield gets tired.'],
      high: ['Fuel: {value}. I\'ll watch three of their matches back to back.', 'Fuel: full. I\'ll find the minute they always fade.'],
    },
    Rest: {
      low: ['Rest: {value}. I may doze through their set pieces.', 'Rest: tired. I\'ll catch the shape, not the details.'],
      mid: ['Rest: {value}. Awake for the whole tape.', 'Rest: clear enough to see their pattern.'],
      high: ['Rest: {value}. I\'ll notice where their keeper looks before a goal kick.', 'Rest: sharp. Nothing in their tape gets past me.'],
    },
    Routine: {
      low: ['Routine: {value}. Notes in no particular order.', 'Routine: a messy watch, but a watch.'],
      mid: ['Routine: {value}. Style, then weak side, in that order.', 'Routine: one sheet, two headings, done.'],
      high: ['Routine: {value}. A full sheet on the tactics board by noon.', 'Routine: tidy notes, minute by minute.'],
    },
    Shape: {
      low: ['Shape: {value}. I\'ll guess their formation.', 'Shape: blurry lines tonight.'],
      mid: ['Shape: {value}. I can see how they hold their line.', 'Shape: I\'ll note where the gaps open.'],
      high: ['Shape: {value}. I\'ll measure the gap between their centre-backs.', 'Shape: their shape, drawn to scale.'],
    },
  },
  academy: {
    Pace: {
      low: ['Pace: {value}. A slow session: first touch against the wall.', 'Pace: I\'ll stand still and demonstrate. Teaching counts.'],
      mid: ['Pace: {value}. Shuttle runs, with the kids.', 'Pace: enough to keep up with the under-12s. Just.'],
      high: ['Pace: {value}. I\'ll race the under-15s and lose with dignity.', 'Pace: sprints, cones, more sprints. The kids will sleep well.'],
    },
    Power: {
      low: ['Power: {value}. Technique day. No shooting drills.', 'Power: I\'ll hold the cones.'],
      mid: ['Power: {value}. Shooting practice, top corners only.', 'Power: I\'ll show them how to strike through the ball.'],
      high: ['Power: {value}. The kids want to see a screamer. They\'ll get one.', 'Power: I\'ll take free kicks till the net gives up.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Short session, then Kemal\'s soup for everyone.', 'Fuel: I\'ll coach from the bench with a sandwich.'],
      mid: ['Fuel: {value}. A full session, then fruit for the kids.', 'Fuel: enough to run the whole drill twice.'],
      high: ['Fuel: {value}. An hour and a half, and the kids flag first.', 'Fuel: a full tank. Small-sided games until dusk.'],
    },
    Rest: {
      low: ['Rest: {value}. Patient session. I\'ll mostly watch.', 'Rest: a gentle one. Rondos, not sprints.'],
      mid: ['Rest: {value}. Calm enough to explain things twice.', 'Rest: rested enough to listen to the kids properly.'],
      high: ['Rest: {value}. Fresh. I\'ll remember every kid\'s name and their best touch.', 'Rest: slept well. Patience at full stretch.'],
    },
    Routine: {
      low: ['Routine: {value}. We\'ll make up the drills as we go.', 'Routine: no plan, just a ball. Sometimes that\'s the session.'],
      mid: ['Routine: {value}. Warm-up, drill, game, cool-down. Textbook.', 'Routine: the plan is on the clipboard.'],
      high: ['Routine: {value}. A session plan Nadia wants to frame.', 'Routine: every drill timed to the minute.'],
    },
    Shape: {
      low: ['Shape: {value}. Free play. Positions optional.', 'Shape: a loose shape today. The kids won\'t mind.'],
      mid: ['Shape: {value}. We\'ll work on holding a line.', 'Shape: positions drill, cones out.'],
      high: ['Shape: {value}. Positional play, measured in steps.', 'Shape: the kids will keep a shape the first team would envy.'],
    },
  },
  cast: {
    Pace: {
      low: ['Pace: {value}. A sit-down chat today.', 'Pace: let\'s visit someone close to the office.'],
      mid: ['Pace: {value}. A walk-and-talk round the ground.', 'Pace: I\'ll walk them to the tram.'],
      high: ['Pace: {value}. Let\'s walk the whole river with them.', 'Pace: a long walk, a long chat. Best kind.'],
    },
    Power: {
      low: ['Power: {value}. I\'ll carry the conversation, not the boxes.', 'Power: a gentle visit.'],
      mid: ['Power: {value}. I\'ll help shift whatever they\'re shifting.', 'Power: an extra pair of arms in the kit room.'],
      high: ['Power: {value}. I\'ll carry the new dryer in myself.', 'Power: whatever needs lifting, it\'s lifted.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Let\'s eat with them; I\'ll feel better.', 'Fuel: soup and a chat. Kemal\'s orders.'],
      mid: ['Fuel: {value}. Lunch together in the canteen.', 'Fuel: a proper meal, a proper talk.'],
      high: ['Fuel: {value}. We\'ll bring food. Everyone likes the person with the food.', 'Fuel: a full plate and a long lunch.'],
    },
    Rest: {
      low: ['Rest: {value}. A quiet visit. Mostly listening.', 'Rest: I\'ll be good company if nobody asks me anything hard.'],
      mid: ['Rest: {value}. Calm enough for a real conversation.', 'Rest: rested enough to remember what they told us last time.'],
      high: ['Rest: {value}. Wide awake and all ears.', 'Rest: I\'ll hear the thing they almost didn\'t say.'],
    },
    Routine: {
      low: ['Routine: {value}. We\'ll drop in unannounced. Some like that.', 'Routine: no agenda. That\'s allowed.'],
      mid: ['Routine: {value}. On time, which they\'ll notice.', 'Routine: we\'ll remember the thing they asked about.'],
      high: ['Routine: {value}. Early, with notes. Marcel would approve.', 'Routine: every promise from last time, kept.'],
    },
    Shape: {
      low: ['Shape: {value}. Come as you are.', 'Shape: a scruffy visit. They\'ve seen worse.'],
      mid: ['Shape: {value}. Presentable. Shirt ironed, nearly.', 'Shape: tidy enough for a photo.'],
      high: ['Shape: {value}. Sharp. Fons would sign off on the collar.', 'Shape: we look like a manager today.'],
    },
  },
  column: {
    Pace: {
      low: ['Pace: {value}. A short column. Two paragraphs, out the door.', 'Pace: slow prose today.'],
      mid: ['Pace: {value}. A column that moves along nicely.', 'Pace: I\'ll keep the sentences brisk.'],
      high: ['Pace: {value}. A column that sprints. The sub-editor will have to keep up.', 'Pace: punchy. No sentence over twelve words.'],
    },
    Power: {
      low: ['Power: {value}. A polite column. No shots fired.', 'Power: gentle words today.'],
      mid: ['Power: {value}. One firm line in the middle.', 'Power: enough bite for a headline.'],
      high: ['Power: {value}. A column with a right hook.', 'Power: the rival will read this one twice.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Writing on half a breakfast. Keep it light.', 'Fuel: a snack-sized column.'],
      mid: ['Fuel: {value}. A column with a bit of meat on it.', 'Fuel: enough in me for a full page.'],
      high: ['Fuel: {value}. A feast of a column. Three courses and a lemon wedge.', 'Fuel: well fed, well argued.'],
    },
    Rest: {
      low: ['Rest: {value}. Proofread twice; I\'m tired.', 'Rest: a sleepy column. Fewer jokes, more facts.'],
      mid: ['Rest: {value}. Clear head, clear column.', 'Rest: rested enough to be funny on purpose.'],
      high: ['Rest: {value}. The best column we\'ve written. I\'m sure of it.', 'Rest: fresh. The jokes land.'],
    },
    Routine: {
      low: ['Routine: {value}. Filed late. The editor sighs.', 'Routine: no structure, just feeling.'],
      mid: ['Routine: {value}. Filed on time, word count spot on.', 'Routine: intro, point, sign-off.'],
      high: ['Routine: {value}. Filed early with a headline suggestion.', 'Routine: so tidy the paper runs it unedited.'],
    },
    Shape: {
      low: ['Shape: {value}. A shapeless column. Heartfelt, though.', 'Shape: it wanders. Fans like that sometimes.'],
      mid: ['Shape: {value}. A column with a beginning, a middle and an end.', 'Shape: nicely put together.'],
      high: ['Shape: {value}. Every paragraph the same length. Fons approves.', 'Shape: perfectly shaped. The layout people send thanks.'],
    },
  },
  build: {
    Pace: {
      low: ['Pace: {value}. I\'ll fetch one bucket at a time.', 'Pace: slow on site today.'],
      mid: ['Pace: {value}. Back and forth to the skip all morning.', 'Pace: steady trips across the site.'],
      high: ['Pace: {value}. I\'ll run the bricks across the quay myself.', 'Pace: the site foreman can\'t keep up.'],
    },
    Power: {
      low: ['Power: {value}. I\'ll hold the plans; someone else holds the beam.', 'Power: light lifting only.'],
      mid: ['Power: {value}. Bags of cement, two at a time.', 'Power: I\'ll take the heavy end.'],
      high: ['Power: {value}. Give me the steel girder.', 'Power: the crane can have the day off.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Half a shift on half a tank.', 'Fuel: tea break comes early today.'],
      mid: ['Fuel: {value}. A full shift on a proper lunch.', 'Fuel: enough for the morning and the afternoon.'],
      high: ['Fuel: {value}. Overtime, fuelled.', 'Fuel: a full tank. Pour the concrete.'],
    },
    Rest: {
      low: ['Rest: {value}. Careful on the scaffolding.', 'Rest: we\'ll do the easy wall.'],
      mid: ['Rest: {value}. Steady hands, straight lines.', 'Rest: rested enough for the fiddly bits.'],
      high: ['Rest: {value}. Steady as a spirit level.', 'Rest: fresh. Every brick plumb.'],
    },
    Routine: {
      low: ['Routine: {value}. We\'ll work out the plan on site.', 'Routine: tools everywhere, but it gets done.'],
      mid: ['Routine: {value}. The schedule holds.', 'Routine: one job at a time, in order.'],
      high: ['Routine: {value}. Ahead of schedule. Marcel adds a tab.', 'Routine: every task ticked off the board.'],
    },
    Shape: {
      low: ['Shape: {value}. Measure once, cut twice. Oops.', 'Shape: roughly square.'],
      mid: ['Shape: {value}. Measured, cut, fitted.', 'Shape: level enough.'],
      high: ['Shape: {value}. Measured to the millimetre.', 'Shape: every angle exactly ninety.'],
    },
  },
  negotiate: {
    Pace: {
      low: ['Pace: {value}. Let them talk first. We\'re not in a hurry.', 'Pace: slow talks. That can be a tactic.'],
      mid: ['Pace: {value}. Keep it moving; no long silences.', 'Pace: brisk, polite, on to the next round.'],
      high: ['Pace: {value}. Fast talks. Close before they\'ve finished their coffee.', 'Pace: we\'re a step ahead of every reply.'],
    },
    Power: {
      low: ['Power: {value}. A soft opening. Be nice.', 'Power: no table-thumping today.'],
      mid: ['Power: {value}. A firm offer, said once.', 'Power: we hold our number.'],
      high: ['Power: {value}. Lean on them. Politely, but lean.', 'Power: we set the price, not them.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Get it done before lunch.', 'Fuel: short talks; I\'m peckish.'],
      mid: ['Fuel: {value}. Fed enough to sit through three rounds.', 'Fuel: patience on a full stomach.'],
      high: ['Fuel: {value}. We can out-sit anyone.', 'Fuel: we\'ll still be calm when they\'re starving.'],
    },
    Rest: {
      low: ['Rest: {value}. Don\'t agree to anything clever. Keep it simple.', 'Rest: tired. Read every line twice.'],
      mid: ['Rest: {value}. Clear-headed. We\'ll spot the catch.', 'Rest: calm enough to wait them out.'],
      high: ['Rest: {value}. Calm as a lake. They\'ll blink first.', 'Rest: sharp. Every clause understood.'],
    },
    Routine: {
      low: ['Routine: {value}. Wing it. Some of the best deals are winged.', 'Routine: we forgot our notes. Charm instead.'],
      mid: ['Routine: {value}. Notes ready: length, fee, minutes.', 'Routine: the agenda, in order.'],
      high: ['Routine: {value}. Every figure prepared. Dez nods.', 'Routine: we know their last three deals.'],
    },
    Shape: {
      low: ['Shape: {value}. A loose offer. Room to move.', 'Shape: rough terms, to be firmed up.'],
      mid: ['Shape: {value}. A tidy offer.', 'Shape: the deal has a shape.'],
      high: ['Shape: {value}. Terms drawn to scale.', 'Shape: the deal is exactly the shape we wanted.'],
    },
  },
  lobby: {
    Pace: {
      low: ['Pace: {value}. One phone call. Short.', 'Pace: we\'ll lobby the nearest club.'],
      mid: ['Pace: {value}. A visit to their offices.', 'Pace: a round of the corridors.'],
      high: ['Pace: {value}. Every corridor in the federation, by lunch.', 'Pace: we\'ll catch them on the stairs.'],
    },
    Power: {
      low: ['Power: {value}. A soft ask.', 'Power: polite. Very polite.'],
      mid: ['Power: {value}. A firm word in the right ear.', 'Power: enough weight to be heard.'],
      high: ['Power: {value}. We walk in like a club that matters.', 'Power: they\'ll feel the handshake for a week.'],
    },
    Fuel: {
      low: ['Fuel: {value}. We\'ll bring biscuits to make up for it.', 'Fuel: a quick coffee meeting.'],
      mid: ['Fuel: {value}. A working lunch.', 'Fuel: talk over Kemal\'s soup.'],
      high: ['Fuel: {value}. A long lunch. Votes are won over dessert.', 'Fuel: a full table; we\'re hosting.'],
    },
    Rest: {
      low: ['Rest: {value}. Mind what we promise.', 'Rest: tired. Don\'t trade anything away.'],
      mid: ['Rest: {value}. We\'ll read the room.', 'Rest: clear head, careful words.'],
      high: ['Rest: {value}. We\'ll know who\'s wavering before they do.', 'Rest: sharp. Every nod noticed.'],
    },
    Routine: {
      low: ['Routine: {value}. No briefing notes. Improvise.', 'Routine: we\'ll find the motion number on the day.'],
      mid: ['Routine: {value}. Briefing notes on every motion.', 'Routine: we know who votes how.'],
      high: ['Routine: {value}. A seat chart, colour-coded. Marcel helped.', 'Routine: every vote counted twice.'],
    },
    Shape: {
      low: ['Shape: {value}. Our argument has a few holes.', 'Shape: a loose case.'],
      mid: ['Shape: {value}. A tidy case for the motion.', 'Shape: our pitch holds together.'],
      high: ['Shape: {value}. An argument with no gaps.', 'Shape: watertight, measured, persuasive.'],
    },
  },
  course: {
    Pace: {
      low: ['Pace: {value}. Take the questions slowly. Slow is fine.', 'Pace: no timer in my head today.'],
      mid: ['Pace: {value}. A steady clip through the five.', 'Pace: about two minutes a question.'],
      high: ['Pace: {value}. Quick through the easy ones, time for the hard one.', 'Pace: we\'ll finish with time to check.'],
    },
    Power: {
      low: ['Power: {value}. Pick the easy questions first.', 'Power: no brute-forcing today.'],
      mid: ['Power: {value}. We\'ll grind out the arithmetic.', 'Power: enough to push through a long calculation.'],
      high: ['Power: {value}. The hard one\'s mine.', 'Power: we\'ll muscle through the data set.'],
    },
    Fuel: {
      low: ['Fuel: {value}. Eat something before question three.', 'Fuel: half a brain on half a breakfast.'],
      mid: ['Fuel: {value}. Fed enough to focus.', 'Fuel: enough for five questions and a check.'],
      high: ['Fuel: {value}. Full tank, full concentration.', 'Fuel: we could do ten.'],
    },
    Rest: {
      low: ['Rest: {value}. Read each question twice.', 'Rest: tired; watch for the trap answer.'],
      mid: ['Rest: {value}. Clear enough for the reading passage.', 'Rest: focused, mostly.'],
      high: ['Rest: {value}. Sharp. The trick in question four won\'t fool us.', 'Rest: rested. Every word read.'],
    },
    Routine: {
      low: ['Routine: {value}. No method today; trust instinct.', 'Routine: messy working, honest answers.'],
      mid: ['Routine: {value}. Write the working down.', 'Routine: one step at a time.'],
      high: ['Routine: {value}. Working laid out like a textbook.', 'Routine: tidy steps, checked answers.'],
    },
    Shape: {
      low: ['Shape: {value}. Draw the diagram anyway. It helps.', 'Shape: rough sketches only.'],
      mid: ['Shape: {value}. A neat table for the logic puzzle.', 'Shape: the grid will be straight.'],
      high: ['Shape: {value}. Every figure drawn to scale.', 'Shape: the cleanest grid in the course.'],
    },
  },
};
