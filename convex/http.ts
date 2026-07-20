import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);   // mounts /api/auth/* including the Google callback
export default http;
