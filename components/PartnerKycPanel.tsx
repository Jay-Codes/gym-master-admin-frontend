import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { KycDecision, Partner } from '../types';

// Partner KYC review (KZ-47). Contract (BE-4):
//   PUT /api/superadmin/partners/{id}/kyc  {status: "approved"|"rejected"}
//     → 200 updated partner; 400 bad status; 403 non-superadmin; 404 unknown partner.
// Stored values are the V17 CHECK set: pending | approved | rejected (lower case).

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

const statusKey = (s: string | null | undefined) => (s ?? '').trim().toLowerCase() || 'pending';

export const KycStatusBadge: React.FC<{ status: string | null | undefined }> = ({ status }) => {
    const key = statusKey(status);
    return (
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${STATUS_STYLES[key] ?? 'bg-gray-100 text-gray-700'}`}>
            {key}
        </span>
    );
};

// Only http(s) document links are rendered as links; anything else is shown as text.
const safeUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
    } catch {
        return null;
    }
};

const PartnerKycPanel: React.FC<{ partner: Partner; onUpdated: (p: Partner) => void }> = ({ partner, onUpdated }) => {
    const [confirming, setConfirming] = useState<KycDecision | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const current = statusKey(partner.kycStatus);
    const docUrl = safeUrl(partner.idDocumentUrl);

    const submit = async (decision: KycDecision) => {
        setBusy(true);
        setError('');
        try {
            const updated = await api.superAdmin.partners.updateKyc(partner.id, decision);
            onUpdated({ ...partner, ...updated, kycStatus: updated?.kycStatus ?? decision });
            setConfirming(null);
        } catch (e: any) {
            const status = e?.status;
            setError(
                status === 403 ? 'Only a super admin can review KYC.'
                : status === 404 ? 'This partner no longer exists.'
                : e?.message || 'Failed to update KYC status.'
            );
        } finally {
            setBusy(false);
        }
    };

    const row = (label: string, value: React.ReactNode) => (
        <div className="flex justify-between gap-4 py-2 border-b border-gray-100 text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium text-right break-all">{value}</span>
        </div>
    );

    return (
        <div className="space-y-4">
            <div>
                <h4 className="font-bold text-gray-900">{partner.referrerName}</h4>
                <p className="text-xs text-gray-500">{partner.businessName || partner.referrerEmail}</p>
            </div>
            <div>
                {row('KYC status', <KycStatusBadge status={partner.kycStatus} />)}
                {row('ID type', partner.idType || '—')}
                {row('ID number', partner.idNumber || '—')}
                {row('ID document', docUrl
                    ? <a href={docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Open document <ExternalLink size={12} /></a>
                    : (partner.idDocumentUrl || '—'))}
            </div>

            {!partner.idNumber && !partner.idDocumentUrl && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                    This partner has not submitted ID details yet.
                </p>
            )}

            {error && (
                <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
                </p>
            )}

            {confirming ? (
                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                    <p className="text-sm text-gray-800">
                        {confirming === 'approved'
                            ? 'Approve this partner\'s ID? Their status will show as verified.'
                            : 'Reject this partner\'s ID? Payments using their activation code will be refused.'}
                    </p>
                    <div className="flex justify-end gap-2">
                        <button type="button" disabled={busy} onClick={() => setConfirming(null)}
                            className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-white disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="button" disabled={busy} onClick={() => submit(confirming)}
                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 ${confirming === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            {busy && <Loader2 size={14} className="animate-spin" />}
                            Confirm {confirming === 'approved' ? 'approve' : 'reject'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-end gap-2">
                    <button type="button" disabled={current === 'rejected'} onClick={() => { setError(''); setConfirming('rejected'); }}
                        className="px-4 py-1.5 border border-red-200 text-red-700 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-40">
                        Reject
                    </button>
                    <button type="button" disabled={current === 'approved'} onClick={() => { setError(''); setConfirming('approved'); }}
                        className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-40">
                        Approve
                    </button>
                </div>
            )}
        </div>
    );
};

// Row action for the Partners table: KYC badge button that opens the review panel in a modal.
export const PartnerKycAction: React.FC<{ partner: Partner; onUpdated: (p: Partner) => void }> = ({ partner, onUpdated }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                title="Review KYC"
            >
                <ShieldCheck size={14} /> KYC <KycStatusBadge status={partner.kycStatus} />
            </button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Partner KYC Review">
                {open && <PartnerKycPanel partner={partner} onUpdated={onUpdated} />}
            </Modal>
        </>
    );
};
