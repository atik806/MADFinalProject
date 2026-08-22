import cors = require('cors');
import express = require('express');
import farmerRoutes from "./routes/farmer.routes";





const app = express();
//using middeware to allow cross-origin requests from any origin
app.use(cors({
    origin: '*',
}));
app.use(express.json());


//Health check

app.get('/',(req, res) => {
    res.status(200).json({ message: 'Sofol api is running' });
});

//farmer api

app.use('/api/farmer', farmerRoutes);


export = app;
