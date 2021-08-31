const express = require('express');
const app = express();
const { auth } = require('express-openid-connect');
const dotenv = require('dotenv');
dotenv.config();
const hb = require("express-handlebars").create({ defaultLayout: "main" });
app.engine("handlebars", hb.engine);
app.use('/', express.static('public'));
app.set("view engine", "handlebars");
app.enable('trust proxy');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret:   process.env.SECRET,
  baseURL: process.env.APP_BASEURL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_DOMAIN
};


// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));
app.use('/', require('./public/index'));


// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}...`);
});