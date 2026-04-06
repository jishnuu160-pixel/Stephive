import app from './app.js';
import connectDB from './db/connectDB.js';

connectDB();

const PORT = 5500;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
