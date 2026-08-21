import cors = require('cors');
import express = require('express');



const app = express();

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.json({ message: 'Hello Giganigga' });
});



export = app;
