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
  signInAsGuest: jest.fn(),
  signInWithGoogleIdToken: jest.fn(),
  subscribeToAuth: jest.fn(() => () => undefined),
}));

import ProfileSelection from '../ProfileSelection';
import { useAppStore } from '../../store/appStore';

describe('ProfileSelection (smoke)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('muestra la pregunta y las dos opciones de perfil', () => {
    render(<ProfileSelection lang="es" onSelect={jest.fn()} onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    expect(screen.getByText('¿Cómo vas a usar la app?')).toBeTruthy();
    expect(screen.getByText('Soy Cliente')).toBeTruthy();
    expect(screen.getByText('Soy Transportista')).toBeTruthy();
  });

  it('invoca onSelect("client") al pulsar la tarjeta de cliente', () => {
    const onSelect = jest.fn();
    render(<ProfileSelection lang="es" onSelect={onSelect} onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    fireEvent.press(screen.getByText('Soy Cliente'));
    expect(onSelect).toHaveBeenCalledWith('client');
  });

  it('invoca onLegalHelp desde el enlace "Legal y ayuda"', () => {
    const onLegal = jest.fn();
    render(<ProfileSelection lang="es" onSelect={jest.fn()} onBack={jest.fn()} onLegalHelp={onLegal} />);
    fireEvent.press(screen.getByText('Legal y ayuda'));
    expect(onLegal).toHaveBeenCalled();
  });
});
