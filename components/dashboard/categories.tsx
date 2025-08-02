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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Folder, Trash2, FolderOpen, Settings, Sparkles, ChevronDown } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  description: string
  color: string
  email_count: number
  is_default: boolean
}

interface CategoriesProps {
  selectedCategories: string[]
  onCategorySelect: (categoryIds: string[]) => void
  onCategoriesChange?: () => void
}

export function Categories({ selectedCategories, onCategorySelect, onCategoriesChange }: CategoriesProps) {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
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

  const handleCreateDefaultCategories = async () => {
    setIsCreatingDefaults(true)
    try {
      const response = await fetch("/api/categories/default", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.created) {
          showSuccessToast("Default Categories Created", "7 default categories have been created for you")
          fetchCategories()
        } else {
          showSuccessToast("Categories Already Exist", "You already have categories set up")
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create default categories")
      }
    } catch (error) {
      showErrorToast(error, "Creating Default Categories")
    } finally {
      setIsCreatingDefaults(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? This action cannot be undone and will remove this category from all emails.`,
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
        // Remove from selected categories if it was selected
        const updatedSelected = selectedCategories.filter((id) => id !== categoryId)
        onCategorySelect(updatedSelected)
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

  const handleCategoryToggle = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId)
    if (isSelected) {
      onCategorySelect(selectedCategories.filter((id) => id !== categoryId))
    } else {
      onCategorySelect([...selectedCategories, categoryId])
    }
  }

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      onCategorySelect([])
    } else {
      onCategorySelect(categories.map((cat) => cat.id))
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
            <Folder className="mr-2 h-4 w-4 text-blue-600" />
            Categories
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
              {categories.length}
            </Badge>
          </CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
              <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </DropdownMenuItem>
              {categories.length === 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCreateDefaultCategories} disabled={isCreatingDefaults}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isCreatingDefaults ? "Creating..." : "Create Default Categories"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <Folder className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Categories Yet</h3>
            <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
              Create categories to organize your emails automatically with AI
            </p>
            <Button onClick={handleCreateDefaultCategories} disabled={isCreatingDefaults} className="mb-2">
              <Sparkles className="mr-2 h-4 w-4" />
              {isCreatingDefaults ? "Creating..." : "Create Default Categories"}
            </Button>
          </div>
        ) : (
          <>
            {/* Collapsible Category List */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <div className="space-y-2">
                {/* All Emails Button */}
                <Button
                  onClick={() => onCategorySelect([])}
                  variant={selectedCategories.length === 0 ? "default" : "ghost"}
                  className="w-full justify-start"
                  size="sm"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  All Emails
                  <Badge variant="secondary" className="ml-auto">
                    {getTotalEmailCount()}
                  </Badge>
                </Button>

                {/* Show first 3 categories by default */}
                {categories.slice(0, 3).map((category) => (
                  <div key={category.id} className="group relative">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                        className="flex-shrink-0"
                      />
                      <Button
                        onClick={() => handleCategoryToggle(category.id)}
                        variant="ghost"
                        className="flex-1 justify-start pr-8"
                        size="sm"
                      >
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                        {category.name}
                        <Badge variant="secondary" className="ml-auto">
                          {category.email_count}
                        </Badge>
                      </Button>
                      {!category.is_default && (
                        <Button
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Collapsible content for remaining categories */}
                {categories.length > 3 && (
                  <>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-gray-600 h-8">
                        <span>{isExpanded ? "Show Less" : `Show ${categories.length - 3} More Categories`}</span>
                        <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2">
                      {categories.slice(3).map((category) => (
                        <div key={category.id} className="group relative">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={() => handleCategoryToggle(category.id)}
                              className="flex-shrink-0"
                            />
                            <Button
                              onClick={() => handleCategoryToggle(category.id)}
                              variant="ghost"
                              className="flex-1 justify-start pr-8"
                              size="sm"
                            >
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                              {category.name}
                              <Badge variant="secondary" className="ml-auto">
                                {category.email_count}
                              </Badge>
                            </Button>
                            {!category.is_default && (
                              <Button
                                onClick={() => handleDeleteCategory(category.id, category.name)}
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </>
                )}

                {/* Select All/None */}
                {categories.length > 0 && (
                  <Button onClick={handleSelectAll} variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                    {selectedCategories.length === categories.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
            </Collapsible>
          </>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
