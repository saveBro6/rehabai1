import { redirect } from "next/navigation";

export default function DoctorIndexPage() {
  redirect("/login?unsupported_role=doctor");
}
