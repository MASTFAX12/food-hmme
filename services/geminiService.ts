
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Recipe, WeeklyPlan, PlanGoalId, UserHealthData } from "../types";

const apiKey =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";

const assertGeminiKey = () => {
  if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
    throw new Error(
      "Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local before using Gemini features."
    );
  }
};

const ai = new GoogleGenAI({ apiKey });

export const generateRecipes = async (
  ingredients: string,
  restrictions: string
): Promise<Recipe[]> => {
  assertGeminiKey();
  if (!ingredients.trim()) {
    throw new Error("يرجى إدخال بعض المكونات");
  }

  const prompt = `
    أنت طاهٍ ذكي ومبتكر. مهمتك هي اقتراح 3 وصفات طبخ واقعية ولذيذة تعتمد *حصرياً* على المكونات المتوفرة التالية: "${ingredients}".
    ${restrictions ? `يجب الالتزام الصارم بالقيود الغذائية التالية: "${restrictions}".` : ''}
    
    قواعد صارمة للمكونات:
    1. يجب ألا تحتوي الوصفات على أي مكونات رئيسية (مثل لحوم، خضروات، أجبان، أو نشويات) لم يذكرها المستخدم في القائمة أعلاه.
    2. يُسمح لك فقط بافتراض وجود "أساسيات المطبخ" المتوفرة في كل بيت، وهي فقط: (الماء، الملح، الفلفل، السكر، الزيت/السمن، والبهارات الشائعة).
    3. إذا كانت المكونات قليلة جداً، ابتكر طرقاً لتحضيرها (مثال: إذا توفر فقط "بطاطس"، اقترح: بطاطس مسلوقة متبلة، أصابع بطاطس محمرة، بطاطس مهروسة بالزيت).

    لكل وصفة، يجب تقديم:
    1. خطوات تحضير مفصلة جداً وواضحة حتى للمبتدئين.
    2. اقتراحات لبدائل للمكونات (إذا لزم الأمر، مع التركيز على بدائل شائعة).
    3. كلمة مفتاحية واحدة باللغة الإنجليزية (image_keyword) تصف الطبق بدقة لاستخدامها في البحث عن صورة (مثال: "grilled chicken salad", "lentil soup").
    4. مُعرف فريد (id) عشوائي قصير للوصفة.

    أعد الرد بتنسيق JSON حصراً وفق المخطط المحدد.
  `;

  const recipeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "معرف فريد قصير للوصفة" },
      name: { type: Type.STRING, description: "اسم الوصفة باللغة العربية" },
      image_keyword: { type: Type.STRING, description: "كلمة مفتاحية بالإنجليزية لوصف الصورة (طعام فقط)" },
      description: { type: Type.STRING, description: "وصف جذاب للطبق يبرز كيف تم استغلال المكونات المتاحة" },
      ingredients: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "قائمة المكونات مع الكميات التقديرية"
      },
      substitutes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING, description: "المكون الأصلي" },
            replacement: { type: Type.STRING, description: "البديل المقترح" }
          }
        },
        description: "قائمة ببدائل المكونات المحتملة"
      },
      instructions: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "خطوات التحضير مفصلة ومرقمة بوضوح"
      },
      time: { type: Type.STRING, description: "وقت التحضير الكلي" },
      difficulty: { type: Type.STRING, enum: ["سهل", "متوسط", "صعب"] },
      calories: { type: Type.INTEGER, description: "السعرات الحرارية التقريبية للوجبة كاملة" }
    },
    required: ["id", "name", "image_keyword", "description", "ingredients", "instructions", "time", "difficulty"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: recipeSchema
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Recipe[];
    } else {
      throw new Error("لم يتم استلام بيانات صالحة من النموذج.");
    }
  } catch (error) {
    console.error("Error generating recipes:", error);
    throw new Error("حدث خطأ أثناء توليد الوصفات. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.");
  }
};

export const generateWeeklyPlan = async (
  goal: PlanGoalId,
  restrictions: string,
  healthData?: UserHealthData
): Promise<WeeklyPlan> => {
  assertGeminiKey();
  const goalPrompts: Record<PlanGoalId, string> = {
    weight_loss: "إنقاص الوزن (عجز سعرات حرارية حوالي 500 سعرة من TDEE، بروتين عالي)",
    weight_gain: "زيادة الوزن (فائض سعرات حرارية حوالي 300-500 سعرة فوق TDEE، تركيز على الكربوهيدرات المعقدة والبروتين)",
    maintain: "الحفاظ على الوزن (سعرات مساوية لـ TDEE تقريباً)",
    healthy: "نمط حياة صحي (توازن غذائي بدون عد صارم للسعرات، لكن ضمن الحدود الطبيعية)"
  };

  let userDetailsPrompt = "";
  if (healthData && healthData.age && healthData.weight && healthData.height && healthData.gender && healthData.activityLevel) {
    userDetailsPrompt = `
      **بيانات المستخدم الحيوية (أساسية للحسابات):**
      - العمر: ${healthData.age} سنة
      - الوزن: ${healthData.weight} كغ
      - الطول: ${healthData.height} سم
      - الجنس: ${healthData.gender === 'male' ? 'ذكر' : 'أنثى'}
      - مستوى النشاط: ${healthData.activityLevel}
      
      **مطلوب منك كخبير تغذية:**
      1. حساب معدل الأيض الأساسي (BMR) باستخدام معادلة Mifflin-St Jeor.
      2. حساب احتياج الطاقة اليومي الكلي (TDEE) بناءً على مستوى النشاط.
      3. تحديد "السعرات المستهدفة يومياً" بناءً على هدف "${goalPrompts[goal]}".
      4. بناء الخطة الأسبوعية بحيث يكون متوسط سعرات الأيام قريباً جداً من هذا الهدف المستهدف.
    `;
  } else {
    userDetailsPrompt = "لم يتم توفير بيانات دقيقة. استخدم متوسط احتياج 2000 سعرة حرارية كمرجع أساسي وقم بتعديله حسب الهدف.";
  }

  const prompt = `
    قم بإنشاء خطة وجبات أسبوعية شاملة (7 أيام) مخصصة للهدف: "${goalPrompts[goal]}".
    ${restrictions ? `مع الالتزام الصارم بالقيود: "${restrictions}".` : ''}
    ${userDetailsPrompt}

    لكل يوم (من السبت إلى الجمعة)، اقترح 3 وجبات رئيسية ووجبة خفيفة. يجب أن تكون الوجبات واقعية ومتنوعة.

    أعد الرد بتنسيق JSON حصراً يطابق المخطط المطلوب، بما في ذلك ملخص الحسابات الغذائية (nutrition_summary) إذا توفرت البيانات.
  `;

  const weeklyPlanSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      nutrition_summary: {
        type: Type.OBJECT,
        description: "ملخص الحسابات الغذائية المعتمدة على بيانات المستخدم",
        properties: {
          bmr: { type: Type.INTEGER, description: "معدل الأيض الأساسي المحسوب" },
          tdee: { type: Type.INTEGER, description: "احتياج الطاقة اليومي الكلي للحفاظ على الوزن" },
          target_daily_calories: { type: Type.INTEGER, description: "السعرات اليومية المستهدفة لتحقيق الهدف المختار" },
          macro_advice: { type: Type.STRING, description: "نصيحة مختصرة جداً (جملة واحدة) حول توزيع البروتين/الكارب/الدهون المناسب لهذا الهدف" }
        },
        required: ["target_daily_calories", "macro_advice"]
      },
      days: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING, description: "اسم اليوم (مثال: السبت)" },
            total_calories: { type: Type.INTEGER, description: "مجموع سعرات هذا اليوم" },
            meals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["فطور", "غداء", "عشاء", "وجبة خفيفة"] },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING, description: "وصف مختصر للمكونات" },
                  calories: { type: Type.INTEGER }
                },
                required: ["type", "name", "calories"]
              }
            }
          },
          required: ["day", "meals", "total_calories"]
        }
      }
    },
    required: ["days"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: weeklyPlanSchema
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as WeeklyPlan;
    } else {
      throw new Error("لم يتم استلام بيانات خطة صالحة.");
    }
  } catch (error) {
    console.error("Error generating weekly plan:", error);
    throw new Error("تعذر إنشاء الخطة الأسبوعية حالياً. حاول مرة أخرى لاحقاً.");
  }
};

// Helper function to extract base64 data from data URI
const extractBase64 = (dataUri: string): { data: string, mimeType: string } => {
  const matches = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid data URI format");
  }
  return { mimeType: matches[1], data: matches[2] };
};

export const generateRecipeImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional food photography of: ${prompt}, delicious, high resolution, 4k, appetizing lighting.` }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.[0];
    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    throw new Error("لم يتم توليد صورة.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("فشل توليد الصورة، يرجى المحاولة لاحقاً.");
  }
};

export const editRecipeImage = async (imageBase64: string, editPrompt: string): Promise<string> => {
  try {
    const { data, mimeType } = extractBase64(imageBase64);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: editPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.[0];
    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    throw new Error("لم يتم تعديل الصورة.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("فشل تعديل الصورة، يرجى المحاولة لاحقاً.");
  }
};
