const { Practitioner, User } = require('../models');
const { Verification, Payouts } = require('../models');
const { analyzeMedicalCredential } = require('../services/mlService');
const { initiatePayout } = require('../services/squadService');
const { Op, Sequelize } = require('sequelize');

exports.getAdminStats = async (req, res) => {
    try {
        const stats = await Verification.findAll({
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status']
        });

        const totalSuccessfulPayouts = await Payouts.sum('amount', { where: { status: 'SUCCESS' } });

        res.status(200).json({
            stats,
            totalDisbursed: totalSuccessfulPayouts || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getFlaggedCases = async (req, res) => {
    try {
        // 1. Extract and Parse query params
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        // 2. Use findAndCountAll for pagination metadata
        const { count, rows } = await Verification.findAndCountAll({
            where: { status: 'UNDER_REVIEW' },
            include: [{
                model: User, // Ensure your association is set up in models/index.js
                attributes: ['name', 'licenseNumber', 'specialty'],
                where: search ? {
                    name: { [Op.iLike]: `%${search}%` }
                } : {}
            }],
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        // 3. Return data with pagination info
        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Pagination Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PATCH /api/v1/admin/resolve/:id
 * The "Button" action: Admin manually approves/rejects a flagged doctor
 */
exports.resolveCase = async (req, res) => {
    const { id } = req.params;
    const { status, adminNote } = req.body; // decision: 'APPROVED' or 'BLOCKED'

    try {
        const verification = await Verification.findByPk(id);
        if (!verification) return res.status(404).json({ message: "Case not found" });

        // Update the verification record
        await verification.update({ 
            status: status,
            admin_note: adminNote // Good for audit trails
        });

        // If approved by admin, mark the user as verified
        if (status === 'APPROVED') {
            await User.update(
                { isVerified: true },
                { where: { id: verification.practitioner_id } }
            );
        } else if (status === 'BLOCKED') {
            await User.update(
                { isActive: false },
                { where: { id: verification.practitioner_id } }
            );
        }

        res.status(200).json({ 
            success: true, 
            message: `Practitioner has been successfully ${decision.toLowerCase()}.` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};