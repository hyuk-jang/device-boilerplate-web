const router = require('express').Router();
const _ = require('lodash');

const {BU, DU} = require('base-util-jh');

module.exports = app => {
  // server middleware
  router.use((req, res, next) => {
    if (app.get('auth')) {
      if (!req.user) {
        return res.redirect('/auth/login');
      }
    }
    _.set(req, 'locals.menuNum', 8);
    next();
  });

  // Get
  router.get('/', (req, res) => {
    BU.CLI('cctv', req.locals);

    return res.status(200).send(DU.locationJustGoBlank('http://115.23.49.28:7999'));
    // return res.render('./cctv/cctv.html', req.locals);
  });

  return router;
};
