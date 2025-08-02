"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles, FolderPlus, SkipBackIcon as Skip } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface DefaultCategory {
  name: string
  description: string
  color: string
}

const SUGGESTED_CATEGORIES: DefaultCategory[] = [
  {
    name: "Work",
    description: "Professional emails, meetings, and work-related communications",
    color: "#3B82F6",
  },
  {
    name: "Personal",
    description: "Personal communications from friends and family",
    color: "#10B981",
  },
  {
    name: "Shopping",
    description: "Order confirmations, receipts, and promotional emails from stores",
    color: "#F59E0B",
  },
  {
    name: "Finance",
    description: "Bank statements, bills, invoices, and financial notifications",
    color: "#EF4444",
  },
  {
    name: "Travel",
    description: "Flight confirmations, hotel bookings, and travel-related emails",
    color: "#8B5CF6",
  },
  {
    name: "Newsletters",
    description: "Subscriptions, newsletters, and regular updates",
    color: "#06B6D4",
  },
  {
    name: "Social",
    description: "Social media notifications and community updates",
    color: "#EC4899",
  },
  {
    name: "Health",
    description: "Medical appointments, health insurance, and wellness emails",
    color: "#84CC16",
  },
]

interface DefaultCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  onCategoriesCreated: () => void
}

export function DefaultCategoriesModal({ isOpen, onClose, onCategoriesCreated }: DefaultCategoriesModalProps) {
  const { data: session } = useSession()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Pre-select some common categories
      setSelectedCategories(["Work", "Personal", "Shopping", "Finance"])
    }
  }, [isOpen])

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName) ? prev.filter((name) => name !== categoryName) : [...prev, categoryName],
    )
  }

  const handleCreateCategories = async () => {
    if (selectedCategories.length === 0) {
      showErrorToast("Please select at least one category", "Create Categories")
      return
    }

    setIsCreating(true)
    try {
      const categoriesToCreate = SUGGESTED_CATEGORIES.filter((cat) => selectedCategories.includes(cat.name))

      const promises = categoriesToCreate.map((category) =>
        fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(category),
        }),
      )

      const responses = await Promise.all(promises)
      const failedCreations = responses.filter((response) => !response.ok)

      if (failedCreations.length > 0) {
        throw new Error(`Failed to create ${failedCreations.length} categories`)
      }

      showSuccessToast("Categories Created", `Successfully created ${selectedCategories.length} categories`)
      onCategoriesCreated()
      onClose()
    } catch (error) {
      showErrorToast(error, "Creating Categories")
    } finally {
      setIsCreating(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-purple-600" />
            Set Up Your Email Categories
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            We've noticed you don't have any categories set up yet. Choose from our suggested categories to help
            organize your emails automatically with AI.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUGGESTED_CATEGORIES.map((category) => (
              <Card
                key={category.name}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedCategories.includes(category.name) ? "ring-2 ring-blue-500 bg-blue-50/50" : "hover:bg-gray-50"
                }`}
                onClick={() => handleCategoryToggle(category.name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedCategories.includes(category.name)}
                      onChange={() => handleCategoryToggle(category.name)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedCategories.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Selected categories ({selectedCategories.length}):</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((categoryName) => {
                  const category = SUGGESTED_CATEGORIES.find((cat) => cat.name === categoryName)
                  return (
                    <Badge
                      key={categoryName}
                      variant="secondary"
                      style={{
                        backgroundColor: `${category?.color}15`,
                        color: category?.color,
                        borderColor: `${category?.color}30`,
                      }}
                      className="border"
                    >
                      {categoryName}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button onClick={handleSkip} variant="ghost" className="text-gray-600 hover:text-gray-800">
            <Skip className="mr-2 h-4 w-4" />
            Skip for now
          </Button>
          <Button
            onClick={handleCreateCategories}
            disabled={isCreating || selectedCategories.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            {isCreating ? "Creating..." : `Create ${selectedCategories.length} Categories`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
