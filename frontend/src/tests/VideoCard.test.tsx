import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import VideoCard from '../components/video/VideoCard'
import type { Video } from '../services/videoService'

const mockVideo: Video = {
  _id: '123',
  title: 'Test Video',
  description: 'Test Description',
  filename: 'test.mp4',
  storedFilename: 'stored-test.mp4',
  filesize: 1000000,
  mimetype: 'video/mp4',
  duration: 120,
  resolution: {
    width: 1920,
    height: 1080,
  },
  codec: 'h264',
  thumbnailUrl: 'http://example.com/thumbnail.jpg',
  uploadedBy: {
    _id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
  },
  status: 'completed',
  processingProgress: 100,
  sensitivityStatus: 'safe',
  sensitivityScore: 10,
  flaggedReasons: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('VideoCard Component', () => {
  it('should render video title', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByText('Test Video')).toBeInTheDocument()
  })

  it('should render video description', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('should display file size', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByText(/size:/i)).toBeInTheDocument()
    expect(screen.getByText(/kb/i)).toBeInTheDocument()
  })

  it('should display duration', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByText(/duration:/i)).toBeInTheDocument()
    expect(screen.getByText(/2:00/)).toBeInTheDocument()
  })

  it('should display upload date', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByText(/uploaded:/i)).toBeInTheDocument()
  })

  it('should show completed status badge', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
  })

  it('should show safe sensitivity badge', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByText(/✓ safe/i)).toBeInTheDocument()
  })

  it('should display View button', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
  })

  it('should display Delete button when onDelete provided', () => {
    const onDelete = vi.fn()
    renderWithRouter(<VideoCard video={mockVideo} onDelete={onDelete} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('should not display Delete button when onDelete not provided', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})

describe('VideoCard - Processing Status', () => {
  it('should show processing status badge', () => {
    const processingVideo = { ...mockVideo, status: 'processing' as const, processingProgress: 50 }
    renderWithRouter(<VideoCard video={processingVideo} />)
    
    // Use getAllByText since "Processing" appears in both badge and status text
    const processingElements = screen.getAllByText(/processing/i)
    expect(processingElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('should show progress bar for processing video', () => {
    const processingVideo = { ...mockVideo, status: 'processing' as const, processingProgress: 75 }
    renderWithRouter(<VideoCard video={processingVideo} />)
    
    // Use getAllByText since "Processing" appears in both badge and status text
    const processingElements = screen.getAllByText(/processing/i)
    expect(processingElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/75%/)).toBeInTheDocument()
  })

  it('should show pending status', () => {
    const pendingVideo = { ...mockVideo, status: 'pending' as const }
    renderWithRouter(<VideoCard video={pendingVideo} />)
    
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('should show failed status', () => {
    const failedVideo = { ...mockVideo, status: 'failed' as const }
    renderWithRouter(<VideoCard video={failedVideo} />)
    
    expect(screen.getByText(/failed/i)).toBeInTheDocument()
  })
})

describe('VideoCard - Sensitivity Status', () => {
  it('should show flagged status', () => {
    const flaggedVideo = {
      ...mockVideo,
      sensitivityStatus: 'flagged' as const,
      flaggedReasons: ['Test reason 1', 'Test reason 2'],
    }
    renderWithRouter(<VideoCard video={flaggedVideo} />)
    
    expect(screen.getByText(/⚠ flagged/i)).toBeInTheDocument()
  })

  it('should display flagged reasons', () => {
    const flaggedVideo = {
      ...mockVideo,
      sensitivityStatus: 'flagged' as const,
      flaggedReasons: ['Test reason 1', 'Test reason 2'],
    }
    renderWithRouter(<VideoCard video={flaggedVideo} />)
    
    expect(screen.getByText(/flagged content/i)).toBeInTheDocument()
    expect(screen.getByText('Test reason 1')).toBeInTheDocument()
    expect(screen.getByText('Test reason 2')).toBeInTheDocument()
  })

  it('should show pending sensitivity status', () => {
    const pendingVideo = { ...mockVideo, sensitivityStatus: 'pending' as const }
    renderWithRouter(<VideoCard video={pendingVideo} />)
    
    expect(screen.getByText(/⏳ pending/i)).toBeInTheDocument()
  })
})

describe('VideoCard - Success Criteria', () => {
  it('✅ Display video metadata', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    
    expect(screen.getByText('Test Video')).toBeInTheDocument()
    expect(screen.getByText(/size:/i)).toBeInTheDocument()
    expect(screen.getByText(/duration:/i)).toBeInTheDocument()
    expect(screen.getByText(/uploaded:/i)).toBeInTheDocument()
  })

  it('✅ Show processing status indicators', () => {
    const processingVideo = { ...mockVideo, status: 'processing' as const, processingProgress: 50 }
    renderWithRouter(<VideoCard video={processingVideo} />)
    
    // Use getAllByText since "Processing" appears in both badge and status text
    const processingElements = screen.getAllByText(/processing/i)
    expect(processingElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('✅ Display sensitivity status badges', () => {
    renderWithRouter(<VideoCard video={mockVideo} />)
    
    expect(screen.getByText(/✓ safe/i)).toBeInTheDocument()
  })
})
