import { NextApiRequest } from 'next';
import { NextApiResponseWithSocket, initSocketIO } from '../../lib/socket/server';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    initSocketIO(res);
    res.end();
}
