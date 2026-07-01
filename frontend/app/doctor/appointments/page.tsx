import { redirect } from "next/navigation";

export default function DoctorAppointmentsPage() {
  redirect("/login?unsupported_role=doctor");
}
