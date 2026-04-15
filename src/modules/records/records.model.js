/*
    Milk_Logs Table
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id)
    category_id uuid REFERENCES categories(id),
    quantity_litres numeric NOT NULL,
    price_per_litre numeric NOT NULL,
    total_price numeric generated always as (quantity_litres * price_per_litre) stored,
    record_date date NOT NULL,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
*/ 