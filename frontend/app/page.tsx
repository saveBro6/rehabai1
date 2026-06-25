"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Crown,
  Diamond,
  Dumbbell,
  HeartHandshake,
  HeartPulse,
  LineChart,
  MapPin,
  MessageCircle,
  PlayCircle,
  RotateCcw,
  Route,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  Target,
  UserRoundCheck,
} from "lucide-react";

import { PublicProductSearch } from "@/components/public/PublicProductSearch";
import { ProductCard } from "@/components/ProductCard";
import { getProtectedHref } from "@/lib/auth-navigation";
import { getDoctorRatingLabel } from "@/lib/doctor-reviews";
import { visiblePricingPlans } from "@/lib/subscription-access";
import { clsx, formatCurrency, getImageUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getDoctors } from "@/services/doctors.service";
import { getExercises } from "@/services/exercises.service";
import { getProducts } from "@/services/products.service";
import { getSubscriptions } from "@/services/subscriptions.service";
import type { Doctor, Product, PublicExerciseMetadata, Subscription } from "@/types";

const benefitCards = [
  {
    icon: Route,
    title: "Lộ trình cá nhân hóa",
    text: "Thiết kế theo tình trạng, vùng cơ thể và mục tiêu phục hồi của từng người."
  },
  {
    icon: Dumbbell,
    title: "Bài tập khoa học",
    text: "Bài tập được xây dựng bởi bác sĩ và chuyên gia vật lý trị liệu."
  },
  {
    icon: LineChart,
    title: "Theo dõi tiến trình",
    text: "Ghi nhận buổi tập, mức đau và khả năng vận động mỗi ngày."
  },
  {
    icon: HeartHandshake,
    title: "Hỗ trợ chuyên gia",
    text: "Dễ dàng đặt lịch tư vấn khi cần trao đổi sâu hơn về tình trạng."
  },
  {
    icon: CalendarCheck,
    title: "Tập luyện linh hoạt",
    text: "Tập tại nhà, theo lịch cá nhân, trên điện thoại hoặc máy tính."
  },
  {
    icon: ShieldCheck,
    title: "An toàn & tin cậy",
    text: "Nội dung chuẩn y khoa, bảo mật dữ liệu và quyền riêng tư."
  }
];

const exerciseFilters = [
  { label: "Tình trạng", value: "Sau đột quỵ", icon: HeartPulse },
  { label: "Vùng cơ thể", value: "Tay vai", icon: Target },
  { label: "Độ khó", value: "Cơ bản", icon: Dumbbell },
  { label: "Combo", value: "Combo 7 ngày", icon: RotateCcw }
];

const comboSuggestions = ["Combo 7 ngày", "Combo phục hồi tay", "Combo vận động toàn thân"];

const productCategoryChips = ["Tất cả", "Tập tay", "Tập chân", "Hỗ trợ di chuyển", "Chăm sóc tại nhà"];

const trustNotes = ["Cam kết hoàn tiền 7 ngày", "Không rủi ro", "Hủy bất kỳ lúc nào"];

const aboutValues = [
  {
    title: "Sứ mệnh",
    text: "Giúp người bệnh duy trì phục hồi an toàn tại nhà bằng công nghệ dễ dùng."
  },
  {
    title: "Tầm nhìn",
    text: "Trở thành nền tảng đồng hành phục hồi chức năng đáng tin cậy cho người Việt."
  },
  {
    title: "Giá trị cốt lõi",
    text: "Y khoa, bảo mật, cá nhân hóa và luôn đặt sự tiến bộ của người bệnh ở trung tâm."
  }
];

const faq = [
  {
    question: "RehabAI có thay thế bác sĩ không?",
    answer: "Không. RehabAI hỗ trợ tập luyện, theo dõi và kết nối chuyên gia; quyết định điều trị vẫn cần bác sĩ."
  },
  {
    question: "Tôi có thể xem bài tập miễn phí không?",
    answer: "Có. Bạn có thể xem metadata bài tập công khai; video đầy đủ được mở theo gói đăng ký phù hợp."
  },
  {
    question: "Tôi cần thiết bị gì để tập luyện?",
    answer: "Nhiều bài tập không cần thiết bị. Một số bài có thể dùng dây kháng lực, bóng tập hoặc dụng cụ hỗ trợ."
  },
  {
    question: "Tôi có thể hủy gói bất kỳ lúc nào không?",
    answer: "Có. Bạn có thể quản lý gói trong tài khoản Patient theo chính sách hiện tại của RehabAI."
  }
];

const pricingFallback = [
  {
    id: "basic-fallback",
    name: "Basic",
    price: 99000,
    description: "Phù hợp bắt đầu phục hồi",
    features: ["Truy cập bài tập cơ bản", "Lộ trình tổng quát", "Theo dõi tiến trình cơ bản"]
  },
  {
    id: "standard-fallback",
    name: "Standard",
    price: 249000,
    description: "Lộ trình cá nhân hóa toàn diện",
    features: ["Lộ trình cá nhân hóa", "Bài tập nâng cao", "Theo dõi tiến trình chi tiết"]
  },
  {
    id: "premium-fallback",
    name: "Premium",
    price: 599000,
    description: "Đồng hành chuyên sâu 1:1",
    features: ["Tất cả trong Standard", "Tư vấn 1:1 không giới hạn", "Ưu tiên hỗ trợ 24/7"]
  }
] satisfies Array<Pick<Subscription, "id" | "name" | "price" | "description" | "features">>;

function getPlanIcon(planName: string) {
  if (planName === "Premium") return Diamond;
  if (planName === "Standard") return Crown;
  return ShieldCheck;
}

function getPlanByName(plans: Subscription[], name: string) {
  return plans.find((plan) => plan.name === name);
}

function formatDuration(exercise: PublicExerciseMetadata) {
  return exercise.duration_minutes ? `${exercise.duration_minutes} phút` : "Theo hướng dẫn";
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [featuredDoctors, setFeaturedDoctors] = useState<Doctor[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredExercises, setFeaturedExercises] = useState<PublicExerciseMetadata[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<Subscription[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);

  const pricingHref = getProtectedHref(isAuthenticated, "/patient/pricing");
  const appointmentHref = getProtectedHref(isAuthenticated, "/patient/appointments");
  const pricingPlans = visiblePricingPlans(subscriptionPlans);
  const displayPlans = pricingPlans.length ? pricingPlans : pricingFallback;
  const teaserPlans = ["Basic", "Standard", "Premium"].map((name) => getPlanByName(displayPlans as Subscription[], name)).filter(Boolean) as Subscription[];

  const heroStats = useMemo(
    () => [
      { label: "Lộ trình cá nhân hóa", icon: ShieldCheck },
      { label: "Bác sĩ đồng hành", icon: Stethoscope },
      { label: "An toàn & bảo mật", icon: UserRoundCheck }
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    async function loadHighlights() {
      setLoadingHighlights(true);

      try {
        const [doctors, exercises, subscriptions, products] = await Promise.all([
          getDoctors(),
          getExercises({}),
          getSubscriptions(),
          getProducts()
        ]);

        if (!mounted) return;

        setFeaturedDoctors(doctors.slice(0, 4));
        setFeaturedProducts(products.slice(0, 4));
        setFeaturedExercises(exercises.slice(0, 5));
        setSubscriptionPlans(subscriptions);
      } catch {
        if (!mounted) return;

        setFeaturedDoctors([]);
        setFeaturedProducts([]);
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
    <div className="overflow-x-hidden bg-white text-slate-900">
      <section className="relative overflow-hidden border-b border-emerald-100 bg-[radial-gradient(circle_at_75%_20%,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,#f7fffb_0%,#ffffff_42%,#eefaf5_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-8 pt-10 lg:min-h-[620px] lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-16 lg:pt-12">
          <div className="relative z-10 min-w-0">
            <h1 className="w-full max-w-[320px] text-3xl font-black leading-[1.08] tracking-normal text-emerald-950 min-[400px]:max-w-[360px] sm:max-w-2xl sm:text-5xl lg:text-[56px]">
              Phục hồi sau đột quỵ.
              <span className="block">Tại nhà. Hiệu quả hơn.</span>
            </h1>
            <p className="mt-5 w-full max-w-[320px] text-base leading-8 text-slate-600 min-[400px]:max-w-[360px] sm:max-w-2xl sm:text-lg">
              RehabAI kết hợp lộ trình cá nhân hóa, bài tập phục hồi, bác sĩ đồng hành và theo dõi tiến trình để bạn luyện tập an toàn mỗi ngày.
            </p>

            <div className="mt-7 w-full max-w-[320px] min-[400px]:max-w-[360px] sm:max-w-2xl">
              <div className="rounded-lg border border-emerald-100 bg-white p-2 shadow-xl shadow-emerald-950/10">
                <Link
                  href="/patient/exercises"
                  className="flex min-h-14 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 transition hover:border-emerald-300 hover:bg-white hover:text-emerald-800"
                >
                  <Search className="h-5 w-5 text-emerald-600" />
                  <span className="min-w-0 truncate">Tìm bài tập, tình trạng hoặc vùng cơ thể...</span>
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              <Link
                href={pricingHref}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:-translate-y-0.5 hover:bg-emerald-700 sm:w-auto"
              >
                <Crown className="h-4 w-4" />
                Chọn gói phục hồi ngay
              </Link>
              <Link
                href="/patient/exercises"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-50 sm:w-auto"
              >
                <Dumbbell className="h-4 w-4" />
                Khám phá bài tập
              </Link>
              <Link
                href={appointmentHref}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-50 sm:w-auto"
              >
                <MessageCircle className="h-4 w-4" />
                Tư vấn miễn phí
              </Link>
            </div>

            <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-3">
              {heroStats.map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.label} className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    {item.label}
                  </span>
                );
              })}
            </div>

            <div className="mt-5 w-full max-w-[320px] min-[400px]:max-w-[360px] sm:max-w-2xl [&_[data-product-search=homepage]]:mt-3">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Tìm nhanh sản phẩm phục hồi</p>
              <PublicProductSearch />
            </div>
          </div>

          <div className="relative min-h-[420px] min-w-0 lg:min-h-[520px]">
            <div className="absolute inset-x-0 top-6 mx-auto h-[400px] max-w-[620px] rounded-[28px] bg-emerald-100/60 blur-3xl" />
            <Image
              src="/images/hero/rehab-care.jpg"
              alt="Chuyên gia phục hồi hỗ trợ người bệnh tập luyện tại nhà"
              width={1100}
              height={780}
              priority
              className="relative z-10 h-[420px] w-full rounded-[28px] object-cover shadow-2xl shadow-emerald-950/15 lg:h-[520px]"
            />
            <div className="absolute bottom-8 left-6 z-20 w-[230px] rounded-xl border border-white/80 bg-white/95 p-4 shadow-2xl shadow-emerald-950/20 backdrop-blur sm:left-auto sm:right-8 sm:w-[238px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-emerald-950">Tiến trình hôm nay</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">Bài tập đã hoàn thành</p>
                  <p className="text-sm font-black text-slate-950">12 / 17 bài</p>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-full border-[7px] border-emerald-500 border-l-emerald-100 text-sm font-black text-emerald-700">
                  72%
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-full w-[72%] rounded-full bg-emerald-500" />
              </div>
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Chuỗi ngày liên tiếp: 7 ngày</p>
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-2 max-w-6xl px-4 pb-8 lg:-mt-14">
          <div className="grid overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/10 md:grid-cols-3">
            {teaserPlans.map((plan) => {
              const Icon = getPlanIcon(plan.name);
              const isStandard = plan.name === "Standard";
              return (
                <div key={plan.id} className={clsx("relative flex items-center gap-4 p-5", isStandard && "bg-emerald-50", !isStandard && "border-b border-emerald-100 md:border-b-0 md:border-r")}>
                  {isStandard ? (
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-md bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase text-white">
                      Phổ biến nhất
                    </span>
                  ) : null}
                  <span className="grid h-14 w-14 flex-none place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">{plan.name}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {formatCurrency(Number(plan.price || 0))} <span className="text-xs font-bold text-slate-500">/tháng</span>
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">{plan.description}</p>
                  </div>
                  <Link href={pricingHref} className="ml-auto hidden rounded-lg border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-600 hover:text-white sm:inline-flex">
                    Xem chi tiết
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-semibold text-slate-600">
            {trustNotes.map((note) => (
              <span key={note} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {note}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-center text-3xl font-black text-slate-950">Vì sao nên chọn RehabAI?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {benefitCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-emerald-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/10">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-sm font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-950">Đội ngũ bác sĩ & chuyên gia</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Đồng hành cùng bạn trên hành trình phục hồi.</p>
          </div>
          <Link href="/patient/doctors" className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 transition hover:text-emerald-900">
            Xem tất cả bác sĩ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loadingHighlights ? <p className="mt-8 text-slate-500">Đang tải danh sách bác sĩ...</p> : null}
        {!loadingHighlights && !featuredDoctors.length ? <p className="mt-8 text-slate-500">Chưa có dữ liệu bác sĩ.</p> : null}

        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredDoctors.map((doctor) => (
            <article key={doctor.id} className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-slate-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10">
              <Image
                src={getImageUrl(doctor.avatar_url)}
                alt={doctor.full_name}
                width={700}
                height={480}
                className="h-48 w-full object-cover"
                unoptimized
              />
              <div className="p-4">
                <p className="text-xs font-bold text-emerald-700">{doctor.specialty}</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{doctor.full_name}</h3>
                <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-emerald-600" />
                    {doctor.experience_years || 0} năm kinh nghiệm
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {getDoctorRatingLabel(doctor)}
                  </span>
                </div>
                <Link href={`/patient/doctors/${doctor.id}`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-emerald-300 px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-600 hover:text-white">
                  Xem hồ sơ
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Marketplace</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Dụng cụ hỗ trợ phục hồi</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Các sản phẩm hỗ trợ tập luyện, vận động và chăm sóc phục hồi tại nhà.
            </p>
          </div>
          <Link href="/patient/products" className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 transition hover:text-emerald-900">
            Xem tất cả sản phẩm
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {productCategoryChips.map((chip) => (
            <Link
              key={chip}
              href="/patient/products"
              className="inline-flex min-h-10 flex-none items-center rounded-full border border-emerald-100 bg-emerald-50/70 px-4 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-600 hover:text-white"
            >
              {chip}
            </Link>
          ))}
        </div>

        {loadingHighlights ? <p className="mt-8 text-slate-500">Đang tải sản phẩm...</p> : null}
        {!loadingHighlights && !featuredProducts.length ? (
          <div className="mt-7 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center">
            <h3 className="text-xl font-black text-slate-950">Chưa có dữ liệu sản phẩm.</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Bạn vẫn có thể mở marketplace để xem danh sách sản phẩm khi dữ liệu đã sẵn sàng.
            </p>
            <Link
              href="/patient/products"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              Xem marketplace
            </Link>
          </div>
        ) : null}

        {featuredProducts.length ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-emerald-50/60 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-950">Khám phá bài tập phù hợp với bạn</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Lọc nhanh theo tình trạng, vùng cơ thể, độ khó và combo phục hồi.</p>
            </div>
            <Link href="/patient/exercises" className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 transition hover:text-emerald-900">
              Xem tất cả bài tập
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-[repeat(4,minmax(0,1fr))_150px] lg:overflow-visible lg:pb-0">
            {exerciseFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <Link
                  key={filter.label}
                  href="/patient/exercises"
                  className="min-w-[220px] rounded-lg border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md lg:min-w-0"
                >
                  <span className="text-xs font-bold text-slate-500">{filter.label}</span>
                  <span className="mt-2 flex items-center justify-between gap-3 text-sm font-black text-emerald-800">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {filter.value}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </span>
                </Link>
              );
            })}
            <Link href="/patient/exercises" className="inline-flex min-w-[150px] items-center justify-center rounded-lg bg-white px-5 py-4 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-600 hover:text-white">
              Đặt lại
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {comboSuggestions.map((combo) => (
              <Link key={combo} href="/patient/exercises" className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white">
                {combo}
              </Link>
            ))}
          </div>

          {loadingHighlights ? <p className="mt-8 text-slate-500">Đang tải bài tập...</p> : null}
          {!loadingHighlights && !featuredExercises.length ? <p className="mt-8 text-slate-500">Chưa có dữ liệu bài tập.</p> : null}

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {featuredExercises.map((exercise) => (
              <Link key={exercise.id} href={`/patient/exercises/${exercise.slug || exercise.id}`} className="group overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-slate-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10">
                <div className="relative">
                  <Image
                    src={getImageUrl(exercise.image_url)}
                    alt={exercise.title}
                    width={700}
                    height={460}
                    className="h-40 w-full object-cover transition group-hover:scale-105"
                    unoptimized
                  />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-slate-950/75 px-2 py-1 text-xs font-bold text-white">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {formatDuration(exercise)}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 min-h-11 text-sm font-black text-slate-950">{exercise.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{exercise.body_region || "Toàn thân"}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{exercise.difficulty}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-[0.9fr_1.6fr] lg:items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-950">Gói phục hồi phù hợp với nhu cầu của bạn</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Chọn gói để mở khóa bài tập, lộ trình và theo dõi tiến trình theo mức độ phục hồi của bạn.
          </p>
          <ul className="mt-6 grid gap-3 text-sm font-semibold text-slate-600">
            {trustNotes.map((note) => (
              <li key={note} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {note}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {displayPlans.map((plan) => {
            const isStandard = plan.name === "Standard";
            const Icon = getPlanIcon(plan.name);
            return (
              <article key={plan.id} className={clsx("relative rounded-xl border bg-white p-6 shadow-lg shadow-slate-950/5", isStandard ? "border-emerald-300 bg-emerald-50/60 shadow-emerald-950/10" : "border-emerald-100")}>
                {isStandard ? (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-md bg-emerald-600 px-4 py-1 text-xs font-black uppercase text-white">
                    Phổ biến nhất
                  </span>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-black text-emerald-700">{plan.name}</p>
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-4 text-3xl font-black text-slate-950">
                  {formatCurrency(Number(plan.price || 0))} <span className="text-sm font-bold text-slate-500">/tháng</span>
                </p>
                <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{plan.description}</p>
                <ul className="mt-5 grid gap-3 text-sm text-slate-700">
                  {plan.features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={pricingHref} className={clsx("mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-black transition", isStandard ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white")}>
                  Chọn gói {plan.name}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section id="about" className="border-y border-emerald-100 bg-slate-50 py-16 scroll-mt-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-950">Về chúng tôi</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              RehabAI được xây dựng bởi đội ngũ bác sĩ, kỹ sư và chuyên gia phục hồi nhằm giúp người bệnh tập luyện an toàn tại nhà.
            </p>
            <Link href="/patient/doctors" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-black text-white transition hover:bg-emerald-700">
              Tìm hiểu về RehabAI
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {aboutValues.map((item) => (
              <div key={item.title} className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-3xl font-black text-slate-950">Câu hỏi phổ biến</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {faq.map((item) => (
            <details key={item.question} className="group rounded-lg border border-emerald-100 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-slate-950">
                {item.question}
                <ChevronDown className="h-4 w-4 flex-none text-emerald-600 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/patient/exercises" className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 transition hover:text-emerald-900">
            Xem tất cả câu hỏi
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-600 p-6 text-white shadow-xl shadow-emerald-950/10 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-2xl font-black">Sẵn sàng bắt đầu phục hồi an toàn hơn?</h2>
            <p className="mt-2 text-sm font-semibold text-emerald-50">Chọn gói phù hợp hoặc khám phá bài tập để bắt đầu ngay hôm nay.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
            <Link href={pricingHref} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-50">
              Chọn gói ngay
            </Link>
            <Link href="/patient/exercises" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 px-5 py-2 text-sm font-black text-white transition hover:bg-white/10">
              Xem bài tập
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
