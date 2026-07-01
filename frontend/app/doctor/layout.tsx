import { redirect } from "next/navigation";

export default function Layout() {
  redirect("/login?unsupported_role=doctor");
}
