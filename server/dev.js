// Load environment variables from .env file
require("dotenv").config({ path: "../.env" });

// Start the server
require("tsx").watch("./server/index.ts");
