declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    provider?: string
    expires_at?: number // Unix timestamp
    user: {
      id: string
      email: string
      name?: string
      image?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    provider?: string
    expires_at?: number // Unix timestamp
    user: {
      id: string
      email: string
      name?: string
      image?: string
    }
  }
}
