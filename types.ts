
export interface IngredientSubstitute {
  original: string;
  replacement: string;
}

export interface Recipe {
  id: string;
  name: string;
  image_keyword: string;
  description: string;
  ingredients: string[];
  substitutes?: IngredientSubstitute[];
  instructions: string[];
  time: string;
  difficulty: DifficultyLevel;
  calories?: number;
  customImage?: string; // Base64 string of AI-generated/edited image
}

export type DifficultyLevel = 'سهل' | 'متوسط' | 'صعب';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserHealthData {
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  gender?: 'male' | 'female';
  activityLevel?: ActivityLevel;
}

export interface UserProfile {
  savedRestrictions: string;
  favorites: Recipe[];
  healthData?: UserHealthData;
  showImages?: boolean;
}

export type PlanGoalId = 'weight_loss' | 'weight_gain' | 'maintain' | 'healthy';

export interface PlanGoal {
  id: PlanGoalId;
  label: string;
  icon: string;
  description: string;
}

export interface MealSummary {
  type: 'فطور' | 'غداء' | 'عشاء' | 'وجبة خفيفة';
  name: string;
  description: string;
  calories: number;
}

export interface DayPlan {
  day: string;
  meals: MealSummary[];
  total_calories: number;
}

export interface NutritionSummary {
  bmr: number; // معدل الأيض الأساسي
  tdee: number; // احتياج الطاقة اليومي الكلي
  target_daily_calories: number; // السعرات المستهدفة في الخطة
  macro_advice: string; // نصيحة عامة عن الماكروز
}

export interface WeeklyPlan {
  nutrition_summary?: NutritionSummary;
  days: DayPlan[];
}
