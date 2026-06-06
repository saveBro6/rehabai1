import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { DoctorPublicReview, DoctorReview, DoctorReviewSummary } from "@/types";

function normalizeSummary(row: DoctorReviewSummary): DoctorReviewSummary {
  return {
    doctor_id: row.doctor_id,
    average_rating: row.average_rating === null || row.average_rating === undefined ? null : Number(row.average_rating),
    review_count: Number(row.review_count || 0)
  };
}

export async function getDoctorReviewSummaries(doctorIds?: string[]) {
  const supabase = getSupabase();
  let query = supabase.from("doctor_review_summaries").select("*");

  if (doctorIds?.length) {
    query = query.in("doctor_id", doctorIds);
  }

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []).map((row) => normalizeSummary(row as DoctorReviewSummary));
}

export async function getDoctorReviewSummaryMap(doctorIds: string[]) {
  if (!doctorIds.length) return new Map<string, DoctorReviewSummary>();

  const summaries = await getDoctorReviewSummaries(doctorIds);
  return new Map(summaries.map((summary) => [summary.doctor_id, summary]));
}

export async function getDoctorPublicReviews(doctorId: string, limit = 5) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("doctor_public_reviews")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  assertNoSupabaseError(error);
  return (data || []).map((row) => ({
    ...row,
    rating: Number(row.rating)
  })) as DoctorPublicReview[];
}

export async function getDoctorReviewByAppointmentId(appointmentId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_doctor_review_by_appointment", {
    target_appointment_id: appointmentId
  });

  assertNoSupabaseError(error);
  return data ? ({ ...data, rating: Number(data.rating) } as DoctorReview) : null;
}

export async function getDoctorReviewsByAppointmentIds(appointmentIds: string[]) {
  if (!appointmentIds.length) return new Map<string, DoctorReview>();

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_doctor_reviews_by_appointments", {
    target_appointment_ids: appointmentIds
  });

  assertNoSupabaseError(error);
  const reviews = (data || []).map((row) => ({ ...row, rating: Number(row.rating) } as DoctorReview));
  return new Map(reviews.map((review) => [review.appointment_id, review]));
}

export async function createDoctorReview(appointmentId: string, rating: number, comment?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("create_doctor_review", {
    target_appointment_id: appointmentId,
    p_rating: rating,
    p_comment: comment?.trim() || null
  });

  assertNoSupabaseError(error);
  return data as DoctorReview;
}
