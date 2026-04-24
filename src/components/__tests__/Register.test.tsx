/* eslint-disable import/first -- jest.mock debe declararse antes que los imports del módulo bajo prueba */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockRegisterWithEmailProfile = jest.fn().mockResolvedValue(undefined);

jest.mock('../../config/firebase', () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => undefined,
  getFirestoreDb: () => undefined,
  getFirebaseApp: () => undefined,
}));

jest.mock('../../services/firebase/auth', () => ({
  registerWithEmailProfile: (...args: unknown[]) => mockRegisterWithEmailProfile(...args),
}));

import Register from '../Register';
import { useAppStore } from '../../store/appStore';

describe('Register (smoke)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.setState({ lang: 'es' });
    mockRegisterWithEmailProfile.mockClear();
  });

  it('renderiza título y CTA', () => {
    render(<Register onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    expect(screen.getByText('Crear cuenta')).toBeTruthy();
    expect(screen.getByLabelText('Crear mi cuenta')).toBeTruthy();
  });

  it('al pulsar Volver invoca onBack', () => {
    const onBack = jest.fn();
    render(<Register onBack={onBack} onLegalHelp={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalled();
  });

  it('sin aceptar términos muestra validación', () => {
    render(<Register onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Nombre y apellidos'), 'Ana Test');
    fireEvent.changeText(screen.getByPlaceholderText('Correo electrónico'), 'ana@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Contraseña (mín. 6 caracteres)'), 'secret1');
    fireEvent.changeText(screen.getByPlaceholderText('Repite la contraseña'), 'secret1');
    fireEvent.press(screen.getByLabelText('Crear mi cuenta'));
    expect(screen.getByText('Debes aceptar los términos para continuar.')).toBeTruthy();
    expect(mockRegisterWithEmailProfile).not.toHaveBeenCalled();
  });

  it('con datos válidos y términos llama a registerWithEmailProfile', async () => {
    render(<Register onBack={jest.fn()} onLegalHelp={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('Nombre y apellidos'), 'Ana Test');
    fireEvent.changeText(screen.getByPlaceholderText('Correo electrónico'), 'ana@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Contraseña (mín. 6 caracteres)'), 'secret1');
    fireEvent.changeText(screen.getByPlaceholderText('Repite la contraseña'), 'secret1');
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByLabelText('Crear mi cuenta'));
    await waitFor(() =>
      expect(mockRegisterWithEmailProfile).toHaveBeenCalledWith(
        'ana@test.com',
        'secret1',
        'Ana Test',
        undefined
      )
    );
  });
});
