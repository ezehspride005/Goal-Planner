import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight, Heart, Briefcase, TrendingUp, Dumbbell, Compass, GraduationCap } from 'lucide-react';

interface PersonalizationModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const PURPOSE_OPTIONS = [
  {
    id: 'Network Marketing & Direct Sales',
    title: 'Network Marketing',
    description: 'Distributor onboarding, team growth & client reach',
    icon: TrendingUp,
    badge: 'Popular',
  },
  {
    id: 'Business & Client Revenue',
    title: 'Business & Revenue',
    description: 'Sales targets, client retention & revenue summits',
    icon: Briefcase,
  },
  {
    id: 'Health & Physical Fitness',
    title: 'Health & Wellness',
    description: 'Body transformation, workout consistency & energy',
    icon: Dumbbell,
  },
  {
    id: 'Personal Mastery & Habits',
    title: 'Personal & Habits',
    description: 'Daily discipline, mindful routines & life balance',
    icon: Heart,
  },
  {
    id: 'Academic & Career Growth',
    title: 'Career & Studies',
    description: 'Certifications, publications & leadership ranks',
    icon: GraduationCap,
  },
  {
    id: 'Creative Writing & Arts',
    title: 'Creative Projects',
    description: 'Book drafting, studio art & creative output',
    icon: Compass,
  },
];

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const { profile, updateUserProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.firstName || profile?.displayName?.split(' ')[0] || '');
  const [selectedPurpose, setSelectedPurpose] = useState<string>(profile?.appPurpose || 'Network Marketing & Direct Sales');
  const [customPurpose, setCustomPurpose] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('Please tell us your first name so we can greet you properly.');
      return;
    }

    const finalPurpose = isCustom ? (customPurpose.trim() || 'Custom Goal') : selectedPurpose;

    setIsSubmitting(true);
    setError(null);
    try {
      await updateUserProfile({
        firstName: firstName.trim(),
        appPurpose: finalPurpose,
        onboarded: true,
      });
      onComplete();
    } catch (err: any) {
      console.error('Failed to save personalization:', err);
      // Even if Firestore fails, allow continuing so the user is never blocked
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[#FFFAF7] p-6 sm:p-8 shadow-2xl border border-[#F8DDE3] text-[#4A3038] my-8">
        {/* Soft Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#F8DDE3] text-[#3F5A44] flex items-center justify-center mb-3 shadow-xs">
            <span className="text-2xl">🌸</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CFDDC9]/70 text-[#3F5A44] text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Welcome to Goal Planner
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
            Let's personalize your journey
          </h2>
          <p className="text-xs sm:text-sm text-[#4A3038]/70 mt-1 max-w-sm">
            Tell us your name and main focus so we can customize your goal planner.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First Name Input */}
          <div>
            <label className="block text-xs font-semibold text-[#3F5A44] uppercase tracking-wider mb-1.5">
              What is your first name? *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#F8DDE3] text-sm text-[#4A3038] placeholder:text-[#4A3038]/40 focus:outline-none focus:ring-2 focus:ring-[#A9C2A5] focus:border-transparent transition shadow-2xs"
            />
            <p className="text-[11px] text-[#4A3038]/60 mt-1">
              We will greet you by name each morning when reviewing today's plan.
            </p>
          </div>

          {/* Main App Purpose */}
          <div>
            <label className="block text-xs font-semibold text-[#3F5A44] uppercase tracking-wider mb-2">
              What will you mainly use Goal Planner for?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PURPOSE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = !isCustom && selectedPurpose === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedPurpose(opt.id);
                      setIsCustom(false);
                    }}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#F8DDE3]/60 border-[#3F5A44] shadow-xs'
                        : 'bg-white/80 border-[#F8DDE3] hover:border-[#A9C2A5] hover:bg-[#FFFAF7]'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected ? 'bg-[#3F5A44] text-[#FFFAF7]' : 'bg-[#F8DDE3]/50 text-[#3F5A44]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif text-xs font-bold text-[#3F5A44] truncate">
                          {opt.title}
                        </span>
                        {opt.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#A9C2A5]/40 text-[#3F5A44] font-medium">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#4A3038]/70 leading-snug line-clamp-2 mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Purpose Option */}
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`w-full text-left p-2.5 rounded-2xl border text-xs transition cursor-pointer ${
                  isCustom
                    ? 'bg-[#F8DDE3]/60 border-[#3F5A44]'
                    : 'bg-white/50 border-dashed border-[#F8DDE3] text-[#4A3038]/70 hover:bg-white'
                }`}
              >
                + Something else (type your own focus)
              </button>
              {isCustom && (
                <input
                  type="text"
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="e.g. Real Estate Licensing, Marathon Training..."
                  className="mt-2 w-full px-4 py-2.5 rounded-2xl bg-white border border-[#F8DDE3] text-xs text-[#4A3038] focus:outline-none focus:ring-2 focus:ring-[#A9C2A5]"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-bold text-sm tracking-wide shadow-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <span>Saving your profile...</span>
            ) : (
              <>
                <span>Set My Yearly Goal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
