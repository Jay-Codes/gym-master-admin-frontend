import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, Power, Star, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { CompanySenderId, FieldErrors, UpdateSenderIdRequest } from '../types';

// Sender IDs a gym may send from. Registration with Beem/TCRA is done offline by Growsoft (D1);
// this list only records the names that have been approved. "Growsoft" is the platform default
// and the fallback for every gym (D2), so it is never added here.
//
// Contract (S3-T1 as shipped, run/S3-T1.md; flat `Response` envelope):
//   GET   /api/superadmin/companies/{companyId}/sender-ids          → [SenderId], both statuses, id order; 404 unknown gym
//   POST  …/sender-ids  {senderName, status?, isDefault?, notes?}  → 201 SenderId; 400 errors.<field>; 409 errors.senderName (duplicate, any case)
//   PATCH …/sender-ids/{senderId}  partial {status?, isDefault?, notes?} → 200 SenderId; 400 errors.isDefault; 404
// Setting a default clears the previous one; disabling the default clears it (gym falls back to
// Growsoft). Either way the list is re-read after every write.

const SENDER_PATTERN = /^[A-Za-z0-9]{1,11}$/;
const PLATFORM_DEFAULT = 'Growsoft';
const NOTES_MAX = 500;

const firstError = (errors: FieldErrors | undefined, field: string): string =>
    Array.isArray(errors?.[field]) ? errors![field].join(' ') : '';

const formatEat = (iso: string | null | undefined): string => {
    if (!iso) return '';
    // LocalDateTime without an offset; shown as stored.
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
};

export const CompanySenderIds: React.FC<{ companyId: number }> = ({ companyId }) => {
    const [senders, setSenders] = useState<CompanySenderId[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [newName, setNewName] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [newDefault, setNewDefault] = useState(false);
    const [addErrors, setAddErrors] = useState<FieldErrors>({});
    const [busyId, setBusyId] = useState<number | 'new' | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    // Inline confirm before disabling the current default.
    const [confirmDisableId, setConfirmDisableId] = useState<number | null>(null);
    // Inline notes editor.
    const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
    const [notesDraft, setNotesDraft] = useState('');
    const [notesError, setNotesError] = useState('');

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
            setLoadError(e?.status === 404
                ? 'This company was not found.'
                : (e?.message || 'Could not reach the sender IDs endpoint.'));
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    const trimmed = newName.trim();
    const nameError = trimmed === '' ? ''
        : !SENDER_PATTERN.test(trimmed) ? 'Letters and digits only, at most 11 characters, no spaces.'
        : trimmed.toLowerCase() === PLATFORM_DEFAULT.toLowerCase() ? `"${PLATFORM_DEFAULT}" is the platform default and is always available.`
        : senders?.some(s => s.senderName.toLowerCase() === trimmed.toLowerCase()) ? 'This gym already has that sender ID.'
        : '';
    const newNotesError = newNotes.trim().length > NOTES_MAX ? `Notes can be at most ${NOTES_MAX} characters.` : '';

    const clearMessages = () => { setError(''); setNotice(''); };

    const handleAdd = async () => {
        if (!trimmed || nameError || newNotesError) return;
        setBusyId('new');
        clearMessages();
        setAddErrors({});
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
            setNotice(`Sender ID ${trimmed} added${newDefault ? ' as the default' : ''}.`);
            await load();
        } catch (e: any) {
            // 400 errors.senderName|status|isDefault|notes; 409 errors.senderName (duplicate); 404 unknown gym.
            const fe: FieldErrors = e?.errors && typeof e.errors === 'object' ? e.errors : {};
            setAddErrors(fe);
            const hasField = ['senderName', 'status', 'isDefault', 'notes'].some(f => firstError(fe, f));
            if (!hasField) {
                setError(e?.status === 404 ? 'This company was not found.' : (e?.message || 'Failed to add the sender ID.'));
            }
            if (e?.status === 409) await load();
        } finally {
            setBusyId(null);
        }
    };

    const patch = async (s: CompanySenderId, data: UpdateSenderIdRequest, done: string): Promise<boolean> => {
        setBusyId(s.id);
        clearMessages();
        try {
            await api.smsAdmin.updateSenderId(companyId, s.id, data);
            setNotice(done);
            // Re-read: setting a default clears the previous one; disabling the default clears it.
            await load();
            return true;
        } catch (e: any) {
            const fe: FieldErrors | undefined = e?.errors;
            const fieldMsg = firstError(fe, 'isDefault') || firstError(fe, 'status') || firstError(fe, 'notes');
            if (data.notes !== undefined && firstError(fe, 'notes')) {
                setNotesError(firstError(fe, 'notes'));
            } else {
                setError(fieldMsg
                    || (e?.status === 404 ? 'This sender ID no longer exists for this gym.' : '')
                    || e?.message || 'Failed to update the sender ID.');
            }
            if (e?.status === 404 || e?.status === 400) await load();
            return false;
        } finally {
            setBusyId(null);
        }
    };

    const toggleStatus = (s: CompanySenderId) => {
        if (s.status === 'ACTIVE') {
            if (s.isDefault && confirmDisableId !== s.id) {
                clearMessages();
                setConfirmDisableId(s.id);
                return;
            }
            setConfirmDisableId(null);
            patch(s, { status: 'DISABLED' },
                s.isDefault
                    ? `${s.senderName} disabled. This gym now has no default sender ID and sends as ${PLATFORM_DEFAULT}.`
                    : `${s.senderName} disabled.`);
        } else {
            patch(s, { status: 'ACTIVE' }, `${s.senderName} enabled.`);
        }
    };

    const startEditNotes = (s: CompanySenderId) => {
        clearMessages();
        setNotesError('');
        setEditingNotesId(s.id);
        setNotesDraft(s.notes ?? '');
    };

    const saveNotes = async (s: CompanySenderId) => {
        const value = notesDraft.trim();
        if (value.length > NOTES_MAX) { setNotesError(`Notes can be at most ${NOTES_MAX} characters.`); return; }
        if (value === (s.notes ?? '')) { setEditingNotesId(null); return; }
        setNotesError('');
        // Blank clears the notes server-side (null would mean "unchanged").
        const ok = await patch(s, { notes: value }, value ? `Notes for ${s.senderName} saved.` : `Notes for ${s.senderName} cleared.`);
        if (ok) setEditingNotesId(null);
    };

    const inputClasses = "border border-gray-300 p-2 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none";
    const addNameError = nameError || firstError(addErrors, 'senderName');
    const addNotesError = newNotesError || firstError(addErrors, 'notes');
    const addOtherError = firstError(addErrors, 'isDefault') || firstError(addErrors, 'status');

    return (
        <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sender IDs</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <p className="text-xs text-gray-500">
                    Registration with Beem is done offline. Add a sender ID here only after it has been approved.
                    When no active sender ID is the default, this gym sends as <strong className="text-gray-700">{PLATFORM_DEFAULT}</strong>.
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
                            const editing = editingNotesId === s.id;
                            return (
                                <li key={s.id} className="p-3 space-y-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-mono font-bold ${active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{s.senderName}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {active ? 'Active' : 'Disabled'}
                                                </span>
                                                {s.isDefault && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">Default</span>
                                                )}
                                            </div>
                                            {!editing && s.notes && <p className="text-xs text-gray-500 mt-1 break-words">{s.notes}</p>}
                                            {(s.createdBy || s.createdAt) && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Added{s.createdBy ? ` by ${s.createdBy}` : ''}{s.createdAt ? ` · ${formatEat(s.createdAt)}` : ''}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {busy && <Loader2 className="animate-spin text-blue-600" size={16} />}
                                            {!editing && (
                                                <button
                                                    onClick={() => startEditNotes(s)}
                                                    disabled={busyId !== null}
                                                    className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <Pencil size={12} /> Notes
                                                </button>
                                            )}
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
                                                onClick={() => toggleStatus(s)}
                                                disabled={busyId !== null || confirmDisableId === s.id}
                                                className={`px-2 py-1 text-xs border rounded-lg bg-white disabled:opacity-50 flex items-center gap-1 ${
                                                    active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
                                                }`}
                                            >
                                                <Power size={12} /> {active ? 'Disable' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>

                                    {confirmDisableId === s.id && (
                                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                            <AlertTriangle size={14} className="shrink-0" />
                                            <span className="flex-1 min-w-[12rem]">
                                                {s.senderName} is this gym&rsquo;s default. Disabling it also clears the default, so the gym
                                                will send as <strong>{PLATFORM_DEFAULT}</strong> until another sender ID is set as default.
                                            </span>
                                            <button
                                                onClick={() => toggleStatus(s)}
                                                disabled={busyId !== null}
                                                className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
                                            >
                                                Disable anyway
                                            </button>
                                            <button
                                                onClick={() => setConfirmDisableId(null)}
                                                disabled={busyId !== null}
                                                className="px-2 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}

                                    {editing && (
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={notesDraft}
                                                    maxLength={NOTES_MAX}
                                                    onChange={e => { setNotesDraft(e.target.value); setNotesError(''); }}
                                                    className={`${inputClasses} flex-1 min-w-[10rem]`}
                                                    placeholder="Notes (blank clears them)"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => saveNotes(s)}
                                                    disabled={busyId !== null}
                                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => { setEditingNotesId(null); setNotesError(''); }}
                                                    disabled={busyId !== null}
                                                    className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-red-600">{notesError}</span>
                                                <span className="text-gray-400">{notesDraft.trim().length}/{NOTES_MAX}</span>
                                            </div>
                                        </div>
                                    )}
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
                                onChange={e => { setNewName(e.target.value); clearMessages(); setAddErrors(f => ({ ...f, senderName: [] })); }}
                                className={`${inputClasses} font-mono w-40`}
                                placeholder="SENDERNAME"
                            />
                            <span className="text-xs text-gray-400 mt-1">{trimmed.length}/11</span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-[10rem]">
                            <input
                                type="text"
                                value={newNotes}
                                maxLength={NOTES_MAX}
                                onChange={e => { setNewNotes(e.target.value); setAddErrors(f => ({ ...f, notes: [] })); }}
                                className={inputClasses}
                                placeholder="Notes (e.g. approved by Beem on …)"
                            />
                            <span className="text-xs text-gray-400 mt-1 text-right">{newNotes.trim().length}/{NOTES_MAX}</span>
                        </div>
                        <label className="flex items-center gap-1 text-sm text-gray-700 py-2">
                            <input type="checkbox" checked={newDefault} onChange={e => { setNewDefault(e.target.checked); setAddErrors(f => ({ ...f, isDefault: [] })); }} />
                            Default
                        </label>
                        <button
                            onClick={handleAdd}
                            disabled={!trimmed || !!nameError || !!newNotesError || busyId !== null || !senders}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                            {busyId === 'new' ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                            Add sender ID
                        </button>
                    </div>
                    {newDefault && senders?.some(s => s.isDefault) && (
                        <p className="text-xs text-gray-500">The current default will be replaced by the new sender ID.</p>
                    )}
                    {addNameError && <p className="text-xs text-red-600">{addNameError}</p>}
                    {addNotesError && <p className="text-xs text-red-600">{addNotesError}</p>}
                    {addOtherError && <p className="text-xs text-red-600">{addOtherError}</p>}
                </div>

                {error && <div className="flex items-center gap-2 text-sm text-red-700"><XCircle size={16} className="shrink-0" /> {error}</div>}
                {notice && <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 size={16} className="shrink-0" /> {notice}</div>}
            </div>
        </div>
    );
};
