import React, { useCallback, useEffect, useState } from 'react';
import {
    AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, RefreshCw, RotateCcw, SearchCheck, XCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from './Modal';
import { Company, SMS_PRICING_LIMITS, SmsPurchase, SmsPurchaseStatusFilter } from '../types';

// --- SMS credit purchases (all gyms) and reversal ---
//
// Every SMS credit purchase made through the platform Snippe lane. A superadmin can reverse a
// completed purchase: the invoice is voided, the full purchased credits are debited from the gym
// and the payment is flagged reversed. The money refund happens outside the app (Snippe dashboard
// / mobile-money reversal). If the gym has already spent some of the credits the debit still
// happens in full and its balance goes negative, which blocks every paid send until it tops up
// (user decision Q1, 2026-10-10).
//
// Shipped contract (S2-T3, reconciled in S2-T6a): list data is a PagedResponse {content,
// currentPage, pageSize, totalElements, totalPages, first, last}; row status is the payment's own
// lower-case status and a reversed purchase stays `completed` with `reversedAt` set. Reverse
// returns the reversed row (updated in place); 409 = already reversed / not completed.

// "Check with Snippe" (S2-T6b, user decision 2026-10-11 after R3 F5): a purchase still `pending`
// more than 10 minutes after it was created may be stranded (webhook lost / unmatched). The action
// asks the backend to query Snippe for that payment; if Snippe says paid, the backend fulfils it
// through the same single webhook fulfilment path. There is no background sweep.

// Filter semantics are the server's: `completed` excludes reversed purchases, `reversed` is any
// purchase reversed at any time, `failed` also covers voided, expired and cancelled.
const STATUS_OPTIONS: { value: '' | SmsPurchaseStatusFilter; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'completed', label: 'Completed (not reversed)' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed / voided / expired / cancelled' },
    { value: 'reversed', label: 'Reversed' },
];

const REASON_MAX = SMS_PRICING_LIMITS.reversalReasonMax;

const PAGE_SIZE = 20;

const tzs = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : `${n.toLocaleString('en-US')} TZS`;

// Timestamps arrive as ISO-8601 with +03:00; show them in Dar es Salaam time whatever the browser zone.
const fmtDate = (s: string | null | undefined) =>
    (s ? new Date(s).toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' }) : '—');

const CHECK_AFTER_MS = 10 * 60 * 1000;

// Offered only on a pending purchase older than 10 minutes; the server re-checks (409 if not pending).
const canCheckWithSnippe = (p: SmsPurchase, now: number) => {
    if (p.reversedAt != null || (p.status || '').toLowerCase() !== 'pending') return false;
    const created = new Date(p.createdAt).getTime();
    return Number.isFinite(created) && now - created > CHECK_AFTER_MS;
};

// Reversal is carried by reversedAt only; status stays `completed`.
const isReversed = (p: SmsPurchase) => p.reversedAt != null;
const canReverse = (p: SmsPurchase) => p.reversedAt == null && (p.status || '').toLowerCase() === 'completed';

const StatusBadge: React.FC<{ purchase: SmsPurchase }> = ({ purchase }) => {
    if (isReversed(purchase)) {
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700">Reversed</span>;
    }
    const s = (purchase.status || '').toLowerCase();
    const cls = s === 'completed' ? 'bg-green-50 text-green-700'
        : s === 'pending' ? 'bg-amber-50 text-amber-700'
        : 'bg-gray-100 text-gray-600';
    return <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${cls}`}>{s || 'unknown'}</span>;
};

export const SmsPurchasesPage: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [status, setStatus] = useState<'' | SmsPurchaseStatusFilter>('');
    const [page, setPage] = useState(0);

    const [rows, setRows] = useState<SmsPurchase[] | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reversal: step 1 collects the reason, step 2 states the consequence and confirms.
    const [reversing, setReversing] = useState<SmsPurchase | null>(null);
    const [reason, setReason] = useState('');
    const [confirmStep, setConfirmStep] = useState(false);
    const [reverseBusy, setReverseBusy] = useState(false);
    const [reverseError, setReverseError] = useState('');
    const [notice, setNotice] = useState('');
    const [noticeTone, setNoticeTone] = useState<'success' | 'info'>('success');

    // Check with Snippe: one confirm step, then the call.
    const [checking, setChecking] = useState<SmsPurchase | null>(null);
    const [checkBusy, setCheckBusy] = useState(false);
    const [checkError, setCheckError] = useState('');

    // Re-evaluate the 10-minute threshold while the page stays open.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(t);
    }, []);

    // Company names for the filter. A failure here only loses the dropdown, not the list.
    useEffect(() => {
        api.companies.list(0, 500)
            .then(res => setCompanies(res?.data?.content || []))
            .catch(() => setCompanies([]));
    }, []);

    const fetchPurchases = useCallback(async () => {
        if (from && to && from > to) {
            setError('The start date is after the end date.');
            setRows(null);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.smsAdmin.listPurchases({
                companyId: companyId ? Number(companyId) : undefined,
                from: from || undefined,
                to: to || undefined,
                status: status || undefined,
                page,
                size: PAGE_SIZE,
            });
            const data = res?.data;
            if (data && Array.isArray(data.content)) {
                setRows(data.content);
                setTotalPages(data.totalPages ?? 0);
                setTotalElements(data.totalElements ?? data.content.length);
            } else {
                setRows(null);
                setError(res?.message || 'The server did not return a purchase list.');
            }
        } catch (e: any) {
            // 400 = a malformed date, from after to, or an unknown status; the message says which.
            setRows(null);
            setError(e?.message || 'Could not reach the SMS purchases endpoint.');
        } finally {
            setLoading(false);
        }
    }, [companyId, from, to, status, page]);

    useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

    const companyName = (p: SmsPurchase) =>
        p.companyName || companies.find(c => c.id === p.companyId)?.companyName || `Company #${p.companyId}`;

    const openReverse = (p: SmsPurchase) => {
        setReversing(p);
        setReason('');
        setConfirmStep(false);
        setReverseError('');
        setNotice('');
    };

    const closeReverse = () => {
        if (reverseBusy) return;
        setReversing(null);
    };

    const handleReverse = async () => {
        const trimmed = reason.trim();
        if (!reversing || !trimmed || trimmed.length > REASON_MAX) return;
        setReverseBusy(true);
        setReverseError('');
        try {
            const res = await api.smsAdmin.reversePurchase(reversing.paymentId, trimmed);
            const row = res?.data;
            if (row && row.paymentId === reversing.paymentId) {
                // 200 returns the reversed row: update it in place, no refetch.
                setRows(prev => prev ? prev.map(r => (r.paymentId === row.paymentId ? row : r)) : prev);
            } else {
                await fetchPurchases();
            }
            setNoticeTone('success');
            setNotice(res?.message
                || `Purchase ${reversing.paymentId} reversed. ${reversing.credits.toLocaleString('en-US')} credits removed from ${companyName(reversing)}. Refund the money outside the app.`);
            setReversing(null);
        } catch (e: any) {
            // Server messages are specific; show them as-is.
            //   409: already reversed, or not completed → the row is stale, refresh the list.
            //   400: not an SMS credit purchase, or reason missing / over 500 characters.
            //   404: purchase not found → refresh.   403: not a superadmin.
            const fallback = e?.status === 409 ? 'This purchase can no longer be reversed (already reversed or not completed).'
                : e?.status === 404 ? 'This purchase was not found.'
                : e?.status === 403 ? 'Only a superadmin can reverse a purchase.'
                : 'Failed to reverse the purchase.';
            const reasonErr = Array.isArray(e?.errors?.reason) ? e.errors.reason.join(' ') : '';
            setReverseError(reasonErr || e?.message || fallback);
            if (e?.status === 409 || e?.status === 404) fetchPurchases();
        } finally {
            setReverseBusy(false);
        }
    };

    const openCheck = (p: SmsPurchase) => {
        setChecking(p);
        setCheckError('');
        setNotice('');
    };

    const closeCheck = () => {
        if (checkBusy) return;
        setChecking(null);
    };

    const handleCheck = async () => {
        if (!checking) return;
        setCheckBusy(true);
        setCheckError('');
        try {
            const result = await api.smsAdmin.checkWithSnippe(checking.paymentId);
            if (result.kind === 'updated') {
                // 200: the purchase row after the check; update it in place.
                const row = result.purchase;
                setRows(prev => prev ? prev.map(r => (r.paymentId === row.paymentId ? row : r)) : prev);
                const completed = (row.status || '').toLowerCase() === 'completed';
                setNoticeTone(completed ? 'success' : 'info');
                setNotice(completed
                    ? 'Payment confirmed by Snippe — credits added'
                    : (result.message || `Checked with Snippe. The purchase is now ${row.status || 'unchanged'}.`));
            } else {
                // 202: Snippe does not report the payment as paid; nothing changed.
                // snippeStatus: "pending", "not_found" (Snippe has no such payment) or a raw status.
                setNoticeTone('info');
                const st = (result.snippeStatus || '').toLowerCase();
                setNotice(st === 'pending'
                    ? 'Snippe still reports this payment as pending. Nothing was changed; check again later.'
                    : st === 'not_found'
                    ? 'Snippe has no record of this payment, so the gym was probably never charged. Nothing was changed.'
                    : `Snippe reports this payment as "${result.snippeStatus || 'unknown'}". Nothing was changed.`);
            }
            setChecking(null);
        } catch (e: any) {
            // As shipped (S2-T3b):
            //   409 + errors.status: no longer pending (e.g. the webhook landed meanwhile) → stale row, refresh.
            //   409 + errors.amount: Snippe says paid but the amount/currency does not match → nothing credited.
            //   409, message only: younger than 10 minutes → Snippe was not called; nothing to refresh.
            //   404: purchase not found → refresh.   403: not a superadmin.   502: Snippe unreachable.
            const statusErr = Array.isArray(e?.errors?.status) ? e.errors.status.join(' ') : '';
            const amountErr = Array.isArray(e?.errors?.amount) ? e.errors.amount.join(' ') : '';
            const fallback = e?.status === 409 ? 'This purchase cannot be checked right now.'
                : e?.status === 404 ? 'This purchase was not found.'
                : e?.status === 403 ? 'Only a superadmin can check a purchase with Snippe.'
                : e?.status === 502 ? 'Snippe could not be reached. Nothing was changed. Try again in a few minutes.'
                : 'Failed to check the purchase with Snippe.';
            setCheckError(amountErr
                ? `${amountErr} No credits were added. Compare the payment in the Snippe dashboard before doing anything else.`
                : (statusErr || e?.message || fallback));
            if (statusErr || e?.status === 404) fetchPurchases();
        } finally {
            setCheckBusy(false);
        }
    };

    const resetPageAnd = (fn: () => void) => { fn(); setPage(0); };
    const inputClasses = "border border-gray-300 p-2 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SMS Credit Purchases</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Credits gyms bought through the platform. Amounts are whole TZS; refunds of money happen outside the app.
                    </p>
                </div>
                <button
                    onClick={() => fetchPurchases()}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 bg-white"
                    title="Refresh"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-end gap-3">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Company</label>
                    <select value={companyId} onChange={e => resetPageAnd(() => setCompanyId(e.target.value))} className={inputClasses}>
                        <option value="">All companies</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">From</label>
                    <input type="date" value={from} onChange={e => resetPageAnd(() => setFrom(e.target.value))} className={inputClasses} />
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">To</label>
                    <input type="date" value={to} onChange={e => resetPageAnd(() => setTo(e.target.value))} className={inputClasses} />
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Status</label>
                    <select value={status} onChange={e => resetPageAnd(() => setStatus(e.target.value as '' | SmsPurchaseStatusFilter))} className={inputClasses}>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                {(companyId || from || to || status) && (
                    <button
                        onClick={() => { setCompanyId(''); setFrom(''); setTo(''); setStatus(''); setPage(0); }}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {notice && (noticeTone === 'success' ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                    <CheckCircle2 size={16} /> {notice}
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <Info size={16} /> {notice}
                </div>
            ))}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading && !rows ? (
                    <div className="p-12 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={28} />
                    </div>
                ) : error ? (
                    <div className="p-6 flex items-start gap-3">
                        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-bold text-red-900 text-sm">Purchases could not be loaded</h3>
                            <p className="text-xs text-red-700 mt-1">{error}</p>
                        </div>
                    </div>
                ) : !rows || rows.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">No purchases match these filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Company</th>
                                    <th className="px-4 py-3 text-right">Credits</th>
                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                    <th className="px-4 py-3 text-right">VAT</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map(p => (
                                    <tr key={p.paymentId} className={isReversed(p) ? 'bg-red-50/40' : 'hover:bg-gray-50'}>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            {fmtDate(p.paidAt || p.createdAt)}
                                            <div className="text-xs text-gray-400 font-mono">{p.paymentId}</div>
                                            {p.invoiceNumber && <div className="text-xs text-gray-500 font-mono">{p.invoiceNumber}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 font-medium">{companyName(p)}</td>
                                        <td className={`px-4 py-3 text-right ${isReversed(p) ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                            {p.credits.toLocaleString('en-US')}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700">
                                            {tzs(p.subtotalTzs)}
                                            {p.unitRateTzs != null && <div className="text-xs text-gray-400">@ {p.unitRateTzs} TZS</div>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700">
                                            {tzs(p.vatTzs)}
                                            {p.vatRatePercent != null && <div className="text-xs text-gray-400">{p.vatRatePercent}%</div>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{tzs(p.totalTzs)}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge purchase={p} />
                                            {isReversed(p) && (
                                                <div className="text-xs text-gray-500 mt-1 max-w-xs">
                                                    {fmtDate(p.reversedAt)}{p.reversedBy ? ` by ${p.reversedBy}` : ''}
                                                    {p.reversalReason && <div className="italic">&ldquo;{p.reversalReason}&rdquo;</div>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canReverse(p) && (
                                                <button
                                                    onClick={() => openReverse(p)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                                                >
                                                    <RotateCcw size={14} /> Reverse
                                                </button>
                                            )}
                                            {canCheckWithSnippe(p, now) && (
                                                <button
                                                    onClick={() => openCheck(p)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 whitespace-nowrap"
                                                    title="Pending for more than 10 minutes"
                                                >
                                                    <SearchCheck size={14} /> Check with Snippe
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {rows && rows.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                        <span>{totalElements.toLocaleString('en-US')} purchase{totalElements === 1 ? '' : 's'} &middot; page {page + 1} of {Math.max(totalPages, 1)}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0 || loading}
                                className="p-2 border border-gray-200 rounded-lg bg-white disabled:opacity-50"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page + 1 >= totalPages || loading}
                                className="p-2 border border-gray-200 rounded-lg bg-white disabled:opacity-50"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={!!checking} onClose={closeCheck} title="Check with Snippe">
                {checking && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-1">
                            <div><span className="font-bold text-gray-900">{companyName(checking)}</span></div>
                            <div>{checking.credits.toLocaleString('en-US')} credits &middot; {tzs(checking.totalTzs)} &middot; pending since {fmtDate(checking.createdAt)}</div>
                            <div className="text-xs text-gray-400 font-mono">{checking.paymentId}</div>
                        </div>
                        <p className="text-sm text-gray-700">
                            This asks Snippe for the payment&rsquo;s real status and, if paid, credits the gym.
                        </p>

                        {checkError && (
                            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                                <XCircle size={16} /> {checkError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeCheck}
                                disabled={checkBusy}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCheck}
                                disabled={checkBusy}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {checkBusy ? <Loader2 className="animate-spin" size={16} /> : <SearchCheck size={16} />}
                                Check with Snippe
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!reversing} onClose={closeReverse} title="Reverse SMS Credit Purchase">
                {reversing && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-1">
                            <div><span className="font-bold text-gray-900">{companyName(reversing)}</span></div>
                            <div>{reversing.credits.toLocaleString('en-US')} credits &middot; {tzs(reversing.totalTzs)} paid</div>
                            <div className="text-xs text-gray-400 font-mono">{reversing.paymentId}</div>
                        </div>

                        {!confirmStep ? (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Reason (required)</label>
                                    <textarea
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        maxLength={REASON_MAX}
                                        rows={3}
                                        className="w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Why is this purchase being reversed?"
                                    />
                                    <p className="text-xs text-gray-400 text-right">{reason.trim().length}/{REASON_MAX}</p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button onClick={closeReverse} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => setConfirmStep(true)}
                                        disabled={!reason.trim() || reason.trim().length > REASON_MAX}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900 space-y-2">
                                    <div className="flex items-center gap-2 font-bold">
                                        <AlertTriangle size={16} /> This cannot be undone
                                    </div>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>
                                            <strong>{reversing.credits.toLocaleString('en-US')} credits will be removed</strong> from
                                            {' '}{companyName(reversing)}&rsquo;s SMS balance, in full.
                                        </li>
                                        <li>
                                            If the gym has already used some of these credits, <strong>its balance will go negative</strong>.
                                            While it is negative the gym cannot send any paid SMS until it buys more credits.
                                        </li>
                                        <li>The invoice for this purchase will be voided.</li>
                                        <li>No money is returned by this action. Refund the gym through the Snippe dashboard or mobile money separately.</li>
                                    </ul>
                                    <p className="text-xs text-red-700">Reason: &ldquo;{reason.trim()}&rdquo;</p>
                                </div>

                                {reverseError && (
                                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                                        <XCircle size={16} /> {reverseError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setConfirmStep(false)}
                                        disabled={reverseBusy}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleReverse}
                                        disabled={reverseBusy}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {reverseBusy ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
                                        Remove {reversing.credits.toLocaleString('en-US')} credits and reverse
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
