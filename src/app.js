import express from 'express'
import cors from "cors"
import cookieParser from 'cookie-parser'
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import morgan from 'morgan';

const app = express()
// app.use(cors({
//     origin:'*',
//     credentials: true,
//     allowedHeaders: '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
// }))

// app.use(
//     cors({
//       origin: "*",
//       methods: ["*"],
//       allowedHeaders: ["*"],
//     })
//   );

app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// app.use(cors())

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(express.static("public"))

app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/v1/users", userRouter)
app.use("/api/v1/video", videoRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app }