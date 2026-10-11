// Run with: node seed.js
// Creates a couple of demo accounts and sample lost/found items.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Item = require("./models/Item");
const User = require("./models/User");
const Response = require("./models/Response");

const demoUsers = [
  { name: "Priya Sharma", email: "priya@campus.edu", password: "password123" },
  { name: "Arjun Mehta", email: "arjun@campus.edu", password: "password123" },
  { name: "Sara Khan", email: "sara@campus.edu", password: "password123" },
];

async function run() {
  await connectDB();
  await Response.deleteMany({});
  await Item.deleteMany({});
  await User.deleteMany({ email: { $in: demoUsers.map((u) => u.email) } });

  const [priya, arjun, sara] = await User.create(demoUsers);

  await Item.insertMany([
    {
      title: "Black Dell laptop charger",
      description: "Left in Room 204 after the 2pm lecture. Has a piece of blue tape on the cable.",
      category: "Electronics",
      status: "found",
      location: "Engineering Building, Room 204",
      date: new Date(),
      postedBy: priya._id,
      contactName: priya.name,
      contactEmail: priya.email,
    },
    {
      title: "Silver house keys with a red keychain",
      description: "Three keys on a ring with a small red rubber duck keychain.",
      category: "Keys",
      status: "lost",
      location: "Near the north cafeteria entrance",
      date: new Date(),
      postedBy: arjun._id,
      contactName: arjun.name,
      contactEmail: arjun.email,
    },
    {
      title: "Campus ID card — Rohan Verma",
      description: "Found on a bench outside the library. Turned in to the front desk.",
      category: "ID Cards & Documents",
      status: "found",
      location: "Central Library entrance",
      date: new Date(),
      postedBy: priya._id,
      contactName: priya.name,
      contactEmail: priya.email,
    },
    {
      title: "Navy blue Jansport backpack",
      description: "Contains a chemistry textbook and a scientific calculator. Lost somewhere between the gym and hostel block C.",
      category: "Bags",
      status: "lost",
      location: "Between gym and Hostel Block C",
      date: new Date(),
      postedBy: sara._id,
      contactName: sara.name,
      contactEmail: sara.email,
    },
  ]);

  console.log("Seeded 3 demo accounts (password: password123) and 4 sample items.");
  console.log(demoUsers.map((u) => u.email).join(", "));
  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
