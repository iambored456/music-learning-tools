# Lesson 1.1 and 1.2 styling review

Reviewed 2026-10-01 after the shared pacing change. Source review across every
current section's renderer and its conditional segment/subsegment states;
browser appearance has not been verified.

## Changes made

| Sections | Findings and changes |
| --- | --- |
| 1.1.0 and musical ending | Score circles/ovals, diamonds and capsules already use the shared appearance action. Their duration-specific geometry is retained. |
| 1.1.1 | Round-note size now explicitly comes from shared grid geometry. Removed the 12% drag enlargement. |
| 1.1.2 | Removed the doubled note diameter. Source, demonstration, dragging and settled notes now use the shared two-column diameter. Explicit grid scale also refreshes pseudo-element stroke measurements when the hit target's size remains fixed. |
| 1.1.3 | Removed the fixed 3.25rem visible choice-note size and the 1.45rem minimum for flying/settled notes. Choices retain generous invisible button targets; the visible notes keep one grid-relative size throughout. Removed hover enlargement and disabled-note fading. |
| 1.1.4 | Uses shared round-note diameter. Removed its separate 8% hover enlargement. |
| 1.2.1–1.2.6 | All use shared round-note diameter. Removed the separate 10% hover enlargement. Placement-preview opacity and incorrect-answer outline/glow are now named shared styles. |

Shared hover/focus outlines replace the separate enlargement policies. All
round-note sizes derive from `calculateLessonGridLayout().noteDiameter`.
Outline, hollow interior, envelope fill and label sizing continue to use
`lessonNoteAppearance` and the lesson-kit stylesheet.

Updated 2026-10-03: all 23 note overlays now supply explicit grid scale and use
individual `style:` directives. Whole style strings previously erased the
appearance action's inline properties during movement. The shared skin no
longer supplies fallback stroke, label-size or fill values; the action owns and
initializes them. `lessonNoteStyles.test.ts` guards future scene code against
the same overwrite and tests preservation through Svelte's style runtime.

## Intentional differences retained

- Pitch ranges, note colors, label visibility/text, legends, octave brackets,
  directional arrows and line/space highlights serve the teaching content.
- Score ovals, diamonds, sustained capsules and tails encode rhythm/duration;
  they should not all become circles.
- Tentative placements and incorrect answers have explicit shared feedback
  styles, distinct from sounding-note fill.
- Flying notes still move between positions; they no longer change diameter
  simply because they move between a choice panel and the grid.

## Still not fully shared

This removes the identified note-style overrides; it is not a complete lesson
architecture migration. Scene files still own note markup, placement/flight
coordinates, frame height/breakpoint choices, field feedback colors and some
timers/audio scheduling. Lesson 1.1.2/1.1.4 still have local wait logic. The
lesson note skin still mirrors Student Notation constants rather than sharing
its appearance specification, and font loading remains different. These are
remaining consolidation targets, not claims of completed visual parity.

The shared pacing defaults are only partially adopted; content-specific
demonstration pauses remain deliberate exceptions. No timing changes were
made in this styling pass.

## Check in the existing Hub

In Amateur Music Theory, check 1.1.2's source, playing and dragged notes; 1.1.3's
choice-to-grid flight; 1.1.1 dragging; 1.1.4 choices; and Lesson 1.2's labelled,
preview and incorrect notes. Compare wide and narrow windows. Notes should
keep their grid-relative size while larger targets remain clickable, focus is
visible, and playback fills only the intended notes. Also spot-check 1.1.0's
score glyphs and the Lesson 1.2 accidental/combined labels.
