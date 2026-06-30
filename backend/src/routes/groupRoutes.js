import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import Group from '../models/Group.js';
import User  from '../models/User.js';
import Sale  from '../models/Sale.js';
import { getPosGroupsSummary, getPosGroupDetail, getPosGroupTrend } from '../services/posGroupReportService.js';

const router = express.Router();

// ── GET /api/groups — list all POS groups with revenue stats ─────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const groups = await Group.find()
      .sort({ createdAt: -1 })
      .populate('members', 'name email employeeCode role imageUrl')
      .populate('createdBy', 'name');

    // Aggregate total revenue per group from completed sales
    const allMemberIds = groups.flatMap(g => g.members.map(m => m._id));

    const revRows = await Sale.aggregate([
      { $match: { employeeId: { $in: allMemberIds }, status: 'COMPLETED' } },
      { $group: { _id: '$employeeId', rev: { $sum: '$total' } } },
    ]);

    const revByEmployee = Object.fromEntries(revRows.map(r => [r._id.toString(), r.rev]));

    // Attach revenue to each group and compute rank
    const withStats = groups.map(g => {
      const revenue = g.members.reduce((s, m) => s + (revByEmployee[m._id.toString()] ?? 0), 0);
      return { ...g.toObject(), revenue };
    });

    // Rank by descending revenue (1 = highest)
    const sorted = [...withStats].sort((a, b) => b.revenue - a.revenue);
    sorted.forEach((g, i) => { g.rank = i + 1; });
    const rankMap = Object.fromEntries(sorted.map(g => [g._id.toString(), g.rank]));
    const result  = withStats.map(g => ({ ...g, rank: rankMap[g._id.toString()] }));

    res.json({ groups: result });
  } catch (e) { next(e); }
});

// ── GET /api/groups/employees — list employees available to add ───────────────
router.get('/employees', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const employees = await User.find(
      { role: 'Employee', status: { $ne: 'SUSPENDED' } },
      'name email employeeCode role imageUrl'
    ).sort({ name: 1 });
    res.json({ employees });
  } catch (e) { next(e); }
});

// ── POST /api/groups — create a group ─────────────────────────────────────────
router.post('/', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const { name, description = '', memberIds = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Group name is required' });

    const group = await Group.create({
      name: name.trim(),
      description: description.trim(),
      members: memberIds,
      createdBy: req.user._id,
    });
    const populated = await group.populate([
      { path: 'members',   select: 'name email employeeCode role imageUrl' },
      { path: 'createdBy', select: 'name' },
    ]);
    res.status(201).json({ group: populated });
  } catch (e) { next(e); }
});

// ── PUT /api/groups/:id — update name / description / members ─────────────────
router.put('/:id', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body;
    const update = {};
    if (name       !== undefined) update.name        = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (memberIds  !== undefined) update.members     = memberIds;

    const group = await Group.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('members',   'name email employeeCode role imageUrl')
      .populate('createdBy', 'name');

    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({ group });
  } catch (e) { next(e); }
});

// ── GET /api/groups/report?start=&end= — summary of all POS groups ───────────
router.get('/report', protect, async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: 'start and end are required' });
    const data = await getPosGroupsSummary({ start, end });
    res.json(data);
  } catch (e) { next(e); }
});

// ── GET /api/groups/:id/report?start=&end= — detail for one group ─────────────
router.get('/:id/report', protect, async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: 'start and end are required' });
    const data = await getPosGroupDetail({ groupId: req.params.id, start, end });
    if (!data) return res.status(404).json({ message: 'Group not found' });
    res.json(data);
  } catch (e) { next(e); }
});

// ── GET /api/groups/:id/trend?start=&end=&groupBy= — trend data ───────────────
router.get('/:id/trend', protect, async (req, res, next) => {
  try {
    const { start, end, groupBy = 'day' } = req.query;
    if (!start || !end) return res.status(400).json({ message: 'start and end are required' });
    const trend = await getPosGroupTrend({ groupId: req.params.id, start, end, groupBy });
    res.json({ trend });
  } catch (e) { next(e); }
});

// ── DELETE /api/groups/:id ────────────────────────────────────────────────────
router.delete('/:id', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({ message: 'Group deleted' });
  } catch (e) { next(e); }
});

export default router;
