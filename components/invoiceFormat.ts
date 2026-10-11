import { KazafitInvoice } from '../types';

// Null-safe labels for platform invoices. SMS credit invoices (kind SMS_CREDITS, S2-T2) carry no
// plan: planName/planId/planCode are null and period is `once`. Add-on-only invoices also have no plan.

export const isSmsCreditInvoice = (inv: KazafitInvoice) => inv.kind === 'SMS_CREDITS';

/** "SMS credits ×1,000" for SMS invoices, the plan name otherwise, "—" when there is neither. */
export const invoicePlanLabel = (inv: KazafitInvoice): string => {
    if (isSmsCreditInvoice(inv)) {
        return inv.smsCredits != null ? `SMS credits ×${inv.smsCredits.toLocaleString('en-US')}` : 'SMS credits';
    }
    return inv.planName ?? '—';
};

/** One CSV cell: null/undefined → empty; quotes, commas and newlines are quoted and escaped. */
export const csvCell = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
