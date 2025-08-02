"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Loader2, Zap } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface UserSettingsDialogProps {
  onSettingsChange?: () => void
}

interface UserSettings {
  auto_sync_enabled: boolean
  emails_per_page: number
}

export function UserSettingsDialog({ onSettingsChange }: UserSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    auto_sync_enabled: true,
    emails_per_page: 10,
  })

  useEffect(() => {
    if (isOpen) {
      fetchSettings()
    }
  }, [isOpen])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user-settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        throw new Error("Failed to fetch settings")
      }
    } catch (error) {
      showErrorToast(error, "Loading Settings")
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/user-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        showSuccessToast("Settings Saved", "Your preferences have been updated successfully")
        onSettingsChange?.()
        setIsOpen(false)
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      showErrorToast(error, "Saving Settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            User Settings
          </DialogTitle>
          <DialogDescription className="text-gray-600">Configure your email management preferences.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading settings...</span>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Auto-sync Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-900 flex items-center">
                    <Zap className="mr-2 h-4 w-4 text-blue-600" />
                    Auto-sync Emails
                  </Label>
                  <p className="text-xs text-gray-600">Automatically import new emails every 15 minutes</p>
                </div>
                <Switch
                  checked={settings.auto_sync_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_sync_enabled: checked })}
                />
              </div>

              {!settings.auto_sync_enabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> With auto-sync disabled, you'll need to manually import emails to see new
                    messages in your dashboard.
                  </p>
                </div>
              )}
            </div>

            {/* Emails per page */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900">Emails per Page</Label>
              <Select
                value={settings.emails_per_page.toString()}
                onValueChange={(value) => setSettings({ ...settings, emails_per_page: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 emails</SelectItem>
                  <SelectItem value="10">10 emails</SelectItem>
                  <SelectItem value="15">15 emails</SelectItem>
                  <SelectItem value="25">25 emails</SelectItem>
                  <SelectItem value="50">50 emails</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">Number of emails to display per page in the email list</p>
            </div>

            {/* Performance Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Performance Tip:</strong> Lower values provide faster loading times, especially with large email
                collections.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
