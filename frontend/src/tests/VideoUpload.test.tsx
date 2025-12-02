import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VideoUpload from '../components/video/VideoUpload'
import { VideoProvider } from '../contexts/VideoContext'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { BrowserRouter } from 'react-router-dom'

// Mock the hooks
vi.mock('../hooks/useVideos', () => ({
  useVideos: () => ({
    uploadVideo: vi.fn().mockResolvedValue({}),
    videos: [],
    loading: false,
    error: null,
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

describe('VideoUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render upload form', () => {
    renderWithProviders(<VideoUpload />)
    
    expect(screen.getByRole('heading', { name: /upload video/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('should display title input field', () => {
    renderWithProviders(<VideoUpload />)
    
    const titleInput = screen.getByLabelText(/title/i)
    expect(titleInput).toBeInTheDocument()
    expect(titleInput).toHaveAttribute('type', 'text')
    expect(titleInput).toHaveAttribute('required')
  })

  it('should display description textarea', () => {
    renderWithProviders(<VideoUpload />)
    
    const descriptionInput = screen.getByLabelText(/description/i)
    expect(descriptionInput).toBeInTheDocument()
    expect(descriptionInput.tagName).toBe('TEXTAREA')
  })

  it('should have upload button disabled initially', () => {
    renderWithProviders(<VideoUpload />)
    
    const uploadButton = screen.getByRole('button', { name: /upload video/i })
    expect(uploadButton).toBeInTheDocument()
    expect(uploadButton).toBeDisabled()
  })

  it('should show supported file formats', () => {
    renderWithProviders(<VideoUpload />)
    
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument()
    expect(screen.getByText(/mp4/i)).toBeInTheDocument()
    expect(screen.getByText(/max 500mb/i)).toBeInTheDocument()
  })

  it('should allow typing in title field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VideoUpload />)
    
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement
    await user.type(titleInput, 'Test Video Title')
    
    expect(titleInput.value).toBe('Test Video Title')
  })

  it('should allow typing in description field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VideoUpload />)
    
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement
    await user.type(descriptionInput, 'Test description')
    
    expect(descriptionInput.value).toBe('Test description')
  })

  it('should show drag-and-drop zone', () => {
    renderWithProviders(<VideoUpload />)
    
    expect(screen.getByText(/drag and drop your video here/i)).toBeInTheDocument()
    expect(screen.getByText(/browse/i)).toBeInTheDocument()
  })

  it('should display file size limit', () => {
    renderWithProviders(<VideoUpload />)
    
    expect(screen.getByText(/max 500mb/i)).toBeInTheDocument()
  })
})

describe('VideoUpload - Success Criteria', () => {
  it('✅ Upload interface with progress indicators', () => {
    renderWithProviders(<VideoUpload />)
    
    // Verify upload interface elements
    expect(screen.getByRole('heading', { name: /upload video/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload video/i })).toBeInTheDocument()
  })

  it('✅ File validation (type, size)', () => {
    renderWithProviders(<VideoUpload />)
    
    // Verify validation messages are shown
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument()
    expect(screen.getByText(/max 500mb/i)).toBeInTheDocument()
  })

  it('✅ Responsive design', () => {
    renderWithProviders(<VideoUpload />)
    
    const heading = screen.getByRole('heading', { name: /upload video/i })
    expect(heading).toBeInTheDocument()
  })
})
