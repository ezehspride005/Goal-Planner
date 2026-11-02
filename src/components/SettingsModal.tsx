import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReminderSettings } from '../types/reminder';
import { ReminderSettingsSection } from './reminders/ReminderSettingsSection';
import {
  X,
  LogOut,
  User,
  Mail,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Cloud,
  ChevronRight,
  BookOpen,
  Bell,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  reminderSettings: ReminderSettings;
  onUpdateReminderSettings: (newSettings: ReminderSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  reminderSettings,
  onUpdateReminderSettings,
}) => {
  const { user, profile, logOut, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'reminders'>('account');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.firstName || '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await updateUserProfile({
        firstName: newName.trim(),
        displayName: newName.trim(),
      });
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logOut();
      setShowLogoutConfirm(false);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const userName = profile?.firstName || user?.displayName?.split(' ')[0] || 'friend';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] my-8 relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#3F5A44]/70 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/50 transition cursor-pointer"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#F8DDE3] flex items-center justify-center text-[#3F5A44] shadow-xs">
            <span className="text-xl">🌸</span>
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#3F5A44]">
              Settings
            </h2>
            <p className="text-xs text-[#4A3038]/60">
              Your account details and daily reminders
            </p>
          </div>
        </div>

        {/* Segmented Tab Bar */}
        <div className="flex items-center p-1 rounded-2xl bg-white border border-[#F8DDE3] mb-5 gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'account'
                ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs'
                : 'text-[#4A3038]/80 hover:bg-[#F8DDE3]/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'reminders'
                ? 'bg-[#3F5A44] text-[#FFFAF7] shadow-xs'
                : 'text-[#4A3038]/80 hover:bg-[#F8DDE3]/40'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Reminders</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {activeTab === 'reminders' ? (
            <ReminderSettingsSection
              settings={reminderSettings}
              onUpdateSettings={onUpdateReminderSettings}
              userName={userName}
            />
          ) : user ? (
            <div className="space-y-4">
              {/* User Profile Card */}
              <div className="p-4 rounded-2xl bg-white/80 border border-[#F8DDE3] shadow-xs">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#CFDDC9] text-[#3F5A44] font-serif font-bold text-lg flex items-center justify-center shadow-xs">
                      {(profile?.firstName || user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="px-2 py-1 rounded-xl border border-[#A9C2A5] text-xs font-bold text-[#3F5A44] w-28 bg-[#FFFAF7]"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveName}
                            className="px-2 py-1 bg-[#A9C2A5] text-[#3F5A44] rounded-xl text-xs font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-serif text-base font-bold text-[#3F5A44]">
                            {profile?.firstName || user.displayName || 'Goal Planner'}
                          </h3>
                          <button
                            onClick={() => {
                              setNewName(profile?.firstName || '');
                              setIsEditingName(true);
                            }}
                            className="text-[10px] text-[#3F5A44]/70 hover:underline cursor-pointer"
                          >
                            edit
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-[#4A3038]/70 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-[#3F5A44]/60" />
                        {user.email || 'Google Account'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#CFDDC9]/70 text-[#3F5A44]">
                    {profile?.authProvider === 'google' ? 'Google' : 'Email Verified'}
                  </span>
                </div>

                {/* Focus Area */}
                {profile?.appPurpose && (
                  <div className="mt-3 pt-3 border-t border-[#F8DDE3]/60 flex items-center justify-between text-xs">
                    <span className="text-[#4A3038]/70">Focus Purpose:</span>
                    <span className="font-semibold text-[#3F5A44] bg-[#F8DDE3]/40 px-2.5 py-1 rounded-xl">
                      {profile.appPurpose}
                    </span>
                  </div>
                )}
              </div>

              {/* Cloud Sync Status */}
              <div className="p-3.5 rounded-2xl bg-[#CFDDC9]/40 border border-[#A9C2A5]/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#A9C2A5] text-[#3F5A44] flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#3F5A44]">
                      Cloud Sync Active
                    </p>
                    <p className="text-[11px] text-[#4A3038]/70">
                      Your goals, tasks, victory tokens, and reminders sync automatically.
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#3F5A44]" />
              </div>

              {/* Firebase Setup Guide Accordion Button */}
              <button
                type="button"
                onClick={() => setShowSetupGuide(!showSetupGuide)}
                className="w-full p-3.5 rounded-2xl bg-white/70 border border-[#F8DDE3] hover:bg-[#F8DDE3]/30 transition text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-[#3F5A44]" />
                  <span className="text-xs font-semibold text-[#3F5A44]">
                    Firebase Setup Guide & Domain Settings
                  </span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-[#4A3038]/60 transition-transform ${
                    showSetupGuide ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Setup Guide Content */}
              {showSetupGuide && (
                <div className="p-4 rounded-2xl bg-white border border-[#F8DDE3] text-xs space-y-3 animate-fade-in">
                  <h4 className="font-serif font-bold text-sm text-[#3F5A44]">
                    Firebase Setup Checklist
                  </h4>
                  <p className="text-[11px] text-[#4A3038]/80 leading-relaxed">
                    Your Firestore database and security rules have already been provisioned and deployed. To complete sign-in in your own environment:
                  </p>

                  <div className="space-y-2.5 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3]">
                      <span className="font-bold text-[#3F5A44] block mb-0.5">
                        1. Enable Authentication Providers:
                      </span>
                      <p className="text-[#4A3038]/70">
                        In the Firebase Console under <strong>Authentication &gt; Sign-in method</strong>, enable <strong>Google</strong> and <strong>Email/Password</strong>.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3]">
                      <span className="font-bold text-[#3F5A44] block mb-0.5">
                        2. Add Authorized Domain:
                      </span>
                      <p className="text-[#4A3038]/70 mb-1">
                        In <strong>Authentication &gt; Settings &gt; Authorized domains</strong>, ensure this domain is added:
                      </p>
                      <code className="block p-1.5 rounded-lg bg-white border border-[#F8DDE3] text-[10px] text-[#3F5A44] font-mono break-all select-all">
                        {currentDomain}
                      </code>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3]">
                      <span className="font-bold text-[#3F5A44] block mb-0.5">
                        3. Cloud Messaging (Web Push):
                      </span>
                      <p className="text-[#4A3038]/70">
                        Generate your Web Push certificate in <strong>Project Settings &gt; Cloud Messaging</strong> to enable device push tokens.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Log Out Button */}
              {!showLogoutConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-3 px-4 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center animate-fade-in">
                  <p className="text-xs font-semibold text-rose-800 mb-2">
                    Are you sure you want to log out?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 py-2 rounded-xl bg-white border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-100/50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Yes, Log Out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest state */
            <div className="space-y-4 text-center">
              <div className="p-5 rounded-2xl bg-white/80 border border-[#F8DDE3] shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#F8DDE3] text-[#3F5A44] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#3F5A44] mb-1">
                  You're using Local Mode
                </h3>
                <p className="text-xs text-[#4A3038]/70 leading-relaxed mb-4">
                  Sign in to save your yearly roadmaps, daily checklists, reminders, and victory tokens securely across your iPhone, Android, and computer.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-bold text-xs tracking-wide shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sign Up / Log In</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
