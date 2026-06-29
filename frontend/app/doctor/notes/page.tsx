import { redirect } from "next/navigation";

export default function DoctorNotesPage() {
  redirect("/login?unsupported_role=doctor");
}
