const express = require("express");
var bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session"); // Import express-session
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing
const hbs = require("hbs");
// const User = require("./userpro").default; // Import the User model
const fs = require("fs");
const exphbs = require("express-handlebars");
const app = express();
const LogInCollection = require("../templates/mongo");
const AppointmentCollection = require("../templates/mongo1");
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));

// Configure session middleware
app.use(
  session({
    secret: "your-secret-key", // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
  })
);
const publicDirectoryPath = path.join(__dirname, "photos");

// Serve static files from the "public" folder
app.use(express.static(publicDirectoryPath));

// Serve photos from the "photos" directory
app.use("/photos", express.static(path.join(__dirname, "./photos/")));

// Set up your view engine and views directory
const templatePath = path.join(__dirname, "../templates");
// app.engine('hbs', exphbs({ extname: 'hbs' }));
// app.set('view engine', 'hbs');
app.set("views", path.join(__dirname, "templates"));
app.set("view engine", "hbs");
app.set("views", templatePath);

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/login", (req, res) => {1
  res.render("login");
});
app.get("/", (req, res) => {
  res.render("index");
});
app.get("/indexUser", (req, res) => {
  res.render("indexUser");
});
app.get("/appointment", (req, res) => {
  res.render("appointment");
});

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/public", "style.css"));
});
app.get("/login_style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/public", "login_style.css"));
});
app.get("/photos", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/photos"));
});

app.post("/submit", async function (req, res) {
  try {
    const { email } = req.body;
    const user = await AppointmentCollection.findOne({ email });

    // Check if the user is logged in
    if (!req.session.user) {
      // If not logged in, redirect to the login page
      return res.redirect("/login"); // Replace with your actual login page URL
    }

    // Create a new Profile document based on the posted data
    const newProfile = new AppointmentCollection({
      email: req.body.email,
      phno: req.body.phone,
      timeslot: req.body.timeslot,
      category: req.body.category,
      date: req.body.date,
      message: req.body.message,
      // Map other fields as needed
    });

    // Save the newProfile document to MongoDB using await
    await newProfile.save();

    // Send welcome email to the user
    sendWelcomeEmail(req.body.email, req.body.date, req.body.timeslot);

    res.render("appointment");
  } catch (err) {
    console.error("Error saving profile:", err);
    res.status(500).send("Error saving profile");
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    // Create a new user with the hashed password
    const newUser = new LogInCollection({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).render("login");
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).send("Failed to save user");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await LogInCollection.findOne({ email });

    if (!user) {
      return res.status(401).send("User not found");
    }

    const passwordMatch = await bcrypt.compare(password, user.password); // Compare hashed password

    if (!passwordMatch) {
      return res.status(401).send("Incorrect password");
    }

    // Store user data in session to maintain authentication
    req.session.user = user;
    req.session.email = email; // Store the user's email in the session

    res.status(200).render("indexUser");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Login failed");
  }
});

app.get("/logout", async (req, res) => {
  try {
    // Get the user's email from the session (assuming you store it upon login)
    const userEmail = req.session.email;

    // Check if the user is logged in
    if (!userEmail) {
      // Redirect to the login page if not logged in
      return res.redirect("/login"); // Replace with your actual login page URL
    }

    // Optionally, you can perform additional logout-related actions here if needed
    // For example, you can log the user out of any third-party services

    // Destroy the user's session to log them out
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        res.status(500).send("Error logging out");
      } else {
        // Redirect the user to a logout confirmation page or the login page
        res.redirect("/login"); // Replace with the actual URL of your login page
      }
    });
  } catch (err) {
    console.error("Error logging out:", err);
    res.status(500).send("Error logging out");
  }
});

// Define your routes
// app.get("/", (req, res) => {
//   res.render("profile");
// });

app.get("/profile", async (req, res) => {
  try {
    // Retrieve the user's email from the session
    const userEmail = req.session.email;

    if (!userEmail) {
      return res.status(401).send("User email not found in session");
    }

    // Retrieve data from the LogInCollection based on the user's email
    const userLoginData = await LogInCollection.findOne({ email: userEmail });

    if (!userLoginData) {
      return res.status(404).send("User not found");
    }

    // Render the user's profile using a template engine like Handlebars or EJS
    res.render("profile", { user: userLoginData }); // Pass user data to the template
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


// Add your other routes for login, signup, etc.

app.listen(port, () => {
  console.log("Server is running on port", port);
});

// var express = require("express");
// var bodyParser = require("body-parser");
// var mongoose = require("mongoose");
// const path = require("path"); // Import the 'path' module
const nodemailer = require("nodemailer");
const cron = require("node-cron");
// const bcrypt = require('bcrypt');
// const session = require('express-session');

// const app = express();

// app.use(bodyParser.json());
// app.use(
//   express.static(__dirname + "/public", {
//     setHeaders: (res, path, stat) => {
//       if (path.endsWith(".css")) {
//         res.setHeader("Content-Type", "text/css");
//       }
//     },
//   })
// );

// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );
// const publicDirectoryPath = path.join(__dirname, "photos");

// // Serve static files from the "public" folder
// app.use(express.static(publicDirectoryPath));

// mongoose.connect("mongodb://localhost:27017/Salon_User_Profile", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const profileSchema = new mongoose.Schema({
//   // Define the structure of your data here
//   Name: String,
//   email: String,
// password:String,
// phno: String,
// timeslot: String,
// category: String,
// date: String,
// message: String,
//   // Add more fields as needed
// });

// const Profile = mongoose.model("Profile", profileSchema);

// var db = mongoose.connection;

// db.on("error", () => console.log("Error in Connecting to Database"));
// db.once("open", () => console.log("Connected to Database"));

// app.get("/", function (req, res) {
//   res.sendFile(__dirname + "/public/index.html");
// });
// // app.get("/", function (req, res) {
// //   res.sendFile(__dirname + "/public/profile.html");
// // });
// app.get("/", function (req, res) {
//   res.sendFile(__dirname + "/public/login.html");
// });

// app.get("/style.css", function (req, res) {
//   res.set("Content-Type", "text/css");
//   res.sendFile(__dirname + "/public/style.css");
// });

// app.post("/submit", async function (req, res) {
//   try {
//     // Create a new Profile document based on the posted data
//     const newProfile = new Profile({
//       phno: req.body.phone,
//       timeslot: req.body.timeslot,
//       category: req.body.category,
//       date: req.body.date,
//       message: req.body.message,

//       // Map other fields as needed
//     });

//     // Save the newProfile document to MongoDB using await
//     await newProfile.save();

//     res.sendFile(__dirname + "/appointment.html");
//   } catch (err) {
//     console.error("Error saving profile:", err);
//     res.status(500).send("Error saving profile");
//   }
// });

// app.post("/register", async function(req, res) {
//   const { name, email, password } = req.body;

//   try {
//     // Check if the email already exists in the database
//     const existingUser = await Profile.findOne({ email });

//     if (existingUser) {
//       return res.status(400).json({ error: 'User already exists' });
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create a new user
//     const newUser = new Profile({
//       name,
//       email,
//       password: hashedPassword
//     });

//     // Save the user to the database
//     await newUser.save();

//     res.sendFile(__dirname + "/appointment.html");
//   } catch (error) {
//     console.error("Error registering user:", error);
//     res.status(500).send("Error registering user");
//   }
// });

// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Find the user in the database
//     const user = await Profile.findOne({ email });

//     if (!user) {
//       return res.status(401).json({ error: 'Invalid user or password' });
//     }

//     // Compare the provided password with the hashed password in the database
//     const isPasswordValid = await bcrypt.compare(password, user.password);

//     if (!isPasswordValid) {
//       return res.status(401).json({ error: 'Invalid user or password' });
//     }

//     // Store user data in the session
//     req.session.user = user;

//     res.sendFile(__dirname + "/appointment.html");
//   } catch (err) {
//     console.error("Error logging in:", err);
//     res.status(500).send("Error logging in");
//   }
// });

// //our other routes and app configurations)

// connection to database for mailer //

const { MongoClient } = require("mongodb");

async function getMostRecentUser() {
  const uri = "mongodb://localhost:27017/Salon_User_Profile"; // Replace with your MongoDB connection string
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();

    const database = client.db("LoginFromPractise"); // Replace with your database name
    const collection = database.collection("appointmentcollections"); // Replace with your collection name

    // Query for the most recently added user based on a timestamp or unique identifier
    const mostRecentUser = await collection
      .find({})
      .sort({ _id: -1 }) // Sort by _id in descending order (most recent first)
      .limit(1) // Limit the result to just one document (the most recent user)
      .toArray();

    if (mostRecentUser.length > 0) {
      const { Name, email, date, timeslot } = mostRecentUser[0]; // Extract name and email
      return { Name, email, date, timeslot };
    } else {
      console.log("No recent users found.");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving recent user data:", error);
  } finally {
    client.close();
  }
}

// // Example usage to get the most recently added user's name and email
getMostRecentUser()
  .then((userData) => {
    if (userData) {
      console.log("Most recent user:", userData);
      // Now you can send a welcome email using the retrieved name and email
      sendWelcomeEmail(
        userData.Name,
        userData.email,
        userData.date,
        userData.timeslot
      );
    }
  })
  .catch((error) => {
    console.error("Error:", error);
  });

// for email //

async function sendWelcomeEmail(email, date, timeslot) {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail", // or your email service provider
      auth: {
        user: "bookyourstyle@gmail.com", // Replace with your email
        pass: "klelsmtxuf", // Replace with your email password or app-specific password
      },
    });

    const mailOptions = {
      from: "bookyourstyleofficial@gmail.com",
      to: email, // Ensure that 'email' is a valid recipient email address
      subject: "Welcome to Bookyourstyle",
      text: `Hello,\n\nWelcome to our Bookyourstyle!\n\nYour Appointment booked on ${date} during ${timeslot} time.\n\nThank you!`,
    };
    

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}








// // app.set("port", process.env.PORT || 3000);
// // app.listen(app.get("port"), function () {
// //   console.log("Server started on port " + app.get("port"));
// // });
// app.use(bodyParser.json());
// app.use(
//   express.static(__dirname + "/public", {
//     setHeaders: (res, path, stat) => {
//       if (path.endsWith(".css")) {
//         res.setHeader("Content-Type", "text/css");
//       }
//     },
//   })
// );

// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );

// const publicDirectoryPath = path.join(__dirname, "public");
// app.use(express.static(publicDirectoryPath));
// app.use(express.static(path.join(__dirname, "public")));
