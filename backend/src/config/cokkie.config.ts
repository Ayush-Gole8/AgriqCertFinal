import type { CookieOptions } from "express";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const authCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
};

export const clearAuthCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
};
