import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LegalHelp from '../LegalHelp';
import { useAppStore } from '../../store/appStore';

describe('LegalHelp (smoke)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.setState({ lang: 'es' });
  });

  it('renderiza el título en el idioma activo (es por defecto)', () => {
    render(<LegalHelp lang="es" onBack={jest.fn()} />);
    expect(screen.getByText('Legal y ayuda')).toBeTruthy();
  });

  it('reacciona al cambio de idioma global a catalán', () => {
    useAppStore.setState({ lang: 'ca' });
    render(<LegalHelp lang="ca" onBack={jest.fn()} />);
    expect(screen.getByText('Legal i ajuda')).toBeTruthy();
  });

  it('reacciona al cambio de idioma global a inglés', () => {
    useAppStore.setState({ lang: 'en' });
    render(<LegalHelp lang="en" onBack={jest.fn()} />);
    expect(screen.getByText('Legal & help')).toBeTruthy();
  });
});
