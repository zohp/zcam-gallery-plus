import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PreviewModal } from '../preview/PreviewModal'
import type { GalleryItem } from '@/shared/types'

// Mock the TransferContext
const mockTransferContext = {
  downloadFile: vi.fn(),
  pauseDownload: vi.fn(),
  resumeDownload: vi.fn(),
  cancelDownload: vi.fn(),
  getTransferProgress: vi.fn(),
  getActiveTransfers: vi.fn(() => []),
  getCompletedTransfers: vi.fn(() => []),
  getQueuedTransfers: vi.fn(() => []),
  onProgress: vi.fn(),
}

vi.mock('../../stores/TransferContext', () => ({
  useTransfer: () => mockTransferContext,
}))

describe('PreviewModal', () => {
  const mockVideoItem: GalleryItem = {
    id: '1',
    name: 'Z_CAM_001.MOV',
    path: '/DCIM/Z_CAM_001.MOV',
    size: 2.1 * 1024 * 1024 * 1024, // 2.1GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T14:25:00Z',
  }

  const mockImageItem: GalleryItem = {
    id: '2',
    name: 'Z_CAM_001.jpg',
    path: '/DCIM/Z_CAM_001.jpg',
    size: 5.2 * 1024 * 1024, // 5.2MB
    isFolder: false,
    isIngested: false,
    type: 'image',
    modifiedTime: '2024-01-15T14:25:00Z',
  }

  const mockFileItem: GalleryItem = {
    id: '3',
    name: 'readme.txt',
    path: '/DCIM/readme.txt',
    size: 1024, // 1KB
    isFolder: false,
    isIngested: false,
    type: 'folder',
    modifiedTime: '2024-01-15T14:25:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock document.body.style
    Object.defineProperty(document.body, 'style', {
      value: {},
      writable: true,
    })
  })

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = 'unset'
  })

  describe('modal visibility', () => {
    it('should not render when closed', () => {
      render(<PreviewModal item={null} isOpen={false} onClose={vi.fn()} />)
      
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('should not render when item is null', () => {
      render(<PreviewModal item={null} isOpen={true} onClose={vi.fn()} />)
      
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('should render when open with item', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      expect(screen.getByRole('dialog')).toBeDefined()
      // The modal should have proper ARIA attributes
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })
  })

  describe('modal header', () => {
    it('should display item name in header', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      expect(screen.getByText('Z_CAM_001.MOV')).toBeDefined()
    })

    it('should have download button', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const downloadButton = screen.getByTitle('Download file')
      expect(downloadButton).toBeDefined()
      expect(downloadButton).toHaveTextContent('📥')
    })

    it('should have close button', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const closeButton = screen.getByTitle('Close preview')
      expect(closeButton).toBeDefined()
      expect(closeButton).toHaveTextContent('✕')
    })
  })

  describe('video preview', () => {
    it('should render video element for video files', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const video = screen.getByRole('dialog').querySelector('video')
      expect(video).toBeDefined()
      expect(video).toHaveAttribute('controls')
      expect(video).toHaveAttribute('autoplay')
      expect(video).toHaveAttribute('muted')
      expect(video).toHaveAttribute('playsinline')
    })

    it('should set correct video source', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const video = screen.getByRole('dialog').querySelector('video')
      const source = video?.querySelector('source')
      expect(source).toHaveAttribute('src', 'http://10.98.32.1/DCIM/Z_CAM_001.MOV')
      expect(source).toHaveAttribute('type', 'video/mp4')
    })
  })

  describe('image preview', () => {
    it('should render image element for image files', () => {
      render(<PreviewModal item={mockImageItem} isOpen={true} onClose={vi.fn()} />)
      
      const image = screen.getByRole('dialog').querySelector('img')
      expect(image).toBeDefined()
      expect(image).toHaveAttribute('src', 'http://10.98.32.1/DCIM/Z_CAM_001.jpg')
      expect(image).toHaveAttribute('alt', 'Z_CAM_001.jpg')
    })

    it('should handle image load errors', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockTransferContext.downloadFile.mockResolvedValue(undefined)
      
      render(<PreviewModal item={mockImageItem} isOpen={true} onClose={vi.fn()} />)
      
      const image = screen.getByRole('dialog').querySelector('img')
      fireEvent.error(image!)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Direct preview failed, downloading...')
        expect(mockTransferContext.downloadFile).toHaveBeenCalledWith(
          mockImageItem,
          '/tmp/downloads/Z_CAM_001.jpg'
        )
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('file info display', () => {
    it('should show file info for non-media files', () => {
      render(<PreviewModal item={mockFileItem} isOpen={true} onClose={vi.fn()} />)
      
      expect(screen.getAllByText('readme.txt')).toHaveLength(2) // Header and body
      expect(screen.getByText('File type: folder')).toBeDefined()
      expect(screen.getByText('Size: 1.0 KB')).toBeDefined()
      expect(screen.getByText('📁')).toBeDefined()
      expect(screen.getByText('Download File')).toBeDefined()
    })

    it('should show folder icon for folder type', () => {
      render(<PreviewModal item={mockFileItem} isOpen={true} onClose={vi.fn()} />)
      
      expect(screen.getByText('📁')).toBeDefined()
    })
  })

  describe('download functionality', () => {
    it('should call download when download button is clicked', async () => {
      mockTransferContext.downloadFile.mockResolvedValue(undefined)
      
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const downloadButton = screen.getByTitle('Download file')
      fireEvent.click(downloadButton)
      
      await waitFor(() => {
        expect(mockTransferContext.downloadFile).toHaveBeenCalledWith(
          mockVideoItem,
          '/tmp/downloads/Z_CAM_001.MOV'
        )
      })
    })

    it('should handle download errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockTransferContext.downloadFile.mockRejectedValue(new Error('Download failed'))
      
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const downloadButton = screen.getByTitle('Download file')
      fireEvent.click(downloadButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Download failed:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('modal interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={onClose} />)
      
      const closeButton = screen.getByTitle('Close preview')
      fireEvent.click(closeButton)
      
      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={onClose} />)
      
      const modal = screen.getByRole('dialog')
      fireEvent.click(modal)
      
      expect(onClose).toHaveBeenCalled()
    })

    it('should not call onClose when modal content is clicked', () => {
      const onClose = vi.fn()
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={onClose} />)
      
      const modalContent = screen.getByRole('dialog').querySelector('[class*="modalContent"]')
      fireEvent.click(modalContent!)
      
      expect(onClose).not.toHaveBeenCalled()
    })

    it('should call onClose when escape key is pressed', () => {
      const onClose = vi.fn()
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={onClose} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'preview-title')
    })

    it('should have proper title element', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const title = screen.getByText('Z_CAM_001.MOV')
      expect(title).toHaveAttribute('id', 'preview-title')
    })

    it('should prevent body scrolling when open', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scrolling when closed', () => {
      const { rerender } = render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      expect(document.body.style.overflow).toBe('hidden')
      
      rerender(<PreviewModal item={mockVideoItem} isOpen={false} onClose={vi.fn()} />)
      
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('keyboard navigation', () => {
    it('should be focusable', () => {
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={vi.fn()} />)
      
      const closeButton = screen.getByTitle('Close preview')
      expect(closeButton).toBeDefined()
      
      // Test focus
      closeButton.focus()
      expect(document.activeElement).toBe(closeButton)
    })

    it('should handle keyboard events', () => {
      const onClose = vi.fn()
      render(<PreviewModal item={mockVideoItem} isOpen={true} onClose={onClose} />)
      
      // Test escape key
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
      
      // Test other keys (should not close)
      onClose.mockClear()
      fireEvent.keyDown(document, { key: 'Enter' })
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
