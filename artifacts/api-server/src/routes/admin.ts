import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import express from "express";
import {
  AdminLoginBody,
  AdminLoginResponse,
  AdminLogoutResponse,
  ConfirmOrderBody,
  ConfirmOrderParams,
  ConfirmOrderResponse,
  DeliverSecondKeyBody,
  DeliverSecondKeyParams,
  DeliverSecondKeyResponse,
  GetAdminSessionResponse,
  ListOrdersResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  UpdateStoreSettingsBody,
  UpdateStoreSettingsResponse,
} from "@workspace/api-zod";
import {
  readJson,
  saveImageData,
  writeJson,
  type OrderRecord,
  type ProductRecord,
  type SettingsRecord,
} from "../lib/store-data";
import { seedProductsIfEmpty } from "../lib/store-seed";

const router: IRouter = Router();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const adminBodyParser = express.json({ limit: "8mb" });
const COOKIE_NAME = "ajay_admin";
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function constantTimeMatches(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    const paddedLeft = Buffer.alloc(Math.max(left.length, right.length));
    const paddedRight = Buffer.alloc(Math.max(left.length, right.length));
    left.copy(paddedLeft);
    right.copy(paddedRight);
    timingSafeEqual(paddedLeft, paddedRight);
    return false;
  }
  return timingSafeEqual(left, right);
}

function isAdmin(req: Request): boolean {
  return req.signedCookies?.[COOKIE_NAME] === "admin";
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required." });
    return;
  }
  next();
}

function orderById(
  orders: OrderRecord[],
  id: string,
): { order?: OrderRecord; index: number } {
  const index = orders.findIndex((item) => item.id === id);
  return { order: index < 0 ? undefined : orders[index], index };
}

router.post("/admin/login", adminBodyParser, async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const now = Date.now();
  const address = req.ip || "unknown";
  const attempts = loginAttempts.get(address);
  if (attempts && attempts.resetAt > now && attempts.count >= MAX_LOGIN_ATTEMPTS) {
    res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
    return;
  }
  const valid =
    constantTimeMatches(parsed.data.username, "admin") &&
    constantTimeMatches(parsed.data.password, process.env.ADMIN_PASSWORD ?? "ajay123");
  if (!valid) {
    const next = !attempts || attempts.resetAt <= now
      ? { count: 1, resetAt: now + LOGIN_WINDOW_MS }
      : { ...attempts, count: attempts.count + 1 };
    loginAttempts.set(address, next);
    res.status(401).json({ error: "Incorrect username or password." });
    return;
  }
  loginAttempts.delete(address);
  res.cookie(COOKIE_NAME, "admin", {
    signed: true,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
  res.json(AdminLoginResponse.parse({ authenticated: true }));
});

router.post("/admin/logout", (_req, res): void => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json(AdminLogoutResponse.parse({ authenticated: false }));
});

router.get("/admin/session", (req, res): void => {
  res.json(GetAdminSessionResponse.parse({ authenticated: isAdmin(req) }));
});

router.get("/admin/orders", requireAdmin, async (_req, res): Promise<void> => {
  const orders = await readJson<OrderRecord[]>("orders");
  res.json(ListOrdersResponse.parse(orders));
});

router.patch(
  "/admin/products/:id",
  requireAdmin,
  adminBodyParser,
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(req.params);
    const body = UpdateProductBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    await seedProductsIfEmpty();
    const products = await readJson<ProductRecord[]>("products");
    const index = products.findIndex((item) => item.id === params.data.id);
    if (index < 0) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const imageUrl = body.data.imageData
      ? await saveImageData(body.data.imageData, "product")
      : products[index].imageUrl;
    const updated: ProductRecord = {
      ...products[index],
      title: body.data.title.trim(),
      description: body.data.description.trim(),
      price: body.data.price,
      originalPrice: body.data.originalPrice,
      imageUrl,
      category: body.data.category.trim(),
      inStock: body.data.inStock,
    };
    products[index] = updated;
    await writeJson("products", products);
    const orders = await readJson<OrderRecord[]>("orders");
    await writeJson(
      "orders",
      orders.map((order) =>
        order.productId === updated.id
          ? { ...order, productTitle: updated.title, productImageUrl: updated.imageUrl }
          : order,
      ),
    );
    res.json(UpdateProductResponse.parse(updated));
  },
);

router.put(
  "/admin/settings",
  requireAdmin,
  adminBodyParser,
  async (req, res): Promise<void> => {
    const body = UpdateStoreSettingsBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const current = await readJson<SettingsRecord>("settings");
    let qrImageUrl = current.qrImageUrl;
    if (body.data.qrImageData) {
      qrImageUrl = await saveImageData(body.data.qrImageData, "qr");
    }
    const updated = { upiId: body.data.upiId.trim(), qrImageUrl };
    await writeJson("settings", updated);
    res.json(UpdateStoreSettingsResponse.parse(updated));
  },
);

router.post(
  "/admin/orders/:id/confirm",
  requireAdmin,
  adminBodyParser,
  async (req, res): Promise<void> => {
    const params = ConfirmOrderParams.safeParse(req.params);
    const body = ConfirmOrderBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const orders = await readJson<OrderRecord[]>("orders");
    const { order, index } = orderById(orders, params.data.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.status !== "confirmed") {
      orders[index] = {
        ...order,
        status: "confirmed",
        firstKey: body.data.key.trim(),
      };
      await writeJson("orders", orders);
    }
    res.json(ConfirmOrderResponse.parse(orders[index]));
  },
);

router.post(
  "/admin/orders/:id/second-key",
  requireAdmin,
  adminBodyParser,
  async (req, res): Promise<void> => {
    const params = DeliverSecondKeyParams.safeParse(req.params);
    const body = DeliverSecondKeyBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const orders = await readJson<OrderRecord[]>("orders");
    const { order, index } = orderById(orders, params.data.id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.status !== "confirmed" || !order.secondKeyRequested) {
      res.status(409).json({ error: "The customer must request the second key first." });
      return;
    }
    orders[index] = { ...order, secondKey: body.data.key.trim() };
    await writeJson("orders", orders);
    res.json(DeliverSecondKeyResponse.parse(orders[index]));
  },
);

export default router;
