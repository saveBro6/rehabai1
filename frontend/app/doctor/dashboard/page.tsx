import { redirect } from "next/navigation";

export default function DoctorDashboardPage() {
  redirect("/login?unsupported_role=doctor");
}
