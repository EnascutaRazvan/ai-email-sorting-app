"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Edit, Trash2, Check, X, Folder, Mail } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
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
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  color: string
  email_count: number
}

interface CategoriesProps {
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
  onCategoriesChange: () => void
}

export function Categories({ selectedCategory, onCategorySelect, onCategoriesChange }: CategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#6366F1") // Default color
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")
  const [editCategoryColor, setEditCategoryColor] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        throw new Error("Failed to fetch categories")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Categories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryColor) {
      showErrorToast("Category name and color are required.", "Add Category")
      return
    }
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
      })
      if (response.ok) {
        showSuccessToast("Category Added", `Category "${newCategoryName}" created successfully.`)
        setNewCategoryName("")
        setNewCategoryColor("#6366F1")
        fetchCategories()
        onCategoriesChange()
      } else {
        throw new Error("Failed to add category")
      }
    } catch (error) {
      showErrorToast(error, "Add Category")
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
    setEditCategoryColor(category.color)
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim() || !editCategoryColor) {
      showErrorToast("Category name and color are required.", "Update Category")
      return
    }
    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCategoryName, color: editCategoryColor }),
      })
      if (response.ok) {
        showSuccessToast("Category Updated", `Category "${editCategoryName}" updated successfully.`)
        setEditingCategory(null)
        fetchCategories()
        onCategoriesChange()
      } else {
        throw new Error("Failed to update category")
      }
    } catch (error) {
      showErrorToast(error, "Update Category")
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        showSuccessToast("Category Deleted", `Category "${categoryToDelete.name}" deleted successfully.`)
        fetchCategories()
        onCategoriesChange()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete category")
      }
    } catch (error) {
      showErrorToast(error, "Delete Category")
    } finally {
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  const openDeleteDialog = (category: Category) => {
    setCategoryToDelete(category)
    setIsDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 dark:bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center">
            <Folder className="mr-2 h-4 w-4 text-primary" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-0 bg-white/50 dark:bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center">
          <Folder className="mr-2 h-4 w-4 text-primary" />
          Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start text-left px-3 py-2 h-auto",
              selectedCategory === null &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
            onClick={() => onCategorySelect(null)}
          >
            <Mail className="mr-2 h-4 w-4" />
            All Emails
            <span className="ml-auto text-xs font-medium">
              {categories.reduce((sum, cat) => sum + cat.email_count, 0)}
            </span>
          </Button>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center group">
              {editingCategory?.id === category.id ? (
                <div className="flex-1 flex items-center space-x-2">
                  <Input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Input
                    type="color"
                    value={editCategoryColor}
                    onChange={(e) => setEditCategoryColor(e.target.value)}
                    className="w-8 h-8 p-0 border-none"
                  />
                  <Button variant="ghost" size="icon" onClick={handleUpdateCategory}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingCategory(null)}>
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant={selectedCategory === category.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left px-3 py-2 h-auto",
                      selectedCategory === category.id &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                    )}
                    onClick={() => onCategorySelect(category.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                    <span className="ml-auto text-xs font-medium">{category.email_count}</span>
                  </Button>
                  <div className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {category.name !== "Uncategorized" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDeleteDialog(category)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Add New Category
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">New Category</h4>
                <p className="text-sm text-muted-foreground">Create a new email category.</p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="col-span-2 h-8"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="category-color">Color</Label>
                  <Input
                    id="category-color"
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="col-span-2 h-8 p-0 border-none"
                  />
                </div>
                <Button onClick={handleAddCategory} className="w-full">
                  Create Category
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category "{categoryToDelete?.name}" and
              reassign all its emails to "Uncategorized".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
