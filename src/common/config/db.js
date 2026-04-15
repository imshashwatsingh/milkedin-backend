import pg from "pg";

const { Pool } = pg;

const postgres = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? {
        rejectUnauthorized: false,
    } : false,
});

// Handle pool errors gracefully
postgres.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
});

// postgres.on("connect", () => {
//     console.log("✓ Pool connection established");
// });

export default postgres;
