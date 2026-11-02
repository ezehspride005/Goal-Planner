import React, { useState, useEffect } from 'react';
import { GoalPlan, WeeklyCheckIn } from '../types/goal';
import { playGentleChime } from '../utils/sound';
import { appendActivity } from '../utils/activity';
import {
  CalendarCheck,
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Clock,
  Heart,
  History,
  RotateCw,
  Award,
} from 'lucide-react';

interface WeeklyCheckInViewProps {
  plan: GoalPlan;
  onUpdatePlan: (updatedPlan: GoalPlan) => void;
}

const DEFAULT_TWEAKS = [
  {
    title: 'Time-Blocked Outreach Sprint',
    advice: 'Schedule your core outreach within a single uninterrupted 45-minute morning window when willpower is peaked.',
    category: 'Habit' as const,
  },
  {
    title: 'Warm Conversation Reactivation',
    advice: 'Spend Friday revisiting prospects who showed initial interest but have gone quiet over the past 2 weeks.',
    category: 'Strategy' as const,
  },
  {
    title: 'Recovery & Momentum Rhythm',
    advice: 'Protect your weekend recharge time so your focus on Monday starts at 100% capacity.',
    category: 'Pacing' as const,
  },
];

export const WeeklyCheckInView: React.FC<WeeklyCheckInViewProps> = ({ plan, onUpdatePlan }) => {
  // Derive current weekly statistics
  const totalDailyTasks = plan.dailyTasks.length;
  // Estimate current weekly tasks completed based on day streak and tasks
  const estimatedScheduledWeek = totalDailyTasks * 5;
  const estimatedCompletedWeek = Math.min(
    estimatedScheduledWeek,
    plan.dailyTasks.filter((t) => t.completed).length * 5 || Math.round(estimatedScheduledWeek * 0.85)
  );

  // Active current month progress
  const currentMonthGoal = plan.monthlyGoals[0] || {
    monthName: 'Month 1',
    currentValue: 1,
    targetValue: 2,
    unit: plan.metricName || 'units',
  };

  const monthlyPercent = Math.min(
    100,
    Math.round((currentMonthGoal.currentValue / currentMonthGoal.targetValue) * 100)
  );

  // Yearly total progress
  const totalYearlyCompleted = plan.monthlyGoals.reduce((sum, m) => sum + m.currentValue, 0);
  const totalYearlyTarget = plan.yearlyTargetNumber || 25;
  const yearlyPercent = Math.min(100, Math.round((totalYearlyCompleted / totalYearlyTarget) * 100));

  // Form states for current check-in
  const [reflection, setReflection] = useState('');
  const [confidence, setConfidence] = useState<'Crushing It' | 'Steady & On Track' | 'Needs Gentle Focus'>('Steady & On Track');
  const [tweaks, setTweaks] = useState(DEFAULT_TWEAKS);
  const [isLoadingTweaks, setIsLoadingTweaks] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Expanded past check-in detail
  const [expandedPastId, setExpandedPastId] = useState<string | null>(null);

  // Past check-ins list
  const pastCheckIns: WeeklyCheckIn[] = plan.weeklyCheckIns || [];

  // Compute current week date range
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(today);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  const formatDateRange = (d1: Date, d2: Date) => {
    const f1 = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d1);
    const f2 = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d2);
    return `${f1} – ${f2}`;
  };

  const currentRangeStr = formatDateRange(startOfWeek, endOfWeek);
  const currentWeekNumber = pastCheckIns.length + 1;

  // Fetch AI generated tweaks for current week
  const handleRefreshTweaks = async () => {
    setIsLoadingTweaks(true);
    try {
      const res = await fetch('/api/goal/weekly-tweaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearlyGoal: plan.yearlyGoal,
          currentMonth: currentMonthGoal.monthName,
          monthlyTarget: currentMonthGoal.targetValue,
          monthlyCompleted: currentMonthGoal.currentValue,
          tasksCompletedCount: estimatedCompletedWeek,
          totalTasksScheduled: estimatedScheduledWeek,
          userReflection: reflection,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate tweaks');
      const data = await res.json();
      if (data.tweaks && Array.isArray(data.tweaks)) {
        setTweaks(data.tweaks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTweaks(false);
    }
  };

  // Save this week's check-in
  const handleSaveCheckIn = () => {
    const newCheckIn: WeeklyCheckIn = {
      id: `checkin-${Date.now()}`,
      weekNumber: currentWeekNumber,
      dateRange: currentRangeStr,
      completedAt: new Date().toISOString(),
      tasksCompletedCount: estimatedCompletedWeek,
      totalTasksScheduled: estimatedScheduledWeek,
      completionRatePercent: Math.round((estimatedCompletedWeek / estimatedScheduledWeek) * 100),
      monthlyProgress: {
        monthName: currentMonthGoal.monthName,
        completed: currentMonthGoal.currentValue,
        target: currentMonthGoal.targetValue,
        unit: currentMonthGoal.unit,
        percent: monthlyPercent,
      },
      yearlyProgress: {
        completed: totalYearlyCompleted,
        target: totalYearlyTarget,
        unit: plan.metricName || 'units',
        percent: yearlyPercent,
      },
      suggestedTweaks: tweaks,
      userReflection: reflection.trim() || undefined,
      confidenceRating: confidence,
    };

    const updatedCheckIns = [newCheckIn, ...pastCheckIns];

    const planWithCheckIn = appendActivity(
      {
        ...plan,
        weeklyCheckIns: updatedCheckIns,
        tokensEarned: plan.tokensEarned + 1, // Bonus token for completing weekly check-in!
      },
      {
        type: 'weekly_checkin',
        title: `Week ${currentWeekNumber} Check-in Completed 🌸`,
        description: `Logged weekly review with ${Math.round((estimatedCompletedWeek / estimatedScheduledWeek) * 100)}% task completion. +1 Victory Token awarded!`,
      }
    );

    onUpdatePlan(planWithCheckIn);

    playGentleChime();
    setSaveSuccessMsg(`✨ Week ${currentWeekNumber} check-in saved! +1 Victory Token awarded.`);
    setReflection('');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-[#F8DDE3] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8DDE3] flex items-center justify-center text-[#3F5A44] shadow-2xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#A9C2A5] block">
                {currentRangeStr} • Week {currentWeekNumber}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
                Weekly Check-In
              </h2>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CFDDC9]/70 border border-[#A9C2A5] text-[#3F5A44] font-bold text-xs self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>Weekly Check-in</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#4A3038]/80 mt-3 leading-relaxed">
          Take 2 minutes to review what you completed this week, check your progress toward your monthly and yearly goals, and see 2 to 3 simple tips to stay on track.
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-[#CFDDC9] border border-[#A9C2A5] text-[#3F5A44] text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <Sparkles className="w-5 h-5 text-[#3F5A44] shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. WEEKLY PERFORMANCE SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Tasks Completed */}
        <div className="p-5 rounded-3xl bg-white/90 border border-[#F8DDE3] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3F5A44]">
              Tasks Completed
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F8DDE3] text-[#3F5A44]">
              This Week
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-3xl font-bold text-[#3F5A44]">
              {estimatedCompletedWeek}
            </span>
            <span className="text-xs text-[#4A3038]/70">/ {estimatedScheduledWeek} tasks</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#F8DDE3] overflow-hidden">
            <div
              className="h-full bg-[#A9C2A5] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (estimatedCompletedWeek / estimatedScheduledWeek) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#4A3038]/70">
            {Math.round((estimatedCompletedWeek / estimatedScheduledWeek) * 100)}% of scheduled tasks completed.
          </p>
        </div>

        {/* Card 2: Progress Toward Monthly Goal */}
        <div className="p-5 rounded-3xl bg-white/90 border border-[#F8DDE3] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3F5A44]">
              Monthly Goal
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#CFDDC9] text-[#3F5A44]">
              {currentMonthGoal.monthName}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-3xl font-bold text-[#3F5A44]">
              {currentMonthGoal.currentValue}
            </span>
            <span className="text-xs text-[#4A3038]/70">
              / {currentMonthGoal.targetValue} {currentMonthGoal.unit}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#F8DDE3] overflow-hidden">
            <div
              className="h-full bg-[#A9C2A5] rounded-full transition-all duration-300"
              style={{ width: `${monthlyPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-[#4A3038]/70">
            {monthlyPercent}% of this month's target reached.
          </p>
        </div>

        {/* Card 3: Progress Toward Yearly Goal */}
        <div className="p-5 rounded-3xl bg-white/90 border border-[#F8DDE3] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3F5A44]">
              Yearly Goal
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F8DDE3] text-[#3F5A44]">
              Full Year
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-3xl font-bold text-[#3F5A44]">
              {totalYearlyCompleted}
            </span>
            <span className="text-xs text-[#4A3038]/70">
              / {totalYearlyTarget} {plan.metricName}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#F8DDE3] overflow-hidden">
            <div
              className="h-full bg-[#A9C2A5] rounded-full transition-all duration-300"
              style={{ width: `${yearlyPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-[#4A3038]/70">
            {yearlyPercent}% of your yearly goal reached.
          </p>
        </div>
      </div>

      {/* 2. SUGGESTED TWEAKS TO STAY ON TRACK */}
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-[#F8DDE3] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F8DDE3]/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#F8DDE3] text-[#3F5A44]">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3F5A44]">
                Tips to Stay on Track
              </h3>
              <p className="text-xs text-[#4A3038]/75">
                Simple suggestions to help you keep moving forward
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshTweaks}
            disabled={isLoadingTweaks}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/40 text-xs font-medium text-[#3F5A44] transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingTweaks ? 'animate-spin' : ''}`} />
            <span>{isLoadingTweaks ? 'Updating...' : 'New Tips'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tweaks.map((tweak, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3] space-y-2 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#A9C2A5]/30 text-[#3F5A44] inline-block mb-1.5">
                  {tweak.category}
                </span>
                <h4 className="font-serif text-sm font-bold text-[#3F5A44] leading-snug">
                  {tweak.title}
                </h4>
                <p className="text-xs text-[#4A3038]/80 leading-relaxed mt-1">
                  {tweak.advice}
                </p>
              </div>

              <div className="pt-2 text-[10px] font-semibold text-[#A9C2A5] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Keep as weekly focus</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LOG THIS CHECK-IN (Reflection & Confidence) */}
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-[#F8DDE3] shadow-xs space-y-4">
        <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3F5A44]">
          Week {currentWeekNumber} Check-In
        </h3>

        {/* Confidence rating */}
        <div>
          <label className="block text-xs font-semibold text-[#3F5A44] mb-2">
            How do you feel about your pace for next week?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Crushing It', 'Steady & On Track', 'Needs Gentle Focus'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setConfidence(lvl)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border text-center ${
                  confidence === lvl
                    ? 'bg-[#3F5A44] text-[#FFFAF7] border-[#3F5A44] shadow-xs'
                    : 'bg-[#FFFAF7] text-[#4A3038] border-[#F8DDE3] hover:bg-[#F8DDE3]'
                }`}
              >
                {lvl === 'Crushing It' && '🌟 '}
                {lvl === 'Steady & On Track' && '🌿 '}
                {lvl === 'Needs Gentle Focus' && '🌸 '}
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Reflection text */}
        <div>
          <label className="block text-xs font-semibold text-[#3F5A44] mb-1.5">
            Notes or Thoughts (Optional):
          </label>
          <textarea
            rows={2}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="e.g. My conversations went smoothly this week. Need to protect my afternoon time..."
            className="w-full p-3.5 rounded-2xl border border-[#3F5A44]/20 bg-[#FFFAF7] text-xs sm:text-sm text-[#4A3038] outline-hidden focus:border-[#3F5A44] resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveCheckIn}
          className="w-full py-3.5 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-sm shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-[#3F5A44]" />
          <span>Save Week {currentWeekNumber} Check-In (+1 Token)</span>
        </button>
      </div>

      {/* 4. LIST OF PAST CHECK-INS */}
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-[#F8DDE3] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F8DDE3]/70">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#3F5A44]" />
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3F5A44]">
              Past Weekly Check-Ins
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F8DDE3] text-[#3F5A44]">
            {pastCheckIns.length} Saved
          </span>
        </div>

        {pastCheckIns.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#4A3038]/70 space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#F8DDE3]/60 flex items-center justify-center mx-auto text-[#3F5A44]">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="font-medium text-sm text-[#3F5A44]">No check-ins yet</p>
            <p>Save your first check-in above to start your weekly history!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastCheckIns.map((ci) => {
              const isExpanded = expandedPastId === ci.id;

              return (
                <div
                  key={ci.id}
                  className="rounded-2xl border border-[#F8DDE3] bg-[#FFFAF7] overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedPastId(isExpanded ? null : ci.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F8DDE3]/20 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F8DDE3] flex items-center justify-center text-xs font-bold text-[#3F5A44]">
                        W{ci.weekNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-sm font-bold text-[#3F5A44]">
                            Week {ci.weekNumber} ({ci.dateRange})
                          </h4>
                          {ci.confidenceRating && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#CFDDC9] text-[#3F5A44]">
                              {ci.confidenceRating}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#4A3038]/70 mt-0.5">
                          {ci.tasksCompletedCount} / {ci.totalTasksScheduled} tasks done ({ci.completionRatePercent}%)
                          • Monthly: {ci.monthlyProgress.completed}/{ci.monthlyProgress.target} {ci.monthlyProgress.unit}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[#3F5A44]/70">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded past check-in details */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-[#F8DDE3]/70 space-y-3 text-xs bg-white/70 animate-fade-in">
                      {ci.userReflection && (
                        <div className="p-3 rounded-xl bg-[#F8DDE3]/30 border border-[#F8DDE3]/70">
                          <span className="font-bold text-[#3F5A44] block mb-0.5">Reflection:</span>
                          <p className="italic text-[#4A3038]/85">{ci.userReflection}</p>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <span className="font-bold text-[#3F5A44] block">Suggested Tweaks Given:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {ci.suggestedTweaks.map((tw, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3]">
                              <span className="text-[9px] uppercase font-bold text-[#A9C2A5] block">
                                {tw.category}
                              </span>
                              <span className="font-semibold text-[11px] text-[#3F5A44] block">
                                {tw.title}
                              </span>
                              <p className="text-[10px] text-[#4A3038]/80 mt-0.5">{tw.advice}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-[#4A3038]/60 pt-1 border-t border-[#F8DDE3]/50">
                        <span>Recorded on {new Date(ci.completedAt).toLocaleDateString()}</span>
                        <span className="font-semibold text-[#3F5A44]">Yearly Total at that time: {ci.yearlyProgress.completed} / {ci.yearlyProgress.target}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
