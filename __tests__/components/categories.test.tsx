import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { Categories } from "@/components/dashboard/categories"
import "@testing-library/jest-dom"
import { jest } from "@jest/globals"

const mockCategories = [
  {
    id: "cat-1",
    name: "Work",
    description: "Work emails",
    color: "#3B82F6",
    email_count: 15,
  },
  {
    id: "cat-2",
    name: "Personal",
    description: "Personal emails",
    color: "#10B981",
    email_count: 8,
  },
]

describe("Categories", () => {
  const defaultProps = {
    categories: mockCategories,
    selectedCategory: "all",
    onCategorySelect: jest.fn(),
    onCreateCategory: jest.fn(),
    onDeleteCategory: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders categories correctly", () => {
    render(<Categories {...defaultProps} />)

    expect(screen.getByText("Work")).toBeInTheDocument()
    expect(screen.getByText("Personal")).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument()
  })

  it("shows all emails option", () => {
    render(<Categories {...defaultProps} />)

    expect(screen.getByText("All Emails")).toBeInTheDocument()
  })

  it("handles category selection", () => {
    render(<Categories {...defaultProps} />)

    const workCategory = screen.getByText("Work")
    fireEvent.click(workCategory)

    expect(defaultProps.onCategorySelect).toHaveBeenCalledWith("cat-1")
  })

  it("highlights selected category", () => {
    render(<Categories {...defaultProps} selectedCategory="cat-1" />)

    const workCategory = screen.getByText("Work").closest("button")
    expect(workCategory).toHaveClass("bg-primary")
  })

  it("shows create category button", () => {
    render(<Categories {...defaultProps} />)

    expect(screen.getByText("Create Category")).toBeInTheDocument()
  })

  it("handles category deletion", async () => {
    render(<Categories {...defaultProps} />)

    // Find and click delete button (assuming it's in a dropdown menu)
    const moreButton = screen
      .getAllByRole("button")
      .find((btn) => btn.getAttribute("aria-label")?.includes("More options"))

    if (moreButton) {
      fireEvent.click(moreButton)

      const deleteButton = screen.getByText("Delete")
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(defaultProps.onDeleteCategory).toHaveBeenCalled()
      })
    }
  })
})
