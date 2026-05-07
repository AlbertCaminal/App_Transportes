import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import AddressAutocompleteInput from '../AddressAutocompleteInput';
import { _resetMapboxQuotaForTests } from '../../services/mapbox/quota';

const ORIGINAL_FETCH = global.fetch;

describe('AddressAutocompleteInput', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'test-token';
    _resetMapboxQuotaForTests();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    delete (process.env as Record<string, string | undefined>).EXPO_PUBLIC_MAPBOX_TOKEN;
    jest.useRealTimers();
    _resetMapboxQuotaForTests();
  });

  it('renderiza sin sugerencias cuando no hay token', () => {
    delete (process.env as Record<string, string | undefined>).EXPO_PUBLIC_MAPBOX_TOKEN;
    const { getByPlaceholderText, queryByText } = render(
      <AddressAutocompleteInput value="" onChangeText={() => undefined} placeholder="dir" />
    );
    expect(getByPlaceholderText('dir')).toBeTruthy();
    expect(queryByText(/Sin resultados/i)).toBeNull();
  });

  it('muestra sugerencias tras debounce + foco', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{ id: 's1', place_name: 'Carrer X 1, Barcelona', center: [2.1, 41.3] }],
      }),
    }) as unknown as typeof fetch;

    let captured = '';
    const { getByPlaceholderText, findByText } = render(
      <AddressAutocompleteInput
        value=""
        onChangeText={(v) => {
          captured = v;
        }}
        placeholder="dir"
      />
    );
    const input = getByPlaceholderText('dir');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'Carr');
    expect(captured).toBe('Carr');

    await act(async () => {
      jest.advanceTimersByTime(450);
    });

    const item = await waitFor(() => findByText(/Carrer X 1/), { timeout: 2000 });
    expect(item).toBeTruthy();
  });

  it('al elegir una sugerencia notifica al padre y cierra el dropdown', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            id: 'pick-1',
            place_name: 'Plaça Catalunya, Barcelona',
            center: [2.1701, 41.3874],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    let pickedCenter: [number, number] | null = null;
    let value = '';
    const { getByPlaceholderText, findByText, queryByText, rerender } = render(
      <AddressAutocompleteInput
        value=""
        onChangeText={(v) => {
          value = v;
        }}
        onSelectSuggestion={(s) => {
          pickedCenter = s.center;
        }}
        placeholder="dir"
      />
    );
    const input = getByPlaceholderText('dir');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'Plaça Catal');
    await act(async () => {
      jest.advanceTimersByTime(450);
    });

    const item = await findByText(/Plaça Catalunya/);
    fireEvent.press(item);
    expect(pickedCenter).toEqual([2.1701, 41.3874]);
    expect(value).toContain('Plaça Catalunya');

    rerender(
      <AddressAutocompleteInput
        value={value}
        onChangeText={(v) => {
          value = v;
        }}
        onSelectSuggestion={(s) => {
          pickedCenter = s.center;
        }}
        placeholder="dir"
      />
    );
    expect(queryByText(/Plaça Catalunya/)).toBeNull();
  });
});
