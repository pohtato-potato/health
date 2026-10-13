import type { VoiceId } from './types';

export interface VoiceDef {
  id: VoiceId;
  name: string;
  color: string;
  about: string;
  hello: string;
}

export const VOICES: VoiceDef[] = [
  { id: 'zen', name: 'Zen', color: 'var(--pearl)', about: 'Calm and brief. For quiet days.', hello: 'Welcome. We begin gently.' },
  { id: 'coach', name: 'Coach', color: 'var(--apricot)', about: 'Loud, warm, dramatic. Thinks you are a legend.', hello: "LET'S GO! Big things start today!" },
  { id: 'comm', name: 'Commentator', color: 'var(--sage)', about: 'Cricket commentary with filmi flair.', hello: 'And we are LIVE! What a day for it!' },
  { id: 'gremlin', name: 'Gremlin', color: 'var(--lavender)', about: 'A sarcastic AI. Pretends to be unimpressed. Fails.', hello: 'Excellent choice. I was hoping it would be me.' },
];

export type Moment =
  | 'morning'
  | 'session'
  | 'rest'
  | 'perfect'
  | 'shortNight'
  | 'stepsClose'
  | 'proteinClosed'
  | 'freeMeal'
  | 'weightUp'
  | 'trained'
  | 'evening'
  | 'day'
  | 'record'
  | 'streak'
  | 'milestone'
  | 'achievement'
  | 'postcard'
  | 'win'
  | 'night';

type Lines = Record<VoiceId, string[]>;

/**
 * Lines in each voice. Placeholders: {session}, {steps}, {laps}, {sleep}, {protein}.
 * The jokes are about the app, the equipment and the situation, never your body or your food.
 */
const LINES: Record<Moment, Lines> = {
  morning: {
    zen: ['Good morning. The scale first, then the day.', 'A new day. Log the morning, then let it unfold.'],
    coach: ['MORNING LOG FIRST! Ten seconds, then you conquer the day!', 'Rise and log, legend! The day is waiting for you!'],
    comm: ['Toss done, pitch report pending: the morning log opens the innings!', 'Good morning and welcome to the ground! First ball: the morning log.'],
    gremlin: ['The morning log awaits. It takes about eleven seconds. I have timed you. I time everything.', 'Good morning. I have prepared the scale. It has prepared nothing.'],
  },
  session: {
    zen: ['{session} tonight. Start slow, finish strong.', '{session} is waiting. Arrive, breathe, lift.'],
    coach: ['{session} TONIGHT! You were built for this. Well, you are building for this.', '{session} is ON! Warm up, lock in, leave nothing on the mat!'],
    comm: ['{session} on the fixtures list tonight, and the crowd is already in!', 'Big match tonight, {session}! The dumbbells are padded up and ready!'],
    gremlin: ['{session} awaits. So does your protein. I am told they are both very patient.', '{session} tonight. The dumbbells have been informed. They are nervous.'],
  },
  rest: {
    zen: ['Rest day. This is when the muscle actually gets built.', 'Nothing to lift today. Walk, eat well, sleep early.'],
    coach: ['REST DAY. Yes, it is in the plan. No, one quick set is not resting. Sit down, legend.', 'Recovery is training too! Put your feet up, champion!'],
    comm: ['Rain stops play! The covers are on and the batter has strict orders to stay off the pitch.', 'Rest day at the ground. The groundsman is rolling the pitch for the next match.'],
    gremlin: ['It is a rest day. I have hidden the dumbbells. Metaphorically. For now.', 'Rest day. Resist the urge to do one quick set. I can see you thinking about it.'],
  },
  perfect: {
    zen: ['All three rings closed. A perfect day.', 'A perfect day. Let it land.'],
    coach: ['PERFECT DAY! Three for three! If I had arms I would be doing push-ups in your honour!', 'THREE RINGS! THREE! Somebody frame this day!'],
    comm: ['Kya baat hai! Three rings, three closes, a perfect day! I am running out of superlatives!', 'That is a perfect day! The stands are on their feet and the umpire is applauding too!'],
    gremlin: ['Perfect day. I checked the data three times looking for an error. There is not one. Disgusting. Well done.', 'All three rings. I have run out of sarcasm and will need a moment to restock.'],
  },
  shortNight: {
    zen: ['{sleep} of sleep. Go gently today, and to bed early tonight.', 'A short night. Eat protein early, and keep it simple.'],
    coach: ['Short night, champ. Today we play smart: protein early, snacks ready, bed by midnight. Deal?', 'Only {sleep}? We adapt! Smart choices all day, early night tonight!'],
    comm: ['Tricky conditions after just {sleep}! Expect some swing around 4 pm. Leave the biscuits outside off stump.', 'Only {sleep} in the pavilion last night. A day for careful batting.'],
    gremlin: ['{sleep} of sleep. Bold strategy. Your 4 pm self is going to want biscuits, and they are very persuasive.', '{sleep}. I would lecture you, but you are clearly too tired to listen.'],
  },
  stepsClose: {
    zen: ['{steps} steps to go. About {laps} laps of your loop.', '{steps} steps left. A short walk closes the ring.'],
    coach: ['{steps} STEPS. That is {laps} laps. Up you get. I will wait. I am extremely good at waiting.', 'SO CLOSE! {steps} steps! Go go go!'],
    comm: ['{steps} needed, {laps} laps left, and the crowd is on its feet! Can it be done? Of course it can!', 'Final over, {steps} to win! The whole ground is holding its breath!'],
    gremlin: ['You are {steps} steps from your goal. You have walked further than that looking for your charger today.', '{steps} steps. That is {laps} laps. I have already calculated your excuses and found them wanting.'],
  },
  proteinClosed: {
    zen: ['Protein closed at {protein}. Well fuelled.', '{protein} of protein. Your muscles have what they need.'],
    coach: ['{protein} OF PROTEIN! Your muscles just got the memo, and the memo says GROW!', 'Protein ring CLOSED! {protein}! That is how it is done!'],
    comm: ['That is the century, and the innings is not over! {protein} of protein!', 'Protein ring closed at {protein}! A classy innings, all along the ground!'],
    gremlin: ['{protein} of protein. I have logged it, filed it, and privately admitted I am impressed.', 'Protein closed. The muscles have been fed. They say thank you. They do not say it often.'],
  },
  freeMeal: {
    zen: ['Free meal logged. It is part of the plan. Tomorrow is an ordinary day.', 'Enjoy it fully. That is the point.'],
    coach: ['FREE MEAL, EARNED! Enjoy every bite. Back to business tomorrow.', 'You earned this one! Enjoy it, legend!'],
    comm: ['Pawri ho rahi hai! A free meal, fully within the rules, and the third umpire has no objections!', 'Free hit! Fully within the laws of the game!'],
    gremlin: ['Free meal logged. I have filed it under strategic. The paperwork was delicious, I assume.', 'A planned free meal. How organised. I am almost proud.'],
  },
  weightUp: {
    zen: ['Up a little overnight. Water and salt, most likely. Your trend has not moved.', 'The scale moves daily. The trend is what matters.'],
    coach: ['The scale went up? The scale did not see your sets yesterday. Trend is steady. Head up, we move!', 'One number, one morning. The TREND is the boss. Keep going!'],
    comm: ['A nasty bouncer from the scale this morning! But look at that trend line: solid as Dravid. Not out!', 'The scale appeals, but the trend line says not out!'],
    gremlin: ['The scale went up and would like you to panic. I have reviewed the trend. The scale is lying for attention.', 'The scale is being dramatic again. The trend line is unbothered, and so am I.'],
  },
  trained: {
    zen: ['Session done. Eat well and sleep early; that is where it pays off.', 'Good work tonight. Let it settle.'],
    coach: ['SESSION DONE! Now feed those muscles and get to bed, champion!', 'That is how you train! Protein, water, sleep. GO!'],
    comm: ['Stumps drawn on a cracking session! Now for the post-match interview: protein.', 'What a performance! The crowd files out happy tonight!'],
    gremlin: ['Session complete. The dumbbells have asked for a rest. I told them no, but it was your call.', 'You trained. I noted it. The spreadsheet noted it. We are all very proud, in a detached way.'],
  },
  evening: {
    zen: ['Evening. A quiet walk, a good dinner, an early night.', 'The day is nearly done. Finish it well.'],
    coach: ['Evening push! Close those rings, legend!', 'Still time to make this a great day! Let us GO!'],
    comm: ['Into the final session of the day, and everything is still to play for!', 'Evening at the ground, lights on, and the match is wide open!'],
    gremlin: ['Evening. The rings are watching. They are very patient, and slightly judgemental.', 'The day is ending. Your rings have questions.'],
  },
  record: {
    zen: ['A new record. Quietly excellent.', 'Stronger than last time. That is the whole game.'],
    coach: ['NEW RECORD! Screenshot it! Frame it! Tell your mother!', 'RECORD! That is what the work looks like when it pays!'],
    comm: ['And that is a new record, sent all the way to the boundary! What a player!', 'Out of the ground! A new personal best, and the crowd goes wild!'],
    gremlin: ['New record. I have updated the spreadsheet, notified the dumbbells and privately admitted I am impressed.', 'A record. I was going to be sarcastic, but the numbers are in and they are rude to me.'],
  },
  streak: {
    zen: ['Consistency is the whole secret. You found it.', 'Week after week. This is how change happens.'],
    coach: ['CONSISTENCY! This is what champions are made of!', 'Look at that streak! You are UNSTOPPABLE!'],
    comm: ['Another milestone in a glorious innings, and the scoreboard keeps ticking!', 'What a partnership between you and the plan! Still not out!'],
    gremlin: ['Consistency this good should be illegal. I checked. It is not.', 'I set a reminder to be surprised. It keeps going off.'],
  },
  milestone: {
    zen: ['A milestone. Pause here a moment.', 'The trend line brought you here, one ordinary day at a time.'],
    coach: ['MILESTONE! Months of work, right there in one number!', 'LOOK WHERE YOU ARE NOW! Incredible!'],
    comm: ['A landmark moment! They will be talking about this one for seasons to come!', 'History made at the crease! Picture abhi baaki hai!'],
    gremlin: ['A milestone. I would like to formally apologise to your belt.', 'The tape measure reports a lot less work lately. It is thrilled.'],
  },
  achievement: {
    zen: ['Earned, not given.', 'Another page in the story.'],
    coach: ['ACHIEVEMENT UNLOCKED! Wear it with pride!', 'THAT is how you do it!'],
    comm: ['A special moment, and it goes straight into the record books!', 'Kya baat hai! Another honour for the cabinet!'],
    gremlin: ['Achievement unlocked. I had a bet with the dumbbells. I lost.', 'Achievement unlocked. I had money on you. Metaphorically.'],
  },
  postcard: {
    zen: ['A new city on the map.', 'Another stop reached, step by step.'],
    coach: ['NEW CITY! Your legs did that!', 'Another city conquered! Keep walking, legend!'],
    comm: ['And the tour reaches a new venue! The crowd here has been waiting!', 'Welcome to a new city, and what a reception!'],
    gremlin: ['Arrived. Without leaving home. I remain confused and impressed.', 'A new city. The locals have been told to expect someone slightly sweaty.'],
  },
  night: {
    zen: ['Everything important is done. The rest can wait for daylight.', 'The day is done. Let it be done.'],
    coach: ['Big day, legend. Now the most important rep of all: SLEEP.', 'Lights out, champion. Recovery starts now!'],
    comm: ['Stumps drawn for the day. Early start tomorrow, so it is lights out in the pavilion.', 'That is the close of play. The groundsman is covering the pitch.'],
    gremlin: ['It is late. The data will still be here tomorrow. So will I, unfortunately for you.', 'Go to sleep. I will guard the numbers. Nobody touches the numbers.'],
  },
  win: {
    zen: ['A win, kept safe.', 'Noted. Small wins add up.'],
    coach: ['INTO THE JAR! Every win counts!', 'That is a WIN! Remember it!'],
    comm: ['Straight into the trophy cabinet!', 'A small win today, a big story later!'],
    gremlin: ['Filed in the jar. The jar is getting heavy. That is your fault.', 'Win recorded. I will bring it up when you least expect it.'],
  },
  day: {
    zen: ['One thing at a time. Log it and let it go.', 'Steady days make the change.'],
    coach: ['Every day counts! Make this one count!', 'Another day, another chance to be brilliant!'],
    comm: ['A fine day for it! The pitch is flat and the outfield is quick!', 'Middle overs now: time to build the innings!'],
    gremlin: ['I am monitoring the situation. The situation is fine. Mostly.', 'Another day. I have prepared some numbers for you to improve.'],
  },
};

export interface VoiceVars {
  session?: string;
  steps?: string;
  laps?: string;
  sleep?: string;
  protein?: string;
}

/** With shuffle on, a different voice each morning, the same all day. */
/** v2 keeps one voice: the Gremlin. The stored choice and shuffle are kept for old backups only. */
export function voiceFor(_voice: VoiceId, _shuffle: boolean, _seed: string): VoiceId {
  return 'gremlin';
}

/** A line for the moment, the same all day, different tomorrow. */
export function voiceLine(voice: VoiceId, moment: Moment, seed: string, vars: VoiceVars = {}): string {
  const options = LINES[moment][voice];
  const line = options[hash(seed + moment) % options.length];
  return line.replace(/\{(\w+)\}/g, (_, k: keyof VoiceVars) => vars[k] ?? '');
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** When a joint is flagged, every voice switches to plain speech. */
export function plainFlagLine(what: string, change?: string): string {
  return change ? `${what} flagged. ${change}` : `${what} flagged. Take it easy, and see a physio if it keeps up.`;
}
