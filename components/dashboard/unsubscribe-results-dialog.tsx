"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col bg-card text-card-foreground border-border">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground">Unsubscribe Results</DialogTitle>
          <DialogDescription className="text-muted-foreground">Summary of bulk unsubscribe attempts.</DialogDescription>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Processed: {totalProcessed}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              Successful: {totalSuccessful}
            </Badge>
            <Badge variant="secondary" className="bg-destructive/10 text-destructive">
              Failed: {totalProcessed - totalSuccessful}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.emailId} className="border rounded-lg p-4 bg-background/50 border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <h3 className="font-semibold text-foreground">{result.subject}</h3>
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">From: {result.sender}</p>
                <p className="text-sm text-foreground mb-3">{result.summary}</p>

                {result.details.length > 0 && (
                  <div className="space-y-2 mt-3 border-t border-border pt-3">
                    <p className="text-sm font-medium text-foreground">Attempt Details:</p>
                    {result.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        {detail.result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1">
                          <p className="text-foreground">
                            Method:{" "}
                            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                              {detail.result.method}
                            </span>
                          </p>
                          {detail.link && (
                            <p className="text-muted-foreground">
                              Link:{" "}
                              <a
                                href={detail.link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {detail.link.text || detail.link.url} <ExternalLink className="h-3 w-3" />
                              </a>
                            </p>
                          )}
                          {detail.result.error && <p className="text-destructive">Error: {detail.result.error}</p>}
                          {detail.result.details && (
                            <p className="text-muted-foreground">Details: {detail.result.details}</p>
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

        <div className="flex justify-end flex-shrink-0 pt-4 border-t border-border">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
