# @mlt/talking-avatar

A talking avatar controller combining SVG visual states with native browser TTS (Text-to-Speech).

## Voice selection

The generic narrator ranks available voices by language, quality keywords, and
local availability. This ranking does not identify a voice's gender. The Web
Speech voice interface provides no gender property, and browsers can populate
their voice lists asynchronously. `getVoicesAsync({ isReady, timeoutMs })` can
wait for a specific voice rather than accepting the first partial list; empty
events are ignored and polling covers browsers that do not emit an event.

Amateur Music Theory supplies a Grammy-specific selection policy: known male
English Windows voices (Richard, David, Mark, George) and explicitly male-labelled
voices are preferred, and the chosen voice URI remains stable across lesson
segments in the page session. Grammy uses the selected voice's locale and normal
pitch (`1`). If no matching voice is exposed within two seconds, a consistent
English fallback is used and the lesson Inspector records the fallback name.
The browser must expose a matching voice for this preference to take effect;
installed OS voices and browser-accessible voices need not be identical.

Speech requests use generation tokens: cancellation or replacement prevents
pending voice loads, wave completions, and delayed utterance dispatches from
reviving older narration. Canceled chunk promises settle even if the browser
does not emit an utterance cancellation event.

`setVolume()` updates ongoing and future narration. Native speech engines
can snapshot volume when an utterance is queued, so active speech is canceled
and its remaining text requeued at the new volume. The last reported word
boundary supplies the resume point; the current word may briefly repeat.
Voices without boundary events restart the current sentence (or the whole
utterance when sentence chunking is disabled). Rapid slider updates share the
pending dispatch, and paused narration remains paused until resumed. These
internal restarts keep the original narration promise and speaking state
active, so a volume adjustment does not advance the lesson.

## Features

- 9 SVG avatar frames: smiling, thinking, wave, feedback, and mouth animation
- Synchronized mouth animation with speech using browser TTS
- Fallback animation when speech boundary events aren't available
- Framework-agnostic - works with any web application
- Configurable timing and animation parameters

## Installation

This package is part of the music-learning-tools monorepo:

```bash
pnpm add @mlt/talking-avatar
```

## Quick Start

```typescript
import { createTalkingAvatarController, defaultAvatarAssets } from '@mlt/talking-avatar';

// Create a mount point in your HTML
const mount = document.getElementById('avatar-mount')!;

// Create the avatar controller
const avatar = createTalkingAvatarController({
  assets: defaultAvatarAssets,
  mount,
  debug: true, // Optional: enable debug logging
});

// Slide the avatar in
await avatar.enter();

// Speak some text (HTML tags are stripped)
await avatar.speak('<b>Welcome!</b> Let me show you around.', {
  lang: 'en-CA',
  rate: 0.92,
});

// Show bad feedback (e.g., incorrect answer)
avatar.setFeedbackBad(true);

// Clean up when done
avatar.dispose();
```

## Avatar States

`armsDownAvatarAssets` provides Grammy's five talking frames with both arms down,
using the original full talking heads above the arms-down body. The head contour
excludes the raised arm while preserving the movement between talking frames.
The pre-speech cue uses the original waving picture. Amateur Music Theory uses this set; `defaultAvatarAssets`
retains the waving pose for other consumers.

| SVG File | State | Usage |
|----------|-------|-------|
| `avatar_nosmile_nowave.svg` | `feedback_bad` | Bad feedback (incorrect answer) |
| `avatar_smile_nowave.svg` | `idle_smile` | Default friendly state |
| `avatar_thinking_nowave.svg` | `idle_thinking` | Inquisitive resting face while a learner answers |
| `avatar_smile_wave.svg` | `pre_speak_wave` | Brief cue before speaking |
| `avatar_talk_mouthclosed.svg` | `talking` | Mouth rest frame |
| `avatar_talk_mouthopen1-4.svg` | `talking` | Mouth animation frames |

## API Reference

### `createTalkingAvatarController(opts)`

Creates a new avatar controller.

**Options:**
- `assets: AvatarAssetSet` - Paths to all 9 SVG files
- `mount: HTMLElement` - DOM element to mount the avatar into
- `onStateChange?: (state) => void` - Callback when visual state changes
- `debug?: boolean` - Enable debug logging

**Returns:** `TalkingAvatarController`

### Controller Methods

| Method | Description |
|--------|-------------|
| `enter()` | Slide-in animation, returns Promise |
| `setVisible(visible)` | Show or hide the avatar |
| `speak(text, opts?)` | Speak text with TTS, returns Promise |
| `cancel()` | Cancel current speech |
| `pause()` | Pause speech |
| `resume()` | Resume speech |
| `setFeedbackBad(active)` | Show bad feedback state |
| `setThinking(active)` | Select the thinking resting face; speech and bad feedback take priority |
| `listVoices()` | Get available TTS voices |
| `setVoiceURI(uri)` | Set preferred voice |
| `setVolume(volume)` | Set volume from 0 to 1, updating ongoing and future narration |
| `dispose()` | Clean up resources |

### Speak Options

```typescript
type SpeakOptions = {
  lang?: string;              // default: "en-CA"
  voiceURI?: string;          // specific voice to use
  rate?: number;              // default: 0.92
  pitch?: number;             // default: 1.0
  volume?: number;            // default: 1.0
  chunking?: "sentence" | "none";  // default: "sentence"
  preSpeakWaveMs?: number;    // default: 450
  burstFrameMs?: number;      // default: 45
  burstMaxFrames?: number;    // default: 8
  fallbackPulseRangeMs?: [number, number];  // default: [120, 190]
  boundaryPulseDebounceMs?: number;  // default: 60
};
```

## Custom Assets

You can provide your own SVG assets:

```typescript
import { createTalkingAvatarController, type AvatarAssetSet } from '@mlt/talking-avatar';

const customAssets: AvatarAssetSet = {
  nosmile_nowave: '/my-assets/sad.svg',
  smile_nowave: '/my-assets/happy.svg',
  thinking_nowave: '/my-assets/thinking.svg',
  smile_wave: '/my-assets/waving.svg',
  talk_mouthclosed: '/my-assets/mouth-closed.svg',
  talk_mouthopen1: '/my-assets/mouth-open-1.svg',
  talk_mouthopen2: '/my-assets/mouth-open-2.svg',
  talk_mouthopen3: '/my-assets/mouth-open-3.svg',
  talk_mouthopen4: '/my-assets/mouth-open-4.svg',
};

const avatar = createTalkingAvatarController({
  assets: customAssets,
  mount: document.getElementById('avatar')!,
});
```

## CSS Styling

The avatar container can be styled with CSS:

```css
#avatar-mount {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 120px;
  height: 120px;
  z-index: 2000;
  pointer-events: none;
}
```

The avatar element has class `talking-avatar-container` and the image has class `talking-avatar-img`.

## Browser Compatibility

The package uses native `speechSynthesis` API which is supported in all modern browsers.

**Speech boundary events** (for synchronized mouth animation) are not available in all browsers. When unavailable, the package uses a fallback timing-based animation that still produces natural-looking mouth movement.

| Browser | Boundary Events |
|---------|-----------------|
| Chrome | ✅ Yes |
| Firefox | ❌ No (fallback used) |
| Safari | Partial |
| Edge | ✅ Yes |

## Feedback Override Policy

The `feedback_bad` state (shown via `setFeedbackBad(true)`) follows these rules:

- When **not speaking**: `feedback_bad` overrides `idle_smile`
- When **speaking**: `talking` state takes priority
- After speech ends: returns to `feedback_bad` if still active

This ensures feedback is visible but doesn't interrupt active narration.

`setThinking(true)` selects `avatar_thinking_nowave.svg` whenever the avatar
rests. Talking and waving retain their animation, and bad feedback overrides
thinking. Clear it with `setThinking(false)` when an answer is submitted.
Amateur Music Theory applies this through the shared question lifecycle after
prompt narration, including retries and partial multi-note placements; replay
and scene disposal clear it.

## Integration with Diatonic Compass

The package is designed to integrate with the Diatonic Compass tutorial:

```typescript
import { createTalkingAvatarController, defaultAvatarAssets } from '@mlt/talking-avatar';

let avatar: TalkingAvatarController | null = null;

export function startTutorial() {
  const mount = document.getElementById('avatar-mount');
  if (!mount) return;

  avatar = createTalkingAvatarController({
    assets: defaultAvatarAssets,
    mount,
  });

  avatar.enter().then(() => {
    avatar.speak('Welcome to the Diatonic Compass!');
  });
}
```

## License

MIT
