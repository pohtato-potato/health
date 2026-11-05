# You redesign, Part 4: Tracks — Implementation Plan

> Native execution; one reviewer after the last part. **Spec:** section 4.4.

**Goal:** every track on its own ground with its animation, a headline, changed/why/next, its own views. Water and the strength index go.

## Review Focus
1. Not logged reads as not logged on every track and chart. 2. A lift with few sessions says so. 3. Medicines' Add stores nothing until Save. 4. Stretch bands tile the range. 5. No fixed layer inside an animated block.

Tasks: rules in `src/domain/trackRules.ts` test-first; shell and look; views; readiness, own tracks, compare; 360 px check on every view.
