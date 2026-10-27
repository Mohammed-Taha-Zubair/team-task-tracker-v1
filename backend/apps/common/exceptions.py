from rest_framework.views import exception_handler

# Custom DRF exception handler to ensure all error responses follow {"message": "..."}
def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(response.data, dict) and "detail" in response.data:
            response.data = {"message": str(response.data["detail"])}
        elif isinstance(response.data, dict) and "message" not in response.data:
            first_key = next(iter(response.data))
            first_val = response.data[first_key]
            if isinstance(first_val, list) and len(first_val) > 0:
                response.data = {"message": f"{first_key}: {first_val[0]}"}
            else:
                response.data = {"message": str(first_val)}
        elif isinstance(response.data, list) and len(response.data) > 0:
            response.data = {"message": str(response.data[0])}

    return response
