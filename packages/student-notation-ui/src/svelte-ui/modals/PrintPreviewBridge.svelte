<script lang="ts">
  import { onMount } from 'svelte';
  import store from '@state/initStore.ts';
  import { preparePrintDocument, pageImageSource, printPreparedDocument, disposePrintFrame, type PrintDocument } from '@services/printService.ts';
  import type { PrintOptions } from '@mlt/types';

  // Preserve the bridge: controls live in template.html, score state lives in the engine.
  let prepared = $state.raw<PrintDocument | null>(null);
  let printing = $state(false);

  onMount(() => {
    const overlay = document.getElementById('print-preview-overlay')!;
    const pages = document.getElementById('print-preview-pages')!;
    const summary = document.getElementById('print-line-summary')!;
    const message = document.getElementById('print-message')!;
    const confirm = document.getElementById('print-confirm-button') as HTMLButtonElement;
    const close = document.getElementById('print-close-button') as HTMLButtonElement;
    const panel = document.getElementById('print-options') as HTMLFieldSetElement;
    const select = (id: string): HTMLSelectElement => document.getElementById(id) as HTMLSelectElement;
    const input = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;
    const controller = new AbortController();
    const listen = (element: HTMLElement, event: string, handler: EventListener): void => {
      element.addEventListener(event, handler, { signal: controller.signal });
    };
    let previouslyFocused: HTMLElement | null = null;
    let scheduled = false;
    let destroyed = false;
    const toggles = [
      ['print-button-grid', 'includeButtonGrid'], ['print-drums', 'includeDrums'],
      ['print-left-legend', 'includeLeftLegend'], ['print-right-legend', 'includeRightLegend']
    ] as const;
    const selects = [
      ['print-page-size', 'pageSize'], ['print-orientation', 'orientation'], ['print-color-mode', 'colorMode'],
      ['print-pagination', 'pagination'], ['print-pitch-range', 'pitchRangeMode']
    ] as const;
    const edges = ['top', 'bottom', 'left', 'right'] as const;

    function updateControls(): void {
      const options = store.state.printOptions;
      const values = { ...options, pagination: options.pagination ?? 'fit', pitchRangeMode: options.pitchRangeMode ?? 'score' };
      for (const [id, key] of selects) select(id).value = values[key];
      input('print-notation-size').value = String(options.notationSize ?? 100);
      for (const [id, key] of toggles) input(id).checked = options[key];
      for (const edge of edges) {
        const value = edge === 'top' ? options.cropTop : edge === 'bottom' ? 1 - options.cropBottom : edge === 'left' ? options.cropLeft : 1 - options.cropRight;
        input('print-crop-' + edge).value = String(Math.round(value * 100));
      }
      const bars = select('print-bars-per-line');
      const current = options.barsPerLine ?? 0;
      const count = Math.max(1, prepared?.barCount ?? 0, current);
      if (bars.options.length !== count + 1) {
        bars.replaceChildren(...Array.from({ length: count + 1 }, (_, value) => {
          const option = document.createElement('option');
          option.value = String(value);
          option.textContent = value === 0 ? 'All bars (one line)' : String(value);
          return option;
        }));
      }
      bars.value = String(current);
    }

    function render(): void {
      scheduled = false;
      if (destroyed || !store.state.isPrintPreviewActive || printing) return;
      try {
        prepared = preparePrintDocument(store.state, store.state.printOptions);
        const doc = prepared;
        pages.replaceChildren(...doc.pages.map((page, index) => {
          const figure = document.createElement('figure');
          figure.className = 'print-page';
          figure.style.maxWidth = (page.width / 72 * 96) + 'px';
          const caption = document.createElement('figcaption');
          caption.textContent = 'Page ' + (index + 1) + ' of ' + doc.pages.length;
          const image = document.createElement('img');
          image.alt = 'Notation page ' + (index + 1);
          image.width = page.width;
          image.height = page.height;
          image.src = pageImageSource(page);
          figure.append(caption, image);
          return figure;
        }));
        summary.textContent = doc.barCount + (doc.barCount === 1 ? ' bar' : ' bars') + (doc.hasPickup ? ' + pickup' : '')
          + ' · ' + doc.lineCount + (doc.lineCount === 1 ? ' line' : ' lines')
          + ' · ' + doc.pages.length + (doc.pages.length === 1 ? ' page' : ' pages');
        message.textContent = doc.warnings.join(' ');
        confirm.disabled = false;
      } catch (error) {
        prepared = null;
        pages.replaceChildren();
        summary.textContent = '';
        message.textContent = error instanceof Error ? error.message : 'Unable to prepare the score.';
        confirm.disabled = true;
      }
      updateControls();
    }

    function scheduleRender(): void {
      if (!store.state.isPrintPreviewActive || printing) return;
      confirm.disabled = true;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(render);
    }

    function visibilityChanged(active?: boolean): void {
      if (active === undefined) return;
      if (active && overlay.classList.contains('hidden')) {
        previouslyFocused = document.activeElement as HTMLElement | null;
        overlay.classList.remove('hidden');
        overlay.removeAttribute('inert');
        overlay.setAttribute('aria-hidden', 'false');
        if (!store.state.isPrintPreviewActive) store.setPrintPreviewActive(true);
        render();
        close.focus();
      } else if (!active) {
        overlay.classList.add('hidden');
        overlay.setAttribute('inert', '');
        overlay.setAttribute('aria-hidden', 'true');
        prepared = null;
        pages.replaceChildren();
        previouslyFocused?.focus();
      }
    }

    async function print(): Promise<void> {
      if (printing || !prepared || scheduled) return;
      const documentToPrint = prepared;
      printing = true;
      confirm.disabled = true;
      panel.disabled = true;
      close.disabled = true;
      confirm.textContent = 'Preparing…';
      try {
        await printPreparedDocument(documentToPrint);
        message.textContent = 'The prepared pages were sent to the print dialog. You can print again or close this preview.';
      } catch (error) {
        message.textContent = error instanceof Error ? error.message : 'Unable to print. Please try again.';
      } finally {
        printing = false;
        confirm.disabled = false;
        panel.disabled = false;
        close.disabled = false;
        confirm.textContent = 'Print';
      }
    }

    for (const [id, key] of toggles) listen(input(id), 'change', () => store.setPrintOptions({ [key]: input(id).checked }));
    for (const [id, key] of selects) listen(select(id), 'change', () => store.setPrintOptions({ [key]: select(id).value } as Partial<PrintOptions>));
    listen(select('print-bars-per-line'), 'change', () => store.setPrintOptions({ barsPerLine: Number(select('print-bars-per-line').value) }));
    listen(input('print-notation-size'), 'change', () => {
      const value = input('print-notation-size').valueAsNumber;
      if (Number.isFinite(value)) store.setPrintOptions({ notationSize: Math.max(25, Math.min(200, value)) });
      else updateControls();
    });
    for (const edge of edges) listen(input('print-crop-' + edge), 'change', () => {
      const raw = input('print-crop-' + edge).valueAsNumber;
      if (!Number.isFinite(raw)) { updateControls(); return; }
      const value = Math.max(0, Math.min(45, raw)) / 100;
      store.setPrintOptions(edge === 'top' ? { cropTop: value } : edge === 'bottom' ? { cropBottom: 1 - value } : edge === 'left' ? { cropLeft: value } : { cropRight: 1 - value });
    });
    listen(document.getElementById('print-reset-crop')!, 'click', () => store.setPrintOptions({ cropTop: 0, cropBottom: 1, cropLeft: 0, cropRight: 1 }));
    listen(confirm, 'click', () => { void print(); });
    listen(close, 'click', () => store.setPrintPreviewActive(false));
    listen(overlay, 'keydown', event => {
      const key = event as KeyboardEvent;
      if (key.key === 'Escape' && !printing) { key.stopPropagation(); store.setPrintPreviewActive(false); }
      if (key.key === 'Tab') {
        const focusable = [...overlay.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled)')];
        const first = focusable[0], last = focusable.at(-1);
        if (key.shiftKey && document.activeElement === first) { key.preventDefault(); last?.focus(); }
        else if (!key.shiftKey && document.activeElement === last) { key.preventDefault(); first?.focus(); }
      }
    });
    const events = ['printOptionsChanged', 'notesChanged', 'rhythmStructureChanged', 'tempoModulationMarkersChanged',
      'tonicSignsChanged', 'annotationsChanged', 'sixteenthStampPlacementsChanged', 'tripletStampPlacementsChanged',
      'sixteenthThreeStampPlacementsChanged', 'stateLoaded', 'historyChanged', 'pitchRangeChanged',
      'degreeDisplayModeChanged', 'pitchLabelsChanged', 'pitchOctaveLabelsChanged', 'accidentalModeChanged',
      'octaveLabelsChanged', 'frequencyLabelsChanged', 'focusColoursChanged', 'longNoteStyleChanged'];
    store.on('printPreviewStateChanged', visibilityChanged);
    events.forEach(event => store.on(event, scheduleRender));
    return () => {
      destroyed = true;
      controller.abort();
      store.off('printPreviewStateChanged', visibilityChanged);
      events.forEach(event => store.off(event, scheduleRender));
      disposePrintFrame();
    };
  });
</script>

