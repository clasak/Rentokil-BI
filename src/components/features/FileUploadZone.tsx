'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number // in MB
  disabled?: boolean
  isLoading?: boolean
  error?: string | null
  success?: boolean
  successMessage?: string
  className?: string
}

export function FileUploadZone({
  onFileSelect,
  accept = '.pdf',
  maxSize = 10,
  disabled = false,
  isLoading = false,
  error = null,
  success = false,
  successMessage = 'File uploaded successfully',
  className
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase())
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const mimeType = file.type.toLowerCase()

    const isValidType = acceptedTypes.some(accepted => {
      if (accepted.startsWith('.')) {
        return fileExtension === accepted
      }
      return mimeType === accepted || mimeType.startsWith(accepted.replace('*', ''))
    })

    if (!isValidType) {
      return `Invalid file type. Please upload a ${accept} file.`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      return `File size exceeds ${maxSize}MB limit.`
    }

    return null
  }, [accept, maxSize])

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setLocalError(validationError)
      setSelectedFile(null)
      return
    }

    setLocalError(null)
    setSelectedFile(file)
    onFileSelect(file)
  }, [validateFile, onFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isLoading) {
      setIsDragging(true)
    }
  }, [disabled, isLoading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || isLoading) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [disabled, isLoading, handleFile])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleFile])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setLocalError(null)
  }, [])

  const displayError = error || localError

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          isDragging && !disabled && 'border-primary bg-primary/5',
          !isDragging && !displayError && !success && 'border-gray-300 hover:border-gray-400',
          displayError && 'border-red-300 bg-red-50',
          success && 'border-green-300 bg-green-50',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled || isLoading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          {isLoading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div>
                <p className="text-sm font-medium text-gray-700">Processing PDF...</p>
                <p className="text-xs text-gray-500">Extracting quote data</p>
              </div>
            </>
          ) : success ? (
            <>
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-700">{successMessage}</p>
                {selectedFile && (
                  <p className="text-xs text-green-600">{selectedFile.name}</p>
                )}
              </div>
            </>
          ) : displayError ? (
            <>
              <AlertCircle className="h-10 w-10 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">Upload failed</p>
                <p className="text-xs text-red-600">{displayError}</p>
              </div>
            </>
          ) : selectedFile ? (
            <>
              <FileText className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drop your Salesforce quote PDF here
                </p>
                <p className="text-xs text-gray-500">
                  or click to browse (max {maxSize}MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File actions */}
      {selectedFile && !isLoading && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-500 truncate max-w-[200px]">
            {selectedFile.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="h-6 px-2 text-xs text-gray-500 hover:text-red-500"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
