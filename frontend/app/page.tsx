"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  LineChart,
  Route,
  ShieldCheck,
  ShoppingBag,
  Star,
  Stethoscope,
  UserRound
} from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getProtectedHref } from "@/lib/auth-navigation";
import { visiblePricingPlans } from "@/lib/subscription-access";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getDoctors } from "@/services/doctors.service";
import { getExercises } from "@/services/exercises.service";
import { getSubscriptions } from "@/services/subscriptions.service";
import type { Doctor, Exercise, Subscription } from "@/types";

const benefits = [
  { icon: ShieldCheck, title: "Giảm thời gian đi lại", text: "Theo dõi và tập luyện tại nhà với hướng dẫn rõ ràng hơn." },
  { icon: LineChart, title: "Theo dõi tiến trình phục hồi", text: "Ghi nhận buổi tập, mức đau và khả năng vận động theo thời gian." },
  { icon: Stethoscope, title: "Kết nối chuyên gia", text: "Đặt lịch tư vấn với bác sĩ và chuyên viên phục hồi phù hợp." },
  { icon: Route, title: "Bài tập phù hợp mục tiêu", text: "Lộ trình cá nhân hóa theo tình trạng, vùng cơ thể và độ khó." }
];

const services = [
  { icon: CalendarCheck, title: "Tư vấn bác sĩ/chuyên gia", text: "Hỗ trợ lên lịch tư vấn online khi người bệnh cần trao đổi sâu hơn." },
  { icon: Dumbbell, title: "Thư viện bài tập phục hồi", text: "Danh sách bài tập có mô tả, mức độ và vùng cơ thể dễ lọc." },
  { icon: Route, title: "Lộ trình tập luyện cá nhân hóa", text: "Tạo lịch tập phù hợp từng giai đoạn phục hồi." },
  { icon: LineChart, title: "Theo dõi tiến trình", text: "Quan sát sự thay đổi sau mỗi buổi tập để điều chỉnh an toàn." },
  { icon: ShoppingBag, title: "Dụng cụ hỗ trợ phục hồi", text: "Khám phá sản phẩm hỗ trợ tập luyện và sinh hoạt tại nhà." }
];

const faq = [
  ["RehabAI có thay thế bác sĩ không?", "Không. RehabAI hỗ trợ kết nối, theo dõi và cung cấp thông tin tham khảo; quyết định điều trị vẫn cần chuyên gia y tế."],
  ["Tôi có thể xem bài tập miễn phí không?", "Có. Guest có thể xem thư viện bài tập cơ bản, nhưng cần đăng nhập để xem hướng dẫn chi tiết."],
  ["Khi nào cần đăng nhập?", "Bạn cần đăng nhập khi tạo lộ trình, đặt lịch tư vấn, xem hồ sơ chi tiết, theo dõi tiến trình, mua hàng hoặc chọn gói."],
  ["Tôi có thể theo dõi tiến trình như thế nào?", "Sau khi đăng nhập, bạn có thể ghi nhận buổi tập, mức đau, độ mệt và điểm vận động để xem biểu đồ tiến trình."]
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [featuredDoctors, setFeaturedDoctors] = useState<Doctor[]>([]);
  const [featuredExercises, setFeaturedExercises] = useState<Exercise[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<Subscription[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);
  const createPlanHref = getProtectedHref(isAuthenticated, "/recovery-plan/create");
  const appointmentHref = getProtectedHref(isAuthenticated, "/appointments");
  const pricingHref = getProtectedHref(isAuthenticated, "/pricing");
  const pricingPlans = visiblePricingPlans(subscriptionPlans);

  useEffect(() => {
    let mounted = true;

    async function loadHighlights() {
      setLoadingHighlights(true);

      try {
        const [doctors, exercises, subscriptions] = await Promise.all([
          getDoctors(),
          getExercises({}),
          getSubscriptions()
        ]);

        if (!mounted) return;

        setFeaturedDoctors(doctors.slice(0, 3));
        setFeaturedExercises(exercises.slice(0, 3));
        setSubscriptionPlans(subscriptions);
      } catch {
        if (!mounted) return;

        setFeaturedDoctors([]);
        setFeaturedExercises([]);
        setSubscriptionPlans([]);
      } finally {
        if (mounted) {
          setLoadingHighlights(false);
        }
      }
    }

    void loadHighlights();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-white text-slate-800">
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">Phục hồi tại nhà chưa bao giờ dễ đến thế!</p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-emerald-950 md:text-6xl">Phục hồi sau đột quỵ và chấn thương tại nhà cùng RehabAI</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">RehabAI giúp bạn tiếp cận bác sĩ, bài tập phục hồi, lộ trình cá nhân hóa và theo dõi tiến trình ngay tại nhà.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={createPlanHref}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">Tạo lộ trình phục hồi</Button>
              </Link>
              <Link href="/exercises">
                <Button className="bg-emerald-600 hover:bg-emerald-700">Xem bài tập</Button>
              </Link>
              <Link href={appointmentHref}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">Tư vấn với bác sĩ</Button>
              </Link>
            </div>

          </div>
          <div className="relative">
            <Image
              src="/images/hero/rehab-care.jpg"
              alt="Bác sĩ hỗ trợ bệnh nhân phục hồi"
              width={1000}
              height={700}
              priority
              className="h-[420px] w-full rounded-lg object-cover shadow-2xl"
            />
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="font-bold text-emerald-900">Theo dõi phục hồi mỗi ngày</p>
              <p className="mt-1 text-sm text-slate-600">Bài tập, lịch hẹn và tiến trình được gom vào một trải nghiệm dễ dùng.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-slate-950 mb-10">
          Vì sao chọn RehabAI?
        </h2>
        <div className="grid gap-5 md:grid-cols-4">
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-emerald-100 transition hover:-translate-y-1 hover:shadow-md">
                <Icon className="h-7 w-7 text-emerald-600" />
                <h2 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </Card>
            );
          })}
        </div>
      </section>


      <section className="bg-emerald-50/70 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-sm font-bold uppercase text-emerald-700">Dịch vụ chính</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Một nền tảng cho hành trình phục hồi tại nhà</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {services.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-emerald-100">
                  <Icon className="h-6 w-6 text-emerald-600" />
                  <h3 className="mt-4 font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Chuyên gia</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Đội ngũ y bác sĩ và chuyên gia phục hồi</h2>
          </div>
          <Link href="/doctors" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900">Xem bác sĩ <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {loadingHighlights ? <p className="mt-8 text-slate-500">Đang tải danh sách bác sĩ...</p> : null}
        {!loadingHighlights && !featuredDoctors.length ? <p className="mt-8 text-slate-500">Chưa có dữ liệu bác sĩ.</p> : null}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featuredDoctors.map((doctor) => (
            <Card key={doctor.id} className="border-emerald-100 transition hover:-translate-y-1 hover:shadow-md">
              <Image
                src={getImageUrl(doctor.avatar_url)}
                alt={doctor.full_name}
                width={800}
                height={520}
                className="h-44 w-full rounded-lg object-cover"
              />
              <p className="mt-5 text-sm font-semibold text-emerald-700">{doctor.specialty}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">{doctor.full_name}</h3>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>{doctor.experience_years} năm kinh nghiệm</span>
                <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{doctor.rating}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{doctor.bio}</p>
              <Link href="/doctors" className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">Xem bác sĩ</Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Bài tập nổi bật</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Bắt đầu từ các bài tập nhẹ, dễ theo dõi</h2>
            </div>
            <Link href="/exercises" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900">Khám phá thư viện bài tập <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {loadingHighlights ? <p className="mt-8 text-slate-500">Đang tải bài tập...</p> : null}
          {!loadingHighlights && !featuredExercises.length ? <p className="mt-8 text-slate-500">Chưa có dữ liệu bài tập.</p> : null}
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {featuredExercises.map((exercise) => (
              <Card key={exercise.id} className="border-emerald-100">
                <Image
                  src={getImageUrl(exercise.image_url)}
                  alt={exercise.title}
                  width={800}
                  height={520}
                  className="h-40 w-full rounded-lg object-cover"
                />
                <h3 className="mt-4 text-lg font-bold text-slate-950">{exercise.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{exercise.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{exercise.difficulty}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-slate-700">{exercise.body_region}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-sm font-bold uppercase text-emerald-700">Bảng giá</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Chọn gói đồng hành phù hợp</h2>
        {loadingHighlights ? <p className="mt-8 text-slate-500">Đang tải bảng giá...</p> : null}
        {!loadingHighlights && !pricingPlans.length ? <p className="mt-8 text-slate-500">Chưa có dữ liệu bảng giá.</p> : null}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card key={plan.id} className={plan.name === "Standard" ? "border-emerald-400 shadow-md" : "border-emerald-100"}>
              <p className="text-sm font-semibold text-emerald-700">{plan.name}</p>
              <p className="mt-3 text-3xl font-bold text-slate-950">{formatCurrency(plan.price)}</p>
              <p className="mt-1 text-sm text-slate-500">/tháng</p>
              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
              <ul className="mt-5 grid gap-3 text-sm text-slate-700">
                {plan.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href={pricingHref} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Chọn gói</Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-emerald-50/70 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-sm font-bold uppercase text-emerald-700">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Câu hỏi phổ biến</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {faq.map(([question, answer]) => (
              <Card key={question} className="border-emerald-100">
                <div className="flex gap-3">
                  <HeartPulse className="mt-1 h-5 w-5 flex-none text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-slate-950">{question}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
