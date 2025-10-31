import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LecturerHeader from '../LecturerHeader';

describe('LecturerHeader', () => {
  it('renders user name and logout button', () => {
    render(<LecturerHeader userName="Dr. Test" />);
    expect(screen.getByText('Dr. Test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});
