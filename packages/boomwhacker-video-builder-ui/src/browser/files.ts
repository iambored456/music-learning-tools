type SaveTypeDescriptor = {
  description: string;
  mimeType: string;
  extensions: string[];
};

function downloadBlob(blob: Blob, fileName: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function saveBlobFile(
  blob: Blob,
  fileName: string,
  descriptor: SaveTypeDescriptor,
): Promise<void> {
  try {
    const picker = (window as Window & {
      showSaveFilePicker?: (options: Record<string, unknown>) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    }).showSaveFilePicker;

    if (!picker) {
      downloadBlob(blob, fileName);
      return;
    }

    const handle = await picker({
      suggestedName: fileName,
      types: [
        {
          description: descriptor.description,
          accept: {
            [descriptor.mimeType]: descriptor.extensions,
          },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    const maybeAbortError = error as { name?: string };
    if (maybeAbortError?.name === 'AbortError') {
      return;
    }
    downloadBlob(blob, fileName);
  }
}

export async function saveTextFile(
  text: string,
  fileName: string,
  descriptor: SaveTypeDescriptor,
): Promise<void> {
  const blob = new Blob([text], { type: descriptor.mimeType });
  await saveBlobFile(blob, fileName, descriptor);
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file as data URL.'));
    };
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        reject(new Error('The selected file could not be converted to a data URL.'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}
