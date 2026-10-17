import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Save, Send } from 'lucide-react';
import { api } from '../../services/api';
import { PlanNotificationPreview, PlanNotificationStage, PlanNotificationTemplate } from '../../types';

/**
 * Plan notifications AD-3 — Templates. The 10 plan SMS as a 5 × 2 grid (stage × EN/SW). Placeholders are
 * click-to-insert and filtered to the stage (the backend refuses any other — ported idea from the owner
 * app's messaging Templates screen). The preview is rendered by the backend with sample values, or with a
 * real gym's values when a gym id is entered. Test send costs real money: 5 per hour per admin.
 */

export const STAGE_LABELS: Record<PlanNotificationStage, string> = {
    BEFORE_END: 'Before the plan ends',
    END_DAY: 'On the end day',
    GRACE: 'During grace',
    LOCKED: 'After the lock',
    RECEIPT: 'Payment receipt',
};

const STAGES: PlanNotificationStage[] = ['BEFORE_END', 'END_DAY', 'GRACE', 'LOCKED', 'RECEIPT'];

interface CardProps {
    template: PlanNotificationTemplate;
    companyId?: number;
    testPhone: string;
    onSaved: (t: PlanNotificationTemplate) => void;
    onReset: (all: PlanNotificationTemplate[]) => void;
}

const TemplateCard: React.FC<CardProps> = ({ template, companyId, testPhone, onSaved, onReset }) => {
    const [body, setBody] = useState(template.body);
    const [preview, setPreview] = useState<PlanNotificationPreview | null>(null);
    const [busy, setBusy] = useState<'save' | 'reset' | 'test' | null>(null);
    const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
    const ref = useRef<HTMLTextAreaElement>(null);
    const dirty = body !== template.body;

    useEffect(() => { setBody(template.body); }, [template.body]);

    // Debounced server preview — the backend is the one renderer, so what is shown is what is sent.
    useEffect(() => {
        const handle = window.setTimeout(() => {
            api.planNotifications.preview({ stage: template.stage, language: template.language, body, companyId })
                .then(res => setPreview(res.data))
                .catch(() => setPreview(null));
        }, 350);
        return () => window.clearTimeout(handle);
    }, [body, companyId, template.stage, template.language]);

    const insert = (name: string) => {
        const token = `{${name}}`;
        const el = ref.current;
        if (!el) { setBody(b => b + token); return; }
        const start = el.selectionStart ?? body.length;
        const end = el.selectionEnd ?? body.length;
        const next = body.slice(0, start) + token + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
    };

    const save = async () => {
        setBusy('save'); setNote(null);
        try {
            const res = await api.planNotifications.updateTemplate(template.stage, template.language, body);
            onSaved(res.data);
            setNote({ ok: true, text: 'Saved' });
        } catch (e: any) {
            setNote({ ok: false, text: e?.errors?.body?.join(' ') || e?.message || 'Failed to save' });
        } finally { setBusy(null); }
    };

    const reset = async () => {
        if (!window.confirm(`Reset the ${template.language} "${STAGE_LABELS[template.stage]}" message to the default?`)) return;
        setBusy('reset'); setNote(null);
        try {
            const res = await api.planNotifications.resetTemplates(template.stage, template.language);
            onReset(res.data);
        } catch (e: any) {
            setNote({ ok: false, text: e?.message || 'Failed to reset' });
        } finally { setBusy(null); }
    };

    const testSend = async () => {
        if (!testPhone.trim()) { setNote({ ok: false, text: 'Enter a test phone number above.' }); return; }
        if (dirty) { setNote({ ok: false, text: 'Save first — the test send uses the saved message.' }); return; }
        if (!window.confirm(`Send this ${template.language} message to ${testPhone}? It is a real SMS, paid by Kazafit.`)) return;
        setBusy('test'); setNote(null);
        try {
            const res = await api.planNotifications.testSend({ phone: testPhone, stage: template.stage, language: template.language });
            setNote({ ok: res.data.accepted, text: res.data.accepted ? `Sent to +${res.data.phone} · ${res.data.remainingThisHour} left this hour` : `Not accepted: ${res.data.providerMessage ?? ''}` });
        } catch (e: any) {
            setNote({ ok: false, text: e?.message || 'Failed to send' });
        } finally { setBusy(null); }
    };

    const errors = preview?.errors ?? [];
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{template.language === 'EN' ? 'English' : 'Swahili'}</span>
                {!template.isDefault && <span className="text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">Edited</span>}
            </div>
            <textarea ref={ref} value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={480}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none" />
            <div className="flex flex-wrap gap-1.5">
                {template.placeholders.map(p => (
                    <button key={p} type="button" onClick={() => insert(p)}
                        className="text-[11px] font-mono rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-gray-600 hover:border-blue-300 hover:text-blue-700">
                        {`{${p}}`}
                    </button>
                ))}
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-800 whitespace-pre-wrap min-h-[3.5rem]">
                {preview?.text ?? '…'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>{preview ? `${preview.characters} chars · ${preview.segments} SMS · ${preview.encoding}` : ''}</span>
                {preview && preview.segments > 2 && <span className="text-amber-700 font-semibold">Over 2 SMS — costs more per send</span>}
            </div>
            {errors.length > 0 && <ul className="text-xs text-red-600 list-disc pl-4">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
            {note && <p className={`text-xs ${note.ok ? 'text-green-700' : 'text-red-600'}`}>{note.text}</p>}
            <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                <button type="button" onClick={save} disabled={!dirty || errors.length > 0 || busy !== null}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
                    {busy === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                </button>
                <button type="button" onClick={reset} disabled={template.isDefault || busy !== null}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold disabled:opacity-40">
                    {busy === 'reset' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset
                </button>
                <button type="button" onClick={testSend} disabled={busy !== null}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold disabled:opacity-40">
                    {busy === 'test' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Test send
                </button>
            </div>
        </div>
    );
};

export const TemplatesTab: React.FC = () => {
    const [templates, setTemplates] = useState<PlanNotificationTemplate[] | null>(null);
    const [error, setError] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [testPhone, setTestPhone] = useState('');

    useEffect(() => {
        api.planNotifications.templates().then(res => setTemplates(res.data)).catch((e: any) => setError(e?.message || 'Failed to load templates'));
    }, []);

    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!templates) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={28} /></div>;

    const replace = (t: PlanNotificationTemplate) =>
        setTemplates(ts => (ts ?? []).map(x => (x.stage === t.stage && x.language === t.language ? t : x)));
    const gymId = companyId.trim() && /^\d+$/.test(companyId.trim()) ? Number(companyId.trim()) : undefined;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-600 uppercase">Preview with a gym (company id)</span>
                    <input value={companyId} onChange={e => setCompanyId(e.target.value)} placeholder="Empty = sample values"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
                <label className="space-y-1">
                    <span className="text-xs font-bold text-gray-600 uppercase">Test phone (real SMS, 5 per hour)</span>
                    <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="0712 345 678" type="tel"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
            </div>
            <p className="text-xs text-gray-500">The Swahili defaults should be checked by a native speaker before reminders are switched on.</p>
            {STAGES.map(stage => (
                <section key={stage} className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">{STAGE_LABELS[stage]}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(['EN', 'SW'] as const).map(lang => {
                            const t = templates.find(x => x.stage === stage && x.language === lang);
                            return t ? (
                                <TemplateCard key={`${stage}-${lang}`} template={t} companyId={gymId} testPhone={testPhone}
                                    onSaved={replace} onReset={all => setTemplates(all)} />
                            ) : null;
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};
