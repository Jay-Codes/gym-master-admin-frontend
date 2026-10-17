import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from 'lucide-react';
import { api } from '../../services/api';
import { PlanLanguageMode, PlanNotificationSettings } from '../../types';

/**
 * Plan notifications AD-3 — Settings. The schedule as four offset lists (chips), grace days, send hour (EAT),
 * language mode, trials, the per-run cap and the two switches. Reminders ship OFF; turning them on asks for
 * confirmation that Upcoming was checked and a test SMS was received.
 */

type ListKey = 'beforeEndOffsets' | 'graceOffsets' | 'afterLockOffsets';

const LISTS: { key: ListKey; label: string; hint: string }[] = [
    { key: 'beforeEndOffsets', label: 'Before the plan ends', hint: 'Days before the end date.' },
    { key: 'graceOffsets', label: 'During grace', hint: 'Days after the end date — must be fewer than the grace days.' },
    { key: 'afterLockOffsets', label: 'After the app locks', hint: 'Days after the expiry (lock) date.' },
];

const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none';

const OffsetChips: React.FC<{ values: number[]; onChange: (v: number[]) => void; error?: string }> = ({ values, onChange, error }) => {
    const [draft, setDraft] = useState('');
    const add = () => {
        const n = parseInt(draft, 10);
        if (!Number.isFinite(n) || n < 1 || n > 60 || values.includes(n) || values.length >= 6) return;
        onChange([...values, n].sort((a, b) => b - a));
        setDraft('');
    };
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                {values.length === 0 && <span className="text-xs text-gray-400 italic">None</span>}
                {values.map(v => (
                    <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {v} day{v === 1 ? '' : 's'}
                        <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter(x => x !== v))} className="text-blue-400 hover:text-blue-700"><X size={12} /></button>
                    </span>
                ))}
                {values.length < 6 && (
                    <span className="inline-flex items-center gap-1">
                        <input type="number" min={1} max={60} value={draft} onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                            placeholder="days" className={`${inputCls} w-20 py-1`} />
                        <button type="button" onClick={add} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600" aria-label="Add offset"><Plus size={14} /></button>
                    </span>
                )}
            </div>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
};

export const SettingsTab: React.FC = () => {
    const [saved, setSaved] = useState<PlanNotificationSettings | null>(null);
    const [form, setForm] = useState<PlanNotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        api.planNotifications.getSettings()
            .then(res => { setSaved(res.data); setForm(res.data); })
            .catch((e: any) => setMessage({ ok: false, text: e?.message || 'Failed to load settings' }))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={28} /></div>;
    if (!form || !saved) return <p className="text-sm text-red-600">{message?.text}</p>;

    const set = <K extends keyof PlanNotificationSettings>(k: K, v: PlanNotificationSettings[K]) => setForm({ ...form, [k]: v });
    const graceWarning = form.graceOffsets.some(d => d >= form.defaultGraceDays)
        ? `A grace reminder must be fewer than ${form.defaultGraceDays} days after the end, or it lands after the lock.` : undefined;
    const dirty = JSON.stringify({ ...form, updatedAt: null, updatedBy: null }) !== JSON.stringify({ ...saved, updatedAt: null, updatedBy: null });

    const save = async () => {
        if (form.remindersEnabled && !saved.remindersEnabled) {
            const ok = window.confirm('Turn plan reminders ON?\n\nReal SMS will go to gym owners at the next send hour, '
                + 'paid by Kazafit. Check the Upcoming tab and do a test send first.');
            if (!ok) return;
        }
        setSaving(true);
        setErrors({});
        setMessage(null);
        try {
            const { updatedAt: _a, updatedBy: _b, ...body } = form;
            const res = await api.planNotifications.updateSettings(body);
            setSaved(res.data);
            setForm(res.data);
            setMessage({ ok: true, text: 'Settings saved' });
        } catch (e: any) {
            setErrors(e?.errors || {});
            setMessage({ ok: false, text: e?.message || 'Failed to save' });
        } finally {
            setSaving(false);
        }
    };

    const fieldErr = (k: string) => errors[k]?.[0];

    return (
        <div className="space-y-6">
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${form.remindersEnabled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                {form.remindersEnabled ? <CheckCircle2 className="text-green-600 shrink-0" size={20} /> : <AlertTriangle className="text-amber-600 shrink-0" size={20} />}
                <div className="flex-1">
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                        <span className="text-sm font-bold text-gray-900">Expiry reminders {form.remindersEnabled ? 'are ON' : 'are OFF'}</span>
                        <input type="checkbox" checked={form.remindersEnabled} onChange={e => set('remindersEnabled', e.target.checked)} className="h-5 w-5" />
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                        The job runs every hour and acts only at the send hour (EAT). If the server is down at that hour, that day's
                        reminders are skipped and the next offset still fires. Kazafit pays for every SMS; gyms' SMS credits are never used.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200">
                    <span><span className="text-sm font-semibold text-gray-900 block">Payment receipts</span><span className="text-xs text-gray-500">SMS the owner when a NEW offline payment is recorded.</span></span>
                    <input type="checkbox" checked={form.receiptsEnabled} onChange={e => set('receiptsEnabled', e.target.checked)} className="h-5 w-5" />
                </label>
                <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200">
                    <span><span className="text-sm font-semibold text-gray-900 block">Include trials</span><span className="text-xs text-gray-500">Gyms on a trial get the reminder series too.</span></span>
                    <input type="checkbox" checked={form.includeTrial} onChange={e => set('includeTrial', e.target.checked)} className="h-5 w-5" />
                </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Grace days</label>
                    <input type="number" min={0} max={30} value={form.defaultGraceDays} onChange={e => set('defaultGraceDays', parseInt(e.target.value || '0', 10))} className={`${inputCls} w-full`} />
                    <p className="text-[11px] text-gray-500">Lock = plan end + this. Applies to plans paid from now on.</p>
                    {fieldErr('defaultGraceDays') && <p className="text-xs text-red-600">{fieldErr('defaultGraceDays')}</p>}
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Send hour (EAT)</label>
                    <select value={form.sendHour} onChange={e => set('sendHour', parseInt(e.target.value, 10))} className={`${inputCls} w-full`}>
                        {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Language</label>
                    <select value={form.languageMode} onChange={e => set('languageMode', e.target.value as PlanLanguageMode)} className={`${inputCls} w-full`}>
                        <option value="COMPANY">Gym's language</option>
                        <option value="EN">Always English</option>
                        <option value="SW">Always Swahili</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Max SMS per run</label>
                    <input type="number" min={1} max={5000} value={form.maxSendsPerRun} onChange={e => set('maxSendsPerRun', parseInt(e.target.value || '0', 10))} className={`${inputCls} w-full`} />
                    {fieldErr('maxSendsPerRun') && <p className="text-xs text-red-600">{fieldErr('maxSendsPerRun')}</p>}
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div><p className="text-sm font-semibold text-gray-900">{LISTS[0].label}</p><p className="text-xs text-gray-500">{LISTS[0].hint}</p></div>
                    <div className="md:col-span-2"><OffsetChips values={form.beforeEndOffsets} onChange={v => set('beforeEndOffsets', v)} error={fieldErr('beforeEndOffsets')} /></div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div><p className="text-sm font-semibold text-gray-900">On the end day</p><p className="text-xs text-gray-500">The day the plan ends.</p></div>
                    <label className="md:col-span-2 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.onEndDay} onChange={e => set('onEndDay', e.target.checked)} /> Send</label>
                </div>
                {LISTS.slice(1).map(l => (
                    <div key={l.key} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                        <div><p className="text-sm font-semibold text-gray-900">{l.label}</p><p className="text-xs text-gray-500">{l.hint}</p></div>
                        <div className="md:col-span-2">
                            <OffsetChips values={form[l.key]} onChange={v => set(l.key, v)}
                                error={fieldErr(l.key) || (l.key === 'graceOffsets' ? graceWarning : undefined)} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-gray-500">{saved.updatedAt ? `Last saved ${saved.updatedAt.replace('T', ' ').slice(0, 16)} by ${saved.updatedBy ?? '—'}` : 'Defaults — never saved'}</p>
                <div className="flex items-center gap-3">
                    {message && <span className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</span>}
                    <button type="button" onClick={save} disabled={!dirty || saving || !!graceWarning}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center gap-2">
                        {saving && <Loader2 size={16} className="animate-spin" />} Save settings
                    </button>
                </div>
            </div>
        </div>
    );
};
