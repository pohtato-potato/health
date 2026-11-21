import { useState, type CSSProperties } from 'react';
import { lastMonth } from '../domain/film';
import { storySlides } from '../domain/monthStory';
import { back, go, useRoute } from '../router';
import { StorySlideView } from './you/StorySlide';
import { useMonthInput } from './reports/useMonthInput';

/** The month's story (board W8, y8-story): up to nine slides you tap through, each a colour wash with one huge number. */
export function MonthlyFilmPage() {
  const { params } = useRoute();
  const input = useMonthInput();
  const [i, setI] = useState(0);
  if (!input) return <div className="page bare" />;
  const month = params.get('m') ?? lastMonth(input.today);
  const slides = storySlides(month, input);
  const close = () => back('/you');
  if (!slides.length) {
    return (
      <div className="yu-st" style={{ '--g': 'linear-gradient(170deg,#c2b2ff,#8fd8ff)' } as CSSProperties}>
        <div className="yu-st-b"><p className="yu-st-n"><span>Nothing was logged this month, so there's no story yet.</span></p></div>
        <div className="yu-st-nav"><span /><button type="button" className="on" onClick={close}>Close</button></div>
      </div>
    );
  }
  const k = Math.min(i, slides.length - 1);
  return (
    <StorySlideView slide={slides[k]} at={k} of={slides.length} month={month}
      onNext={() => setI(Math.min(slides.length - 1, k + 1))} onBack={() => setI(Math.max(0, k - 1))} onClose={close}
      onReport={() => go('/reports/month', { m: month })} />
  );
}
