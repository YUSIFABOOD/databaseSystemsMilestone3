const express = require("express");
const router = express.Router();
const db = require("../db");

// Browse Datasets
router.get("/", async (req, res) => {
    try {
        let { orgType, format, tag, page } = req.query;
        page = parseInt(page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        let query = `
            SELECT d.id, d.name, d.publisher, d.accessLevel, d.license, d.description,
                   o.type as orgType, d.orgName, o.title as orgTitle, GROUP_CONCAT(DISTINCT r.format SEPARATOR ', ') as format
            FROM Dataset d
            LEFT JOIN Organization o ON d.orgName = o.name
            LEFT JOIN Resources r ON d.id = r.datasetId
        `;
        let countQuery = `
            SELECT COUNT(DISTINCT d.id) as total
            FROM Dataset d
            LEFT JOIN Organization o ON d.orgName = o.name
            LEFT JOIN Resources r ON d.id = r.datasetId
        `;

        const joins = [];
        const conditions = [];
        let paramsStr = [];
        let paramsCount = [];

        if (format) {
            conditions.push(`UPPER(r.format) = ?`);
            paramsStr.push(format === 'MS Access' ? 'ACCDB' : format.toUpperCase());
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

        query += ` ${joinStr} ${whereStr} GROUP BY d.id ORDER BY d.id LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        countQuery += ` ${joinStr} ${whereStr}`;

        const [countResult] = await db.execute(countQuery, paramsCount);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        const [datasets] = await db.execute(query, paramsStr);
        
        // Clean formats in datasets
        datasets.forEach(d => {
            if (d.format) {
                let fs = d.format.split(', ');
                fs = fs.filter(f => f.length > 0);
                fs = fs.map(f => f.toUpperCase() === 'ACCDB' ? 'MS Access' : f.toUpperCase());
                d.format = [...new Set(fs)].join(', ');
            }
        });

        // Fetch unique orgTypes and formats for filter dropdowns
        const [orgTypes] = await db.execute("SELECT DISTINCT type FROM Organization WHERE type IS NOT NULL ORDER BY type ASC");
        const [formats] = await db.execute("SELECT DISTINCT format FROM Resources WHERE format IS NOT NULL ORDER BY format ASC");
        
        let validFormats = formats.map(row => row.format);
        validFormats = validFormats.filter(f => f.length > 0);
        validFormats = validFormats.map(f => f.toUpperCase() === 'ACCDB' ? 'MS Access' : f.toUpperCase());
        validFormats = [...new Set(validFormats)].sort();

        res.render("datasets", {
            datasets,
            orgTypes: orgTypes.map(row => row.type),
            formats: validFormats,
            filters: { orgType, format, tag },
            pagination: { page, totalPages }
        });
    } catch (e) {
        console.error("Error fetching datasets:", e);
        res.status(500).send("Error fetching datasets");
    }
});
// Dataset Details
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        
        const [datasetRows] = await db.execute(`
            SELECT d.*, o.type as orgType, o.title as orgTitle
            FROM Dataset d
            LEFT JOIN Organization o ON d.orgName = o.name
            WHERE d.id = ?
        `, [id]);
        
        if (datasetRows.length === 0) {
            return res.status(404).send("Dataset not found");
        }
        const dataset = datasetRows[0];
        
        const [resources] = await db.execute("SELECT * FROM Resources WHERE datasetId = ?", [id]);
        const [tagsRows] = await db.execute("SELECT tag FROM DatasetTags WHERE datasetId = ?", [id]);
        
        res.render("dataset-details", {
            dataset,
            resources,
            tags: tagsRows.map(t => t.tag)
        });
    } catch (e) {
        console.error("Error fetching dataset details:", e);
        res.status(500).send("Error fetching dataset details");
    }
});

module.exports = router;