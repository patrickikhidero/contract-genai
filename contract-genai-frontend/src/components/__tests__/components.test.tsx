import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContractForm from '../ContractForm'
import ContractDisplay from '../ContractDisplay'
import TypingAnimation from '../TypingAnimation'

// Mock the API function
jest.mock('../../utils/api', () => ({
  streamContract: jest.fn(),
  extractPlainText: jest.fn((text) => text.replace(/<[^>]*>/g, '')),
  getHtmlContent: jest.fn((text) => text),
  getPlainTextContent: jest.fn((text) => text.replace(/<[^>]*>/g, '')),
  isStreamComplete: jest.fn((text) => text.includes('complete')),
}))

const mockStreamContract = require('../../utils/api').streamContract

describe('Frontend Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. API Integration Test', () => {
    it('calls streamContract API with correct parameters', async () => {
      const user = userEvent.setup()
      mockStreamContract.mockResolvedValue(undefined)
      
      const mockCallbacks = {
        onStreamingData: jest.fn(),
        onStreamingComplete: jest.fn(),
        onError: jest.fn(),
      }
      
      render(<ContractForm {...mockCallbacks} />)
      
      const textarea = screen.getByLabelText('Business Description')
      const submitButton = screen.getByRole('button', { name: 'Generate Contract' })
      
      await user.type(textarea, 'Test business description')
      await user.click(submitButton)
      
      expect(mockStreamContract).toHaveBeenCalledWith(
        'Test business description',
        expect.any(Function), // onStreamingData callback
        expect.any(Function), // onError callback
        expect.any(Function)  // onStreamingComplete callback
      )
    })
  })

  describe('2. Form Submission Test', () => {
    it('handles form submission and validation correctly', async () => {
      const user = userEvent.setup()
      const mockCallbacks = {
        onStreamingData: jest.fn(),
        onStreamingComplete: jest.fn(),
        onError: jest.fn(),
      }
      
      render(<ContractForm {...mockCallbacks} />)
      
      const textarea = screen.getByLabelText('Business Description')
      const submitButton = screen.getByRole('button', { name: 'Generate Contract' })
      
      // Test that button is disabled when no prompt
      expect(submitButton).toBeDisabled()
      
      // Test valid submission
      await user.type(textarea, 'Valid business description')
      expect(submitButton).not.toBeDisabled()
      
      mockStreamContract.mockResolvedValue(undefined)
      await user.click(submitButton)
      
      // Wait for the form to be in loading state
      await waitFor(() => {
        expect(textarea).toBeDisabled()
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('3. Contract Display Test', () => {
    it('renders contract content with proper formatting options', () => {
      const sampleContract = '<h1>Terms of Service</h1><p>This is a test contract.</p>'
      
      render(<ContractDisplay contract={sampleContract} />)
      
      expect(screen.getByText('Generated Contract')).toBeInTheDocument()
      expect(screen.getByText('View HTML')).toBeInTheDocument()
      expect(screen.getByText('View Raw')).toBeInTheDocument()
      expect(screen.getByText('Copy HTML')).toBeInTheDocument()
      expect(screen.getByText('Download HTML')).toBeInTheDocument()
    })

    it('shows empty state when no contract is provided', () => {
      render(<ContractDisplay contract="" />)
      
      expect(screen.getByText('No contract generated yet. Enter a business description above to get started.')).toBeInTheDocument()
    })
  })

  describe('4. Typing Animation Test', () => {
    it('renders typing animation with proper structure', () => {
      render(<TypingAnimation text="Hello World" speed={100} />)
      
      // Use a more specific selector to avoid multiple elements
      const container = document.querySelector('.contract-content')
      expect(container).toBeInTheDocument()
      
      const cursor = container?.querySelector('span')
      expect(cursor).toHaveClass('animate-pulse')
    })
  })

  describe('5. Error Handling Test', () => {
    it('handles API errors gracefully', async () => {
      const user = userEvent.setup()
      const errorMessage = 'API connection failed'
      mockStreamContract.mockRejectedValue(new Error(errorMessage))
      
      const mockCallbacks = {
        onStreamingData: jest.fn(),
        onStreamingComplete: jest.fn(),
        onError: jest.fn(),
      }
      
      render(<ContractForm {...mockCallbacks} />)
      
      const textarea = screen.getByLabelText('Business Description')
      const submitButton = screen.getByRole('button', { name: 'Generate Contract' })
      
      await user.type(textarea, 'Test business')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockCallbacks.onError).toHaveBeenCalledWith(errorMessage)
      })
    })
  })
})
