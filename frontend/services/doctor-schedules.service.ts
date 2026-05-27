import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { DoctorScheduleSlot, DoctorScheduleStatus } from "@/types";

export function addMinutesToTime(time: string, minutes: number) {
  const [hours = 0, mins = 0] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, mins + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export async function getDoctorScheduleSlots(doctorId: string, limit?: number) {
  const supabase = getSupabase();
  let query = supabase
    .from("doctor_schedule_slots")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as DoctorScheduleSlot[];
}

export async function createDoctorScheduleSlot(doctorId: string, slotDate: string, startTime: string) {
  const endTime = addMinutesToTime(startTime, 60);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("doctor_schedule_slots")
    .insert({
      doctor_id: doctorId,
      slot_date: slotDate,
      start_time: startTime,
      end_time: endTime,
      status: "available"
    })
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as DoctorScheduleSlot;
}

export async function updateDoctorScheduleSlotStatus(id: string, status: DoctorScheduleStatus) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("doctor_schedule_slots")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as DoctorScheduleSlot;
}
