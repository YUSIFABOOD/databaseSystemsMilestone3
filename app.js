require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/users", require("./routes/users"));
app.use("/datasets", require("./routes/datasets"));
app.use("/stats", require("./routes/stats"));

app.get("/", (req, res) => res.render("index"));

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
    console.log(`\n✅ SERVER IS ALIVE ON PORT ${PORT}: http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error("\n🛑 SERVER ENCOUNTERED AN ERROR:", err);
});

process.on('exit', (code) => {
    console.log(`\n🛑 PROCESS EXITING WITH CODE: ${code}`);
});

server.on('close', () => {
    console.log("\n🛑 SERVER WAS FORCIBLY CLOSED!");
});