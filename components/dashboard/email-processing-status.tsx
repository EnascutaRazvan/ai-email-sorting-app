"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface ProcessingJob {
  id: string
  status: string
  emails_processed: number
  total_emails: number
  error_message?: string
  created_at: string
  updated_at: string
}

export function EmailProcessingStatus() {
  const { data: session } = useSession()
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
  }, [session])

  const fetchJobs = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/emails/process")
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs)
      }
    } catch (error) {
      console.error("Error fetching processing jobs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessEmails = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch("/api/emails/process", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast(
          "Email Processing Started",
          `Processing ${data.result.processed} emails. Check back in a moment for results.`,
        )

        // Refresh jobs after a short delay
        setTimeout(() => {
          fetchJobs()
        }, 2000)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process emails")
      }
    } catch (error) {
      showErrorToast(error, "Processing Emails")
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "completed_with_errors":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case "processing":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "completed_with_errors":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Email Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
            <Zap className="mr-2 h-4 w-4 text-blue-600" />
            AI Email Processing
          </CardTitle>
          <Button
            onClick={handleProcessEmails}
            disabled={isProcessing}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-3 w-3" />
                Process New Emails
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No Processing History</h3>
            <p className="text-xs text-gray-600 mb-4">
              Click "Process New Emails" to start importing and categorizing your emails with AI
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="bg-white border border-gray-200/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(job.status)}
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(job.created_at).toLocaleString()}
                    </span>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(job.status)}`}>{job.status.replace("_", " ")}</Badge>
                </div>

                {job.status === "processing" && job.total_emails > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Processing emails...</span>
                      <span>
                        {job.emails_processed}/{job.total_emails}
                      </span>
                    </div>
                    <Progress value={(job.emails_processed / job.total_emails) * 100} className="h-2" />
                  </div>
                )}

                {job.emails_processed > 0 && (
                  <div className="text-xs text-gray-600">
                    Processed {job.emails_processed} email{job.emails_processed !== 1 ? "s" : ""}
                  </div>
                )}

                {job.error_message && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{job.error_message}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
