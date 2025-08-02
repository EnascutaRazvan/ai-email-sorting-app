import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { EmailList } from "@/components/dashboard/email-list"
import "@testing-library/jest-dom"
import jest from "jest" // Declare the jest variable

// Mock the hooks and components
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockEmails = [
  {
    id: "email-1",
    subject: "Test Email 1",
    sender: "sender1@example.com",
    snippet: "This is a test email",
    ai_summary: "Test email summary",
    received_at: "2024-01-15T10:30:00Z",
    is_read: false,
    category: {
      id: "cat-1",
      name: "Work",
      color: "#3B82F6",
    },
    account: {
      email: "user@example.com",
      name: "User",
    },
  },
  {
    id: "email-2",
    subject: "Test Email 2",
    sender: "sender2@example.com",
    snippet: "Another test email",
    ai_summary: "Another test summary",
    received_at: "2024-01-15T09:15:00Z",
    is_read: true,
    category: null,
    account: {
      email: "user@example.com",
      name: "User",
    },
  },
]

describe("EmailList", () => {
  const defaultProps = {
    emails: mockEmails,
    loading: false,
    onEmailClick: jest.fn(),
    onRefresh: jest.fn(),
    selectedEmails: [],
    onEmailSelect: jest.fn(),
    onBulkDelete: jest.fn(),
    onBulkUnsubscribe: jest.fn(),
    onRecategorize: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders email list correctly", () => {
    render(<EmailList {...defaultProps} />)

    expect(screen.getByText("Test Email 1")).toBeInTheDocument()
    expect(screen.getByText("Test Email 2")).toBeInTheDocument()
    expect(screen.getByText("sender1@example.com")).toBeInTheDocument()
  })

  it("shows loading state", () => {
    render(<EmailList {...defaultProps} loading={true} />)

    expect(screen.getByText("Loading emails...")).toBeInTheDocument()
  })

  it("shows empty state when no emails", () => {
    render(<EmailList {...defaultProps} emails={[]} />)

    expect(screen.getByText("No emails found")).toBeInTheDocument()
  })

  it("handles email selection", () => {
    render(<EmailList {...defaultProps} />)

    const checkbox = screen.getAllByRole("checkbox")[1] // First email checkbox (0 is select all)
    fireEvent.click(checkbox)

    expect(defaultProps.onEmailSelect).toHaveBeenCalledWith("email-1")
  })

  it("handles select all functionality", () => {
    render(<EmailList {...defaultProps} />)

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0]
    fireEvent.click(selectAllCheckbox)

    expect(defaultProps.onEmailSelect).toHaveBeenCalledTimes(2)
  })

  it("shows bulk actions when emails are selected", () => {
    render(<EmailList {...defaultProps} selectedEmails={["email-1"]} />)

    expect(screen.getByText("Delete Selected")).toBeInTheDocument()
    expect(screen.getByText("Unsubscribe Selected")).toBeInTheDocument()
  })

  it("handles bulk delete", async () => {
    render(<EmailList {...defaultProps} selectedEmails={["email-1"]} />)

    const deleteButton = screen.getByText("Delete Selected")
    fireEvent.click(deleteButton)

    // Confirm deletion
    const confirmButton = screen.getByText("Delete")
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(defaultProps.onBulkDelete).toHaveBeenCalledWith(["email-1"])
    })
  })

  it("displays category badges correctly", () => {
    render(<EmailList {...defaultProps} />)

    expect(screen.getByText("Work")).toBeInTheDocument()
    expect(screen.getByText("Uncategorized")).toBeInTheDocument()
  })

  it("handles email click", () => {
    render(<EmailList {...defaultProps} />)

    const emailItem = screen.getByTestId("email-item-email-1")
    fireEvent.click(emailItem)

    expect(defaultProps.onEmailClick).toHaveBeenCalledWith(mockEmails[0])
  })
})
