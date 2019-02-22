const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const passport = require('passport');
const request = require('request');
const { BU, DU, EU } = require('base-util-jh');

// const SITE_HEADER = '';
// const SITE_HEADER = 'auth/';

router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/app/intersection',
    failureRedirect: '/app/authFail',
    // failureFlash: true,
  }),
);

router.get('/logout', (req, res) => {
  req.logOut();

  req.session.save(err => {
    if (err) {
      console.log('logout error');
    }
    return res.json(200);
  });
});

module.exports = router;
