import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AttendanceList from '../AttendanceList';
import * as api from '../../../services/lecturerApi';

describe('AttendanceList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading and then renders records (happy path)', async () => {
    const mock = [
      { id: 'r1', sessionId: 's1', studentId: 'st1', studentName: 'Alice', studentRegNo: 'R1', timestamp: new Date().toISOString() }
    ];
    vi.spyOn(api, 'getAttendanceBySession').mockResolvedValue(mock as any);

    render(<AttendanceList sessionId="s1" />);
    expect(screen.getByText(/Loading attendance/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText(/Attendance \(1\)/)).toBeInTheDocument();
  });

  it('renders empty state when no records', async () => {
    vi.spyOn(api, 'getAttendanceBySession').mockResolvedValue([] as any);
    render(<AttendanceList sessionId="s1" />);
    await waitFor(() => expect(screen.getByText(/No attendance recorded for this session/i)).toBeInTheDocument());
  });

  it('renders error state when API fails', async () => {
    vi.spyOn(api, 'getAttendanceBySession').mockRejectedValue(new Error('Server error'));
    render(<AttendanceList sessionId="s1" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
  });

});
