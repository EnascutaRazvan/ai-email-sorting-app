"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, ExternalLink, Info } from "lucide-react"
import Image from "next/image"

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
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Unsubscribe Results</DialogTitle>
          <DialogDescription>
            Summary of the bulk unsubscribe operation.
            <div className="mt-2 text-sm">
              <p>
                Processed: <span className="font-semibold">{totalProcessed}</span> emails
              </p>
              <p>
                Successful: <span className="font-semibold text-green-600">{totalSuccessful}</span> emails
              </p>
              <p>
                Failed: <span className="font-semibold text-red-600">{totalProcessed - totalSuccessful}</span> emails
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-2">
            {results.map((emailResult) => (
              <div key={emailResult.emailId} className="border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {emailResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {emailResult.subject}
                  </h3>
                  <span className="text-sm text-gray-600">{emailResult.sender}</span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{emailResult.summary}</p>

                {emailResult.details.map((detail, index) => (
                  <div key={index} className="border-t pt-3 mt-3">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      {detail.result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      Attempt {index + 1}: {detail.link.text || detail.link.url}
                      {detail.link.url && (
                        <a
                          href={detail.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {detail.result.details && (
                      <p className="text-xs text-gray-600 mb-2 flex items-start gap-1">
                        <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        {detail.result.details}
                      </p>
                    )}
                    {detail.result.error && (
                      <p className="text-xs text-red-500 mb-2 flex items-start gap-1">
                        <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        Error: {detail.result.error}
                      </p>
                    )}
                    {detail.result.screenshot && (
                      <div className="mt-2 border rounded-md overflow-hidden">
                        <Image
                          src={detail.result.screenshot || "/placeholder.svg"}
                          alt="Unsubscribe page screenshot"
                          width={800}
                          height={450}
                          layout="responsive"
                          objectFit="contain"
                          className="bg-gray-50"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
