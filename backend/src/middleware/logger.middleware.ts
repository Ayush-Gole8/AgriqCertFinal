import morgan from "morgan";

export default process.env.NODE_ENV === "production"
  ? morgan("combined")
  : morgan("dev");
