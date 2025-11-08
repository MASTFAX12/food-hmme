
import React, { useState, useEffect } from 'react';
import { ChefHat, Loader2, Search, AlertCircle, Sparkles, Heart, UserCircle, Home, Save, ArrowRight, Utensils, ListChecks, Repeat, Clock, Flame, CheckCircle, MinusCircle, X, CalendarDays, Scale, TrendingUp, Activity, Apple, ChevronDown, Ruler, Weight, User, ActivitySquare, Calculator, Target, Image as ImageIcon } from 'lucide-react';
import { generateRecipes, generateWeeklyPlan } from './services/geminiService';
import { Recipe, UserProfile, PlanGoal, PlanGoalId, WeeklyPlan, ActivityLevel } from './types';
import RecipeCard from './components/RecipeCard';

const STORAGE_KEY_PROFILE = 'smartChef_profile_v2';
type View = 'home' | 'weekly' | 'favorites' | 'profile';
type ToastData = { message: string, type: 'add' | 'remove' | 'info' } | null;

const DEFAULT_PROFILE: UserProfile = {
  savedRestrictions: '',
  favorites: [],
  showImages: true,
};

const PLAN_GOALS: PlanGoal[] = [
  { id: 'weight_loss', label: 'إنقاص الوزن', icon: 'Scale', description: 'خطة محسوبة السعرات للوصول للوزن المثالي' },
  { id: 'weight_gain', label: 'زيادة الوزن وبناء عضلات', icon: 'TrendingUp', description: 'وجبات غنية بالبروتين والطاقة الصحية' },
  { id: 'healthy', label: 'أكل صحي ومتوازن', icon: 'Apple', description: 'تركيز على الخضروات والفواكه والحبوب الكاملة' },
  { id: 'maintain', label: 'المحافظة على الوزن', icon: 'Activity', description: 'توازن مثالي بين الطاقة المستهلكة والمبذولة' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'خامل (قليل الحركة)' },
  { value: 'light', label: 'نشاط خفيف (رياضة 1-3 أيام)' },
  { value: 'moderate', label: 'نشاط متوسط (رياضة 3-5 أيام)' },
  { value: 'active', label: 'نشيط (رياضة 6-7 أيام)' },
  { value: 'very_active', label: 'نشيط جداً (تمارين شاقة يومياً)' },
];

function App() {
  const [view, setView] = useState<View>('home');
  // Home state
  const [ingredients, setIngredients] = useState('');
  const [sessionRestrictions, setSessionRestrictions] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  // Weekly Plan state
  const [selectedGoal, setSelectedGoal] = useState<PlanGoalId>('healthy');
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Shared state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData>(null);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY_PROFILE);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: ToastData['type']) => {
    setToast({ message, type });
  };

  const handleToggleFavorite = (recipe: Recipe) => {
    setProfile(prev => {
      const isFav = prev.favorites.some(fav => fav.id === recipe.id);
      if (isFav) {
        showToast(`تمت إزالة "${recipe.name}" من المفضلة`, 'remove');
        return { ...prev, favorites: prev.favorites.filter(fav => fav.id !== recipe.id) };
      } else {
        showToast(`تم حفظ "${recipe.name}" في المفضلة`, 'add');
        return { ...prev, favorites: [...prev.favorites, recipe] };
      }
    });
  };

  const isRecipeFavorite = (id: string) => profile.favorites.some(fav => fav.id === id);

  const isHealthDataComplete = () => {
    const { healthData } = profile;
    return healthData && healthData.age && healthData.weight && healthData.height && healthData.gender && healthData.activityLevel;
  };

  const handleSubmitIngredients = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const finalRestrictions = [profile.savedRestrictions, sessionRestrictions].filter(Boolean).join('، ');
      const generatedRecipes = await generateRecipes(ingredients, finalRestrictions);
      setRecipes(generatedRecipes);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWeeklyPlan = async () => {
    if (!isHealthDataComplete()) {
      showToast("يفضل إكمال بياناتك الصحية في الملف الشخصي للحصول على خطة أدق.", 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsLoading(true);
    setError(null);
    setWeeklyPlan(null);
    try {
      const plan = await generateWeeklyPlan(selectedGoal, profile.savedRestrictions, profile.healthData);
      setWeeklyPlan(plan);
      if (plan.days.length > 0) setExpandedDay(plan.days[0].day);
    } catch (err: any) {
      setError(err.message || "تعذر إنشاء الخطة.");
    } finally {
      setIsLoading(false);
    }
  };

  const NavigationBar = () => {
    const navItems = [
      { id: 'home', label: 'الرئيسية', icon: Home },
      { id: 'weekly', label: 'خطة أسبوعية', icon: CalendarDays },
      { id: 'favorites', label: 'مفضلاتي', icon: Heart, badge: profile.favorites.length > 0 ? profile.favorites.length : null },
      { id: 'profile', label: 'ملفي', icon: UserCircle, warning: !isHealthDataComplete() },
    ];

    return (
      <nav className="flex items-center gap-1 bg-white/50 backdrop-blur-md p-1 rounded-full border border-gray-200/50 shadow-sm overflow-x-auto no-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all duration-300 shrink-0 ${
                isActive 
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-200' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive && item.id === 'favorites' ? 'fill-white' : ''}`} />
              <span className={`font-bold text-sm ${isActive ? 'block' : 'hidden md:block'}`}>
                {item.label}
              </span>
              {item.badge && !isActive && (
                <span className="absolute top-0 right-0 sm:-top-1 sm:-left-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full border-2 border-white">
                  {item.badge}
                </span>
              )}
              {item.warning && !isActive && (
                 <span className="absolute top-0 right-0 sm:-top-1 sm:-left-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
              )}
            </button>
          );
        })}
      </nav>
    );
  };

  const GoalIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
    switch (iconName) {
      case 'Scale': return <Scale className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'Apple': return <Apple className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50 via-gray-50 to-gray-100 relative">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
             <div 
              className="flex items-center gap-3 cursor-pointer group shrink-0 self-start sm:self-auto" 
              onClick={() => setView('home')}
            >
              <div className="bg-gradient-to-tr from-primary-600 to-primary-400 p-2 rounded-2xl text-white shadow-lg shadow-primary-200/50 transition-transform group-hover:scale-105">
                <ChefHat className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight leading-none">طاهي المنزل</h1>
                <span className="text-[10px] sm:text-xs text-primary-600 font-bold">رفيقك الذكي</span>
              </div>
            </div>
            <div className="w-full sm:w-auto flex justify-center sm:justify-end">
               <NavigationBar />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 sm:mt-10">
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 mb-8 animate-fade-in-up">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {view === 'home' && (
          <div className="animate-fade-in-up">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-primary-900/5 p-6 sm:p-10 mb-12 border border-white relative overflow-hidden">
               <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-6 sm:mb-8 flex items-center gap-3">
                  <Sparkles className="w-7 h-7 text-primary-500" />
                  ماذا سنطبخ اليوم؟
                </h2>
                <form onSubmit={handleSubmitIngredients} className="space-y-6">
                  <div>
                    <label htmlFor="ingredients" className="block text-sm font-bold text-gray-700 mb-3 mr-1">
                      المكونات المتوفرة لديك
                    </label>
                    <div className="relative group">
                      <textarea
                        id="ingredients"
                        value={ingredients}
                        onChange={(e) => setIngredients(e.target.value)}
                        placeholder="اكتب هنا... (مثال: دجاج، أرز، طماطم، بصل)"
                        className="w-full p-5 min-h-[120px] text-lg text-gray-800 bg-gray-50/50 border-2 border-gray-100 rounded-3xl focus:ring-4 focus:ring-primary-100/50 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400 group-hover:border-gray-200 shadow-sm"
                      />
                      <div className="absolute top-5 left-5 p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400 pointer-events-none">
                         <Search className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                   <div className="grid sm:grid-cols-2 gap-6">
                     <div>
                      <label htmlFor="sessionRestrictions" className="block text-sm font-bold text-gray-700 mb-3 mr-1">
                        قيود لهذه الوجبة <span className="text-gray-400 font-normal">(اختياري)</span>
                      </label>
                      <input
                        type="text"
                        id="sessionRestrictions"
                        value={sessionRestrictions}
                        onChange={(e) => setSessionRestrictions(e.target.value)}
                        placeholder="مثال: بدون ملح، قليل الدسم..."
                        className="w-full p-4 text-gray-700 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                    {profile.savedRestrictions && (
                      <div className="bg-orange-50/80 p-5 rounded-3xl border border-orange-100/50 flex items-start gap-3 backdrop-blur-sm">
                        <div className="bg-orange-100 p-2 rounded-full shrink-0">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-orange-800 mb-1">قيودك الدائمة مفعلة:</p>
                          <p className="text-sm text-orange-700/80 line-clamp-2">{profile.savedRestrictions}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !ingredients.trim()}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 text-white text-xl font-bold py-5 px-8 rounded-3xl transition-all shadow-xl shadow-primary-500/20 hover:shadow-2xl hover:shadow-primary-500/30 hover:-translate-y-1 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin" />
                        جاري التحضير...
                      </>
                    ) : (
                      <>
                        <ChefHat className="w-7 h-7" />
                        ابتكر لي وصفات
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-10">
              {recipes.map((recipe, index) => (
                <div key={recipe.id || index} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <RecipeCard 
                    recipe={recipe} 
                    isFavorite={isRecipeFavorite(recipe.id)}
                    onToggleFavorite={handleToggleFavorite}
                    showImage={profile.showImages ?? true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'weekly' && (
          <div className="animate-fade-in-up space-y-8">
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-indigo-900/5 border border-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -z-10"></div>
               <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-6 flex items-center gap-3">
                <CalendarDays className="w-8 h-8 text-indigo-500" />
                منظم الوجبات الأسبوعي
              </h2>
              
              <div className="mb-8">
                <label className="block text-lg font-bold text-gray-800 mb-4">ما هو هدفك الصحي هذا الأسبوع؟</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PLAN_GOALS.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`flex items-start gap-4 p-5 rounded-3xl border-2 text-right transition-all duration-300 ${
                        selectedGoal === goal.id
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-md'
                          : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl shrink-0 ${selectedGoal === goal.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <GoalIcon iconName={goal.icon} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg mb-1 ${selectedGoal === goal.id ? 'text-indigo-900' : 'text-gray-800'}`}>{goal.label}</h3>
                        <p className={`text-sm leading-snug ${selectedGoal === goal.id ? 'text-indigo-700' : 'text-gray-500'}`}>{goal.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {!isHealthDataComplete() && (
                 <div className="mb-6 bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3 text-amber-800">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">بياناتك الصحية غير مكتملة</p>
                    <p className="text-sm opacity-90">للحصول على خطة دقيقة ومحسوبة السعرات، يفضل إكمال بيانات الوزن والطول في ملفك الشخصي.</p>
                     <button 
                      onClick={() => setView('profile')} 
                      className="mt-2 text-amber-700 font-bold text-sm underline"
                    >
                      إكمال الملف الشخصي الآن
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateWeeklyPlan}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xl font-bold py-4 px-8 rounded-3xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-xl active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    جاري بناء خطتك...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    إنشاء خطة الأسبوع
                  </>
                )}
              </button>
            </div>

            {weeklyPlan && (
              <div className="space-y-6">
                {weeklyPlan.nutrition_summary && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-[2rem] p-6 text-emerald-900 shadow-sm animate-fade-in-up">
                    <h3 className="flex items-center gap-2 text-xl font-extrabold mb-4">
                      <Target className="w-6 h-6 text-emerald-600" />
                      ملخص هدفك الشخصي
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white/60 p-4 rounded-2xl">
                        <div className="text-sm text-emerald-700 font-bold mb-1">احتياجك اليومي (TDEE)</div>
                        <div className="text-2xl font-extrabold">{weeklyPlan.nutrition_summary.tdee} <span className="text-sm">سعرة</span></div>
                      </div>
                      <div className="bg-emerald-100/80 p-4 rounded-2xl border border-emerald-200">
                        <div className="text-sm text-emerald-800 font-bold mb-1">هدفك في هذه الخطة</div>
                        <div className="text-2xl font-extrabold text-emerald-700">{weeklyPlan.nutrition_summary.target_daily_calories} <span className="text-sm">سعرة/يوم</span></div>
                      </div>
                       <div className="bg-white/60 p-4 rounded-2xl sm:col-span-1 col-span-2">
                        <div className="text-sm text-emerald-700 font-bold mb-1">نصيحة غذائية</div>
                        <div className="text-sm font-medium leading-snug">{weeklyPlan.nutrition_summary.macro_advice}</div>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-800 pr-2">جدول الوجبات المقترح:</h3>
                <div className="space-y-4">
                  {weeklyPlan.days.map((dayPlan, index) => {
                    const isExpanded = expandedDay === dayPlan.day;
                    return (
                      <div key={index} className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-lg border-indigo-100' : 'shadow-sm border-gray-100 hover:shadow-md'}`}>
                        <button
                          onClick={() => setExpandedDay(isExpanded ? null : dayPlan.day)}
                          className="w-full flex items-center justify-between p-5 sm:p-6"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl font-bold text-lg ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                              {dayPlan.day.substring(0, 2)}
                            </div>
                            <div className="text-right">
                              <h4 className="text-lg font-bold text-gray-900">{dayPlan.day}</h4>
                               <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                                <Flame className="w-4 h-4 text-orange-500" />
                                {dayPlan.total_calories} سعرة حرارية
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="min-h-0 overflow-hidden">
                            <div className="p-5 sm:p-6 pt-0 border-t border-gray-100 bg-gray-50/30 space-y-3">
                              {dayPlan.meals.map((meal, mealIndex) => (
                                <div key={mealIndex} className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm">
                                  <div className="shrink-0 mt-1">
                                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${
                                      meal.type === 'فطور' ? 'bg-amber-100 text-amber-700' :
                                      meal.type === 'غداء' ? 'bg-emerald-100 text-emerald-700' :
                                      meal.type === 'عشاء' ? 'bg-rose-100 text-rose-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {meal.type}
                                    </span>
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-gray-800">{meal.name}</h5>
                                    <p className="text-sm text-gray-500 leading-snug mt-1">{meal.description}</p>
                                    <div className="text-xs font-semibold text-gray-400 mt-2 flex items-center gap-1">
                                      <Flame className="w-3.5 h-3.5" /> {meal.calories} سعرة
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'favorites' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 flex items-center gap-3">
                <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-red-500 fill-red-500" />
                وصفاتي المفضلة
              </h2>
              <span className="bg-red-100 text-red-700 font-bold px-4 py-1.5 rounded-full text-sm sm:text-base">
                {profile.favorites.length} وصفة
              </span>
            </div>
            
            {profile.favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center px-6">
                <div className="bg-red-50 p-6 rounded-full mb-6">
                  <Heart className="w-12 h-12 text-red-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">لم تحفظ أي وصفات بعد</h3>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto">اضغط على رمز القلب لحفظ الوصفات هنا.</p>
                <button 
                  onClick={() => setView('home')} 
                  className="flex items-center gap-2 bg-primary-50 text-primary-700 px-6 py-3 rounded-2xl font-bold hover:bg-primary-100 transition-colors"
                >
                  ابحث عن وصفات
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="grid gap-8">
                {profile.favorites.map((recipe) => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                    showImage={profile.showImages ?? true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'profile' && (
          <div className="animate-fade-in-up max-w-2xl mx-auto">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white p-8 sm:p-10 relative overflow-hidden mb-8">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary-50 to-transparent opacity-50"></div>
              <div className="relative flex items-center gap-5 mb-10">
                <div className="bg-white p-1.5 rounded-full shadow-md">
                  <div className="bg-primary-100 p-4 rounded-full">
                    <UserCircle className="w-12 h-12 text-primary-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800">الملف الشخصي</h2>
                  <p className="text-gray-500 font-medium mt-1">بياناتك لتجربة مخصصة</p>
                </div>
              </div>

              <div className="space-y-10">
                {/* إعدادات العرض */}
                <div>
                  <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-800 mb-6">
                    <Sparkles className="w-6 h-6 text-primary-500" />
                    تفضيلات العرض
                  </h3>
                  <div className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border-2 border-gray-100/80">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-100 p-3 rounded-2xl">
                         <ImageIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                         <label htmlFor="showImagesToggle" className="font-bold text-gray-800 text-lg cursor-pointer">عرض صور الوجبات</label>
                         <p className="text-sm text-gray-500 font-medium mt-0.5">تعطيل الصور قد يوفر استهلاك البيانات</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        id="showImagesToggle" 
                        className="sr-only peer" 
                        checked={profile.showImages ?? true} 
                        onChange={(e) => setProfile({...profile, showImages: e.target.checked})} 
                      />
                      <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>

                {/* قسم البيانات الصحية */}
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-800 mb-6">
                    <ActivitySquare className="w-6 h-6 text-primary-500" />
                    بياناتك الصحية الأساسية
                  </h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">العمر (سنة)</label>
                      <div className="relative">
                         <User className="absolute top-3.5 right-4 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={profile.healthData?.age || ''}
                          onChange={(e) => setProfile({ ...profile, healthData: { ...profile.healthData, age: Number(e.target.value) || undefined } })}
                          className="w-full p-3 pr-12 text-gray-700 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none transition-all"
                          placeholder="مثال: 30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">الجنس</label>
                      <select
                        value={profile.healthData?.gender || ''}
                        onChange={(e) => setProfile({ ...profile, healthData: { ...profile.healthData, gender: e.target.value as any } })}
                        className="w-full p-3 text-gray-700 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none transition-all appearance-none"
                      >
                        <option value="">اختر...</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">الوزن (كغ)</label>
                      <div className="relative">
                        <Weight className="absolute top-3.5 right-4 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={profile.healthData?.weight || ''}
                          onChange={(e) => setProfile({ ...profile, healthData: { ...profile.healthData, weight: Number(e.target.value) || undefined } })}
                          className="w-full p-3 pr-12 text-gray-700 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none transition-all"
                          placeholder="مثال: 75"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">الطول (سم)</label>
                       <div className="relative">
                        <Ruler className="absolute top-3.5 right-4 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={profile.healthData?.height || ''}
                          onChange={(e) => setProfile({ ...profile, healthData: { ...profile.healthData, height: Number(e.target.value) || undefined } })}
                          className="w-full p-3 pr-12 text-gray-700 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none transition-all"
                          placeholder="مثال: 170"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">مستوى النشاط البدني</label>
                      <select
                        value={profile.healthData?.activityLevel || ''}
                        onChange={(e) => setProfile({ ...profile, healthData: { ...profile.healthData, activityLevel: e.target.value as ActivityLevel } })}
                        className="w-full p-3 text-gray-700 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none transition-all appearance-none"
                      >
                        <option value="">اختر مستوى نشاطك المعتاد...</option>
                        {ACTIVITY_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* قسم القيود */}
                <div className="pt-6 border-t border-gray-100">
                  <label htmlFor="savedRestrictions" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-800 mb-4">
                    <AlertCircle className="w-6 h-6 text-primary-500" />
                    القيود الغذائية الدائمة
                  </label>
                  <div className="relative">
                    <textarea
                      id="savedRestrictions"
                      value={profile.savedRestrictions}
                      onChange={(e) => setProfile({ ...profile, savedRestrictions: e.target.value })}
                      placeholder="اكتب هنا... (مثال: حساسية لاكتوز، نباتي، مرض السكري)"
                      className="w-full p-5 min-h-[120px] text-lg text-gray-700 bg-gray-50/50 border-2 border-gray-100 rounded-3xl focus:border-primary-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-5 left-5 flex items-center gap-1.5 text-primary-700 text-xs font-bold bg-primary-100/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Save className="w-3.5 h-3.5" />
                حفظ تلقائي
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up w-auto max-w-[90vw]">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border backdrop-blur-md ${
            toast.type === 'add' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' : 
            toast.type === 'remove' ? 'bg-red-50/90 border-red-100 text-red-800' :
            'bg-blue-50/90 border-blue-100 text-blue-800'
          }`}>
            {toast.type === 'add' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : 
             toast.type === 'remove' ? <MinusCircle className="w-5 h-5 text-red-500" /> :
             <AlertCircle className="w-5 h-5 text-blue-500" />}
            <p className="font-bold text-sm">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
