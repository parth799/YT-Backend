import express from 'express'
import cors from "cors"
import cookieParser from 'cookie-parser'

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit:"16mb"}))
app.use(express.urlencoded({extended: true, limit:"20mb"}))
app.use(express.static("public"))

app.use(cookieParser())

// import routers
import userRouter from "./routes/user.routes.js"


//  router declaration
app.use("/api/v1/users", userRouter)


export { app }