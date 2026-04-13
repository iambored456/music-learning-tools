# Tempogram Toolbox Core

This package ports the browser-safe DSP subset needed by Boomwhacker Video Builder from the local AudioLabs Erlangen Tempogram Toolbox source folder `MATLAB-Tempogram-Toolbox_1.0/MATLAB-Tempogram-Toolbox_1.0`.

Ported source functions in this package:

- `audio_to_spectrogram_via_STFT.m`
- `audio_to_noveltyCurve.m`
- `compute_fourierCoefficients.c`
- `noveltyCurve_to_tempogram_via_DFT.m`
- `tempogram_to_PLPcurve.m`

This package also adds a browser-oriented beat-picking helper on top of the PLP output for Boomwhacker Video Builder integration.

Important provenance note:

- The original bundled toolbox README states GPL v2 or later.
- This package is therefore marked `GPL-2.0-or-later`.
- The integration preset used for interactive browser beat detection reduces the novelty feature rate and tempo resolution versus the standalone validation package so analysis can complete locally in the browser without MATLAB or a backend.
