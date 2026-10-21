const assert = require("node:assert/strict");
const test = require("node:test");
const { dbAll, dbGet, dbRun } = require("../Database_Operations/helpers");

test("database helpers pass query parameters and return results", async () => {
  const calls = [];
  const row = { id: 7, name: "Ada" };
  const rows = [row];
  const db = {
    run(sql, params, callback) {
      calls.push({ method: "run", sql, params });
      callback.call({ lastID: 7, changes: 1 }, null);
    },
    get(sql, params, callback) {
      calls.push({ method: "get", sql, params });
      callback(null, row);
    },
    all(sql, params, callback) {
      calls.push({ method: "all", sql, params });
      callback(null, rows);
    },
  };

  const result = await dbRun(db, "INSERT INTO users (name) VALUES (?)", ["Ada"]);
  assert.equal(result.lastID, 7);
  assert.deepEqual(await dbGet(db, "SELECT * FROM users WHERE id = ?", [7]), row);
  assert.deepEqual(await dbAll(db, "SELECT * FROM users"), rows);
  assert.deepEqual(calls, [
    { method: "run", sql: "INSERT INTO users (name) VALUES (?)", params: ["Ada"] },
    { method: "get", sql: "SELECT * FROM users WHERE id = ?", params: [7] },
    { method: "all", sql: "SELECT * FROM users", params: [] },
  ]);
});

test("database helpers reject driver errors", async () => {
  const error = new Error("database query failed");
  const db = {
    run(_sql, _params, callback) {
      callback(error);
    },
    get(_sql, _params, callback) {
      callback(error);
    },
    all(_sql, _params, callback) {
      callback(error);
    },
  };

  await assert.rejects(dbRun(db, "INSERT INTO users (name) VALUES (?)"), error);
  await assert.rejects(dbGet(db, "SELECT * FROM users"), error);
  await assert.rejects(dbAll(db, "SELECT * FROM users"), error);
});
