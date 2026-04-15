
class ApiResponse {

    static ok(res, message = "Success", data = null) {
        return res.status(200).json({
            success: true,
            message,
            data
        });
    }


    static created(res, message = "Resource created", data = null) {
        return res.status(201).json({
            success: true,
            message,
            data
        });
    }

}

export default ApiResponse;