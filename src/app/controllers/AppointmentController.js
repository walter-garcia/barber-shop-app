import * as Yup from 'yup';
import { parseISO, startOfHour, isBefore, format, subHours } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';
import Mail from '../../lib/Mail';

class AppointmentController {
  async index(request, response) {
    const { page = 1 } = request.query;

    const appointments = await Appointment.findAll({
      where: { user_id: request.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'user_id'],
      limit: 10,
      offset: (page - 1) * 10,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'url', 'path'],
            },
          ],
        },
      ],
    });

    return response.json(appointments);
  }

  async store(request, response) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(request.body))) {
      return response.status(400).json({ erro: 'Validation failed' });
    }

    const { provider_id, date } = request.body;

    // check if provider_id is a  provider.
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return response
        .status(401)
        .json({ error: 'You can only create appointments with providers' });
    }

    if (provider_id === request.userId) {
      return response
        .status(400)
        .json({ error: 'You can not create appointments with yourself' });
    }

    const hourStart = startOfHour(parseISO(date));
    // check for past dates
    if (isBefore(hourStart, new Date())) {
      return response
        .status(400)
        .json({ error: 'Invalid date! You have entered a date in the past' });
    }

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return response
        .status(400)
        .json({ error: 'Appointment date not available' });
    }

    const appointment = await Appointment.create({
      user_id: request.userId,
      provider_id,
      date,
    });

    // Notify provider
    const user = await User.findByPk(request.userId);
    const formattedDate = format(hourStart, 'MMMM dd');
    const formattedHour = format(hourStart, 'h:mm aa');

    await Notification.create({
      content: `${user.name} scheduled a new appointment for ${formattedDate} at ${formattedHour}`,
      user: provider_id,
    });

    return response.json(appointment);
  }

  async delete(request, response) {
    const appointment = await Appointment.findByPk(request.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
      ],
    });

    if (appointment.user_id !== request.userId) {
      return response.status(401).json({
        error: "You are not allowed to cancel other people's appointments.",
      });
    }

    const decreaseHour = subHours(Appointment.date, 2);

    if (isBefore(decreaseHour, new Date())) {
      return response.status(401).json({
        error: 'Appointments can only be canceled two hours in advance.',
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Appointment canceled',
      text: 'This appointment was canceled by user',
    });

    return response.json(appointment);
  }
}

export default new AppointmentController();
