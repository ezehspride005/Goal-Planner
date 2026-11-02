import React, { useState, useEffect } from 'react';
import { GoalPlan } from './types/goal';
import { ReminderSettings } from './types/reminder';
import { SetGoalView } from './components/SetGoalView';
import { DailyTasksView } from './components/DailyTasksView';
import { MonthlyGoalsView } from './components/MonthlyGoalsView';
import { TraceabilityMathView } from './components/TraceabilityMathView';
import { WeeklyCheckInView } from './components/WeeklyCheckInView';
import { DashboardView } from './components/DashboardView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthModal } from './components/auth/AuthModal';
import { PersonalizationModal } from './components/auth/PersonalizationModal';
import { SettingsModal } from './components/SettingsModal';
import { ReminderPermissionModal } from './components/reminders/ReminderPermissionModal';
import {
  DEFAULT_REMINDER_SETTINGS,
  REMINDERS_STORAGE_KEY,
  evaluatePeriodicReminders,
  getNotificationPermission,
} from './utils/notifications';
import { useAuth } from './context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import {
  CheckSquare,
  Calendar,
  Layers,
  Sparkles,
  Award,
  PlusCircle,
  RotateCcw,
  CalendarCheck,
  User,
  Settings,
  CloudCheck,
  LogIn,
  LayoutDashboard,
  Bell,
} from 'lucide-react';

const STORAGE_KEY = 'goal_planner_active_plan_v1';

export default function App() {
  const { user, profile, loading: authLoading, updateUserProfile } = useAuth();
  const [activePlan, setActivePlan] = useState<GoalPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'dashboard' | 'weekly' | 'monthly' | 'math' | 'new_goal'>('daily');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Auth & Settings modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Reminders state
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [showReminderPermissionModal, setShowReminderPermissionModal] = useState(false);

  // Load plan & reminder settings from localStorage on initial mount
  useEffect(() => {
    try {
      const storedPlan = localStorage.getItem(STORAGE_KEY);
      if (storedPlan) {
        setActivePlan(JSON.parse(storedPlan));
      }

      const storedReminders = localStorage.getItem(REMINDERS_STORAGE_KEY);
      if (storedReminders) {
        setReminderSettings((prev) => ({
          ...prev,
          ...JSON.parse(storedReminders),
        }));
      }

      // Check URL parameters for tab navigation (e.g. from notification clicks: /?tab=weekly)
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const tabParam = searchParams.get('tab');
        if (
          tabParam &&
          ['daily', 'dashboard', 'weekly', 'monthly', 'math'].includes(tabParam)
        ) {
          setActiveTab(tabParam as any);
        }
      }
    } catch (err) {
      console.error('Failed to parse stored applet state:', err);
    } finally {
      setIsLoaded(true);
    }

    // Listen to custom navigation events from notifications
    const handleNavEvent = (e: any) => {
      if (e.detail && ['daily', 'dashboard', 'weekly', 'monthly', 'math'].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('GOAL_PLANNER_NAV', handleNavEvent);

    // Listen to service worker postMessages
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_TAB' && event.data.tab) {
        setActiveTab(event.data.tab);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('GOAL_PLANNER_NAV', handleNavEvent);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // When user logs in, load cloud plan & cloud reminder settings
  useEffect(() => {
    if (!user) return;

    // Load reminder settings from cloud profile if available
    if (profile?.reminderSettings) {
      setReminderSettings((prev) => ({
        ...prev,
        ...profile.reminderSettings,
      }));
      try {
        localStorage.setItem(
          REMINDERS_STORAGE_KEY,
          JSON.stringify({ ...reminderSettings, ...profile.reminderSettings })
        );
      } catch (e) {
        console.error(e);
      }
    }

    // Check if we should present the gentle reminders permission modal
    if (
      profile &&
      profile.onboarded &&
      !profile.reminderSettings?.promptDismissed &&
      getNotificationPermission() === 'default'
    ) {
      setShowReminderPermissionModal(true);
    }

    const syncUserCloudPlan = async () => {
      try {
        const planDocRef = doc(db, 'plans', `plan_${user.uid}`);
        const snap = await getDoc(planDocRef);

        if (snap.exists()) {
          const remotePlan = snap.data() as GoalPlan;
          setActivePlan(remotePlan);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remotePlan));
          } catch (e) {
            console.error(e);
          }
        } else if (activePlan) {
          // Sync current local plan to cloud for new authenticated user
          const cloudPlan: GoalPlan = {
            ...activePlan,
            id: `plan_${user.uid}`,
            ownerId: user.uid,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(planDocRef, cloudPlan);
          setActivePlan(cloudPlan);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudPlan));
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        console.warn('Firestore sync check failed (continuing with local data):', err);
      }
    };

    syncUserCloudPlan();
  }, [user?.uid, profile?.onboarded]);

  // Update reminder settings helper
  const handleUpdateReminderSettings = (newSettings: ReminderSettings) => {
    setReminderSettings(newSettings);
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
    if (user) {
      updateUserProfile({ reminderSettings: newSettings }).catch((err) => {
        console.warn('Could not sync reminder settings to cloud (saved locally):', err);
      });
    }
  };

  // Periodic reminder evaluation every 60 seconds
  useEffect(() => {
    if (!activePlan || !reminderSettings.enabled) return;

    const interval = setInterval(async () => {
      const greeting = profile?.firstName || user?.displayName?.split(' ')[0] || '';
      const updated = await evaluatePeriodicReminders(activePlan, reminderSettings, greeting);
      if (updated) {
        handleUpdateReminderSettings(updated);
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [activePlan, reminderSettings, profile?.firstName, user?.displayName]);

  // Save to localStorage & Cloud Firestore whenever plan changes
  const handleUpdatePlan = (updatedPlan: GoalPlan) => {
    setActivePlan(updatedPlan);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlan));
    } catch (err) {
      console.error('Failed to save plan to storage:', err);
    }

    // Two-way private cloud sync if authenticated
    if (user) {
      const planDocRef = doc(db, 'plans', `plan_${user.uid}`);
      setDoc(
        planDocRef,
        {
          ...updatedPlan,
          id: `plan_${user.uid}`,
          ownerId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => {
        console.warn('Cloud sync error (saved locally):', err);
      });
    }
  };

  const handlePlanGenerated = (newPlan: GoalPlan) => {
    const enrichedPlan: GoalPlan = user
      ? { ...newPlan, id: `plan_${user.uid}`, ownerId: user.uid }
      : newPlan;
    handleUpdatePlan(enrichedPlan);
    setActiveTab('daily');

    // If reminders haven't been prompted yet, show the friendly permission modal
    if (!reminderSettings.promptDismissed && getNotificationPermission() === 'default') {
      setShowReminderPermissionModal(true);
    }
  };

  const handleConfirmReset = () => {
    setActivePlan(null);
    localStorage.removeItem(STORAGE_KEY);
    setActiveTab('new_goal');
    setShowResetModal(false);
  };

  if (!isLoaded || authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFAF7] flex items-center justify-center text-[#4A3038]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-3 border-[#A9C2A5] border-t-transparent animate-spin" />
          <p className="font-serif text-sm tracking-wide text-[#3F5A44]">Opening Goal Planner...</p>
        </div>
      </div>
    );
  }

  // If no plan is set yet, show the Set Goal screen directly
  const isSettingGoal = !activePlan || activeTab === 'new_goal';

  // Greeting name
  const greetingName = profile?.firstName || user?.displayName?.split(' ')[0] || '';

  // Show Personalization modal if user signed in but hasn't completed onboarding questions
  const needsPersonalization = Boolean(user && profile && !profile.onboarded);

  return (
    <div className="min-h-screen bg-[#FFFAF7] text-[#4A3038] flex flex-col selection:bg-[#F8DDE3] selection:text-[#3F5A44]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FFFAF7]/90 backdrop-blur-md border-b border-[#F8DDE3]/80 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Personalized Greeting */}
          <div
            onClick={() => activePlan && setActiveTab('daily')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F8DDE3] flex items-center justify-center shadow-xs">
              <span className="text-lg">🌸</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg sm:text-xl font-bold text-[#3F5A44] leading-tight">
                  Goal Planner
                </h1>
                {greetingName && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CFDDC9]/70 text-[#3F5A44] border border-[#A9C2A5]/50">
                    Hello, {greetingName}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-[#4A3038]/60 font-medium hidden sm:block">
                Big Goals Broken Down into Easy Daily Steps
              </p>
            </div>
          </div>

          {/* Right Header Controls: Tokens counter + PWA Install + User/Settings */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Token Counter Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CFDDC9]/70 border border-[#A9C2A5]/70 text-[#3F5A44] font-bold text-xs sm:text-sm shadow-2xs"
              title={`${activePlan?.tokensEarned || 0} Tokens Earned`}
            >
              <Award className="w-4 h-4 text-[#3F5A44]" />
              <span>{activePlan?.tokensEarned || 0}</span>
              <span className="text-[11px] font-medium hidden xs:inline text-[#3F5A44]/80">Tokens</span>
            </div>

            {/* PWA Install Button (Android / iOS) */}
            <PWAInstallButton />

            {/* Reminders Quick Access Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="relative p-2 rounded-xl text-[#3F5A44]/70 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/50 transition cursor-pointer"
              title="Reminders & Push Notifications"
              aria-label="Open reminders settings"
            >
              <Bell className="w-4 h-4" />
              {reminderSettings.enabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#A9C2A5] ring-1 ring-white" />
              )}
            </button>

            {/* Reset / New Goal Button */}
            {activePlan && (
              <button
                onClick={() => setShowResetModal(true)}
                className="p-2 rounded-xl text-[#3F5A44]/70 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/50 transition cursor-pointer"
                title="Start a new goal"
                aria-label="Start a new yearly goal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* User Account / Settings Button */}
            {user ? (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white border border-[#F8DDE3] hover:border-[#A9C2A5] hover:bg-[#F8DDE3]/30 transition cursor-pointer shadow-2xs"
                title="Account Settings & Cloud Sync"
                aria-label="Open settings"
              >
                <div className="w-6 h-6 rounded-xl bg-[#A9C2A5] text-[#3F5A44] font-serif font-bold text-xs flex items-center justify-center">
                  {(profile?.firstName || user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-[#3F5A44] hidden md:inline max-w-[80px] truncate">
                  {greetingName || 'Account'}
                </span>
                <Settings className="w-3.5 h-3.5 text-[#3F5A44]/70 hidden sm:block" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#F8DDE3] hover:bg-[#f3cbd4] text-[#3F5A44] text-xs font-bold transition cursor-pointer shadow-2xs"
                title="Sign in or create account"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile greeting bar */}
        {greetingName && (
          <div className="sm:hidden max-w-4xl mx-auto pt-1.5 flex items-center justify-between text-[11px] text-[#3F5A44]">
            <span className="font-semibold flex items-center gap-1">
              <span>🌸</span>
              <span>Hello, {greetingName}</span>
            </span>
            {profile?.appPurpose && (
              <span className="text-[10px] text-[#4A3038]/60 truncate max-w-[170px]">
                {profile.appPurpose}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 pt-2">
        {isSettingGoal ? (
          <SetGoalView
            onPlanGenerated={handlePlanGenerated}
            existingPlan={activePlan}
          />
        ) : (
          <>
            {/* Top Navigation Tabs for Desktop/Tablet */}
            <div className="max-w-4xl mx-auto px-4 mt-2 mb-4 hidden sm:block">
              <div className="flex items-center justify-center p-1.5 rounded-2xl bg-white/70 border border-[#F8DDE3] shadow-xs gap-1">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`flex-1 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'daily'
                      ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs font-semibold'
                      : 'text-[#4A3038] hover:bg-[#F8DDE3]/50'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Today's Plan</span>
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs font-semibold'
                      : 'text-[#4A3038] hover:bg-[#F8DDE3]/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`flex-1 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'weekly'
                      ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs font-semibold'
                      : 'text-[#4A3038] hover:bg-[#F8DDE3]/50'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Check-in</span>
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`flex-1 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'monthly'
                      ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs font-semibold'
                      : 'text-[#4A3038] hover:bg-[#F8DDE3]/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>12 Months</span>
                </button>
                <button
                  onClick={() => setActiveTab('math')}
                  className={`flex-1 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'math'
                      ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs font-semibold'
                      : 'text-[#4A3038] hover:bg-[#F8DDE3]/50'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>How It Works</span>
                </button>
              </div>
            </div>

            {/* Render Selected View */}
            {activeTab === 'daily' && (
              <DailyTasksView
                plan={activePlan}
                onUpdatePlan={handleUpdatePlan}
                onOpenSetGoal={() => setActiveTab('new_goal')}
                reminderSettings={reminderSettings}
                onUpdateReminderSettings={handleUpdateReminderSettings}
              />
            )}
            {activeTab === 'dashboard' && (
              <DashboardView
                plan={activePlan}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onUpdatePlan={handleUpdatePlan}
              />
            )}
            {activeTab === 'weekly' && (
              <WeeklyCheckInView
                plan={activePlan}
                onUpdatePlan={handleUpdatePlan}
              />
            )}
            {activeTab === 'monthly' && (
              <MonthlyGoalsView
                plan={activePlan}
                onUpdatePlan={handleUpdatePlan}
              />
            )}
            {activeTab === 'math' && (
              <TraceabilityMathView plan={activePlan} />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {activePlan && (
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFAF7]/95 backdrop-blur-md border-t border-[#F8DDE3] px-2 py-1.5 sm:hidden pb-safe shadow-lg"
        >
          <div className="flex items-center justify-around">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition cursor-pointer ${
                activeTab === 'daily'
                  ? 'text-[#3F5A44] font-bold'
                  : 'text-[#4A3038]/60 hover:text-[#4A3038]'
              }`}
            >
              <div
                className={`p-1 rounded-xl ${
                  activeTab === 'daily' ? 'bg-[#A9C2A5]/40 text-[#3F5A44]' : 'bg-transparent'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px]">Today</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-[#3F5A44] font-bold'
                  : 'text-[#4A3038]/60 hover:text-[#4A3038]'
              }`}
            >
              <div
                className={`p-1 rounded-xl ${
                  activeTab === 'dashboard' ? 'bg-[#A9C2A5]/40 text-[#3F5A44]' : 'bg-transparent'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <span className="text-[10px]">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition cursor-pointer ${
                activeTab === 'weekly'
                  ? 'text-[#3F5A44] font-bold'
                  : 'text-[#4A3038]/60 hover:text-[#4A3038]'
              }`}
            >
              <div
                className={`p-1 rounded-xl ${
                  activeTab === 'weekly' ? 'bg-[#A9C2A5]/40 text-[#3F5A44]' : 'bg-transparent'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px]">Check-in</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition cursor-pointer ${
                activeTab === 'monthly'
                  ? 'text-[#3F5A44] font-bold'
                  : 'text-[#4A3038]/60 hover:text-[#4A3038]'
              }`}
            >
              <div
                className={`p-1 rounded-xl ${
                  activeTab === 'monthly' ? 'bg-[#A9C2A5]/40 text-[#3F5A44]' : 'bg-transparent'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[10px]">12 Months</span>
            </button>

            <button
              onClick={() => setActiveTab('math')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition cursor-pointer ${
                activeTab === 'math'
                  ? 'text-[#3F5A44] font-bold'
                  : 'text-[#4A3038]/60 hover:text-[#4A3038]'
              }`}
            >
              <div
                className={`p-1 rounded-xl ${
                  activeTab === 'math' ? 'bg-[#A9C2A5]/40 text-[#3F5A44]' : 'bg-transparent'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-[10px]">How It Works</span>
            </button>
          </div>
        </nav>
      )}

      {/* In-app Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F8DDE3] text-[#3F5A44] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#3F5A44] mb-2">
              Start a New Yearly Goal?
            </h3>
            <p className="text-xs sm:text-sm text-[#4A3038]/80 mb-5 leading-relaxed">
              Your current goal, daily plan, and tokens will be replaced with your new goal.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-2xl border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/30 text-xs font-semibold text-[#4A3038] cursor-pointer"
              >
                Keep Current Goal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-xs font-semibold text-[#3F5A44] shadow-xs cursor-pointer active:scale-98"
              >
                Yes, Start New Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal (Google 1-tap, Email Signup/Signin, 6-code verification, Password reset) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />

      {/* Personalization Modal (shown right after first sign in: first name & purpose) */}
      <PersonalizationModal
        isOpen={needsPersonalization}
        onComplete={() => {
          setActiveTab('new_goal');
        }}
      />

      {/* Settings Modal (User details, cloud sync status, reminders, setup instructions, Log out) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenAuth={() => {
          setShowSettingsModal(false);
          setAuthMode('signin');
          setShowAuthModal(true);
        }}
        reminderSettings={reminderSettings}
        onUpdateReminderSettings={handleUpdateReminderSettings}
      />

      {/* Gentle Reminders Permission Prompt (shown post-signup or on first plan generation) */}
      <ReminderPermissionModal
        isOpen={showReminderPermissionModal}
        userName={greetingName}
        onAllow={async () => {
          const updated: ReminderSettings = {
            ...reminderSettings,
            enabled: true,
            promptDismissed: true,
          };
          handleUpdateReminderSettings(updated);
          setShowReminderPermissionModal(false);
        }}
        onDismiss={() => {
          const updated: ReminderSettings = {
            ...reminderSettings,
            promptDismissed: true,
          };
          handleUpdateReminderSettings(updated);
          setShowReminderPermissionModal(false);
        }}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
