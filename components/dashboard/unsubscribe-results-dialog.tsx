"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Mail, ExternalLink } from "lucide-react"

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
  details: Array<{
    link: { url: string; text: string; method: string }
    result: { success: boolean; method: string; error?: string; details?: string }
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
                      Unsubscribe Links Processed:
                    </h4>
                    {result.details.map((detail, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600 truncate">{detail.link.url}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Method: {detail.result.method}</p>
                          {detail.result.details && (
                            <p className="text-xs text-gray-600 mt-1">{detail.result.details}</p>
                          )}
                          {detail.result.error && (
                            <p className="text-xs text-red-600 mt-1">Error: {detail.result.error}</p>
                          )}
                        </div>
                        <Badge variant={detail.result.success ? "default" : "secondary"} className="text-xs">
                          {detail.result.success ? "✓" : "✗"}
                        </Badge>
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
