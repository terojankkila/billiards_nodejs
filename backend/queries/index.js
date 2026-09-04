const path = require('path');
const fs = require('fs');

// The dialect controls which query modules are loaded. Set DB_DIALECT in your
// environment (or .env) to switch databases. Defaults to the built-in Postgres
// implementation under queries/pg/.
const DIALECT = process.env.DB_DIALECT || 'pg';

function loadDialect(name) {
  const dir = path.join(__dirname, name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Unknown database dialect "${name}" — directory ${dir} does not exist`);
  }
  const modules = {};
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const key = file.replace('.js', '');
    modules[key] = require(path.join(dir, file));
  }
  return modules;
}

module.exports = loadDialect(DIALECT);
