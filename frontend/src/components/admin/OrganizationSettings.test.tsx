import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import OrganizationSettings from './OrganizationSettings';

// Mock the organization service
vi.mock('../../services/organizationService', () => ({
  default: {
    getOrganization: vi.fn(),
    updateOrganization: vi.fn(),
  },
}));

// Mock the logger
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));


// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      organizationId: '123',
    },
    token: 'fake-token',
    loading: false,
    error: null,
  })),
}));

describe('OrganizationSettings Component', () => {
  const mockOrganization = {
    id: '123',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'free',
    limits: {
      maxUsers: 5,
      maxStorage: 10737418240,
      maxVideos: 50,
    },
    settings: {},
    memberCount: 3,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const organizationService = await import('../../services/organizationService');
    (organizationService.default.getOrganization as any).mockResolvedValue({
      organization: mockOrganization,
    });
  });

  it('should render organization name', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <OrganizationSettings />
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });
  });


  it('should display organization slug', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <OrganizationSettings />
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-org')).toBeInTheDocument();
    });
  });
});
