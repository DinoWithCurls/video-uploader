import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('ProtectedRoute Component', () => {
  it('should show loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'editor' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should allow access when user has required role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute roles={['admin']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('should show access denied when user lacks required role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'viewer' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute roles={['admin', 'editor']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText(/access denied/i)).toBeInTheDocument()
    expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument()
  })

  it('should allow access when user has one of multiple required roles', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'editor' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute roles={['admin', 'editor']}>
        <div>Editor/Admin Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Editor/Admin Content')).toBeInTheDocument()
  })
})

describe('ProtectedRoute - Success Criteria', () => {
  it('✅ Role-based route protection', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'viewer' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute roles={['admin']}>
        <div>Admin Only</div>
      </ProtectedRoute>
    )

    expect(screen.getByText(/access denied/i)).toBeInTheDocument()
  })

  it('✅ Proper error messages', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'viewer' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute roles={['editor', 'admin']}>
        <div>Protected</div>
      </ProtectedRoute>
    )

    expect(screen.getByText(/access denied/i)).toBeInTheDocument()
    expect(screen.getByText(/required role:/i)).toBeInTheDocument()
    expect(screen.getByText(/your role: viewer/i)).toBeInTheDocument()
  })
})
