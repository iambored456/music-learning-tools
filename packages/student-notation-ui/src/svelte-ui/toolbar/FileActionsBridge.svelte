<script lang="ts">
  /**
   * FileActionsBridge - Headless Svelte component
   *
   * This component attaches event handlers to existing file action buttons.
   * It's a bridge pattern that allows Svelte to manage file operations while
   * keeping the existing HTML structure intact.

   * Usage: Mount this component anywhere - it finds buttons by ID and attaches handlers.
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';
  import TransportService from '@services/initTransport.ts';
  import SynthEngine from '@services/initAudio.ts';
  import logger from '@utils/logger.ts';
  import {
    applyImportedStudentNotationData,
    generateStudentNotationFilename,
    parseImportedStudentNotationData,
    serializeStudentNotationScoreFile,
  } from '@services/studentNotationScoreFile.ts';

  // DOM element references
  let saveAsBtn: HTMLElement | null = null;
  let importBtn: HTMLElement | null = null;
  let printBtn: HTMLElement | null = null;
  let resetBtn: HTMLElement | null = null;

  async function saveWithPicker(blob: Blob): Promise<void> {
    try {
      const options = {
        suggestedName: generateStudentNotationFilename(),
        types: [{ description: 'Student Notation Score File', accept: { 'application/json': ['.json'] } }]
      };
      const handle = await (window as any).showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        logger.error('FileActionsBridge', 'Error saving file with picker', err, 'toolbar');
      }
    }
  }

  function saveWithLegacyLink(blob: Blob): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', generateStudentNotationFilename());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Event handlers
  async function handleSaveAs() {
    const scoreData = serializeStudentNotationScoreFile(store.state);
    const blob = new Blob([scoreData], { type: 'application/json;charset=utf-8;' });
    if ((window as any).showSaveFilePicker) {
      await saveWithPicker(blob);
    } else {
      saveWithLegacyLink(blob);
    }
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
        const content = readerEvent.target?.result as string;
        try {
          const imported = parseImportedStudentNotationData(content);
          TransportService.stop();
          SynthEngine.hardStopAllSound();
          applyImportedStudentNotationData(store, imported);
        } catch (error) {
          logger.warn('FileActionsBridge', 'Import failed', error, 'toolbar');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handlePrint() {
    document.body.classList.remove('sidebar-open');
    store.emit('printPreviewStateChanged', true);
  }

  function handleReset() {
    if (window.confirm('Are you sure you want to reset the canvas? This will clear all your work and cannot be undone.')) {
      store.clearSavedState();
    }
  }

  const handleSaveAsClick = () => void handleSaveAs();

  onMount(() => {
    // Find existing DOM elements
    saveAsBtn = document.getElementById('save-as-button');
    importBtn = document.getElementById('import-button');
    printBtn = document.getElementById('print-button');
    resetBtn = document.getElementById('reset-canvas-button');

    // Attach event listeners
    saveAsBtn?.addEventListener('click', handleSaveAsClick);
    importBtn?.addEventListener('click', handleImport);
    printBtn?.addEventListener('click', handlePrint);
    resetBtn?.addEventListener('click', handleReset);

  });

  onDestroy(() => {
    // Remove event listeners
    saveAsBtn?.removeEventListener('click', handleSaveAsClick);
    importBtn?.removeEventListener('click', handleImport);
    printBtn?.removeEventListener('click', handlePrint);
    resetBtn?.removeEventListener('click', handleReset);

  });
</script>

<!-- This is a headless component - no DOM output -->
