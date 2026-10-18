import React, { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { api } from '../services/api';
import { NotificationPrefs } from '../types';

/**
 * Plan notifications wave AD-2. A gym's plan-notification preferences in View Details: where its plan
 * reminders and payment receipts go, with an edit for the override phone. SMS cannot be switched off
 * while email is not live (the backend answers 400), so it is shown, not offered.
 */

const msisdn = (d?: string | null) =>
    d && d.length === 12 && d.startsWith('255') ? `+255 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : d ? `+${d}` : '—';

export const CompanyNotificationPrefs: React.FC<{ companyId: number }> = ({ companyId }) => {
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api.notificationPrefs.get(companyId)
            .then(res => { if (!cancelled) setPrefs(res.data); })
            .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load notification preferences'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [companyId]);

    const startEdit = () => {
        setPhone(prefs?.planPhone ? `0${prefs.planPhone.slice(3)}` : '');
        setError('');
        setEditing(true);
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await api.notificationPrefs.update(companyId, { planPhone: phone.trim() });
            setPrefs(res.data);
            setEditing(false);
        } catch (e: any) {
            setError(e?.errors?.planPhone?.[0] || e?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Plan notifications</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                {loading ? (
                    <Loader2 className="animate-spin text-blue-600" size={18} />
                ) : !prefs ? (
                    <p className="text-xs text-red-600">{error}</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide">SMS</p>
                                <p className="font-semibold text-gray-900">{prefs.planSmsEnabled ? 'On' : 'Off'}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Email</p>
                                <p className="font-semibold text-gray-500">{prefs.emailLive ? (prefs.planEmailEnabled ? 'On' : 'Off') : 'Coming soon'}{prefs.planEmail ? ` · ${prefs.planEmail}` : ''}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Override phone</p>
                                <p className="font-mono text-gray-900">{prefs.planPhone ? msisdn(prefs.planPhone) : 'None — owner + gym phone'}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Plan SMS go to</p>
                                <p className={`font-mono ${prefs.effectivePhones.length ? 'text-gray-900' : 'text-red-600'}`}>
                                    {prefs.effectivePhones.length ? prefs.effectivePhones.map(msisdn).join(', ') : 'No phone — reminders will be skipped'}
                                </p>
                            </div>
                        </div>
                        {editing ? (
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678 (empty = owner + gym)"
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                <div className="flex gap-2">
                                    <button type="button" onClick={save} disabled={saving}
                                        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1">
                                        {saving && <Loader2 size={12} className="animate-spin" />} Save
                                    </button>
                                    <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-xs font-semibold text-gray-600">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                                <Pencil size={12} /> Edit override phone
                            </button>
                        )}
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </>
                )}
            </div>
        </div>
    );
};
