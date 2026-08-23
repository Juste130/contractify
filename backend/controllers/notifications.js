const notificationService = require('../services/notification');

exports.list = async (req, res, next) => {
    try {
        const notifications = await notificationService.listForUser(req.user.userId);
        const unreadCount = await notificationService.countUnread(req.user.userId);
        res.json({ notifications, unreadCount });
    } catch (error) {
        next(error);
    }
};

exports.markRead = async (req, res, next) => {
    try {
        await notificationService.markRead(req.params.id, req.user.userId);
        res.json({ message: 'Notification marquée comme lue' });
    } catch (error) {
        next(error);
    }
};

exports.markAllRead = async (req, res, next) => {
    try {
        await notificationService.markAllRead(req.user.userId);
        res.json({ message: 'Notifications marquées comme lues' });
    } catch (error) {
        next(error);
    }
};
