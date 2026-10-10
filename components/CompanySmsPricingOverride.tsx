import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Trash2, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { SmsPricingOverride } from '../types';

// Per-gym SMS credit rate. When set, this gym pays this rate per credit instead of the platform
// rate; VAT and the minimum purchase still come from the platform settings. Removing it puts the
// gym back on the platform rate. Purchases already in progress keep the price frozen on them.

export const CompanySmsPricingOverride: React.FC<{ companyId: number }> = ({ companyId }) => {
    const [override, setOverride] = useState<SmsPricingOverride | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [rate, setRate] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        setLoaded(false);
        try {
            const res = await api.smsAdmin.getPricingOverride(companyId);
            const data = res?.data && typeof res.data.rateTzs === 'number' ? res.data : null;
            setOverride(data);
            setRate(data ? String(data.rateTzs) : '');
            setNote(data?.note || '');
            setLoaded(true);
        } catch (e: any) {
            setLoadError(e?.message || 'Could not read the rate override.');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        const value = Number(rate.trim());
        if (rate.trim() === '' || !Number.isInteger(value) || value < 1) {
            setError('Rate must be a whole number of TZS, at least 1.');
            return;
        }
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const res = await api.smsAdmin.setPricingOverride(companyId, { rateTzs: value, note: note.trim() || null });
            const saved = res?.data && typeof res.data.rateTzs === 'number' ? res.data : { rateTzs: value, note: note.trim() || null };
            setOverride(saved);
            setNotice('Override saved.');
        } catch (e: any) {
            setError(e?.message || 'Failed to save the override.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        setSaving(true);
        setError('');
        setNotice('');
        try {
            await api.smsAdmin.deletePricingOverride(companyId);
            setOverride(null);
            setRate('');
            setNote('');
            setNotice('Override removed. This gym now pays the platform rate.');
        } catch (e: any) {
            setError(e?.message || 'Failed to remove the override.');
        } finally {
            setSaving(false);
        }
    };

    const dirty = loaded && (rate.trim() !== (override ? String(override.rateTzs) : '') || (note.trim() || '') !== (override?.note || ''));
    const inputClasses = "w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">SMS Credit Rate</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-2"><Loader2 className="animate-spin text-blue-600" size={20} /></div>
                ) : loadError ? (
                    <div className="flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <div>
                            {loadError} Whether this gym has its own rate is unknown.
                            <button onClick={load} className="ml-2 underline font-bold">Try again</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-xs text-gray-500">
                            {override
                                ? <>This gym pays <strong className="text-gray-900">{override.rateTzs.toLocaleString('en-US')} TZS per credit</strong> (excl. VAT) instead of the platform rate.</>
                                : <>No override &mdash; this gym pays the platform rate set on SMS Pricing.</>}
                            {' '}VAT and the minimum purchase always follow the platform settings.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Rate (TZS per credit)</label>
                                <input type="number" min="1" step="1" value={rate}
                                    onChange={e => { setRate(e.target.value); setError(''); setNotice(''); }}
                                    className={inputClasses} placeholder="e.g. 20" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Note</label>
                                <input type="text" value={note}
                                    onChange={e => { setNote(e.target.value); setError(''); setNotice(''); }}
                                    className={inputClasses} placeholder="Why this gym has its own rate" />
                            </div>
                        </div>
                        {error && <div className="flex items-center gap-2 text-sm text-red-700"><XCircle size={16} /> {error}</div>}
                        {notice && !dirty && <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 size={16} /> {notice}</div>}
                        <div className="flex justify-end gap-2">
                            {override && (
                                <button onClick={handleRemove} disabled={saving}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1">
                                    <Trash2 size={14} /> Use platform rate
                                </button>
                            )}
                            <button onClick={handleSave} disabled={saving || !dirty}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                                {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                {override ? 'Update override' : 'Set override'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
