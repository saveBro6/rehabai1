import { redirect } from "next/navigation";

export default function DoctorAppointmentDetailPage() {
  redirect("/login?unsupported_role=doctor");
}
