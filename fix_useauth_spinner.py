import sys

with open('src/hooks/useAuth.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_auth = """    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        if (_event === 'SIGNED_IN') setIsLoading(true);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });"""

new_auth = """    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });"""

text = text.replace(old_auth, new_auth)

with open('src/hooks/useAuth.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed useAuth onAuthStateChange")
