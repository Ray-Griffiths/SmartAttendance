import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LecturerSidebar from '../LecturerSidebar';

describe('LecturerSidebar', () => {
  const renderWithRouter = (path = '/lecturer/dashboard') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <LecturerSidebar />
      </MemoryRouter>
    );

  it('renders links and highlights active route', () => {
    renderWithRouter('/lecturer/courses');
    expect(screen.getByText('Courses')).toBeInTheDocument();
    const coursesLink = screen.getByText('Courses').closest('a');
    expect(coursesLink).toHaveClass('bg-blue-600');
  });
});
