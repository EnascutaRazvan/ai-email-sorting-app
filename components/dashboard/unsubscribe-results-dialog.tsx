"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Mail, ExternalLink, Globe, Zap } from "lucide-react"

interface UnsubscribeResult {
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
}

interface UnsubscribeResultsDialogProps {
  isOpen: boolean
  onClose: () => void
  results: UnsubscribeResult[]
  totalProcessed: number
  totalSuccessful: number
}

export function UnsubscribeResultsDialog({
  isOpen,
  onClose,
  results,
  totalProcessed,
  totalSuccessful,
}: UnsubscribeResultsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-blue-600" />
            Unsubscribe Results
          </DialogTitle>
          <DialogDescription>
            Processed {totalProcessed} emails, {totalSuccessful} successful unsubscribes
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalProcessed}</div>
            <div className="text-sm text-blue-800">Total Processed</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalSuccessful}</div>
            <div className="text-sm text-green-800">Successful</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{totalProcessed - totalSuccessful}</div>
            <div className="text-sm text-red-800">Failed</div>
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.emailId}
                className={`p-4 rounded-lg border ${
                  result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{result.subject}</h3>
                    <p className="text-sm text-gray-600 truncate">From: {result.sender}</p>
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"} className="ml-2">
                    {result.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>

                <p className="text-sm text-gray-700 mb-3">{result.summary}</p>

                {result.details.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-800 uppercase tracking-wide">
                      Unsubscribe Links Found ({result.details.length}):
                    </h4>
                    {result.details.map((detail, index) => (
                      <div key={index} className="p-3 bg-white/70 rounded border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-mono text-gray-600 truncate">{detail.link.url}</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                {detail.link.method}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                {detail.link.language}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(detail.link.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              <strong>Link Text:</strong> "{detail.link.text}"
                            </div>
                          </div>
                          <Badge variant={detail.result.success ? "default" : "secondary"} className="text-xs ml-2">
                            {detail.result.success ? "✓" : "✗"}
                          </Badge>
                        </div>

                        <div className="border-t pt-2">
                          <div className="text-xs">
                            <strong>Method:</strong> {detail.result.method}
                            {detail.result.language && (
                              <span className="ml-2">
                                <strong>Language:</strong> {detail.result.language}
                              </span>
                            )}
                          </div>
                          {detail.result.details && (
                            <div className="text-xs text-green-700 mt-1">
                              <strong>Result:</strong> {detail.result.details}
                            </div>
                          )}
                          {detail.result.error && (
                            <div className="text-xs text-red-600 mt-1">
                              <strong>Error:</strong> {detail.result.error}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
