"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Folder, Trash2, FolderOpen, ChevronDown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface Category {
  id: string
  name: string
  description: string
  color: string
  email_count: number
}

interface CategoriesDropdownProps {
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
  onCategoriesChange?: () => void
}

export function CategoriesDropdown({
  selectedCategory,
  onCategorySelect,
  onCategoriesChange,
}: CategoriesDropdownProps) {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showDefaultsDialog, setShowDefaultsDialog] = useState(false)
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false)
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

        // Show default categories dialog if user has no categories
        if (!data.categories || data.categories.length === 0) {
          setShowDefaultsDialog(true)
        }

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

  const handleCreateDefaults = async () => {
    setIsCreatingDefaults(true)
    try {
      const response = await fetch("/api/categories/create-defaults", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast("Default Categories Created", data.message)
        setShowDefaultsDialog(false)
        fetchCategories()
      } else {
        throw new Error("Failed to create default categories")
      }
    } catch (error) {
      showErrorToast(error, "Creating Default Categories")
    } finally {
      setIsCreatingDefaults(false)
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

  const getSelectedCategoryName = () => {
    if (selectedCategory === null) return "All Emails"
    if (selectedCategory === "uncategorized") return "Uncategorized"
    const category = categories.find((cat) => cat.id === selectedCategory)
    return category?.name || "Unknown Category"
  }

  if (isLoading) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-lg border p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-6 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/50 backdrop-blur-sm rounded-lg border">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto text-left font-normal hover:bg-gray-50/50"
            >
              <div className="flex items-center space-x-3">
                <Folder className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Categories</div>
                  <div className="text-sm text-gray-600">
                    {getSelectedCategoryName()} • {getTotalEmailCount()} emails
                  </div>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="px-4 pb-4 space-y-2">
            {/* All Emails */}
            <Button
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
            </Button>

            {/* Uncategorized */}
            <Button
              onClick={() => onCategorySelect("uncategorized")}
              variant={selectedCategory === "uncategorized" ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <Folder className="mr-2 h-4 w-4 text-gray-500" />
              Uncategorized
              <Badge variant="secondary" className="ml-auto">
                0
              </Badge>
            </Button>

            {/* User Categories */}
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

            {/* Add Category Button */}
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
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Default Categories Dialog */}
      <Dialog open={showDefaultsDialog} onOpenChange={setShowDefaultsDialog}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
              Setup Default Categories
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              We can create some standard categories to help you get started organizing your emails.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Default categories we'll create:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                  Personal
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                  Work
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                  Shopping
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                  Promotions
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                  Social
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-cyan-500 mr-2" />
                  Newsletters
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              You can always add, edit, or delete categories later to match your specific needs.
            </p>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowDefaultsDialog(false)}>
              Skip for now
            </Button>
            <Button onClick={handleCreateDefaults} disabled={isCreatingDefaults}>
              {isCreatingDefaults ? "Creating..." : "Create Default Categories"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
