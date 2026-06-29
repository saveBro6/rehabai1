import { redirect } from "next/navigation";

export default function DoctorChangePasswordPage() {
  redirect("/login?unsupported_role=doctor");
}
