import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Download, ArrowSquareOut } from '@phosphor-icons/react'
import { apiRequest } from '@/lib/api'

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentName: string
  documentType: string
}

export default function DocumentViewer({ 
  isOpen, 
  onClose, 
  documentId, 
  documentName, 
  documentType 
}: DocumentViewerProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load the document when modal opens
  const loadDocument = async () => {
    if (!isOpen || !documentId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/receipts/view/${documentId}`)
      setViewUrl(response.document.viewUrl)
    } catch (error) {
      console.error('Failed to load document:', error)
      setError('Failed to load document. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Download the document
  const downloadDocument = async () => {
    try {
      const response = await apiRequest(`/receipts/download/${documentId}`)
      
      // Create a temporary link to trigger download
      const link = document.createElement('a')
      link.href = response.document.downloadUrl
      link.download = response.document.originalName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  // Open in new tab
  const openInNewTab = () => {
    if (viewUrl) {
      window.open(viewUrl, '_blank')
    }
  }

  // Load document when modal opens
  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument()
    } else {
      setViewUrl(null)
      setError(null)
    }
  }, [isOpen, documentId])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-slate-50 dark:bg-slate-900">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {documentName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {viewUrl && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openInNewTab}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <ArrowSquareOut size={16} className="mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadDocument}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Download size={16} className="mr-2" />
                    Download
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 pt-4">
          {isLoading && (
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <Button onClick={loadDocument} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {viewUrl && !isLoading && !error && (
            <div className="w-full h-[70vh] bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {documentType === 'application/pdf' ? (
                <iframe
                  src={viewUrl}
                  className="w-full h-full"
                  title={documentName}
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Preview not available for this file type
                    </p>
                    <Button onClick={downloadDocument} className="mb-2">
                      <Download size={16} className="mr-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
