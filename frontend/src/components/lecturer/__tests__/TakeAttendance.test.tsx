import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import TakeAttendance from '../TakeAttendance';
import * as api from '../../../services/lecturerApi';

describe('TakeAttendance', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('marks attendance manually and calls onMarked', async () => {
    const mockRec = { id: 'r1', sessionId: 's1', studentId: 'st1', timestamp: new Date().toISOString() };
    vi.spyOn(api, 'postAttendance').mockResolvedValue(mockRec as any);
    const onMarked = vi.fn();
    render(<TakeAttendance sessionId="s1" onMarked={onMarked} />);

    await act(async () => {
      await userEvent.type(screen.getByRole('textbox', { name: /student id/i }), 'st1');
      await userEvent.click(screen.getByRole('button', { name: /mark present/i }));
    });

    await waitFor(() => expect(onMarked).toHaveBeenCalledWith('r1'));
    expect(screen.getByText(/Marked present/i)).toBeInTheDocument();
  });

  it('shows error when API fails', async () => {
    vi.spyOn(api, 'postAttendance').mockRejectedValue(new Error('fail'));
    render(<TakeAttendance sessionId="s1" />);
    await act(async () => {
      await userEvent.type(screen.getByRole('textbox', { name: /student id/i }), 'st1');
      await userEvent.click(screen.getByRole('button', { name: /mark present/i }));
    });
    await waitFor(() => expect(screen.getByText(/Failed to mark attendance|fail/i)).toBeInTheDocument());
  });

});
