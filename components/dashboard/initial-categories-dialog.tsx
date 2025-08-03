"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Plus } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface InitialCategoriesDialogProps {
  isOpen: boolean
  onClose: () => void
  onCategoriesCreated: () => void
}

const DEFAULT_CATEGORIES = [
  {
    name: "Work",
    description: "Professional emails, meetings, and work-related communications",
    color: "#3B82F6",
  },
  {
    name: "Personal",
    description: "Personal correspondence, family, and friends",
    color: "#10B981",
  },
  {
    name: "Shopping",
    description: "E-commerce, receipts, order confirmations, and deals",
    color: "#F59E0B",
  },
  {
    name: "Finance",
    description: "Banking, bills, invoices, and financial statements",
    color: "#EF4444",
  },
  {
    name: "Newsletters",
    description: "Subscriptions, news updates, and marketing emails",
    color: "#8B5CF6",
  },
  {
    name: "Travel",
    description: "Bookings, confirmations, itineraries, and travel updates",
    color: "#06B6D4",
  },
]

export function InitialCategoriesDialog({ isOpen, onClose, onCategoriesCreated }: InitialCategoriesDialogProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(
    new Set(DEFAULT_CATEGORIES.map((_, index) => index)),
  )

  const toggleCategory = (index: number) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedCategories(newSelected)
  }

  const handleCreateCategories = async () => {
    if (selectedCategories.size === 0) {
      showErrorToast("Please select at least one category", "Create Categories")
      return
    }

    setIsCreating(true)
    try {
      const categoriesToCreate = Array.from(selectedCategories).map((index) => DEFAULT_CATEGORIES[index])

      // Create categories one by one
      const promises = categoriesToCreate.map((category) =>
        fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(category),
        }),
      )

      const responses = await Promise.all(promises)
      const failedCreations = responses.filter((response) => !response.ok)

      if (failedCreations.length > 0) {
        throw new Error(`Failed to create ${failedCreations.length} categories`)
      }

      showSuccessToast(
        "Categories Created Successfully",
        `Created ${selectedCategories.size} categories to help organize your emails`,
      )

      onCategoriesCreated()
      onClose()

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent("categoriesChanged"))
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Plus className="mr-2 h-6 w-6 text-primary" />
            Welcome! Let's Set Up Your Email Categories
          </DialogTitle>
          <DialogDescription className="text-base">
            To help organize your emails with AI, we recommend starting with these common categories. You can customize,
            add, or remove categories anytime later.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Pro Tips:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Select categories that match your email patterns</li>
                  <li>• You can modify names, colors, and descriptions later</li>
                  <li>• AI will automatically sort new emails into these categories</li>
                  <li>• You can always add more specific categories as needed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Select categories to create ({selectedCategories.size} selected):
            </h4>

            {DEFAULT_CATEGORIES.map((category, index) => (
              <div
                key={index}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedCategories.has(index)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                }`}
                onClick={() => toggleCategory(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="font-medium text-sm">{category.name}</h5>
                        {selectedCategories.has(index) && (
                          <Badge variant="secondary" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{category.description}</p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {selectedCategories.has(index) ? (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto bg-transparent">
            Skip for Now
          </Button>
          <Button
            onClick={handleCreateCategories}
            disabled={isCreating || selectedCategories.size === 0}
            className="w-full sm:w-auto"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Creating Categories...
              </>
            ) : (
              <>Create {selectedCategories.size} Categories</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
