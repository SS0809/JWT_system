const jwt = require("jsonwebtoken");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { cookieJwtAuth } = require("../middleware/cookieJwtAuth");

async function getUser(username) {
  const uri = process.env.DB_URI;
  let mongoClient;

  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    const db = mongoClient.db('JWT');
    const userModel = db.collection('JWT_collection');
    const user = await userModel.findOne({ username: username });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    console.error(error);
    throw new Error('Error getting user');
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

async function UpdateCount(username) {
  const uri = process.env.DB_URI;
  let mongoClient;
  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    const db = mongoClient.db('JWT');
    const userModel = db.collection('JWT_collection');
    const user = await userModel.findOne({ username: username });

    if (user) {
      const updatedUser = await userModel.updateOne(
        { username: username },
        { $inc: { count: 1 } }
      );
    } else {
      console.log(`User ${username} not found`);
    }
  } catch (error) {
    console.error(error);
    throw new Error('Error getting user');
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

async function saveUser(username, password) {
  const uri = process.env.DB_URI;
  let mongoClient;

  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();

    const db = mongoClient.db('JWT');
    const userModel = db.collection('JWT_collection');

    const existingUser = await userModel.findOne({ username: username });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    const user = await userModel.insertOne({ username: username, password: password, count: 0 });

    return user;
  } catch (error) {
    console.error(error);
    throw new Error('Error saving user');
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}
exports.login  = async (req, res) => {
  const { username, password } = req.body;
  const user = await getUser(username);
  console.log(user);
  if (user.password !== password) {
    return res.status(403).json({
      error: "invalid login",
    });
  }

  delete user.password;

  const token = jwt.sign(user, process.env.MY_SECRET, { expiresIn: "1h" });

  res.cookie("token", token);

  return res.redirect("/welcome");
};

exports.signup = async (req, res) => {
  const { username, password } = req.body;

  try {
    await saveUser(username, password);
    return res.redirect('/');
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error registering user' });
  }
};
 

exports.add = async (req, res, next) => {
  try {
    const user = req.user;
    await UpdateCount(user.username);
    let count = await getUser(user.username);
    res.redirect("/welcome?count="+ count.count);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing request' });
  }
};


exports.logout  = async (req, res) => {
  const token = req.cookies.token;//will be usedd to remove/invalid JWT
  res.clearCookie('token');
  return res.redirect('/');
};  