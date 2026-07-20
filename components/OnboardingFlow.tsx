import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { OnboardingStep, OnboardingData } from '../types';
import { getOnboardingEmail, setOnboardingEmail, setOnboardingToken } from '../services/session';
import {
    Mail, ShieldCheck, Lock, Building2,
    CheckCircle2, Loader2, ChevronRight
} from 'lucide-react';

export const OnboardingFlow: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // UI State
    const [step, setStep] = useState<OnboardingStep>('EMAIL_VERIFICATION');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Signup asks for the gym name only. Company email, TIN, phone, address and
    // website are edited from the Business Profile screen after sign-in.
    const [companyInfo, setCompanyInfo] = useState({
        companyName: ''
    });

    // Handle initial step from URL or state
    useEffect(() => {
        const urlStep = searchParams.get('step') as OnboardingStep;
        if (urlStep) {
            setStep(urlStep);
        }
        
        const savedEmail = getOnboardingEmail();
        if (savedEmail) setEmail(savedEmail);
    }, [searchParams]);

    const handleError = (err: any) => {
        setError(err.message || 'Something went wrong. Please try again.');
        setLoading(false);
    };

    const nextStep = (next: OnboardingStep) => {
        setStep(next);
        setError(null);
        setSuccessMessage(null);
    };

    // --- Action Handlers ---

    const handleRequestEmailOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.onboarding.requestEmailOtp(email);
            setOnboardingEmail(email);
            setSuccessMessage("OTP sent to your email");
            setTimeout(() => nextStep('OTP_CONFIRMATION'), 1500);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    };

    const handleConfirmEmailOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.onboarding.confirmEmailOtp(email, otp);
            nextStep('PASSWORD_CREATION');
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    };

    const handleCreatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await api.onboarding.createPassword(email, password);
            nextStep('COMPANY_STEP_1');
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    };

    const handleCompanyStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.onboarding.companyStep1({
                userEmail: email,
                ...companyInfo
            });
            
            // Onboarding token, not a super admin console token — keep it in its
            // own key so the router does not mistake it for a signed-in session.
            if (res.token) {
                setOnboardingToken(res.token);
            }
            
            setSuccessMessage("Company profile created!");
            nextStep('COMPLETED');
            // Onboarding never issues a super admin console token, so send them to
            // sign in rather than to a dashboard that would bounce them straight back.
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) { handleError(err); }
        finally { setLoading(false); }
    };

    // --- Render Helpers ---

    const ProgressHeader = () => {
        const steps: OnboardingStep[] = [
            'EMAIL_VERIFICATION', 'PASSWORD_CREATION', 'COMPANY_STEP_1', 'COMPLETED'
        ];
        const currentIndex = steps.indexOf(step === 'OTP_CONFIRMATION' ? 'EMAIL_VERIFICATION' : step);
        
        return (
            <div className="flex items-center justify-between mb-8 px-2">
                {steps.map((s, idx) => {
                    const isActive = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;
                    return (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                                isCurrent ? 'bg-blue-600 scale-125 ring-4 ring-blue-100' : 
                                isActive ? 'bg-blue-600' : 'bg-gray-200'
                            }`} />
                            {idx < steps.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-2 transition-all duration-500 ${
                                    idx < currentIndex ? 'bg-blue-600' : 'bg-gray-100'
                                }`} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const CardWrapper = ({ children, title, subtitle, icon: Icon }: any) => (
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl shadow-blue-100/50 p-10 border border-gray-100 animate-in fade-in zoom-in duration-500">
            <ProgressHeader />
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-transform hover:scale-110">
                    <Icon size={32} />
                </div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
                <p className="text-gray-500 mt-2 font-medium">{subtitle}</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-2xl flex items-center gap-3 border border-red-100 animate-shake">
                    <ShieldCheck size={18} /> {error}
                </div>
            )}
            
            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-2xl flex items-center gap-3 border border-green-100">
                    <CheckCircle2 size={18} /> {successMessage}
                </div>
            )}

            {children}
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-12">
            
            {step === 'EMAIL_VERIFICATION' && (
                <CardWrapper 
                    title="Welcome to KazaFit" 
                    subtitle="Enter your email to start the registration" 
                    icon={Mail}
                >
                    <form onSubmit={handleRequestEmailOtp} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                            <input 
                                type="email" required value={email} 
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                placeholder="owner@alphagym.com"
                            />
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Get Started <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                    </form>
                </CardWrapper>
            )}

            {step === 'OTP_CONFIRMATION' && (
                <CardWrapper 
                    title="Verify Email" 
                    subtitle={`Enter the 6-digit code sent to ${email}`} 
                    icon={ShieldCheck}
                >
                    <form onSubmit={handleConfirmEmailOtp} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1">Verification Code</label>
                            <input 
                                type="text" required maxLength={6} value={otp} 
                                onChange={e => setOtp(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-mono text-2xl tracking-[1em] text-center text-gray-900"
                                placeholder="000000"
                            />
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Verify & Continue"}
                        </button>
                        <p className="text-center text-sm text-gray-500 font-medium">
                            Didn't receive a code? <button type="button" onClick={handleRequestEmailOtp} className="text-blue-600 font-bold hover:underline">Resend</button>
                        </p>
                    </form>
                </CardWrapper>
            )}

            {step === 'PASSWORD_CREATION' && (
                <CardWrapper 
                    title="Secure Account" 
                    subtitle="Create a strong password for your dashboard" 
                    icon={Lock}
                >
                    <form onSubmit={handleCreatePassword} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
                            <input 
                                type="password" required value={password} 
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1">Confirm Password</label>
                            <input 
                                type="password" required value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
                        </button>
                    </form>
                </CardWrapper>
            )}

            {step === 'COMPANY_STEP_1' && (
                <CardWrapper 
                    title="Company Profile" 
                    subtitle="Let's set up your business basics" 
                    icon={Building2}
                >
                    <form onSubmit={handleCompanyStep1} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1">Gym Name</label>
                            <input
                                type="text" required
                                value={companyInfo.companyName}
                                onChange={e => setCompanyInfo({...companyInfo, companyName: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                placeholder="Alpha Gym"
                            />
                        </div>
                        <p className="text-xs font-medium text-gray-400 ml-1 leading-relaxed">
                            You can add your TIN, phone, address and other business details
                            later from your Business Profile.
                        </p>
                        <button
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
                        </button>
                    </form>
                </CardWrapper>
            )}

            {step === 'COMPLETED' && (
                <div className="w-full max-w-xl text-center bg-white rounded-3xl shadow-2xl p-16 border border-gray-100 animate-in fade-in zoom-in duration-700">
                    <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full mx-auto flex items-center justify-center mb-8 animate-bounce">
                        <CheckCircle2 size={48} />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 mb-4">You're All Set!</h1>
                    <p className="text-lg text-gray-500 font-medium">Your gym profile has been successfully created. Redirecting to your dashboard...</p>
                    <div className="mt-8 flex justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                </div>
            )}
        </div>
    );
};
