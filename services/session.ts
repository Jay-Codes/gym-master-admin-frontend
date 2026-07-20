// Single owner of everything session-related that lives in localStorage.
// Both the API layer and the router read through here so a token can never be
// cleared in one place and left behind in another.

export const TOKEN_KEY = 'token';
export const ROLE_KEY = 'role';
export const ONBOARDING_TOKEN_KEY = 'onboarding_token';
export const ONBOARDING_STEP_KEY = 'onboarding_step';
export const ONBOARDING_EMAIL_KEY = 'onboarding_email';

const SESSION_KEYS = [
  TOKEN_KEY,
  ROLE_KEY,
  ONBOARDING_TOKEN_KEY,
  ONBOARDING_STEP_KEY,
  ONBOARDING_EMAIL_KEY,
];

type Listener = () => void;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener());

// Cross-tab: signing out (or in) in one tab must not leave another tab
// rendering a console it no longer has a token for.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === null || SESSION_KEYS.includes(event.key)) {
      notify();
    }
  });
}

export const onSessionChange = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRole = () => localStorage.getItem(ROLE_KEY);
export const getOnboardingToken = () => localStorage.getItem(ONBOARDING_TOKEN_KEY);

export const setSession = (token: string, role: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  notify();
};

// Onboarding tokens are not SUPER_ADMIN_TOKENs — they must never land under
// TOKEN_KEY or the console will let a half-onboarded user past the router and
// then 403 on every request it makes.
export const setOnboardingToken = (token: string) => {
  localStorage.setItem(ONBOARDING_TOKEN_KEY, token);
  notify();
};

export const setOnboardingEmail = (email: string) => {
  localStorage.setItem(ONBOARDING_EMAIL_KEY, email);
};

export const getOnboardingEmail = () => localStorage.getItem(ONBOARDING_EMAIL_KEY);

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  notify();
};
