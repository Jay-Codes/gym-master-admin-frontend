// Canonical payout-schedule values (KZ-48). The backend stores the schedule as free text
// (Referral.payoutSchedule / PartnerConfig.defaultPayoutSchedule, no enum), so these strings are
// what the console writes. The global default and the per-partner override use this one list.
export const PAYOUT_SCHEDULE_OPTIONS = ['Weekly', 'Monthly', 'Quarterly', 'On Demand'] as const;

// Options for a select whose current value may be a legacy free-text string (e.g. the seeded
// "Monthly on the 5th"). The legacy value stays selectable so opening the form never silently
// changes it; picking a canonical value replaces it.
export const payoutScheduleOptions = (current: string | null | undefined): string[] => {
    const value = (current ?? '').trim();
    const base: string[] = [...PAYOUT_SCHEDULE_OPTIONS];
    return value && !base.includes(value) ? [value, ...base] : base;
};
