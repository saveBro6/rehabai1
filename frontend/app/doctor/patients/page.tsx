import { redirect } from "next/navigation";

export default function DoctorPatientsPage() {
  redirect("/login?unsupported_role=doctor");
}
