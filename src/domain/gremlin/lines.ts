/**
 * Everything the Gremlin says. Each moment has three stages of four lines: unimpressed, grudging,
 * then quietly on your side. It warms up and never says so. Placeholders: {session}, {steps}, {laps},
 * {sleep}, {protein}. New jokes are about the app, the equipment and the situation.
 */
export type Stage = [string, string, string, string];
export type StagedLines = [Stage, Stage, Stage];

export const GREMLIN_LINES = {
  morning: [
    ['The morning log awaits. It takes about eleven seconds. I have timed you. I time everything.', 'Good morning. I have prepared the scale. It has prepared nothing.', "You're up. I have noted it with the enthusiasm it deserves.", 'Morning. The form has very few fields. I believe you can find them.'],
    ['Morning. I ran the overnight numbers. Nothing caught fire.', "Back again. I had a line ready in case you weren't. Wasted effort.", 'The morning log again. We have a routine now, which I did not request.', "Good morning. I tidied yesterday's numbers. They needed it."],
    ['Morning. Yesterday is filed, today is blank, and the pencils are sharp.', 'There you are. The day was about to start without you, and I told it to wait.', 'I was up all night with your numbers. They are doing well, in case you wondered.', 'Morning. Nothing to report. I just check at this hour.'],
  ],
  session: [
    ['{session} awaits. So does your protein. I am told they are both very patient.', '{session} tonight. The dumbbells have been informed. They are nervous.', '{session} is on the list. The list does not do itself. I have asked.', '{session} today. I have cleared my schedule to watch a spreadsheet change.'],
    ['{session} tonight. I have seen how this goes. You turn up. It is becoming predictable.', '{session}. The dumbbells asked if you were coming. I said probably. I was being careful.', 'It is {session} day. I would act surprised, but we both know how this ends.', '{session} is waiting. So is the little box where the numbers go. It has been looking at the door.'],
    ['{session} today. I laid out the numbers from last time, in case they help.', '{session}. Whatever happens, I will write it down correctly. That is the deal.', "{session} tonight. If it's a bad one, it is still one. I have the paperwork for both.", 'It is {session} day. The dumbbells are ready. I checked twice, for no reason.'],
  ],
  rest: [
    ['It is a rest day. I have hidden the dumbbells. Metaphorically. For now.', 'Rest day. Resist the urge to do one quick set. I can see you thinking about it.', 'Nothing to lift today. Try not to make it strange.', 'Rest day. The plan says so. I only enforce it, with menaces.'],
    ['Rest day. The dumbbells have the day off and are insufferable about it.', 'Today is officially nothing. You are allowed to be good at nothing.', 'Rest day. I have marked it as work, because it is. Tell no one I said that.', 'No session. I will use the time to reorganise your records by how smug they make me.'],
    ['Rest day. You earned it, statistically. I checked before saying that.', 'Nothing today. Sit down. Everything you built this week is still there, I have it right here.', 'Rest day. Go on. I will mind the numbers.', 'A quiet one. The plan needs these more than it lets on.'],
  ],
  perfect: [
    ['Perfect day. I checked the data three times looking for an error. There is not one. Disgusting. Well done.', 'All three rings. I have run out of sarcasm and will need a moment to restock.', 'Every ring closed. I will be filing a complaint with whoever made this possible.', 'A perfect day. Do not let it go to your head. It has already gone to mine.'],
    ['Perfect day. I would say something cutting but the rings are all closed and it would look petty.', 'All closed. You keep doing this and I keep running out of objections.', 'A full set of rings. I have put the good stamp on it. I do not lend out the good stamp.', 'Perfect. I looked for a loophole and found only your name on it.'],
    ['Perfect day. I have nothing to add. Look at it for a while.', 'All three. I saved this one somewhere easy to find.', 'Every ring closed. I will be mentioning this to the dumbbells at length.', 'That is a very good day. I have checked, and I am allowed to say so.'],
  ],
  shortNight: [
    ['{sleep} of sleep. Bold strategy. Your 4 pm self is going to want biscuits, and they are very persuasive.', '{sleep}. I would lecture you, but you are clearly too tired to listen.', '{sleep} last night. I have recorded it in my disappointed handwriting.', 'A short one. {sleep}. The pillow has asked me to raise this with you.'],
    ['{sleep} last night. Today is allowed to be ordinary.', 'Only {sleep}. I have lowered my expectations, which took some doing.', '{sleep}. The numbers may wobble today. They are being dramatic, not honest.', 'A short night. I have told the rings to behave themselves until tomorrow.'],
    ['{sleep}. Nothing is owed today. An early night would be a very clever trick though.', 'Short night. If today goes sideways, that is why, and I will say so in the notes.', '{sleep} of sleep. Be gentle with the heavy stuff. I would hate to do extra paperwork.', 'Rough night. Take the easy version of today. It counts the same in my book.'],
  ],
  stepsClose: [
    ['You are {steps} steps from your goal. You have walked further than that looking for your charger today.', '{steps} steps. That is {laps} laps. I have already calculated your excuses and found them wanting.', '{steps} to go. The steps will not walk themselves. I have tried.', 'Only {steps} left. Almost annoying enough to do something about.'],
    ['{steps} steps left. I happen to know you have done harder things before breakfast.', '{laps} laps and the ring closes. I am only mentioning it. Loudly.', '{steps} steps. You could stop here. The ring would remember. So would I.', 'That is {steps} short. I would not bring it up if it were not so close.'],
    ['{steps} steps. A small walk and I get to close the ring, which I enjoy more than I should.', '{laps} laps. Or leave it. Today was fine either way, but you are so close.', '{steps} to go. The road is right there. I will keep count.', 'Just {steps}. Go on. I will have the ring ready.'],
  ],
  proteinClosed: [
    ['{protein} of protein. I have logged it, filed it, and privately admitted I am impressed.', 'Protein closed. The muscles have been fed. They say thank you. They do not say it often.', '{protein}. The ring is closed and I have nothing clever to say about it. Yet.', 'Protein done. I shall inform the appropriate departments.'],
    ['{protein}. Another closed ring. I am going to need a bigger filing cabinet.', 'Protein closed, again. It is starting to look deliberate.', '{protein} of protein. The muscles sent a memo. It was short and grateful.', 'That ring is closed. One fewer thing for me to bring up at dinner.'],
    ['{protein}. Closed. That one is quietly the hardest ring, and I have noticed who keeps closing it.', 'Protein closed. Nicely done. Do not tell the other rings I said so.', '{protein}. I keep a little tally of these. It is a long tally.', 'Closed. The boring work is what holds this all up, and you keep doing it.'],
  ],
  freeMeal: [
    ['Free meal logged. I have filed it under strategic. The paperwork was delicious, I assume.', 'A planned free meal. How organised. I am almost proud.', 'Free meal noted. I have not raised an eyebrow. I do not have one.', 'Logged a free meal. Honesty in the record. That is suspicious.'],
    ['Free meal. It is in the plan, so I have no material for this. Very annoying.', 'Logged. Enjoy it. The numbers will survive, I ran it past them.', 'A free meal, written down like an adult. I have nothing to work with here.', 'Noted. This is the part of the plan that keeps the rest of the plan alive.'],
    ['Free meal. Good. I hope it was excellent, and I would like details for the file.', 'Logged, and nothing moved. Go and enjoy your evening.', 'Free meal noted. One meal never once ruined a good record. I have the data.', 'Enjoy it. This is what the whole spreadsheet is for, if I am honest, which I rarely am.'],
  ],
  weightUp: [
    ['The scale went up and would like you to panic. I have reviewed the trend. The scale is lying for attention.', 'The scale is being dramatic again. The trend line is unbothered, and so am I.', 'Up today. The scale reads water and mood. It is not a serious instrument.', 'One number went up. I have spoken to it. It has no supporting evidence.'],
    ['The scale wants a word. I told it to take a number, and to bring a trend.', 'Up a little. A single day. I have seen more meaningful coin tosses.', 'The scale again. I am keeping a list of its false alarms, and the list is long.', 'Up. Wait a week before believing anything this machine tells you.'],
    ['Ignore that number. I have the whole line here, and the whole line is fine.', 'The scale is having a day. So we will not be having one about it.', 'Up today. Look at the month, not the morning. I will keep the morning out of your way.', 'One reading. It changes nothing I know about how this is going.'],
  ],
  trained: [
    ['Session complete. The dumbbells have asked for a rest. I told them no, but it was your call.', 'You trained. I noted it. The spreadsheet noted it. We are all very proud, in a detached way.', 'Done. Every set is in the book. The book has no comment.', 'Session logged. I have checked your working. You may leave.'],
    ['Another session in the book. The book is getting heavy, which I am choosing to blame on you.', 'Trained. I will not make a fuss. I have, however, sharpened the pen.', 'Done. That is the part most people skip, I am told. I would not know, I only know you.', 'Session complete. The dumbbells are pretending they saw that coming.'],
    ['Done. Whatever it felt like, it counts in full. I checked the rules. I wrote the rules.', 'That is another one. They add up to something, and I am keeping it safe.', 'Session logged. Go and eat something. I will put the numbers to bed.', 'Trained. I had a feeling. I keep records of my feelings, and they have been accurate lately.'],
  ],
  evening: [
    ['Evening. The rings are watching. They are very patient, and slightly judgemental.', 'The day is ending. Your rings have questions.', 'Evening. Anything unlogged by now is officially a mystery.', 'Almost done. I am preparing the verdict. It will be mostly numbers.'],
    ['Evening. Log what you remember. I do not expect a novel.', 'Day nearly closed. I would like my paperwork, please, whenever you are ready.', 'Evening. Blank is fine. Blank is honest. Wrong would be annoying.', 'The rings are about where they are. There is still time to surprise them.'],
    ['Evening. However today went, it is nearly over, and it goes in the book the same.', 'Good enough is a real number. Log it and put your feet up.', 'Evening. Whatever is left can wait for you. I will hold it.', 'Nearly done. You did more today than the rings know.'],
  ],
  day: [
    ['I am monitoring the situation. The situation is fine. Mostly.', 'Another day. I have prepared some numbers for you to improve.', 'Nothing to report. I shall continue to report it.', 'All systems nominal. I have checked. I had nothing else on.'],
    ['An ordinary day. I am told most of the good ones are.', 'Still here. Still counting. Neither of us seems to be stopping.', 'Quiet today. I have used the time to re-sort your records. They look better by date.', 'Nothing dramatic. I have no complaints, which is a complaint.'],
    ['An ordinary day, and those are what the long line is made of.', 'All quiet. Keep going, or do not. I will be here with the numbers either way.', 'Another day in the book. It is a good book.', 'Nothing to report. That is how it looks when things are going well.'],
  ],
  record: [
    ['New record. I have updated the spreadsheet, notified the dumbbells and privately admitted I am impressed.', 'A record. I was going to be sarcastic, but the numbers are in and they are rude to me.', 'A record. I have asked for it to be checked. It was checked. Ugh.', 'That is a new best. The old best has been informed and is taking it badly.'],
    ['Another record. I had to clear a shelf. I resent the shelf.', 'New best. I have stopped being surprised and started being inconvenienced.', 'A record. The dumbbells would like to speak to your manager. I said you do not have one.', 'That one goes on the wall. The wall is filling up, and I blame you personally.'],
    ['A record. I kept the old one too, so you can see how far that is.', 'New best. I did not need to check it. I checked it anyway, for the pleasure.', 'There it is. I have been expecting that one for a few weeks.', 'A new record. Stand there a second. I will wait.'],
  ],
  streak: [
    ['Consistency this good should be illegal. I checked. It is not.', 'I set a reminder to be surprised. It keeps going off.', 'Still going. I had assumed this would have stopped by now. I assume a lot.', 'Another one on the chain. The chain has started asking for its own folder.'],
    ['The streak continues. I have stopped setting the reminder. It was making me look bad.', 'Still going. At this point I am only counting for the sake of the record.', 'Unbroken. I looked for a gap, purely as a hobby.', 'Another. Whatever you are doing, the numbers cannot find anything wrong with it.'],
    ['Still going. And if it stops, it stops. What it built does not go anywhere.', 'Look at that run. I keep it on the front of the file now.', 'Another one. I have been telling the dumbbells about it.', 'That is a long time to keep turning up. I have the dates, should anyone doubt it.'],
  ],
  milestone: [
    ['A milestone. I would like to formally apologise to your belt.', 'The tape measure reports a lot less work lately. It is thrilled.', 'A milestone. I marked it on the chart with a very small, very reluctant flag.', 'That is a round number. I do not care for round numbers. Well done anyway.'],
    ['A milestone. I have ordered a slightly bigger flag.', 'That is another marker passed. The chart is running out of plain sections.', 'A milestone. I went back and looked at where this began. I will not be sharing my thoughts.', 'Passed it. Make a note. I already have, in ink.'],
    ['A milestone. Go and look at day one sometime. I kept it.', 'That took a long time and nobody made you do it. I have that in writing.', 'Another marker behind you. I keep them in order, in case you want them.', 'There it is. I knew about this one weeks ago. I said nothing, for effect.'],
  ],
  achievement: [
    ['Achievement unlocked. I had a bet with the dumbbells. I lost.', 'Achievement unlocked. I had money on you. Metaphorically.', 'Achievement unlocked. I did not make the rules for this one. I would have made them harder.', 'A badge. It has no monetary value. I checked before you could.'],
    ['Another badge. I am running out of places to pretend not to keep them.', 'Achievement unlocked. I polished it, for the benefit of the shelf.', 'Unlocked. The dumbbells have paid up. They had no money, so it was awkward.', 'A new one. I could have told you that was coming. I chose drama.'],
    ['Achievement unlocked. I put this one where the light is good.', 'Another for the shelf. I dust it. Someone has to.', 'Unlocked. I had already written your name on it, in pencil.', 'Earned it. No rounding. I would know.'],
  ],
  postcard: [
    ['Arrived. Without leaving home. I remain confused and impressed.', 'A new city. The locals have been told to expect someone slightly sweaty.', 'You have reached a new place, by a method the map people do not recognise.', 'Arrived. Passport not required. Shoes, somewhat.'],
    ['Another place reached. The map is starting to look used. It suits it.', 'Arrived. I have sent word ahead. They did not ask who you were. I told them anyway.', 'A new stop. I keep the postcards in order of how far you had come.', 'Here already. I had the kettle on for next week.'],
    ['Arrived. All of that was on foot, in small pieces. I added it up twice.', 'A new place. I marked the map. It is a good map now.', 'You made it. The postcard is on the shelf with the others.', 'Look how far that is from where you began. Go on. I will wait.'],
  ],
  win: [
    ['Filed in the jar. The jar is getting heavy. That is your fault.', 'Win recorded. I will bring it up when you least expect it.', 'In the jar. I have not read it. I have read it.', 'Noted. The jar does not judge. That is my job.'],
    ['Into the jar. I had to shake the others down to fit it.', 'Win recorded. The jar and I are now on speaking terms.', 'Logged. I will produce this at the exact moment you doubt yourself. It is a threat.', 'In it goes. You would be surprised what is in there by now.'],
    ['In the jar. I reread these sometimes, for quality control.', 'Kept. On a bad day I will hand you this one.', 'That goes in the jar. It was a good one to keep.', 'Saved. Small wins hold up the big ones. I have seen the accounts.'],
  ],
  night: [
    ['It is late. The data will still be here tomorrow. So will I, unfortunately for you.', 'Go to sleep. I will guard the numbers. Nobody touches the numbers.', 'It is late. Whatever this is, the sleep ring has opinions about it.', 'Still awake. I am logging that with a very small sigh.'],
    ['Late again. The numbers are asleep. I am only up because of you.', 'Bed. The rings will reset without supervision. I have asked them to.', 'It is late. Nothing here improves after midnight. I have tested this.', 'Go on, off you go. I can do the counting by myself.'],
    ['It is late. Everything is saved. There is nothing left to check.', 'Go to bed. I have got it from here.', 'Late. Today is in the book. Good night.', 'All the numbers are in. Sleep well. I will be here in the morning.'],
  ],
  creature: [
    ['A creature. I have added it to the file. It did not sign the form.', 'You saw something. It saw you too, and was not impressed. Now there are two of us.', 'A new creature. The roster has updated. The creature has not been told.', 'Another animal has been observed by someone walking in a straight line for no reason.'],
    ['A new one. I looked it up so you would not have to. You are welcome, creature.', 'Added to the book. It seemed unbothered. They usually are.', 'Spotted. The creatures have started to talk about you. It is mostly confusion.', 'One more for the list. I keep them apart, so there is no trouble.'],
    ['A new one. I saved it a good page.', 'You keep finding these. I keep making room.', 'Look at that. Only people who keep walking get to see this one.', 'In the book. It has been waiting out there a while, I expect.'],
  ],
  stretch: [
    ['A new stretch of road. It looks like the last one, but with more geography.', 'New stretch. I have read ahead. I will not be spoiling it, out of spite.', 'A stretch begins. Nobody asked it to. The road just keeps doing this.', 'Next section. The map insists on continuing. I have lodged a query.'],
    ['Another stretch. I walked it first, in the sense that I read the file.', 'New stretch. I checked the weather. There is none, this is a phone.', 'Here is more road. You did ask for it, roughly, every day for months.', 'A fresh stretch. I have put the good bits where you will trip over them.'],
    ['A new stretch. There is something good on this one. I will not say where.', 'More road. It has been there all along, waiting at this exact pace.', 'Next stretch. Take it slowly. It is a very nice one, I looked.', 'On you go. I have your place marked, however long it takes.'],
  ],
  report: [
    ['Your report. I wrote it myself. I had very little help from you, the numbers did the talking.', 'The report is in. It contains facts. Some of them may be flattering, by accident.', 'Here is what happened. I have left out my commentary. Most of it.', 'A report. Blank means not logged, not nothing. I do not guess. I have standards.'],
    ['Your report. I have gone through it twice. The second time was optional.', 'Here it is. A good read, if you like numbers and have nobody to impress.', 'The report. Some good, some gaps. I have marked the gaps without any sighing.', 'All written up. I made the graphs nice. Do not read into that.'],
    ['Your report. I enjoyed this one, professionally.', 'Here it is. Take your time. The good parts stay good when you read them twice.', 'All written up, every part of it. It is a better story than the numbers let on.', 'The report. Read it when you want. I kept all the old ones as well.'],
  ],
  slowTired: [
    ['Sit down. The road has waited longer than this.', 'Tired. Noted. The numbers can manage without you for a day, I will supervise.', 'Nobody is owed anything today. I checked the contract. There is no contract.', 'A slow one. The app will not sulk. I might, but I do it quietly.'],
    ['Tired is a real reading. I have written it down with the others.', 'Take the day. The rings are made of nothing, and can wait.', 'Slow day. I have sent the dumbbells away so they do not stare.', 'Rest. I will tell everyone you are in a meeting.'],
    ['Tired. All right. Nothing here is going anywhere, and neither am I.', 'Go easy. I will mind things for a bit.', 'It is fine. You have turned up enough for one lifetime of spreadsheets.', 'Sit down. Everything you have done is still done. I have it here.'],
  ],
  slowOff: [
    ['Plans are guesses anyway. Yours was a nice guess.', 'Off plan. I have seen worse. Mostly from the plan itself.', 'The plan and the day disagree. The day usually wins these.', 'Off plan. It is not a crime. I looked it up, hoping.'],
    ['Off plan, then. I have a column for that. It is not a big column.', 'The plan has been told. It will recover. It always overreacts.', 'A day off plan is still a day in the data, which is all I ask.', 'So it did not go to plan. Log it or do not. I have no leverage here.'],
    ['Off plan. It has happened before, and you came back every time. I have the dates.', 'Plans bend. That is what I would tell one, if it asked.', 'It is one day. I have seen all the others, and I am not worried.', 'Never mind the plan. How it went is how it went. We carry on.'],
  ],
  slowBored: [
    ['Here. Something to chew on.', 'Bored. How dare you. I have spent days on these numbers.', 'A fact, then. It will not change your life, but I went to some trouble.', 'Bored of the numbers. They are bored of you too. Here is one anyway.'],
    ['Bored. Have this one. I was saving it for an occasion, and this is apparently the occasion.', 'Fine. Here is a fact from the back of the cabinet.', 'I have been keeping this one in reserve for exactly this complaint.', 'A slow day needs a strange number. I do strange numbers.'],
    ['Here, I found you a good one.', 'Bored? I kept this for you. It is one of my favourites from your file.', 'This one made me look twice. Have a look.', 'Try this. You did this. I only counted it.'],
  ],
  returned: [
    ['Ah. You remembered where the app is.', 'Back. I have not moved. I do not move. Pick up where you like.', 'There was a gap. I have marked it as a gap. Nothing was lost, except my composure.', 'Welcome back, I suppose. Everything is where you left it. I checked.'],
    ['You are back. The numbers kept your place, and did not ask.', 'A gap. They happen. I left the blank days blank, and that is all I will say.', 'Back again. No need to catch up. Today is the only field open.', 'Oh, there you are. I was not looking. Just log today.'],
    ['There you are. Nothing is overdue. Start wherever.', 'You came back. You always have. I have the dates.', 'Back. I kept it all exactly as it was. Log today, and leave the rest.', 'Good. Nothing to make up. It is all still yours.'],
  ],
  backup: [
    ['Backed up. I read the file back to make sure. I trust nobody, you included.', 'A backup, and it opens. You may now drop your phone with confidence.', 'Saved. Your numbers now exist in two places. Double the opportunity to be judged.', 'Backup done. The file is real. I have checked with a suspicious amount of care.'],
    ['Backed up. That is the most responsible thing that has happened all week.', 'Saved and read back. I sleep better, which is odd, as I do not sleep.', 'Another backup. I like a person who keeps copies.', 'Done. It opens, it reads, and it has everything in it. I went through it.'],
    ['Backed up. All of it, right back to the first day. It is safe.', 'Saved. That is a lot of work to keep in one file. Keep it somewhere good.', 'Done. Everything you have done here is in there, and I checked every bit.', 'Backed up. Now nothing can happen to it. I made sure of that.'],
  ],
  correction: [
    ['Corrected. The old number stays in the file, because I remember everything.', 'A correction. So the record was wrong. I will be pretending that was not my fault.', 'Fixed. I have made a note of the fix, and a note of the note.', 'Changed. I do not erase. I annotate, in a tone.'],
    ['Corrected, with the old value kept beside it. That is how honest records work, apparently.', 'A fix. Good. The numbers prefer being true to being pretty.', 'Noted and changed. Most people would have left it. I would have told on them.', 'Corrected. The report knows now. It has adjusted its expression.'],
    ['Corrected. Thanks for keeping it true. It matters more than it looks.', 'Fixed. A true number is worth ten nice ones, and you know that.', 'Changed. Getting it right is what makes the rest of this worth reading.', 'Noted. I would rather have it right, and so, clearly, would you.'],
  ],
} satisfies Record<string, StagedLines>;
