"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Mail, ExternalLink } from "lucide-react"

interface UnsubscribeResultsDialogProps {
  results: {
    processed: number
    successful: number
    results: Array<{
      emailId: string
      subject: string
      sender: string
      success: boolean
      summary: string
      details: Array<{
        link: {
          url: string
          text: string
          method: string
          confidence: number
          language: string
        }
        result: {
          success: boolean
          method: string
          error?: string
          details?: string
          language?: string
        }
      }>
    }>
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnsubscribeResultsDialog({ results, open, onOpenChange }: UnsubscribeResultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Unsubscribe Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{results.processed} Processed</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-100 text-green-800">
                {results.successful} Successful
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{results.processed - results.successful} Failed</Badge>
            </div>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {results.results.map((result) => (
                <div key={result.emailId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{result.sender}</span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">{result.subject}</h4>
                      <p className="text-xs text-gray-600">{result.summary}</p>
                    </div>
                  </div>

                  {result.details && result.details.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-xs font-medium text-gray-700">Unsubscribe Links Found:</h5>
                      {result.details.map((detail, index) => (
                        <div key={index} className="bg-gray-50 rounded p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {detail.link.method}
                              </Badge>
                              {detail.link.language && (
                                <Badge variant="secondary" className="text-xs">
                                  {detail.link.language}
                                </Badge>
                              )}
                              <span className="text-gray-600">
                                Confidence: {Math.round(detail.link.confidence * 100)}%
                              </span>
                            </div>
                            {detail.result.success ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-700 font-mono break-all">{detail.link.url}</span>
                          </div>
                          <div className="text-gray-600">
                            <strong>Text:</strong> {detail.link.text}
                          </div>
                          {detail.result.details && (
                            <div className="text-gray-600 mt-1">
                              <strong>Result:</strong> {detail.result.details}
                            </div>
                          )}
                          {detail.result.error && (
                            <div className="text-red-600 mt-1">
                              <strong>Error:</strong> {detail.result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
