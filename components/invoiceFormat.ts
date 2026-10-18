import { InvoiceSource, KazafitInvoice, PaymentMethod } from '../types';

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

// ── Plan notifications wave F1: offline platform payments ──────────────────────────

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    MPESA: 'M-Pesa',
    TIGO_PESA: 'Tigo Pesa',
    AIRTEL_MONEY: 'Airtel Money',
    HALOPESA: 'HaloPesa',
    BANK_TRANSFER: 'Bank transfer',
    CASH: 'Cash',
    OTHER: 'Other',
};

export const INVOICE_SOURCE_LABELS: Record<InvoiceSource, string> = {
    SNIPPE: 'Snippe (in app)',
    SUPERADMIN: 'Superadmin invoice',
    OFFLINE: 'Offline payment',
    BACKFILL: 'Backfill',
};

export const paymentMethodLabel = (m?: string | null): string =>
    m && m in PAYMENT_METHOD_LABELS ? PAYMENT_METHOD_LABELS[m as PaymentMethod] : '—';

export const invoiceSourceLabel = (s?: string | null): string =>
    s && s in INVOICE_SOURCE_LABELS ? INVOICE_SOURCE_LABELS[s as InvoiceSource] : '—';

/** "dd/MM/yyyy" for a backend LocalDate/LocalDateTime string (EAT wall clock — no zone shift). */
export const eatDay = (iso?: string | null): string => {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return y && m && d ? `${d}/${m}/${y}` : '—';
};

/** "dd/MM/yyyy – dd/MM/yyyy", or "—" when the invoice carries no period. */
export const invoicePeriodLabel = (inv: KazafitInvoice): string =>
    inv.periodStartAt && inv.periodEndAt ? `${eatDay(inv.periodStartAt)} – ${eatDay(inv.periodEndAt)}` : '—';

/** Today in Africa/Dar_es_Salaam as yyyy-MM-dd, whatever the browser's zone. */
export const todayEat = (): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam' }).format(new Date());

/** yyyy-MM-dd + n days, computed in UTC so no local DST/zone can shift the day. */
export const addDays = (day: string, n: number): string => {
    const t = Date.parse(`${day}T00:00:00Z`);
    if (Number.isNaN(t)) return '';
    return new Date(t + n * 86_400_000).toISOString().slice(0, 10);
};
