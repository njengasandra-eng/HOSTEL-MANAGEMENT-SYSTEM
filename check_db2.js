require('dotenv').config();
const { initializeDatabase, cache } = require('./db/database');

(async () => {
  try {
    await initializeDatabase();
    console.log('Students:', cache.students.length);
    console.log('Allocations:', cache.allocations.length);
    console.log('Recent Allocations:', cache.allocations.map(a => a.allocation_date + ' ' + a.student_id));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
