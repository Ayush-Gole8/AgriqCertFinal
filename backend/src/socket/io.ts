import { Server } from 'socket.io';

let ioInstance: Server | null = null;

const getAllowedOrigins = () => {
    if (process.env.ALLOWED_ORIGINS) {
        return process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    }

    if (process.env.NODE_ENV !== "production") {
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:4173",
        ];
    }

    return [];
};

export const initSocket = (httpServer: unknown) => {
    if (ioInstance) {
        return ioInstance;
    }

    const allowedOrigins = getAllowedOrigins();

    ioInstance = new Server(httpServer as any, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                callback(new Error("Not allowed by CORS"));
            },
            credentials: true,
        },
    });

    ioInstance.on("connection", (socket) => {
        const userId = socket.handshake.auth?.userId;

        console.log("Socket client connected", {
            socketId: socket.id,
            userId,
            origin: socket.handshake.headers.origin,
        });

        if (userId) {
            socket.join(`user:${userId}`);
        }

        socket.on("disconnect", (reason) => {
            console.log("Socket client disconnected", {
                socketId: socket.id,
                reason,
            });
        });
    });

    return ioInstance;
};

export const getIo = (): Server => {
    if (!ioInstance) {
        throw new Error('Socket.io not initialized');
    }
    return ioInstance;
};


