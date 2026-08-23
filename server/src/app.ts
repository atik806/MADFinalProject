import cors = require('cors');
import express = require('express');
import farmerRoutes from "./routes/farmer.routes";
import notificationRoutes from "./routes/notification.router";
import transactionRoutes from "./routes/transaction.routes";




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
app.use("api/farmer/transaction", transactionRoutes);
app.use("api/farmer/notification", notificationRoutes);

//404 

app.use((req, res) => {
    res.status(404).json({ message: 'Api endpoint not found!' });
});

//error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});



export = app;
