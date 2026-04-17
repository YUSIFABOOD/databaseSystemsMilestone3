const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
    try {
        const [topOrgs] = await db.execute(`
            SELECT d.orgName, o.title as orgTitle, COUNT(*) as count 
            FROM Dataset d 
            LEFT JOIN Organization o ON d.orgName = o.name
            GROUP BY d.orgName, o.title
            ORDER BY count DESC 
            LIMIT 5
        `);

        const [topDatasets] = await db.execute(`
            SELECT d.name, COUNT(DISTINCT dp.userEmail) as count 
            FROM Dataset d 
            JOIN datasetProject dp ON d.id = dp.datasetId 
            GROUP BY d.id, d.name 
            ORDER BY count DESC 
            LIMIT 5
        `);

        const [byOrg] = await db.execute(`
            SELECT d.orgName, o.title as orgTitle, COUNT(*) as count 
            FROM Dataset d 
            LEFT JOIN Organization o ON d.orgName = o.name
            GROUP BY d.orgName, o.title 
            ORDER BY count DESC
        `);
        const [byTopic] = await db.execute(`SELECT topicName, COUNT(*) as count FROM Dataset WHERE topicName IS NOT NULL GROUP BY topicName ORDER BY count DESC`);
        
        const [byFormat] = await db.execute(`
            SELECT IF(UPPER(r.format)='ACCDB', 'MS Access', UPPER(r.format)) as format, COUNT(DISTINCT d.id) as count 
            FROM Dataset d 
            JOIN Resources r ON d.id = r.datasetId 
            WHERE r.format IS NOT NULL 
            GROUP BY format 
            ORDER BY count DESC
        `);

        const [byType] = await db.execute(`
            SELECT o.type, COUNT(DISTINCT d.id) as count 
            FROM Dataset d 
            JOIN Organization o ON d.orgName = o.name 
            WHERE o.type IS NOT NULL 
            GROUP BY o.type 
            ORDER BY count DESC
        `);

        const [usageByProject] = await db.execute(`
            SELECT category, COUNT(*) as count 
            FROM Project 
            GROUP BY category
        `);

        const [tagsByProject] = await db.execute(`
            SELECT p.category, dt.tag, COUNT(*) as count 
            FROM Project p 
            JOIN datasetProject dp ON p.userEmail = dp.userEmail AND p.name = dp.projectName 
            JOIN DatasetTags dt ON dp.datasetId = dt.datasetId 
            GROUP BY p.category, dt.tag 
            ORDER BY p.category, count DESC
        `);

        const topTags = {};
        tagsByProject.forEach(row => {
            if (!topTags[row.category]) {
                topTags[row.category] = [];
            }
            if (topTags[row.category].length < 10) {
                topTags[row.category].push({ tag: row.tag, count: row.count });
            }
        });

        res.render("stats", {
            topOrgs, topDatasets, byOrg, byTopic, byFormat, byType, usageByProject, topTags
        });
    } catch (e) {
        console.error("Stats Error:", e);
        res.status(500).send("Error generating statistics");
    }
});

module.exports = router;