import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { PasswordPolicySettings } from '../types';

// --- Retired shared staff password (platform setting) ---
//
// KZ-01 retired the one starter password every staff account used to share: it is refused at login, and the
// holder must reset through the email OTP. Some staff have emails that cannot receive that code, so this switch
// lets the retired word log in again for a limited time. While it is on, each affected user sees a warning in
// their Alerts and can ask for a password change (staff -> their gym's admins, admins -> shown here on Users).
// An end date turns it back to "refuse" by itself; no date means it stays on until someone switches it off.

export const PasswordPolicyPage: React.FC = () => {
    const [settings, setSettings] = useState<PasswordPolicySettings | null>(null);
    const [warn, setWarn] = useState(false);
    const [until, setUntil] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');

    const apply = (s: PasswordPolicySettings) => {
        setSettings(s);
        setWarn(s.mode === 'WARN');
        setUntil(s.warnUntil || '');
    };

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const s = await api.superAdmin.passwordPolicy.get();
            if (s && (s.mode === 'REFUSE' || s.mode === 'WARN')) apply(s);
            else setLoadError('The server did not return the password policy.');
        } catch (e: any) {
            setLoadError(e?.message || 'Could not reach the password policy endpoint.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const today = new Date().toISOString().slice(0, 10);
    const dirty = !!settings && (warn !== (settings.mode === 'WARN') || (warn && until !== (settings.warnUntil || '')));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveError('');
        setNotice('');
        if (warn && until && until < today) {
            setSaveError('The end date cannot be in the past.');
            return;
        }
        setSaving(true);
        try {
            const s = await api.superAdmin.passwordPolicy.update({ mode: warn ? 'WARN' : 'REFUSE', warnUntil: warn && until ? until : null });
            apply(s);
            setNotice(s.graceActive
                ? 'Saved. The old shared password now works, with a warning, until the end date.'
                : 'Saved. The old shared password is refused.');
        } catch (e: any) {
            setSaveError(e?.message || 'Failed to save the password policy.');
        } finally {
            setSaving(false);
        }
    };

    const inputClasses = "border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Password Policy</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Decide whether the old shared starter password can still sign staff in.
                </p>
            </div>

            {loading && !settings && <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={16} /> Loading…</div>}
            {loadError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                    <AlertTriangle size={16} className="mt-0.5" /> {loadError}
                    <button type="button" className="ml-auto underline" onClick={load}>Retry</button>
                </div>
            )}

            {settings && (
                <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <div className={`flex items-center gap-2 text-sm font-semibold ${settings.graceActive ? 'text-red-700' : 'text-green-700'}`}>
                        {settings.graceActive ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
                        {settings.graceActive
                            ? `The old shared password WORKS right now${settings.warnUntil ? ` (until ${settings.warnUntil})` : ' (no end date)'}.`
                            : 'The old shared password is refused.'}
                    </div>

                    <label className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={warn} onChange={e => setWarn(e.target.checked)} />
                        <span>
                            <span className="font-semibold text-gray-900">Allow the old shared password, with a warning</span>
                            <span className="block text-sm text-gray-500">
                                Anyone who knows that word can sign in as any staff member or admin who still uses it, at any gym. Use it only
                                while those staff are being moved to their own passwords.
                            </span>
                        </span>
                    </label>

                    {warn && (
                        <label className="block">
                            <span className="text-sm font-semibold text-gray-900">End date (optional)</span>
                            <input type="date" className={`${inputClasses} block mt-1`} min={today} value={until} onChange={e => setUntil(e.target.value)} />
                            <span className="block text-sm text-gray-500 mt-1">After this day the old password is refused again, with no action from you. Leave empty to keep it on until you turn it off.</span>
                        </label>
                    )}

                    {saveError && <div className="text-sm text-red-700" role="alert">{saveError}</div>}
                    {notice && <div className="text-sm text-green-700">{notice}</div>}

                    <button type="submit" disabled={!dirty || saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </form>
            )}
        </div>
    );
};
