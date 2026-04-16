import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = 5500;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});