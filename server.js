let express = require("express");
let axios = require("axios");
let app = express();
app.use(express.json());
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const passport = require("passport");
//mid
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS,PUT,PATCH,DELETE,HEAD"
  );
  res.header("Access-Control-expose-headers", "x-Auth-Token");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization"
  );
  next();
});
var port = process.env.PORT || 2410;
app.listen(port, () =>
  console.log(`Node App Listening on Port ${port} by Jai ~`)
);
//jwt
const JWT_SECRET = "jwtsecret10012000";
app.use(passport.initialize());
require("./passport.js")(passport);
//MongoDB
const connenctDB = async () => {
  await mongoose.connect(
    `mongodb+srv://jalmejaykumarshaw10:BRSlo7h8fcneTWks@books.yn5kguy.mongodb.net/bookDB`
  );
  console.log(`The DB is connect with ${mongoose.connection.host}`);
};
connenctDB();
//Google Api
const googleBookApi = "https://www.googleapis.com/books/v1/volumes";
const apiKey = "AIzaSyBPSNj7aGsCv_Ddl_48uUN9bV_C4vaQR_Q";

//data
const { options, loginData } = require("./data.js");
const { User, Options, Cart } = require("./model.js");

//start
app.post("/login", async (req, res) => {
  const { user, password } = req.body;
  try {
    const foundUser = await User.findOne({ user, password });
    if (!foundUser) return res.status(401).json({ msg: "Invalid credentials" });

    const payload = { user: foundUser.user };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.json({ token: "Bearer " + token, user: user });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.post("/resetlogindata", async (req, res) => {
  try {
    await User.deleteMany({});
    await Options.deleteMany({});
    await User.insertMany(loginData);
    await Options.insertMany(options);
    res.status(200).json({ message: "Login data has been reset." });
  } catch (error) {
    console.error("Error resetting login data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while resetting login data." });
  }
});

app.post("/signup", async (req, res) => {
  const { user, password } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ user });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // Create new user
    const newUser = new User({ user, password });
    await newUser.save();

    // Generate JWT token
    const payload = { user: newUser.user };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({ success: true, token: "Bearer " + token });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // or hardcoded string for now
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ user: email });
    if (!user) {
      // Create user with Google email
      user = new User({ user: email, password: "GOOGLE_AUTH" });
      await user.save();

      // Optionally create default options for user
      const defaultOptions = new Options({ user: email });
      await defaultOptions.save();
    }

    // Generate JWT token
    const jwtPayload = { user: email };
    const tokenJwt = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      token: "Bearer " + tokenJwt,
      user: email,
    });
  } catch (error) {
    console.error("Google login failed:", error);
    res.status(401).json({ message: "Invalid Google token" });
  }
});


app.get("/books", async function (req, res) {
  const params = req.query; // Contains q, langRestrict, etc.

  const queryString = makeQueryString(params); // Create full query string
  const url = `${googleBookApi}?key=${apiKey}&${queryString}`;

  try {
    const response = await axios.get(url);
    res.send(response.data);
  } catch (error) {
    if (error.response) {
      const { status, statusText } = error.response;
      console.log(status, statusText);
      res.status(status).send(statusText);
    } else {
      console.error("Axios error:", error.message);
      res.status(500).send("Server error");
    }
  }
});

// app.get("/options", async function (req, res) {
//   try {
//     const data = await Options.find();
//     res.send(data);
//   } catch (err) {
//     res.status(500).send("Server error");
//   }
// });

app.get(
  "/options",
  passport.authenticate("jwt", { session: false }),
  async function (req, res) {
    const username = req.user.user; // or req.user.username depending on your auth setup
    try {
      const data = await Options.findOne({ user: username });
      if (!data) {
        return res.status(404).send("Options not found for this user");
      }
      res.send(data);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);

app.post(
  "/option",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { maxResults, printType, langRestrict, filter, orderBy } = req.body;
    const user = req.user.user; // authenticated username from token
    if (!maxResults || maxResults < 1) {
      return res.status(400).json({
        success: false,
        message: "maxResults must be at least 1",
      });
    }
    try {
      // Update or create options for this user
      const existing = await Options.findOne({ user });
      if (existing) {
        existing.maxResults = maxResults;
        existing.printType = printType;
        existing.filter = filter;
        existing.orderBy = orderBy;
        existing.langRestrict = langRestrict;
        await existing.save();
        return res
          .status(200)
          .json({ success: true, message: "Options updated" });
      } else {
        const newOption = new Options({
          maxResults,
          printType,
          filter,
          orderBy,
          langRestrict,
          user,
        });
        await newOption.save();
        return res
          .status(201)
          .json({ success: true, message: "Options created" });
      }
    } catch (err) {
      console.error("Error saving options:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);
app.post("/cart", async (req, res) => {
  const { user, bookId, title, authors, thumbnail, quantity } = req.body;
  console.log(req.body);
  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: "User is required" });
  }

  try {
    let cart = await Cart.findOne({ user });

    if (!cart) {
      cart = new Cart({ user, items: [] });
    }

    const existingItem = cart.items.find((item) => item.bookId === bookId);

    if (existingItem) {
      existingItem.quantity += quantity || 1;
      if (existingItem.quantity <= 0) {
        cart.items = cart.items.filter((item) => item.bookId !== bookId);
      }
    } else if (quantity > 0) {
      cart.items.push({
        bookId,
        title,
        authors,
        thumbnail,
        quantity: quantity || 1,
      });
    }

    await cart.save();
    res.status(200).json({ success: true, message: "Cart updated", cart });
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/cart", async (req, res) => {
  const user = req.query.user || req.body.user;
  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: "User is required" });
  }

  try {
    const cart = await Cart.findOne({ user });
    res.status(200).json(cart || { user, items: [] });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

function makeQueryString(params) {
  const query = new URLSearchParams();
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  }
  return query.toString();
}
