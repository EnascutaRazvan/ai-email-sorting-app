"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Loader2, Bot } from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  description?: string
  color: string
  email_count?: number
}

interface CategoriesDropdownProps {
  onCategorySelect: (categoryId: string | null) => void
  selectedCategoryId: string | null
}

export function CategoriesDropdown({ onCategorySelect, selectedCategoryId }: CategoriesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDefaultsDialog, setShowDefaultsDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Failed to load categories")

      const data = await response.json()
      setCategories(data.categories)

      // Show defaults dialog if no categories exist
      if (data.categories.length === 0) {
        setShowDefaultsDialog(true)
      }
    } catch (error) {
      console.error("Error loading categories:", error)
      toast.error("Failed to load categories")
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultCategories = async () => {
    setIsCreating(true)
    try {
      const response = await fetch("/api/categories/create-defaults", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to create default categories")

      const data = await response.json()
      if (data.created) {
        toast.success("Default categories created!")
        loadCategories()
      }
      setShowDefaultsDialog(false)
    } catch (error) {
      console.error("Error creating default categories:", error)
      toast.error("Failed to create default categories")
    } finally {
      setIsCreating(false)
    }
  }

  const createCategory = async () => {
    if (!newCategory.name.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCategory),
      })

      if (!response.ok) throw new Error("Failed to create category")

      toast.success("Category created successfully!")
      setShowCreateDialog(false)
      setNewCategory({ name: "", description: "", color: "#3B82F6" })
      loadCategories()
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Failed to create category")
    } finally {
      setIsCreating(false)
    }
  }

  const updateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingCategory.name,
          description: editingCategory.description,
          color: editingCategory.color,
        }),
      })

      if (!response.ok) throw new Error("Failed to update category")

      toast.success("Category updated successfully!")
      setEditingCategory(null)
      loadCategories()
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Failed to update category")
    } finally {
      setIsCreating(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete category")

      toast.success("Category deleted successfully!")
      loadCategories()

      if (selectedCategoryId === categoryId) {
        onCategorySelect(null)
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("Failed to delete category")
    }
  }

  const recategorizeWithAI = async () => {
    setIsRecategorizing(true)
    try {
      const response = await fetch("/api/emails/recategorize", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to recategorize emails")

      toast.success("AI recategorization started!", {
        description: "Your emails are being recategorized in the background.",
      })
    } catch (error) {
      console.error("Error recategorizing emails:", error)
      toast.error("Failed to start AI recategorization")
    } finally {
      setIsRecategorizing(false)
    }
  }

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId)

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-3 h-auto">
            <div className="flex items-center gap-2">
              <span className="font-medium">Categories</span>
              {selectedCategory && (
                <Badge
                  variant="secondary"
                  style={{ backgroundColor: selectedCategory.color + "20", color: selectedCategory.color }}
                >
                  {selectedCategory.name}
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 px-3 pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              <Button
                variant={selectedCategoryId === null ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => onCategorySelect(null)}
              >
                All Categories
              </Button>

              <Button
                variant={selectedCategoryId === "uncategorized" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => onCategorySelect("uncategorized")}
              >
                Uncategorized
              </Button>

              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-1">
                  <Button
                    variant={selectedCategoryId === category.id ? "secondary" : "ghost"}
                    size="sm"
                    className="flex-1 justify-start"
                    onClick={() => onCategorySelect(category.id)}
                  >
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                    {category.name}
                    {category.email_count !== undefined && (
                      <Badge variant="outline" className="ml-auto">
                        {category.email_count}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8"
                    onClick={() => setEditingCategory(category)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <div className="pt-2 space-y-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={recategorizeWithAI}
                  disabled={isRecategorizing}
                >
                  {isRecategorizing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4 mr-2" />
                  )}
                  {isRecategorizing ? "Recategorizing..." : "Re-categorize with AI"}
                </Button>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Create Default Categories Dialog */}
      <Dialog open={showDefaultsDialog} onOpenChange={setShowDefaultsDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Set up your categories</DialogTitle>
            <DialogDescription>
              Would you like to create some default categories to get started? You can always customize them later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="text-sm text-gray-600 mb-3">Default categories include:</div>
            <div className="grid grid-cols-2 gap-2">
              {["Personal", "Work", "Shopping", "Promotions", "Social", "Newsletters"].map((name) => (
                <Badge key={name} variant="outline" className="justify-center">
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDefaultsDialog(false)} disabled={isCreating}>
              Skip for now
            </Button>
            <Button onClick={createDefaultCategories} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? "Creating..." : "Create Default Categories"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Category Dialog */}
      <Dialog
        open={showCreateDialog || editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setEditingCategory(null)
            setNewCategory({ name: "", description: "", color: "#3B82F6" })
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the category details below." : "Add a new category to organize your emails."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editingCategory ? editingCategory.name : newCategory.name}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  } else {
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                }}
                placeholder="Category name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={editingCategory ? editingCategory.description || "" : newCategory.description}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  } else {
                    setNewCategory({ ...newCategory, description: e.target.value })
                  }
                }}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <input
                  id="color"
                  type="color"
                  value={editingCategory ? editingCategory.color : newCategory.color}
                  onChange={(e) => {
                    if (editingCategory) {
                      setEditingCategory({ ...editingCategory, color: e.target.value })
                    } else {
                      setNewCategory({ ...newCategory, color: e.target.value })
                    }
                  }}
                  className="w-12 h-10 rounded border border-gray-300"
                />
                <Input
                  value={editingCategory ? editingCategory.color : newCategory.color}
                  onChange={(e) => {
                    if (editingCategory) {
                      setEditingCategory({ ...editingCategory, color: e.target.value })
                    } else {
                      setNewCategory({ ...newCategory, color: e.target.value })
                    }
                  }}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingCategory(null)
                setNewCategory({ name: "", description: "", color: "#3B82F6" })
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={editingCategory ? updateCategory : createCategory} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating
                ? editingCategory
                  ? "Updating..."
                  : "Creating..."
                : editingCategory
                  ? "Update Category"
                  : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
