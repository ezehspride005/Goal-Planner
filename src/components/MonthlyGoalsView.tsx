import React, { useState } from 'react';
import { MonthlyGoal, GoalPlan, MajorMilestone } from '../types/goal';
import { playGentleChime } from '../utils/sound';
import { appendActivity } from '../utils/activity';
import {
  Lock,
  TrendingUp,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  Award,
  Milestone,
  Edit2,
  Trophy,
  Star,
  Flame,
} from 'lucide-react';

interface MonthlyGoalsViewProps {
  plan: GoalPlan;
  onUpdatePlan: (updatedPlan: GoalPlan) => void;
}

// Available badge options for defining checkpoints
const BADGE_PRESETS = [
  { icon: '🌱', name: 'Bronze Sprout' },
  { icon: '🌸', name: 'Silver Blossom' },
  { icon: '🌿', name: 'Golden Bloom' },
  { icon: '👑', name: 'Summit Crown' },
  { icon: '💎', name: 'Diamond Star' },
  { icon: '🏆', name: 'Trophy of Honor' },
  { icon: '🦋', name: 'Metamorphosis' },
  { icon: '🌺', name: 'Radiant Orchid' },
];

function getDefaultMilestones(yearlyTarget: number, metricName: string): MajorMilestone[] {
  const q1 = Math.max(1, Math.round(yearlyTarget * 0.25));
  const q2 = Math.max(q1 + 1, Math.round(yearlyTarget * 0.5));
  const q3 = Math.max(q2 + 1, Math.round(yearlyTarget * 0.75));
  const q4 = Math.max(q3 + 1, yearlyTarget);

  return [
    {
      id: 'ms-q1',
      title: 'Q1 Foundation & Outreach Launch',
      targetMonth: 3,
      targetCumulativeValue: q1,
      badgeIcon: '🌱',
      badgeName: 'Bronze Sprout',
      description: `Complete the first quarter strong and secure ${q1} ${metricName}.`,
    },
    {
      id: 'ms-q2',
      title: 'Mid-Year Summit Halfway Mark',
      targetMonth: 6,
      targetCumulativeValue: q2,
      badgeIcon: '🌸',
      badgeName: 'Silver Blossom',
      description: `Cross the pivotal 50% threshold with ${q2} cumulative ${metricName}.`,
    },
    {
      id: 'ms-q3',
      title: 'Q3 Acceleration & Scale Sprint',
      targetMonth: 9,
      targetCumulativeValue: q3,
      badgeIcon: '🌿',
      badgeName: 'Golden Bloom',
      description: `Reach ${q3} cumulative ${metricName} entering the year-end closing stretch.`,
    },
    {
      id: 'ms-q4',
      title: 'Annual Victory Summit Finish',
      targetMonth: 12,
      targetCumulativeValue: q4,
      badgeIcon: '👑',
      badgeName: 'Summit Crown',
      description: `Achieve the full annual summit of ${q4} ${metricName}!`,
    },
  ];
}

export const MonthlyGoalsView: React.FC<MonthlyGoalsViewProps> = ({ plan, onUpdatePlan }) => {
  const [selectedQuarter, setSelectedQuarter] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');
  const [editingGoal, setEditingGoal] = useState<MonthlyGoal | null>(null);
  const [newTargetValue, setNewTargetValue] = useState<number>(0);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // State for adding extra goals
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraMonthIndex, setExtraMonthIndex] = useState<number>(1);
  const [extraTitle, setExtraTitle] = useState('');
  const [extraValue, setExtraValue] = useState<number>(1);
  const [extraUnit, setExtraUnit] = useState(plan.metricName || 'units');

  // State for Defining / Editing Major Milestones Checkpoints
  const [editingMilestone, setEditingMilestone] = useState<MajorMilestone | null>(null);
  const [isAddingNewMilestone, setIsAddingNewMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneMonth, setMilestoneMonth] = useState(3);
  const [milestoneTargetValue, setMilestoneTargetValue] = useState(6);
  const [milestoneBadge, setMilestoneBadge] = useState(BADGE_PRESETS[0]);
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneCelebrationMsg, setMilestoneCelebrationMsg] = useState<string | null>(null);

  // Initialize milestones if not already present
  const majorMilestones: MajorMilestone[] =
    plan.majorMilestones && plan.majorMilestones.length > 0
      ? plan.majorMilestones
      : getDefaultMilestones(plan.yearlyTargetNumber || 25, plan.metricName || 'units');

  // Calculate annual metrics
  const originalYearlySum = plan.monthlyGoals
    .filter((m) => !m.isCustomAdded)
    .reduce((sum, m) => sum + (m.originalTargetValue || m.targetValue), 0);

  const currentYearlySum = plan.monthlyGoals.reduce((sum, m) => sum + m.targetValue, 0);
  const totalCompletedSoFar = plan.monthlyGoals.reduce((sum, m) => sum + m.currentValue, 0);
  const raisedBonusTotal = currentYearlySum - originalYearlySum;

  // Filter months by quarter
  const filteredGoals = plan.monthlyGoals.filter((m) => {
    if (selectedQuarter === 'all') return true;
    if (selectedQuarter === 'Q1') return m.monthIndex >= 1 && m.monthIndex <= 3;
    if (selectedQuarter === 'Q2') return m.monthIndex >= 4 && m.monthIndex <= 6;
    if (selectedQuarter === 'Q3') return m.monthIndex >= 7 && m.monthIndex <= 9;
    if (selectedQuarter === 'Q4') return m.monthIndex >= 10 && m.monthIndex <= 12;
    return true;
  });

  const openEditModal = (goal: MonthlyGoal) => {
    setEditingGoal(goal);
    setNewTargetValue(goal.targetValue);
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSaveEdit = () => {
    if (!editingGoal) return;

    // RULE: Lowering target is strictly prohibited!
    const minimumAllowed = Math.max(editingGoal.originalTargetValue, editingGoal.targetValue);
    if (newTargetValue < minimumAllowed) {
      setEditError(
        `Targets are fixed summits and cannot be lowered below ${minimumAllowed} ${editingGoal.unit}. You can only edit them upward!`
      );
      return;
    }

    if (newTargetValue === editingGoal.targetValue) {
      setEditingGoal(null);
      return;
    }

    const updatedGoals = plan.monthlyGoals.map((m) => {
      if (m.id === editingGoal.id) {
        return {
          ...m,
          targetValue: newTargetValue,
          originalTargetValue: m.originalTargetValue || m.targetValue,
        };
      }
      return m;
    });

    let updatedPlan: GoalPlan = {
      ...plan,
      monthlyGoals: updatedGoals,
      majorMilestones: plan.majorMilestones || majorMilestones,
    };

    updatedPlan = appendActivity(updatedPlan, {
      type: 'monthly_edited',
      title: `Raised Target for ${editingGoal.monthName}`,
      description: `Target increased to ${newTargetValue} ${editingGoal.unit} (original baseline ${editingGoal.originalTargetValue} protected).`,
    });

    onUpdatePlan(updatedPlan);
    setEditSuccess(
      `Target raised to ${newTargetValue} ${editingGoal.unit}! (Original ${editingGoal.originalTargetValue} remains preserved)`
    );
    setTimeout(() => {
      setEditingGoal(null);
      setEditSuccess(null);
    }, 1200);
  };

  const handleAddExtraGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraTitle.trim() || extraValue <= 0) return;

    const monthObj = plan.monthlyGoals.find((m) => m.monthIndex === extraMonthIndex && !m.isCustomAdded);
    const monthName = monthObj ? monthObj.monthName : `Month ${extraMonthIndex}`;

    const newExtra: MonthlyGoal = {
      id: `extra-${Date.now()}`,
      monthIndex: extraMonthIndex,
      monthName: `${monthName} (Extra Goal)`,
      targetValue: extraValue,
      originalTargetValue: extraValue,
      currentValue: 0,
      unit: extraUnit,
      milestoneTitle: extraTitle,
      keyFocus: 'Supplemental milestone added on top',
      isCustomAdded: true,
    };

    let updatedPlan: GoalPlan = {
      ...plan,
      monthlyGoals: [...plan.monthlyGoals, newExtra],
      majorMilestones: plan.majorMilestones || majorMilestones,
    };

    updatedPlan = appendActivity(updatedPlan, {
      type: 'monthly_extended',
      title: `Added Extra Goal: "${extraTitle}"`,
      description: `Supplemental target of +${extraValue} ${extraUnit} added on top for ${monthName}.`,
    });

    onUpdatePlan(updatedPlan);
    setIsAddingExtra(false);
    setExtraTitle('');
    setExtraValue(1);
  };

  const handleIncrementProgress = (goalId: string, delta: number) => {
    const updatedGoals = plan.monthlyGoals.map((m) => {
      if (m.id === goalId) {
        const nextVal = Math.max(0, m.currentValue + delta);
        return { ...m, currentValue: nextVal };
      }
      return m;
    });

    const newTotal = updatedGoals.reduce((sum, m) => sum + m.currentValue, 0);

    // Check if any major milestone is reached with this increment!
    let unlockedAnyNew = false;
    let unlockedTitle = '';

    const updatedMilestones = majorMilestones.map((ms) => {
      const isNowReached = ms.isReached || newTotal >= ms.targetCumulativeValue;
      if (!ms.isReached && isNowReached) {
        unlockedAnyNew = true;
        unlockedTitle = ms.title;
        return {
          ...ms,
          isReached: true,
          reachedDate: new Date().toISOString().split('T')[0],
        };
      }
      return ms;
    });

    if (unlockedAnyNew) {
      playGentleChime();
      setMilestoneCelebrationMsg(`🎉 Major Checkpoint Unlocked: "${unlockedTitle}" badge is now active!`);
      setTimeout(() => setMilestoneCelebrationMsg(null), 5000);
    }

    onUpdatePlan({
      ...plan,
      monthlyGoals: updatedGoals,
      majorMilestones: updatedMilestones,
    });
  };

  const openAddExtraForMonth = (monthIndex: number) => {
    setExtraMonthIndex(monthIndex);
    setIsAddingExtra(true);
  };

  // Toggle milestone manually (e.g. user achieved it outside the app)
  const handleToggleMilestoneReached = (milestoneId: string) => {
    const updated = majorMilestones.map((ms) => {
      if (ms.id === milestoneId) {
        const next = !ms.isReached;
        if (next) {
          playGentleChime();
        }
        return {
          ...ms,
          isReached: next,
          reachedDate: next ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return ms;
    });

    onUpdatePlan({
      ...plan,
      majorMilestones: updated,
    });
  };

  // Open modal to define/edit milestone
  const openEditMilestoneModal = (ms: MajorMilestone) => {
    setEditingMilestone(ms);
    setIsAddingNewMilestone(false);
    setMilestoneTitle(ms.title);
    setMilestoneMonth(ms.targetMonth);
    setMilestoneTargetValue(ms.targetCumulativeValue);
    const preset = BADGE_PRESETS.find((b) => b.icon === ms.badgeIcon) || BADGE_PRESETS[0];
    setMilestoneBadge(preset);
    setMilestoneDescription(ms.description);
  };

  const openAddNewMilestoneModal = () => {
    setEditingMilestone(null);
    setIsAddingNewMilestone(true);
    setMilestoneTitle('');
    setMilestoneMonth(3);
    setMilestoneTargetValue(5);
    setMilestoneBadge(BADGE_PRESETS[0]);
    setMilestoneDescription('');
  };

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || milestoneTargetValue <= 0) return;

    let updatedMilestones: MajorMilestone[];

    if (isAddingNewMilestone) {
      const newMs: MajorMilestone = {
        id: `ms-${Date.now()}`,
        title: milestoneTitle,
        targetMonth: milestoneMonth,
        targetCumulativeValue: milestoneTargetValue,
        badgeIcon: milestoneBadge.icon,
        badgeName: milestoneBadge.name,
        description: milestoneDescription || `Target of ${milestoneTargetValue} ${plan.metricName}.`,
        isReached: totalCompletedSoFar >= milestoneTargetValue,
      };
      updatedMilestones = [...majorMilestones, newMs].slice(0, 5); // Allow up to 4-5 major checkpoints
    } else if (editingMilestone) {
      updatedMilestones = majorMilestones.map((ms) => {
        if (ms.id === editingMilestone.id) {
          return {
            ...ms,
            title: milestoneTitle,
            targetMonth: milestoneMonth,
            targetCumulativeValue: milestoneTargetValue,
            badgeIcon: milestoneBadge.icon,
            badgeName: milestoneBadge.name,
            description: milestoneDescription,
            isReached: ms.isReached || totalCompletedSoFar >= milestoneTargetValue,
          };
        }
        return ms;
      });
    } else {
      return;
    }

    onUpdatePlan({
      ...plan,
      majorMilestones: updatedMilestones,
    });

    setEditingMilestone(null);
    setIsAddingNewMilestone(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 1. TOP ANNUAL SUMMARY BANNER */}
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-[#F8DDE3] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F8DDE3]/70">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#F8DDE3] flex items-center justify-center text-[#3F5A44]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3F5A44]">
                  Monthly Goals & Checkpoints
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#3F5A44] bg-[#CFDDC9]/70 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#3F5A44]" />
                    12 Fixed Months
                  </span>
                  <span className="text-xs text-[#4A3038]/60">
                    Cannot be deleted • You can raise targets or add extra goals
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setExtraMonthIndex(1);
              setIsAddingExtra(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-98 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Extra Goal</span>
          </button>
        </div>

        {/* High-level Statistics Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]/80">
            <span className="text-[11px] font-semibold text-[#4A3038]/70 block">Original Goal</span>
            <span className="font-serif text-lg font-bold text-[#3F5A44]">
              {originalYearlySum} <span className="text-xs font-normal text-[#4A3038]/70">{plan.metricName}</span>
            </span>
            <span className="text-[10px] text-[#4A3038]/50 block mt-0.5">Your starting target</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]/80">
            <span className="text-[11px] font-semibold text-[#4A3038]/70 block">Current Target</span>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-lg font-bold text-[#3F5A44]">
                {currentYearlySum}
              </span>
              {raisedBonusTotal > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#A9C2A5]/40 text-[#3F5A44]">
                  +{raisedBonusTotal} Raised
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#4A3038]/50 block mt-0.5">
              {raisedBonusTotal > 0 ? 'Includes raised targets' : 'Matches starting goal'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#F8DDE3]/80">
            <span className="text-[11px] font-semibold text-[#4A3038]/70 block">Completed So Far</span>
            <span className="font-serif text-lg font-bold text-[#3F5A44]">
              {totalCompletedSoFar} <span className="text-xs font-normal text-[#4A3038]/70">{plan.metricName}</span>
            </span>
            <span className="text-[10px] text-[#4A3038]/50 block mt-0.5">
              {Math.min(100, Math.round((totalCompletedSoFar / currentYearlySum) * 100))}% of yearly goal
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8DDE3]/50 border border-[#F8DDE3]">
            <span className="text-[11px] font-semibold text-[#3F5A44] block">Goal Rule</span>
            <span className="text-xs font-bold text-[#4A3038] flex items-center gap-1 mt-1">
              <Lock className="w-3.5 h-3.5 text-[#3F5A44]" />
              Fixed Targets
            </span>
            <span className="text-[10px] text-[#4A3038]/70 block mt-0.5">
              Cannot lower targets
            </span>
          </div>
        </div>
      </div>

      {/* 2. THE NEW 'MILESTONES' CHECKPOINTS SECTION */}
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-[#F8DDE3] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F8DDE3]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#CFDDC9] flex items-center justify-center text-[#3F5A44] shadow-2xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#3F5A44]">
                  Major Checkpoints & Badges
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F8DDE3] text-[#3F5A44]">
                  {majorMilestones.filter((m) => m.isReached || totalCompletedSoFar >= m.targetCumulativeValue).length} of {majorMilestones.length} Badges Reached
                </span>
              </div>
              <p className="text-xs text-[#4A3038]/75 mt-0.5">
                3 to 4 major checkpoints throughout the year. Reach a checkpoint to unlock its badge!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {majorMilestones.length < 4 && (
              <button
                type="button"
                onClick={openAddNewMilestoneModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/40 text-xs font-semibold text-[#3F5A44] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Checkpoint</span>
              </button>
            )}
          </div>
        </div>

        {/* Milestone Celebration Toast Banner */}
        {milestoneCelebrationMsg && (
          <div className="p-3.5 rounded-2xl bg-[#CFDDC9] text-[#3F5A44] text-xs sm:text-sm font-semibold flex items-center gap-2 border border-[#A9C2A5] animate-fade-in">
            <Sparkles className="w-4 h-4 text-[#3F5A44] shrink-0" />
            <span>{milestoneCelebrationMsg}</span>
          </div>
        )}

        {/* Visual Badges Grid (3-4 Checkpoints) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {majorMilestones.map((ms, index) => {
            const isReached = ms.isReached || totalCompletedSoFar >= ms.targetCumulativeValue;
            const progressRatio = Math.min(100, Math.round((totalCompletedSoFar / ms.targetCumulativeValue) * 100));

            return (
              <div
                key={ms.id}
                className={`p-4 rounded-3xl border transition-all duration-300 relative flex flex-col justify-between ${
                  isReached
                    ? 'bg-radial from-[#FFFAF7] to-[#CFDDC9]/50 border-2 border-[#A9C2A5] shadow-sm ring-2 ring-[#A9C2A5]/30'
                    : 'bg-[#FFFAF7]/80 border-[#F8DDE3] hover:bg-[#FFFAF7]'
                }`}
              >
                {/* Header: Milestone Tag & Edit */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F5A44]/70 bg-white/80 px-2 py-0.5 rounded-md border border-[#F8DDE3]">
                      Checkpoint {index + 1} • Mo {ms.targetMonth}
                    </span>

                    <button
                      type="button"
                      onClick={() => openEditMilestoneModal(ms)}
                      className="p-1 rounded-lg text-[#3F5A44]/60 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/60 transition cursor-pointer"
                      title="Edit milestone definition"
                      aria-label={`Edit ${ms.title}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Visual Badge Emblem */}
                  <div className="flex flex-col items-center text-center my-2">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xs transition-transform duration-300 ${
                        isReached
                          ? 'bg-linear-to-tr from-[#CFDDC9] to-[#F8DDE3] border-2 border-[#A9C2A5] scale-105'
                          : 'bg-[#F8DDE3]/40 border border-[#F8DDE3] grayscale-40 opacity-75'
                      }`}
                    >
                      <span>{ms.badgeIcon}</span>
                    </div>

                    <h4 className="font-serif text-sm font-bold text-[#3F5A44] mt-2 leading-tight">
                      {ms.title}
                    </h4>

                    <span className="text-[11px] font-bold text-[#4A3038]/70 block mt-0.5">
                      {ms.badgeName}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#4A3038]/75 text-center line-clamp-2 mb-3">
                    {ms.description}
                  </p>
                </div>

                {/* Progress & Badge Status */}
                <div className="space-y-2 pt-2 border-t border-[#F8DDE3]/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#4A3038]/70 font-medium">Target:</span>
                    <span className="font-bold text-[#3F5A44]">
                      {totalCompletedSoFar} / {ms.targetCumulativeValue} {plan.metricName}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#F8DDE3]/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isReached ? 'bg-[#A9C2A5]' : 'bg-[#A9C2A5]/70'
                      }`}
                      style={{ width: `${progressRatio}%` }}
                    />
                  </div>

                  {/* Status Ribbon / Reached Badge */}
                  <div className="pt-1">
                    {isReached ? (
                      <button
                        type="button"
                        onClick={() => handleToggleMilestoneReached(ms.id)}
                        className="w-full py-1.5 rounded-xl bg-[#A9C2A5] text-[#3F5A44] font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer hover:bg-[#97b393] transition"
                        title="Milestone reached! Tap to toggle"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Badge Unlocked!</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleMilestoneReached(ms.id)}
                        className="w-full py-1.5 rounded-xl bg-white border border-[#F8DDE3] text-[#4A3038]/70 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/30 font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                        title="Tap to manually mark as reached"
                      >
                        <Star className="w-3.5 h-3.5 text-[#A9C2A5]" />
                        <span>In Progress ({progressRatio}%)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FILTER TABS BY QUARTER */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 border border-[#F8DDE3]">
          {(['all', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                selectedQuarter === q
                  ? 'bg-[#3F5A44] text-[#FFFAF7] font-semibold shadow-xs'
                  : 'text-[#4A3038] hover:bg-[#F8DDE3]/50'
              }`}
            >
              {q === 'all'
                ? 'All 12 Months'
                : `${q} (${q === 'Q1' ? 'Jan-Mar' : q === 'Q2' ? 'Apr-Jun' : q === 'Q3' ? 'Jul-Sep' : 'Oct-Dec'})`}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-[#4A3038]/60 hidden sm:inline">
          Showing {filteredGoals.length} of {plan.monthlyGoals.length} milestones
        </span>
      </div>

      {/* 4. 12 FIXED MONTHS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map((month) => {
          const isRaised = month.targetValue > (month.originalTargetValue || month.targetValue);
          const isComplete = month.currentValue >= month.targetValue;
          const progressPercent = Math.min(100, Math.round((month.currentValue / month.targetValue) * 100));

          return (
            <div
              key={month.id}
              className={`p-5 rounded-3xl border transition-all relative ${
                isComplete
                  ? 'bg-[#CFDDC9]/35 border-[#A9C2A5]'
                  : 'bg-white/95 border-[#F8DDE3] shadow-xs'
              }`}
            >
              {/* Header row: Month Badge + Raise Button */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-[#F8DDE3] text-xs font-bold text-[#3F5A44]">
                    {month.monthName}
                  </span>
                  {month.isCustomAdded && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#A9C2A5]/30 text-[#3F5A44]">
                      Extra Goal
                    </span>
                  )}
                  {isRaised && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#CFDDC9] text-[#3F5A44]">
                      <ArrowUpRight className="w-3 h-3 text-[#3F5A44]" />
                      Target Raised (+{month.targetValue - month.originalTargetValue})
                    </span>
                  )}
                </div>

                {/* Raise Target Button */}
                <button
                  onClick={() => openEditModal(month)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#A9C2A5]/25 hover:bg-[#A9C2A5] text-[#3F5A44] text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
                  title="Raise target upward"
                  aria-label={`Raise target for ${month.monthName}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Raise</span>
                </button>
              </div>

              {/* Milestone Title & Key Focus */}
              <h3 className="font-serif text-base font-semibold text-[#4A3038] mb-1">
                {month.milestoneTitle}
              </h3>
              <p className="text-xs text-[#4A3038]/70 mb-3.5 leading-relaxed">
                {month.keyFocus}
              </p>

              {/* Target Box Showing Original Goal AND Raised Target Side by Side */}
              <div className="bg-[#FFFAF7] p-3.5 rounded-2xl border border-[#F8DDE3] mb-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#F8DDE3]/60">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#4A3038]/60 block font-semibold">
                      Original Goal
                    </span>
                    <span className="font-bold text-[#4A3038] text-sm">
                      {month.originalTargetValue || month.targetValue} {month.unit}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#3F5A44] block font-semibold">
                      {isRaised ? 'Raised Target' : 'Current Target'}
                    </span>
                    <span className={`text-sm font-bold ${isRaised ? 'text-[#3F5A44]' : 'text-[#4A3038]'}`}>
                      {month.targetValue} {month.unit}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Numeric Tally */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#4A3038]/70 font-medium">Progress Achieved:</span>
                    <span className="font-bold text-[#3F5A44]">
                      {month.currentValue} / {month.targetValue} {month.unit} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#F8DDE3]/60 overflow-hidden">
                    <div
                      className="h-full bg-[#A9C2A5] rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer controls: Increment/decrement progress + Fixed Lock Indicator */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleIncrementProgress(month.id, -1)}
                    disabled={month.currentValue <= 0}
                    className="w-8 h-8 rounded-xl bg-[#F8DDE3]/40 hover:bg-[#F8DDE3] text-[#4A3038] disabled:opacity-30 text-sm font-bold flex items-center justify-center cursor-pointer transition active:scale-95"
                    aria-label="Decrease progress by 1"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleIncrementProgress(month.id, 1)}
                    className="w-8 h-8 rounded-xl bg-[#A9C2A5]/40 hover:bg-[#A9C2A5] text-[#3F5A44] text-sm font-bold flex items-center justify-center cursor-pointer transition active:scale-95"
                    aria-label="Increase progress by 1"
                  >
                    +
                  </button>
                  <span className="text-xs font-medium text-[#4A3038]/70 ml-1">Log progress</span>
                </div>

                <div className="flex items-center gap-2">
                  {!month.isCustomAdded && (
                    <button
                      onClick={() => openAddExtraForMonth(month.monthIndex)}
                      className="text-xs text-[#3F5A44] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Extra</span>
                    </button>
                  )}

                  {/* Non-deletable indicator */}
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#3F5A44]/75 bg-[#F8DDE3]/40 px-2 py-1 rounded-lg">
                    <Lock className="w-3 h-3 text-[#3F5A44]" />
                    <span>Fixed</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upward-Only Edit Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] relative">
            <button
              onClick={() => setEditingGoal(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#3F5A44]/60 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/50 cursor-pointer"
              aria-label="Close edit modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 rounded-2xl bg-[#A9C2A5]/30 text-[#3F5A44]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3F5A44]">
                  Raise Target: {editingGoal.monthName}
                </h3>
                <p className="text-xs text-[#4A3038]/70">Upward edits only • Original goal remains visible</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#4A3038]/80 mb-4 leading-relaxed">
              You can raise this month’s ambition as high as you want. Lowering a target is strictly disallowed so your yearly summit is preserved.
            </p>

            <div className="bg-[#F8DDE3]/40 p-4 rounded-2xl mb-4 text-xs space-y-2 border border-[#F8DDE3]">
              <div className="flex justify-between items-center">
                <span className="text-[#4A3038]/70 font-semibold">Original Fixed Goal:</span>
                <span className="font-bold text-[#4A3038] bg-white/80 px-2 py-0.5 rounded-md">
                  {editingGoal.originalTargetValue || editingGoal.targetValue} {editingGoal.unit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#4A3038]/70 font-semibold">Current Target:</span>
                <span className="font-bold text-[#3F5A44] bg-[#CFDDC9]/70 px-2 py-0.5 rounded-md">
                  {editingGoal.targetValue} {editingGoal.unit}
                </span>
              </div>
              <p className="text-[11px] text-[#3F5A44]/90 italic pt-1 border-t border-[#F8DDE3]/70">
                ✨ Notice: The original goal will always stay visibly displayed on the card even after raising!
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-semibold text-[#3F5A44]">
                New Target ({editingGoal.unit}) — Minimum is {Math.max(editingGoal.originalTargetValue, editingGoal.targetValue)}:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={newTargetValue <= Math.max(editingGoal.originalTargetValue, editingGoal.targetValue)}
                  onClick={() => setNewTargetValue((prev) => Math.max(editingGoal.targetValue, prev - 1))}
                  className="w-11 h-11 rounded-xl bg-[#F8DDE3] hover:bg-[#F8DDE3]/80 disabled:opacity-30 disabled:cursor-not-allowed text-[#3F5A44] font-bold text-lg flex items-center justify-center cursor-pointer transition"
                  title="Cannot lower below current target"
                >
                  -
                </button>
                <input
                  type="number"
                  min={Math.max(editingGoal.originalTargetValue, editingGoal.targetValue)}
                  value={newTargetValue}
                  onChange={(e) => setNewTargetValue(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-center py-2.5 rounded-xl border border-[#3F5A44]/20 font-bold text-xl text-[#3F5A44] bg-white outline-hidden focus:border-[#3F5A44]"
                />
                <button
                  type="button"
                  onClick={() => setNewTargetValue((prev) => prev + 1)}
                  className="w-11 h-11 rounded-xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-bold text-lg flex items-center justify-center cursor-pointer transition active:scale-95"
                  title="Raise target upward"
                >
                  +
                </button>
              </div>
            </div>

            {editError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#CFDDC9] text-[#3F5A44] text-xs font-semibold mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="flex-1 py-3 rounded-2xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/30 text-xs font-semibold text-[#4A3038] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-xs font-semibold text-[#3F5A44] shadow-xs cursor-pointer active:scale-98"
              >
                Save Raised Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Define / Edit Major Milestone Checkpoint Modal */}
      {(editingMilestone || isAddingNewMilestone) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleSaveMilestone}
            className="w-full max-w-md rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] relative"
          >
            <button
              type="button"
              onClick={() => {
                setEditingMilestone(null);
                setIsAddingNewMilestone(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-[#3F5A44]/60 hover:text-[#3F5A44] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 rounded-2xl bg-[#CFDDC9] text-[#3F5A44]">
                <Milestone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3F5A44]">
                  {isAddingNewMilestone ? 'Define Major Checkpoint' : 'Edit Major Checkpoint'}
                </h3>
                <p className="text-xs text-[#4A3038]/70">Pivotal annual progress badge</p>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                  Checkpoint Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 Foundation: First 6 Partners"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                    Target Month:
                  </label>
                  <select
                    value={milestoneMonth}
                    onChange={(e) => setMilestoneMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm"
                  >
                    {plan.monthlyGoals
                      .filter((m) => !m.isCustomAdded)
                      .map((m) => (
                        <option key={m.id} value={m.monthIndex}>
                          {m.monthName} (Month {m.monthIndex})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                    Cumulative Quota:
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={milestoneTargetValue}
                    onChange={(e) => setMilestoneTargetValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm"
                  />
                </div>
              </div>

              {/* Badge Icon Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#3F5A44] mb-1.5">
                  Select Visual Badge Emblem:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BADGE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setMilestoneBadge(preset)}
                      className={`p-2 rounded-xl text-center border transition cursor-pointer ${
                        milestoneBadge.name === preset.name
                          ? 'bg-[#A9C2A5]/30 border-[#3F5A44] ring-2 ring-[#3F5A44]/20'
                          : 'bg-white border-[#F8DDE3] hover:bg-[#F8DDE3]/40'
                      }`}
                    >
                      <span className="text-xl block">{preset.icon}</span>
                      <span className="text-[10px] text-[#4A3038] truncate block mt-0.5">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                  Why this checkpoint matters:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Validates outreach funnel before scaling"
                  value={milestoneDescription}
                  onChange={(e) => setMilestoneDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingMilestone(null);
                  setIsAddingNewMilestone(false);
                }}
                className="flex-1 py-3 rounded-2xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/30 text-xs font-semibold text-[#4A3038] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-xs font-semibold text-[#3F5A44] shadow-xs cursor-pointer active:scale-98"
              >
                Save Checkpoint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Extra Goal Modal */}
      {isAddingExtra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleAddExtraGoal}
            className="w-full max-w-md rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] relative"
          >
            <button
              type="button"
              onClick={() => setIsAddingExtra(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#3F5A44]/60 hover:text-[#3F5A44] cursor-pointer"
              aria-label="Close add extra goal modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 rounded-2xl bg-[#F8DDE3] text-[#3F5A44]">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3F5A44]">
                  Add Extra Goal On Top
                </h3>
                <p className="text-xs text-[#4A3038]/70">Supplemental target for your roadmap</p>
              </div>
            </div>

            <p className="text-xs text-[#4A3038]/80 mb-4 leading-relaxed">
              Add a bonus goal on top of your existing 12 months. Like all goals in Goal Planner, once added it cannot be deleted.
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                  Assign to Month:
                </label>
                <select
                  value={extraMonthIndex}
                  onChange={(e) => setExtraMonthIndex(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                >
                  {plan.monthlyGoals
                    .filter((m) => !m.isCustomAdded)
                    .map((m) => (
                      <option key={m.id} value={m.monthIndex}>
                        {m.monthName} (Month {m.monthIndex})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                  Extra Milestone Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Host partner recruitment webinar, bonus pipeline push"
                  value={extraTitle}
                  onChange={(e) => setExtraTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                    Target Quota:
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={extraValue}
                    onChange={(e) => setExtraValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                    Unit:
                  </label>
                  <input
                    type="text"
                    required
                    value={extraUnit}
                    onChange={(e) => setExtraUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddingExtra(false)}
                className="flex-1 py-3 rounded-2xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/30 text-xs font-semibold text-[#4A3038] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-xs font-semibold text-[#3F5A44] shadow-xs cursor-pointer active:scale-98"
              >
                Confirm Extra Goal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
