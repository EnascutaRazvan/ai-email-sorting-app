import { toast } from "@/components/ui/use-toast"

export const toastManager = {
  success: (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "default",
    })
  },
  error: (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive",
    })
  },
  info: (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "default", // Or a custom info variant if available
    })
  },
}
