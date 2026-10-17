import React, { useState } from 'react';
import { BellRing, FileText, Settings } from 'lucide-react';
import { SettingsTab } from './planNotifications/SettingsTab';
import { TemplatesTab } from './planNotifications/TemplatesTab';

/**
 * Plan notifications wave AD-3 — `/plan-notifications`. Expiry reminders and payment receipts by SMS,
 * paid by Kazafit. Tabs: Settings, Templates (more tabs land with the reminder job and the stats).
 */

type Tab = 'settings' | 'templates';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
    { id: 'templates', label: 'Templates', icon: <FileText size={16} /> },
];

export const PlanNotificationsPage: React.FC = () => {
    const [tab, setTab] = useState<Tab>('settings');
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BellRing size={24} className="text-blue-600" /> Plan Notifications</h1>
                <p className="text-sm text-gray-500 mt-1">SMS to gym owners before and after their Kazafit plan ends, and receipts for payments recorded by hand. Kazafit pays; gyms' SMS credits are never used.</p>
            </div>
            <div className="flex border-b border-gray-200 overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                        className={`px-5 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                {tab === 'settings' && <SettingsTab />}
                {tab === 'templates' && <TemplatesTab />}
            </div>
        </div>
    );
};
