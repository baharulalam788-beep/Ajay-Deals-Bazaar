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
  stockCodes?: StockCodeRecord[];
};

export type StockCodeRecord = {
  code: string;
  soldOrderId: string | null;
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

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

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
  return enqueueWrite(async () => {
    await ensureStoreFiles();
    const destination = files[key];
    const temp = `${destination}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temp, destination);
  });
}

export function normalizeStockCodes(product: ProductRecord): StockCodeRecord[] {
  return Array.from({ length: 5 }, (_, index) => (
    product.stockCodes?.[index] ?? { code: "", soldOrderId: null }
  ));
}

export function productStockCounts(product: ProductRecord): {
  stockAvailable: number;
  stockTotal: number;
} {
  const stockCodes = normalizeStockCodes(product);
  return {
    stockAvailable: stockCodes.filter((slot) => slot.code.trim() && !slot.soldOrderId).length,
    stockTotal: stockCodes.filter((slot) => slot.code.trim()).length,
  };
}

export function publicProduct(product: ProductRecord) {
  const { stockCodes: _privateStockCodes, ...safeProduct } = product;
  const counts = productStockCounts(product);
  return {
    ...safeProduct,
    inStock: product.inStock && counts.stockAvailable > 0,
    ...counts,
  };
}

export type StoreTransactionState = {
  products: ProductRecord[];
  orders: OrderRecord[];
};

export async function transactStore<T>(
  operation: (state: StoreTransactionState) => {
    products?: ProductRecord[];
    orders?: OrderRecord[];
    result: T;
  },
): Promise<T> {
  return enqueueWrite(async () => {
    await ensureStoreFiles();
    const [productsContent, ordersContent] = await Promise.all([
      readFile(files.products, "utf8"),
      readFile(files.orders, "utf8"),
    ]);
    const state = {
      products: JSON.parse(productsContent) as ProductRecord[],
      orders: JSON.parse(ordersContent) as OrderRecord[],
    };
    const change = operation(state);
    for (const key of ["products", "orders"] as const) {
      const value = change[key];
      if (value === undefined) continue;
      const destination = files[key];
      const temp = `${destination}.${process.pid}.tmp`;
      await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      await rename(temp, destination);
    }
    return change.result;
  });
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
