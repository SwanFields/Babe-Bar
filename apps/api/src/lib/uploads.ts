import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";

export const uploadRoot = path.resolve("uploads");
const hostDir = path.join(uploadRoot, "hosts");
const menuDir = path.join(uploadRoot, "menu");
fs.mkdirSync(hostDir, { recursive: true });
fs.mkdirSync(menuDir, { recursive: true });

const extensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const limits = { fileSize: 3 * 1024 * 1024 };
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => cb(null, file.mimetype in extensions);
const randomName = (prefix: string, mimetype: string) => `${prefix}${crypto.randomBytes(16).toString("hex")}${extensions[mimetype]}`;

export const hostUpload = multer({
  storage: multer.diskStorage({ destination: hostDir, filename: (_req, file, cb) => cb(null, randomName("", file.mimetype)) }),
  limits,
  fileFilter
});

export const menuUpload = multer({
  storage: multer.diskStorage({ destination: menuDir, filename: (req, file, cb) => cb(null, randomName(`${req.params.category}-`, file.mimetype)) }),
  limits,
  fileFilter
});

export const menuCategories = ["food", "drinks"] as const;
export type MenuCategory = (typeof menuCategories)[number];
export const isMenuCategory = (value: unknown): value is MenuCategory => menuCategories.includes(value as MenuCategory);

async function menuFiles(category: MenuCategory) {
  const pattern = new RegExp(`^${category}(?:-[a-f0-9]{32})?\\.(?:jpg|png|webp)$`, "i");
  const names = (await fs.promises.readdir(menuDir)).filter((name) => pattern.test(name));
  return Promise.all(names.map(async (name) => ({ name, mtime: (await fs.promises.stat(path.join(menuDir, name))).mtimeMs })));
}

/** URL รูปเมนูล่าสุดของหมวด (ว่างถ้ายังไม่มี) */
export async function getMenuImageUrl(category: MenuCategory) {
  const [latest] = (await menuFiles(category)).sort((a, b) => b.mtime - a.mtime);
  return latest ? `/uploads/menu/${latest.name}` : "";
}

/** ลบรูปเมนูของหมวดนั้นทั้งหมด ยกเว้นไฟล์ keep */
export async function deleteMenuImages(category: MenuCategory, keep?: string) {
  const files = (await menuFiles(category)).filter((file) => file.name !== keep);
  await Promise.all(files.map((file) => fs.promises.unlink(path.join(menuDir, file.name))));
}
