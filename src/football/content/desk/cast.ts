// The cast (spec §7, f-cast A, k-bonds A): today's four staff plus three new faces. A surprise for
// the owner: the owner meets each one in the app, not here. Ten ranks each, a scene at every rank
// and a small lasting perk at some. A low opinion only cools the tone (`cool` lines); nothing here
// costs points, shames or scolds. Written with no gendered pronouns.
import type { CastMember } from './types';

export const CAST: CastMember[] = [
  {
    id: 'chairman',
    name: 'Marcel Goossens',
    role: 'Chairman',
    existing: true,
    who: 'Thirty-one years planning cranes at the port, then retired into a football club by accident: Marcel signed the rent cheque the first week because nobody else had a pen. Writes notes with headings. Keeps the accounts in a ring binder with coloured tabs and calls the binder "the constitution".',
    modelledOn: 'A port logistics planner turned club chairman; a little of the stubborn members\' boards of Athletic Club and Union Berlin, minus the money.',
    cares: { metrics: ['closed', 'logged'], text: 'A day closed properly. Marcel likes a ledger that balances by midnight.' },
    greet: {
      warm: [
        'Marcel slides a chair out with a foot. "Item one: sit. Item two: coffee. Item three is you."',
        '"The constitution says the manager may enter without knocking." Marcel taps the binder. "I added that on Tuesday."',
        'Marcel has a new tab in the binder. It is green. It says your name.',
      ],
      cool: [
        'Marcel looks up from the binder. "Ah. Yes. Sit, sit." The heading on the page is "Misc."',
        '"Manager." A polite nod, a pen uncapped. "Shall we keep it brief? I have rent."',
      ],
    },
    parcel: {
      warm: [
        'A note from Marcel, with headings. Heading one: "Well done." Heading two is also "Well done".',
        'Marcel has filed yesterday under "Good days". The tab is getting thick.',
        'From the chairman: the books balanced last night, and Marcel underlined the total out of pure joy.',
      ],
      cool: [
        'From the chairman: "Accounts received. Noted." No headings today.',
        'A short note from Marcel, folded once instead of twice.',
      ],
    },
    asks: [
      { text: 'Marcel would like five closed days this week, "for the audit". There is no audit. Marcel just likes the word.', trigger: { what: 'closed', count: 5, withinDays: 7, text: 'Close the day 5 times in 7 days' }, thanks: '"Audit passed." Marcel stamps the binder with a stamp bought specially.' },
      { text: '"Every day logged for ten days, and I will stop asking how things are going. I will simply know."', trigger: { what: 'logged', count: 10, withinDays: 10, text: 'Log something 10 days running' }, thanks: 'Marcel stops asking how things are going, and starts telling you instead. It is somehow worse, and lovely.' },
    ],
    ranks: [
      { rank: 1, title: 'The rent cheque', scene: 'Marcel shows you the first rent cheque to Zurenborg, photocopied and laminated. "We are tenants," Marcel says, "but we are punctual tenants."' },
      { rank: 2, title: 'Minutes of the meeting', scene: 'You discover Marcel takes minutes of your chats. Item four from Thursday reads: "Manager laughed at the kit room door. Door to be fixed or kept as a joke (vote pending)."' },
      { rank: 3, title: 'The crane story', scene: 'Marcel tells you about the night a crane stuck over a ship for nine hours and the whole port waited. "Nobody panicked. We made a list." Marcel hands you the list. It is from 1997.', perk: { key: 'research-close', value: 1, text: 'A day closed with every checklist slot ticked brings 1 research. Marcel files it.' } },
      { rank: 4, title: 'A second chair', scene: 'There is a second chair in Marcel\'s office now, the good one. Marcel sits in the bad one and claims it is better for the back.' },
      { rank: 5, title: 'The Zurenborg letter', scene: 'Zurenborg Athletic send a letter about the kit room. Marcel reads it aloud in four different voices, then replies with a letter that is mostly headings and one word: "Noted."' },
      { rank: 6, title: 'The binder\'s new section', scene: 'Marcel adds a section to the constitution called "Ambitions". It has one page so far. At the top: "A ground of our own." Below that, in pencil: "a museum?"', perk: { key: 'clock-head-start', value: 1, job: 'build', text: 'Every new building project starts with 1 segment filled.' } },
      { rank: 7, title: 'The port at dawn', scene: 'Marcel drives you to the old terminal before sunrise to watch the cranes start. "Everything here is late, then suddenly early," Marcel says. "Like a promoted club."' },
      { rank: 8, title: 'The vote', scene: 'Before the congress Marcel rehearses Brabo\'s speech to an empty boardroom, pausing for applause that does not come. "They will clap at the real one. Probably."', perk: { key: 'lobby-risk', value: 5, text: 'Lobbying before the congress carries 5 points less risk of annoying another club.' } },
      { rank: 9, title: 'The old photo', scene: 'Marcel finds a photo of the founding week: four people, one ball, a borrowed bib. "We have nine bibs now," Marcel says, very quietly, as if it might jinx it.' },
      { rank: 10, title: 'The constitution, amended', scene: 'Marcel hands you the binder. A new first page, typed: "Article 1. The manager is right more often than the chairman. Article 2. See article 1." It is signed and laminated.', perk: { key: 'unspent-research', value: 1, text: 'Unspent dice turn into research one die sooner, never past the day\'s cap.' } },
    ],
  },
  {
    id: 'physio',
    name: 'Ines Wouters',
    role: 'Physio',
    existing: true,
    who: 'Ines came from a hospital rehab ward and still talks like one: calm, exact, faintly amused. Asks "does that hurt" and writes down the answer you meant, not the one you said, then underlines it twice. Keeps a bowl of clementines on the treatment table for no stated reason.',
    modelledOn: 'A calm hospital rehab physio; a touch of the deadpan club physios who become the dressing room\'s quiet power.',
    cares: { metrics: ['rest-day', 'rested', 'checklist-full'], text: 'Rest days kept as rest, nights rated rested, and a full checklist. Ines trusts the boring days.' },
    greet: {
      warm: [
        'Ines pushes the clementine bowl across. "Take one. That\'s not medical advice. It\'s just a clementine."',
        '"Sit. You walk in like a person who slept." Ines writes something down and, unusually, does not underline it.',
        'Ines is taping a ball to a chair "to see if it holds". It holds. Ines looks pleased with the tape, not the ball.',
      ],
      cool: [
        'Ines nods at the chair. "Hello. How are we." It is not quite a question.',
        'Ines finishes a note before looking up. "Right. What can I do for you?"',
      ],
    },
    parcel: {
      warm: [
        'From Ines: "Rest day kept. Underlined twice." There are three lines under it.',
        'A clementine on the parcel, and a note from Ines: "For the boring days, which are the good ones."',
        'Ines\'s note: "Checklist full. The treatment table is lonely. Keep it that way."',
      ],
      cool: [
        'A note from Ines: "Treatment room open nine to five." Just the hours.',
        'From the physio: "All fine here." No clementine.',
      ],
    },
    asks: [
      { text: '"Two rest days this week, kept as rest. I will know if you sneak a session. I always know."', trigger: { what: 'rest-day', count: 2, withinDays: 7, text: 'Keep 2 planned rest days as rest in 7 days' }, thanks: 'Ines writes "rested" on the board and underlines it three times, which is a record.' },
      { text: '"Five nights rated rested in the next week. I\'d like to see the number, not hear about it."', trigger: { what: 'rested', count: 5, withinDays: 7, text: 'Rate 5 nights rested (4 or 5) in 7 days' }, thanks: '"Five." Ines nods once, which from Ines is a standing ovation.' },
    ],
    ranks: [
      { rank: 1, title: 'The clementine policy', scene: 'You ask about the clementines. Ines explains there is no policy. Then hands you a laminated card titled "Clementine policy", which is blank.' },
      { rank: 2, title: 'The double underline', scene: 'Ines shows you the notebook. Every entry is underlined twice. "Once is for the player. Twice is for me, so I remember I was right."' },
      { rank: 3, title: 'The ramp', scene: 'Ines draws the return ramp on a whiteboard: a gentle slope, a flat bit, a little flag at the top. "Nobody skips the flat bit. The flat bit is where the healing lives."', perk: { key: 'return-ramp-days', value: 1, text: 'The return ramp after a sick or injured stretch is a day shorter.' } },
      { rank: 4, title: 'Kit man\'s back', scene: 'Fons the kit man limps in with a "slightly stiff" back from carrying the dryer. Ines fixes it in four minutes and charges a story about the 1980s as the fee. Fons pays in full.' },
      { rank: 5, title: 'The quiet room', scene: 'Ines has turned a store cupboard into "the quiet room": a mat, a lamp, a sign that says "not a nap room". It is a nap room.' },
      { rank: 6, title: 'Notes from the ward', scene: 'Ines tells you about a patient who relearned walking by counting floor tiles. "Twenty tiles a day, then twenty-one. Big things are just small things that kept turning up."', perk: { key: 'rest-day-dice', value: 1, text: 'On a planned rest day kept as rest, the Rest die counts one higher (up to 6).' } },
      { rank: 7, title: 'The tape gun', scene: 'Ines buys a professional tape gun and tapes the entire squad\'s ankles in under ten minutes, then tapes the tape gun to the shelf "so nobody borrows it".' },
      { rank: 8, title: 'Physio\'s bag', scene: 'Ines packs a bag for away days with everything in labelled pockets, including one pocket labelled "for the thing I haven\'t thought of". It has a clementine in it.', perk: { key: 'heirloom', value: 1, item: 'tape-gun', text: 'Ines\'s tape gun joins the cup pool as an heirloom: once a run, a knocked player plays on at full fitness.' } },
      { rank: 9, title: 'A day off', scene: 'Ines takes a day off for the first time all season and texts the club four times to ask if anyone needs anything. Nobody does. Ines is visibly, quietly proud.' },
      { rank: 10, title: 'Underlined three times', scene: 'Ines shows you the last page of this season\'s notebook. One line, about you: "Looks after the boring days." Three underlines, and the pen went through the paper.', perk: { key: 'parcel-extra', value: 1, text: 'Ines adds a line to the parcel on mornings after a rested night.' } },
    ],
  },
  {
    id: 'academy',
    name: 'Nadia El Amrani',
    role: 'Head of the academy',
    existing: true,
    who: 'Nadia ran a futsal club in a car park in Borgerhout for twelve years and can tell a footballer from the way a kid stops a ball against a wall. Talks fast, remembers every kid\'s birthday, and has strong views about shoes.',
    modelledOn: 'The street-futsal coaches of Antwerp and Brussels; a little of Ajax\'s and La Masia\'s patient youth coaches.',
    cares: { metrics: ['youth', 'training'], text: 'Sessions logged for the academy\'s habits, and training finished. Nadia believes in reps.' },
    greet: {
      warm: [
        '"Manager! Quick, sit, I need to show you a first touch." Nadia already has the video up.',
        'Nadia is wearing the wrong shoes, on purpose. "Solidarity," Nadia says. "One of the kids forgot theirs."',
        '"You came at a good time. Under-15s just nutmegged the under-17s. Twice. I may never recover."',
      ],
      cool: [
        '"Manager. Hi." Nadia keeps one eye on the pitch. "Busy morning; go on."',
        'Nadia nods you in. The video stays paused on a kid tying a lace.',
      ],
    },
    parcel: {
      warm: [
        'From Nadia: a thirty-second clip of a fourteen-year-old doing something unreasonable with the outside of a boot.',
        'Nadia\'s note: "Session logged. The kids noticed. They notice everything. Especially shoes."',
        'Nadia writes: "Rep, rep, rep. Yesterday was a rep. Good."',
      ],
      cool: [
        'A note from the academy: "Training tonight, six o\'clock."',
        'From Nadia: "All kids accounted for." Short and kind.',
      ],
    },
    asks: [
      { text: '"Six academy sessions in a fortnight. The kids are copying you, so give them something good to copy."', trigger: { what: 'youth', count: 6, withinDays: 14, text: 'Log 6 sessions for academy-linked habits in 14 days' }, thanks: 'Nadia sends a photo of the under-12s copying your warm-up, badly and joyfully.' },
      { text: '"Three training sessions this week. I\'ve told the kids you will. Don\'t make me a liar."', trigger: { what: 'training', count: 3, withinDays: 7, text: 'Finish 3 training sessions in 7 days' }, thanks: '"Not a liar." Nadia high-fives you with unnecessary force.' },
    ],
    ranks: [
      { rank: 1, title: 'The wall', scene: 'Nadia takes you to a brick wall behind the stand with a chalk square on it. "Every kid starts here. A hundred passes against the wall. You too." You do eleven.' },
      { rank: 2, title: 'Birthdays', scene: 'Nadia has a calendar of every kid\'s birthday and a drawer of cheap footballs to give out. "Nobody forgets the person who gave them a ball."' },
      { rank: 3, title: 'The wrong shoes', scene: 'A trialist turns up in school shoes and scores twice. Nadia buys boots that afternoon out of the petty cash and argues with Marcel about it, cheerfully, for a week.' },
      { rank: 4, title: 'Car park futsal', scene: 'Nadia shows you the car park in Borgerhout where it started: faded lines, one goal with no net. Three kids are playing. Nadia knows all three by name.' },
      { rank: 5, title: 'Sunday and Wednesday', scene: 'Nadia wants a second trial day. "Sunday is for kids whose parents drive. Wednesday is for the ones who take the tram." Marcel adds a tab to the binder.', perk: { key: 'trials-extra-day', value: 1, text: 'A second trial day each week, on Wednesdays.' } },
      { rank: 6, title: 'The first touch file', scene: 'Nadia keeps a hard drive of every youngster\'s first touch from day one to now. Played in order, a kid\'s ball stops bouncing a little more each week.' },
      { rank: 7, title: 'An old pupil', scene: 'A former car-park kid now playing in Division Three sends Nadia a signed shirt. Nadia pretends not to cry and blames the floodlights.', perk: { key: 'academy-growth', value: 1, text: 'An academy session on a 5 or 6 grows the youngster one more.' } },
      { rank: 8, title: 'The parents\' evening', scene: 'You sit in on a parents\' evening. Nadia tells every parent one specific good thing their kid did that week, and one thing to work on. Nobody leaves without a smile.' },
      { rank: 9, title: 'Nadia plays', scene: 'Short a player for the staff match, Nadia plays. Nadia is the best player on the pitch by a distance, and apologises to everyone after.' },
      { rank: 10, title: 'Your name on the wall', scene: 'Under the chalk square, Nadia has painted a list of everyone who did a hundred passes. Your name is at the bottom, with a date and "(eventually)".', perk: { key: 'clock-head-start', value: 1, job: 'scout', text: 'Every new scouting clock starts with 1 segment filled: Nadia\'s old pupils send tips.' } },
    ],
  },
  {
    id: 'kitman',
    name: 'Fons Verbist',
    role: 'Kit man',
    existing: true,
    who: 'Fons has washed shirts for four Antwerp clubs since the 1980s and calls every one of them "the shirts", as if they were one set of shirts across forty years. Dries kit on radiators like toast. Sews with a needle older than the club, weighs everything that comes into the kit room, and keeps the numbers in pencil.',
    modelledOn: 'The long-serving kit men every old club has; the type who outlast five managers and know where every key is.',
    cares: { metrics: ['weigh-in', 'waist'], text: 'Body logs kept up. Fons weighs and measures everything in the kit room and trusts a number written down.' },
    greet: {
      warm: [
        'Fons hands you a mug from the drying rack. It is warm from the radiator. So is the coffee, somehow.',
        '"Manager. Shirts are dry, boots are dry, the floor is dry. A dry day." Fons says it like a toast.',
        'Fons is threading the old needle on the third try. "Two tries is luck. Three is skill."',
      ],
      cool: [
        '"Manager." Fons keeps folding. "Shirts are on the hooks if you need them."',
        'Fons nods from behind a pile of socks, sorting by size, then by smell.',
      ],
    },
    parcel: {
      warm: [
        'Fons has left the scale\'s pencil reading on your desk with a tick beside it. Just a tick.',
        'From the kit room: "Logged and dried." Fons writes everything like a laundry tag.',
        'A neatly folded note from Fons: "Measured twice, written once."',
      ],
      cool: [
        'From the kit room: "Kit ready."',
        'Fons\'s tag on the parcel says "Brabo, first team". It always does.',
      ],
    },
    asks: [
      { text: '"Three weigh-ins this week. The kit room scale gets lonely, and I\'d like to know my own is right."', trigger: { what: 'weigh-in', count: 3, withinDays: 7, text: 'Log 3 weigh-ins in 7 days' }, thanks: 'Fons pencils three ticks on the kit room wall, beside forty years of other ticks.' },
      { text: '"A tape measurement this fortnight, standing, the proper way. I\'ll lend you my tape. It\'s from 1987."', trigger: { what: 'waist', count: 1, withinDays: 14, text: 'Log one standing waist measurement in 14 days' }, thanks: '"Same way every time," Fons says. "That\'s the whole trick." Fons puts the tape back in its tin.' },
    ],
    ranks: [
      { rank: 1, title: 'The radiators', scene: 'Fons shows you the radiator rota: three changing rooms, nine radiators, shirts turned every ten minutes. "Toast," Fons says. "Same principle."' },
      { rank: 2, title: 'The pencil numbers', scene: 'Every number in the kit room is in pencil: shirt sizes, boot sizes, the weight of a wet towel. "Ink is for people who think nothing changes."' },
      { rank: 3, title: 'The needle', scene: 'Fons lets you hold the old needle. It is heavier than a needle should be. "Sewed a captain\'s armband in 1991. Sewed a split shirt at half-time in 2003. It doesn\'t miss."', perk: { key: 'heirloom', value: 1, item: 'tape-1987', text: 'Fons\'s 1987 tape joins the cup pool as an heirloom: your first card each match costs 1 less if your squad is at full fitness.' } },
      { rank: 4, title: 'Four clubs', scene: 'Fons lists the four clubs worked for, in order, and the one shirt kept from each. The fourth slot is empty. "Waiting to see," Fons says, and looks at you.' },
      { rank: 5, title: 'The lost-property box', scene: 'You go through forty years of lost property: a shin pad from a cup final, a whistle, a single blue glove. Fons knows whose every item was.', perk: { key: 'kit-pick', value: 1, text: 'One more kit or crest choice in the kit maker.' } },
      { rank: 6, title: 'The dryer funeral', scene: 'The old dryer finally dies. Fons holds a short ceremony with the squad and a hairdryer, then orders a new one and names it after the old one.' },
      { rank: 7, title: 'Measuring the manager', scene: 'Fons measures you for a training top "properly, the old way", writes it in pencil, then makes you stand again to check. "Same way every time. That\'s the whole trick."' },
      { rank: 8, title: 'The away bag', scene: 'Fons packs the away hamper in a set order learned in 1986. You help. Fons repacks it silently after you leave, then thanks you sincerely the next day.' },
      { rank: 9, title: 'The fourth shirt', scene: 'Fons asks for one Brabo shirt, signed by nobody, washed once. It goes in the fourth slot, ironed flat.' },
      { rank: 10, title: 'The wall of ticks', scene: 'Fons shows you the kit room wall: forty years of pencil ticks, one for every weigh-in of every team. The newest column is yours. It is long.', perk: { key: 'parcel-extra', value: 1, text: 'Fons adds a line to the parcel on mornings after a weigh-in.' } },
    ],
  },
  {
    id: 'scout',
    name: 'Dez Bannister',
    role: 'Head scout',
    existing: false,
    who: 'Dez grew up in Hull, scouted for a dozen English clubs from the back of a hired car, and once found a title-winning midfielder playing in a French second division while working night shifts. Walks everywhere, counts nothing, remembers everything. Writes reports on the backs of train tickets.',
    modelledOn: 'The scouts behind Leicester City\'s 2016 title (Steve Walsh\'s finds) and Monchi\'s Sevilla network; an English northern walker\'s patience.',
    cares: { metrics: ['steps', 'big-day', 'long-walk'], text: 'Steps, big walking days and long walks. Dez believes you see more on foot.' },
    greet: {
      warm: [
        'Dez drops a pile of train tickets on the desk, every one covered in tiny writing. "Read the backs. The fronts are just Ghent."',
        '"You walked yesterday. I can tell." Dez taps a shoe. "You stand like someone who\'s seen a few streets."',
        'Dez is eating a sandwich from a station in Lille. "Best sandwich in Europe. Don\'t tell Kemal."',
      ],
      cool: [
        '"Gaffer." Dez flicks through a notebook. "Where do you want me looking?"',
        'Dez nods, coat still on. "Quick one, I\'ve a train."',
      ],
    },
    parcel: {
      warm: [
        'A train ticket in the parcel. On the back, in Dez\'s writing: "Yesterday\'s walking? That\'s scouting distance."',
        'From Dez: "Walked a town yesterday too. Found a left-back and a decent chip shop. Same thing, really."',
        'Dez writes: "Long day on foot? Good. The best players are always one more street away."',
      ],
      cool: [
        'A ticket from Dez: "Back Thursday."',
        'From the scout: "Report to follow."',
      ],
    },
    asks: [
      { text: '"One big walking day this week. Eighteen thousand, the way I used to do Lille to Lens. It clears the head."', trigger: { what: 'big-day', count: 1, withinDays: 7, text: 'Have one day of 18,000+ steps in 7 days' }, thanks: 'Dez sends a ticket: "Lille to Lens, on foot, in spirit."' },
      { text: '"Five days at the step goal this week. I can\'t scout a world from a chair and nor can you."', trigger: { what: 'steps', count: 5, withinDays: 7, text: 'Reach the step goal 5 days in 7' }, thanks: '"Now you\'re scouting," Dez says, and gives you a notebook of your own.' },
    ],
    ranks: [
      { rank: 1, title: 'The backs of tickets', scene: 'Dez shows you how a report works: front of the ticket, where; back of the ticket, who. "If it doesn\'t fit on the back of a ticket, it\'s not a footballer, it\'s an essay."' },
      { rank: 2, title: 'The night shift', scene: 'Dez tells you about a midfielder found working nights in a warehouse, who ran the whole match "like it was the first hour of a shift". Dez won\'t say who. Everyone knows.' },
      { rank: 3, title: 'Walking a town', scene: 'Dez walks you round a town before a match: the ground, the bakery, the park where kids play. "You learn a club from its streets. The pitch only tells you the last bit."', perk: { key: 'scout-known', value: 5, text: 'Every scout report adds 5 more known %.' } },
      { rank: 4, title: 'The wrong train', scene: 'Dez takes the wrong train on purpose to watch a Division Five match in the rain. Comes back soaked with one name underlined: a goalkeeper who shouts encouragement at the opposition.' },
      { rank: 5, title: 'The Hull story', scene: 'Dez talks about growing up near the Humber, watching Hull from the away end because it was cheaper. "Scrappy clubs are honest. You see everything."' },
      { rank: 6, title: 'A scout\'s eye', scene: 'Dez teaches you to watch one player for a whole half and ignore the ball. You last fourteen minutes. Dez says that is a club record for a manager.', perk: { key: 'watch-both', value: 1, text: 'Watching tonight\'s opponent shows style and weak side on any die.' } },
      { rank: 7, title: 'The sandwich map', scene: 'Dez has a map of Europe marked only with station sandwiches, rated out of ten. Lille is a ten. Dez will not discuss Brussels-Midi.' },
      { rank: 8, title: 'The deal', scene: 'Dez sits in on a loan talk and says nothing for forty minutes, then one sentence that saves the club a season\'s fee. On the way out: "Let them talk. Everyone gives away the number in the end."', perk: { key: 'negotiate-reroll', value: 1, text: 'Once a talk, one round\'s reply can be taken back.' } },
      { rank: 9, title: 'The notebook', scene: 'Dez gives you a notebook from the first year of scouting. Half the names went nowhere. Three went everywhere. "That\'s the job: be wrong cheerfully, often, and on foot."' },
      { rank: 10, title: 'The last ticket', scene: 'Dez hands you a ticket with Brabo United written on the back, and under it a single line: "Saw something. Stayed." It is dated the day Dez joined.', perk: { key: 'clock-head-start', value: 1, job: 'study', text: 'Every new loan-target study starts with 1 segment filled.' } },
    ],
  },
  {
    id: 'cook',
    name: 'Kemal Aydın',
    role: 'Canteen',
    existing: false,
    who: 'Kemal ran a grill by the docks for twenty years and now runs the club canteen with the same rules: big plates, proper protein, nothing reheated twice. Keeps a whiteboard of the squad\'s meals and draws a little flame next to anyone who ate three proper ones.',
    modelledOn: 'The family-run grill houses of Antwerp\'s port district; club cooks who become the heart of a training ground.',
    cares: { metrics: ['protein', 'three-meals', 'kcal'], text: 'Protein at its target, three meals logged and a day inside the calorie range. Kemal wants full plates, never empty ones.' },
    greet: {
      warm: [
        'Kemal puts a plate in front of you before you sit: lentil soup, bread, a lemon wedge. "Talk after. Eat first."',
        '"The board has a flame by your name." Kemal points with a ladle. "Three meals. I saw."',
        'Kemal is arguing with a supplier on the phone about eggs. Kemal wins.',
      ],
      cool: [
        '"Manager. There\'s soup." Kemal keeps chopping.',
        'Kemal waves you to a table and goes back to the grill.',
      ],
    },
    parcel: {
      warm: [
        'From the canteen: a flame drawn on the whiteboard by your name, photographed, sent with a thumbs-up.',
        'Kemal\'s note: "Protein hit. The eggs supplier will be pleased. I will tell them."',
        'From Kemal: "Three meals logged. A proper day. Come for soup."',
      ],
      cool: [
        'From the canteen: "Lunch at one."',
        'A note from Kemal: "Menu on the board."',
      ],
    },
    asks: [
      { text: '"Five days at your protein target this week. I will make the lentils. You do the rest."', trigger: { what: 'protein', count: 5, withinDays: 7, text: 'Reach the protein target 5 days in 7' }, thanks: 'Kemal draws five flames by your name and adds a sixth "for courage".' },
      { text: '"Three proper meals a day, logged, for four days. Breakfast too. Breakfast especially."', trigger: { what: 'three-meals', count: 4, withinDays: 7, text: 'Log breakfast, lunch and dinner on 4 days in 7' }, thanks: '"Breakfast!" Kemal announces it to the whole canteen. Some players applaud without knowing why.' },
    ],
    ranks: [
      { rank: 1, title: 'The board', scene: 'Kemal explains the whiteboard: names down the side, meals across the top, flames for three proper ones. "Not a competition," Kemal says. It is clearly a competition.' },
      { rank: 2, title: 'Nothing twice', scene: 'Kemal throws away a tray of rice reheated once already. "Twice reheated is a crime. Once is a compromise. Fresh is football."' },
      { rank: 3, title: 'The grill by the docks', scene: 'Kemal shows you a photo of the old grill: a counter, a flag of smoke, a queue of dockers at 6 am. "Same people now," Kemal says, nodding at the squad. "Same appetite."', perk: { key: 'meal-card', value: 1, text: 'Kemal\'s lentil soup joins the cup pool as a card.' } },
      { rank: 4, title: 'The egg war', scene: 'The egg supplier sends small eggs. Kemal sends them back with a ruler. Large eggs arrive the next day with an apology note, which Kemal pins to the board.' },
      { rank: 5, title: 'Breakfast club', scene: 'Kemal opens the canteen at seven for breakfast. Three players come the first day. Eleven by Friday. Kemal pretends not to count.' },
      { rank: 6, title: 'The lemon wedge', scene: 'You ask why every plate gets a lemon wedge. Kemal considers it for a long time. "Because a plate without one looks unfinished." That is the whole answer.', perk: { key: 'research-close', value: 1, text: 'A day at the protein target with three meals logged brings 1 research at Close the day.' } },
      { rank: 7, title: 'Kemal\'s mother\'s recipe', scene: 'Kemal makes a stew from a handwritten card, stained and soft at the corners, and won\'t let anyone else read it. "Some tactics are private."' },
      { rank: 8, title: 'The away food', scene: 'Kemal packs the team coach with containers labelled by player and by hour. The opposition\'s kit man asks for the recipe. Kemal says no, then sends one container anyway.' },
      { rank: 9, title: 'Fifty flames', scene: 'Your name passes fifty flames on the board. Kemal draws a bigger flame and a small crown, then rubs the crown out because it seemed too much.' },
      { rank: 10, title: 'A seat at the grill', scene: 'Kemal lets you cook for once, under supervision. Your eggs are fine. Kemal says they are "very fine", which is the highest grade Kemal has ever given anyone.', perk: { key: 'parcel-extra', value: 1, text: 'Kemal adds a line to the parcel on mornings after a three-meal day.' } },
    ],
  },
  {
    id: 'watchman',
    name: 'Gust Lambrechts',
    role: 'Night watchman',
    existing: false,
    who: 'Gust locks Stadion aan de Stroom at night and hosts a two-hour show on Radio Stroom, a community station broadcast from the old ticket office. Plays whole albums in order and talks between them about floodlights, foxes and the river. Feeds the fox that lives under the away end.',
    modelledOn: 'Late-night radio hosts in the John Peel tradition; the night watchmen and groundsmen who know a stadium after dark.',
    cares: { metrics: ['bedtime', 'sleep'], text: 'Bedtime kept and a full night. Gust keeps the night so you don\'t have to.' },
    greet: {
      warm: [
        'Gust lowers the volume on Frank Ocean\'s Blonde, but only a bit. "Come in. This is the good side."',
        '"The fox came out at eleven. Sat on the centre spot like it owned it." Gust pours you tea. "Maybe it does."',
        'Gust has the floodlight switches labelled with album names. Floodlight three is "Modern Vampires of the City".',
      ],
      cool: [
        '"Evening." Gust nods, headphones half on. "Gate\'s open."',
        'Gust looks up from the logbook. "All quiet. What can I do?"',
      ],
    },
    parcel: {
      warm: [
        'From Gust: "Locked up early. You did too, by the look of it. Good night\'s work, both of us."',
        'Gust\'s log: "23:40 fox. 00:10 lights out. 00:12 manager asleep, probably." Next to it, a tick.',
        'Last night on Radio Stroom, Gust played Carrie & Lowell all the way through and dedicated it to "everyone who went to bed on time".',
      ],
      cool: [
        'Night log from the ground: "All quiet."',
        'From Gust: "Gates locked, lights off."',
      ],
    },
    asks: [
      { text: '"Four nights with bedtime kept this week. I\'ll play an album for each one. You won\'t hear them. That\'s the point."', trigger: { what: 'bedtime', count: 4, withinDays: 7, text: 'Keep bedtime 4 nights in 7' }, thanks: 'Gust reads out the four albums on air: Swimming, Flower Boy, Motomami and The Forever Story. "For the manager, asleep."' },
      { text: '"Three full nights this week. The fox manages it. The fox has no job and no phone, but still."', trigger: { what: 'sleep', count: 3, withinDays: 7, text: 'Reach the sleep target 3 nights in 7' }, thanks: '"Fox and manager, both rested." Gust writes it in the night log like a weather report.' },
    ],
    ranks: [
      { rank: 1, title: 'Radio Stroom', scene: 'Gust shows you the station: a desk in the old ticket office, two turntables, a microphone wrapped in a sock "for warmth of tone". Forty-one listeners, Gust says. Forty-two tonight.' },
      { rank: 2, title: 'The fox', scene: 'You meet the fox. It looks at you, looks at Gust, and takes the bread from Gust only. "It\'s not personal," Gust says. "It\'s seniority."' },
      { rank: 3, title: 'Albums in order', scene: 'Gust explains the one rule of the show: whole albums, in order, no skipping. "Somebody chose that order. You don\'t walk into a match at the 60th minute and say you saw it."', perk: { key: 'rest-day-dice', value: 1, text: 'After a night with bedtime kept, the Rest die counts one higher (up to 6) on a planned rest day.' } },
      { rank: 4, title: 'The floodlight test', scene: 'Once a month Gust tests the floodlights at 2 am, one tower at a time. From the river, the ground blinks like it\'s thinking.' },
      { rank: 5, title: 'Requests', scene: 'You request a song on Radio Stroom. Gust plays the whole album it is on, all fifty minutes, and says afterwards: "Your song was track seven. Was it worth the wait?" It was.' },
      { rank: 6, title: 'The night log', scene: 'Gust shows you thirty years of night logs from other grounds: foxes, burst pipes, a swan on a penalty spot in 2009. The handwriting never changes.', perk: { key: 'unspent-research', value: 1, text: 'Unspent dice turn into research one die sooner, never past the day\'s cap.' } },
      { rank: 7, title: 'The ground at night', scene: 'Gust walks you round the empty stands with a torch. "A ground at night remembers the noise," Gust says. "You can hear it if you stop talking." You stop talking. You can.' },
      { rank: 8, title: 'The quickly, quickly hour', scene: 'Gust does a whole show of quiet, jazzy records for "people trying to fall asleep and people pretending not to". Kemal admits to listening. So does Marcel.', perk: { key: 'parcel-extra', value: 1, text: 'Gust adds a line to the parcel on mornings after bedtime was kept.' } },
      { rank: 9, title: 'The fox\'s name', scene: 'Gust finally tells you the fox\'s name. It is Brabo. "It came with the club," Gust says. "Or the club came with it. Hard to tell."' },
      { rank: 10, title: 'Sign-off', scene: 'Gust lets you sign off the show. You say good night to forty-two listeners and the fox. Gust writes in the log: "00:00. Manager on air. Then asleep. Good."', perk: { key: 'heirloom', value: 1, item: 'radio-scarf', text: 'Gust\'s Radio Stroom scarf joins the cup pool as an heirloom: Rest cards cost 1 less in the last match of a run.' } },
    ],
  },
];

export const castById = (id: string) => CAST.find((c) => c.id === id);
