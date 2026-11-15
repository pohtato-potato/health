// Small shared parts for the pages behind Club's doors (look pass L1, board two and three), on top of the kit.
// Styles live in src/styles/club.css. Each page's rules live behind its "?" (the "how this works" sheets below).
import type { CSSProperties, ReactNode } from 'react';
import type { HowThisWorks } from '../../../ui/kit/Kit';
import { Icon, type IconName } from '../../../ui/Icon';
import '../../../styles/club.css';

export const ink = (c: string, style?: CSSProperties) => ({ ['--ink' as string]: c, ...style }) as CSSProperties;
export const GOLD = '#f2c46d';
export const CORAL = '#ff9a76';
export const GREEN = '#8fdcb6';
export const BLUE = '#93c3dc';
export const LAV = '#c2b2ff';
export const PINK = '#f4aedb';
export const PEARL = '#d9e8f3';
export const CREAM = '#ede6da';

/** A bar that glows in its own ink (board two's "bar10"). */
export function Bar({ pct, c, label }: { pct: number; c: string; label?: string }) {
  const w = Math.max(0, Math.min(100, Math.round(pct)));
  return <span className="kb-bar" style={ink(c)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}><i style={{ width: `${w}%` }} /></span>;
}

/** A small tile: its label, then one number (board two's "Goals 3" tiles). */
export function Stat({ label, value, c, under }: { label: string; value: ReactNode; c: string; under?: ReactNode }) {
  return (
    <div className="k-panel kb-stat" style={ink(c)}>
      <span className="k-q">{label}</span>
      <b className="k-num" style={{ color: c }}>{value}</b>
      {under && <span className="k-q kb-small">{under}</span>}
    </div>
  );
}

/** A label in its ink, with a quiet word on the right (the top line of a filled panel). */
export function PanelTop({ name, right, c }: { name: ReactNode; right?: ReactNode; c: string }) {
  return <div className="k-row kb-top"><b className="k-lb" style={{ color: c }}>{name}</b>{right != null && <span className="k-q k-r">{right}</span>}</div>;
}

/** A row with a drawn mark, a name and a line, and a value on the right (the desk's jobs, the market's clubs). */
export function MarkRow({ icon, c, name, line, right }: { icon: IconName; c: string; name: ReactNode; line?: ReactNode; right?: ReactNode }) {
  return (
    <span className="kb-mrow">
      <Icon name={icon} size={28} color={c} stroke={1.8} />
      <span className="k-col" style={{ flex: 1 }}><b style={{ color: c }}>{name}</b>{line && <span className="k-q">{line}</span>}</span>
      {right != null && <b className="kb-right" style={{ color: c }}>{right}</b>}
    </span>
  );
}

/** A quiet line of words under a block: the drawings' small grey captions. */
export const Note = ({ children }: { children: ReactNode }) => <p className="k-q kb-note">{children}</p>;

/** Filled tabs, as on the team sheet: the one in use bold and underlined. */
export function Tabs<T extends string>({ items, on, onPick }: { items: { id: T; label: string; open: boolean; sub?: string }[]; on: T; onPick: (id: T) => void }) {
  return (
    <div className="kb-tabs" role="group">
      {items.map((x) => x.id === on
        ? <span key={x.id} className="on" aria-current="true">{x.label}</span>
        : x.open
          ? <button key={x.id} type="button" onClick={() => onPick(x.id)}>{x.label}{x.sub ? <small> · {x.sub}</small> : null}</button>
          : <span key={x.id} className="lk">{x.label}{x.sub ? ` · ${x.sub}` : ''}</span>)}
    </div>
  );
}

// ---------- the "how this works" sheets: four short steps, a mark each, the key numbers as chips ----------
export const SHEET_HOW = (chemMax: number): HowThisWorks => ({
  title: 'How the team sheet works',
  steps: [
    { icon: 'sheet', ink: CREAM, head: 'Filled plays tonight', line: 'A filled ring starts; a ringed one waits on the bench. Tap a ring to swap them.' },
    { icon: 'trend', ink: GREEN, head: 'Untouched, the best start', line: 'With no picks of yours, the highest match ratings start. Power picks from your latest session.' },
    { icon: 'link', ink: LAV, head: 'Chemistry grows together', line: 'Each week of match days with the same starters adds 1; two changes take 1 away. At 4 the unit gets +1.' },
    { icon: 'shield', ink: GOLD, head: 'Captains and set pieces', line: 'A unit captain with the armband adds 1 chemistry. Set-piece goals go to the taker when it starts.' },
  ],
  chips: [{ text: '11 start', ink: CREAM }, { text: `chemistry to ${chemMax}`, ink: LAV }, { text: '+1 at 4', ink: GREEN }],
});

export const UNIT_HOW: HowThisWorks = {
  title: 'How a unit works',
  steps: [
    { icon: 'people', ink: GREEN, head: 'Each habit is a player', line: 'Everything you log for this unit signs for it and plays in its part of the pitch.' },
    { icon: 'trend', ink: GOLD, head: 'The number is tonight', line: 'It is tonight’s match rating: the overall, times freshness, plus form.' },
    { icon: 'sheet', ink: CREAM, head: 'The best start', line: 'The highest match ratings start, unless you pick on the team sheet.' },
    { icon: 'stopwatch', ink: CORAL, head: 'Exercises tire', line: 'Back-to-back training days cost 15% freshness; each day off gives 20% back.' },
  ],
  chips: [{ text: '−15% a day', ink: CORAL }, { text: '+20% rested', ink: GREEN }],
};

export const PLAYER_HOW: HowThisWorks = {
  title: 'How a player works',
  steps: [
    { icon: 'pack', ink: GOLD, head: 'The card is the player', line: 'Its frame is the tier and its marks the step. Both stay at the best ever reached.' },
    { icon: 'trend', ink: GREEN, head: 'The number follows your logs', line: 'The overall comes from the last 28 days. Only the number can drop, never the card.' },
    { icon: 'stopwatch', ink: CORAL, head: 'Tonight’s rating', line: 'Match rating is the overall times freshness, plus form.' },
    { icon: 'bolt', ink: LAV, head: 'Limit breaks', line: 'A new best held long enough cracks the card and resets the scale.' },
  ],
  chips: [{ text: 'Silver 60', ink: PEARL }, { text: 'Gold 70', ink: GOLD }, { text: 'Prism 80', ink: LAV }, { text: 'Icon 90', ink: CORAL }],
};

export const MEMBER_HOW: HowThisWorks = {
  title: 'How a squad member works',
  steps: [
    { icon: 'people', ink: GREEN, head: 'Each member is a habit', line: 'Three attack and three defend. You are player-manager, shirt 42.' },
    { icon: 'trend', ink: GOLD, head: 'Rated out of 20', line: 'The real value set against this division’s average. Go up and the same habit rates lower.' },
    { icon: 'calendar', ink: BLUE, head: 'A contract', line: 'Kept on at least 5 days in 7 earns a renewal.' },
    { icon: 'bolt', ink: LAV, head: 'Awakenings', line: 'An axis awakens when its 28-day average first reaches 11, 16 or 18.' },
  ],
  chips: [{ text: 'out of 20', ink: GOLD }, { text: '5 days in 7', ink: BLUE }],
};

export const SQUAD_HOW: HowThisWorks = {
  title: 'How the squad works',
  steps: [
    { icon: 'people', ink: GREEN, head: 'Six units', line: 'Every habit you log plays in one of six units, each in its own colour.' },
    { icon: 'shield', ink: GOLD, head: 'The armband', line: 'Four different captains in four weeks earns Harmony: +1 on every axis for one match.' },
    { icon: 'bolt', ink: LAV, head: 'Ability slots', line: 'Wear up to three abilities. Moments earn more; swap one out to wear a new one.' },
    { icon: 'book', ink: BLUE, head: 'The bench', line: 'Youngsters who log 12 days in a season join it.' },
  ],
  chips: [{ text: '6 units', ink: GREEN }, { text: '3 slots', ink: LAV }, { text: '4 captains', ink: GOLD }],
};

export const TREE_HOW: HowThisWorks = {
  title: 'How the tree works',
  steps: [
    { icon: 'win', ink: GOLD, head: 'Research comes in', line: 'Lesson points from every match (losses teach most), one a day for logging, ten for a board goal, and duplicate cards.' },
    { icon: 'tree', ink: LAV, head: 'Filled is done', line: 'A filled tech is researched. Gold is open to research now. Faint ones need something first.' },
    { icon: 'bolt', ink: '#ffe27a', head: 'Eurekas halve the cost', line: 'Each tech has a moment in a match or your logs that makes it cost half.' },
    { icon: 'ground', ink: CORAL, head: 'Six eras', line: 'An era opens once six techs of the one before are researched. Nothing in the tree is ever lost.' },
  ],
  chips: [{ text: '6 eras', ink: LAV }, { text: '8 techs each', ink: GOLD }, { text: 'Eureka ½ price', ink: '#ffe27a' }],
};

export const PROJECTS_HOW: HowThisWorks = {
  title: 'How projects work',
  steps: [
    { icon: 'tree', ink: LAV, head: 'The tree opens them', line: 'Research a tech and its building or journey starts on the quay.' },
    { icon: 'calendar', ink: GREEN, head: 'Your days build them', line: 'Each one grows on day totals of one habit: steps, sleep, training, protein.' },
    { icon: 'money', ink: GOLD, head: 'Some need money', line: 'A building that costs money waits until the club’s money covers it.' },
    { icon: 'ground', ink: CORAL, head: 'Stage by stage', line: 'Each stage is drawn on the Kaai quarter. None of it is required, nothing is lost.' },
  ],
  chips: [{ text: 'day totals only', ink: GREEN }, { text: 'never the time you logged', ink: BLUE }],
};

export const STAFF_HOW: HowThisWorks = {
  title: 'How staff work',
  steps: [
    { icon: 'tree', ink: LAV, head: 'Hired from the tree', line: 'Each member of staff comes with one tech. No staff limit.' },
    { icon: 'money', ink: GOLD, head: 'Wages at the season’s end', line: 'Wages are paid once a season, from the club’s money.' },
    { icon: 'moon', ink: BLUE, head: 'Leave, never debt', line: 'Anyone the budget can’t cover goes on leave until it can.' },
    { icon: 'pill', ink: GREEN, head: 'The doctor levels up', line: 'Days with every medicine kept raise the club doctor’s level.' },
  ],
  chips: [{ text: 'paid once a season', ink: GOLD }, { text: 'no debt', ink: GREEN }],
};

export const BOARD_HOW: HowThisWorks = {
  title: 'How the board works',
  steps: [
    { icon: 'calendar', ink: BLUE, head: 'Two goals a season', line: 'The board sets them on the season’s first day.' },
    { icon: 'trend', ink: GREEN, head: 'Watch them as you go', line: 'Each goal says whether it is on track.' },
    { icon: 'win', ink: GOLD, head: 'Met: ten research', line: 'Every goal met puts ten research in the bank.' },
    { icon: 'sheet', ink: CORAL, head: 'Missed: a dry note', line: 'Nothing more. The chairman writes either way.' },
  ],
  chips: [{ text: '2 goals', ink: BLUE }, { text: '+10 each', ink: GOLD }],
};

export const DESK_HOW: HowThisWorks = {
  title: 'How the desk works',
  steps: [
    { icon: 'calendar', ink: BLUE, head: 'Dice from yesterday', line: 'Each axis you logged yesterday gives a die. The better the day, the higher it rolls.' },
    { icon: 'desk', ink: GOLD, head: 'Pick up a die, then a job', line: 'A 5 or 6 does a job well. A 1 or 2 does it badly, or with a risk you see first.' },
    { icon: 'clock', ink: GREEN, head: 'Some jobs take days', line: 'A ring around a job is its clock. Each die fills part of it.' },
    { icon: 'moon', ink: LAV, head: 'Shut at night', line: 'After Close the day the desk shuts. Two dice left over make one research.' },
  ],
  chips: [{ text: 'a die an axis', ink: BLUE }, { text: '5–6 does it well', ink: GOLD }, { text: '2 left = 1 research', ink: LAV }],
};

export const MARKET_HOW = (slots: number, days: number, rounds: number): HowThisWorks => ({
  title: 'How the loan market works',
  steps: [
    { icon: 'scope', ink: GREEN, head: 'A scout finds names', line: 'A 6 on a scouting job can bring one back by morning.' },
    { icon: 'tree', ink: LAV, head: 'Study before you bid', line: 'A die narrows his rating and shows what his club wants.' },
    { icon: 'deal', ink: GOLD, head: `${rounds === 3 ? 'Three' : rounds} rounds of talks`, line: 'Each reply shows its odds. A deal uses the market slot.' },
    { icon: 'sheet', ink: CORAL, head: 'He plays for a week', line: 'In his unit, for the lowest starter. Break a promise of minutes and his club cools on you.' },
  ],
  chips: [{ text: `${slots} slot`, ink: GREEN }, { text: `${days} days`, ink: GOLD }, { text: `${rounds} rounds`, ink: CORAL }],
});

export const TALK_HOW = (rounds: number): HowThisWorks => ({
  title: 'How talks work',
  steps: [
    { icon: 'deal', ink: GOLD, head: 'A die a round', line: `Talks run ${rounds} rounds. Each reply takes one die.` },
    { icon: 'trend', ink: BLUE, head: 'The odds are the odds used', line: 'Sure in gold, better than even in blue, long odds in grey.' },
    { icon: 'people', ink: GREEN, head: 'Their mood moves', line: 'A push that misses cools them; walk too far and they leave for a week.' },
    { icon: 'scope', ink: LAV, head: 'Study first', line: 'A studied player shows where his club will give, under the reply it bears on.' },
  ],
  chips: [{ text: `${rounds} rounds`, ink: GOLD }, { text: 'never expire', ink: GREEN }],
});

export const PACKS_HOW: HowThisWorks = {
  title: 'How packs work',
  steps: [
    { icon: 'calendar', ink: GREEN, head: 'Earned, never bought', line: 'Each week you finish, finals won, promotion, the season track and some bounties.' },
    { icon: 'pack', ink: GOLD, head: 'Five things inside', line: 'Album cards, boosts for one match, research, and now and then a loan.' },
    { icon: 'people', ink: CORAL, head: 'Never players', line: 'Your cards are your habits. Packs never hold players of your own.' },
    { icon: 'tree', ink: LAV, head: 'Duplicates become research', line: 'From 1 for Bronze to 10 for Icon and 15 for Legend.' },
  ],
  chips: [{ text: '5 a pack', ink: GOLD }, { text: 'Bronze 1', ink: CORAL }, { text: 'Legend 15', ink: LAV }],
};

export const ALBUM_HOW = (sets: number, cards: number): HowThisWorks => ({
  title: 'How the album works',
  steps: [
    { icon: 'pack', ink: GOLD, head: 'Cards come in packs', line: 'Each album card is a short true story in one of the sets.' },
    { icon: 'book', ink: GREEN, head: 'Each set its own colour', line: 'Tap a set to see its cards. Ones not found yet stay blank.' },
    { icon: 'win', ink: CORAL, head: 'Finish a set, win its prize', line: 'A kit trim, a stadium detail or a museum piece, kept for good.' },
    { icon: 'tree', ink: LAV, head: 'Doubles become research', line: 'A card you already have turns into research for the tree.' },
  ],
  chips: [{ text: `${sets} sets`, ink: GREEN }, { text: `${cards} cards`, ink: GOLD }],
});

export const GROUND_HOW: HowThisWorks = {
  title: 'How the ground works',
  steps: [
    { icon: 'ground', ink: CORAL, head: 'The Kaai grows with you', line: 'Each building finished is added to the picture; each step up the divisions redraws it larger.' },
    { icon: 'calendar', ink: GREEN, head: 'Your days build it', line: 'Each project grows on day totals of one habit: steps, sleep, training, protein.' },
    { icon: 'tree', ink: LAV, head: 'The tree opens buildings', line: 'Research a tech and its building starts on the quay.' },
    { icon: 'clock', ink: BLUE, head: 'Day totals only', line: 'Never the time you logged. None of it is required, and nothing is ever lost.' },
  ],
  chips: [{ text: 'three stages', ink: CORAL }, { text: 'day totals only', ink: GREEN }],
};

export const MONEY_HOW: HowThisWorks = {
  title: 'How money works',
  steps: [
    { icon: 'money', ink: GOLD, head: 'One budget', line: 'Everything the club spends comes from one pot: staff, buildings, loans.' },
    { icon: 'calendar', ink: GREEN, head: 'Income at the season’s end', line: 'TV, the gate, prize money and the sponsors. It grows with promotion.' },
    { icon: 'kit', ink: CORAL, head: 'Sponsors fill slots', line: 'Offers arrive between seasons. One habit clause at a time, at most.' },
    { icon: 'shield', ink: BLUE, head: 'Never betting or alcohol', line: 'No sponsor of either kind, ever. And the club never runs up debt.' },
  ],
  chips: [{ text: '5 slots', ink: CORAL }, { text: '1 clause', ink: GOLD }, { text: 'no debt', ink: GREEN }],
};

export const KITS_HOW: HowThisWorks = {
  title: 'How kits work',
  steps: [
    { icon: 'kit', ink: CORAL, head: 'Launch day', line: 'Between seasons the kit maker brings designs for each slot. Pick one each.' },
    { icon: 'money', ink: GOLD, head: 'The sponsor on the shirt', line: 'Choose how the shirt sponsor sits on the front.' },
    { icon: 'calendar', ink: GREEN, head: 'The kit wall', line: 'Every kit worn, season by season, with its record.' },
    { icon: 'shield', ink: LAV, head: 'The crest grows', line: 'The crest gains a line at each milestone; its history is kept.' },
  ],
  chips: [{ text: 'home · away · third', ink: CORAL }],
};

export const DEALS_HOW: HowThisWorks = {
  title: 'How deals work',
  steps: [
    { icon: 'calendar', ink: BLUE, head: 'Four-week contracts', line: 'Each habit signs for four weeks at a time.' },
    { icon: 'check', ink: GREEN, head: 'Five days in seven', line: 'Kept on at least 5 days in 7 earns a renewal: the axis gets 5% heavier, up to 15%.' },
    { icon: 'deal', ink: LAV, head: 'Missed, it is listed', line: 'It costs nothing in matches. A club bids; sell it or keep it.' },
    { icon: 'book', ink: GOLD, head: 'Youngsters', line: 'Tie each to a new habit. Twelve sessions and twelve growth and they join the squad.' },
  ],
  chips: [{ text: '4 weeks', ink: BLUE }, { text: '5 in 7', ink: GREEN }, { text: '+5% a renewal', ink: GOLD }],
};

export const LOANS_HOW: HowThisWorks = {
  title: 'How loans work',
  steps: [
    { icon: 'pack', ink: GOLD, head: 'They come from packs', line: 'A loan in a pack waits for a free slot, in the order you opened them.' },
    { icon: 'calendar', ink: GREEN, head: 'A week or so in a unit', line: 'On days you log that unit’s habit, they take the lowest starter’s place, who rests.' },
    { icon: 'book', ink: LAV, head: 'Mentors', line: 'While a loan is here, that unit’s youngsters grow half as fast again.' },
    { icon: 'people', ink: CORAL, head: 'Real footballers', line: 'For this club only: no badges, nothing said beyond how they play. Icons are retired greats.' },
  ],
  chips: [{ text: 'from packs', ink: GOLD }, { text: 'mentor ×1.5', ink: LAV }],
};

export const TRIALS_HOW: HowThisWorks = {
  title: 'How trials work',
  steps: [
    { icon: 'moon', ink: BLUE, head: 'Your sleep sends them', line: 'Early, regular sleep draws steady defenders. Long nights draw prospects. Short but rested nights draw quick wingers.' },
    { icon: 'calendar', ink: GREEN, head: 'Sunday mornings', line: 'Trial days bring new faces, drawn by the week’s sleep.' },
    { icon: 'link', ink: GOLD, head: 'Tie one to a habit', line: 'A youngster stands for something new: a habit you haven’t been logging.' },
    { icon: 'clock', ink: CORAL, head: 'They wait a few days', line: 'Then they go home, no harm done.' },
  ],
  chips: [{ text: 'Sundays', ink: GREEN }, { text: 'no penalty', ink: CORAL }],
};

export const ACADEMY_HOW: HowThisWorks = {
  title: 'How the academy works',
  steps: [
    { icon: 'link', ink: GOLD, head: 'Tied to a habit', line: 'Only youngsters tied to a real habit take a place. A day of that habit is a session.' },
    { icon: 'moon', ink: BLUE, head: 'They grow overnight', line: 'On nights you keep your bedtime. Rest days double it. Growth pauses, never goes back.' },
    { icon: 'deal', ink: LAV, head: 'A loan mentors them', line: 'A loan in the same unit makes them grow half as fast again.' },
    { icon: 'people', ink: GREEN, head: 'Then the squad', line: 'Both bars full, sessions and growth, and they join the squad.' },
  ],
  chips: [{ text: 'rest days ×2', ink: BLUE }, { text: 'never goes back', ink: GREEN }],
};

export const DUTY_HOW = (days: number, needs: number, attr: number): HowThisWorks => ({
  title: 'How international duty works',
  steps: [
    { icon: 'calendar', ink: BLUE, head: 'Two breaks a season', line: `${days} days each, with no league games.` },
    { icon: 'map', ink: '#ff7d9c', head: 'Called up for a nation', line: 'A name that carries a nation plays for it. Everyone else was given one at random, for good.' },
    { icon: 'check', ink: GREEN, head: 'Log their habit', line: `On ${needs} of the ${days} days and they come home better.` },
    { icon: 'bolt', ink: GOLD, head: 'A trait or +' + attr, line: `They bring back a trait, or +${attr} to an attribute.` },
  ],
  chips: [{ text: `${days} days`, ink: BLUE }, { text: `${needs} of ${days}`, ink: GREEN }, { text: `+${attr}`, ink: GOLD }],
});

export const TECH_HOW: HowThisWorks = {
  title: 'How a tech works',
  steps: [
    { icon: 'win', ink: GOLD, head: 'Pay its cost in research', line: 'Research it now if the bank covers it, or save for it and it is done by itself.' },
    { icon: 'bolt', ink: '#ffe27a', head: 'A eureka halves it', line: 'When its moment happens in a match or your logs, it costs half.' },
    { icon: 'link', ink: LAV, head: 'Some need others first', line: 'The techs it needs are listed. Its era opens after six of the era before.' },
    { icon: 'ground', ink: CORAL, head: 'Kept for good', line: 'Nothing in the tree is ever lost.' },
  ],
};

export const BOON_HOW: HowThisWorks = {
  title: 'How boons work',
  steps: [
    { icon: 'calendar', ink: GREEN, head: 'Three a season', line: 'A boon pick opens at points through the season.' },
    { icon: 'pack', ink: GOLD, head: 'Pick one', line: 'Each pick offers a few boons; the one you take lasts the season.' },
    { icon: 'tree', ink: LAV, head: 'The tree adds choices', line: 'Some techs add a choice to every pick.' },
    { icon: 'clock', ink: BLUE, head: 'Back next season', line: 'The others come round again.' },
  ],
};
