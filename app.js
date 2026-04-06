import express from 'express';



const app = express();

app.get('/',(req,res)=>{
    res.send('Home page');
})


export default app;