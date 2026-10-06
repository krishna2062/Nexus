const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://syysdzxhxpbgnmzgkkfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXNkenhoeHBiZ25temdra2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDYzODMsImV4cCI6MjEwNjgyMjM4M30.1uScIQz0Mai89sB74sBZOzCqGYQmal9oMxA0WmOSszM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
    console.log("=== PHASE 4: E2E AUTOMATED TESTING ===");

    // 1. Test Auth
    console.log("1. Testing Auth (Sign Up)...");
    const email = `testuser${Date.now()}@gmail.com`;
    const password = 'TestPassword123!';
    
    const { data: authData, error: authError } = await supabase.functions.invoke('register_bypass', {
        body: {
            email: email,
            password: password,
            fullname: 'Test Auto User',
            profilePicBase64: null
        }
    });
    
    // Test Login immediately
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (loginError) {
        console.error("Login Error:", loginError.message);
        process.exit(1);
    }
    console.log("-> ✅ User logged in successfully:", loginData.user.id);
    
    const userId = loginData.user.id;
    
    if (authError) {
        console.error("Auth Error:", authError.message);
        process.exit(1);
    }
    console.log("-> ✅ User signed up successfully:", authData.user.id);
    
    // Wait for the trigger to insert into public.users
    await new Promise(r => setTimeout(r, 2000));
    
    const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
    if (userError || !userData) {
        console.error("User Sync Error:", userError ? userError.message : "User not found in public.users");
        process.exit(1);
    }
    console.log("-> ✅ Trigger successfully populated public.users:", userData.fullname);

    // 2. Test Posts (Videos)
    console.log("2. Testing Videos...");
    const { data: vidInsert, error: vidError } = await supabase.from('videos').insert({
        user_id: authData.user.id,
        video_url: 'https://example.com/test.mp4',
        caption: 'This is an E2E test video! #test'
    }).select().single();
    
    if (vidError) {
        console.error("Video Insert Error:", vidError.message);
        process.exit(1);
    }
    console.log("-> ✅ Video inserted successfully. ID:", vidInsert.id);
    
    const { data: fetchVids, error: fetchError } = await supabase.from('videos').select('*').eq('user_id', authData.user.id);
    if (fetchError || fetchVids.length === 0) {
        console.error("Video Fetch Error:", fetchError ? fetchError.message : "No videos found.");
        process.exit(1);
    }
    console.log("-> ✅ Video fetched successfully. Caption:", fetchVids[0].caption);

    // 3. Test Chat Messages
    console.log("3. Testing Chat Messages...");
    const { data: msgInsert, error: msgError } = await supabase.from('messages').insert({
        sender_id: authData.user.id,
        receiver_id: authData.user.id, // self message for test
        text: 'Hello World E2E'
    }).select().single();

    if (msgError) {
        console.error("Message Insert Error:", msgError.message);
        process.exit(1);
    }
    console.log("-> ✅ Message inserted successfully.");
    
    const { data: msgFetch, error: msgFetchError } = await supabase.from('messages').select('*').eq('sender_id', authData.user.id);
    if (msgFetchError || msgFetch.length === 0) {
        console.error("Message Fetch Error:", msgFetchError ? msgFetchError.message : "No messages found.");
        process.exit(1);
    }
    console.log("-> ✅ Message fetched successfully. Text:", msgFetch[0].text);

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

runTests();
