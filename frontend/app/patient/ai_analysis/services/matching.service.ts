import { createClient } from "@/lib/supabase/server";
import { getExerciseDifficultyLabel } from "@/services/exercises.service";
import type { MatchedExercise, MatchedProduct } from "../types";

export async function matchRehabExercises(
  exerciseTags: string[],
  bodyParts: string[],
  difficulty: string
): Promise<MatchedExercise[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exercise_public_metadata")
    .select("id,title,slug,description,category,difficulty,body_region,duration_minutes,image_url")
    .eq("is_active", true);

  if (error || !data) {
    console.error("Lỗi khi tải thư viện bài tập để đối chiếu:", error);
    return [];
  }

  // Chuyển đổi difficulty từ AI (beginner/intermediate/advanced) sang nhãn tiếng Việt tương ứng
  const targetDifficultyLabel = getExerciseDifficultyLabel(difficulty);
  const normalizedTags = exerciseTags.map((t) => t.toLowerCase().trim());
  const normalizedBodyParts = bodyParts.map((b) => b.toLowerCase().trim());

  const scored = data.map((exercise) => {
    let score = 0;

    // 1. Khớp theo tag bài tập (ưu tiên cao nhất)
    const slug = (exercise.slug || "").toLowerCase();
    const title = (exercise.title || "").toLowerCase();
    
    const hasTagMatch = normalizedTags.some(
      (tag) => slug.includes(tag) || tag.includes(slug) || title.includes(tag) || tag.includes(title)
    );
    if (hasTagMatch) score += 5;

    // 2. Khớp theo bộ phận cơ thể
    const bodyRegion = (exercise.body_region || "").toLowerCase();
    const hasBodyMatch = normalizedBodyParts.some(
      (part) => bodyRegion.includes(part) || part.includes(bodyRegion)
    );
    if (hasBodyMatch) score += 3;

    // 3. Khớp theo độ khó đề xuất
    const exerciseDiffLabel = getExerciseDifficultyLabel(exercise.difficulty);
    if (exerciseDiffLabel === targetDifficultyLabel) {
      score += 1;
    }

    return { exercise, score };
  });

  // Lọc lấy các bài tập có điểm số > 0, sắp xếp giảm dần và lấy tối đa 3 bài tập
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      id: item.exercise.id,
      title: item.exercise.title,
      slug: item.exercise.slug || "",
      description: item.exercise.description || "",
      category: item.exercise.category || "",
      difficulty: item.exercise.difficulty || "Cơ bản",
      body_region: item.exercise.body_region || "Toàn thân",
      duration_minutes: item.exercise.duration_minutes,
      image_url: item.exercise.image_url || null
    }));
}

export async function matchProducts(
  recommendedCategories: string[],
  productTags: string[]
): Promise<MatchedProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id,name,description,category,price,image_url")
    .eq("is_active", true);

  if (error || !data) {
    console.error("Lỗi khi tải danh mục sản phẩm để đối chiếu:", error);
    return [];
  }

  const normalizedCategories = recommendedCategories.map((c) => c.toLowerCase().trim());
  const normalizedTags = productTags.map((t) => t.toLowerCase().trim());

  const scored = data.map((product) => {
    let score = 0;

    // 1. Khớp theo tag sản phẩm (tên hoặc mô tả chứa tag)
    const name = (product.name || "").toLowerCase();
    const description = (product.description || "").toLowerCase();
    
    const hasTagMatch = normalizedTags.some(
      (tag) => name.includes(tag) || tag.includes(name) || description.includes(tag)
    );
    if (hasTagMatch) score += 5;

    // 2. Khớp theo danh mục đề xuất
    const category = (product.category || "").toLowerCase();
    const hasCategoryMatch = normalizedCategories.some(
      (cat) => category.includes(cat) || cat.includes(category)
    );
    if (hasCategoryMatch) score += 3;

    return { product, score };
  });

  // Lọc sản phẩm có điểm số > 0, sắp xếp giảm dần và lấy tối đa 3 sản phẩm
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      id: item.product.id,
      name: item.product.name,
      description: item.product.description || null,
      category: item.product.category,
      price: Number(item.product.price),
      image_url: item.product.image_url || null
    }));
}
