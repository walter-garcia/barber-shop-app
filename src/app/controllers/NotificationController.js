import Notification from '../schemas/Notification';
import User from '../models/User';

class NotificationController {
  async index(request, response) {
    const checkIsProvider = await User.findOne({
      where: { id: request.userId, provider: true },
    });

    if (!checkIsProvider) {
      return response
        .status(401)
        .json({ error: 'Only providers can load notification' });
    }

    const notifications = await Notification.find({
      user: request.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(10);

    return response.json(notifications);
  }

  async update(request, response) {
    const notification = await Notification.findByIdAndUpdate(
      request.params.id, // pega id da rota
      { read: true }, // altera no banco read pra true
      { new: true } // retorna o novo valor
    );

    return response.json(notification);
  }
}

export default new NotificationController();
