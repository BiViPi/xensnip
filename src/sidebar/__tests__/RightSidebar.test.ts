import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RightSidebar } from '../RightSidebar';
import { useSidebarStore } from '../store';
import { useMeasureStore } from '../../measure/store';

describe('RightSidebar', () => {
  beforeEach(() => {
    useSidebarStore.setState({
      collapsed: false,
      activeFeatureId: 'annotate',
    });
    useMeasureStore.setState({
      activeUtility: null,
      gridVisible: false,
    });
  });

  afterEach(() => {
    cleanup();
    useSidebarStore.setState({
      collapsed: true,
      activeFeatureId: null,
    });
    useMeasureStore.setState({
      activeUtility: null,
      gridVisible: false,
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

  it('hides all 2D feature groups including measure_extract and empty rail in studio mode', () => {
    useSidebarStore.setState({ collapsed: false, activeFeatureId: 'measure_extract' });
    useMeasureStore.setState({ activeUtility: 'ocr_extract', gridVisible: true });

    const { container } = render(React.createElement(RightSidebar, { presentationMode: 'studio' }));

    expect(screen.queryByLabelText('Annotate')).toBeNull();
    expect(screen.queryByLabelText('Privacy')).toBeNull();
    expect(screen.queryByLabelText('Crop & Canvas')).toBeNull();
    expect(screen.queryByLabelText(/Measure & Extract/)).toBeNull();
    expect(container.querySelector('.xs-sidebar-root')).toBeNull();
    expect(useSidebarStore.getState().activeFeatureId).toBeNull();
    expect(useMeasureStore.getState().activeUtility).toBeNull();
    expect(useMeasureStore.getState().gridVisible).toBe(false);
  });

  it('graduates all feature groups with zero beta dots or (beta) labels in flat mode', () => {
    const { container } = render(React.createElement(RightSidebar, { presentationMode: 'flat' }));

    expect(container.querySelectorAll('.xs-beta-dot')).toHaveLength(0);
    expect(screen.queryByLabelText(/\(beta\)/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Steps & Callouts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Focus & Polish' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Measure & Extract' })).toBeTruthy();
  });
});
