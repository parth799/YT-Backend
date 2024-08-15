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

const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        try {
            await Promise.resolve(requestHandler(req, res, next));
        } catch (error) {
            const statusCode = error.statusCode || 500;
            const errorMessage = error.message || "Internal Server Error";
            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
        }
    };
};


// const asyncHandler = (requestHandler) => {
//     return (req, res, next) => {
//         Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
//     }
// }


export {asyncHandler}