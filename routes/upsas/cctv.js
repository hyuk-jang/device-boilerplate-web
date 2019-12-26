const _ = require('lodash');
const router = require('express').Router();
const asyncHandler = require('express-async-handler');

const { DU } = require('base-util-jh');

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    return res.status(200).send(`
      <script>
        window.open('http://localhost:8080', '_blank');
        history.back(-1);
      </script>
    `);
    // return res.status(200).send('<script >window.open("http://localhost:8080");</script>');
    // return res.status(200).send(DU.locationJustGoBlank('http://localhost:8080'));
  }),
);

module.exports = router;
