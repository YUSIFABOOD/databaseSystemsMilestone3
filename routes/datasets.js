const express = require("express");
const router = express.Router();
const db = require("../db");

// Browse Datasets
router.get("/", async (req, res) => {
    try {
        let { orgType, format, tag, page } = req.query;
        page = parseInt(page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        let query = `
            SELECT DISTINCT d.id, d.name, d.publisher, d.accessLevel, 
                   o.type as orgType, d.orgName
            FROM Dataset d
            LEFT JOIN Organization o ON d.orgName = o.name
        `;
        let countQuery = `
            SELECT COUNT(DISTINCT d.id) as total
            FROM Dataset d
            LEFT JOIN Organization o ON d.orgName = o.name
        `;

        const joins = [];
        const conditions = [];
        let paramsStr = [];
        let paramsCount = [];

        if (format) {
            joins.push(`JOIN Resources r ON d.id = r.datasetId`);
            conditions.push(`r.format = ?`);
            paramsStr.push(format);
        }
        if (tag) {
            joins.push(`JOIN DatasetTags dt ON d.id = dt.datasetId`);
            conditions.push(`dt.tag = ?`);
            paramsStr.push(tag);
        }
        if (orgType) {
            conditions.push(`o.type = ?`);
            paramsStr.push(orgType);
        }

        paramsCount = [...paramsStr];

        const joinStr = joins.join(" ");
        const whereStr = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

        query += ` ${joinStr} ${whereStr} ORDER BY d.id LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        countQuery += ` ${joinStr} ${whereStr}`;

        const [countResult] = await db.execute(countQuery, paramsCount);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        const [datasets] = await db.execute(query, paramsStr);
        
        // Fetch unique orgTypes and formats for filter dropdowns
        const [orgTypes] = await db.execute("SELECT DISTINCT type FROM Organization WHERE type IS NOT NULL ORDER BY type ASC");
        const [formats] = await db.execute("SELECT DISTINCT format FROM Resources WHERE format IS NOT NULL ORDER BY format ASC");

        res.render("datasets", {
            datasets,
            orgTypes: orgTypes.map(row => row.type),
            formats: formats.map(row => row.format),
            filters: { orgType, format, tag },
            pagination: { page, totalPages }
        });
    } catch (e) {
        console.error("Error fetching datasets:", e);
        res.status(500).send("Error fetching datasets");
    }
});

module.exports = router;