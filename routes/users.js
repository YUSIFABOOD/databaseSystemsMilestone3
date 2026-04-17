const express = require("express");
const router = express.Router();
const db = require("../db");

// Register - show form
router.get("/register", (req, res) => {
    res.render("register");
});

// Register - handle form submission
router.post("/register", async (req, res) => {
    const { email, username, gender, birthdate, country } = req.body;
    try {
        await db.execute(
            `INSERT INTO User (email, username, gender, birthDate, country)
             VALUES (?, ?, ?, ?, ?)`,
            [email, username, gender, birthdate, country]
        );
        res.redirect("/");
    } catch (e) {
        console.error("Register Error:", e);
        res.status(500).send("Error registering user");
    }
});

// Log usage - show form
router.get("/log-usage", async (req, res) => {
    try {
        const [users] = await db.execute("SELECT email, username FROM User ORDER BY username ASC");
        const [datasets] = await db.execute("SELECT id, name FROM Dataset LIMIT 1000");
        res.render("usage", { users, datasets, usageList: null });
    } catch (e) {
        console.error("Log-usage form error:", e);
        res.status(500).send("Internal Error");
    }
});

// Log usage - handle form submission
router.post("/log-usage", async (req, res) => {
    const { userEmail, datasetId, projectName, category } = req.body;
    try {
        await db.execute(
            `INSERT IGNORE INTO Project (userEmail, name, category)
             VALUES (?, ?, ?)`,
            [userEmail, projectName, category]
        );
        await db.execute(
            `INSERT INTO datasetProject (datasetId, userEmail, projectName)
             VALUES (?, ?, ?)`,
            [datasetId, userEmail, projectName]
        );
        res.redirect("/users/view-usage");
    } catch (e) {
        console.error("Log usage submit error:", e);
        res.status(500).send("Error logging usage");
    }
});

// View usage logs (paginated)
router.get("/view-usage", async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM datasetProject dp
            JOIN Project p ON dp.userEmail = p.userEmail AND dp.projectName = p.name
            JOIN User u ON dp.userEmail = u.email
            JOIN Dataset d ON dp.datasetId = d.id
        `;
        const [countResult] = await db.execute(countQuery);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        const dataQuery = `
            SELECT u.username, d.name AS dataset_name, dp.projectName AS project_name, p.category
            FROM datasetProject dp
            JOIN Project p ON dp.userEmail = p.userEmail AND dp.projectName = p.name
            JOIN User u ON dp.userEmail = u.email
            JOIN Dataset d ON dp.datasetId = d.id
            ORDER BY u.username, dp.projectName
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `;
        const [usageList] = await db.execute(dataQuery);

        res.render("usage", { 
            usageList, 
            users: null, 
            datasets: null,
            pagination: { page, totalPages }
        });
    } catch (e) {
        console.error("View usage error:", e);
        res.status(500).send("Error fetching usage logs");
    }
});

module.exports = router;