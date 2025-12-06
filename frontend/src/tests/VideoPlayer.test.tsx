import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VideoPlayer from '../components/video/VideoPlayer'
import type { Video } from '../services/videoService'

// Mock getStreamUrl
vi.mock('../services/videoService', () => ({
  getStreamUrl: (id: string) => `http://localhost:3001/api/videos/${id}/stream`,
}))

const mockCompletedVideo: Video = {
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

const mockProcessingVideo: Video = {
  ...mockCompletedVideo,
  status: 'processing',
  processingProgress: 50,
}

describe('VideoPlayer Component', () => {
  it('should render video player for completed video', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    const videoElement = screen.getByRole('button', { name: /play/i })
    expect(videoElement).toBeInTheDocument()
  })

  it('should show processing message for processing video', () => {
    render(<VideoPlayer video={mockProcessingVideo} />)
    
    expect(screen.getByText(/video is processing/i)).toBeInTheDocument()
    expect(screen.getByText(/50% complete/i)).toBeInTheDocument()
  })

  it('should display play button', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
  })

  it('should display fullscreen button', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument()
  })

  it('should display video metadata', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    expect(screen.getByText(/resolution:/i)).toBeInTheDocument()
    expect(screen.getByText(/1920 x 1080/i)).toBeInTheDocument()
  })

  it('should display codec information', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    expect(screen.getByText(/codec:/i)).toBeInTheDocument()
    expect(screen.getByText(/h264/i)).toBeInTheDocument()
  })

  it('should display format information', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    expect(screen.getByText(/format:/i)).toBeInTheDocument()
    expect(screen.getByText(/video\/mp4/i)).toBeInTheDocument()
  })

  it('should show progress bar for processing video', () => {
    render(<VideoPlayer video={mockProcessingVideo} />)
    
    const progressText = screen.getByText(/50% complete/i)
    expect(progressText).toBeInTheDocument()
  })
})

describe('VideoPlayer - Processing States', () => {
  it('should show pending message', () => {
    const pendingVideo = { ...mockCompletedVideo, status: 'pending' as const }
    render(<VideoPlayer video={pendingVideo} />)
    
    expect(screen.getByText(/video is pending/i)).toBeInTheDocument()
  })

  it('should show failed message', () => {
    const failedVideo = { ...mockCompletedVideo, status: 'failed' as const }
    render(<VideoPlayer video={failedVideo} />)
    
    expect(screen.getByText(/video is failed/i)).toBeInTheDocument()
  })

  it('should show processing progress', () => {
    const video75 = { ...mockCompletedVideo, status: 'processing' as const, processingProgress: 75 }
    render(<VideoPlayer video={video75} />)
    
    expect(screen.getByText(/75% complete/i)).toBeInTheDocument()
  })
})

describe('VideoPlayer - Success Criteria', () => {
  it('✅ Video player with custom controls', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument()
  })

  it('✅ Display video metadata', () => {
    render(<VideoPlayer video={mockCompletedVideo} />)
    
    expect(screen.getByText(/resolution:/i)).toBeInTheDocument()
    expect(screen.getByText(/codec:/i)).toBeInTheDocument()
    expect(screen.getByText(/format:/i)).toBeInTheDocument()
  })

  it('✅ Show processing status', () => {
    render(<VideoPlayer video={mockProcessingVideo} />)
    
    expect(screen.getByText(/processing/i)).toBeInTheDocument()
    expect(screen.getByText(/50% complete/i)).toBeInTheDocument()
  })
})
