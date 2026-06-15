import type { Doctor } from "@/types";

export function getDoctorReviewCount(doctor?: Pick<Doctor, "review_count"> | null) {
  return Number(doctor?.review_count || 0);
}

export function getDoctorAverageRating(doctor?: Pick<Doctor, "average_rating"> | null) {
  if (doctor?.average_rating === null || doctor?.average_rating === undefined) return null;
  const value = Number(doctor.average_rating);
  return Number.isFinite(value) ? value : null;
}

export function getDoctorRatingLabel(doctor?: Pick<Doctor, "average_rating" | "review_count"> | null) {
  const reviewCount = getDoctorReviewCount(doctor);
  const averageRating = getDoctorAverageRating(doctor);

  if (!reviewCount || averageRating === null) return "Chưa có đánh giá";

  return `${averageRating.toFixed(1)} (${reviewCount} đánh giá)`;
}
