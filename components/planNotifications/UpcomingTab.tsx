import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { PlanUpcomingResult } from '../../types';
import { eatDay } from '../invoiceFormat';
import { STAGE_LABELS } from './TemplatesTab';

/**
 * Plan notifications AD-3 — Upcoming. The backend's dry run: which gym gets which reminder on which day, to
 * which numbers. Sends nothing. Check this before switching reminders on.
 */

const msisdn = (d: string) => (d.length === 12 && d.startsWith('255') ? `0${d.slice(3)}` : d);

export const UpcomingTab: React.FC = () => {
    const [days, setDays] = useState(14);
    const [data, setData] = useState<PlanUpcomingResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        api.planNotifications.upcoming(days)
            .then(res => setData(res.data))
            .catch((e: any) => setError(e?.message || 'Failed to load the dry run'))
            .finally(() => setLoading(false));
    }, [days]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                    {data && (
                        <span className="inline-flex items-center gap-2">
                            {data.remindersEnabled
                                ? <CheckCircle2 size={16} className="text-green-600" />
                                : <AlertTriangle size={16} className="text-amber-600" />}
                            Reminders are <strong>{data.remindersEnabled ? 'ON' : 'OFF'}</strong> · send hour {String(data.sendHour).padStart(2, '0')}:00 EAT ·
                            {' '}<strong>{data.smsCount}</strong> SMS to <strong>{data.gymCount}</strong> gyms in {data.days} days
                        </span>
                    )}
                </div>
                <label className="text-sm text-gray-600 inline-flex items-center gap-2">
                    Days
                    <select value={days} onChange={e => setDays(parseInt(e.target.value, 10))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                        {[7, 14, 21, 31].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </label>
            </div>
            <p className="text-xs text-gray-500">A dry run — nothing is sent from this screen. Future "after the lock" rows assume the gym has not paid by then.</p>
            {loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
                : error ? <p className="text-sm text-red-600">{error}</p>
                    : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-200">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>{['Day', 'Gym', 'Message', 'Lang', 'To', 'Plan ends', 'Locks'].map(h =>
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(data?.rows.length ?? 0) === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm">Nothing due in this window.</td></tr>
                                    ) : data!.rows.map(r => (
                                        <tr key={`${r.date}-${r.companyId}-${r.stage}-${r.offsetDays}`} className={r.alreadySent ? 'opacity-50' : ''}>
                                            <td className="px-4 py-2.5 text-xs text-gray-900 whitespace-nowrap">{eatDay(r.date)}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-700">{r.companyName} <span className="text-gray-400">#{r.companyId}</span></td>
                                            <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                                                {STAGE_LABELS[r.stage]}{r.stage !== 'END_DAY' ? ` · ${r.offsetDays}d` : ''}
                                                {r.alreadySent && <span className="ml-1 text-[10px] text-gray-500">(sent)</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-gray-600">{r.language}</td>
                                            <td className="px-4 py-2.5 text-xs font-mono">
                                                {r.skipReason
                                                    ? <span className="text-red-600 font-sans font-semibold">{r.skipReason === 'NO_PHONE' ? 'No phone — skipped' : 'Opted out'}</span>
                                                    : r.phones.map(msisdn).join(', ')}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{eatDay(r.planEndsAt)}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{eatDay(r.expiresAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
        </div>
    );
};
