"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Settings } from "lucide-react"
import { toast } from "sonner"

interface UserSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UserSettings {
  auto_sync_enabled: boolean
  emails_per_page: number
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    auto_sync_enabled: true,
    emails_per_page: 10,
  })

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user-settings")
      if (!response.ok) throw new Error("Failed to load settings")

      const data = await response.json()
      setSettings(data.settings)
    } catch (error) {
      console.error("Error loading settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/user-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      toast.success("Settings saved successfully!")
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Settings
          </DialogTitle>
          <DialogDescription>Configure your email management preferences.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-sync emails</Label>
                <div className="text-sm text-gray-600">Automatically sync emails every 15 minutes</div>
              </div>
              <Switch
                checked={settings.auto_sync_enabled}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, auto_sync_enabled: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Emails per page</Label>
              <Select
                value={settings.emails_per_page.toString()}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, emails_per_page: Number.parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="5">5 emails</SelectItem>
                  <SelectItem value="10">10 emails</SelectItem>
                  <SelectItem value="15">15 emails</SelectItem>
                  <SelectItem value="25">25 emails</SelectItem>
                  <SelectItem value="50">50 emails</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-600">Number of emails to display per page</div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
