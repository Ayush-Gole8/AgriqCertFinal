import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ message: "CORS Error: Origin not allowed" });
    return;
  }

  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
    res.status(status).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
    return;
  }

  console.error({
    message: err.message,
    url: req.url,
    method: req.method,
  });

  res.status(status).json({
    success: false,
    message: "Something went wrong",
  });
};
