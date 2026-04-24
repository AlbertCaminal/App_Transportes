/* eslint-disable import/first -- jest.mock debe declararse antes que los imports del módulo bajo prueba */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../config/firebase', () => ({
  isFirebaseConfigured: () => false,
  getFirebaseAuth: () => undefined,
  getFirestoreDb: () => undefined,
  getFirebaseApp: () => undefined,
}));

jest.mock('../../services/firebase/auth', () => ({
  signOutUser: jest.fn(),
  deleteCurrentUserAccount: jest.fn(),
  signInAsGuest: jest.fn(),
  signInWithGoogleIdToken: jest.fn(),
  subscribeToAuth: jest.fn(() => () => undefined),
}));

import ProfileSelection from '../ProfileSelection';
import { useAppStore } from '../../store/appStore';

describe('ProfileSelection (smoke)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.setState({ lang: 'es', step: 'profile' });
  });

  const baseProps = () => ({
    lang: 'es' as const,
    onSelect: jest.fn(),
    onBack: jest.fn(),
    onLegalHelp: jest.fn(),
  });

  it('muestra la pregunta y las dos opciones de perfil', () => {
    render(<ProfileSelection {...baseProps()} />);
    expect(screen.getByText('¿Cómo vas a usar la app?')).toBeTruthy();
    expect(screen.getByText('Soy Cliente')).toBeTruthy();
    expect(screen.getByText('Soy Transportista')).toBeTruthy();
  });

  it('invoca onSelect("client") al pulsar la tarjeta de cliente', () => {
    const onSelect = jest.fn();
    render(<ProfileSelection {...baseProps()} onSelect={onSelect} />);
    fireEvent.press(screen.getByText('Soy Cliente'));
    expect(onSelect).toHaveBeenCalledWith('client');
  });

  it('invoca onLegalHelp desde el enlace "Legal y ayuda"', () => {
    const onLegal = jest.fn();
    render(<ProfileSelection {...baseProps()} onLegalHelp={onLegal} />);
    fireEvent.press(screen.getByText('Legal y ayuda'));
    expect(onLegal).toHaveBeenCalled();
  });

  it('con usuario autenticado el menú abre Mi cuenta (paso account-settings)', () => {
    useAppStore.setState({
      step: 'profile',
      user: {
        uid: 'u1',
        provider: 'google',
        email: 'a@test.com',
        displayName: 'Test',
        photoURL: null,
        isAnonymous: false,
      },
    });
    render(<ProfileSelection {...baseProps()} />);
    fireEvent.press(screen.getByLabelText('Menú de cuenta'));
    expect(useAppStore.getState().step).toBe('account-settings');
    expect(useAppStore.getState().accountSettingsReturnStep).toBe('profile');
  });
});
