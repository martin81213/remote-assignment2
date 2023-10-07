const express = require('express');

const app = express();

app.get('/healthcheck',(req,res)=>{
    res.send('OK');
});

app.listen(3000,()=>console.log('Api is running on port 3000'));