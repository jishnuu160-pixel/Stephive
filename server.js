import app from './app.js';
import {connectDB} from './config/db.js';
import 'dotenv/config'; 

const PORT=process.env.PORT || 5500;

connectDB().then(()=>{
    app.listen(PORT,()=>{
        console.log(`Server running on ${PORT}`);
    });
});