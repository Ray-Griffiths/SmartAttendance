import { rest } from 'msw';

const mockLogs = [
	{
		id: '1',
		user: 'Admin User',
		action: 'Created user John Doe',
		type: 'User Management',
		date: new Date().toISOString(),
		details: 'Created user with role Student',
	},
	{
		id: '2',
		user: 'Lecturer A',
		action: 'Marked attendance for Course 101',
		type: 'Attendance',
		date: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
	},
	{
		id: '3',
		user: 'System',
		action: 'Database backup completed',
		type: 'System',
		date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
	},
];

export const handlers = [
	// GET /api/admin/logs
	rest.get('/api/admin/logs', (req, res, ctx) => {
		const limit = req.url.searchParams.get('limit');
		if (limit) {
			const n = Math.min(parseInt(limit, 10) || 5, mockLogs.length);
			return res(ctx.status(200), ctx.json(mockLogs.slice(0, n)));
		}
		return res(ctx.status(200), ctx.json({ logs: mockLogs }));
	}),

	// DELETE /api/admin/logs/clear
	rest.delete('/api/admin/logs/clear', (req, res, ctx) => {
		// In MSW we don't actually clear global state; return success
		return res(ctx.status(200), ctx.json({ message: 'Logs cleared' }));
	}),
];

export default handlers;
