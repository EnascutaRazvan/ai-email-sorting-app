"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface CreateCategoryDialogProps {
  children: React.ReactNode
  onCategoryCreated: () => void
}

export function CreateCategoryDialog({ children, onCategoryCreated }: CreateCategoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  })

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      showErrorToast("Category name is required", "Create Category")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCategory),
      })

      if (response.ok) {
        const data = await response.json()
        setNewCategory({ name: "", description: "", color: "#3B82F6" })
        setIsOpen(false)
        showSuccessToast("Category Created", `"${data.category.name}" has been created successfully`)
        onCategoryCreated()
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent("categoriesChanged"))
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5 text-primary" />
            Create New Category
          </DialogTitle>
          <DialogDescription>
            Add a new category to organize your emails with AI-powered classification.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="col-span-3"
              placeholder="e.g., Work, Personal, Shopping"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              className="col-span-3"
              placeholder="Describe what emails belong in this category"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Input
                id="color"
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                className="w-16 h-10 p-1 border rounded"
              />
              <span className="text-sm text-muted-foreground">Choose a color for this category</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateCategory} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
