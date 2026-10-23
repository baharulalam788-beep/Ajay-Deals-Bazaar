import { readProducts, writeJson, type ProductRecord } from "./store-data";

const productSeeds: ProductRecord[] = [
  {
    id: "free-fire-100",
    title: "Free Fire 100 Diamonds",
    description: "Digital top-up voucher for 100 in-game diamonds.",
    price: 79,
    originalPrice: 99,
    images: ["/api/uploads/free-fire-100.svg"],
    category: "Gaming top-up",
    stock: 100,
    inStock: true,
    quantity: 100,
    isOutOfStock: false,
  },
  {
    id: "free-fire-520",
    title: "Free Fire 520 Diamonds",
    description: "Digital top-up voucher for 520 in-game diamonds.",
    price: 399,
    originalPrice: 499,
    images: ["/api/uploads/free-fire-520.svg"],
    category: "Gaming top-up",
    stock: 100,
    inStock: true,
    quantity: 100,
    isOutOfStock: false,
  },
  {
    id: "bgmi-uc",
    title: "BGMI 660 UC Voucher",
    description: "Digital voucher for 660 UC in Battlegrounds Mobile India.",
    price: 499,
    originalPrice: 599,
    images: ["/api/uploads/bgmi-uc.svg"],
    category: "Gaming top-up",
    stock: 100,
    inStock: true,
    quantity: 100,
    isOutOfStock: false,
  },
  {
    id: "google-play",
    title: "Google Play E-Voucher",
    description: "Digital Google Play gift voucher. Region and terms apply.",
    price: 250,
    originalPrice: 300,
    images: ["/api/uploads/google-play.svg"],
    category: "E-voucher",
    stock: 100,
    inStock: true,
    quantity: 100,
    isOutOfStock: false,
  },
  {
    id: "playstation",
    title: "PlayStation Store Wallet",
    description: "Digital PlayStation Store wallet voucher. Region and terms apply.",
    price: 999,
    originalPrice: 1199,
    images: ["/api/uploads/playstation.svg"],
    category: "E-voucher",
    stock: 100,
    inStock: true,
    quantity: 100,
    isOutOfStock: false,
  },
];

export async function seedProductsIfEmpty(): Promise<void> {
  const products = await readProducts();
  if (products.length === 0) {
    await writeJson("products", productSeeds);
  }
}
