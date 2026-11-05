import "dotenv/config";
import { app } from "./app";
import { startJobs } from "./jobs";

const port = Number(process.env.PORT ?? 4000);

startJobs();
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
