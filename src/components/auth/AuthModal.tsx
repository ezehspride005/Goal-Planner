import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signin',
}) => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    sendVerificationCode,
    verifyCode,
    sendVerificationEmailLink,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'verify' | 'forgot'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification 6-box code state
  const [codeBoxes, setCodeBoxes] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [debugCodeHint, setDebugCodeHint] = useState<string | null>(null);

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultMode]);

  // Resend countdown timer for verification code
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === 'verify' && resendCooldown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, resendCooldown]);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (pass.length < 8) return { score: 1, text: 'Too short (min 8 chars)', color: 'bg-rose-400' };
    if (score <= 2) return { score: 2, text: 'Fair strength', color: 'bg-amber-400' };
    if (score === 3) return { score: 3, text: 'Good strength', color: 'bg-[#A9C2A5]' };
    return { score: 4, text: 'Very strong', color: 'bg-[#3F5A44]' };
  };

  const strength = getPasswordStrength(password);

  // Friendly error message translator
  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email. Would you like to sign up?';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again or tap "Forgot password".';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please choose Sign In.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 8 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-In was closed before completing. Please try again.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection.';
      default:
        return err?.message || 'Something went wrong. Please check your details and try again.';
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsLoading(true);
    try {
      await signUpWithEmail(name, email, password);
      // Dispatch 6-digit confirmation code
      const codeRes = await sendVerificationCode(email);
      if (codeRes.debugCode) {
        setDebugCodeHint(codeRes.debugCode);
      }
      setResendCooldown(30);
      setMode('verify');
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter your email address to receive reset instructions.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccessMessage('Password reset link sent! Please check your email inbox.');
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 6-box code input logic
  const handleCodeChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newBoxes = [...codeBoxes];
    newBoxes[index] = val.slice(-1);
    setCodeBoxes(newBoxes);

    // Auto-focus next box
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 boxes are filled
    const fullCode = newBoxes.join('');
    if (fullCode.length === 6) {
      submitCodeVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeBoxes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteCode = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newBoxes = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newBoxes[i] = pasted[i];
    }
    setCodeBoxes(newBoxes);
    if (pasted.length === 6) {
      submitCodeVerification(pasted);
    }
  };

  const submitCodeVerification = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || codeBoxes.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your confirmation code.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await verifyCode(email, fullCode);
      setSuccessMessage('Email verified successfully! Welcome to Goal Planner.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await sendVerificationCode(email);
      if (res.debugCode) {
        setDebugCodeHint(res.debugCode);
      }
      setResendCooldown(30);
      setSuccessMessage('New 6-digit confirmation code dispatched.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-[#FFFAF7] p-6 sm:p-8 shadow-2xl border border-[#F8DDE3] text-[#4A3038] relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#3F5A44]/60 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/50 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F8DDE3] flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
            <span className="text-2xl">🌸</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#3F5A44]">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'verify' && 'Check Your Email'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h2>
          <p className="text-xs text-[#4A3038]/70 mt-1 max-w-xs mx-auto">
            {mode === 'signin' && 'Sign in to access your synchronized goals, daily lists, and victory tokens.'}
            {mode === 'signup' && 'One yearly goal. Mathematically broken down and backed by daily tokens.'}
            {mode === 'verify' && `We sent a 6-digit confirmation code to ${email}.`}
            {mode === 'forgot' && 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-[#CFDDC9] border border-[#A9C2A5] text-[#3F5A44] text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. CONTINUOUS GOOGLE ONE-TAP BUTTON (for signin & signup) */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full min-h-[48px] rounded-2xl bg-white border border-[#3F5A44]/20 hover:bg-[#F8DDE3]/30 text-[#4A3038] font-semibold text-sm flex items-center justify-center gap-3 transition shadow-xs active:scale-98 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#F8DDE3]" />
              <span className="text-[11px] uppercase tracking-wider text-[#4A3038]/60 font-semibold">
                or with email
              </span>
              <div className="flex-1 h-px bg-[#F8DDE3]" />
            </div>
          </div>
        )}

        {/* 2. SIGN IN WITH EMAIL */}
        {mode === 'signin' && (
          <form onSubmit={handleEmailSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#3F5A44] mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#4A3038]/40 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#3F5A44]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[#3F5A44] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#4A3038]/40 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#4A3038]/50 hover:text-[#4A3038] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-sm transition shadow-xs cursor-pointer active:scale-98"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="text-center pt-2 text-xs text-[#4A3038]/80">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className="font-bold text-[#3F5A44] hover:underline cursor-pointer"
              >
                Sign up with email
              </button>
            </div>
          </form>
        )}

        {/* 3. SIGN UP WITH EMAIL */}
        {mode === 'signup' && (
          <form onSubmit={handleEmailSignUp} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#3F5A44] mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#4A3038]/40 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F5A44] mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#4A3038]/40 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F5A44] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#4A3038]/40 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#4A3038]/50 hover:text-[#4A3038] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }} />
                    <div className={`h-full ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }} />
                    <div className={`h-full ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }} />
                    <div className={`h-full ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} style={{ width: '25%' }} />
                  </div>
                  <span className="text-[10px] text-[#4A3038]/70 block font-medium">
                    {strength.text}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F5A44] mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#4A3038]/40 absolute left-3.5 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3 text-[#4A3038]/50 hover:text-[#4A3038] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-sm transition shadow-xs cursor-pointer active:scale-98 mt-2"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up With Email'}
            </button>

            <div className="text-center pt-2 text-xs text-[#4A3038]/80">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className="font-bold text-[#3F5A44] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* 4. EMAIL CONFIRMATION CODE SCREEN (6 individual boxes) */}
        {mode === 'verify' && (
          <div className="space-y-5 text-center">
            <div className="bg-[#F8DDE3]/40 p-4 rounded-2xl border border-[#F8DDE3] text-xs text-[#4A3038]/85 space-y-1">
              <p>Your account stays locked until confirmed.</p>
              <p className="font-semibold text-[#3F5A44]">Codes expire after 10 minutes.</p>
              {debugCodeHint && (
                <div className="mt-2 p-2 rounded-lg bg-white/90 border border-[#A9C2A5] text-[11px] font-bold text-[#3F5A44]">
                  💡 Quick Preview Code: {debugCodeHint}
                </div>
              )}
            </div>

            {/* 6 Code Boxes */}
            <div>
              <label className="block text-xs font-semibold text-[#3F5A44] mb-3">
                Enter 6-Digit Confirmation Code:
              </label>
              <div className="flex items-center justify-center gap-2" onPaste={handlePasteCode}>
                {codeBoxes.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-13 text-center text-xl font-bold rounded-2xl border-2 border-[#A9C2A5]/70 focus:border-[#3F5A44] bg-white text-[#3F5A44] shadow-xs outline-hidden"
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading || codeBoxes.join('').length !== 6}
              onClick={() => submitCodeVerification()}
              className="w-full py-3.5 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] disabled:opacity-50 text-[#3F5A44] font-semibold text-sm transition shadow-xs cursor-pointer active:scale-98"
            >
              {isLoading ? 'Verifying Code...' : 'Confirm Email & Unlock'}
            </button>

            {/* Resend Code & Change Email */}
            <div className="flex flex-col items-center gap-2 pt-2 text-xs">
              <button
                type="button"
                disabled={!canResend || isLoading}
                onClick={handleResendCode}
                className="text-[#3F5A44] font-semibold disabled:opacity-50 hover:underline cursor-pointer"
              >
                {canResend ? 'Resend code' : `Resend code in ${resendCooldown}s`}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className="text-[#4A3038]/70 hover:text-[#4A3038] underline cursor-pointer"
              >
                Change email address
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await sendVerificationEmailLink();
                    setSuccessMessage('Firebase verification link sent directly to your email inbox.');
                  } catch (err: any) {
                    setErrorMessage('Could not send link: ' + err.message);
                  }
                }}
                className="text-[11px] text-[#3F5A44]/75 hover:underline pt-1 cursor-pointer"
              >
                Or use Firebase confirmation link
              </button>
            </div>
          </div>
        )}

        {/* 5. FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3F5A44] mb-1">
                Enter your account email:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#4A3038]/40 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#3F5A44]/20 bg-white text-sm outline-hidden focus:border-[#3F5A44]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-sm transition shadow-xs cursor-pointer active:scale-98"
            >
              {isLoading ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className="text-xs text-[#3F5A44] font-semibold hover:underline cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
