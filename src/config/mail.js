export default {
  host: process.env.USER,
  port: process.env.PORT,
  secure: false,
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
  default: {
    from: 'Barber Shop Team <noreply@barbershopapp.com>',
  },
};
