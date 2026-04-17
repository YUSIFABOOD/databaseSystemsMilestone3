const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/:name", async (req, res) => {
    try {
        const orgName = req.params.name;
        
        // Fetch organization details
        const [orgRows] = await db.execute("SELECT * FROM Organization WHERE name = ?", [orgName]);
        
        if (orgRows.length === 0) {
            return res.status(404).render("404", { message: "Organization not found" });
        }
        
        const organization = orgRows[0];
        
        // Fetch datasets published by this organization
        // We will include GROUP_CONCAT for formats like we do in datasets route
        const [datasets] = await db.execute(`
            SELECT d.id, d.name, d.publisher, d.accessLevel, d.license, d.description,
                   o.type as orgType, d.orgName, GROUP_CONCAT(DISTINCT UPPER(r.format) SEPARATOR ', ') as format
            FROM Dataset d
            LEFT JOIN Organization o ON d.orgName = o.name
            LEFT JOIN Resources r ON d.id = r.datasetId
            WHERE d.orgName = ?
            GROUP BY d.id
            ORDER BY d.id
        `, [orgName]);
        
        // Here we can clean up the formats locally for each dataset
        datasets.forEach(d => {
            if (d.format) {
                let formats = d.format.split(', ');
                formats = formats.filter(f => isNaN(f) && f.length > 0 && f.length < 15);
                formats = formats.map(f => {
                    if (f === 'ACCDB') return 'MS Access';
                    return f;
                });
                // unique
                formats = [...new Set(formats)];
                d.format = formats.join(', ');
            }
        });

        const [contactsRows] = await db.execute("SELECT contactInformation FROM OrganizationContact WHERE orgName = ?", [orgName]);
        const contacts = contactsRows.map(row => row.contactInformation);

        res.render("organization", {
            organization,
            datasets,
            contacts
        });
    } catch (e) {
        console.error("Error fetching organization:", e);
        res.status(500).send("Error fetching organization details");
    }
});

module.exports = router;
