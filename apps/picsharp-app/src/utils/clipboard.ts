import { invoke } from '@tauri-apps/api/core';

export async function parseClipboardImages(candidateFormat: string = 'png', tempDir: string) {
  return invoke<{
    success: boolean;
    paths?: string[];
    error?: string;
  }>('ipc_parse_clipboard_images', {
    candidateFormat,
    tempDir,
  });
}

export async function copyImage(path: string, sidecarOrigin: string) {
  return invoke<{ status: string; message: string }>('ipc_copy_image', {
    path,
    sidecarOrigin,
  });
}
