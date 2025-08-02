"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
  details: string[]
  screenshot?: string // Base64 encoded screenshot
}

interface UnsubscribeResultsDialogProps {
  isOpen: boolean
  onClose: () => void
  results: UnsubscribeResult[]
}

export function UnsubscribeResultsDialog({ isOpen, onClose, results }: UnsubscribeResultsDialogProps) {
  const [selectedResult, setSelectedResult] = useState<UnsubscribeResult | null>(null)

  const totalProcessed = results.length
  const totalSuccessful = results.filter((r) => r.success).length
  const totalFailed = totalProcessed - totalSuccessful

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Unsubscribe Results</DialogTitle>
          <DialogDescription>Summary of the bulk unsubscribe operation.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div className="flex flex-col items-center">
            <Badge variant="secondary" className="text-lg p-2">
              {totalProcessed}
            </Badge>
            <span className="text-sm text-muted-foreground">Processed</span>
          </div>
          <div className="flex flex-col items-center">
            <Badge className="bg-green-500 text-white text-lg p-2">{totalSuccessful}</Badge>
            <span className="text-sm text-muted-foreground">Successful</span>
          </div>
          <div className="flex flex-col items-center">
            <Badge variant="destructive" className="text-lg p-2">
              {totalFailed}
            </Badge>
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.emailId} className="border rounded-md p-4 flex items-start gap-4">
                {result.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-1" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{result.subject}</p>
                  <p className="text-sm text-muted-foreground">From: {result.sender}</p>
                  <p className="text-sm mt-1">{result.summary}</p>
                  {result.details.length > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1 text-xs"
                      onClick={() => setSelectedResult(result)}
                    >
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>

        {selectedResult && (
          <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Details for: {selectedResult.subject}</DialogTitle>
                <DialogDescription>
                  Status: {selectedResult.success ? "Successful" : "Failed"} - {selectedResult.summary}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 p-4 border rounded-md bg-muted/20">
                <h4 className="font-semibold mb-2">Agent Log:</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {selectedResult.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
                {selectedResult.screenshot && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Screenshot:</h4>
                    <img
                      src={`data:image/png;base64,${selectedResult.screenshot}`}
                      alt="Unsubscribe process screenshot"
                      className="max-w-full h-auto rounded-md border"
                    />
                  </div>
                )}
              </ScrollArea>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => setSelectedResult(null)}>
                  Close Details
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
