"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Folder, Trash2, FolderOpen } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface Category {
  id: string
  name: string
  description: string
  color: string
  email_count: number
}

interface CategoriesProps {
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
  onCategoriesChange?: () => void
}

export function Categories({ selectedCategory, onCategorySelect, onCategoriesChange }: CategoriesProps) {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  })

  useEffect(() => {
    fetchCategories()
  }, [session])

  const fetchCategories = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
        onCategoriesChange?.()
      } else {
        throw new Error("Failed to fetch categories")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Categories")
    } finally {
      setIsLoading(false)
    }
  }

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
        setCategories([...categories, data.category])
        setNewCategory({ name: "", description: "", color: "#3B82F6" })
        setIsDialogOpen(false)
        showSuccessToast("Category Created", `"${data.category.name}" has been created successfully`)
        onCategoriesChange?.()
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

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? This action cannot be undone and will uncategorize all emails in this category.`,
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCategories(categories.filter((cat) => cat.id !== categoryId))
        if (selectedCategory === categoryId) {
          onCategorySelect(null)
        }
        showSuccessToast("Category Deleted", `"${categoryName}" has been deleted`)
        onCategoriesChange?.()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete category")
      }
    } catch (error) {
      showErrorToast(error, "Deleting Category")
    }
  }

  const getTotalEmailCount = () => {
    return categories.reduce((sum, cat) => sum + cat.email_count, 0)
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
          <Folder className="mr-2 h-4 w-4 text-blue-600" />
          Categories
          <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
            {categories.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* <Button
          onClick={() => onCategorySelect(null)}
          variant={selectedCategory === null ? "default" : "ghost"}
          className="w-full justify-start"
          size="sm"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          All Emails
          <Badge variant="secondary" className="ml-auto">
            {getTotalEmailCount()}
          </Badge>
        </Button> */}

        {categories.map((category) => (
          <div key={category.id} className="group relative">
            <Button
              onClick={() => onCategorySelect(category.id)}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              className="w-full justify-start pr-8"
              size="sm"
            >
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
              {category.name}
              <Badge variant="secondary" className="ml-auto">
                {category.email_count}
              </Badge>
            </Button>
            <Button
              onClick={() => handleDeleteCategory(category.id, category.name)}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Create New Category</DialogTitle>
              <DialogDescription className="text-gray-600">
                Add a new category to organize your emails.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-gray-700">
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
                <Label htmlFor="description" className="text-right text-gray-700">
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
                <Label htmlFor="color" className="text-right text-gray-700">
                  Color
                </Label>
                <Input
                  id="color"
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="col-span-3 h-10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCategory} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
