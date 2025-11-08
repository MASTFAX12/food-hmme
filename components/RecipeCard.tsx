
import React, { useState } from 'react';
import { Recipe } from '../types';
import { Clock, Flame, ChevronDown, Utensils, ListChecks, Repeat, Heart, Sparkles, Wand2, X, Send, Loader2 } from 'lucide-react';
import { generateRecipeImage, editRecipeImage } from '../services/geminiService';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite?: boolean;
  onToggleFavorite?: (recipe: Recipe) => void;
  showImage?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isFavorite = false, onToggleFavorite, showImage = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Image generation & editing state
  const [customImage, setCustomImage] = useState<string | undefined>(recipe.customImage);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  const difficultyColor = {
    'سهل': 'text-emerald-700 bg-emerald-100 border-emerald-200',
    'متوسط': 'text-amber-700 bg-amber-100 border-amber-200',
    'صعب': 'text-rose-700 bg-rose-100 border-rose-200',
  }[recipe.difficulty] || 'text-gray-700 bg-gray-100 border-gray-200';

  // Use custom image if available, otherwise fallback to loremflickr
  const imageUrl = customImage || `https://loremflickr.com/800/600/${encodeURIComponent(recipe.image_keyword)},food/all?lock=${recipe.id}`;
  const shouldShowImage = showImage && (!imageError || customImage);

  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsImageLoading(true);
    try {
      // Use the English keyword for better results, maybe combine with Arabic name if needed
      const prompt = `${recipe.image_keyword} (${recipe.name})`;
      const newImage = await generateRecipeImage(prompt);
      setCustomImage(newImage);
      // Optionally update the parent/global state here if needed to persist
      recipe.customImage = newImage; 
    } catch (error) {
      console.error("Image generation failed", error);
      // Ideally show a toast here
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleEditImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImage || !editPrompt.trim()) return;

    setIsImageLoading(true);
    try {
      const editedImage = await editRecipeImage(customImage, editPrompt);
      setCustomImage(editedImage);
      recipe.customImage = editedImage;
      setShowEditInput(false);
      setEditPrompt('');
    } catch (error) {
      console.error("Image editing failed", error);
    } finally {
      setIsImageLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gray-200/60 group">
      {/* Header Section (Image or Solid Background) */}
      <div className={`relative overflow-hidden ${shouldShowImage ? 'h-64 sm:h-80 bg-gray-200' : 'p-6 sm:p-8 bg-gradient-to-br from-gray-900 to-gray-800'}`}>
        {showImage && (
          <>
            {!imageError || customImage ? (
              <img 
                src={imageUrl} 
                alt={recipe.name}
                className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110"
                onError={() => !customImage && setImageError(true)}
                loading="lazy"
              />
            ) : null}
             {/* Gradient Overlay */}
            {(!imageError || customImage) && <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/30 to-transparent" />}
          </>
        )}
        
        {/* Image Action Buttons (Top Right) */}
        {showImage && (
          <div className="absolute top-5 right-5 flex items-center gap-2">
            {!customImage ? (
              <button
                onClick={handleGenerateImage}
                disabled={isImageLoading}
                className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                title="توليد صورة بالذكاء الاصطناعي"
              >
                {isImageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setShowEditInput(!showEditInput); }}
                className="p-3 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-indigo-600 transition-all shadow-lg active:scale-95"
                title="تعديل الصورة"
              >
                <Wand2 className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Favorite Button (Top Left) */}
        {onToggleFavorite && (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe); }}
            className={`absolute top-5 left-5 p-3 rounded-full shadow-lg transition-all duration-300 group/btn active:scale-90 ${shouldShowImage ? 'bg-white/80 backdrop-blur-md hover:bg-white' : 'bg-gray-800/50 hover:bg-gray-700/50 border border-white/10'}`}
            title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Heart className={`w-6 h-6 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : shouldShowImage ? 'text-gray-600 group-hover/btn:text-red-500' : 'text-white/80 group-hover/btn:text-red-400'}`} />
          </button>
        )}

        {/* Image Edit Input Overlay */}
        {showEditInput && customImage && (
          <div className="absolute inset-x-0 top-0 p-4 bg-white/90 backdrop-blur-md border-b border-white/50 animate-fade-in-up z-20">
             <form onSubmit={handleEditImage} className="flex gap-2">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="مثال: أضف إضاءة درامية، اجعله كرتوني..."
                className="flex-1 p-3 rounded-xl bg-gray-100/80 border-0 focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder:text-gray-500 text-sm"
                autoFocus
              />
              <button
                type="submit"
                disabled={isImageLoading || !editPrompt.trim()}
                className="p-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:bg-gray-300 transition-colors"
              >
                {isImageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
               <button
                type="button"
                onClick={() => setShowEditInput(false)}
                className="p-3 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
        
        {/* Content in header */}
        <div className={`${shouldShowImage ? 'absolute bottom-0 right-0 p-6 sm:p-8 w-full' : ''}`}>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start">
               <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full backdrop-blur-md border ${difficultyColor} bg-opacity-90 shadow-sm`}>
                {recipe.difficulty}
              </span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight drop-shadow-md">{recipe.name}</h3>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6">
           <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
            <Clock className="w-5 h-5 text-primary-500" />
            <span className="font-bold text-sm">{recipe.time}</span>
          </div>
          {recipe.calories && (
            <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-sm">{recipe.calories} سعرة</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
            <Utensils className="w-5 h-5 text-primary-500" />
            <span className="font-bold text-sm">{recipe.ingredients.length} مكونات</span>
          </div>
        </div>

        <p className="text-gray-600 mb-8 leading-relaxed text-lg">{recipe.description}</p>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-center gap-2 py-4 px-6 font-extrabold rounded-2xl transition-all duration-300 ${
            isExpanded 
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
              : 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20'
          }`}
        >
          {isExpanded ? 'إخفاء التفاصيل' : 'عرض الوصفة الكاملة'}
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded Details Section */}
      <div className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 bg-gray-50/50 border-t border-gray-100">
          <div className="p-6 sm:p-8 grid gap-10 lg:grid-cols-5">
            
            {/* Ingredients Column (2/5 width on large screens) */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h4 className="flex items-center gap-3 font-extrabold text-xl text-gray-800 mb-6">
                  <span className="bg-primary-100 p-2 rounded-xl">
                    <Utensils className="w-6 h-6 text-primary-600" />
                  </span>
                  المكونات
                </h4>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-700 bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-400 shrink-0" />
                      <span className="font-medium">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {recipe.substitutes && recipe.substitutes.length > 0 && (
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                  <h4 className="flex items-center gap-2 font-bold text-lg text-blue-900 mb-4">
                    <Repeat className="w-5 h-5" />
                    بدائل ذكية
                  </h4>
                  <ul className="space-y-4">
                    {recipe.substitutes.map((sub, index) => (
                      <li key={index} className="text-blue-900 bg-white/50 p-3 rounded-xl">
                        <div className="font-bold mb-1">{sub.original}</div>
                        <div className="text-sm text-blue-700 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> استبدله بـ: {sub.replacement}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Instructions Column (3/5 width on large screens) */}
            <div className="lg:col-span-3">
              <h4 className="flex items-center gap-3 font-extrabold text-xl text-gray-800 mb-6">
                <span className="bg-primary-100 p-2 rounded-xl">
                   <ListChecks className="w-6 h-6 text-primary-600" />
                </span>
                طريقة التحضير
              </h4>
              <ol className="space-y-6">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className="relative flex gap-5 group">
                    <div className="flex flex-col items-center">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white font-bold text-lg shadow-md shadow-primary-500/20 shrink-0 z-10 ring-4 ring-white">
                        {index + 1}
                      </span>
                      {index < recipe.instructions.length - 1 && (
                        <div className="w-0.5 grow bg-primary-100 mt-2" />
                      )}
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 grow hover:shadow-md transition-shadow">
                      <p className="leading-relaxed text-gray-700 text-lg">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Helper icon component for the substitutes section
const ArrowRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

export default RecipeCard;
