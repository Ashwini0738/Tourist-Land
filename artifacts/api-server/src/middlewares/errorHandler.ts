import type { ErrorRequestHandler } from "express";

export const apiErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const parseError = error instanceof SyntaxError && "status" in error && error.status === 400;
  if (parseError) {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "The request body must contain valid JSON.",
      },
    });
    return;
  }

  req.log?.error({ err: error, method: req.method, path: req.path }, "Unhandled API request error");
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  });
};