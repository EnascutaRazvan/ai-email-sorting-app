"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Category {
  id: string
  name: string
  color: string
  count?: number
}

interface CategoriesProps {
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
  onCategoriesChange: () => void
  categories: Category[]
}

export function Categories({ selectedCategory, onCategorySelect, onCategoriesChange, categories }: CategoriesProps) {
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#000000")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")
  const [editingCategoryColor, setEditingCategoryColor] = useState("")
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const { toast } = useToast()

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryColor) {
      toast({
        title: "Error",
        description: "Category name and color cannot be empty.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create category")
      }

      toast({
        title: "Category Created",
        description: `Category "${newCategoryName}" has been added.`,
      })
      setNewCategoryName("")
      setNewCategoryColor("#000000")
      onCategoriesChange()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create category.",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
    setEditingCategoryColor(category.color)
  }

  const handleSaveCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim() || !editingCategoryColor) {
      toast({
        title: "Error",
        description: "Category name and color cannot be empty.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategoryName, color: editingCategoryColor }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update category")
      }

      toast({
        title: "Category Updated",
        description: `Category "${editingCategoryName}" has been updated.`,
      })
      setEditingCategoryId(null)
      onCategoriesChange()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update category.",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingCategoryId(null)
    setEditingCategoryName("")
    setEditingCategoryColor("")
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    setIsConfirmDeleteOpen(false)

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete category")
      }

      toast({
        title: "Category Deleted",
        description: `Category "${categoryToDelete.name}" has been deleted. Emails are now uncategorized.`,
      })
      onCategoriesChange()
      setCategoryToDelete(null)
      if (selectedCategory === categoryToDelete.id) {
        onCategorySelect(null) // Deselect if the deleted category was selected
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category.",
        variant: "destructive",
      })
    }
  }

  const openDeleteConfirm = (category: Category) => {
    setCategoryToDelete(category)
    setIsConfirmDeleteOpen(true)
  }

  const getCategoryCount = (categoryId: string | null) => {
    if (categoryId === "uncategorized") {
      // For "Uncategorized", we need to count emails with category_id IS NULL
      const uncategorizedCount = categories.find((cat) => cat.name === "Uncategorized")?.count || 0
      return uncategorizedCount
    }
    const category = categories.find((cat) => cat.id === categoryId)
    return category?.count || 0
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* All Emails */}
        <Button
          variant={selectedCategory === null ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onCategorySelect(null)}
        >
          All Emails
          <span className="ml-auto text-sm text-muted-foreground">
            {categories.reduce((sum, cat) => sum + (cat.count || 0), 0)}
          </span>
        </Button>

        {/* Uncategorized */}
        <Button
          variant={selectedCategory === "uncategorized" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onCategorySelect("uncategorized")}
        >
          <div className="w-3 h-3 rounded-full bg-gray-400 mr-2" />
          Uncategorized
          <span className="ml-auto text-sm text-muted-foreground">{getCategoryCount("uncategorized")}</span>
        </Button>

        <div className="space-y-2">
          {categories
            .filter((cat) => cat.name !== "Uncategorized") // Filter out "Uncategorized" from the main list
            .map((category) => (
              <div key={category.id} className="flex items-center justify-between group">
                {editingCategoryId === category.id ? (
                  <div className="flex items-center w-full gap-2">
                    <Input
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={editingCategoryColor}
                      onChange={(e) => setEditingCategoryColor(e.target.value)}
                      className="w-8 h-8 p-0 border-none cursor-pointer"
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleSaveCategory(category.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant={selectedCategory === category.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => onCategorySelect(category.id)}
                    >
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                      {category.name}
                      <span className="ml-auto text-sm text-muted-foreground">{category.count || 0}</span>
                    </Button>
                    <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit category</span>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openDeleteConfirm(category)}>
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete category</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1"
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={(e) => setNewCategoryColor(e.target.value)}
            className="w-8 h-8 p-0 border-none cursor-pointer"
          />
          <Button size="icon" onClick={handleCreateCategory}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add category</span>
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category &quot;{categoryToDelete?.name}&quot;? All emails in this
              category will become uncategorized. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
