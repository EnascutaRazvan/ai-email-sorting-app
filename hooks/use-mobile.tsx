"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT) // Adjust breakpoint as needed
    }

    checkIfMobile() // Check on initial mount
    window.addEventListener("resize", checkIfMobile) // Add event listener for resize

    return () => {
      window.removeEventListener("resize", checkIfMobile) // Clean up on unmount
    }
  }, [])

  return isMobile
}
