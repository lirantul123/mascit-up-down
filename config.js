const SUPABASE_URL = 'https://rynimptqihkeqfmxrbrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bmltcHRxaWhrZXFmbXhyYnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTgyNzIsImV4cCI6MjEwMjczNDI3Mn0.IphWTzGDw_JARYD06YFqG5jyDh5Xf5fggtZ9330ItpI';

if (!window.activeDbClient && window.supabase && typeof window.supabase.createClient === 'function') {
    window.activeDbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const db = window.activeDbClient || {
    from: () => ({
        select: () => ({
            order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: "Not connected" } }) }),
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: "Not connected" } }) }),
            gt: () => Promise.resolve({ count: 0, error: { message: "Not connected" } })
        }),
        upsert: () => Promise.resolve({ error: { message: "Not connected" } }),
        insert: () => Promise.resolve({ error: { message: "Not connected" } }),
        delete: () => ({ eq: () => Promise.resolve({ error: { message: "Not connected" } }) })
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {}
};
