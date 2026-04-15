/*
    Users Table Schema
    id: uuid (primary key) auto-generated
    email: string (unique, not null)
    full_name: string (not null)
    password_hash: string 
    role: string (not null, default 'user')
    refresh_token: string (nullable)
    reset_password_token: string (nullable)
    reset_password_expires: timestamp (nullable)
    created_at: timestamp (default now())
    updated_at: timestamp (default now())
*/
