const http = require("http");
const server = http.createServer((req, res) => {
    res.end("works");
});
server.listen(8080, () => console.log("listening on 8080"));