import { redirect } from "next/navigation";

export default function DoctorProfilePage() {
  redirect("/login?unsupported_role=doctor");
}
