const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const settings = require('./settings')

const app = express();

//Middleware CORS
app.use((req, res, next) => {
    var allowedOrigins = ['http://127.0.0.1:8080', 'http://localhost:8080', "https://lucasmodolo22.github.io/Campeonato-Radical-Teen/"];
    var origin = req.headers.origin;
    if(allowedOrigins.indexOf(origin) > -1){
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    // res.header("Access-Control-Allow-Origin", "https://lucasmodolo22.github.io/Campeonato-Radical-Teen/");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Allow-Origin");
    app.use(cors({
        origin: '*',
        credentials: true
    }));
    next();
});

const router = express.Router();

// Connect DB
mongoose.set('useCreateIndex', true);
mongoose.connect(settings.connectionStrig, { useNewUrlParser: true, useUnifiedTopology: true })

//Models
const User = require('./models/userModel');

//Rotes
const cuidadoresRoute = require('./routes/appRoutes');

app.use(bodyParser.json());
app.unsubscribe(bodyParser.urlencoded({ extended: false }));

app.use('/', cuidadoresRoute);

module.exports = app;