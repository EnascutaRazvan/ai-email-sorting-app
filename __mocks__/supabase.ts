// __mocks__/lib/supabase.ts
export const supabase = {
    // stub `from(table)` to return an object we can chain
    from: jest.fn(() => ({
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        eq: jest.fn(),       // for .eq('id', ...)
        single: jest.fn(),   // for .single()
    })),
};
