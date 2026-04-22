import type { I18nDict } from './es';

export const en: I18nDict = {
  common: {
    back: 'Back',
    retry: 'Retry',
  },
  onboarding: {
    welcome: 'Welcome',
    selectLanguage: 'Select your language',
    languages: {
      ca: 'Català',
      es: 'Castellano',
      en: 'English',
    },
    footer: 'Barcelona Logistics • v2.0',
  },
  login: {
    title: 'Sign in',
    subtitle: 'Sign in to save your shipments and routes.',
    googleButton: 'Continue with Google',
    guestButton: 'Continue as guest',
    notConfigured: 'Google Sign-In is not available in this build.',
    loading: 'Connecting…',
    privacyNote: 'By continuing you accept the Privacy Policy.',
    error: 'Sign-in failed. Please try again.',
  },
  profile: {
    question: 'How will you use the app?',
    client: "I'm a Customer",
    carrier: "I'm a Carrier",
    clientDesc: 'I want to send packages',
    carrierDesc: 'I want to fulfill deliveries',
    legalLink: 'Legal & help',
    signOut: 'Sign out',
  },
  legal: {
    title: 'Legal & help',
    subtitle: 'Information and contact',
    privacy: 'Privacy policy',
    website: 'Website',
    support: 'Support email',
    openError: 'Could not open the link.',
    webNote:
      'In the browser, email may open your default client; otherwise copy the support address manually.',
  },
  errorBoundary: {
    title: 'Something went wrong',
    body: 'The app hit an unexpected error. You can try to continue; if the problem persists, restart the app.',
  },
};
