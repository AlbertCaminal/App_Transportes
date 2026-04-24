/* eslint-disable import/first -- jest.mock debe declararse antes que los imports del módulo bajo prueba */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('firebase/app', () => {
  class FirebaseError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'FirebaseError';
      this.code = code;
    }
  }
  return { FirebaseError };
});

const mockSignOutUser = jest.fn().mockResolvedValue(undefined);
const mockUpdateAuthDisplayName = jest.fn().mockResolvedValue(undefined);
const mockDeleteCurrentUserAccount = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/firebase/auth', () => ({
  signOutUser: (...args: unknown[]) => mockSignOutUser(...args),
  updateAuthDisplayName: (...args: unknown[]) => mockUpdateAuthDisplayName(...args),
  deleteCurrentUserAccount: (...args: unknown[]) => mockDeleteCurrentUserAccount(...args),
}));

import AccountSettings from '../AccountSettings';
import { useAppStore } from '../../store/appStore';

describe('AccountSettings (smoke)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.setState({
      lang: 'es',
      user: {
        uid: 'user-1',
        provider: 'email',
        email: 'user@test.com',
        displayName: 'Usuario',
        isAnonymous: false,
      },
      profile: 'client',
    });
    mockSignOutUser.mockClear();
    mockUpdateAuthDisplayName.mockClear();
    mockDeleteCurrentUserAccount.mockClear();
  });

  it('renderiza título y correo', () => {
    render(<AccountSettings onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    expect(screen.getByText('Mi cuenta')).toBeTruthy();
    expect(screen.getByText('user@test.com')).toBeTruthy();
  });

  it('al pulsar Volver invoca onBack', () => {
    const onBack = jest.fn();
    render(<AccountSettings onBack={onBack} onLegalHelp={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalled();
  });

  it('al cerrar sesión llama a signOutUser y limpia el usuario en el store', async () => {
    render(<AccountSettings onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Cerrar sesión'));
    await waitFor(() => expect(mockSignOutUser).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().step).toBe('login');
  });

  it('eliminar cuenta confirma y llama a deleteCurrentUserAccount', async () => {
    render(<AccountSettings onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Eliminar cuenta'));
    expect(screen.getByText('¿Eliminar cuenta?')).toBeTruthy();
    fireEvent.press(screen.getByText('Eliminar definitivamente'));
    await waitFor(() => expect(mockDeleteCurrentUserAccount).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().user).toBeNull();
  });
});
