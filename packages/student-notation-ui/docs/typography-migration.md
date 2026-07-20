# Student Notation typography migration

Status: **implemented; visual regression review pending.**

This ledger records the production typography architecture after migration. Values are CSS declarations unless described as calculated. Rem conversions assume the 16px root. Geometry-driven sizes and user annotation settings intentionally remain inputs to semantic roles rather than being replaced by fixed sizes.

## Token architecture

Primitive tokens live in `style/base/variables.css`. Semantic role tokens live separately in `style/base/typography.css`.

| Primitive group | Tokens and values |
| --- | --- |
| Families | `--font-family-sans`: Atkinson Hyperlegible Next/system sans; `--font-family-mono`: SF Mono/Monaco/Cascadia/Roboto Mono/Consolas/Courier New/monospace |
| Sizes | `--font-size-100`: 0.75rem; `200`: 0.875rem; `300`: 1rem; `400`: 1.125rem; `500`: 1.25rem; `600`: 1.5rem; `700`: 2rem |
| Weights | `--font-weight-regular`: 400; `--font-weight-bold`: 700 |
| Line heights | `--line-height-solid`: 1; `--line-height-tight`: 1.2; `--line-height-normal`: 1.4; `--line-height-reading`: 1.5 |
| Letter spacing | `--letter-spacing-normal`: 0; `--letter-spacing-label`: 0.04em; `--letter-spacing-status`: 0.06em |

| Semantic role | Family | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Display | Sans | 2rem | 700 | 1.2 | 0 |
| Dialog title | Sans | 1.25rem | 700 | 1.2 | 0 |
| Section title | Sans | 0.875rem | 700 | 1.2 | 0.04em |
| Body | Sans | 1rem | 400 | 1.5 | 0 |
| Small body | Sans | 0.875rem | 400 | 1.5 | 0 |
| Standard control | Sans | 0.875rem | 700 | 1.2 | 0 |
| Dense control | Sans | 0.75rem | 700 | 1.2 | 0 |
| Label | Sans | 0.75rem | 700 | 1.2 | 0.04em |
| Value | Sans | 0.875rem | 700 | 1.2 | 0 |
| Caption | Sans | 0.75rem | 400 | 1.4 | 0 |
| Monospace diagnostic | Mono | 0.75rem | 400 | 1.4 | 0 |
| Fluid tab | Sans | `clamp(0.875rem, min(2.2dvh, 5cqi), 1.125rem)` | 700 | 1.2 | 0 |
| Notation label | Sans | 0.875rem default | 700 | 1 | 0 |
| User annotation | Sans | 1rem default | 400 default | 1.2 | 0 |

Semantic text colours are `--text-color-primary`, `--text-color-secondary`, `--text-color-on-accent`, `--text-color-inverse`, `--text-color-danger`, `--text-color-notation`, `--text-color-notation-inverse`, and `--text-color-notation-outline`. Theme-aware colours alias the existing palette. Canvas colours are resolved through `src/services/typographyService.ts`.

The package imports `@mlt/font-atkinson/index.css`, which registers real 400/700 normal and italic WOFF2 faces. Former 500/600 application declarations were mapped to 400 or 700 by semantic purpose; tab width measurement now measures the actual computed semantic weight.

## Migration ledger

Typography is summarized as `family; size; weight; line-height; letter-spacing; colour/effects`.

| Text context or component | Current source file | Current declared or computed typography | Semantic role | Migration status | Rendering context | Specialized exception / constraint |
| --- | --- | --- | --- | --- | --- | --- |
| Document defaults and ordinary copy | `style/base/globals.css`, `style/base/typography.css` | Sans; 1rem; 400; 1.5; 0; primary | Body | Complete | DOM | Global inheritance is now the ordinary-copy baseline. |
| Loading title, progress, status, and fatal errors | `style/components/loadingScreen.css`, `src/core/main.ts` | Display 2rem/700; diagnostic 0.75rem/400; small body 0.875rem/400; inverse/danger colours | Display / Diagnostic / Small body | Complete | Responsive DOM | Mobile title remains 1.5rem; loading animation and translucent inverse colours remain intentional. |
| Pre-JavaScript loading fallback | `apps/student-notation/index.html`, `apps/hub/student-notation/index.html` | Inline mirrors of display, diagnostic, and small-body metrics | Display / Diagnostic / Small body | Complete mirror | Responsive DOM | Must exist before package CSS loads, so this is an unavoidable duplicated fallback. |
| Sidebar application and section titles | `style/layout/sidebarLayout.css` | Section title; 0.875rem; 700; 1.2; 0.04em; secondary | Section title | Complete | DOM | Uppercase section treatment remains. |
| Sidebar actions and theme toggle | `style/layout/sidebarLayout.css` | Standard/dense controls; 0.875/0.75rem; 700; 1.2; 0; state colours | Standard / Dense control | Complete | DOM | Selected, disabled, and focus geometry remains local. |
| Sidebar labels, values, and shortcuts | `style/layout/sidebarLayout.css` | Label/value/caption/diagnostic role metrics; palette colours | Label / Value / Caption / Diagnostic | Complete | Responsive DOM | Shortcut key caps remain monospace; removed the extra mobile font shrink to preserve a 12px minimum. |
| Main, pitch, timbre, preset, and rhythm tabs | `style/layout/secondaryToolbarLayout.css`, `style/components/buttons/{pitch,timbre,rhythm}/*`, `src/svelte-ui/tabs/tabBridgeSync.ts` | Fluid tab clamp; 700; 1.2; 0; state colours | Fluid tab | Complete | Responsive DOM | Container/viewport bounded sizing and bridge-width measurement remain geometry-aware. |
| Primary toolbar controls | `style/layout/primaryToolbarLayout.css`, `style/components/buttons/toolbar/toolbarButtons.css` | Dense control; 0.75rem; 700; 1.2; 0 | Dense control | Complete | Responsive DOM | Icon geometry is not treated as text typography. |
| Standard buttons and form controls | `style/base/typography.css`, component stylesheets | Standard control; 0.875rem; 700; 1.2; 0; semantic state colours | Standard control | Complete | DOM | Inputs use the control family/size with regular body weight where editable copy benefits from it. |
| Pitch labels, harmony presets, degree and chord controls | `style/components/buttons/pitch/pitchTabButtons.css`, `style/components/secondaryToolbarTools/{chordTools,degreeToggles,tonicControls}.css` | Notation label role with primitive-bounded clamps; captions/labels for metadata | Notation label / Label / Caption | Complete | Responsive DOM | Music symbols retain geometry-driven sizes. |
| Rhythm preset labels and macrobeat glyphs | `style/components/buttons/rhythm/rhythmTabButtons.css` | Notation role; preset clamp bounded by 0.875-1.125rem; macrobeat clamp 2-3.8rem, line 0.9 | Notation label | Complete with exception | Responsive DOM | Large macrobeat glyph scale and sub-unit line height are intrinsic to the notation control. |
| Clef and draw controls | `style/components/secondaryToolbarTools/{clefControls,drawTools}.css` | Labels, dense controls, captions, and notation roles | Mixed semantic roles | Complete | Responsive DOM | Clef glyph size and 0.7em super/subscript with line-height 0 remain intentional. |
| Harmonics, ADSR, waveform, tempo, and time-signature controls | `style/components/secondaryToolbarTools/*.css` | Label/value/caption/dense-control role metrics | Mixed semantic roles | Complete | Responsive DOM | The 7px tempo step glyph remains a fixed-height geometry exception. |
| JavaScript-generated effect labels and values | `src/components/audio/effects/effectsController.ts`, `style/components/buttons/timbre/timbreTabButtons.css` | Inline typography removed; label/value semantic CSS | Label / Value | Complete | DOM | Runtime positioning remains inline; typography does not. |
| Draggable numeric values | `src/svelte-ui/ui/DraggableNumber.svelte`, `src/components/ui/draggableNumber.ts` | Value role in app mode; dynamic `minDimension / 2` px in reusable non-app mode | Value | Complete with exception | Responsive DOM | Non-app size remains driven by host geometry. |
| Cartesian slider labels | `style/components/secondaryToolbarTools/cartesianSlider.css`, `src/svelte-ui/ui/CartesianSlider.svelte` | Label/caption roles around the text-free SVG control | Label / Caption | Complete | Responsive DOM | Axis labels remain positioned around a geometry-driven two-dimensional control. |
| Mobile pocket console | `style/layout/mobilePocketConsole.css` | Control family/weight/line-height with primitive-bounded viewport clamps | Label / Value / Control | Complete with exception | Responsive DOM | Mobile hierarchy intentionally retains its three fluid size functions and status tracking. |
| Button grid, left legend controls, and note bank | `style/components/gridComponents/*.css`, `style/components/primaryTools/noteBank.css` | Dense/notation roles with container- and cell-calculated sizes | Dense control / Notation label | Complete with exception | Responsive DOM | Fixed cell fit, octave digit scaling, and solid line-height remain geometry-dependent. |
| Drum editor dialog | `style/layout/gridsLayout.css` | Dialog title, body, small body, label, value, caption, and control roles | Mixed semantic roles | Complete | Responsive DOM | Dialog close glyph retains a 1.25rem primitive size. |
| Drum row labels | `style/layout/gridsLayout.css` | Notation family/line/spacing; size `row-height * 0.42`; selected size `* 0.52`, weight 800 | Notation label | Complete with exception | Responsive DOM | Row-height calculation and 800 selected emphasis are deliberate visual encodings. |
| Tempo-modulation DOM overlay | `style/layout/gridsLayout.css` | Notation role; `clamp(1rem, 2.55cqi, 1.55rem)`; line 0.92; 0.05em | Notation label | Complete with exception | Responsive DOM | Marker geometry requires the local line box and tracking. |
| Notification dialog and handoff feedback | `src/svelte-ui/ui/NotificationModal.svelte`, toolbar bridge components | Dialog title/body/small-body/control roles; semantic palette | Dialog title / Body / Control | Complete and consolidated | DOM | One Svelte notification API now handles alerts, confirms, and detail lists. |
| Print preview dialog | `style/components/printPreview/printPreview.css` | Dialog title, label, diagnostic, section, small-body, caption roles | Mixed semantic roles | Complete | DOM | Print canvas output remains separate from the on-screen dialog. |
| Zoom/transient viewport feedback | `packages/ui-components/src/overlays/ViewportInfoToast.svelte` | Diagnostic role variables with safe fallbacks; inverse colour | Diagnostic | Complete | DOM | High-contrast overlay remains intentionally inverse. |
| ADSR grid labels | `src/components/audio/adsr/adsrRender.ts` | SVG value role at 1.5rem; 700; secondary colour; opacity 0.3 | Value | Complete | SVG | SVG has no useful DOM line box; position remains attribute-driven. |
| Static waveform axes | `src/components/staticWaveform/waveformVisualizer.ts` | Canvas caption role; 0.75rem/400; secondary colour | Caption | Complete | Canvas | Canvas has no inherited styles or line boxes. |
| Pitch-grid preview text | `src/components/canvas/PitchGrid/interactors/pitchGridInteractor.ts` | Canvas caption font; marker colour retained | Caption | Complete | Canvas | Position and alpha remain preview-state inputs. |
| Pitch legend labels | `src/components/canvas/PitchGrid/renderers/{legend,legendTextRendering}.ts` | Canvas notation family/700; cell-fitted px size; inverse fill; notation outline via `strokeText` | Notation label | Complete with exception | Canvas | Outline, fitted size, device-pixel snapping, and centered baseline are accessibility/geometry requirements. |
| Note pitch/degree labels | `src/components/canvas/PitchGrid/renderers/notes.ts` | Canvas notation family/700; calculated px sizes; notation colour | Notation label | Complete with exception | Canvas | Minimum cutoff, multiline accidental spacing, and optical offsets remain specialized. |
| Tonic sign number | `src/components/canvas/PitchGrid/renderers/notes.ts` | Canvas notation family/700; `radius * 1.5` px; notation colour | Notation label | Complete with exception | Canvas | Size is intrinsic to tonic-circle geometry. |
| Tempo-modulation canvas label | `src/components/canvas/PitchGrid/renderers/modulationRenderer.ts` | Canvas notation role default 0.875rem/700; notation colour | Notation label | Complete | Canvas | Pill dimensions continue to derive from measured text. |
| Editable annotation overlay | `src/services/annotationService.ts` | Semantic annotation family/line/spacing; stored px size, colour, bold/italic/underline; super/subscript 60% | User annotation | Complete | Annotation DOM | User settings are authoritative. |
| Rendered annotation text | `src/components/canvas/PitchGrid/renderers/annotationRenderer.ts`, `src/services/annotationService.ts` | Canvas semantic annotation family and line-height ratio; same stored formatting as editor | User annotation | Complete | Annotation canvas | Real italic/bold faces can change wrapping; editor/canvas parity needs visual validation. |
| Standalone tonic-shape SVG assets | `public/assets/tabicons/tonicShape_*.svg` | Self-contained bold Atkinson OTF registration and fixed SVG text geometry | Notation label | Retained asset exception | Standalone SVG image | SVGs loaded as images cannot inherit the application's package CSS; their embedded face keeps them portable. |
| Engine canvas renderer exports | `packages/student-notation-engine/src/canvas/*` | Existing framework-independent fallback canvas typography | Notation label | Retained API exception | Canvas | Not used by the Student Notation UI render path; coupling the engine to UI CSS would violate the package boundary. Future consumers should inject renderer typography. |
| Typography specimen | `src/dev/TypographySpecimen.svelte`, `src/dev/mountTypographySpecimen.ts`, `src/index.ts` | Every semantic role and computed metrics, light/dark and interaction states | All roles | Complete, development only | Responsive DOM | Available only in development with `?typographySpecimen=1`. |

## Renderer bridge and invalidation

`src/services/typographyService.ts` resolves semantic custom properties through a hidden DOM probe, converts rem/clamp results to pixels, builds canvas font declarations, exposes semantic text colours, and applies semantic SVG styles. Results are cached. Changes to root/body class or style and completion of font loading clear the cache and emit a typography-change event; the grid manager and waveform renderer redraw through their existing render methods.

DOM letter spacing is supported normally. SVG receives letter spacing through style properties. Canvas font shorthand does not consistently support letter spacing across target browsers, so current canvas roles use zero tracking; specialized visible tracking is retained in DOM notation overlays. Canvas line height is implemented only where a renderer lays out multiple lines.

## Validation and visual review

The development specimen is the token-level review surface. Application review should additionally cover:

- both themes at wide desktop, constrained-height desktop, and narrow/mobile widths;
- sidebar labels, shortcut keys, all primary and secondary tab states, dense rhythm/pitch/timbre panels, and the drum editor;
- loading, notification, handoff, print-preview, error, focus, selected, and disabled states;
- pitch legends, note labels, tonic signs, modulation labels, waveform axes, and ADSR SVG labels at minimum and maximum zoom;
- annotation creation/editing/rendering with regular, bold, italic, bold italic, underline, wrapping, superscript, and subscript;
- text clipping, tab bridge seams, fixed-cell alignment, modal overflow, and canvas/DOM annotation metric parity.
