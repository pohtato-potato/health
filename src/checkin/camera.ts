/** Camera helpers for check-in photos. Everything stays in the browser. */

export async function openCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser has no camera access.');
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
  });
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

const MAX_SIDE = 1400;

/** Draws the current video frame, mirrored for the front camera, as a JPEG. */
export async function grabFrame(video: HTMLVideoElement, mirror: boolean): Promise<{ blob: Blob; width: number; height: number }> {
  const w0 = video.videoWidth;
  const h0 = video.videoHeight;
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.round(w0 * k);
  const h = Math.round(h0 * k);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not save the photo.'))), 'image/jpeg', 0.86));
  return { blob, width: w, height: h };
}

/** Shrinks a photo from the camera app to the same size as in-app ones. */
export async function fromFile(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not read the photo.'))), 'image/jpeg', 0.86));
  return { blob, width: w, height: h };
}
