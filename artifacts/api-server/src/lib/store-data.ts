import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

export type ProductRecord = {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
};

export type OrderRecord = {
  id: string;
  productId: string;
  productTitle: string;
  productImageUrl: string;
  amount: number;
  name: string;
  whatsapp: string;
  utr: string;
  status: "pending" | "confirmed";
  createdAt: string;
  firstKey: string | null;
  secondKey: string | null;
  secondKeyRequested: boolean;
};

export type SettingsRecord = {
  upiId: string;
  qrImageUrl: string;
};

const dataDir = path.resolve(import.meta.dirname, "../data");
const uploadsDir = path.join(dataDir, "uploads");
const files = {
  products: path.join(dataDir, "products.json"),
  orders: path.join(dataDir, "orders.json"),
  settings: path.join(dataDir, "settings.json"),
} as const;

let writeQueue = Promise.resolve();

export async function ensureStoreFiles(): Promise<void> {
  await mkdir(uploadsDir, { recursive: true });
  const seeds = [
    [files.products, "[]"],
    [files.orders, "[]"],
    [files.settings, JSON.stringify({ upiId: "", qrImageUrl: "" })],
  ] as const;
  await Promise.all(
    seeds.map(async ([file, initial]) => {
      try {
        await readFile(file, "utf8");
      } catch {
        await writeFile(file, initial, "utf8");
      }
    }),
  );
}

export async function readJson<T>(key: keyof typeof files): Promise<T> {
  await ensureStoreFiles();
  const content = await readFile(files[key], "utf8");
  return JSON.parse(content) as T;
}

export async function writeJson<T>(
  key: keyof typeof files,
  value: T,
): Promise<void> {
  const run = async (): Promise<void> => {
    await ensureStoreFiles();
    const destination = files[key];
    const temp = `${destination}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temp, destination);
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  await next;
}

export async function saveImageData(
  dataUrl: string,
  prefix: string,
): Promise<string> {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl,
  );
  if (!match) {
    throw new Error("Upload a PNG, JPG, or WebP image.");
  }
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error("Images must be 5 MB or smaller.");
  }
  await ensureStoreFiles();
  const filename = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await writeFile(path.join(uploadsDir, filename), bytes, { flag: "wx" });
  return `/api/uploads/${filename}`;
}

export const STORE_UPLOADS_DIR = uploadsDir;
