// jest.setup.ts
import { TextEncoder, TextDecoder } from 'util'

// Polyfills for Jest
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'