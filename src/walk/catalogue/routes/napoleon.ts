import type { RouteDef } from '../types';

/**
 * Napoleon's retreat from Moscow, 19 October to 14 December 1812: south to Maloyaroslavets, back up the Old Smolensk
 * road, over the Berezina and on to the Neman at Kovno, about 1,100 km. Dated at its battles and crossings; troop
 * numbers are disputed and given as ranges.
 */
const KM = 1100;
const DAYS = 57;

export const napoleon: RouteDef = {
  id: 'napoleon',
  name: 'The retreat from Moscow',
  era: '1812',
  hook: 'Perhaps the largest army Europe had seen marches out of a burned city into the Russian winter.',
  group: 'world',
  km: KM,
  record: 'dated',
  region: 'russia',
  ink: '#a8b8d0',
  places: [
    { name: 'Moscow', km: 0, at: 0, label: true },
    { name: 'Maloyaroslavets', km: 120, at: 2 },
    { name: 'Borovsk', km: 144, at: 3 },
    { name: 'Vereya', km: 170, at: 4 },
    { name: 'Mozhaysk', km: 193, at: 5 },
    { name: 'Borodino', km: 207, at: 6 },
    { name: 'Gzhatsk', km: 264, at: 7 },
    { name: 'Vyazma', km: 327, at: 8 },
    { name: 'Dorogobuzh', km: 407, at: 9 },
    { name: 'Smolensk', km: 495, at: 10, label: true },
    { name: 'Krasny', km: 546, at: 11 },
    { name: 'Orsha', km: 617, at: 12 },
    { name: 'Borisov', km: 757, at: 13 },
    { name: 'Studianka', km: 773, at: 14, label: true },
    { name: 'Molodechno', km: 880, at: 15 },
    { name: 'Smorgon', km: 918, at: 16 },
    { name: 'Vilnius', km: 1000, at: 17, label: true },
    { name: 'Kaunas', km: KM, at: 18, label: true },
  ],
  signature: {
    title: 'Days of the retreat',
    note: 'Fifty-seven days from Moscow to the Neman. Each mark is one of them; they come further apart as the army shrank and the cold deepened.',
    mark: 'crystal',
    marks: Array.from({ length: DAYS }, (_, i) => ({ km: Math.round(((i + 1) * KM) / DAYS), name: `Day ${i + 1}` })),
  },
  then: {
    who: 'The Grande Armée',
    totalDays: DAYS,
    places: [{ name: 'Maloyaroslavets', theirDay: 6 }, { name: 'Vyazma', theirDay: 16 }, { name: 'Smolensk', theirDay: 22 }, { name: 'Studianka', theirDay: 39 }, { name: 'Vilnius', theirDay: 51 }, { name: 'Kaunas', theirDay: DAYS }],
    source: 'Dated from French and Russian accounts: day 1 is 19 October 1812, the day the army left Moscow.',
  },
  pages: [
    {
      km: 0,
      title: 'Moscow',
      line: 'After five weeks in a burned city, the army marches out.',
      page: [
        'In June 1812 Napoleon crossed into Russia with the largest army Europe had ever seen, perhaps 450,000 men at first and over 600,000 with the reinforcements, from France and from every country he controlled.',
        'He won the bloody battle of Borodino and entered Moscow on 14 September. That night the city began to burn, most likely set alight by the Russians themselves. For five weeks he waited for Tsar Alexander to ask for peace. No answer came. On 19 October the army, about 100,000 strong, marched out.',
      ],
      deeper: {
        title: 'Why he stayed so long',
        text: 'Napoleon’s wars had always ended the same way: he took the enemy’s capital or beat its army, and the enemy made peace. He expected Alexander to do the same, and sent messages offering terms. Alexander, under pressure from his nobles not to give in, never replied. Moscow was not even the capital; St Petersburg was. Every week Napoleon waited, the season turned, and the Russian army rebuilt itself south of the city. Historians argue whether leaving in early October would have saved the army; many think the war was lost the day he chose to go deeper into Russia instead of wintering at Smolensk.',
      },
    },
    {
      km: 120,
      title: 'Maloyaroslavets',
      line: 'At Maloyaroslavets, the road south is blocked.',
      page: ['Napoleon meant to go back by a southern road, through country not yet stripped of food. On 24 October the Russians fought him for the small town of Maloyaroslavets, which changed hands several times and burned. The French held it, but Napoleon turned north to the road he had come by, through land his own army had already eaten bare.'],
    },
    {
      km: 207,
      title: 'Borodino',
      line: 'Past the field of Borodino, its dead still unburied.',
      page: ['On the way back the army marched past the field of Borodino, where perhaps 70,000 men had been killed or wounded in a single day in September. Survivors wrote of the dead still lying there, seven weeks later.'],
    },
    {
      km: 264,
      title: 'Cossacks',
      line: 'Cossacks and partisans pick off the stragglers.',
      page: ['Cossack cavalry and peasant partisans attacked anyone who fell behind or went looking for food. The poet-soldier Denis Davydov led one of the raiding bands. Prisoners taken on both sides were often killed.'],
    },
    {
      km: 327,
      title: 'Vyazma',
      line: 'At Vyazma, a rearguard battle, and the first snow.',
      page: ['On 3 November the Russians attacked the rearguard at Vyazma. A few days later the first heavy snow fell. Horses died in thousands for lack of fodder and shoes for ice; without them the guns and wagons were abandoned, and the cavalry walked.'],
      deeper: {
        title: 'Kutuzov’s choice',
        text: 'The Russian commander, Mikhail Kutuzov, was an old general, careful and often criticised by his own officers for not attacking. He followed the retreating army in parallel, attacked its rearguards and its stragglers, and let hunger, cold and disease do most of the killing. To his critics he let Napoleon escape; to his admirers he won the war while losing as few men as possible. His own army also suffered terribly in the same cold. Both views have their historians.',
      },
    },
    {
      km: 407,
      title: 'Dorogobuzh',
      line: 'Through Dorogobuzh, in deepening cold.',
      page: ['The cold deepened. Men burned wagons, then houses, for warmth, and crowded round the fires; those at the edge froze. Others died of typhus, carried by lice, which may have killed more soldiers in 1812 than any battle.'],
    },
    {
      km: 495,
      title: 'Smolensk',
      line: 'At Smolensk, the stores the army was promised are already gone.',
      page: ['Smolensk was meant to have food and shelter. When the first troops arrived, from 9 November, they broke into the stores, and much of it was wasted or eaten by those first in the door. Napoleon stayed five days and marched on.'],
    },
    {
      km: 546,
      title: 'Krasny',
      line: 'At Krasny, the corps are cut off one by one.',
      page: ['From 15 to 18 November the Russians attacked the strung-out corps near Krasny. Marshal Ney’s rearguard was cut off; he slipped away across the half-frozen Dnieper at night with fewer than a thousand of his men. Napoleon, hearing he was safe, called him the bravest of the brave.'],
    },
    {
      km: 617,
      title: 'Orsha',
      line: 'At Orsha, Napoleon burns his bridging train.',
      page: ['To move faster, Napoleon ordered the pontoons for bridging rivers burned at Orsha. It was nearly fatal. A thaw had melted the ice on the Berezina ahead, and a Russian army was moving to hold its bridge at Borisov.'],
    },
    {
      km: 690,
      title: 'The trap',
      line: 'Three Russian armies close in on the Berezina.',
      page: ['Russian armies were coming from the north, the south and the east, aiming to trap Napoleon at the river. The southern one took Borisov on 21 November; driven back across the river two days later, it burned the bridge behind it.'],
    },
    {
      km: 773,
      title: 'The Berezina',
      line: 'At Studianka, the bridges over the Berezina.',
      page: [
        'Napoleon faked a crossing south of Borisov and crossed at Studianka instead. General Éblé’s pontonniers, many of them Dutch, stood in the freezing river for hours to build two bridges from the timber of houses. Most of them died of it.',
        'From 26 to 29 November the army crossed under fire. When the bridges were burned on the morning of the 29th, thousands of stragglers and civilians were left behind. In French, a Bérézina still means a disaster.',
      ],
    },
    {
      km: 880,
      title: 'Molodechno',
      line: 'At Molodechno, a bulletin admits the army is lost.',
      page: ['The cold reached about minus 30 degrees. On 3 December, at Molodechno, Napoleon issued his 29th Bulletin, admitting to France that the army had suffered a catastrophe, and ending it by saying the Emperor’s health had never been better.'],
    },
    {
      km: 918,
      title: 'Smorgon',
      line: 'At Smorgon, Napoleon leaves the army for Paris.',
      page: ['On 5 December Napoleon handed command to Murat and left by sledge for Paris, to raise a new army before the news of the disaster could undo him. He reached Paris on 18 December.'],
    },
    {
      km: 1000,
      title: 'Vilnius',
      line: 'At Vilnius, food at last, and no order to share it.',
      page: ['Vilnius, then Vilna, had large stores of food and clothing. Discipline had collapsed, and the starving mob that reached it on 8 and 9 December looted them. Thousands of sick and wounded were left in the city. In 2001 builders found a mass grave there with the remains of over 3,000 of them.'],
    },
    {
      km: KM,
      title: 'The Neman',
      line: 'At Kovno, the last men cross the Neman out of Russia.',
      page: [
        'On 14 December Ney’s rearguard crossed the Neman at Kovno, now Kaunas, where the army had entered Russia in June. Of the hundreds of thousands who had crossed then, only some tens of thousands came back as soldiers; estimates vary widely.',
        'Russian losses, soldiers and civilians, were also terrible, and the country west of Moscow was left in ruins.',
      ],
      deeper: {
        title: 'Minard’s chart',
        text: 'In 1869 the French engineer Charles Joseph Minard drew the campaign as a single picture: a broad band for the army going to Moscow, its width the number of men, and a thin black band coming back, with the temperature on the retreat drawn below it. It shows six things at once: the army’s size, its position on the map in two directions, its direction of travel, the dates and the cold. It has been called the best statistical graphic ever drawn, and is often read as an argument against war. His numbers are his own, and historians’ differ; the shape of the story is the same.',
      },
    },
  ],
  chronicle: [
    { when: '24 June 1812', place: 'The Neman', text: 'The Grande Armée crosses into Russia.' },
    { when: '7 September', place: 'Borodino', text: 'The bloodiest day of the war.' },
    { when: '14 September', place: 'Moscow', text: 'Napoleon enters; the city burns.' },
    { when: '19 October', place: 'Moscow', text: 'The retreat begins.' },
    { when: '24 October', place: 'Maloyaroslavets', text: 'The southern road is blocked.' },
    { when: '26–29 November', place: 'Studianka', text: 'The crossing of the Berezina.' },
    { when: '5 December', place: 'Smorgon', text: 'Napoleon leaves for Paris.' },
    { when: '14 December', place: 'Kovno', text: 'The rearguard crosses the Neman.' },
  ],
  sources: [
    { title: 'Wikipedia: French invasion of Russia', url: 'https://en.wikipedia.org/wiki/French_invasion_of_Russia' },
    { title: 'Wikipedia: Battle of Berezina', url: 'https://en.wikipedia.org/wiki/Battle_of_Berezina' },
    { title: 'Wikipedia: Battle of Maloyaroslavets', url: 'https://en.wikipedia.org/wiki/Battle_of_Maloyaroslavets' },
    { title: 'Wikipedia: Charles Joseph Minard', url: 'https://en.wikipedia.org/wiki/Charles_Joseph_Minard' },
    { title: 'Adam Zamoyski, 1812: Napoleon’s Fatal March on Moscow (2004)' },
  ],
  ready: true,
};
