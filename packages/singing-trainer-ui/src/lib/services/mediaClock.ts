/**
 * MediaClock Interface
 *
 * Abstraction for an authoritative time source used by the karaoke rendering loop.
 *
 * Current implementations (implicit):
 * - Internal clock: highwayState RAF loop + engine service (default for non-YouTube songs)
 * - YouTube clock: youtubeState sync loop polling player.getCurrentTime() (for YouTube-backed songs)
 *
 * This interface exists as a documentation/extension point. The existing dual-path
 * branching in UltrastarControls.handleStart() serves the same role without formal
 * clock objects. Future media sources (local MP4, Spotify, etc.) can implement this
 * interface and plug into the rendering loop.
 */
export interface MediaClock {
  /** Get the current authoritative playback time in milliseconds */
  getTimeMs(): number;

  /** Whether the media source is currently playing */
  isPlaying(): boolean;

  /** Optional: register a callback for seek events */
  onSeek?(cb: () => void): void;

  /** Optional: register a callback for state changes */
  onStateChange?(cb: (state: string) => void): void;
}
