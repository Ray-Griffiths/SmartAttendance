import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSidebar from '../AdminSidebar';
import userEvent from '@testing-library/user-event';

describe('AdminSidebar', () => {
  const renderWithRouter = (initialEntry = '/admin/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AdminSidebar />
      </MemoryRouter>
    );
  };

  it('renders application name', () => {
    renderWithRouter();
    expect(screen.getByText('SmartAttendance')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    renderWithRouter();
    const expectedLinks = [
      'Dashboard',
      'Users',
      'Courses',
      'Attendance',
      'System Logs',
      'Settings'
    ];
    
    expectedLinks.forEach(linkText => {
      expect(screen.getByText(linkText)).toBeInTheDocument();
    });
  });

  it('applies active styles to current route', () => {
    renderWithRouter('/admin/users');
    const usersLink = screen.getByText('Users').closest('a');
    expect(usersLink).toHaveClass('bg-blue-600');
  });

  it('renders icons for all navigation links', () => {
    renderWithRouter();
    // Each link should have an SVG icon
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('does not apply active styles to non-active routes', () => {
    renderWithRouter('/admin/dashboard');
    const usersLink = screen.getByText('Users').closest('a');
    expect(usersLink).not.toHaveClass('bg-blue-600');
    expect(usersLink).toHaveClass('hover:bg-gray-800');
  });

  it('has correct href attributes for all links', () => {
    renderWithRouter();
    const links = screen.getAllByRole('link');
    const expectedPaths = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/courses',
      '/admin/attendance',
      '/admin/logs',
      '/admin/settings'
    ];

    links.forEach((link, index) => {
      expect(link).toHaveAttribute('href', expectedPaths[index]);
    });
  });
});