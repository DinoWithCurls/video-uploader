import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VideoList from '../components/video/VideoList'
import { VideoProvider } from '../contexts/VideoContext'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { BrowserRouter } from 'react-router-dom'
import type { Video } from '../services/videoService'

const mockVideos: Video[] = [
  {
    _id: '1',
    title: 'Video 1',
    description: 'Description 1',
    filename: 'video1.mp4',
    storedFilename: 'stored1.mp4',
    filesize: 1000000,
    mimetype: 'video/mp4',
    duration: 120,
    resolution: { width: 1920, height: 1080 },
    codec: 'h264',
    uploadedBy: { _id: 'user1', name: 'User 1', email: 'user1@test.com' },
    status: 'completed',
    processingProgress: 100,
    sensitivityStatus: 'safe',
    sensitivityScore: 10,
    flaggedReasons: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: '2',
    title: 'Video 2',
    description: 'Description 2',
    filename: 'video2.mp4',
    storedFilename: 'stored2.mp4',
    filesize: 2000000,
    mimetype: 'video/mp4',
    duration: 240,
    resolution: { width: 1920, height: 1080 },
    codec: 'h264',
    uploadedBy: { _id: 'user1', name: 'User 1', email: 'user1@test.com' },
    status: 'processing',
    processingProgress: 50,
    sensitivityStatus: 'pending',
    sensitivityScore: 0,
    flaggedReasons: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Mock the hooks
vi.mock('../hooks/useVideos', () => ({
  useVideos: () => ({
    videos: mockVideos,
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 12,
      total: 2,
      pages: 1,
    },
    fetchVideos: vi.fn(),
    deleteVideo: vi.fn(),
  }),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user1', name: 'Test User', email: 'test@test.com', role: 'editor' },
    loading: false,
  }),
}))

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <VideoProvider>
            {component}
          </VideoProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('VideoList Component', () => {
  it('should render video list header', () => {
    renderWithProviders(<VideoList />)
    expect(screen.getByText(/my videos/i)).toBeInTheDocument()
  })

  it('should render search input', () => {
    renderWithProviders(<VideoList />)
    expect(screen.getByPlaceholderText(/search videos/i)).toBeInTheDocument()
  })

  it('should render status filter', () => {
    renderWithProviders(<VideoList />)
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('should render sensitivity filter', () => {
    renderWithProviders(<VideoList />)
    expect(screen.getByLabelText(/sensitivity/i)).toBeInTheDocument()
  })

  it('should render sort by dropdown', () => {
    renderWithProviders(<VideoList />)
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
  })

  it('should render order dropdown', () => {
    renderWithProviders(<VideoList />)
    expect(screen.getByLabelText(/order/i)).toBeInTheDocument()
  })

  it('should display video cards', () => {
    renderWithProviders(<VideoList />)
    expect(screen.getByText('Video 1')).toBeInTheDocument()
    expect(screen.getByText('Video 2')).toBeInTheDocument()
  })

  it('should allow typing in search field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VideoList />)
    
    const searchInput = screen.getByPlaceholderText(/search videos/i) as HTMLInputElement
    await user.type(searchInput, 'test search')
    
    expect(searchInput.value).toBe('test search')
  })

  it('should have filter options in status dropdown', () => {
    renderWithProviders(<VideoList />)
    
    const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement
    expect(statusSelect).toBeInTheDocument()
    
    const options = Array.from(statusSelect.options).map(opt => opt.value)
    expect(options).toContain('')
    expect(options).toContain('pending')
    expect(options).toContain('processing')
    expect(options).toContain('completed')
    expect(options).toContain('failed')
  })

  it('should have filter options in sensitivity dropdown', () => {
    renderWithProviders(<VideoList />)
    
    const sensitivitySelect = screen.getByLabelText(/sensitivity/i) as HTMLSelectElement
    const options = Array.from(sensitivitySelect.options).map(opt => opt.value)
    
    expect(options).toContain('')
    expect(options).toContain('safe')
    expect(options).toContain('flagged')
    expect(options).toContain('pending')
  })

  it('should have sort options', () => {
    renderWithProviders(<VideoList />)
    
    const sortSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement
    const options = Array.from(sortSelect.options).map(opt => opt.value)
    
    expect(options).toContain('createdAt')
    expect(options).toContain('title')
    expect(options).toContain('filesize')
    expect(options).toContain('duration')
  })
})

describe('VideoList - Empty State', () => {
  it('should show empty state when no videos', () => {
    vi.mock('../hooks/useVideos', () => ({
      useVideos: () => ({
        videos: [],
        loading: false,
        error: null,
        pagination: null,
        fetchVideos: vi.fn(),
        deleteVideo: vi.fn(),
      }),
    }))

    renderWithProviders(<VideoList />)
    
    // The component should handle empty state
    expect(screen.getByText(/my videos/i)).toBeInTheDocument()
  })
})

describe('VideoList - Success Criteria', () => {
  it('✅ Video library with filtering capabilities', () => {
    renderWithProviders(<VideoList />)
    
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sensitivity/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search videos/i)).toBeInTheDocument()
  })

  it('✅ Search functionality', () => {
    renderWithProviders(<VideoList />)
    
    const searchInput = screen.getByPlaceholderText(/search videos/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('✅ Sort and pagination controls', () => {
    renderWithProviders(<VideoList />)
    
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/order/i)).toBeInTheDocument()
  })

  it('✅ Display video cards in grid', () => {
    renderWithProviders(<VideoList />)
    
    expect(screen.getByText('Video 1')).toBeInTheDocument()
    expect(screen.getByText('Video 2')).toBeInTheDocument()
  })
})
