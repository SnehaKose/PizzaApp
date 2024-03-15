require('dotenv').config()
const express = require('express')
const ejs = require('ejs')
const path = require('path')
const expressLayout = require('express-ejs-layouts')
const PORT =process.env.PORT || 3300
const mongoose = require('mongoose');
const session =require('express-session')
const flash = require('express-flash')
const MongoDbStore = require('connect-mongo')(session)
const app=express()
const passport = require('passport')
const Emitter = require('events')



//Database connection
//const url ='mongodb://localhost/pizza';

//const connection=mongoose.connect('mongodb://127.0.0.1/pizza')
//.then(() => console.log('Connected!'));
mongoose.set("strictQuery", false);
const url = 'mongodb://127.0.0.1/pizza';

mongoose.connect(url);

const connection = mongoose.connection;

connection.on('error', (err) => {
    console.error('Connection error:', err);
});

connection.once('open', () => {
    console.log('Database connected...');
});

// Session store configuration
let mongoStore = new MongoDbStore({
  mongooseConnection: connection,
  collection: 'sessions'
})

// Event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

//session config
app.use(session({
  secret: process.env.COOKIE_SECRET,
  resave: false,
  store: mongoStore,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hour
  
}));

//passport config
const passportInit = require('./app/config/passport')
const { log } = require('console')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

//flash 
app.use(flash())

//assets
app.use(express.static('public'))
app.use(express.urlencoded({extended:false}))
app.use(express.json())

//global middleware
app.use((req, res, next) => {
  res.locals.session = req.session
  res.locals.user = req.user
  next()
})

//set template engine
app.use(expressLayout)
app.set('views',path.join(__dirname,'/resources/views'))
app.set('view engine','ejs')


//importing routes from web.js
require('./routes/web.js') (app)


const server = app.listen(PORT ,()=>{
                  console.log(`Listening on port ${PORT}`)
              })

// Socket

const io = require('socket.io')(server)
io.on('connection', (socket) => {
      // Join
      socket.on('join', (orderId) => {
        socket.join(orderId)
      })
      
})

eventEmitter.on('orderUpdated', (data) => {
  io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
  io.to('adminRoom').emit('orderPlaced', data)
})