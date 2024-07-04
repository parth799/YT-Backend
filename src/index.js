import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({
    path:"./env"
})

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("Error" , error);
        throw error
    })
    app.listen(process.env.PORT || 8000, () =>{
        console.log(`server is runnig at http://localhost:${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("Mongo databse connectin failled !!! ", err );
})





// const app = express();
// ;(async () => {
//  try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     app.on("error", (error) => {
//         console.log("error: " , error);
//         throw error
//     } )
//     app.listen(process.env.PORT, () => {
//         console.log(`App is listening on port ${process.env.PORT }`);
//     })
//  } catch (error) {
//     console.log("error", error);
//  }
// })()