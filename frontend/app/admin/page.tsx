"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { getAdminExercises } from "@/services/exercises.service";
import { getExerciseLogs } from "@/services/progress.service";
import { getProducts } from "@/services/products.service";
import { getRecoveryPlans } from "@/services/recovery-plans.service";
import { getSubscriptions } from "@/services/subscriptions.service";
import type { Exercise, ExerciseLog, Product, RecoveryPlan, Subscription } from "@/types";

export default function AdminPage() {
  const { pushToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productData, subscriptionData, exerciseData, planData, logData] = await Promise.all([
        getProducts(),
        getSubscriptions(),
        getAdminExercises(),
        getRecoveryPlans(),
        getExerciseLogs()
      ]);
      setProducts(productData);
      setSubscriptions(subscriptionData);
      setExercises(exerciseData);
      setPlans(planData);
      setLogs(logData);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Khong the tai du lieu admin.";
      setError(message);
      pushToast("Tai du lieu admin that bai", message);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  return (
    <RequireAdmin>
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
        <h1 className="text-3xl font-bold text-slate-950">Quan ly RehabAI</h1>
      </div>
      {error ? <Card className="border-rose-200 bg-rose-50"><p className="text-sm font-semibold text-rose-700">{error}</p></Card> : null}
      {loading ? <Card><p className="text-sm text-slate-500">Dang tai du lieu admin...</p></Card> : null}
      <AdminTable title="Products" rows={products} columns={[{ key: "name", label: "San pham" }, { key: "category", label: "Danh muc" }, { key: "stock_quantity", label: "Ton kho" }]} />
      <AdminTable title="Subscriptions" rows={subscriptions} columns={[{ key: "name", label: "Goi" }, { key: "price", label: "Gia" }, { key: "description", label: "Mo ta" }]} />
      <AdminTable title="Exercises" rows={exercises} columns={[{ key: "title", label: "Bai tap" }, { key: "category", label: "Loai" }, { key: "difficulty", label: "Do kho" }]} />
      <AdminTable title="Recovery Plans" rows={plans} columns={[{ key: "condition_type", label: "Tinh trang" }, { key: "recovery_goal", label: "Muc tieu" }, { key: "status", label: "Trang thai" }]} />
      <AdminTable title="Exercise Logs" rows={logs} columns={[{ key: "completed_at", label: "Hoan thanh" }, { key: "pain_level", label: "Dau" }, { key: "mobility_score", label: "Mobility" }]} />
    </section>
    </RequireAdmin>
  );
}
