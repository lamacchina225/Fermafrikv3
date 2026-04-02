const http = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

    server.listen(port, hostname, () => {
      console.log(
        `Fermafrik en cours d'execution sur http://${hostname}:${port}`
      );
    });
  })
  .catch((error) => {
    console.error("Impossible de demarrer le serveur Next.js :", error);
    process.exit(1);
  });
