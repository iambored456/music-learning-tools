import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ start: vi.fn().mockResolvedValue(undefined), notes: vi.fn(), release: vi.fn(), dispose: vi.fn() }));
vi.mock('tone', () => ({
  start: mocks.start, now: () => 10,
  Synth: class { connect() { return this; } triggerAttack = mocks.notes; triggerRelease = mocks.release; dispose = mocks.dispose; },
}));
vi.mock('./audioMixer.js', () => ({ getAudioMasterOutput: () => 'synth' }));
import { NoteAuditionPlayer } from './noteAuditionPlayer.js';

afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

describe('note audition audio', () => {
  it('plays crossed pitches in order and sustains the last until pointer-up', async () => {
    vi.useFakeTimers();
    const player = new NoteAuditionPlayer();
    const onAttack = vi.fn();
    await player.play([60, 64, 67], onAttack);
    expect(mocks.notes).toHaveBeenCalledTimes(1);
    expect(onAttack.mock.calls).toEqual([[0]]);
    vi.advanceTimersByTime(71);
    expect(onAttack.mock.calls).toEqual([[0], [1], [2]]);
    expect(mocks.notes.mock.calls.map(call => call[0])).toEqual([60, 64, 67].map(midi => 440 * 2 ** ((midi - 69) / 12)));
    vi.advanceTimersByTime(10_000);
    expect(mocks.release).toHaveBeenCalledTimes(0);
    expect(mocks.dispose).toHaveBeenCalledTimes(0);
    player.release();
    expect(mocks.release).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60);
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it('cancels queued crossings on release so they cannot restart a sustained note', async () => {
    vi.useFakeTimers();
    const player = new NoteAuditionPlayer();
    await player.play([60, 64, 67]);
    player.release();
    vi.runAllTimers();
    expect(mocks.notes).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending audio unlock when playback starts or the grid closes', async () => {
    let unlock!: () => void;
    mocks.start.mockReturnValueOnce(new Promise<void>(resolve => { unlock = resolve; }));
    const player = new NoteAuditionPlayer();
    const onAttack = vi.fn();
    const pending = player.play([60], onAttack);
    player.release();
    unlock();
    await pending;
    expect(mocks.notes).toHaveBeenCalledTimes(0);
    expect(onAttack).toHaveBeenCalledTimes(0);
  });
});
