import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseList from '../CourseList';

describe('CourseList', () => {
  it('renders courses and handles select', async () => {
    const courses = [
      { id: 'c1', code: 'CS101', title: 'Intro' },
      { id: 'c2', code: 'CS102', title: 'Data' }
    ];
    const onSelect = vi.fn();

    render(<CourseList courses={courses} onSelect={onSelect} />);

    expect(screen.getByText('Intro')).toBeInTheDocument();
    const openButtons = screen.getAllByRole('button', { name: /open/i });
    await userEvent.click(openButtons[0]);
    expect(onSelect).toHaveBeenCalledWith('c1');
  });
});
