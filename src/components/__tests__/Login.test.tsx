/* eslint-disable import/first -- jest.mock debe declararse antes que los imports del módulo bajo prueba */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPromptAsync = jest.fn().mockResolvedValue({ type: 'cancel' });
const mockSignInAsGuest = jest.fn().mockResolvedValue({
  uid: 'guest-1',
  provider: 'anonymous',
  isAnonymous: true,
});

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: () => [{}, null, mockPromptAsync],
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => undefined,
  getFirestoreDb: () => undefined,
  getFirebaseApp: () => undefined,
}));

jest.mock('../../services/firebase/auth', () => ({
  signInAsGuest: (...args: unknown[]) => mockSignInAsGuest(...args),
  signOutUser: jest.fn(),
  signInWithGoogleIdToken: jest.fn(),
  subscribeToAuth: jest.fn(() => () => undefined),
  signInWithEmailPassword: jest.fn().mockResolvedValue(null),
  registerWithEmailPassword: jest.fn().mockResolvedValue(null),
}));

import Login from '../Login';
import { useAppStore } from '../../store/appStore';

describe('Login (smoke)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.setState({ lang: 'es' });
    mockPromptAsync.mockClear();
    mockSignInAsGuest.mockClear();
  });

  it('renderiza título y botones (es por defecto)', () => {
    render(<Login onBack={jest.fn()} onLegalHelp={jest.fn()} onGoToRegister={jest.fn()} />);
    expect(screen.getByText('Inicia sesión')).toBeTruthy();
    expect(screen.getByText('Continuar con Google')).toBeTruthy();
    expect(screen.getByText('Continuar como invitado')).toBeTruthy();
  });

  it('Google muestra "no configurado" si no hay client IDs', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
    render(<Login onBack={jest.fn()} onLegalHelp={jest.fn()} onGoToRegister={jest.fn()} />);
    expect(screen.getByText('Google Sign-In no está disponible en esta build.')).toBeTruthy();
  });

  it('al pulsar "Continuar como invitado" llama a signInAsGuest', async () => {
    render(<Login onBack={jest.fn()} onLegalHelp={jest.fn()} onGoToRegister={jest.fn()} />);
    fireEvent.press(screen.getByText('Continuar como invitado'));
    await waitFor(() => expect(mockSignInAsGuest).toHaveBeenCalledTimes(1));
  });

  it('al pulsar Volver invoca onBack', () => {
    const onBack = jest.fn();
    render(<Login onBack={onBack} onLegalHelp={jest.fn()} onGoToRegister={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalled();
  });
});
