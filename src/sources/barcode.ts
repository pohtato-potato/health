import type { Food } from '../domain/types';

/** The parts of an Open Food Facts product response that are read. */
export interface OffResponse {
  status?: number;
  code?: string;
  product?: {
    product_name?: string;
    brands?: string;
    nutrition_data_per?: string;
    nutriments?: Record<string, number | string | undefined>;
  };
}

export type ScannedFood = Pick<Food, 'name' | 'unit' | 'per' | 'kcal' | 'protein' | 'defaultAmount'>;

const num = (v: number | string | undefined) => (v === undefined || v === '' ? undefined : Number(v));

/** Maps an Open Food Facts product to a food per 100 g (or 100 ml). Null when it lacks calories. */
export function parseOffProduct(r: OffResponse): ScannedFood | null {
  const p = r.product;
  if (r.status !== 1 || !p) return null;
  const n = p.nutriments ?? {};
  const ml = p.nutrition_data_per === '100ml' || n['energy-kcal_100ml'] !== undefined;
  const kcal = num(ml ? n['energy-kcal_100ml'] : n['energy-kcal_100g']);
  if (kcal === undefined || !Number.isFinite(kcal)) return null;
  const protein = num(ml ? n.proteins_100ml : n.proteins_100g) ?? 0;
  const brand = p.brands?.split(',')[0]?.trim();
  const name = (p.product_name?.trim() || 'Scanned food') + (brand ? ` (${brand})` : '');
  return { name, unit: ml ? 'ml' : 'g', per: 100, kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10, defaultAmount: 100 };
}

interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (o: { formats: string[] }) => Detector;

/** Scanning needs the camera, the BarcodeDetector API and the internet; otherwise it is hidden. */
export function barcodeSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator.onLine && !!navigator.mediaDevices?.getUserMedia;
}

/** Looks a barcode up in Open Food Facts. */
export async function lookupBarcode(code: string): Promise<ScannedFood | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,nutrition_data_per`);
  if (!res.ok) return null;
  return parseOffProduct((await res.json()) as OffResponse);
}

/**
 * Reads one barcode from the camera into the given video element. Resolves with the code,
 * or null when stopped; always releases the camera.
 */
export async function scanBarcode(video: HTMLVideoElement, signal: AbortSignal): Promise<string | null> {
  const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
  const detector = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  try {
    video.srcObject = stream;
    await video.play();
    while (!signal.aborted) {
      const found = await detector.detect(video).catch(() => []);
      if (found[0]?.rawValue) return found[0].rawValue;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}
