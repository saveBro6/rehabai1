import { redirect } from "next/navigation";

export default function DoctorNotificationsPage() {
  redirect("/login?unsupported_role=doctor");
}
