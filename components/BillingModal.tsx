import React, { useState, useEffect } from 'react';
import {
    Check, Shield, Star, Rocket, Info,
    CreditCard, Smartphone, History, Loader2,
    Calendar, CheckCircle2, ChevronRight, AlertCircle, Settings, Clock
} from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { Company, BillingPlan, BillingAddon, PaymentHistory, PlanAudit } from '../types';

interface BillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: Company;
}

// Handles both a plain array response and an { data: [...] } wrapped response
function extractArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) {
        return (raw as any).data as T[];
    }
    return [];
}

export const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose, company }) => {
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [addons, setAddons] = useState<BillingAddon[]>([]);
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [currentPlan, setCurrentPlan] = useState<BillingPlan | null>(null);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [initiating, setInitiating] = useState(false);
    const [activeTab, setActiveTab] = useState<'plans' | 'history' | 'override' | 'audits'>('plans');

    // Selection state
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('annually');
    const [paymentType, setPaymentType] = useState<'mobile' | 'card'>('mobile');
    const [phoneNumber, setPhoneNumber] = useState(company.phone || '');

    // Override State
    const [audits, setAudits] = useState<PlanAudit[]>([]);
    const [overridePlanId, setOverridePlanId] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [renewalAt, setRenewalAt] = useState('');
    const [reason, setReason] = useState('');
    const [isOverriding, setIsOverriding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, company.id]);

    const loadData = async () => {
        setLoading(true);
        setLoadError(null);

        try {
            const [plansRaw, addonsRaw] = await Promise.all([
                api.billing.getPlans(),
                api.billing.getAddons(),
            ]);

            const plansList = extractArray<BillingPlan>(plansRaw).filter(p => p.active);
            const addonsList = extractArray<BillingAddon>(addonsRaw).filter(a => a.active);

            setPlans(plansList);
            setAddons(addonsList);
        } catch (error: any) {
            console.error('Failed to load billing plans/addons', error);
            setLoadError(error?.message || 'Failed to load billing data. Please try again.');
        }

        try {
            const currentPlanRes = await api.billing.getCompanyPlan(company.id);
            if (currentPlanRes?.data) {
                setCurrentPlan(currentPlanRes.data);
                setSelectedPlanId(currentPlanRes.data.id);
            }
        } catch {
            // No plan assigned yet
        }

        setLoading(false);
    };

    const loadHistory = async () => {
        try {
            const res = await api.billing.getPaymentHistory(company.id);
            setHistory(res.data || []);
        } catch (error) {
            console.error('Failed to load payment history', error);
        }
    };

    const loadPlanAudits = async () => {
        try {
            const res = await api.companies.getPlanAudits(company.id);
            setAudits(res.data || []);
        } catch (error) {
            console.error('Failed to load plan audits', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        } else if (activeTab === 'audits') {
            loadPlanAudits();
        } else if (activeTab === 'override') {
            setOverridePlanId(currentPlan?.id || '');
            const oneYear = new Date();
            oneYear.setFullYear(oneYear.getFullYear() + 1);
            setExpiresAt(company.expiryDate ? new Date(company.expiryDate).toISOString().slice(0, 16) : oneYear.toISOString().slice(0, 16));
            setRenewalAt(new Date().toISOString().slice(0, 16));
        }
    }, [activeTab]);

    const handleManualOverride = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!overridePlanId || !expiresAt || !renewalAt || !reason) {
            alert('Please fill in all fields');
            return;
        }

        setIsOverriding(true);
        try {
            await api.companies.updateCompanyPlan(company.id, {
                planId: overridePlanId,
                expiresAt,
                renewalAt,
                reason
            });
            alert('Plan updated successfully');
            loadData();
            setActiveTab('audits');
            loadPlanAudits();
        } catch (error: any) {
            alert(error.message || 'Failed to update plan');
        } finally {
            setIsOverriding(false);
        }
    };

    const handleInitiatePayment = async () => {
        if (!selectedPlanId) return;
        setInitiating(true);
        try {
            const res = await api.billing.initiatePayment({
                companyProfileId: company.id,
                planId: selectedPlanId,
                addonIds: selectedAddonIds,
                billingPeriod,
                paymentType,
                phoneNumber: paymentType === 'mobile' ? phoneNumber : undefined,
            });

            if (res.data?.redirectUrl) {
                window.location.href = res.data.redirectUrl;
            } else {
                alert(res.message || 'Payment initiated. Please check your phone for USSD prompt.');
            }
        } catch (error: any) {
            alert(error.message || 'Failed to initiate payment');
        } finally {
            setInitiating(false);
        }
    };

    const toggleAddon = (id: string) => {
        setSelectedAddonIds(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const formatPrice = (price?: number | null) => {
        return new Intl.NumberFormat('en-TZ', {
            style: 'currency',
            currency: 'TZS',
            maximumFractionDigits: 0,
        }).format(price || 0);
    };

    const getPlanAccent = (code: string) => {
        switch (code) {
            case 'kazafit': return { icon: <Rocket size={20} />, bg: 'bg-purple-50', iconColor: 'text-purple-600', ring: 'border-purple-500', badge: 'bg-purple-100 text-purple-700' };
            case 'pro':     return { icon: <Star size={20} />,   bg: 'bg-blue-50',   iconColor: 'text-blue-600',   ring: 'border-blue-500',   badge: 'bg-blue-100 text-blue-700' };
            case 'basic':   return { icon: <Shield size={20} />, bg: 'bg-green-50',  iconColor: 'text-green-600',  ring: 'border-green-500',  badge: 'bg-green-100 text-green-700' };
            default:        return { icon: <CheckCircle2 size={20} />, bg: 'bg-gray-50', iconColor: 'text-gray-600', ring: 'border-gray-400', badge: 'bg-gray-100 text-gray-700' };
        }
    };

    if (!isOpen) return null;

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={40} />
                    <p className="text-gray-500 text-sm">Loading billing configuration…</p>
                </div>
            );
        }

        if (loadError) {
            return (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 max-w-sm text-left">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-sm font-semibold text-red-700">Failed to load plans</p>
                            <p className="text-xs text-red-500 mt-1">{loadError}</p>
                        </div>
                    </div>
                    <button onClick={loadData} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Retry</button>
                </div>
            );
        }

        switch (activeTab) {
            case 'plans':
                return (
                    <div className="space-y-8">
                        {currentPlan && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                                <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                                Current plan: <span className="font-semibold text-blue-700">{currentPlan.name}</span>
                            </div>
                        )}

                        <div className="flex justify-center">
                            <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner">
                                <button onClick={() => setBillingPeriod('monthly')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${billingPeriod === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Monthly</button>
                                <button onClick={() => setBillingPeriod('annually')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billingPeriod === 'annually' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Annually <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Save 20%</span></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {plans.map((plan) => {
                                const accent = getPlanAccent(plan.code);
                                const isSelected = selectedPlanId === plan.id;
                                return (
                                    <div key={plan.id} onClick={() => setSelectedPlanId(plan.id)} className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 ${isSelected ? `${accent.ring} bg-white shadow-md` : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white hover:shadow-sm'}`}>
                                        {isSelected && <div className="absolute -top-3 -right-3 bg-blue-600 text-white rounded-full p-1 shadow-lg ring-2 ring-white"><Check size={14} /></div>}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 ${accent.bg} rounded-lg`}><span className={accent.iconColor}>{accent.icon}</span></div>
                                            <div>
                                                <div className="font-bold text-gray-900">{plan.name}</div>
                                                {plan.trialDays > 0 && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${accent.badge}`}>{plan.trialDays}‑day trial</span>}
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <span className="text-2xl font-black text-gray-900">{formatPrice(billingPeriod === 'monthly' ? plan.monthlyPriceTzs : plan.annualPriceTzs)}</span>
                                            <span className="text-gray-400 text-xs ml-1">/ {billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                                        </div>
                                        {plan.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{plan.description}</p>}
                                    </div>
                                );
                            })}
                        </div>

                        {addons.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Star size={13} className="text-yellow-500" /> Available Addons</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {addons.map((addon) => {
                                        const selected = selectedAddonIds.includes(addon.id);
                                        return (
                                            <div key={addon.id} onClick={() => toggleAddon(addon.id)} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>{selected && <Check size={11} className="text-white" />}</div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900">{addon.name}</div>
                                                        <div className="text-xs text-gray-500">{formatPrice(billingPeriod === 'monthly' ? addon.monthlyPriceTzs : addon.annualPriceTzs)} / {billingPeriod === 'monthly' ? 'mo' : 'yr'}</div>
                                                    </div>
                                                </div>
                                                {addon.description && <button onClick={e => e.stopPropagation()} title={addon.description} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 ml-2"><Info size={15} /></button>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-950 rounded-3xl p-7 text-white">
                            <h3 className="text-lg font-bold mb-5 flex items-center gap-3"><div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0"><CreditCard size={18} /></div>Secure Payment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setPaymentType('mobile')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentType === 'mobile' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 hover:border-gray-700'}`}><Smartphone size={22} className={paymentType === 'mobile' ? 'text-blue-400' : 'text-gray-500'} /><span className="text-xs font-semibold">Mobile Money</span></button>
                                        <button onClick={() => setPaymentType('card')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentType === 'card' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 hover:border-gray-700'}`}><CreditCard size={22} className={paymentType === 'card' ? 'text-blue-400' : 'text-gray-500'} /><span className="text-xs font-semibold">Credit Card</span></button>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center space-y-3">
                                    {paymentType === 'mobile' ? (
                                        <>
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number (TZ)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium select-none">+255</span>
                                                <input type="text" placeholder="7XX XXX XXX" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-16 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700 text-center"><p className="text-sm text-gray-400">You will be redirected to a secure card payment gateway after clicking below.</p></div>
                                    )}
                                </div>
                            </div>
                            <button onClick={handleInitiatePayment} disabled={initiating || !selectedPlanId} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                                {initiating ? <Loader2 className="animate-spin" size={20} /> : <>{!selectedPlanId ? 'Select a plan above' : `Pay via ${paymentType === 'mobile' ? 'Mobile Money' : 'Credit Card'}`} {selectedPlanId && <ChevronRight size={20} />}</>}
                            </button>
                        </div>
                    </div>
                );
            case 'history':
                return (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Method / Period</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-14 text-center text-gray-400 text-sm">No transactions found.</td></tr>
                                ) : (
                                    history.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatPrice(tx.amount)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 capitalize">{tx.paymentType} / {tx.billingPeriod}</td>
                                            <td className="px-6 py-4"><span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${tx.status === 'completed' ? 'bg-green-100 text-green-700' : tx.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{tx.status}</span></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            case 'override':
                return (
                    <form onSubmit={handleManualOverride} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Select Plan</label>
                                <select value={overridePlanId} onChange={e => setOverridePlanId(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" required>
                                    <option value="">Choose a plan...</option>
                                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Reason for Change</label>
                                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Compensation for downtime" className="w-full border border-gray-300 p-3 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Expires At</label>
                                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Renewal At</label>
                                <input type="datetime-local" value={renewalAt} onChange={e => setRenewalAt(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" required />
                            </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100 mb-6">
                            <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                            <p className="text-sm text-blue-700"><strong>Warning:</strong> Manual overrides bypass the payment gateway. This should only be used for administrative corrections, compensation, or special partner arrangements.</p>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={isOverriding} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2">
                                {isOverriding ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />} Update Plan Manually
                            </button>
                        </div>
                    </form>
                );
            case 'audits':
                return (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Old Plan</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">New Plan</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Expiration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {audits.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-14 text-center text-gray-400 text-sm">No override history found.</td></tr>
                                ) : (
                                    audits.map(audit => (
                                        <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-xs text-gray-900 font-medium">{new Date(audit.createdAt).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-xs text-gray-500">{audit.oldPlanId}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-blue-700">{audit.newPlanId}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600 italic max-w-xs truncate" title={audit.reason}>{audit.reason}</td>
                                            <td className="px-6 py-4 text-[10px] text-gray-500">{new Date(audit.newExpiresAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Billing & Subscriptions — ${company.companyName}`} size="xl">
            <div className="flex border-b border-gray-200 -mt-2 mb-6">
                <button onClick={() => setActiveTab('plans')} className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'plans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Calendar size={16} /> Plans & Addons</button>
                <button onClick={() => setActiveTab('history')} className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><History size={16} /> Payment History</button>
                <button onClick={() => setActiveTab('override')} className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'override' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Settings size={16} /> Manual Override</button>
                <button onClick={() => setActiveTab('audits')} className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'audits' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Clock size={16} /> Override History</button>
            </div>
            {renderContent()}
        </Modal>
    );
};
