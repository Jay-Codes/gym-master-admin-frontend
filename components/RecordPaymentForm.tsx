import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Info, Loader2, Receipt } from 'lucide-react';
import { api } from '../services/api';
import {
    BillingPlan, Company, PaymentMethod, PlatformPaymentMode, PlatformPaymentPeriod,
    PlatformPaymentPreview, PlatformPaymentResult,
} from '../types';
import { PAYMENT_METHOD_LABELS, addDays, eatDay, todayEat } from './invoiceFormat';

/**
 * Plan notifications wave AD-1. Records a payment a gym made to Kazafit outside the app.
 *
 * NEW moves the gym's plan end and lock date (end + grace) and may reactivate it; BACKFILL is
 * record-only. Choosing a plan and period asks the backend for a preview, which pre-fills the
 * dates and amount; everything stays editable. Contract: new-feature/2026-10-17/run/CONTRACT.md.
 */

interface RecordPaymentFormProps {
    company: Company;
    plans: BillingPlan[];
    currentPlanId?: string | null;
    onRecorded?: (result: PlatformPaymentResult) => void;
}

const inputCls = 'w-full border border-gray-300 p-2.5 rounded-xl bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const labelCls = 'text-xs font-bold text-gray-600 uppercase tracking-wide';

const formatTzs = (n?: number | null) =>
    new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n || 0);

export const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({ company, plans, currentPlanId, onRecorded }) => {
    const [mode, setMode] = useState<PlatformPaymentMode>('NEW');
    const [planId, setPlanId] = useState<string>(currentPlanId || '');
    const [period, setPeriod] = useState<PlatformPaymentPeriod>('monthly');
    const [months, setMonths] = useState<number>(1);

    const [preview, setPreview] = useState<PlatformPaymentPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const [amountTzs, setAmountTzs] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [expiryEdited, setExpiryEdited] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MPESA');
    const [paymentReference, setPaymentReference] = useState('');
    const [paidAt, setPaidAt] = useState(todayEat());
    const [notes, setNotes] = useState('');
    const [sendReceipt, setSendReceipt] = useState(true);
    const [force, setForce] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [result, setResult] = useState<PlatformPaymentResult | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    const isNew = mode === 'NEW';
    const today = todayEat();
    const graceDays = preview?.graceDays ?? 3;

    useEffect(() => {
        if (!planId && currentPlanId) setPlanId(currentPlanId);
    }, [currentPlanId]);

    // Plan / period / months change → ask the backend for suggested values.
    useEffect(() => {
        if (!planId) return;
        if (period !== 'annually' && (!months || months < 1)) return;
        let cancelled = false;
        setPreviewLoading(true);
        setPreviewError(null);
        api.platformPayments.preview(company.id, { planId, period, months: period === 'annually' ? undefined : months })
            .then(res => {
                if (cancelled) return;
                const p = res.data;
                setPreview(p);
                setAmountTzs(String(p.amountTzs ?? ''));
                if (mode === 'NEW') {
                    setStartDate(p.startDate);
                    setEndDate(p.endDate);
                    setExpiryDate(p.expiryDate);
                    setExpiryEdited(false);
                }
            })
            .catch((e: any) => { if (!cancelled) setPreviewError(e?.message || 'Could not load the suggestion.'); })
            .finally(() => { if (!cancelled) setPreviewLoading(false); });
        return () => { cancelled = true; };
    }, [company.id, planId, period, months, mode]);

    // The lock date follows the end date (end + grace) until the admin edits it by hand.
    const onEndDateChange = (v: string) => {
        setEndDate(v);
        if (!expiryEdited && v) setExpiryDate(addDays(v, graceDays));
    };

    const expiryNotInFuture = isNew && !!expiryDate && expiryDate <= today;

    const canSubmit = useMemo(() => {
        if (!planId || !amountTzs || Number(amountTzs) <= 0 || !paymentMethod || !paidAt) return false;
        if (!startDate || !endDate || endDate < startDate) return false;
        if (isNew && (!expiryDate || expiryDate < endDate)) return false;
        if (expiryNotInFuture && !force) return false;
        return true;
    }, [planId, amountTzs, paymentMethod, paidAt, startDate, endDate, expiryDate, isNew, expiryNotInFuture, force]);

    const resetForAnother = () => {
        setPaymentReference('');
        setNotes('');
        setForce(false);
        setResult(null);
        setResultMessage(null);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        setFieldErrors({});
        try {
            const res = await api.platformPayments.record(company.id, {
                mode,
                planId,
                period,
                months: period === 'annually' ? undefined : months,
                amountTzs: Number(amountTzs),
                paymentMethod,
                paymentReference: paymentReference.trim() || undefined,
                paidAt,
                startDate,
                endDate,
                expiryDate: isNew ? expiryDate : undefined,
                notes: notes.trim() || undefined,
                sendReceipt: isNew ? sendReceipt : undefined,
                force: isNew ? force : undefined,
            });
            setResult(res.data);
            setResultMessage(res.message);
            onRecorded?.(res.data);
        } catch (err: any) {
            if (err?.status === 409) {
                setError(err.message || 'This payment reference is already recorded for this gym.');
            } else {
                setError(err?.message || 'Failed to record the payment.');
            }
            if (err?.errors && typeof err.errors === 'object') setFieldErrors(err.errors);
        } finally {
            setSubmitting(false);
        }
    };

    const fieldError = (f: string) => fieldErrors[f]?.[0]
        ? <p className="text-xs text-red-600 mt-1">{fieldErrors[f][0]}</p> : null;

    if (result) {
        return (
            <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-green-50 border border-green-200 flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={22} />
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-green-800">{resultMessage}</p>
                        <p className="text-xs text-green-700">
                            Invoice {result.invoice?.id?.slice(0, 8).toUpperCase()} · {formatTzs(result.invoice?.amountTzs)}
                            {result.invoice?.paymentReference ? ` · ref ${result.invoice.paymentReference}` : ''}
                        </p>
                        {mode === 'NEW' && (
                            <p className="text-xs text-green-700">
                                Status {result.statusBefore} → {result.statusAfter} ·
                                {result.receiptQueued ? ' receipt SMS queued' : ' no receipt SMS'}
                            </p>
                        )}
                    </div>
                </div>
                {result.warnings?.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                        {result.warnings.map(w => (
                            <p key={w} className="text-xs text-amber-800 flex items-start gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{w}</p>
                        ))}
                    </div>
                )}
                <button type="button" onClick={resetForAnother} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">
                    Record another payment
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            {/* Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="bg-gray-100 p-1 rounded-xl inline-flex">
                    {(['NEW', 'BACKFILL'] as PlatformPaymentMode[]).map(m => (
                        <button key={m} type="button" onClick={() => setMode(m)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {m === 'NEW' ? 'New payment' : 'Backfill (history only)'}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Info size={14} className="shrink-0" />
                    {isNew
                        ? 'Moves the plan end and lock date, reactivates a locked gym, sends a receipt SMS.'
                        : 'Records a past payment for the history. Changes nothing on the gym. No SMS, no email.'}
                </p>
            </div>

            {/* Plan & period */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className={labelCls}>Plan</label>
                    <select value={planId} onChange={e => setPlanId(e.target.value)} className={inputCls} required>
                        <option value="">Choose a plan…</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                    {fieldError('planId')}
                </div>
                <div className="space-y-1.5">
                    <label className={labelCls}>Period</label>
                    <select value={period} onChange={e => setPeriod(e.target.value as PlatformPaymentPeriod)} className={inputCls}>
                        <option value="monthly">Monthly</option>
                        <option value="annually">Annually</option>
                        <option value="custom">Custom (months)</option>
                    </select>
                </div>
                {period !== 'annually' && (
                    <div className="space-y-1.5">
                        <label className={labelCls}>Months</label>
                        <input type="number" min={1} max={36} value={months}
                            onChange={e => setMonths(Math.max(0, parseInt(e.target.value || '0', 10)))} className={inputCls} />
                    </div>
                )}
            </div>

            {previewLoading && <p className="text-xs text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Calculating suggested dates…</p>}
            {previewError && <p className="text-xs text-red-600">{previewError}</p>}

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className={labelCls}>Plan start</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} required />
                    {fieldError('startDate')}
                </div>
                <div className="space-y-1.5">
                    <label className={labelCls}>Plan end</label>
                    <input type="date" value={endDate} min={startDate || undefined} onChange={e => onEndDateChange(e.target.value)} className={inputCls} required />
                    {fieldError('endDate')}
                </div>
                {isNew && (
                    <div className="space-y-1.5">
                        <label className={labelCls}>Expiry (app locks)</label>
                        <input type="date" value={expiryDate} min={endDate || undefined}
                            onChange={e => { setExpiryDate(e.target.value); setExpiryEdited(true); }} className={inputCls} required />
                        <p className="text-[11px] text-gray-500">
                            {expiryEdited ? 'Edited by hand' : `End + ${graceDays} day${graceDays === 1 ? '' : 's'} grace`}
                        </p>
                        {fieldError('expiryDate')}
                    </div>
                )}
            </div>

            {/* Payment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className={labelCls}>Amount (TZS)</label>
                    <input type="number" min={1} value={amountTzs} onChange={e => setAmountTzs(e.target.value)} className={inputCls} required />
                    {fieldError('amountTzs')}
                </div>
                <div className="space-y-1.5">
                    <label className={labelCls}>Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className={inputCls}>
                        {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(m => (
                            <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className={labelCls}>Reference</label>
                    <input type="text" maxLength={100} value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                        placeholder="e.g. QGH7XK21PL" className={`${inputCls} font-mono uppercase`} />
                    {fieldError('paymentReference')}
                </div>
                <div className="space-y-1.5">
                    <label className={labelCls}>Paid on</label>
                    <input type="date" value={paidAt} max={today} onChange={e => setPaidAt(e.target.value)} className={inputCls} required />
                    {fieldError('paidAt')}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                    <label className={labelCls}>Notes (internal — never shown to the gym)</label>
                    <input type="text" maxLength={500} value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="e.g. Paid to till 123456" className={inputCls} />
                </div>
            </div>

            {/* Summary */}
            {isNew && preview && endDate && expiryDate && (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p className="flex items-center gap-2 text-gray-700">
                        <span className="text-gray-500 w-16">Ends</span>
                        <span className="font-mono">{eatDay(preview.planEndsAt)}</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="font-mono font-bold text-gray-900">{eatDay(endDate)}</span>
                    </p>
                    <p className="flex items-center gap-2 text-gray-700">
                        <span className="text-gray-500 w-16">Locks</span>
                        <span className="font-mono">{eatDay(preview.expiresAt)}</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="font-mono font-bold text-gray-900">{eatDay(expiryDate)}</span>
                    </p>
                    {preview.status === 'suspended' && (
                        <p className="sm:col-span-2 text-xs text-green-700 font-semibold">This gym is locked — recording this payment reactivates it.</p>
                    )}
                </div>
            )}

            {isNew && (
                <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={sendReceipt} onChange={e => setSendReceipt(e.target.checked)} className="rounded" />
                        <Receipt size={15} className="text-gray-500" /> Send receipt SMS to the owner
                    </label>
                    {expiryNotInFuture && (
                        <label className="inline-flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="rounded mt-0.5" />
                            The expiry is not later than today, so the gym stays locked. Record anyway.
                        </label>
                    )}
                </div>
            )}

            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div className="flex justify-end">
                <button type="submit" disabled={!canSubmit || submitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2">
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Receipt size={18} />}
                    {isNew ? 'Record payment' : 'Record backfill'}
                </button>
            </div>
        </form>
    );
};
