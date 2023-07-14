const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbpath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Register API

app.post("/register/", async (request, response) => {
  try {
    const { username, name, password, gender, location } = request.body;
    const hashedPassword = await bcrypt.hash(request.body.password, 10);
    // Scenario 1 If the username already exists
    const checkTheUsername = `select * from user where username='${username}';`;
    let userData = await db.get(checkTheUsername);
    if (userData === undefined) {
      /*If userData is not present in the database then this condition executes*/
      //create new user
      let postNewUserQuery = `
            INSERT INTO
            user (username,name,password,gender,location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
      // now this query has to be executed only when password as more than 5 characters
      if (password.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        let newUserDetails = await db.run(postNewUserQuery);
        response.status(200);
        response.send("User created successfully");
      }
    } else {
      // if user already exists
      response.status(400);
      response.send("User already exists");
    }
  } catch (e) {
    console.log(`Error:${e.message}`);
    process.exit(1);
  }
});

//  API2 login

app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const selectUserQuery = `
        SELECT *
        FROM 
        USER
        WHERE 
        username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        response.status(200);
        response.send("Login success!");
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (e) {
    console.log(`Error:${e.message}`);
    process.exit(1);
  }
});

// API 3 change password

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkForUserQuery = `
    select *
    from user
    where username = '${username}';`;
  const dbUser = await db.get(checkForUserQuery);
  // check if user is in the database or not
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
              update user
              set password = '${encryptedPassword}'
              where username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
