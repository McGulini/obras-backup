import JSZip from 'jszip';
import { ServicePhotoItem } from '../types';

/**
 * Safely fetches an image as an ArrayBuffer or Blob.
 * Handles data URLs (base64) as well as remote URLs (with canvas proxy fallback).
 */
async function getImageData(url: string): Promise<ArrayBuffer | null> {
  try {
    if (url.startsWith('data:')) {
      const base64Data = url.split(',')[1];
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    // Try standard fetch with CORS
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      return await response.arrayBuffer();
    }
  } catch (err) {
    console.warn('Direct fetch failed for photo, attempting canvas conversion:', err);
  }

  // Fallback via Image + Canvas to bypass CORS issues if possible
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(() => resolve(null));
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.85);
      } catch (canvasErr) {
        console.warn('Canvas export failed:', canvasErr);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Downloads a single photo with clean metadata filename.
 */
export async function downloadSinglePhoto(photo: ServicePhotoItem): Promise<void> {
  const dateFormatted = photo.date ? photo.date.split('-').reverse().join('-') : 'data';
  const teamClean = sanitizeFileName(photo.teamName || 'Equipe');
  const serviceClean = sanitizeFileName(photo.service || 'Servico');
  const fileName = `Foto_${teamClean}_${dateFormatted}_${serviceClean}_${photo.id.substring(0, 8)}.jpg`;

  try {
    const data = await getImageData(photo.url);
    if (data) {
      const blob = new Blob([data], { type: 'image/jpeg' });
      triggerBlobDownload(blob, fileName);
      return;
    }
  } catch (e) {
    console.warn('Blob download fallback:', e);
  }

  // Fallback anchor
  const a = document.createElement('a');
  a.href = photo.url;
  a.download = fileName;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Bundles multiple photos into a ZIP archive and triggers automatic download.
 */
export async function downloadPhotosZip(
  photos: ServicePhotoItem[],
  zipFileName: string,
  onProgress?: (percent: number, current: number, total: number) => void
): Promise<boolean> {
  if (!photos || photos.length === 0) return false;

  const zip = new JSZip();
  const folder = zip.folder('fotos_servicos') || zip;
  let successCount = 0;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (onProgress) {
      const pct = Math.round(((i + 1) / photos.length) * 90);
      onProgress(pct, i + 1, photos.length);
    }

    const data = await getImageData(photo.url);
    if (data) {
      const dateFormatted = photo.date ? photo.date.split('-').reverse().join('-') : 'data';
      const teamClean = sanitizeFileName(photo.teamName || 'Equipe');
      const serviceClean = sanitizeFileName(photo.service || 'Servico');
      const timeClean = photo.timeFormatted ? sanitizeFileName(photo.timeFormatted) : `${i + 1}`;
      const fileName = `${dateFormatted}_${teamClean}_${serviceClean}_${timeClean}_${i + 1}.jpg`;

      folder.file(fileName, data);
      successCount++;
    }
  }

  if (successCount === 0) {
    // If no images could be downloaded via binary, create a manifest info file
    const manifest = photos.map((p, idx) => ({
      index: idx + 1,
      date: p.date,
      time: p.timeFormatted,
      team: p.teamName,
      leader: p.leaderName,
      worksite: p.worksiteName,
      service: p.service,
      caption: p.caption,
      url: p.url,
    }));
    zip.file('info_fotos_servicos.json', JSON.stringify(manifest, null, 2));
  }

  if (onProgress) {
    onProgress(95, photos.length, photos.length);
  }

  const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      const totalPct = 90 + Math.round(metadata.percent * 0.1);
      onProgress(totalPct, photos.length, photos.length);
    }
  });

  const finalName = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`;
  triggerBlobDownload(content, finalName);

  if (onProgress) {
    onProgress(100, photos.length, photos.length);
  }

  return true;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
