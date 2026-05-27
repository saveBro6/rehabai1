import { DoctorLayout } from "@/components/doctor/DoctorLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DoctorLayout>{children}</DoctorLayout>;
}
