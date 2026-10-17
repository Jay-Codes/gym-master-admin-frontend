import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { KazafitInvoice } from '../types';
import { eatDay, invoicePeriodLabel, invoicePlanLabel, invoiceSourceLabel, paymentMethodLabel } from './invoiceFormat';

/**
 * Plan notifications wave AD-2. One gym's platform invoices — Snippe, superadmin, offline and backfilled —
 * with period, source, method and reference. A paid OFFLINE/BACKFILL invoice can be voided with a reason;
 * dates are never rolled back, so when the voided invoice set the current plan end the admin is sent to
 * the Manual Override tab.
 */

interface CompanyInvoicesTableProps {
    companyId: number;
    /** Bump to reload (e.g. after a payment was recorded). */
    reloadKey?: number;
    onExpiryAffected?: () => void;
}

const formatTzs = (n?: number | null) =>
    new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n || 0);

const statusCls = (s: string) =>
    s === 'paid' ? 'bg-green-100 text-green-700'
        : s === 'void' ? 'bg-gray-200 text-gray-600'
            : s === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';

export const CompanyInvoicesTable: React.FC<CompanyInvoicesTableProps> = ({ companyId, reloadKey, onExpiryAffected }) => {
    const [rows, setRows] = useState<KazafitInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [voidingId, setVoidingId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.superAdmin.invoices.list(0, 50, companyId);
            setRows(res.data?.content ?? []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [companyId, reloadKey]);

    const voidInvoice = async (inv: KazafitInvoice) => {
        const reason = window.prompt(`Void invoice ${inv.id.slice(0, 8).toUpperCase()} (${formatTzs(inv.amountTzs)})?\n\nReason (required):`);
        if (!reason || !reason.trim()) return;
        setVoidingId(inv.id);
        setNotice(null);
        try {
            const res = await api.platformPayments.voidInvoice(inv.id, reason.trim());
            setNotice(res.message);
            await load();
            if (res.data?.expiryAffected) {
                if (window.confirm('This invoice set the gym\'s current plan end, and voiding does not roll dates back.\n\nOpen Manual Override to correct the plan end and expiry now?')) {
                    onExpiryAffected?.();
                }
            }
        } catch (e: any) {
            setNotice(e?.message || 'Failed to void the invoice');
        } finally {
            setVoidingId(null);
        }
    };

    if (loading) {
        return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={28} /></div>;
    }
    if (error) {
        return <p className="py-6 text-sm text-red-600">{error}</p>;
    }

    return (
        <div className="space-y-3">
            {notice && (
                <p className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />{notice}
                </p>
            )}
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {['Paid / issued', 'Plan', 'Period', 'Amount', 'Source', 'Method · Ref', 'Status', ''].map(h => (
                                <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">No invoices yet.</td></tr>
                        ) : rows.map(inv => {
                            const voidable = inv.status === 'paid' && (inv.source === 'OFFLINE' || inv.source === 'BACKFILL');
                            return (
                                <tr key={inv.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap">{eatDay(inv.paidAt ?? inv.issuedAt)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-700">{invoicePlanLabel(inv)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{invoicePeriodLabel(inv)}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">{formatTzs(inv.amountTzs)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{invoiceSourceLabel(inv.source)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {inv.paymentMethod ? paymentMethodLabel(inv.paymentMethod) : '—'}
                                        {inv.paymentReference && <span className="ml-1 font-mono text-gray-900">{inv.paymentReference}</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${statusCls(inv.status)}`}>{inv.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {voidable && (
                                            <button type="button" onClick={() => voidInvoice(inv)} disabled={voidingId === inv.id}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                                                {voidingId === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Void
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
