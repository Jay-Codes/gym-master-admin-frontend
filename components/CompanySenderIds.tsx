import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Power, Star, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { CompanySenderId, SenderIdStatus } from '../types';

// Sender IDs a gym may send from. Registration with Beem/TCRA is done offline by Growsoft (D1);
// this list only records the names that have been approved. "Growsoft" is the platform default
// and the fallback for every gym (D2), so it is never added here.

const SENDER_PATTERN = /^[A-Za-z0-9]{1,11}$/;

export const CompanySenderIds: React.FC<{ companyId: number }> = ({ companyId }) => {
    const [senders, setSenders] = useState<CompanySenderId[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [newName, setNewName] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [newDefault, setNewDefault] = useState(false);
    const [busyId, setBusyId] = useState<number | 'new' | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await api.smsAdmin.listSenderIds(companyId);
            if (res && Array.isArray(res.data)) {
                setSenders(res.data);
            } else {
                setSenders(null);
                setLoadError(res?.message || 'The server did not return a sender ID list.');
            }
        } catch (e: any) {
            setSenders(null);
            setLoadError(e?.message || 'Could not reach the sender IDs endpoint.');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    const trimmed = newName.trim();
    const nameError = trimmed === '' ? ''
        : !SENDER_PATTERN.test(trimmed) ? 'Letters and digits only, at most 11 characters, no spaces.'
        : trimmed.toLowerCase() === 'growsoft' ? '"Growsoft" is the platform default and is always available.'
        : senders?.some(s => s.senderName.toLowerCase() === trimmed.toLowerCase()) ? 'This gym already has that sender ID.'
        : '';

    const handleAdd = async () => {
        if (!trimmed || nameError) return;
        setBusyId('new');
        setError('');
        setNotice('');
        try {
            await api.smsAdmin.createSenderId(companyId, {
                senderName: trimmed,
                status: 'ACTIVE',
                isDefault: newDefault,
                notes: newNotes.trim() || null,
            });
            setNewName('');
            setNewNotes('');
            setNewDefault(false);
            setNotice(`Sender ID ${trimmed} added.`);
            await load();
        } catch (e: any) {
            setError(e?.message || 'Failed to add the sender ID.');
        } finally {
            setBusyId(null);
        }
    };

    const patch = async (s: CompanySenderId, data: { status?: SenderIdStatus; isDefault?: boolean }, done: string) => {
        setBusyId(s.id);
        setError('');
        setNotice('');
        try {
            await api.smsAdmin.updateSenderId(companyId, s.id, data);
            setNotice(done);
            // Re-read: setting a default clears the previous one server-side.
            await load();
        } catch (e: any) {
            setError(e?.message || 'Failed to update the sender ID.');
        } finally {
            setBusyId(null);
        }
    };

    const inputClasses = "border border-gray-300 p-2 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sender IDs</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <p className="text-xs text-gray-500">
                    Registration with Beem is done offline. Add a sender ID here only after it has been approved.
                    When no sender ID is active and default, this gym sends as <strong className="text-gray-700">Growsoft</strong>.
                </p>

                {loading && !senders ? (
                    <div className="flex justify-center py-2"><Loader2 className="animate-spin text-blue-600" size={20} /></div>
                ) : loadError ? (
                    <div className="flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <div>
                            {loadError}
                            <button onClick={load} className="ml-2 underline font-bold">Try again</button>
                        </div>
                    </div>
                ) : senders && senders.length === 0 ? (
                    <p className="text-sm text-gray-500">No sender IDs recorded for this gym.</p>
                ) : senders && (
                    <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
                        {senders.map(s => {
                            const active = s.status === 'ACTIVE';
                            const busy = busyId === s.id;
                            return (
                                <li key={s.id} className="p-3 flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono font-bold ${active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{s.senderName}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {active ? 'Active' : 'Disabled'}
                                            </span>
                                            {s.isDefault && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">Default</span>
                                            )}
                                        </div>
                                        {s.notes && <p className="text-xs text-gray-500 mt-1">{s.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {busy && <Loader2 className="animate-spin text-blue-600" size={16} />}
                                        {active && !s.isDefault && (
                                            <button
                                                onClick={() => patch(s, { isDefault: true }, `${s.senderName} is now the default.`)}
                                                disabled={busyId !== null}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                                            >
                                                <Star size={12} /> Set default
                                            </button>
                                        )}
                                        <button
                                            onClick={() => patch(
                                                s,
                                                { status: active ? 'DISABLED' : 'ACTIVE' },
                                                active ? `${s.senderName} disabled.` : `${s.senderName} enabled.`
                                            )}
                                            disabled={busyId !== null}
                                            className={`px-2 py-1 text-xs border rounded-lg bg-white disabled:opacity-50 flex items-center gap-1 ${
                                                active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
                                            }`}
                                        >
                                            <Power size={12} /> {active ? 'Disable' : 'Enable'}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                        <div className="flex flex-col">
                            <input
                                type="text"
                                value={newName}
                                maxLength={11}
                                onChange={e => { setNewName(e.target.value); setError(''); setNotice(''); }}
                                className={`${inputClasses} font-mono w-40`}
                                placeholder="SENDERNAME"
                            />
                            <span className="text-xs text-gray-400 mt-1">{trimmed.length}/11</span>
                        </div>
                        <input
                            type="text"
                            value={newNotes}
                            onChange={e => setNewNotes(e.target.value)}
                            className={`${inputClasses} flex-1 min-w-[10rem]`}
                            placeholder="Notes (e.g. approved by Beem on …)"
                        />
                        <label className="flex items-center gap-1 text-sm text-gray-700 py-2">
                            <input type="checkbox" checked={newDefault} onChange={e => setNewDefault(e.target.checked)} />
                            Default
                        </label>
                        <button
                            onClick={handleAdd}
                            disabled={!trimmed || !!nameError || busyId !== null || !senders}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                            {busyId === 'new' ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                            Add sender ID
                        </button>
                    </div>
                    {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                </div>

                {error && <div className="flex items-center gap-2 text-sm text-red-700"><XCircle size={16} /> {error}</div>}
                {notice && <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 size={16} /> {notice}</div>}
            </div>
        </div>
    );
};
