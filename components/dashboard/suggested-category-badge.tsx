"use client"

import type React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bot, Plus, Check } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface SuggestedCategoryBadgeProps {
  categoryName: string
  categoryColor?: string
  onCategoryCreated?: () => void
}

export function SuggestedCategoryBadge({
  categoryName,
  categoryColor = "#6B7280",
  onCategoryCreated,
}: SuggestedCategoryBadgeProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isCreated, setIsCreated] = useState(false)

  const handleCreateCategory = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent email click

    setIsCreating(true)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName,
          description: `AI-suggested category for ${categoryName.toLowerCase()} emails`,
          color: categoryColor,
        }),
      })

      if (response.ok) {
        setIsCreated(true)
        showSuccessToast("Category Created", `"${categoryName}" category has been created`)
        onCategoryCreated?.()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create category")
      }
    } catch (error) {
      showErrorToast(error, "Creating Category")
    } finally {
      setIsCreating(false)
    }
  }

  if (isCreated) {
    return (
      <Badge
        variant="secondary"
        style={{
          backgroundColor: `${categoryColor}15`,
          color: categoryColor,
          borderColor: `${categoryColor}30`,
        }}
        className="text-xs border flex items-center gap-1"
      >
        <Check className="h-3 w-3" />
        {categoryName}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Badge
        variant="secondary"
        style={{
          backgroundColor: `${categoryColor}10`,
          color: categoryColor,
          borderColor: `${categoryColor}20`,
        }}
        className="text-xs border border-dashed flex items-center gap-1"
      >
        <Bot className="h-3 w-3" />
        {categoryName}
      </Badge>
      <Button
        onClick={handleCreateCategory}
        disabled={isCreating}
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        {isCreating ? (
          <div className="h-3 w-3 animate-spin rounded-full border border-blue-600 border-t-transparent" />
        ) : (
          <Plus className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}
