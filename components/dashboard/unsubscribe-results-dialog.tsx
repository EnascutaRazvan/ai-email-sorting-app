"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, ExternalLink, ImageIcon } from "lucide-react"
import { useState } from "react"

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
  details: Array<{
    link: { url: string; text: string; method: string }
    result: {
      success: boolean
      method: string
      error?: string
      details?: string
      screenshot?: string
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
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      FORM_SUBMIT: "default",
      MANUAL_REQUIRED: "secondary",
      ERROR: "destructive",
      EMAIL: "outline",
    }
    return <Badge variant={variants[method] || "outline"}>{method}</Badge>
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Unsubscribe Results</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalSuccessful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalProcessed - totalSuccessful}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalProcessed}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0}% Success Rate
                </div>
              </div>
            </div>

            {/* Results List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={result.emailId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(result.success)}
                          <h4 className="font-medium truncate">{result.subject}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">From: {result.sender}</p>
                        <p className="text-sm">{result.summary}</p>
                      </div>
                    </div>

                    {result.details.length > 0 && (
                      <div className="space-y-2">
                        <Separator />
                        <h5 className="text-sm font-medium">Attempt Details:</h5>
                        {result.details.map((detail, detailIndex) => (
                          <div key={detailIndex} className="bg-muted/50 rounded p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Link:</span>
                                <a
                                  href={detail.link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  {detail.link.text}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              {getMethodBadge(detail.result.method)}
                            </div>

                            {detail.result.details && (
                              <p className="text-muted-foreground mb-2">{detail.result.details}</p>
                            )}

                            {detail.result.error && (
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>{detail.result.error}</span>
                              </div>
                            )}

                            {detail.result.screenshot && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedScreenshot(detail.result.screenshot!)}
                                className="mt-2"
                              >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                View Screenshot
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Screenshot</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={selectedScreenshot || "/placeholder.svg"}
                alt="Unsubscribe attempt screenshot"
                className="max-w-full max-h-[70vh] object-contain border rounded"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setSelectedScreenshot(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
