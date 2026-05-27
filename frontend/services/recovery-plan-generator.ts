import type { Exercise, RecoveryPlan } from "@/types";

const BODY_CATEGORY_MAP: Record<string, string[]> = {
  arm: ["Chi trên", "Phối hợp động tác", "Phục hồi sau đột quỵ"],
  hand: ["Chi trên", "Phối hợp động tác", "Linh hoạt"],
  shoulder: ["Chi trên", "Linh hoạt"],
  leg: ["Chi dưới", "Vận động", "Sức mạnh"],
  hip: ["Chi dưới", "Vận động", "Sức mạnh"],
  knee: ["Chi dưới", "Phục hồi chấn thương", "Vận động"],
  ankle: ["Chi dưới", "Vận động", "Tập thăng bằng"],
  core: ["Tập thăng bằng", "Sức mạnh"],
  full_body: ["Vận động", "Tập thăng bằng", "Phối hợp động tác"]
};

const CONDITION_CATEGORY_MAP: Record<string, string[]> = {
  stroke: ["Phục hồi sau đột quỵ", "Tập thăng bằng", "Phối hợp động tác", "Vận động"],
  injury: ["Phục hồi chấn thương", "Sức mạnh", "Linh hoạt", "Vận động"],
  post_surgery: ["Phục hồi chấn thương", "Linh hoạt", "Vận động"],
  elderly_mobility: ["Tập thăng bằng", "Vận động", "Sức mạnh"],
  general_rehabilitation: ["Vận động", "Sức mạnh", "Linh hoạt"]
};

const BODY_REGION_MAP: Record<string, string> = {
  arm: "Cánh tay",
  hand: "Bàn tay",
  shoulder: "Vai",
  leg: "Chân",
  hip: "Hông",
  knee: "Gối",
  ankle: "Cổ chân",
  core: "Cơ lõi",
  full_body: "Toàn thân"
};

const DIFFICULTY_MAP: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao"
};

function scoreExercise(plan: RecoveryPlan, exercise: Exercise) {
  const planBodyRegion = BODY_REGION_MAP[plan.affected_body_region] || plan.affected_body_region;
  const planDifficulty = DIFFICULTY_MAP[plan.preferred_difficulty] || plan.preferred_difficulty;
  let score = 0;
  if (CONDITION_CATEGORY_MAP[plan.condition_type]?.includes(exercise.category)) score += 4;
  if (BODY_CATEGORY_MAP[plan.affected_body_region]?.includes(exercise.category)) score += 3;
  if (exercise.body_region === planBodyRegion || exercise.body_region === "Toàn thân") score += 3;
  if (exercise.difficulty === planDifficulty) score += 2;
  return score;
}

export function selectExercisesForPlan(plan: RecoveryPlan, exercises: Exercise[]) {
  const difficulty = plan.current_mobility_level === "low" ? "Cơ bản" : DIFFICULTY_MAP[plan.preferred_difficulty] || plan.preferred_difficulty;
  const activeExercises = exercises.filter((exercise) => exercise.is_active);
  const saferCandidates = activeExercises.filter((exercise) => exercise.difficulty === difficulty);
  const candidates = saferCandidates.length
    ? saferCandidates
    : activeExercises.filter((exercise) => exercise.difficulty === "Cơ bản").length
      ? activeExercises.filter((exercise) => exercise.difficulty === "Cơ bản")
      : activeExercises;

  const ranked = [...candidates].sort((a, b) => scoreExercise(plan, b) - scoreExercise(plan, a));
  return ranked.slice(0, Math.max(3, Math.min(5, ranked.length)));
}
