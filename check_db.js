const { connectDB } = require('./db/database');
const mongoose = require('mongoose');

(async () => {
  try {
    await connectDB();
    const allocations = mongoose.connection.collection('allocations');
    const all = await allocations.find({}).toArray();
    console.log(all);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
