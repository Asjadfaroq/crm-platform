const logService = require('../services/logService');

exports.getAllLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, leadId, leadNumber, userId, actionType, startDate, endDate } = req.query;
        const result = await logService.getAllLogs({
            workspaceId: req.workspace._id,
            page: parseInt(page),
            limit: parseInt(limit),
            leadId,
            leadNumber,
            userId,
            actionType,
            startDate,
            endDate,
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.getLogsByLead = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const result = await logService.getLogsByLead(
            req.params.id,
            req.workspace._id,
            parseInt(page),
            parseInt(limit)
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
};
