import { RequireSubscription } from "@/components/auth/RequireSubscription";
import { Card } from "@/components/Card";
import { RecoveryPlanForm } from "@/components/recovery-plan/RecoveryPlanForm";

export default function CreateRecoveryPlanPage() {
  return (
    <RequireSubscription requiredPlan="Standard">
    <section className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold uppercase text-emerald-700">Create Plan</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Tạo lộ trình phục hồi cá nhân hóa</h1>
      <Card className="mt-6">
        <RecoveryPlanForm />
      </Card>
    </section>
    </RequireSubscription>
  );
}
