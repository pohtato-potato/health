import type { RouteDef } from '../types';

/**
 * Pheidippides, Athens to Sparta, 490 BC: Herodotus's runner sent for help before Marathon, walked along the
 * Spartathlon course, 246 km. The record is one passage of Herodotus; the marathon legend came later and is told as such.
 */
export const sparta: RouteDef = {
  id: 'sparta',
  name: 'Pheidippides: Athens to Sparta',
  era: '490 BC',
  hook: 'One of the first long-distance runners known by name, sent to beg Sparta for help before Marathon.',
  group: 'world',
  km: 246,
  record: 'estimated',
  region: 'greece',
  ink: '#9fb8e0',
  places: [
    { name: 'Athens', km: 0, at: 0, label: true },
    { name: 'Elefsina', km: 22, at: 2 },
    { name: 'Megara', km: 45, at: 3 },
    { name: 'The Corinth canal', km: 80, at: 5 },
    { name: 'Ancient Corinth', km: 93, at: 6, label: true },
    { name: 'Nemea', km: 123, at: 7 },
    { name: 'Lyrkeia', km: 148, at: 8 },
    { name: 'Mount Parthenion', km: 161, at: 9, label: true },
    { name: 'Nestani', km: 172, at: 10 },
    { name: 'Tegea', km: 195, at: 11 },
    { name: 'Sparta', km: 246, at: 13, label: true },
  ],
  signature: {
    title: 'The runner’s road',
    note: 'The towns on the modern race course, which follows the ancient road as nearly as today’s roads allow.',
    mark: 'stage',
    marks: [
      { km: 22, name: 'Elefsina' },
      { km: 45, name: 'Megara' },
      { km: 80, name: 'The Corinth canal' },
      { km: 93, name: 'Ancient Corinth' },
      { km: 123, name: 'Nemea' },
      { km: 148, name: 'Lyrkeia' },
      { km: 161, name: 'Over Mount Parthenion' },
      { km: 195, name: 'Tegea' },
      { km: 246, name: 'Sparta' },
    ],
  },
  then: { who: 'Pheidippides', totalDays: 2, places: [{ name: 'Sparta', theirDay: 2 }], source: 'Herodotus says he reached Sparta on the day after he left Athens.' },
  pages: [
    {
      km: 0,
      title: 'Athens, 490 BC',
      line: 'A Persian army has landed at Marathon, and Athens sends a runner.',
      page: [
        'In late summer 490 BC a Persian fleet landed an army at Marathon, about 40 km from Athens. Before marching out to meet it, the Athenian generals sent to Sparta, the strongest army in Greece, for help.',
        'Their messenger, says the historian Herodotus, was Pheidippides, a professional long-distance runner. Some copies of Herodotus call him Philippides.',
      ],
      deeper: {
        title: 'Athens and Sparta',
        text: 'The two cities were opposites. Athens had become a democracy less than twenty years before, where every male citizen could vote in the assembly; it had a fleet, trade and a restless public life. Sparta was ruled by two kings and a council of elders, and its citizens were full-time soldiers, trained from the age of seven. Their farms were worked by the helots, a subject people held in something close to slavery and kept down by force. Women in Sparta owned land and had more freedom than in Athens. Neither was a democracy as we would mean it: in both, slaves and women had no vote. Within sixty years of Marathon the two would be at war with each other.',
      },
    },
    {
      km: 22,
      title: 'Eleusis',
      line: 'West along the Sacred Way to Eleusis.',
      page: ['The road west out of Athens followed the Sacred Way to Eleusis, now Elefsina, home of the Eleusinian Mysteries, rites so secret that no surviving account tells what happened in them.'],
    },
    {
      km: 45,
      title: 'Megara',
      line: 'Along the coast through Megara.',
      page: ['Beyond Megara the old road ran along cliffs above the sea, the Skironian rocks, where Greek legend placed a bandit who kicked travellers into the water.'],
    },
    {
      km: 80,
      title: 'The Isthmus',
      line: 'Across the Isthmus into the Peloponnese.',
      page: ['The narrow Isthmus of Corinth joins the Peloponnese to the rest of Greece. The canal you cross was cut only in 1881–93; in ancient times ships were dragged across on a paved trackway, the diolkos.'],
    },
    {
      km: 93,
      title: 'Corinth',
      line: 'Corinth, rich city of the Isthmus.',
      page: ['Corinth grew rich on the trade passing across the Isthmus between two seas. In 490 BC it was an ally of Sparta, and a runner on official business would have passed through without trouble.'],
    },
    {
      km: 123,
      title: 'Nemea',
      line: 'Nemea, where the games were held.',
      page: ['Nemea held one of the four great athletic festivals of Greece, with a running track whose stone starting line still survives. A modern revival of the games has been run here since 1996, barefoot and in tunics.'],
    },
    {
      km: 148,
      title: 'Into the hills',
      line: 'Up into the hills of the Argolid, through the night.',
      page: ['Here the road climbs towards Arcadia, the mountainous heart of the Peloponnese. Runners in the modern race reach this stretch in the dark.'],
    },
    {
      km: 161,
      title: 'Mount Parthenion',
      line: 'On Mount Parthenion, Herodotus says, the runner heard a voice.',
      page: [
        'Herodotus says that on Mount Parthenion, above Tegea, Pheidippides met the god Pan, who asked why the Athenians paid him no honour though he had often helped them. The Athenians, Herodotus says, believed the runner and built Pan a shrine after the war.',
        'He is careful to say this is what Pheidippides told them. Whatever happened on the mountain, it suggests what two days without sleep can do.',
      ],
    },
    {
      km: 195,
      title: 'Tegea',
      line: 'Down onto the plain at Tegea, and south towards Sparta.',
      page: ['Tegea was one of the largest cities of Arcadia. Sparta had fought it for generations before forcing it into alliance. From here the road ran south down the valley towards Laconia.'],
    },
    {
      km: 246,
      title: 'Sparta',
      line: 'At Sparta, the answer: not until the full moon.',
      page: [
        'Herodotus says Pheidippides reached Sparta on the day after he left Athens. The Spartans were willing to help, but said their law forbade them to march before the moon was full; they were keeping a festival, probably the Carneia.',
        'Their army set out after the full moon and arrived too late, after the battle. The Athenians, with the small city of Plataea, had beaten the Persians at Marathon without them.',
      ],
      deeper: {
        title: 'How one passage became the marathon',
        text: 'Herodotus, writing about fifty years after the battle, says nothing of anyone running from Marathon to Athens. That story first appears in writers of the Roman era, over five hundred years later: Plutarch names the runner Thersippus or Eucles, and Lucian has Philippides gasp out the victory and die. In 1879 the poet Robert Browning joined the two runs into one hero, and in 1896 the first modern Olympics, in Athens, staged a race from Marathon to the city. In 1982 five British air force officers tested Herodotus by running Athens to Sparta; three made it in under 40 hours. The Spartathlon, the race on this road, began the next year.',
      },
    },
  ],
  chronicle: [
    { when: 'Late summer 490 BC', place: 'Marathon', text: 'The Persian army lands.' },
    { when: 'Days later', place: 'Athens to Sparta', text: 'Pheidippides runs for help.' },
    { when: '490 BC', place: 'Marathon', text: 'Athens and Plataea win the battle.' },
    { when: 'About 430 BC', place: 'Athens', text: 'Herodotus’s history is known.' },
    { when: '1896', place: 'Athens', text: 'The first Olympic marathon.' },
    { when: '1982', place: 'Athens to Sparta', text: 'British officers test Herodotus.' },
    { when: '1983', place: 'Athens to Sparta', text: 'The first Spartathlon.' },
  ],
  sources: [
    { title: 'Herodotus, Histories 6.105–106 (Perseus)', url: 'https://www.perseus.tufts.edu/hopper/text?doc=Hdt.+6.105' },
    { title: 'Wikipedia: Pheidippides', url: 'https://en.wikipedia.org/wiki/Pheidippides' },
    { title: 'Wikipedia: Spartathlon', url: 'https://en.wikipedia.org/wiki/Spartathlon' },
    { title: 'Wikipedia: Battle of Marathon', url: 'https://en.wikipedia.org/wiki/Battle_of_Marathon' },
    { title: 'Spartathlon, the official race site', url: 'https://www.spartathlon.gr/' },
  ],
  ready: true,
};
