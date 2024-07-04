// export const  asyncHandler = (fun) => async (req,res,next) => {
//     try {
//         await fun(res,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success : false,
//             message : err.message
//         })
//     }
// }

export const asyncHandler = (requestHandler) =>{
    (res,req,next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    } 
}