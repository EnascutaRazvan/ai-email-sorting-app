const OLD_ENV = process.env;
const fetchMock = jest.fn();
(global as any).fetch = fetchMock;

import { GET } from '../../app/api/cron/sync-emails/route';

beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterAll(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
});

describe('GET /cron/sync-emails', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV };
        process.env.NEXTAUTH_URL = 'https://localhost:3000';
        process.env.CRON_SECRET = 'topsecret';
    });

    it('returns 200 and imported count on sync success', async () => {
        fetchMock.mockResolvedValueOnce({
            json: async () => ({ success: true, message: "Imported!", totalImported: 42 }),
        });

        const response = await GET();
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json).toEqual({
            success: true,
            message: "Imported!",
            imported: 42,
        });
        expect(fetchMock).toHaveBeenCalledWith(
            "https://localhost:3000/api/emails/sync-all",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    Authorization: "Bearer topsecret",
                }),
            })
        );
    });

    it('returns 500 if sync fails (error response)', async () => {
        fetchMock.mockResolvedValueOnce({
            json: async () => ({ success: false, error: "oops" }),
        });

        const response = await GET();
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: "oops" });
    });

    it('returns 500 on fetch throw', async () => {
        fetchMock.mockImplementationOnce(() => { throw new Error("network fail"); });

        const response = await GET();
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: "Cron job failed" });
    });
});
