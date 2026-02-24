import { createHeuristicLaughterDetector } from './heuristicLaughterDetector';

describe('heuristicLaughterDetector', () => {
  it('returns values in 0..1 range', () => {
    const detector = createHeuristicLaughterDetector();
    for (let i = 0; i < 50; i++) {
      const score = detector.processLevel(Math.random());
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('resets internal state on reset()', () => {
    const detector = createHeuristicLaughterDetector();
    detector.processLevel(0.8);
    detector.processLevel(0.9);
    detector.reset();
    const score = detector.processLevel(0.1);
    expect(score).toBeLessThan(0.5);
  });

  it('bar grows with sustained loud input', () => {
    const detector = createHeuristicLaughterDetector({ smoothingAlpha: 0.9 });
    let prevScore = 0;
    for (let i = 0; i < 30; i++) {
      const score = detector.processLevel(0.6);
      expect(score).toBeGreaterThanOrEqual(prevScore - 0.05);
      prevScore = score;
    }
    expect(prevScore).toBeGreaterThan(0.3);
  });

  it('bar stays low with silence', () => {
    const detector = createHeuristicLaughterDetector();
    for (let i = 0; i < 50; i++) {
      detector.processLevel(0);
    }
    const score = detector.processLevel(0);
    expect(score).toBeLessThan(0.1);
  });
});
