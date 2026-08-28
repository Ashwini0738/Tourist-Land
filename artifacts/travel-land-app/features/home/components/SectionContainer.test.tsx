import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SectionContainer } from './SectionContainer';

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fff',
    card: '#fff',
    border: '#ddd',
    foreground: '#111',
    muted: '#eee',
    mutedForeground: '#666',
    primary: '#0a0',
    primaryForeground: '#fff',
    destructive: '#d00',
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

const baseProps = {
  title: 'Destinations',
  isLoading: false,
  isError: false,
  isEmpty: false,
  onRetry: jest.fn(),
};

describe('SectionContainer', () => {
  beforeEach(() => {
    baseProps.onRetry.mockClear();
  });

  it('shows loading skeletons while a feed is loading', () => {
    const { getByLabelText, queryByText } = render(
      <SectionContainer {...baseProps} isLoading>
        <></>
      </SectionContainer>,
    );

    expect(getByLabelText('Loading destinations')).toBeTruthy();
    expect(queryByText('No destinations found.')).toBeNull();
  });

  it('shows an empty state when a feed returns no items', () => {
    const { getByText } = render(
      <SectionContainer {...baseProps} isEmpty>
        <></>
      </SectionContainer>,
    );

    expect(getByText('No destinations found.')).toBeTruthy();
  });

  it('shows a retryable error state without removing the section heading', () => {
    const { getByText } = render(
      <SectionContainer {...baseProps} isError>
        <></>
      </SectionContainer>,
    );

    fireEvent.press(getByText('Retry'));

    expect(getByText('Destinations')).toBeTruthy();
    expect(getByText('Failed to load destinations')).toBeTruthy();
    expect(baseProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders successful content when the feed has items', () => {
    const { getByText } = render(
      <SectionContainer {...baseProps}>
        <Text>Destination card</Text>
      </SectionContainer>,
    );

    expect(getByText('Destination card')).toBeTruthy();
  });
});