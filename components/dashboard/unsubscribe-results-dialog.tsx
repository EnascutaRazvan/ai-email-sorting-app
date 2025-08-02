"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, ExternalLink, Bot, ArrowRight } from "lucide-react"

interface AgentAction {
  action: string
  selector: string
  value?: string
  label?: string
}

interface UnsubscribeDetail {
  link: { url: string; text: string }
  result: {
    success: boolean
    summary: string
    actions: AgentAction[]
    finalUrl?: string
    confirmationText?: string
  }
}

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
  details: UnsubscribeDetail[]
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
            <Bot className="mr-2 h-5 w-5 text-blue-600" />
            Unsubscribe Agent Results
          </DialogTitle>
          <DialogDescription>
            Agent processed {totalProcessed} emails, with {totalSuccessful} successful unsubscribes.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[70vh] pr-4">
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
                  <Badge variant={result.success ? "default" : "destructive"} className="ml-2 flex-shrink-0">
                    {result.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>

                <p className="text-sm text-gray-700 mb-3">{result.summary}</p>

                {result.details.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-800 uppercase tracking-wide">Agent Actions:</h4>
                    {result.details.map((detail, index) => (
                      <div key={index} className="p-3 bg-white/60 rounded border border-gray-200/80">
                        <div className="flex items-center space-x-2 mb-2">
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                          <a
                            href={detail.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate"
                          >
                            {detail.link.url}
                          </a>
                        </div>

                        {detail.result.actions.length > 0 ? (
                          <ul className="space-y-1 list-inside">
                            {detail.result.actions.map((action, actionIndex) => (
                              <li key={actionIndex} className="flex items-center text-xs text-gray-700">
                                <ArrowRight className="h-3 w-3 mr-2 text-gray-400" />
                                <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800 text-[11px]">
                                  {action.action}
                                </span>
                                <span className="mx-1.5 text-gray-400">on</span>
                                <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800 text-[11px] truncate">
                                  {action.selector}
                                </code>
                                {action.value && <span className="ml-1.5 truncate">with value "{action.value}"</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-500">No specific actions were taken by the agent.</p>
                        )}

                        {detail.result.confirmationText && (
                          <div className="mt-2 p-2 bg-green-100/50 border-l-2 border-green-400">
                            <p className="text-xs text-green-800">
                              <strong>Confirmation:</strong> {detail.result.confirmationText}
                            </p>
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
      </DialogContent>
    </Dialog>
  )
}
