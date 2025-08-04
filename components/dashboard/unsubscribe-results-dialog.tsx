"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

interface LogEntry {
  timestamp: string
  message: string
  level: string
}

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
      logs?: LogEntry[]
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
  const [selectedLogs, setSelectedLogs] = useState<LogEntry[] | null>(null)

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

  const downloadLogs = (logs: LogEntry[]) => {
    const content = logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
      )
      .join("\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "unsubscribe-steps.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5 text-blue-600" />
              Unsubscribe Results
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {results.map((result) => {
                const isExpanded = expandedResults.has(result.emailId)

                return (
                  <div
                    key={result.emailId}
                    className={cn(
                      "rounded-lg border transition-all duration-200 overflow-y-auto",
                      result.success
                        ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 overflow-y-auto">
                          <div className="flex items-center space-x-2 mb-1">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <h3 className="font-medium text-foreground truncate">
                              {result.subject}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mb-2">
                            From: {result.sender}
                          </p>
                          <p className="text-sm text-foreground">
                            {result.summary}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Badge
                            variant={result.success ? "default" : "destructive"}
                          >
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
                        <div className="space-y-4 pt-4 border-t border-border overflow-y-auto max-h-[50vh]">
                          {result.details.map((detail, index) => (
                            <div
                              key={index}
                              className="bg-background/50 rounded-lg p-4 overflow-y-auto"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0 overflow-y-auto">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs font-mono text-muted-foreground truncate">
                                      {detail.link.url}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4 text-xs mb-3">
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-foreground">
                                        Method:
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {detail.result.method}
                                      </Badge>
                                    </div>
                                    {detail.result.processingTime && (
                                      <div className="flex items-center space-x-1">
                                        <span className="font-medium text-foreground">
                                          Time:
                                        </span>
                                        <span className="text-muted-foreground">
                                          {detail.result.processingTime}ms
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                  <Badge
                                    variant={
                                      detail.result.success ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {detail.result.success ? "✓" : "✗"}
                                  </Badge>
                                  {detail.result.logs && detail.result.logs.length > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2 text-xs"
                                      onClick={() => setSelectedLogs(detail.result.logs!)}
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      Steps
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* AI Analysis */}
                              {detail.result.aiAnalysis && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg overflow-y-auto">
                                  <div className="flex items-center mb-2">
                                    <Info className="h-4 w-4 text-blue-600 mr-2" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                      AI Analysis
                                    </span>
                                  </div>
                                  <p className="text-sm text-blue-800 dark:text-blue-200">
                                    {detail.result.aiAnalysis}
                                  </p>
                                </div>
                              )}

                              {/* AI Steps */}
                              {detail.result.aiSteps && detail.result.aiSteps.length > 0 && (
                                <div className="mb-4 overflow-y-auto">
                                  <div className="flex items-center mb-3">
                                    <Zap className="h-4 w-4 text-primary mr-2" />
                                    <span className="text-sm font-medium text-foreground">
                                      AI Processing Steps
                                    </span>
                                  </div>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {detail.result.aiSteps.map((step, stepIndex) => (
                                      <div
                                        key={stepIndex}
                                        className="flex items-start space-x-3 text-sm"
                                      >
                                        <div className="flex-shrink-0 mt-0.5">
                                          {getStepIcon(step)}
                                        </div>
                                        <div className="flex-1">
                                          <span className="text-muted-foreground">
                                            {stepIndex + 1}.
                                          </span>
                                          <span className="text-foreground ml-2">
                                            {step}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Success Details */}
                              {detail.result.success && detail.result.details && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg overflow-y-auto">
                                  <div className="flex items-center mb-2">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                    <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                      Success Details
                                    </span>
                                  </div>
                                  <p className="text-sm text-green-800 dark:text-green-200">
                                    {detail.result.details}
                                  </p>
                                </div>
                              )}

                              {/* Error Details */}
                              {!detail.result.success && detail.result.error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg overflow-y-auto">
                                  <div className="flex items-center mb-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                                    <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                      Error Details
                                    </span>
                                  </div>
                                  <p className="text-sm text-red-800 dark:text-red-200">
                                    {detail.result.error}
                                  </p>
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
                                    onClick={() =>
                                      setSelectedScreenshot(detail.result.screenshot!)
                                    }
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot Modal */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ImageIcon className="mr-2 h-5 w-5" />
              Unsubscribe Page Screenshot
            </DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <ScrollArea className="flex-1 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-center p-4">
                <img
                  src={selectedScreenshot}
                  alt="Unsubscribe page screenshot"
                  className="max-w-full max-h-full object-contain border rounded"
                />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Steps (Logs) Modal */}
      <Dialog open={!!selectedLogs} onOpenChange={() => setSelectedLogs(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Unsubscribe Processing Steps
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[65vh] bg-muted rounded p-2 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {selectedLogs &&
                selectedLogs.map(
                  (log) =>
                    `[${log.timestamp}] [${log.level?.toUpperCase?.() || "INFO"}] ${log.message}`
                ).join("\n")}
            </pre>
            {selectedLogs && (
              <Button
                className="mt-3"
                onClick={() => downloadLogs(selectedLogs)}
              >
                Download .txt
              </Button>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
