const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { Schema } = require("./Schemas");
const { resolver } = require("./resolver");
const { db } = require("./Database_Operations/connection");
const { dbGet } = require("./Database_Operations/helpers");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

const server = new ApolloServer({
  typeDefs: Schema,
  resolvers: resolver,
});

const PORT = process.env.PORT || 4000;

startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await dbGet(db,
          `SELECT u.user_id, r.role_name
           FROM users u
           JOIN roles r ON u.role_id = r.role_id
           WHERE u.user_id = ?`,
          [decoded.user_id]
        );
      } catch (_) {}
    }
    return { user };
  },
}).then(() => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
