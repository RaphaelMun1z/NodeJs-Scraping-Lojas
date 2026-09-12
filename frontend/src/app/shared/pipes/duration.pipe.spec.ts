import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('formats milliseconds as a readable duration', () => {
    expect(pipe.transform(125_000)).toBe('2m 5s');
  });

  it('returns a dash when no duration is available', () => {
    expect(pipe.transform()).toBe('—');
  });
});
