import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentList from '../StudentList';

describe('StudentList', () => {
  it('renders students and handles view click', async () => {
    const students = [
      { id: 's1', name: 'Alice', regNo: 'R1' },
      { id: 's2', name: 'Bob', regNo: 'R2' }
    ];
    const onSelect = vi.fn();
    render(<StudentList students={students} onSelect={onSelect} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    await userEvent.click(viewButtons[1]);
    expect(onSelect).toHaveBeenCalledWith('s2');
  });
});
