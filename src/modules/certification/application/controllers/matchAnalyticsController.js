import MatchLog from "../models/MatchLog.js";
import asyncHandler from "../../../../common/utils/asyncHandler.js";

/**
 * @desc    Get matching analytics data
 * @route   GET /api/v1/hotels/analytics
 * @access  Private (Admin)
 */
export const getMatchingStats = asyncHandler(async (req, res) => {
    const totalLogs = await MatchLog.countDocuments();
    const autoMatched = await MatchLog.countDocuments({ autoMatched: true });
    const ambiguous = await MatchLog.countDocuments({ autoMatched: false, candidatesCount: { $gt: 0 } });
    const noMatch = await MatchLog.countDocuments({ matchFound: false });

    // Calculate average match score for successful matches
    const avgScoreResult = await MatchLog.aggregate([
        { $match: { matchFound: true } },
        { $group: { _id: null, avgScore: { $avg: "$matchScore" } } }
    ]);
    const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore * 10) / 10 : 0;

    // Get recent logs
    const recentLogs = await MatchLog.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .select('-candidates'); // Exclude heavy candidate list for summary

    res.status(200).json({
        success: true,
        stats: {
            total: totalLogs,
            autoMatched: { count: autoMatched, percentage: totalLogs ? Math.round((autoMatched / totalLogs) * 100) : 0 },
            ambiguous: { count: ambiguous, percentage: totalLogs ? Math.round((ambiguous / totalLogs) * 100) : 0 },
            noMatch: { count: noMatch, percentage: totalLogs ? Math.round((noMatch / totalLogs) * 100) : 0 },
            avgMatchScore: avgScore
        },
        recentLogs
    });
});

/**
 * @desc    Get detailed log for a specific match attempt
 * @route   GET /api/v1/hotels/analytics/:id
 * @access  Private (Admin)
 */
export const getMatchLogById = asyncHandler(async (req, res) => {
    const log = await MatchLog.findById(req.params.id);
    if (!log) {
        res.status(404);
        throw new Error('Log not found');
    }
    res.status(200).json({
        success: true,
        data: log
    });
});
