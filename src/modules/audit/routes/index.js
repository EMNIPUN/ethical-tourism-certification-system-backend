import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Audit Module - No routes defined yet.');
});

export default router;
