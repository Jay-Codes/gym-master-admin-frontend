import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { FieldErrors, SMS_PRICING_LIMITS, SmsPricingSettings, UpdateSmsPricingRequest } from '../types';

// --- SMS credit pricing (platform settings) ---
//
// What a gym pays per SMS credit it buys through the platform Snippe lane. The rate is exclusive
// of VAT (D9); VAT is a separate percentage; the minimum is the smallest purchase in credits.
// A per-gym rate override lives on the company detail screen, not here.
//
// The PUT treats null as "unchanged", so only edited fields are sent. A change re-prices future
// purchases only — a payment already initiated keeps the price frozen on it (S2-F3).
// Limits mirror the backend (S2-T1): rate 1..100000, VAT 0..100 with at most 2 decimals, minimum
// 1..1000000. A 400 carries errors.<field>, shown under the field; nothing is saved in that case.

type FieldKey = 'rateTzs' | 'vatRatePercent' | 'minCredits';

interface FormState { rateTzs: string; vatRatePercent: string; minCredits: string }

const toForm = (s: SmsPricingSettings): FormState => ({
    rateTzs: s.rateTzs == null ? '' : String(s.rateTzs),
    vatRatePercent: s.vatRatePercent == null ? '' : String(s.vatRatePercent),
    minCredits: s.minCredits == null ? '' : String(s.minCredits),
});

const FIELDS: { key: FieldKey; label: string; unit: string; step: string; integer: boolean; min: number; max: number; hint: string }[] = [
    {
        key: 'rateTzs',
        label: 'Rate per credit',
        unit: 'TZS per credit, excl. VAT',
        step: '1',
        integer: true,
        min: SMS_PRICING_LIMITS.rateTzs.min,
        max: SMS_PRICING_LIMITS.rateTzs.max,
        hint: 'Whole shillings, 1 to 100,000. One credit is one 160-character SMS segment (70 if the message needs Unicode). A gym with its own override pays that instead.',
    },
    {
        key: 'vatRatePercent',
        label: 'SMS VAT rate',
        unit: '%',
        step: '0.01',
        integer: false,
        min: SMS_PRICING_LIMITS.vatRatePercent.min,
        max: SMS_PRICING_LIMITS.vatRatePercent.max,
        hint: '0 to 100, at most two decimals. Added on top of the subtotal and rounded half-up to the shilling. Default 18.00%.',
    },
    {
        key: 'minCredits',
        label: 'Minimum purchase',
        unit: 'credits',
        step: '1',
        integer: true,
        min: SMS_PRICING_LIMITS.minCredits.min,
        max: SMS_PRICING_LIMITS.minCredits.max,
        hint: 'The smallest number of credits a gym can buy in one payment, 1 to 1,000,000.',
    },
];

export const SmsPricingPage: React.FC = () => {
    const [settings, setSettings] = useState<SmsPricingSettings | null>(null);
    const [form, setForm] = useState<FormState | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
    const [notice, setNotice] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await api.smsAdmin.getPricing();
            if (res && res.data && typeof res.data.rateTzs === 'number') {
                setSettings(res.data);
                setForm(toForm(res.data));
            } else {
                // No defaults invented: showing 25 / 18% / 200 after a failed read would look
                // exactly like the real configuration.
                setSettings(null);
                setForm(null);
                setLoadError(res?.message || 'The server did not return the SMS pricing settings.');
            }
        } catch (e: any) {
            setSettings(null);
            setForm(null);
            setLoadError(e?.message || 'Could not reach the SMS pricing endpoint.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const changed = (key: FieldKey) =>
        !!form && !!settings && form[key].trim() !== String(settings[key] ?? '');
    const isDirty = FIELDS.some(f => changed(f.key));

    // Client-side hint only; the server re-validates and answers 400 errors.<field>.
    const validateField = (f: typeof FIELDS[number], raw: string): string | null => {
        if (raw === '') return `${f.label} cannot be blank.`;
        const pattern = f.integer ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
        if (!pattern.test(raw)) {
            return f.integer
                ? `${f.label} must be a whole number of ${f.unit}.`
                : `${f.label} allows at most two decimal places.`;
        }
        const value = Number(raw);
        if (value < f.min || value > f.max) {
            return `${f.label} must be between ${f.min.toLocaleString('en-US')} and ${f.max.toLocaleString('en-US')}.`;
        }
        return null;
    };

    const buildPayload = (): UpdateSmsPricingRequest | Partial<Record<FieldKey, string>> | string => {
        if (!form) return 'Settings are not loaded.';
        const out: UpdateSmsPricingRequest = { rateTzs: null, vatRatePercent: null, minCredits: null };
        const errs: Partial<Record<FieldKey, string>> = {};
        for (const f of FIELDS) {
            if (!changed(f.key)) continue;
            const raw = form[f.key].trim();
            const err = validateField(f, raw);
            if (err) errs[f.key] = err;
            else out[f.key] = Number(raw);
        }
        return Object.keys(errs).length > 0 ? errs : out;
    };

    const isPayload = (p: unknown): p is UpdateSmsPricingRequest =>
        !!p && typeof p === 'object' && 'rateTzs' in (p as object);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = buildPayload();
        if (typeof payload === 'string') {
            setSaveError(payload);
            setNotice('');
            return;
        }
        if (!isPayload(payload)) {
            setFieldErrors(payload);
            setSaveError('');
            setNotice('');
            return;
        }
        setSaving(true);
        setSaveError('');
        setFieldErrors({});
        setNotice('');
        try {
            const res = await api.smsAdmin.updatePricing(payload);
            if (res && res.data && typeof res.data.rateTzs === 'number') {
                setSettings(res.data);
                setForm(toForm(res.data));
            } else {
                // Response body not usable: re-read rather than guess what landed.
                await load();
            }
            setNotice('Pricing saved. Purchases already in progress keep the price they started with.');
        } catch (e: any) {
            // 400: errors.<field> → under each field. Nothing was saved.
            const serverErrs: FieldErrors | undefined = e?.errors;
            const mapped: Partial<Record<FieldKey, string>> = {};
            if (serverErrs) {
                for (const f of FIELDS) {
                    const msgs = serverErrs[f.key];
                    if (Array.isArray(msgs) && msgs.length > 0) mapped[f.key] = msgs.join(' ');
                }
            }
            setFieldErrors(mapped);
            setSaveError(Object.keys(mapped).length > 0
                ? 'Nothing was saved. Fix the highlighted fields.'
                : (e?.message || 'Failed to save the SMS pricing.'));
        } finally {
            setSaving(false);
        }
    };

    // Worked example so the admin can sanity-check the three numbers together.
    const example = (() => {
        if (!form) return null;
        const rate = Number(form.rateTzs);
        const vat = Number(form.vatRatePercent);
        const min = Number(form.minCredits);
        if (![rate, vat, min].every(Number.isFinite) || min <= 0) return null;
        const subtotal = Math.round(rate * min);
        const vatTzs = Math.round((subtotal * vat) / 100);
        return { min, rate, vat, subtotal, vatTzs, total: subtotal + vatTzs };
    })();

    const tzs = (n: number) => `${n.toLocaleString('en-US')} TZS`;
    const inputClasses = "w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SMS Credit Pricing</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        What gyms pay per SMS credit they buy. Per-gym overrides are set on the company&rsquo;s details.
                    </p>
                </div>
                <button
                    onClick={() => load()}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 bg-white"
                    title="Refresh"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading && !form ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={28} />
                </div>
            ) : loadError ? (
                <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h3 className="font-bold text-red-900 text-sm">Pricing could not be loaded</h3>
                            <p className="text-xs text-red-700 mt-1">{loadError}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                No values are shown. The current rate is unknown until the request succeeds.
                            </p>
                            <button
                                onClick={() => load()}
                                className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            ) : form && (
                <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {FIELDS.map(f => (
                            <div key={f.key}>
                                <label className="block text-sm font-bold text-gray-900 mb-1">{f.label}</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={f.min}
                                        step={f.step}
                                        max={f.max}
                                        value={form[f.key]}
                                        onChange={e => {
                                            setForm({ ...form, [f.key]: e.target.value });
                                            setNotice(''); setSaveError('');
                                            setFieldErrors(prev => ({ ...prev, [f.key]: undefined }));
                                        }}
                                        aria-invalid={!!fieldErrors[f.key]}
                                        className={`${inputClasses}${fieldErrors[f.key] ? ' border-red-400' : ''}`}
                                    />
                                    <span className="text-xs text-gray-500 whitespace-nowrap">{f.unit}</span>
                                </div>
                                {fieldErrors[f.key] && (
                                    <p className="text-xs text-red-700 mt-1 flex items-center gap-1"><XCircle size={12} /> {fieldErrors[f.key]}</p>
                                )}
                                {changed(f.key) && (
                                    <p className="text-xs text-amber-700 mt-1">Was {String(settings?.[f.key] ?? '—')}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">{f.hint}</p>
                            </div>
                        ))}
                    </div>

                    {example && (
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                            <span className="font-bold text-gray-900">Minimum purchase at these settings: </span>
                            {example.min.toLocaleString('en-US')} credits &times; {tzs(example.rate)} = {tzs(example.subtotal)}
                            {' '}+ VAT {example.vat}% {tzs(example.vatTzs)} = <span className="font-bold">{tzs(example.total)}</span>
                        </div>
                    )}

                    {(settings?.updatedAt || settings?.updatedBy) && (
                        <p className="text-xs text-gray-400">
                            Last changed {settings?.updatedAt ? `${new Date(settings.updatedAt).toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' })} EAT` : ''}
                            {settings?.updatedBy ? ` by ${settings.updatedBy}` : ''}
                        </p>
                    )}

                    {saveError && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                            <XCircle size={16} /> {saveError}
                        </div>
                    )}
                    {notice && !isDirty && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                            <CheckCircle2 size={16} /> {notice}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => { if (settings) setForm(toForm(settings)); setSaveError(''); setFieldErrors({}); }}
                            disabled={!isDirty || saving}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white disabled:opacity-50"
                        >
                            Discard changes
                        </button>
                        <button
                            type="submit"
                            disabled={!isDirty || saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                            Save pricing
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
