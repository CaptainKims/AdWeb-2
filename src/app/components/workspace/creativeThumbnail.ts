/** Produce a small JPEG data URL for shelf thumbnails (best-effort). */
export async function generateCreativeThumbnail(file: File): Promise<string | undefined> {
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('img'));
        img.src = url;
      });
      const max = 160;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w <= 0 || h <= 0) return undefined;
      const r = Math.min(max / w, max / h, 1);
      w = Math.round(w * r);
      h = Math.round(h * r);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch {
      return undefined;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (file.type.startsWith('video/')) {
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      await new Promise<void>((res, rej) => {
        const t = window.setTimeout(() => rej(new Error('timeout')), 12000);
        video.onloadeddata = () => {
          window.clearTimeout(t);
          res();
        };
        video.onerror = () => {
          window.clearTimeout(t);
          rej(new Error('video'));
        };
      });
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
      video.currentTime = Math.min(0.35, dur * 0.08);
      await new Promise<void>((res, rej) => {
        const t = window.setTimeout(() => res(), 900);
        video.onseeked = () => {
          window.clearTimeout(t);
          res();
        };
        video.onerror = () => {
          window.clearTimeout(t);
          rej(new Error('seek'));
        };
      });
      const max = 160;
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 360;
      if (w <= 0 || h <= 0) return undefined;
      const r = Math.min(max / w, max / h, 1);
      w = Math.round(w * r);
      h = Math.round(h * r);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(video, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch {
      return undefined;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return undefined;
}
