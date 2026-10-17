import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { PagedResponse, PlanLogFilters, PlanLogRow } from '../../types';
import { STAGE_LABELS } from './TemplatesTab';

/** Plan notifications AD-3 — Log. Every plan SMS (reminders and receipts) and skipped delivery, newest first. */

const STATUS_CLS: Record<string, string> = {
    SENT: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    CLAIMED: 'bg-blue-100 text-blue-700',
    SKIPPED_NO_PHONE: 'bg-amber-100 text-amber-800',
    SKIPPED_OPT_OUT: 'bg-gray-200 text-gray-600',
};

const sel = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white';

export const LogTab: React.FC = () => {
    const [filters, setFilters] = useState<PlanLogFilters>({ page: 0, size: 50 });
    const [companyId, setCompanyId] = useState('');
    const [data, setData] = useState<PagedResponse<PlanLogRow> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState<number | null>(null);

    useEffect(() => {
        setLoading(true);
        setError('');
        api.planNotifications.log(filters)
            .then(res => setData(res.data))
            .catch((e: any) => setError(e?.message || 'Failed to load the log'))
            .finally(() => setLoading(false));
    }, [filters]);

    const set = (k: keyof PlanLogFilters, v: string) => setFilters(f => ({ ...f, [k]: v || undefined, page: 0 }));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
                <input value={companyId} onChange={e => setCompanyId(e.target.value)} placeholder="Company id"
                    onBlur={() => setFilters(f => ({ ...f, companyId: /^\d+$/.test(companyId.trim()) ? Number(companyId.trim()) : undefined, page: 0 }))}
                    className={`${sel} w-28`} />
                <select className={sel} value={filters.kind ?? ''} onChange={e => set('kind', e.target.value)}>
                    <option value="">All kinds</option><option value="REMINDER">Reminders</option><option value="RECEIPT">Receipts</option>
                </select>
                <select className={sel} value={filters.stage ?? ''} onChange={e => set('stage', e.target.value)}>
                    <option value="">All stages</option>
                    {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select className={sel} value={filters.status ?? ''} onChange={e => set('status', e.target.value)}>
                    <option value="">All statuses</option>
                    {Object.keys(STATUS_CLS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="date" className={sel} value={filters.from ?? ''} onChange={e => set('from', e.target.value)} aria-label="From" />
                <input type="date" className={sel} value={filters.to ?? ''} onChange={e => set('to', e.target.value)} aria-label="To" />
            </div>
            {loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
                : error ? <p className="text-sm text-red-600">{error}</p>
                    : (
                        <>
                            <div className="overflow-x-auto rounded-2xl border border-gray-200">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>{['When (EAT)', 'Gym', 'Message', 'To', 'Status', 'SMS', 'TZS'].map(h =>
                                            <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(data?.content.length ?? 0) === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm">No plan SMS yet.</td></tr>
                                        ) : data!.content.map(r => (
                                            <React.Fragment key={r.id}>
                                                <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                                                    <td className="px-4 py-2.5 text-xs text-gray-900 whitespace-nowrap">{r.createdAt.replace('T', ' ').slice(0, 16)}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-700">{r.companyName ?? '—'} <span className="text-gray-400">#{r.companyId}</span></td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                                                        {STAGE_LABELS[r.stage]}{r.kind === 'REMINDER' && r.stage !== 'END_DAY' && r.offsetDays != null ? ` · ${r.offsetDays}d` : ''} · {r.language}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-mono text-gray-700">{r.phone ?? '—'}</td>
                                                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLS[r.status] ?? ''}`}>{r.status}</span></td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-700">{r.segments}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-700">{r.costTzs.toLocaleString('en-US')}</td>
                                                </tr>
                                                {open === r.id && (
                                                    <tr className="bg-gray-50"><td colSpan={7} className="px-4 py-3 text-xs text-gray-700 whitespace-pre-wrap">
                                                        {r.body}{r.error && <p className="mt-1 text-red-600">Error: {r.error}</p>}
                                                    </td></tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data && data.totalPages > 1 && (
                                <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                                    <button type="button" disabled={data.first} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 0) - 1 }))}
                                        className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
                                    Page {data.currentPage + 1} of {data.totalPages} · {data.totalElements} rows
                                    <button type="button" disabled={data.last} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 0) + 1 }))}
                                        className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
                                </div>
                            )}
                        </>
                    )}
        </div>
    );
};
