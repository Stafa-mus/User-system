const dbConfig = require("../database/config"); //database configuration
const sql = require("mssql"); //SQL Server
const jwt = require("jsonwebtoken"); //json web token
const bcrypt = require("bcrypt"); //password encryption

require("dotenv").config(); //.env stuff

//handle the user login request
exports.login = (req, res) => {
    //get login credentials from req.body
    const { email, password } = req.body;
    if (email && password) {
        //validate credentials
        sql
            .connect(dbConfig)
            .then((pool) => {
                //execute stored procedure for checking user login
                return pool
                    .request()
                    .input("email", sql.VarChar(225), email)
                    .input("password", sql.VarChar(225), password)
                    .execute("dbo.checkUserLogin");
            })
            .then((result, err) => {
                //TODO: check if the error was due to duplicate email or username

                if (err) {
                    //an error occurred. Notify res
                    console.log(err);
                    res
                        .status(400)
                        .send("An error occurred while validating login credentials.");
                } else {
                    //a row *may* have been returned from database
                    if (result.recordset.length == 1) {
                        //check password
                        const { id, username, password } = result.recordset[0];
                        bcrypt.compare(req.body.password, password, (err, result) => {
                            if (err || result === false) {
                                //invalid password
                                console.log(err);
                                console.log(result);
                                res.status(401).send("Invalid login credentials.");
                            } else {
                                //generate jwt token for user
                                const stuffInToken = {
                                    id,
                                    username,
                                    email,
                                    group: "user", //the user is a normal user, not an admin!
                                };
                                const token = jwt.sign(stuffInToken, process.env.SECRET_KEY, {
                                    expiresIn: 3600,
                                });
                                res.json({ token, username, email });
                            }
                        });
                    } else {
                        //no matching credentials. Email not found
                        res.status(401).send("Invalid login credentials.");
                    }
                }
            })
            .catch((err) => {
                //an error occurred. Notify res
                console.log(err);
                res
                    .status(500)
                    .send("An error occurred while validating login credentials.");
            });
    } else {
        res.status(400).send("email and password are required.");
    }
};

//handle the admin login request
exports.adminLogin = (req, res) => {
    //get login credentials from req.body
    const { email, password } = req.body;
    if (email && password) {
        //validate credentials
        sql
            .connect(dbConfig)
            .then((pool) => {
                //execute stored procedure for checking user login
                return pool
                    .request()
                    .input("email", sql.VarChar(225), email)
                    .input("password", sql.VarChar(225), password)
                    .execute("dbo.checkAdminLogin");
            })
            .then((result, err) => {
                if (err) {
                    //an error occurred. Notify res
                    res
                        .status(500)
                        .send("An error occurred while validating login credentials.");
                } else {
                    //a row *may* have been returned from database
                    if (result.recordset.length == 1) {
                        //check password
                        const { id, username, password } = result.recordset[0];
                        bcrypt.compare(req.body.password, password, (err, result) => {
                            if (err || result === false) {
                                //invalid password
                                console.log(err);
                                console.log(result);
                                res.status(401).send("Invalid login credentials.");
                            } else {
                                //generate jwt token for user
                                const stuffInToken = {
                                    id,
                                    username,
                                    email,
                                    group: "admin", //the user is a normal user, not an admin!
                                };
                                const token = jwt.sign(stuffInToken, process.env.SECRET_KEY, {
                                    expiresIn: 3600,
                                });
                                res.json({ token });
                            }
                        });
                    } else {
                        //no matching credentials. Email not found
                        res.status(401).send("Invalid login credentials.");
                    }
                }
            })
            .catch((err) => {
                //an error occurred. Notify res
                console.log(err);
                res
                    .status(500)
                    .send("An error occurred while validating login credentials.");
            });
    } else {
        res.status(400).send("email and password are required.");
    }
};

//handle the user registration request
exports.signup = (req, res) => {
    //get the user info
    const { username, email, password, phone_number } = req.body;
    if (username && email && password && phone_number) {
        //encrypt password
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) {
                //an error occurred while hashing the password
                console.log(err);
                res.status(500).send("An error occurred. Please try again later.");
            } else {
                //execute stored procedure for signing up the user
                sql
                    .connect(dbConfig)
                    .then((pool) => {
                        return pool
                            .request()
                            .input("username", sql.VarChar(50), username)
                            .input("email", sql.VarChar(225), email)
                            .input("password", sql.VarChar(225), hash)
                            .input("phone_number", sql.VarChar(15), phone_number)
                            .output("inserted", sql.Bit)
                            .execute("dbo.insertUser");
                    })
                    .then((result, err) => {
                        if (err) {
                            console.log(err);
                            res
                                .status(500)
                                .send("An error occurred. Please try again later.");
                        } else {
                            //check if the user was actually inserted. The output value should be 1.
                            if (result.output.inserted) {
                                //user was inserted
                                res.status(201).send("Account created successfully.");
                            } else {
                                console.log(err);
                                //something went wrong. e.g. The email has already been used.
                                res
                                    .status(500)
                                    .send("An error occurred. Please try again later.");
                            }
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send("An error occurred. Please try again later.");
                    });
            }
        });
    } else {
        //not all information was not provided
        res
            .status(400)
            .send("username, email, password and phone_number are required.");
    }
};

//export the token verification middleware for use in projects service
exports.verify = (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        //header is provided
        //verify the token
        const token = authHeader.split(" ")[1];

        jwt.verify(token, process.env.SECRET_KEY, (err, info) => {
            if (err) {
                //something went wrong or the token is not valid.
                res.status(401).send("Unauthorized: Token is not valid.");
            } else {
                //req.user = info; //token is valid
                res.status(200).json(info);
            }
        });
    } else {
        //no header provided
        res.status(401).send("Unauthorized: No auth found in header");
    }
};

//get all users in the system. Only an admin should be able to do this
exports.getAllUsers = (req, res) => {
    sql.connect(dbConfig).then(pool => {
        return pool.request()
            .execute('getAllUsers');
    }).then((result, err) => {
        if (err) {
            res.status(500).send('Internal server error.');
        } else {
            //send the users as json
            let users = [];
            for (let i = 0; i < result.recordset.length; i++) {
                users.push({
                    id: result.recordset[i].id,
                    username: result.recordset[i].username,
                    email: result.recordset[i].email,
                    phone_number: result.recordset[i].phone_number,
                    project_id: result.recordset[i].user_project_id,
                    project_name: result.recordset[i].user_project_name
                });
            }
            res.status(200).json({ users });
        }
    }).catch(err => {
        res.status(500).send('Internal server error.');
    });
};