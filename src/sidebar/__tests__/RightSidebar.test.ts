import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RightSidebar } from '../RightSidebar';
import { useSidebarStore } from '../store';

describe('RightSidebar', () => {
  beforeEach(() => {
    useSidebarStore.setState({
      collapsed: false,
      activeFeatureId: 'annotate',
    });
  });

  afterEach(() => {
    cleanup();
    useSidebarStore.setState({
      collapsed: true,
      activeFeatureId: null,
    });
  });

  it('closes the popover on outside pointer down', () => {
    render(
      React.createElement(
        'div',
        null,
        React.createElement(RightSidebar),
        React.createElement('div', { 'data-testid': 'outside-target' }, 'outside'),
      ),
    );

    expect(screen.queryByLabelText('Arrow - drag on canvas')).not.toBeNull();

    fireEvent.pointerDown(screen.getByTestId('outside-target'));

    expect(useSidebarStore.getState().activeFeatureId).toBeNull();
    expect(screen.queryByLabelText('Arrow - drag on canvas')).toBeNull();
  });
});
