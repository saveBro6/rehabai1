import { redirect } from "next/navigation";

export default function DoctorSchedulesPage() {
  redirect("/login?unsupported_role=doctor");
}
