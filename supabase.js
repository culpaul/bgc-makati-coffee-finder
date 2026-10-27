const SUPABASE_URL = 'https://aahhlooqrpmwejzwnooc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9gcCweAi-r3NrN_EPPdFdw_W0imsT-r';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch all cafes from Supabase
async function fetchCafesFromDB() {
  const { data, error } = await supabaseClient.from('cafes').select('*');
  if (error) {
    console.error('Error fetching cafes:', error);
    return [];
  }
  return data;
}

// Sign Up User
async function signUpUser(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + '/brewnav.html'
    }
  });
  return { data, error };
}

// Sign In User
async function signInUser(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

// Get Currently Logged-In User
async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// Logout User
async function logoutUser() {
  const { error } = await supabaseClient.auth.signOut();
  return { error };
}