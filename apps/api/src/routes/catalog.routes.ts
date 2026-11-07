import { Router } from "express";
import { reviewSchema } from "@babe-bar/shared";
import { asyncHandler } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { getMenuImageUrl } from "../lib/uploads";
import { requireAuth, requireRole, validate } from "../middleware";

/** ข้อมูลสาธารณะของร้าน: แพ็กเกจ โฮสต์ เมนู อีเวนต์ รีวิว */
export const catalogRoutes = Router();

catalogRoutes.get("/packages", asyncHandler(async (_req, res) => {
  res.json(await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }));
}));

catalogRoutes.get("/hosts", asyncHandler(async (_req, res) => {
  res.json(await prisma.host.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }));
}));

catalogRoutes.get("/events", asyncHandler(async (_req, res) => {
  res.json(await prisma.event.findMany({ where: { isActive: true }, orderBy: { startsAt: "asc" } }));
}));

catalogRoutes.get("/menu/images", asyncHandler(async (_req, res) => {
  res.json({ food: await getMenuImageUrl("food"), drinks: await getMenuImageUrl("drinks") });
}));

// ----- รีวิว -----
const reviewSummary = async () => {
  const summary = await prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } });
  return { averageRating: summary._avg.rating ?? 0, totalReviews: summary._count._all };
};
const toReviewDto = (r: { id: number; rating: number; comment: string; createdAt: Date; user: { username: string } }) => ({
  id: r.id,
  username: r.user.username,
  rating: r.rating,
  comment: r.comment,
  createdAt: r.createdAt
});

catalogRoutes.get("/reviews", asyncHandler(async (_req, res) => {
  const [reviews, summary] = await Promise.all([
    prisma.review.findMany({ include: { user: { select: { username: true } } }, orderBy: { createdAt: "desc" } }),
    reviewSummary()
  ]);
  res.json({ reviews: reviews.map(toReviewDto), ...summary });
}));

catalogRoutes.post("/reviews", requireAuth, requireRole("customer", "admin"), validate(reviewSchema), asyncHandler(async (req, res) => {
  const review = await prisma.review.create({
    data: { userId: req.user!.id, rating: req.body.rating, comment: req.body.comment },
    include: { user: { select: { username: true } } }
  });
  res.status(201).json({ review: toReviewDto(review), ...(await reviewSummary()) });
}));
