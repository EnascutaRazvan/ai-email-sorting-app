"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  XCircle,
  Mail,
  ExternalLink,
  ImageIcon,
  Eye,
  AlertTriangle,
  Info,
  Zap,
  Search,
  MousePointer,
  FileText,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

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
      aiSteps?: string[]
      aiAnalysis?: string
      processingTime?: number
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
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  const toggleExpanded = (emailId: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  const getSuccessRate = () => {
    return totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0
  }

  const getStepIcon = (step: string) => {
    if (step.toLowerCase().includes("analyzing") || step.toLowerCase().includes("scanning")) {
      return <Search className="h-3 w-3 text-blue-500" />
    } else if (step.toLowerCase().includes("clicking") || step.toLowerCase().includes("submitting")) {
      return <MousePointer className="h-3 w-3 text-green-500" />
    } else if (step.toLowerCase().includes("navigating") || step.toLowerCase().includes("opening")) {
      return <ExternalLink className="h-3 w-3 text-purple-500" />
    } else if (step.toLowerCase().includes("reading") || step.toLowerCase().includes("extracting")) {
      return <FileText className="h-3 w-3 text-orange-500" />
    } else {
      return <Zap className="h-3 w-3 text-primary" />
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5 text-blue-600" />
              Unsubscribe Results
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center justify-between">
                <span>
                  Processed {totalProcessed} emails, {totalSuccessful} successful unsubscribes
                </span>
                <Badge
                  variant={getSuccessRate() >= 70 ? "default" : getSuccessRate() >= 40 ? "secondary" : "destructive"}
                  className="ml-2"
                >
                  {getSuccessRate()}% Success Rate
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4">
              {results.map((result) => {
                const isExpanded = expandedResults.has(result.emailId)

                return (
                  <div
                    key={result.emailId}
                    className={cn(
                      "rounded-lg border transition-all duration-200",
                      result.success
                        ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <h3 className="font-medium text-foreground truncate">{result.subject}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mb-2">From: {result.sender}</p>
                          <p className="text-sm text-foreground">{result.summary}</p>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                          {result.details.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(result.emailId)}
                              className="text-xs"
                            >
                              {isExpanded ? "Hide Details" : "Show Details"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {isExpanded && result.details.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-border">
                          {result.details.map((detail, index) => (
                            <div key={index} className="bg-background/50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs font-mono text-muted-foreground truncate">
                                      {detail.link.url}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4 text-xs mb-3">
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-foreground">Method:</span>
                                      <Badge variant="outline" className="text-xs">
                                        {detail.result.method}
                                      </Badge>
                                    </div>
                                    {detail.result.processingTime && (
                                      <div className="flex items-center space-x-1">
                                        <span className="font-medium text-foreground">Time:</span>
                                        <span className="text-muted-foreground">{detail.result.processingTime}ms</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Badge variant={detail.result.success ? "default" : "secondary"} className="text-xs">
                                  {detail.result.success ? "✓" : "✗"}
                                </Badge>
                              </div>

                              {/* AI Analysis */}
                              {detail.result.aiAnalysis && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                  <div className="flex items-center mb-2">
                                    <Info className="h-4 w-4 text-blue-600 mr-2" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                      AI Analysis
                                    </span>
                                  </div>
                                  <p className="text-sm text-blue-800 dark:text-blue-200">{detail.result.aiAnalysis}</p>
                                </div>
                              )}

                              {/* AI Steps */}
                              {detail.result.aiSteps && detail.result.aiSteps.length > 0 && (
                                <div className="mb-4">
                                  <div className="flex items-center mb-3">
                                    <Zap className="h-4 w-4 text-primary mr-2" />
                                    <span className="text-sm font-medium text-foreground">AI Processing Steps</span>
                                  </div>
                                  <div className="space-y-2">
                                    {detail.result.aiSteps.map((step, stepIndex) => (
                                      <div key={stepIndex} className="flex items-start space-x-3 text-sm">
                                        <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>
                                        <div className="flex-1">
                                          <span className="text-muted-foreground">{stepIndex + 1}.</span>
                                          <span className="text-foreground ml-2">{step}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Success Details */}
                              {detail.result.success && detail.result.details && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                  <div className="flex items-center mb-2">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                    <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                      Success Details
                                    </span>
                                  </div>
                                  <p className="text-sm text-green-800 dark:text-green-200">{detail.result.details}</p>
                                </div>
                              )}

                              {/* Error Details */}
                              {!detail.result.success && detail.result.error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                  <div className="flex items-center mb-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                                    <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                      Error Details
                                    </span>
                                  </div>
                                  <p className="text-sm text-red-800 dark:text-red-200">{detail.result.error}</p>
                                  {detail.result.details && (
                                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                                      Additional info: {detail.result.details}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Screenshot */}
                              {detail.result.screenshot && (
                                <div className="mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedScreenshot(detail.result.screenshot!)}
                                    className="text-xs"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Screenshot
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Summary Footer */}
          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{totalProcessed}</div>
                <div className="text-sm text-muted-foreground">Total Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalSuccessful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{totalProcessed - totalSuccessful}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot Modal */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ImageIcon className="mr-2 h-5 w-5" />
              Unsubscribe Page Screenshot
            </DialogTitle>
          </DialogHeader>

          {selectedScreenshot && (
            <div className="flex justify-center">
              <img
                src={selectedScreenshot || "/placeholder.svg"}
                alt="Unsubscribe page screenshot"
                className="max-w-full max-h-[70vh] object-contain border rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
