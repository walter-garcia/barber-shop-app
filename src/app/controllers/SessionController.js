import jwt from 'jsonwebtoken';
import * as Yup from 'yup';

import User from '../models/user';
import authConfig from '../../config/auth';

class SessionController {
  async store(request, response) {
    const schema = Yup.object().shape({
      email: Yup.string()
        .email()
        .required(),
      oldPassword: Yup.string().min(6),
      password: Yup.string().required(),
    });

    if (!(await schema.isValid(request.body))) {
      return response.status(400).json({ error: 'Validation failed' });
    }

    const { email, password } = request.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return response.status(401).json({ error: 'User not found' });
    }

    if (!(await user.checkPassword(password))) {
      return response.status(401).json({ error: 'Incorrect password' });
    }

    const { id, name } = user;

    return response.json({
      user: {
        id,
        name,
        email,
      },
      token: jwt.sign({ id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      }),
    });
  }
}

export default new SessionController();
