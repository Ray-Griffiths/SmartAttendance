import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttendanceChart from '../AttendanceChart';

describe('AttendanceChart', () => {
  const sampleData = [
    { day: 'Monday', rate: 85 },
    { day: 'Tuesday', rate: 90 },
    { day: 'Wednesday', rate: 88 },
    { day: 'Thursday', rate: 92 },
    { day: 'Friday', rate: 87 }
  ];

  it('renders loading state correctly', () => {
    render(<AttendanceChart loading={true} />);
    const loadingElement = screen.getByText('Loading chart…');
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement.parentElement).toHaveAttribute('aria-busy', 'true');
    expect(loadingElement.parentElement).toHaveAttribute('aria-live', 'polite');
  });

  it('renders empty state when no data is provided', () => {
    render(<AttendanceChart />);
    const noDataElement = screen.getByText('No attendance trend data available.');
    expect(noDataElement).toHaveAttribute('role', 'img');
    expect(noDataElement).toHaveAttribute('aria-label', 'Attendance chart not available');
  });

  it('renders empty state when data array is empty', () => {
    render(<AttendanceChart data={[]} />);
    expect(screen.getByText('No attendance trend data available.')).toBeInTheDocument();
  });

  it('renders chart with data correctly', () => {
    render(<AttendanceChart data={sampleData} />);
    const svg = screen.getByRole('img', { name: 'Attendance trend sparkline. Higher is better.' });
    expect(svg).toBeInTheDocument();
    expect(svg.tagName).toBe('svg');

    // Verify polyline exists with correct attributes
    const polyline = svg.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    expect(polyline).toHaveAttribute('stroke', '#2563eb');
    expect(polyline).toHaveAttribute('stroke-width', '3');
    expect(polyline).toHaveAttribute('points');

    // Verify figcaption for screen readers
    const figcaption = screen.getByText('Weekly attendance trend chart.');
    expect(figcaption).toHaveClass('sr-only');
  });

  it('calculates chart points correctly', () => {
    render(<AttendanceChart data={[{ day: 'Monday', rate: 50 }, { day: 'Tuesday', rate: 100 }]} />);
    const polyline = screen.getByRole('img').querySelector('polyline');
    const points = polyline?.getAttribute('points');
    
    // For two points:
    // First point (x=0, y=60) - 50% should be in the middle
    // Second point (x=500, y=0) - 100% should be at the top
    expect(points).toBe('0,60 500,0');
  });

  it('maintains chart viewBox dimensions', () => {
    render(<AttendanceChart data={sampleData} />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('viewBox', '0 0 500 120');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  });
});