const express = require('express');
const router = express.Router();

const StaticNGSIProxy = require('../controllers/static');
const RandomNGSIProxy = require('../controllers/random');
const TwitterNSGIProxy = require('../controllers/twitter');
const WeatherNSGIProxy = require('../controllers/wunderground');

router.post('/random/:type/:mapping/queryContext', RandomNGSIProxy.queryContext);
router.post('/static/:type/:mapping/queryContext', StaticNGSIProxy.queryContext);
router.post('/twitter/:type/:mapping/:queryString/queryContext', TwitterNSGIProxy.queryContext);
router.post('/weather/:type/:mapping/:queryString/queryContext', WeatherNSGIProxy.queryContext);

// Convenience endpoints for temperature readings
router.post(
	'/random/temperature/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'temperature';
		next();
	},
	RandomNGSIProxy.queryContext
);

router.post(
	'/static/temperature/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'temperature';
		next();
	},
	StaticNGSIProxy.queryContext
);

router.post(
	'/weather/temperature/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'temperature:temp_c';
		req.params.queryString = 'Germany/Berlin';
		next();
	},
	StaticNGSIProxy.queryContext
);

// Convenience endpoints for humidity readings
router.post(
	'/random/relativeHumidity/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'relativeHumidity';
		next();
	},
	RandomNGSIProxy.queryContext
);

router.post(
	'/static/relativeHumidity/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'relativeHumidity';
		next();
	},
	StaticNGSIProxy.queryContext
);

router.post(
	'/weather/relativeHumidity/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'relativeHumidity:relative_humidity';
		req.params.queryString = 'Germany/Berlin';
		next();
	},
	StaticNGSIProxy.queryContext
);

// Convenience endpoints for weather conditions readings
router.post(
	'/random/weatherConditions/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'temperature,relativeHumidity';
		next();
	},
	RandomNGSIProxy.queryContext
);

router.post(
	'/static/weatherConditions/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'temperature,relativeHumidity';
		next();
	},
	StaticNGSIProxy.queryContext
);

router.post(
	'/weather/weatherConditions/queryContext',
	(req, res, next) => {
		req.params.type = 'number';
		req.params.mapping = 'temperature:temp_c,relativeHumidity:relative_humidity';
		req.params.queryString = 'Germany/Berlin';
		next();
	},
	StaticNGSIProxy.queryContext
);

// Convenience endpoints for tweets readings
router.post(
	'/random/tweets/queryContext',
	(req, res, next) => {
		req.params.type = 'list';
		req.params.mapping = 'tweets:array';
		next();
	},
	RandomNGSIProxy.queryContext
);

router.post(
	'/static/tweets/queryContext',
	(req, res, next) => {
		req.params.type = 'list';
		req.params.mapping = 'tweets:array';
		next();
	},
	StaticNGSIProxy.queryContext
);

router.post(
	'/twitter/tweets/queryContext',
	(req, res, next) => {
		req.params.type = 'list';
		req.params.mapping = 'tweets:text';
		req.params.queryString = 'FIWARE';
		next();
	},
	TwitterNSGIProxy.queryContext
);

router.get('/', (req, res) => {
	res.status(200).send({
		context_urls: [
			'/proxy/v1/random/temperature/queryContext',
			'/proxy/v1/random/relativeHumidity/queryContext',
			'/proxy/v1/random/tweets/queryContext',
			'/proxy/v1/random/weatherConditions/queryContext',
			'/proxy/v1/static/temperature/queryContext',
			'/proxy/v1/static/relativeHumidity/queryContext',
			'/proxy/v1/static/tweets/queryContext',
			'/proxy/v1/static/weatherConditions/queryContext',
			'/proxy/v1/twitter/tweets/queryContext',
			'/proxy/v1/weather/temperature/queryContext',
			'/proxy/v1/weather/relativeHumidity/queryContext',
			'/proxy/v1/weather/weatherConditions/queryContext',
		],
	});
});

module.exports = router;
