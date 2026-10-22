import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import express from "express";
import {
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderStatusParams,
  GetOrderStatusResponse,
  GetProductParams,
  GetProductResponse,
  GetStoreSettingsResponse,
  ListProductsResponse,
  RequestSecondKeyParams,
  RequestSecondKeyResponse,
} from "@workspace/api-zod";
import {
  readJson,
  writeJson,
  type OrderRecord,
  type ProductRecord,
  type SettingsRecord,
  STORE_UPLOADS_DIR,
} from "../lib/store-data";
import { seedProductsIfEmpty } from "../lib/store-seed";

const router: IRouter = Router();
const orderBodyParser = express.json({ limit: "8mb" });

function isSupportedDigitalProduct(product: ProductRecord): boolean {
  const details = `${product.title} ${product.description} ${product.category}`.toLowerCase();
  const isVoucherOrTopUp = /\btop[\s-]?up\b|\bvoucher\b|\bgift card\b/.test(details);
  const mentionsAccountCredentials = /\baccount\b|\bpassword\b|\blogin\b|\brecovery\b|\botp\b|\bid\s*pass\b/.test(details);
  return isVoucherOrTopUp && !mentionsAccountCredentials;
}

function storefrontProduct(product: ProductRecord): ProductRecord {
  return {
    ...product,
    inStock: product.inStock && isSupportedDigitalProduct(product),
  };
}

router.use("/uploads", express.static(STORE_UPLOADS_DIR, { fallthrough: true }));

router.get("/store/products", async (_req, res): Promise<void> => {
  await seedProductsIfEmpty();
  const products = await readJson<ProductRecord[]>("products");
  res.json(ListProductsResponse.parse(products.map(storefrontProduct)));
});

router.get("/store/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await seedProductsIfEmpty();
  const products = await readJson<ProductRecord[]>("products");
  const product = products.find((item) => item.id === params.data.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(storefrontProduct(product)));
});

router.get("/store/settings", async (_req, res): Promise<void> => {
  const settings = await readJson<SettingsRecord>("settings");
  res.json(GetStoreSettingsResponse.parse(settings));
});

router.post("/store/orders", orderBodyParser, async (req, res): Promise<void> => {
  const body = CreateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await seedProductsIfEmpty();
  const products = await readJson<ProductRecord[]>("products");
  const product = products.find((item) => item.id === body.data.productId);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (!isSupportedDigitalProduct(product)) {
    res.status(409).json({ error: "This store currently supports gaming top-up codes and e-vouchers only." });
    return;
  }
  if (!product.inStock) {
    res.status(409).json({ error: "This product is currently out of stock." });
    return;
  }
  const orders = await readJson<OrderRecord[]>("orders");
  const order: OrderRecord = {
    id: randomUUID(),
    productId: product.id,
    productTitle: product.title,
    productImageUrl: product.imageUrl,
    amount: product.price,
    name: body.data.name.trim(),
    whatsapp: body.data.whatsapp.trim(),
    utr: body.data.utr,
    status: "pending",
    createdAt: new Date().toISOString(),
    firstKey: null,
    secondKey: null,
    secondKeyRequested: false,
  };
  orders.unshift(order);
  await writeJson("orders", orders);
  res.status(201).json(CreateOrderResponse.parse(order));
});

router.get("/store/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const orders = await readJson<OrderRecord[]>("orders");
  const order = orders.find((item) => item.id === params.data.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderStatusResponse.parse(order));
});

router.post(
  "/store/orders/:id/request-second-key",
  async (req, res): Promise<void> => {
    const params = RequestSecondKeyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const orders = await readJson<OrderRecord[]>("orders");
    const index = orders.findIndex((item) => item.id === params.data.id);
    if (index < 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (orders[index].status !== "confirmed") {
      res.status(409).json({ error: "Payment must be confirmed first." });
      return;
    }
    if (!orders[index].secondKeyRequested) {
      orders[index] = { ...orders[index], secondKeyRequested: true };
      await writeJson("orders", orders);
    }
    res.json(RequestSecondKeyResponse.parse(orders[index]));
  },
);

export default router;
