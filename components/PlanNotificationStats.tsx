import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { PlanExpiryStats, PlanNotificationStage, PlanPaymentBucket, PlanSmsStats } from '../types';
import { addDays, eatDay, invoiceSourceLabel, paymentMethodLabel, todayEat } from './invoiceFormat';
import { STAGE_LABELS } from './planNotifications/TemplatesTab';

/**
 * Plan notifications wave AD-4 — Stats tab. Plan SMS volume/cost and plan-expiry figures from
 * /stats/sms and /stats/expiry. No chart library is loaded in this console, so the charts are plain
 * Tailwind bars (no new dependency).
 */

const STAGES: PlanNotificationStage[] = ['BEFORE_END', 'END_DAY', 'GRACE', 'LOCKED', 'RECEIPT'];
const STAGE_BAR: Record<PlanNotificationStage, string> = {
    BEFORE_END: 'bg-blue-500',
    END_DAY: 'bg-indigo-500',
    GRACE: 'bg-amber-500',
    LOCKED: 'bg-red-500',
    RECEIPT: 'bg-green-500',
};

const fmt = (n: number) => n.toLocaleString('en-US');

const Tile: React.FC<{ label: string; value: string | number; sub?: string; tone?: 'red' | 'amber' | 'green' }> = ({ label, value, sub, tone }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
        <p className={`mt-1 text-2xl font-black ${tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
        {children}
    </section>
);

const SimpleTable: React.FC<{ head: string[]; rows: (string | number)[][]; empty?: string }> = ({ head, rows, empty }) => (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{head.map(h => <th key={h} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {rows.length === 0
                    ? <tr><td colSpan={head.length} className="px-4 py-6 text-center text-sm text-gray-400">{empty ?? 'Nothing in this period.'}</td></tr>
                    : rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-4 py-2 text-xs text-gray-700">{c}</td>)}</tr>)}
            </tbody>
        </table>
    </div>
);

const Funnel: React.FC<{ rows: { label: string; value: number; cls: string }[]; total: number }> = ({ rows, total }) => (
    <div className="space-y-2">
        {rows.map(r => (
            <div key={r.label} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-xs">
                <span className="text-gray-600">{r.label}</span>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full ${r.cls}`} style={{ width: `${total ? Math.round((r.value / total) * 100) : 0}%` }} />
                </div>
                <span className="font-bold text-gray-900 text-right">{fmt(r.value)}</span>
            </div>
        ))}
    </div>
);

const DailyChart: React.FC<{ stats: PlanSmsStats }> = ({ stats }) => {
    const days = useMemo(() => {
        const out: { date: string; byStage: Partial<Record<PlanNotificationStage, number>>; failed: number; total: number }[] = [];
        for (let d = stats.from; d <= stats.to; d = addDays(d, 1)) {
            const rows = stats.perDay.filter(r => r.date === d);
            const byStage: Partial<Record<PlanNotificationStage, number>> = {};
            rows.forEach(r => { byStage[r.stage] = (byStage[r.stage] ?? 0) + r.sent; });
            const failed = rows.reduce((a, r) => a + r.failed, 0);
            out.push({ date: d, byStage, failed, total: rows.reduce((a, r) => a + r.sent, 0) + failed });
            if (out.length > 92) break;
        }
        return out;
    }, [stats]);
    const max = Math.max(1, ...days.map(d => d.total));
    return (
        <div className="space-y-2">
            <div className="flex items-end gap-px h-40 rounded-xl border border-gray-100 bg-gray-50 p-2 overflow-x-auto">
                {days.map(d => (
                    <div key={d.date} className="flex-1 min-w-[6px] h-full flex flex-col-reverse" title={`${eatDay(d.date)}: ${d.total} (${d.failed} failed)`}>
                        {STAGES.map(s => d.byStage[s] ? <div key={s} className={STAGE_BAR[s]} style={{ height: `${(d.byStage[s]! / max) * 100}%` }} /> : null)}
                        {d.failed > 0 && <div className="bg-gray-400" style={{ height: `${(d.failed / max) * 100}%` }} />}
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
                {STAGES.map(s => <span key={s} className="inline-flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${STAGE_BAR[s]}`} />{STAGE_LABELS[s]}</span>)}
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-400" />Failed</span>
            </div>
        </div>
    );
};

const paymentRows = (b: PlanPaymentBucket[], label: (k: string) => string) =>
    b.map(x => [label(x.key), fmt(x.count), `TZS ${fmt(x.amountTzs)}`]);

export const PlanNotificationStats: React.FC = () => {
    const [to, setTo] = useState(todayEat());
    const [from, setFrom] = useState(addDays(todayEat(), -29));
    const [sms, setSms] = useState<PlanSmsStats | null>(null);
    const [expiry, setExpiry] = useState<PlanExpiryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!from || !to || from > to) return;
        setLoading(true);
        setError('');
        Promise.all([api.planNotifications.smsStats(from, to), api.planNotifications.expiryStats(from, to)])
            .then(([a, b]) => { setSms(a.data); setExpiry(b.data); })
            .catch((e: any) => setError(e?.message || 'Failed to load stats'))
            .finally(() => setLoading(false));
    }, [from, to]);

    const preset = (days: number) => { const t = todayEat(); setTo(t); setFrom(addDays(t, -(days - 1))); };

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white" aria-label="From" />
                <span className="text-gray-400">→</span>
                <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white" aria-label="To" />
                {[7, 30, 90].map(n => (
                    <button key={n} type="button" onClick={() => preset(n)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">{n} days</button>
                ))}
            </div>

            {loading ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
                : error || !sms || !expiry ? <p className="text-sm text-red-600">{error}</p>
                    : (
                        <>
                            <Section title="Plan SMS">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <Tile label="Sent" value={fmt(sms.totals.sent)} tone="green" />
                                    <Tile label="Failed" value={fmt(sms.totals.failed)} tone={sms.totals.failed ? 'red' : undefined} />
                                    <Tile label="Cost" value={`TZS ${fmt(sms.totals.costTzs)}`} sub="paid by Kazafit" />
                                    <Tile label="Segments" value={fmt(sms.totals.segments)} />
                                    <Tile label="Skipped" value={fmt(sms.totals.skippedNoPhone + sms.totals.skippedOptOut)}
                                        sub={`${sms.totals.skippedNoPhone} no phone · ${sms.totals.skippedOptOut} opted out`} tone={sms.totals.skippedNoPhone ? 'amber' : undefined} />
                                </div>
                                <DailyChart stats={sms} />
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <SimpleTable head={['Stage', 'Sent', 'Failed', 'SMS', 'Cost (TZS)']}
                                        rows={sms.byStage.map(r => [STAGE_LABELS[r.key as PlanNotificationStage] ?? r.key, fmt(r.sent), fmt(r.failed), fmt(r.segments), fmt(r.costTzs)])} />
                                    <SimpleTable head={['Language', 'Sent', 'Failed', 'SMS', 'Cost (TZS)']}
                                        rows={sms.byLanguage.map(r => [r.key === 'EN' ? 'English' : 'Swahili', fmt(r.sent), fmt(r.failed), fmt(r.segments), fmt(r.costTzs)])} />
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-700 mb-2">Gyms missing a phone (skipped 2+ times) — follow up</p>
                                        <SimpleTable head={['Gym', 'Skips', 'Last']} empty="None — every gym has a number."
                                            rows={sms.missingPhone.map(m => [`${m.companyName} #${m.companyId}`, fmt(m.skips), eatDay(m.lastSkippedAt)])} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-700 mb-2">Top failure reasons</p>
                                        <SimpleTable head={['Error', 'Count']} empty="No failures."
                                            rows={sms.topErrors.map(e => [e.error, fmt(e.count)])} />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Plan expiry — now">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                    <Tile label="Active" value={fmt(expiry.now.active)} />
                                    <Tile label="Ending ≤ 7d" value={fmt(expiry.now.endingIn7)} tone="amber" />
                                    <Tile label="Ending ≤ 14d" value={fmt(expiry.now.endingIn14)} />
                                    <Tile label="Ending ≤ 30d" value={fmt(expiry.now.endingIn30)} />
                                    <Tile label="In grace" value={fmt(expiry.now.inGrace)} tone="amber" />
                                    <Tile label="Locked" value={fmt(expiry.now.locked)} tone="red" />
                                    <Tile label="On trial" value={fmt(expiry.now.onTrial)} sub={`${expiry.now.trialsEndingIn7} end ≤ 7d`} />
                                    <Tile label="No plan" value={fmt(expiry.now.noPlan)} />
                                </div>
                            </Section>

                            <Section title={`Renewals — plans that ended ${eatDay(expiry.from)} to ${eatDay(expiry.to)}`}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                                        <p className="text-sm font-semibold text-gray-900">{fmt(expiry.funnel.ended)} plans ended</p>
                                        <Funnel total={expiry.funnel.ended} rows={[
                                            { label: 'Renewed before the lock', value: expiry.funnel.renewedBeforeLock, cls: 'bg-green-500' },
                                            { label: 'Renewed after the lock', value: expiry.funnel.renewedAfterLock, cls: 'bg-amber-500' },
                                            { label: 'Not renewed', value: expiry.funnel.notRenewed, cls: 'bg-red-500' },
                                        ]} />
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                                        <p className="text-sm font-semibold text-gray-900">
                                            Renewed within 7 days of a reminder: <span className="text-green-700">{expiry.afterReminder.rate}%</span>
                                        </p>
                                        <p className="text-xs text-gray-500">{fmt(expiry.afterReminder.renewedWithin7Days)} of {fmt(expiry.afterReminder.companiesReminded)} gyms reminded. By the last reminder before payment:</p>
                                        <Funnel total={expiry.afterReminder.renewedWithin7Days} rows={expiry.afterReminder.byLastStage.map(s => (
                                            { label: STAGE_LABELS[s.stage] ?? s.stage, value: s.companies, cls: STAGE_BAR[s.stage] ?? 'bg-gray-400' }))} />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Payments in the period">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <SimpleTable head={['Source', 'Payments', 'Amount']} rows={paymentRows(expiry.paymentsBySource, invoiceSourceLabel)} />
                                    <SimpleTable head={['Method', 'Payments', 'Amount']} rows={paymentRows(expiry.paymentsByMethod, k => (k === 'NONE' ? 'In app / none' : paymentMethodLabel(k)))} />
                                </div>
                            </Section>
                        </>
                    )}
        </div>
    );
};
