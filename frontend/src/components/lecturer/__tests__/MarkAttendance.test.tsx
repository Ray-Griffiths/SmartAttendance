import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkAttendance from '../MarkAttendance';

describe('MarkAttendance', () => {
  it('submits student id and calls onMarked', async () => {
    const onMarked = vi.fn();
    render(<MarkAttendance sessionId="s1" onMarked={onMarked} />);

    const input = screen.getByRole('textbox', { name: /student id/i }) || screen.getByRole('textbox');
    await userEvent.type(input, 'student-123');
    await userEvent.click(screen.getByRole('button', { name: /mark present/i }));

    expect(onMarked).toHaveBeenCalledWith('student-123');
  });
});
