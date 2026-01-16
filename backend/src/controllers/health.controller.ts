import { Request, Response } from 'express';
import { collectHealthData } from '../utils/health.util.js';

export class HealthController {
    static checkHealth = async (req: Request, res: Response): Promise<void> => {
        try {
            void req;
            const health = await collectHealthData();
            res.status(200).json(health);
        } catch {
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
