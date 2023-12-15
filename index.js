const express = require("express");
const app = express();
const path = require("path");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");

const initializePassport = require("./passportconfig");
initializePassport(passport);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next(); // User is authenticated, proceed to the next middleware or route handler
    }
    res.redirect('/home');
}
  
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "secret",
    saveUninitialized: false,
    resave: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/home", (req, res) => {
  res.render("home");
});
app.listen(3000, () => {
  console.log("example");
});

// const { Pool } = require('pg');
// const exp = require('constants');

// const pool = new Pool({
//    user: 'postgres',
//    host: 'localhost',
//    database: 'itmission',
//    password: 'admin',
//    port: 5432, // Default PostgreSQL port
// });

app.get("/emerge", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM emergingtech");
    const data = result.rows;
    res.render("emergingtech", { data });
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/ItNodalOfficers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM nodalofficers ORDER BY a ASC"
    );
    const data = result.rows;
    res.render("ItNodalOfficers", { data });
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/ksitmofficers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ksitmofficers");
    const data = result.rows;
    console.log(data);
    res.render("ksitmofficers", { data });
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/users/register",ensureAuthenticated, async (req, res) => {
  res.render("register");
});
app.post("/users/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;

  console.log({
    name,
    email,
    password,
    password2,
  });
  let error = [];

  if (!name || !email || !password || !password2) {
    error.push({ message: "Please Enter all Fields" });
  }
  if (password.length < 8) {
    error.push({ message: "Password must be atleast 6 character" });
  }
  if (password != password2) {
    error.push({ message: "Password donot match" });
  }
  console.log({
    error,
  });
  if (error.length > 0) {
    res.render("register", { error });
  } else {
    //form validation is legit
    let hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    pool.query(
      `SELECT * from USERS
            WHERE email = $1`,
      [email],
      (err, result) => {
        if (err) {
          throw err;
        }
        console.log(result.rows);
        if (result.rows.length > 0) {
          error.push({ message: "email already regisered" });
          res.render("register", { error });
        } else {
          pool.query(
            `INSERT INTO users(name,email,password)
                        VALUES($1,$2,$3)
                        RETURNING id,password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log("results.rows");
              console.log(results.rows);
              req.flash("success_msg", "You are now registered Please log in ");
              res.redirect("/home");
            }
          );
        }
      }
    );
  }
});
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/home",
    failureFlash: true,
  })
);
app.get(
  "/dashboard",ensureAuthenticated,
  async (req, res) => {
    res.render("dashboard", { msg: "" });
  }
);
app.get("/edit/nodalofficers",ensureAuthenticated, async (req, res) => {
  res.render("editnodalofficers", { msg: "" });
});

app.post("/edit/nodalofficers",async (req, res) => {
  let {
    deptname,
    subdept,
    nodalofficername,
    designation,
    officialmail,
    mobile,
    hod,
    hodmail,
    hodphone,
  } = req.body;
  let error = [];
  const queryResult = await pool.query(
    `SELECT * FROM nodalofficers WHERE a = $1 AND b=$2 `,
    [deptname, subdept]
  );
  console.log(queryResult.rowCount);
  if (queryResult.rows.length > 0) {
    await pool.query(
      `UPDATE nodalofficers SET a = $1, b = $2,c=$3,d=$4,e=$5,f=$6,g=$7,h=$8,i=$9 WHERE a = $10 AND b=$11`,
      [
        deptname,
        subdept,
        nodalofficername,
        designation,
        officialmail,
        mobile,
        hod,
        hodmail,
        hodphone,
        deptname,
        subdept,
      ]
    );
    res.render("editnodalofficers", { msg: "Entry in DB is Modified" });
  } else {
    await pool.query(
      `INSERT INTO nodalofficers (a,b,c,d,e,f,g,h,i) VALUES ($1, $2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        deptname,
        subdept,
        nodalofficername,
        designation,
        officialmail,
        mobile,
        hod,
        hodmail,
        hodphone,
      ]
    );
    res.render("editnodalofficers", { msg: "New Entry is added" });
  }
});

app.get("/edit/ksitmofficers", ensureAuthenticated,async (req, res) => {
  res.render("editksitm", { msg: "" });
});
app.post("/edit/ksitmofficers", async (req, res) => {
  let { deptname, name, mailid, phonenumber } = req.body;
  let error = [];
  const queryResult = await pool.query(
    `SELECT * FROM ksitmofficers WHERE department = $1 `,
    [deptname]
  );
  if (queryResult.rows.length > 0) {
    await pool.query(
      `UPDATE ksitmofficers SET department = $1, name = $2, mailid=$3,phone=$4 WHERE department = $5`,
      [deptname, name, mailid, phonenumber, deptname]
    );
    res.render("editksitm", { msg: "Entry in DB is Modified" });
  } else {
    await pool.query(
      `INSERT INTO ksitmofficers (department,name,mailid,phone) VALUES ($1, $2,$3,$4)`,
      [deptname, name, mailid, phonenumber]
    );
    res.render("editksitm", { msg: "New Entry is added" });
  }
});

app.get("/edit/cadres", ensureAuthenticated,async (req, res) => {
  res.render("editcadres", { msg: "" });
});
app.post("/edit/cadres", async (req, res) => {
  let { deptname, name, designation, phonenumber } = req.body;
  console.log(req.body);

  let error = [];

  const queryResult = await pool.query(
    `SELECT * FROM emergingtech WHERE department = $1`,
    [deptname]
  );

  if (queryResult.rows.length > 0) {
    await pool.query(
      `UPDATE emergingtech SET department = $1, name = $2, designation = $3, phone = ARRAY[$4] WHERE department = $5`,
      [deptname, name, designation, phonenumber, deptname]
    );
    res.render("editcadres", { msg: "Entry in DB is Modified" });
  } else {
    await pool.query(
      `INSERT INTO emergingtech (department, name, designation, phone) VALUES ($1, $2, $3, ARRAY[$4])`,
      [deptname, name, designation, phonenumber]
    );
    res.render("editcadres", { msg: "New Entry is added" });
  }
});
