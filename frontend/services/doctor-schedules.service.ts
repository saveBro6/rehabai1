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

export function isFutureScheduleSlot(slot: Pick<DoctorScheduleSlot, "slot_date" | "start_time">) {
  const [year = 0, month = 1, day = 1] = slot.slot_date.split("-").map(Number);
  const [hours = 0, minutes = 0] = slot.start_time.split(":").map(Number);
  const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return start.getTime() > Date.now();
}

export async function getAvailableDoctorScheduleSlots(doctorId: string, limit = 12) {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("doctor_schedule_slots")
    .select("id,doctor_id,slot_date,start_time,end_time,status,created_at,updated_at")
    .eq("doctor_id", doctorId)
    .eq("status", "available")
    .gte("slot_date", today)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(limit);
  assertNoSupabaseError(error);

  return ((data || []) as DoctorScheduleSlot[]).filter(isFutureScheduleSlot);
}

export async function createDoctorScheduleSlot(doctorId: string, slotDate: string, startTime: string) {
  const supabase = getSupabase();
  void doctorId;
  const { data, error } = await supabase.rpc("create_doctor_schedule_slot", {
    target_slot_date: slotDate,
    target_start_time: startTime,
    duration_minutes: 60
  });
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
