import type { AvatarAssetSet } from "./types.ts";

// Import SVG assets as URLs using Vite's ?url query
import nosmile_nowave from "../assets/avatar_nosmile_nowave.svg?url";
import smile_nowave from "../assets/avatar_smile_nowave.svg?url";
import smile_wave from "../assets/avatar_smile_wave.svg?url";
import talk_mouthclosed from "../assets/avatar_talk_mouthclosed.svg?url";
import talk_mouthopen1 from "../assets/avatar_talk_mouthopen1.svg?url";
import talk_mouthopen2 from "../assets/avatar_talk_mouthopen2.svg?url";
import talk_mouthopen3 from "../assets/avatar_talk_mouthopen3.svg?url";
import talk_mouthopen4 from "../assets/avatar_talk_mouthopen4.svg?url";

/**
 * Default avatar asset paths, bundled with the package.
 * These are resolved at build time by Vite.
 */
export const defaultAvatarAssets: AvatarAssetSet = {
  nosmile_nowave,
  smile_nowave,
  smile_wave,
  talk_mouthclosed,
  talk_mouthopen1,
  talk_mouthopen2,
  talk_mouthopen3,
  talk_mouthopen4,
};
