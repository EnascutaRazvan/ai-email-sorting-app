"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Mail, ExternalLink } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface UnsubscribeResultsDialogProps {
  results: {
    success: boolean
    totalProcessed: number
    successCount: number
    results: Array<{
      emailId: string
      subject: string
      sender: string
      success: boolean
      results: Array<{
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
      summary: string
    }>
    summary: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnsubscribeResultsDialog({ results, open, onOpenChange }: UnsubscribeResultsDialogProps) {
  if (!results) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Unsubscribe Results</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{results.totalProcessed}</div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{results.successCount}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.totalProcessed - results.successCount}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">{results.summary}</p>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {results.results.map((emailResult, index) => (
                <Card key={emailResult.emailId}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center space-x-2">
                          {emailResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="truncate">{emailResult.subject}</span>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">From: {emailResult.sender}</p>
                      </div>
                      <Badge variant={emailResult.success ? "default" : "destructive"}>
                        {emailResult.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{emailResult.summary}</p>

                    {emailResult.results && emailResult.results.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Unsubscribe Links Found:</h4>
                        {emailResult.results.map((linkResult, linkIndex) => (
                          <div key={linkIndex} className="border rounded p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <ExternalLink className="h-3 w-3" />
                                <span className="text-xs font-mono truncate max-w-xs">{linkResult.link.url}</span>
                              </div>
                              <div className="flex space-x-1">
                                <Badge variant="outline" className="text-xs">
                                  {linkResult.link.method}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {linkResult.link.language}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(linkResult.link.confidence * 100)}%
                                </Badge>
                              </div>
                            </div>

                            <div className="text-xs">
                              <span className="font-medium">Text: </span>
                              <span className="text-muted-foreground">{linkResult.link.text}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {linkResult.result.success ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                              <span className="text-xs">{linkResult.result.details || linkResult.result.error}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
